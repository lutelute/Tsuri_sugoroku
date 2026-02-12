import type { Fish, FishRarity, PlayerEquipment, Region, CaughtFish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { LURE_RARE_BONUS, LURE_BITE_SPEED_BONUS, EQUIPMENT_WEIGHTS } from './constants';
import type { EquipmentAbility } from './constants';
import { getEquipmentLevels } from './equipment';
import { weightedRandom, randomFloat } from '../utils/random';

const RARITY_BASE_WEIGHT: Record<FishRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 12,
  legendary: 3,
  mythical: 0.5,
};

// 装備の重み付き実効レベルを計算
export function getEffectiveLevel(equipment: PlayerEquipment, ability: EquipmentAbility): number {
  const levels = getEquipmentLevels(equipment);
  const w = EQUIPMENT_WEIGHTS[ability];
  return levels.rod * w.rod + levels.reel * w.reel + levels.lure * w.lure;
}

// レベル別配列から実数レベルで補間して値を取得
function interpolateBonus(values: number[], level: number): number {
  const clamped = Math.max(1, Math.min(values.length - 1, level));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  if (lower === upper) return values[lower];
  const frac = clamped - lower;
  return values[lower] * (1 - frac) + values[upper] * frac;
}

export function getAvailableFish(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
): Fish[] {
  const levels = getEquipmentLevels(equipment);
  const avgLevel = (levels.rod + levels.reel + levels.lure) / 3;

  return FISH_DATABASE.filter(fish => {
    if (fish.minEquipmentLevel > avgLevel + 1) return false;
    if (fish.limitedNodes && !fish.limitedNodes.includes(nodeId)) return false;
    if (!fish.limitedNodes && !fish.regions.includes(region)) return false;
    return true;
  });
}

export function selectFish(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
  isSpecialSpot: boolean,
): Fish {
  const available = getAvailableFish(nodeId, region, equipment);

  if (available.length === 0) {
    return FISH_DATABASE.find(f => f.rarity === 'common')!;
  }

  const rareLevel = getEffectiveLevel(equipment, 'rareChance');
  const rareBonus = interpolateBonus(LURE_RARE_BONUS, rareLevel);
  const specialBonus = isSpecialSpot ? 0.5 : 0;

  const weights = available.map(fish => {
    let weight = RARITY_BASE_WEIGHT[fish.rarity];
    if (fish.rarity === 'rare' || fish.rarity === 'legendary' || fish.rarity === 'mythical') {
      weight *= (1 + rareBonus + specialBonus);
    }
    return weight;
  });

  return weightedRandom(available, weights);
}

export function generateFishSize(): number {
  // 正規分布風: 平均1.0, ほとんど0.5-1.5, まれに2.0
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0.5, Math.min(2.0, 1.0 + normal * 0.25));
}

export function calculateFishPoints(fish: Fish, size: number, bonusMultiplier: number): number {
  return Math.round(fish.points * size * bonusMultiplier);
}

export function createCaughtFish(fishId: string, nodeId: string, turn: number): CaughtFish {
  return {
    fishId,
    caughtAt: nodeId,
    turn,
    size: generateFishSize(),
  };
}

export function getBiteDelay(equipment: PlayerEquipment): number {
  const baseMin = 1500;
  const baseMax = 5000;
  const biteLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const speedBonus = interpolateBonus(LURE_BITE_SPEED_BONUS, biteLevel);
  const adjustedMax = baseMax * (1 - speedBonus);
  return randomFloat(baseMin, Math.max(baseMin, adjustedMax));
}
