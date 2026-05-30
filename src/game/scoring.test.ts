import { describe, it, expect } from 'vitest';
import type { Player } from './types';
import { calculateScore } from './scoring';
import { createInitialEquipment } from './equipment';
import { FISH_DATABASE } from '../data/fishDatabase';
import { RARITY_BONUS, FINISH_BONUS, GIANT_FISH_BONUS, MONEY_TO_POINTS_RATE } from './constants';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    name: 'P',
    color: '#fff',
    currentNode: 'start',
    money: 0,
    equipment: createInitialEquipment(),
    caughtFish: [],
    score: 0,
    hasFinished: false,
    finishOrder: null,
    skipNextTurn: false,
    extraTurn: false,
    fishBonusMultiplier: 1,
    fishBonusTurnsLeft: 0,
    ...overrides,
  };
}

const fish = FISH_DATABASE[0];

describe('calculateScore', () => {
  it('内訳の合計が total と一致する', () => {
    const player = makePlayer({
      money: 1000,
      finishOrder: 0,
      caughtFish: [{ fishId: fish.id, caughtAt: 'x', turn: 1, size: 1, bonusMultiplier: 1 }],
    });
    const s = calculateScore(player, { [fish.id]: true });
    const sum = s.fishPoints + s.rarityBonus + s.regionBonus + s.encyclopediaBonus
      + s.giantFishBonus + s.finishBonus + s.moneyBonus;
    expect(s.total).toBe(sum);
  });

  it('魚ポイントは points × size × bonusMultiplier', () => {
    const player = makePlayer({
      caughtFish: [{ fishId: fish.id, caughtAt: 'x', turn: 1, size: 1, bonusMultiplier: 2 }],
    });
    const s = calculateScore(player, {});
    expect(s.fishPoints).toBe(Math.round(fish.points * 1 * 2));
  });

  it('残金ボーナスは money × 0.5（切り捨て）', () => {
    const s = calculateScore(makePlayer({ money: 999 }), {});
    expect(s.moneyBonus).toBe(Math.floor(999 * MONEY_TO_POINTS_RATE));
  });

  it('ゴール順位ボーナスが finishOrder に対応', () => {
    const s = calculateScore(makePlayer({ finishOrder: 0 }), {});
    expect(s.finishBonus).toBe(FINISH_BONUS[0]);
  });

  it('レアリティボーナスはユニークな魚種でのみ加算', () => {
    const player = makePlayer({
      caughtFish: [
        { fishId: fish.id, caughtAt: 'x', turn: 1, size: 1 },
        { fishId: fish.id, caughtAt: 'x', turn: 2, size: 1 }, // 同じ魚種
      ],
    });
    const s = calculateScore(player, {});
    expect(s.rarityBonus).toBe(RARITY_BONUS[fish.rarity]);
  });

  it('サイズ1.5以上で巨大魚ボーナスが付く', () => {
    const player = makePlayer({
      caughtFish: [{ fishId: fish.id, caughtAt: 'x', turn: 1, size: 2 }],
    });
    const s = calculateScore(player, {});
    expect(s.giantFishBonus).toBe(GIANT_FISH_BONUS);
  });

  it('釣果なしなら魚ポイントと巨大魚ボーナスは0', () => {
    const s = calculateScore(makePlayer(), {});
    expect(s.fishPoints).toBe(0);
    expect(s.giantFishBonus).toBe(0);
  });
});
