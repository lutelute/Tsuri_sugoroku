import { describe, it, expect, afterEach } from 'vitest';
import type { CaughtFish, FishRarity, PlayerEquipment } from './types';
import {
  interpolateBonus, getStrikeGreenZone, getEffectiveLevel,
  generateFishSize, selectFish, checkTairyou, createCaughtFish,
  mergeSelectOpts, fishOdds, RARITY_RANK, RIGS, RIG_ORDER, rigBlockReason, canQuickCatch, QUICK_CATCH_LEVEL,
  getSpotFish, getAvailableFish, fishNeedLevel, summarizeSpot, regionProgress, expectedSellPrice,
} from './fishing';
import type { FishSelectOpts } from './fishing';
import { LURE_BITE_SPEED_BONUS, TAIRYOU_BONUS_MAX, REGION_COMPLETE_SPECIES, FISH_SELL_PRICE } from './constants';
import { createInitialEquipment, createEquipmentItem } from './equipment';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

afterEach(() => resetRandomSource());

describe('interpolateBonus', () => {
  const arr = LURE_BITE_SPEED_BONUS; // [0,0,0.15,0.25,0.35,0.5]

  it('整数レベルは配列の値そのまま', () => {
    expect(interpolateBonus(arr, 1)).toBe(0);
    expect(interpolateBonus(arr, 2)).toBe(0.15);
    expect(interpolateBonus(arr, 5)).toBe(0.5);
  });

  it('小数レベルは線形補間', () => {
    expect(interpolateBonus(arr, 2.5)).toBeCloseTo(0.2, 5);
  });

  it('範囲外は[1, length-1]にクランプ', () => {
    expect(interpolateBonus(arr, 0.5)).toBe(arr[1]);
    expect(interpolateBonus(arr, 99)).toBe(arr[5]);
  });
});

describe('getStrikeGreenZone', () => {
  it('Lv1=0.27, Lv5=0.47（useFishingとWaitingPhaseで共有する式）', () => {
    expect(getStrikeGreenZone(1)).toBeCloseTo(0.27, 5);
    expect(getStrikeGreenZone(5)).toBeCloseTo(0.47, 5);
  });
});

describe('getEffectiveLevel', () => {
  it('初期装備(全Lv1)のstrike実効レベルは1.0', () => {
    const eq = createInitialEquipment();
    expect(getEffectiveLevel(eq, 'strike')).toBeCloseTo(1.0, 5);
  });

  it('ルアー主力の能力はルアーレベルに強く依存する', () => {
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const lure = createEquipmentItem('lure', 5);
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
    // rareChance: rod0.1 + reel0.2 + lure0.7 = 0.1+0.2+3.5 = 3.8
    expect(getEffectiveLevel(eq, 'rareChance')).toBeCloseTo(3.8, 5);
  });
});

describe('generateFishSize', () => {
  it('装備なしでも 0.5〜2.0 の範囲に収まる', () => {
    setRandomSource(mulberry32(99));
    for (let i = 0; i < 2000; i++) {
      const s = generateFishSize();
      expect(s).toBeGreaterThanOrEqual(0.5);
      expect(s).toBeLessThanOrEqual(2.0);
    }
  });
});

describe('selectFish', () => {
  it('ルアー未装着なら必ずコモンを返す', () => {
    setRandomSource(mulberry32(5));
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: null }, inventory: [rod, reel] };
    for (let i = 0; i < 30; i++) {
      const fish = selectFish('tokyo', 'kanto', eq, false);
      expect(fish.rarity).toBe('common');
    }
  });

  it('船釣りはレア以上を優先する', () => {
    setRandomSource(mulberry32(3));
    const eq = createInitialEquipment();
    // 船釣りはレア/伝説/神話のみ（無ければuncommon以上にフォールバック）
    for (let i = 0; i < 30; i++) {
      const fish = selectFish('tokyo', 'kanto', eq, false, true);
      expect(['uncommon', 'rare', 'legendary', 'mythical']).toContain(fish.rarity);
    }
  });
});

describe('checkTairyou', () => {
  it('乱数が確率を上回れば0匹', () => {
    setRandomSource(() => 0.999);
    const eq = createInitialEquipment();
    expect(checkTairyou(eq, false)).toBe(0);
  });

  it('発動時は 1〜TAIRYOU_BONUS_MAX 匹', () => {
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const lure = createEquipmentItem('lure', 5); // 大漁確率を確保
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
    setRandomSource(() => 0); // 確実に発動
    const n = checkTairyou(eq, false);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(TAIRYOU_BONUS_MAX);
  });
});

describe('createCaughtFish', () => {
  it('指定情報とサイズ(>=0.5)を持つ釣果を生成', () => {
    setRandomSource(mulberry32(11));
    const caught = createCaughtFish('test_fish', 'tokyo', 7);
    expect(caught.fishId).toBe('test_fish');
    expect(caught.caughtAt).toBe('tokyo');
    expect(caught.turn).toBe(7);
    expect(caught.size).toBeGreaterThanOrEqual(0.5);
  });
});

// ===== 釣り係: 補正つきの抽選・仕掛け・雑魚は手早く・釣り場の札 =====

/** 竿・リール・ルアーを同じレベルでそろえた道具 */
function gear(level: number, lureLevel = level): PlayerEquipment {
  const rod = createEquipmentItem('rod', level);
  const reel = createEquipmentItem('reel', level);
  const lure = createEquipmentItem('lure', lureLevel);
  return { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
}

/** 乱数を呼んだ回数を数えながら n 回抽選する */
function draw(n: number, seed: number, eq: PlayerEquipment, special: boolean, boat: boolean, opts?: FishSelectOpts) {
  const rng = mulberry32(seed);
  let calls = 0;
  setRandomSource(() => { calls++; return rng(); });
  const ids: string[] = [];
  const rarities: Record<FishRarity, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0, mythical: 0 };
  for (let i = 0; i < n; i++) {
    const f = opts === undefined ? selectFish('choshi', 'kanto', eq, special, boat) : selectFish('choshi', 'kanto', eq, special, boat, opts);
    ids.push(f.id);
    rarities[f.rarity]++;
  }
  return { ids, rarities, calls };
}

describe('selectFish の補正（漁場・仕掛け）', () => {
  it('補正を渡さない・空の補正・等倍の補正は、同じ魚を同じ乱数の回数で返す（既定の釣りを変えない）', () => {
    for (const lv of [1, 3, 5]) {
      for (const [special, boat] of [[false, false], [true, false], [true, true]] as const) {
        const base = draw(200, 42 + lv, gear(lv), special, boat);
        expect(draw(200, 42 + lv, gear(lv), special, boat, {})).toEqual(base);
        expect(draw(200, 42 + lv, gear(lv), special, boat, { rareMul: 1, commonMul: 1 })).toEqual(base);
        expect(base.calls).toBe(200); // 1匹につき乱数1回
      }
    }
  });

  it('maxRarity: それより上のレア度は出ない（数ねらいはコモンとアンコモンだけ）', () => {
    const r = draw(400, 7, gear(5), true, false, { maxRarity: 'uncommon' }).rarities;
    expect(r.rare + r.legendary + r.mythical).toBe(0);
    expect(r.common).toBeGreaterThan(0);
    expect(r.uncommon).toBeGreaterThan(0);
  });

  it('commonOnly: コモンしか出ない（ひどく荒れた漁場）。船でもコモン', () => {
    expect(draw(200, 8, gear(5), true, false, { commonOnly: true }).rarities.common).toBe(200);
    expect(draw(100, 8, gear(5), true, true, { commonOnly: true }).rarities.common).toBe(100);
  });

  it('rareMul でレア以上が増え、commonMul でコモンが減る（大物ねらい）', () => {
    const high = (r: Record<FishRarity, number>) => r.rare + r.legendary + r.mythical;
    const base = draw(3000, 9, gear(3), false, false).rarities;
    const boosted = draw(3000, 9, gear(3), false, false, { rareMul: 2.5, commonMul: 0.4 }).rarities;
    expect(high(boosted)).toBeGreaterThan(high(base) * 1.8);
    expect(boosted.common).toBeLessThan(base.common * 0.7);
  });

  it('補正を重ねる: 倍率は掛け算、レア度の上限は低い方、commonOnly はどちらかにあれば効く', () => {
    expect(mergeSelectOpts(undefined, undefined)).toBeUndefined();
    expect(mergeSelectOpts({ rareMul: 2.5 }, undefined)).toEqual({ rareMul: 2.5 });
    expect(mergeSelectOpts(undefined, { commonOnly: true })).toEqual({ commonOnly: true });
    expect(mergeSelectOpts({ rareMul: 2.5, commonMul: 0.4 }, { rareMul: 1.5 })).toEqual({ rareMul: 3.75, commonMul: 0.4 });
    expect(mergeSelectOpts({ maxRarity: 'uncommon' }, { maxRarity: 'rare' })).toEqual({ maxRarity: 'uncommon' });
    expect(mergeSelectOpts({ maxRarity: 'uncommon' }, { commonOnly: true })).toEqual({ maxRarity: 'uncommon', commonOnly: true });
  });

  it('fishOdds は抽選と同じ候補（出た魚は必ず重み0より大きい候補に入っている）', () => {
    for (const [boat, opts] of [[false, undefined], [true, undefined], [false, { maxRarity: 'uncommon' }], [false, { rareMul: 2.5, commonMul: 0.4 }]] as const) {
      const eq = gear(4);
      const odds = new Map(fishOdds('choshi', 'kanto', eq, true, boat, opts).map(o => [o.fish.id, o.weight]));
      for (const id of draw(300, 21, eq, true, boat, opts).ids) expect(odds.get(id)).toBeGreaterThan(0);
    }
    // ルアー無しはコモンだけ
    const rod = createEquipmentItem('rod', 3);
    const noLure: PlayerEquipment = { equipped: { rod: rod.id, reel: null, lure: null }, inventory: [rod] };
    expect(fishOdds('choshi', 'kanto', noLure, true).every(o => o.fish.rarity === 'common')).toBe(true);
  });

  it('checkTairyou: 上乗せの確率で大漁が起きる（ルアーLv1は元の確率0）。上乗せ無しは今まで通り', () => {
    const eq = gear(1);
    setRandomSource(() => 0.1);
    expect(checkTairyou(eq, false)).toBe(0);
    expect(checkTairyou(eq, false, 0.15)).toBeGreaterThanOrEqual(1);
    setRandomSource(() => 0.16);
    expect(checkTairyou(eq, false, 0.15)).toBe(0);
  });
});

describe('仕掛け（数ねらい・ふつう・大物ねらい）', () => {
  it('3つあり、ふつうは補正なし・1回ぶん。大物ねらいは2回ぶんで、逃がすと傷みが倍', () => {
    expect(RIG_ORDER).toEqual(['kazu', 'futsu', 'oomono']);
    expect(RIGS.futsu.select).toBeUndefined();
    expect(RIGS.futsu).toMatchObject({ biteMul: 1, tairyouAdd: 0, slots: 1, escapeWearMul: 1 });
    expect(RIGS.kazu.select).toEqual({ maxRarity: 'uncommon' });
    expect(RIGS.kazu.biteMul).toBeLessThan(1);
    expect(RIGS.kazu.tairyouAdd).toBeGreaterThan(0);
    expect(RIGS.oomono.slots).toBe(2);
    expect(RIGS.oomono.biteMul).toBeGreaterThan(1);
    expect(RIGS.oomono.escapeWearMul).toBe(2);
    expect(RIGS.oomono.select?.rareMul).toBeGreaterThan(1);
    expect(RIGS.oomono.select?.commonMul).toBeLessThan(1);
  });

  it('大物ねらいは竿 Lv2 以上と、残り2回ぶんの枠が要る', () => {
    expect(rigBlockReason('oomono', gear(1), 3)).toBe('竿 Lv2 から');
    expect(rigBlockReason('oomono', gear(2), 3)).toBeNull();
    expect(rigBlockReason('oomono', gear(2), 2)).toBeNull();
    expect(rigBlockReason('oomono', gear(2), 1)).toBe('2回ぶん使う（残り1回）');
    expect(rigBlockReason('kazu', gear(1), 1)).toBeNull();
    expect(rigBlockReason('futsu', gear(1), 1)).toBeNull();
    expect(rigBlockReason('futsu', gear(1), 0)).toBe('この手番はもう釣れない');
    expect(rigBlockReason('oomono', gear(2), 0)).toBe('この手番はもう釣れない');
  });

  it('竿が無ければどれも選べない', () => {
    const noRod: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [] };
    for (const r of RIG_ORDER) expect(rigBlockReason(r, noRod, 3)).toBe('竿がない');
  });
});

describe('雑魚は手早く（canQuickCatch）', () => {
  it('コモンは「巻き」2.5 以上、アンコモンは 3.5 以上。レア以上は省かない', () => {
    expect(QUICK_CATCH_LEVEL).toEqual({ common: 2.5, uncommon: 3.5 });
    expect(canQuickCatch('common', gear(2))).toBe(false);
    expect(canQuickCatch('common', gear(3))).toBe(true);
    expect(canQuickCatch('uncommon', gear(3))).toBe(false);
    expect(canQuickCatch('uncommon', gear(4))).toBe(true);
    for (const r of ['rare', 'legendary', 'mythical'] as FishRarity[]) expect(canQuickCatch(r, gear(5))).toBe(false);
  });

  it('リールが主力（リールだけ育てても届く）。リールが無ければ省かない', () => {
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 4);
    const lure = createEquipmentItem('lure', 1);
    // 0.2 + 2.4 + 0.2 = 2.8
    expect(canQuickCatch('common', { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] })).toBe(true);
    expect(canQuickCatch('common', { equipped: { rod: rod.id, reel: null, lure: lure.id }, inventory: [rod, lure] })).toBe(false);
  });
});

describe('釣り場の札（summarizeSpot）', () => {
  it('この釣り場の魚の数と、まだ見ていない数', () => {
    const all = getSpotFish('choshi', 'kanto');
    expect(all.length).toBeGreaterThan(20);
    const none = summarizeSpot('choshi', 'kanto', gear(1), true, {});
    expect(none.total).toBe(all.length);
    expect(none.unseen).toBe(all.length);
    const seen = Object.fromEntries(all.slice(0, 5).map(f => [f.id, true]));
    expect(summarizeSpot('choshi', 'kanto', gear(1), true, seen).unseen).toBe(all.length - 5);
  });

  it('影絵3つ: いちばんの大物・まだ見ぬ魚・道具が足りない魚は別の魚', () => {
    const eq = gear(1);
    const s = summarizeSpot('choshi', 'kanto', eq, true, {});
    const reachable = new Set(getAvailableFish('choshi', 'kanto', eq).map(f => f.id));
    expect(s.best).not.toBeNull();
    expect(reachable.has(s.best!.id)).toBe(true);
    // いちばんの大物は、今の道具で釣れる中でいちばんめずらしい
    for (const f of getAvailableFish('choshi', 'kanto', eq)) expect(RARITY_RANK[f.rarity]).toBeLessThanOrEqual(RARITY_RANK[s.best!.rarity]);
    expect(s.rarestUnseen).not.toBeNull();
    expect(s.rarestUnseen!.id).not.toBe(s.best!.id);
    expect(reachable.has(s.rarestUnseen!.id)).toBe(true);
    expect(s.locked).not.toBeNull();
    expect(reachable.has(s.locked!.fish.id)).toBe(false);
    expect(s.lockedCount).toBe(s.total - reachable.size);
  });

  it('道具が足りない魚は、いちばん近い目標（要るレベルがいちばん低い）を見せ、そのレベルにすると釣れる', () => {
    const s = summarizeSpot('choshi', 'kanto', gear(1), true, {});
    const need = s.locked!.needLevel;
    expect(need).toBeGreaterThan(1);
    expect(fishNeedLevel(s.locked!.fish)).toBe(need);
    expect(getAvailableFish('choshi', 'kanto', gear(need)).some(f => f.id === s.locked!.fish.id)).toBe(true);
    expect(getAvailableFish('choshi', 'kanto', gear(need - 1)).some(f => f.id === s.locked!.fish.id)).toBe(false);
    // 最高の道具なら足りない魚は無い
    const top = summarizeSpot('choshi', 'kanto', gear(5), true, {});
    expect(top.locked).toBeNull();
    expect(top.lockedCount).toBe(0);
  });

  it('見たことのある魚は「まだ見ぬ魚」に選ばない。全部見ていれば無し', () => {
    const eq = gear(2);
    const first = summarizeSpot('choshi', 'kanto', eq, true, {});
    const seenOne = summarizeSpot('choshi', 'kanto', eq, true, { [first.rarestUnseen!.id]: true });
    expect(seenOne.rarestUnseen?.id).not.toBe(first.rarestUnseen!.id);
    const allSeen = Object.fromEntries(getSpotFish('choshi', 'kanto').map(f => [f.id, true]));
    expect(summarizeSpot('choshi', 'kanto', eq, true, allSeen).rarestUnseen).toBeNull();
    expect(summarizeSpot('choshi', 'kanto', eq, true, allSeen).unseen).toBe(0);
  });

  it('漁場がひどく荒れていると、いちばんの大物もコモンになる', () => {
    const s = summarizeSpot('choshi', 'kanto', gear(5), true, {}, { commonOnly: true });
    expect(s.best?.rarity).toBe('common');
  });
});

describe('地域制覇までの残り（regionProgress）', () => {
  const caught = (fishId: string, caughtAt: string): CaughtFish => ({ fishId, caughtAt, turn: 1, size: 1 });

  it('その地方の釣り場で釣った種類を数える（同じ魚は1種、ほかの地方で釣った魚は数えない）', () => {
    const list = [caught('a', 'choshi'), caught('a', 'choshi'), caught('b', 'choshi'), caught('c', 'otaru')];
    expect(regionProgress(list, 'kanto')).toEqual({ caught: 2, left: REGION_COMPLETE_SPECIES - 2, goal: REGION_COMPLETE_SPECIES });
    expect(regionProgress(list, 'hokkaido').caught).toBe(1);
    expect(regionProgress([], 'kinki').left).toBe(REGION_COMPLETE_SPECIES);
  });

  it('届いたら残りは0', () => {
    const list = Array.from({ length: REGION_COMPLETE_SPECIES + 2 }, (_, i) => caught(`f${i}`, 'choshi'));
    expect(regionProgress(list, 'kanto').left).toBe(0);
  });
});

describe('1匹の売値の見込み（expectedSellPrice）', () => {
  it('候補が無ければ0。Lv1 の道具ではコモンとアンコモンの間', () => {
    expect(expectedSellPrice([], gear(1))).toBe(0);
    const eq = gear(1);
    const v = expectedSellPrice(fishOdds('choshi', 'kanto', eq, false), eq);
    expect(v).toBeGreaterThan(FISH_SELL_PRICE.common);
    expect(v).toBeLessThan(FISH_SELL_PRICE.uncommon);
  });

  it('道具が育つと上がる', () => {
    const lo = gear(1);
    const hi = gear(4);
    expect(expectedSellPrice(fishOdds('choshi', 'kanto', hi, false), hi)).toBeGreaterThan(expectedSellPrice(fishOdds('choshi', 'kanto', lo, false), lo) * 1.3);
  });
});
