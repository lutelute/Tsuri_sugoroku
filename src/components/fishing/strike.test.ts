import { describe, it, expect } from 'vitest';
import { judgeStrike, pickMiniGame, STRIKE_RING_PERIOD_MS } from './strike';
import { getStrikeGreenZone } from '../../game/fishing';
import { mulberry32 } from '../../utils/random';
import type { FishingMiniGame } from '../../game/types';

describe('judgeStrike（合わせの判定）', () => {
  const g1 = getStrikeGreenZone(1);
  const g5 = getStrikeGreenZone(5);

  it('当たり直後にすぐ押すと「早すぎ」（旧UIの「タップ！」で即押し→失敗の罠を明示化）', () => {
    expect(judgeStrike(0.02, g1)).toBe('early');
    expect(judgeStrike(0.02, g5)).toBe('early');
  });

  it('帯の中心は会心、帯の端は good、帯の外は late', () => {
    expect(judgeStrike(0.5, g1)).toBe('perfect');
    expect(judgeStrike(0.5 + g1 / 2 - 0.001, g1)).toBe('good');
    expect(judgeStrike(0.5 + g1 / 2 + 0.001, g1)).toBe('late');
    expect(judgeStrike(0.99, g5)).toBe('late');
  });

  it('竿が良いほど成功の猶予（実時間）が広い', () => {
    const windowMs = (g: number) => g * STRIKE_RING_PERIOD_MS.common;
    expect(windowMs(g5)).toBeGreaterThan(windowMs(g1));
    // 子供でも狙える猶予: Lv1 でも 0.5 秒以上
    expect(windowMs(g1)).toBeGreaterThanOrEqual(500);
  });

  it('mythical（最速の当たり）でも最高装備なら 0.7 秒以上の猶予がある', () => {
    expect(g5 * STRIKE_RING_PERIOD_MS.mythical).toBeGreaterThanOrEqual(700);
  });
});

describe('pickMiniGame（ミニゲームの選択）', () => {
  it('直前と同じミニゲームは続けて出ない', () => {
    const rng = mulberry32(7);
    let last: FishingMiniGame | null = null;
    for (let i = 0; i < 500; i++) {
      const g = pickMiniGame('common', last, rng);
      expect(g).not.toBe(last);
      last = g;
    }
  });

  it('4種すべてが出現する', () => {
    const rng = mulberry32(11);
    const seen = new Set<FishingMiniGame>();
    for (let i = 0; i < 200; i++) seen.add(pickMiniGame('rare', null, rng));
    expect(seen.size).toBe(4);
  });

  it('legendary/mythical は「やり取り」が出やすい', () => {
    const count = (rarity: 'common' | 'mythical') => {
      const rng = mulberry32(3);
      let n = 0;
      for (let i = 0; i < 2000; i++) if (pickMiniGame(rarity, null, rng) === 'reeling') n++;
      return n / 2000;
    };
    expect(count('common')).toBeLessThan(0.3);
    expect(count('mythical')).toBeGreaterThan(0.4);
  });
});
