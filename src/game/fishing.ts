import type { Fish, FishRarity, PlayerEquipment, Region, CaughtFish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import {
  LURE_RARE_BONUS, LURE_BITE_SPEED_BONUS, EQUIPMENT_WEIGHTS,
  ROD_SIZE_BONUS, ROD_RARITY_BOOST, LURE_TAIRYOU_CHANCE,
  TAIRYOU_BONUS_MIN, TAIRYOU_BONUS_MAX,
} from './constants';
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
export function interpolateBonus(values: number[], level: number): number {
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
  boatFishing?: boolean,
): Fish {
  const available = getAvailableFish(nodeId, region, equipment);

  if (available.length === 0) {
    return FISH_DATABASE.find(f => f.rarity === 'common')!;
  }

  // 船釣り: レア以上の魚のみ
  if (boatFishing) {
    const rareOrAbove = available.filter(
      f => f.rarity === 'rare' || f.rarity === 'legendary' || f.rarity === 'mythical',
    );
    if (rareOrAbove.length > 0) {
      const weights = rareOrAbove.map(fish => RARITY_BASE_WEIGHT[fish.rarity]);
      return weightedRandom(rareOrAbove, weights);
    }
    // レア以上がいない場合はuncommon以上
    const uncommonOrAbove = available.filter(f => f.rarity !== 'common');
    if (uncommonOrAbove.length > 0) {
      const weights = uncommonOrAbove.map(fish => RARITY_BASE_WEIGHT[fish.rarity]);
      return weightedRandom(uncommonOrAbove, weights);
    }
  }

  const rareLevel = getEffectiveLevel(equipment, 'rareChance');
  const rareBonus = interpolateBonus(LURE_RARE_BONUS, rareLevel);
  // 竿によるレア度全体ブースト
  const rarityBoostLevel = getEffectiveLevel(equipment, 'rarityBoost');
  const rarityBoost = interpolateBonus(ROD_RARITY_BOOST, rarityBoostLevel);
  const specialBonus = isSpecialSpot ? 0.5 : 0;

  const weights = available.map(fish => {
    let weight = RARITY_BASE_WEIGHT[fish.rarity];
    if (fish.rarity === 'rare' || fish.rarity === 'legendary' || fish.rarity === 'mythical') {
      weight *= (1 + rareBonus + rarityBoost + specialBonus);
    } else if (fish.rarity === 'uncommon') {
      weight *= (1 + rarityBoost * 0.5);
    }
    // 竿レア度ブーストでcommonの出現率を少し下げる
    if (fish.rarity === 'common' && rarityBoost > 0) {
      weight *= Math.max(0.3, 1 - rarityBoost * 0.6);
    }
    return weight;
  });

  return weightedRandom(available, weights);
}

export function generateFishSize(equipment?: PlayerEquipment): number {
  // 正規分布風: 平均1.0, ほとんど0.5-1.5, まれに2.0
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  // 竿のサイズボーナス: 平均サイズが上がる + 上限も拡大
  const sizeLevel = equipment ? getEffectiveLevel(equipment, 'sizeBonus') : 0;
  const sizeBonus = sizeLevel > 0 ? interpolateBonus(ROD_SIZE_BONUS, sizeLevel) : 0;
  const base = 1.0 + sizeBonus;
  const maxSize = 2.0 + sizeBonus * 0.5;
  return Math.max(0.5, Math.min(maxSize, base + normal * 0.25));
}

// 大漁チェック: ルアー主体で追加の魚を獲得できるか判定
export function checkTairyou(equipment: PlayerEquipment, isSpecialSpot: boolean): number {
  const tairyouLevel = getEffectiveLevel(equipment, 'tairyouChance');
  const baseChance = interpolateBonus(LURE_TAIRYOU_CHANCE, tairyouLevel);
  const chance = baseChance + (isSpecialSpot ? 0.1 : 0);

  if (Math.random() >= chance) return 0;

  // 大漁発動！ 1〜3匹追加
  return TAIRYOU_BONUS_MIN + Math.floor(Math.random() * (TAIRYOU_BONUS_MAX - TAIRYOU_BONUS_MIN + 1));
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
