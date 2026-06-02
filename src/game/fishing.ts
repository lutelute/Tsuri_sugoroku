import type { Fish, PlayerEquipment, Region, CaughtFish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import {
  LURE_RARE_BONUS, LURE_BITE_SPEED_BONUS, EQUIPMENT_WEIGHTS,
  ROD_SIZE_BONUS, ROD_RARITY_BOOST, LURE_TAIRYOU_CHANCE,
  TAIRYOU_BONUS_MIN, TAIRYOU_BONUS_MAX,
  FISHING_BITE_MIN_MS, FISHING_BITE_MAX_MS,
  FISHING_STRIKE_GREEN_ZONE_BASE, FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL,
  RARITY_BASE_WEIGHT, SPECIAL_SPOT_RARE_BONUS,
  SPECIAL_SPOT_LEGENDARY_MULT, SPECIAL_SPOT_MYTHICAL_MULT,
} from './constants';
import type { EquipmentAbility } from './constants';
import { getEquipmentLevels, getEquippedItem } from './equipment';
import { weightedRandom, randomFloat, random } from '../utils/random';

// ストライク緑ゾーンの幅（0-1）。WaitingPhaseの描画とuseFishingの当たり判定で共有する単一の真実。
export function getStrikeGreenZone(strikeLevel: number): number {
  return FISHING_STRIKE_GREEN_ZONE_BASE + FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL * (strikeLevel - 1);
}

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

  // ルアーなし: コモンのみ
  if (!getEquippedItem(equipment, 'lure')) {
    const commonOnly = available.filter(f => f.rarity === 'common');
    if (commonOnly.length > 0) {
      return commonOnly[Math.floor(random() * commonOnly.length)];
    }
    return FISH_DATABASE.find(f => f.rarity === 'common')!;
  }

  const rareLevel = getEffectiveLevel(equipment, 'rareChance');
  const rareBonus = interpolateBonus(LURE_RARE_BONUS, rareLevel);
  // 竿によるレア度全体ブースト
  const rarityBoostLevel = getEffectiveLevel(equipment, 'rarityBoost');
  const rarityBoost = interpolateBonus(ROD_RARITY_BOOST, rarityBoostLevel);
  const specialBonus = isSpecialSpot ? SPECIAL_SPOT_RARE_BONUS : 0;
  // rare以上に共通でかかる倍率（ルアー＋竿＋特別スポット）
  const highTierMult = 1 + rareBonus + rarityBoost + specialBonus;

  // 1匹あたりの出現重みを算出。特別スポットでは legendary/mythical をさらに大きく底上げする。
  const computeWeight = (fish: Fish): number => {
    let weight = RARITY_BASE_WEIGHT[fish.rarity] ?? 1;
    switch (fish.rarity) {
      case 'rare':
        weight *= highTierMult;
        break;
      case 'legendary':
        weight *= highTierMult * (isSpecialSpot ? SPECIAL_SPOT_LEGENDARY_MULT : 1);
        break;
      case 'mythical':
        weight *= highTierMult * (isSpecialSpot ? SPECIAL_SPOT_MYTHICAL_MULT : 1);
        break;
      case 'uncommon':
        weight *= (1 + rarityBoost * 0.5);
        break;
      case 'common':
        // 竿レア度ブーストでcommonの出現率を少し下げる
        if (rarityBoost > 0) weight *= Math.max(0.3, 1 - rarityBoost * 0.6);
        break;
    }
    return weight;
  };

  // 船釣り: レア以上の魚のみ（高レア度ブーストもそのまま適用＝幻の魚に最も近づける手段）
  if (boatFishing) {
    const rareOrAbove = available.filter(
      f => f.rarity === 'rare' || f.rarity === 'legendary' || f.rarity === 'mythical',
    );
    if (rareOrAbove.length > 0) {
      return weightedRandom(rareOrAbove, rareOrAbove.map(computeWeight));
    }
    // レア以上がいない場合はuncommon以上
    const uncommonOrAbove = available.filter(f => f.rarity !== 'common');
    if (uncommonOrAbove.length > 0) {
      return weightedRandom(uncommonOrAbove, uncommonOrAbove.map(computeWeight));
    }
  }

  return weightedRandom(available, available.map(computeWeight));
}

export function generateFishSize(equipment?: PlayerEquipment): number {
  // 正規分布風: 平均1.0, ほとんど0.5-1.5, まれに2.0
  const u1 = random();
  const u2 = random();
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

  if (random() >= chance) return 0;

  // 大漁発動！ 1〜3匹追加
  return TAIRYOU_BONUS_MIN + Math.floor(random() * (TAIRYOU_BONUS_MAX - TAIRYOU_BONUS_MIN + 1));
}

export function calculateFishPoints(fish: Fish, size: number, bonusMultiplier: number): number {
  return Math.round(fish.points * size * bonusMultiplier);
}

// 釣果を生成する。equipment を渡すと竿のサイズボーナスが反映される。
export function createCaughtFish(fishId: string, nodeId: string, turn: number, equipment?: PlayerEquipment): CaughtFish {
  return {
    fishId,
    caughtAt: nodeId,
    turn,
    size: generateFishSize(equipment),
  };
}

export function getBiteDelay(equipment: PlayerEquipment): number {
  const biteLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const speedBonus = interpolateBonus(LURE_BITE_SPEED_BONUS, biteLevel);
  const adjustedMax = FISHING_BITE_MAX_MS * (1 - speedBonus);
  return randomFloat(FISHING_BITE_MIN_MS, Math.max(FISHING_BITE_MIN_MS, adjustedMax));
}
