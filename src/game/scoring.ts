import type { Player, ScoreBreakdown, Region } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { NODE_MAP } from '../data/boardNodes';
import {
  RARITY_BONUS,
  REGION_COMPLETE_SPECIES,
  REGION_COMPLETE_BONUS,
  ENCYCLOPEDIA_BONUS_PER_SPECIES,
  GIANT_FISH_THRESHOLD,
  GIANT_FISH_BONUS,
  FINISH_BONUS,
  MONEY_TO_POINTS_RATE,
} from './constants';

export function calculateScore(player: Player, encyclopedia: Record<string, boolean>): ScoreBreakdown {
  const fishMap = new Map(FISH_DATABASE.map(f => [f.id, f]));

  // 魚ポイント合計
  let fishPoints = 0;
  for (const caught of player.caughtFish) {
    const fish = fishMap.get(caught.fishId);
    if (fish) {
      fishPoints += Math.round(fish.points * caught.size * (caught.bonusMultiplier || 1));
    }
  }

  // レアリティボーナス
  let rarityBonus = 0;
  const uniqueFish = new Set(player.caughtFish.map(c => c.fishId));
  for (const fishId of uniqueFish) {
    const fish = fishMap.get(fishId);
    if (fish) {
      rarityBonus += RARITY_BONUS[fish.rarity] || 0;
    }
  }

  // 地域制覇ボーナス: 地方ごとに「その地方のマスで釣った魚種」を数え、REGION_COMPLETE_SPECIES 種以上で加点
  const speciesByRegion = new Map<Region, Set<string>>();
  for (const caught of player.caughtFish) {
    const region = NODE_MAP.get(caught.caughtAt)?.region;
    if (!region) continue;
    let set = speciesByRegion.get(region);
    if (!set) {
      set = new Set();
      speciesByRegion.set(region, set);
    }
    set.add(caught.fishId);
  }
  let regionBonus = 0;
  for (const set of speciesByRegion.values()) {
    if (set.size >= REGION_COMPLETE_SPECIES) regionBonus += REGION_COMPLETE_BONUS;
  }

  // 図鑑完成度ボーナス
  // 図鑑ボーナス: 図鑑に載った魚 1 種ごとに加点（図鑑にある魚だけ数える）
  const caughtCount = Object.keys(encyclopedia).filter(k => encyclopedia[k] && fishMap.has(k)).length;
  const encyclopediaBonus = caughtCount * ENCYCLOPEDIA_BONUS_PER_SPECIES;

  // 巨大魚ボーナス
  let giantFishBonus = 0;
  for (const caught of player.caughtFish) {
    if (caught.size >= GIANT_FISH_THRESHOLD) {
      giantFishBonus += GIANT_FISH_BONUS;
    }
  }

  // ゴール順位ボーナス
  const finishBonus = player.finishOrder !== null
    ? (FINISH_BONUS[player.finishOrder] || 0)
    : 0;

  // 残金変換
  const moneyBonus = Math.floor(player.money * MONEY_TO_POINTS_RATE);

  const total = fishPoints + rarityBonus + regionBonus + encyclopediaBonus + giantFishBonus + finishBonus + moneyBonus;

  return {
    fishPoints,
    rarityBonus,
    regionBonus,
    encyclopediaBonus,
    giantFishBonus,
    finishBonus,
    moneyBonus,
    total,
  };
}
