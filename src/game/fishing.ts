import type { Fish, FishRarity, PlayerEquipment, Region, CaughtFish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { LURE_RARE_BONUS } from './constants';
import { weightedRandom, randomFloat } from '../utils/random';

const RARITY_BASE_WEIGHT: Record<FishRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 12,
  legendary: 3,
  mythical: 0.5,
};

export function getAvailableFish(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
): Fish[] {
  const avgLevel = (equipment.rod + equipment.reel + equipment.lure) / 3;

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

  const rareBonus = LURE_RARE_BONUS[equipment.lure] || 0;
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

export function getBiteDelay(lureLevel: number): number {
  const baseMin = 1500;
  const baseMax = 5000;
  const speedBonus = [0, 0, 0.15, 0.25, 0.35, 0.5][lureLevel] || 0;
  const adjustedMax = baseMax * (1 - speedBonus);
  return randomFloat(baseMin, Math.max(baseMin, adjustedMax));
}
