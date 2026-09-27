import { describe, it, expect } from 'vitest';
import { buildReelParams, createReelState, stepReel, HEAD_START_PROGRESS, RARITY_DIFFICULTY } from './reelSim';
import type { FishMood } from './reelSim';
import { playReel, type BotKind } from './reelBots';
import { createEquipmentItem } from '../../game/equipment';
import { mulberry32 } from '../../utils/random';
import type { FishRarity, PlayerEquipment } from '../../game/types';

// 竿・リール・ルアーを同じレベルで揃えた装備
function gear(level: number): PlayerEquipment {
  const rod = createEquipmentItem('rod', level);
  const reel = createEquipmentItem('reel', level);
  const lure = createEquipmentItem('lure', level);
  return { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
}

function rate(kind: BotKind, rarity: FishRarity, eq: PlayerEquipment, n = 200): { success: number; avgTime: number } {
  const p = buildReelParams(eq, rarity);
  let ok = 0;
  let time = 0;
  for (let i = 0; i < n; i++) {
    const s = playReel(kind, p, mulberry32(i * 7919 + 13));
    if (s.result === 'caught') {
      ok++;
      time += s.elapsed;
    }
  }
  return { success: ok / n, avgTime: ok ? time / ok : Infinity };
}

describe('やり取り: 公平さ（その魚に出会える装備なら釣れる）', () => {
  it('common（Lv1）: テンションを見て指を離せば誰でも釣れる', () => {
    expect(rate('careless', 'common', gear(1)).success).toBeGreaterThanOrEqual(0.9);
  });

  it('uncommon（Lv1）: ほぼ釣れる', () => {
    expect(rate('careless', 'uncommon', gear(1)).success).toBeGreaterThanOrEqual(0.85);
  });

  it('rare（Lv2）: 暴れを見てから離す程度で十分釣れる', () => {
    expect(rate('novice', 'rare', gear(2)).success).toBeGreaterThanOrEqual(0.85);
  });

  it('legendary（Lv3）: 波を読めば確実に釣れる', () => {
    expect(rate('good', 'legendary', gear(3)).success).toBeGreaterThanOrEqual(0.95);
  });

  it('legendary の初遭遇（Lv2〜3装備が多い）: 慣れてきた子供なら大半は釣れ、初見でも望みがある', () => {
    expect(rate('good', 'legendary', gear(2)).success).toBeGreaterThanOrEqual(0.95);
    expect(rate('novice', 'legendary', gear(2)).success).toBeGreaterThanOrEqual(0.5);
    expect(rate('novice', 'legendary', gear(3)).success).toBeGreaterThanOrEqual(0.9);
    expect(rate('careless', 'legendary', gear(3)).success).toBeGreaterThanOrEqual(0.3);
  });

  it('mythical: 最高装備なら波を読めば確実、慣れてきた子供でも半分以上釣れる', () => {
    expect(rate('good', 'mythical', gear(5)).success).toBeGreaterThanOrEqual(0.95);
    expect(rate('good', 'mythical', gear(4)).success).toBeGreaterThanOrEqual(0.9);
    expect(rate('novice', 'mythical', gear(5)).success).toBeGreaterThanOrEqual(0.45);
  });
});

describe('やり取り: 手応え（腕と装備の差が出る）', () => {
  it('その魚に見合う装備で押しっぱなしにすると糸が切れる（common でも「離す」ことを覚える）', () => {
    const expected: Record<FishRarity, number> = { common: 1, uncommon: 1, rare: 2, legendary: 3, mythical: 5 };
    for (const r of Object.keys(RARITY_DIFFICULTY) as FishRarity[]) {
      expect(rate('greedy', r, gear(expected[r]), 50).success).toBe(0);
    }
  });

  it('最高装備なら雑魚は押しっぱなしでも一瞬（装備を育てた気持ちよさ）', () => {
    expect(rate('greedy', 'common', gear(5), 50).success).toBe(1);
  });

  it('大物は魚の気分（予兆・暴れ）を無視すると失敗しやすい', () => {
    // legendary は初遭遇の装備で差が出る / mythical は最高装備でも波を読む必要がある
    expect(rate('careless', 'legendary', gear(2)).success).toBeLessThanOrEqual(0.4);
    expect(rate('careless', 'mythical', gear(5)).success).toBeLessThanOrEqual(0.4);
    // 予兆で離す上級者との差がはっきりある
    expect(rate('good', 'mythical', gear(5)).success - rate('careless', 'mythical', gear(5)).success).toBeGreaterThanOrEqual(0.5);
  });

  it('装備が良くなって成功率が下がることはない（どの腕前でも）', () => {
    const minLevel: Record<FishRarity, number> = { common: 1, uncommon: 1, rare: 1, legendary: 2, mythical: 4 };
    for (const r of Object.keys(RARITY_DIFFICULTY) as FishRarity[]) {
      for (const kind of ['good', 'novice', 'careless'] as BotKind[]) {
        let prev = -1;
        for (let lv = minLevel[r]; lv <= 5; lv++) {
          const cur = rate(kind, r, gear(lv)).success;
          expect(cur, `${r} ${kind} Lv${lv}`).toBeGreaterThanOrEqual(prev - 0.05);
          prev = cur;
        }
      }
    }
  });

  it('装備が良いほど早く釣れる', () => {
    expect(rate('good', 'legendary', gear(5)).avgTime).toBeLessThan(rate('good', 'legendary', gear(3)).avgTime);
    expect(rate('good', 'common', gear(4)).avgTime).toBeLessThan(rate('good', 'common', gear(1)).avgTime);
  });

  it('リールなしは困難だが不可能ではない', () => {
    const rod = createEquipmentItem('rod', 1);
    const lure = createEquipmentItem('lure', 1);
    const noReel: PlayerEquipment = { equipped: { rod: rod.id, reel: null, lure: lure.id }, inventory: [rod, lure] };
    const r = rate('good', 'common', noReel).success;
    expect(r).toBeGreaterThan(0.3);
    expect(r).toBeLessThan(rate('good', 'common', gear(1)).success);
  });
});

describe('やり取り: 状態機械', () => {
  it('暴れの前には必ず予兆が来る（理不尽な即死がない）', () => {
    const p = buildReelParams(gear(3), 'mythical');
    const rng = mulberry32(99);
    const s = createReelState(p, rng);
    let prev: FishMood = s.mood;
    for (let i = 0; i < 60 * 60; i++) {
      stepReel(s, p, 1 / 60, false, rng);
      if (s.result !== 'playing') break;
      if (s.mood === 'surge' && prev !== 'surge') expect(prev).toBe('warn');
      prev = s.mood;
    }
  });

  it('暴れ開始の瞬間に巻いているとショックを受け、離していれば受けない', () => {
    const p = buildReelParams(gear(3), 'legendary');
    const run = (holdAtSurge: boolean) => {
      const rng = mulberry32(5);
      const s = createReelState(p, rng);
      // 予兆の直前まで離して待つ
      while (s.mood !== 'warn') stepReel(s, p, 1 / 60, false, rng);
      while (s.mood === 'warn') stepReel(s, p, 1 / 60, holdAtSurge, rng);
      return s;
    };
    expect(run(true).joltAt).toBeGreaterThanOrEqual(0);
    expect(run(false).joltAt).toBe(-1);
  });

  it('会心の合わせで初期進捗がつく', () => {
    const p = buildReelParams(gear(1), 'common');
    expect(createReelState(p, mulberry32(1), true).progress).toBe(HEAD_START_PROGRESS);
    expect(createReelState(p, mulberry32(1), false).progress).toBe(0);
  });

  it('制限時間を過ぎると timeout', () => {
    const p = buildReelParams(gear(1), 'common');
    const rng = mulberry32(2);
    const s = createReelState(p, rng);
    for (let i = 0; i < (p.timeLimit + 1) * 60; i++) stepReel(s, p, 1 / 60, false, rng);
    expect(s.result).toBe('timeout');
  });
});
