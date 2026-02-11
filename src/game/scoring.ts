import type { Player, ScoreBreakdown, Region } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import {
  RARITY_BONUS,
  REGION_COMPLETE_BONUS,
  ENCYCLOPEDIA_COMPLETION_BONUS_PER_PERCENT,
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

  // 地域制覇ボーナス
  const regions: Region[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];
  let regionBonus = 0;
  for (const region of regions) {
    const regionFish = FISH_DATABASE.filter(f => f.regions.includes(region));
    const caughtInRegion = regionFish.filter(f => uniqueFish.has(f.id));
    if (regionFish.length > 0 && caughtInRegion.length >= Math.ceil(regionFish.length * 0.5)) {
      regionBonus += REGION_COMPLETE_BONUS;
    }
  }

  // 図鑑完成度ボーナス
  const totalFish = FISH_DATABASE.length;
  const caughtCount = Object.keys(encyclopedia).filter(k => encyclopedia[k]).length;
  const completionPercent = Math.floor((caughtCount / totalFish) * 100);
  const encyclopediaBonus = completionPercent * ENCYCLOPEDIA_COMPLETION_BONUS_PER_PERCENT;

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
