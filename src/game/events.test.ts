import { describe, it, expect, afterEach } from 'vitest';
import type { Player, EventCard, EventEffect } from './types';
import { applyEvent } from './events';
import { createInitialEquipment, getEquippedLevel } from './equipment';
import { computeDistanceToGoal } from '../utils/pathfinding';
import { FISH_DATABASE } from '../data/fishDatabase';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

afterEach(() => resetRandomSource());

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 0,
    name: 'P',
    color: '#fff',
    currentNode: 'start',
    money: 1000,
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

function makeEvent(effect: EventEffect): EventCard {
  return { id: 'test', name: 'テスト', type: 'random', description: '', effect };
}

describe('applyEvent: money', () => {
  it('加算される', () => {
    const r = applyEvent(makePlayer({ money: 1000 }), makeEvent({ kind: 'money', amount: 500 }), 1);
    expect(r.player.money).toBe(1500);
  });

  it('所持金は0未満にならない', () => {
    const r = applyEvent(makePlayer({ money: 300 }), makeEvent({ kind: 'money', amount: -1000 }), 1);
    expect(r.player.money).toBe(0);
  });
});

describe('applyEvent: ターン制御', () => {
  it('skip_turn で skipNextTurn が立つ', () => {
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'skip_turn' }), 1);
    expect(r.player.skipNextTurn).toBe(true);
  });

  it('extra_turn で extraTurn が立つ', () => {
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'extra_turn' }), 1);
    expect(r.player.extraTurn).toBe(true);
  });

  it('fish_bonus で倍率と残ターンが設定される', () => {
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'fish_bonus', multiplier: 2, duration: 3 }), 1);
    expect(r.player.fishBonusMultiplier).toBe(2);
    expect(r.player.fishBonusTurnsLeft).toBe(3);
  });
});

describe('applyEvent: 装備', () => {
  it('free_upgrade で装着装備のレベルが1上がる', () => {
    const p = makePlayer();
    expect(getEquippedLevel(p.equipment, 'rod')).toBe(1);
    const r = applyEvent(p, makeEvent({ kind: 'free_upgrade', equipmentType: 'rod' }), 1);
    expect(getEquippedLevel(r.player.equipment, 'rod')).toBe(2);
  });

  it('equipment_damage で大ダメージなら壊れて外れる', () => {
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'equipment_damage', equipmentType: 'rod', amount: 100 }), 1);
    expect(r.player.equipment.equipped.rod).toBeNull();
  });
});

describe('applyEvent: steal_fish', () => {
  it('最後の魚を失う', () => {
    const p = makePlayer({ caughtFish: [{ fishId: 'a', caughtAt: 'x', turn: 1, size: 1 }] });
    const r = applyEvent(p, makeEvent({ kind: 'steal_fish' }), 1);
    expect(r.player.caughtFish).toHaveLength(0);
  });

  it('魚がなければ何も起きない', () => {
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'steal_fish' }), 1);
    expect(r.player.caughtFish).toHaveLength(0);
  });
});

describe('applyEvent: 魚獲得', () => {
  it('random_fish は指定レアリティの魚を1匹追加', () => {
    setRandomSource(mulberry32(1));
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'random_fish', rarity: 'common' }), 1);
    expect(r.player.caughtFish).toHaveLength(1);
    const fish = FISH_DATABASE.find(f => f.id === r.player.caughtFish[0].fishId);
    expect(fish?.rarity).toBe('common');
  });

  it('multi_fish は指定数の魚を追加', () => {
    setRandomSource(mulberry32(2));
    const r = applyEvent(makePlayer(), makeEvent({ kind: 'multi_fish', count: 4, rarity: 'common' }), 1);
    expect(r.player.caughtFish).toHaveLength(4);
  });
});

describe('applyEvent: move_steps の方向（#10 戻るイベントの符号を尊重）', () => {
  const dist = computeDistanceToGoal();

  it('前進(+)はゴールに近づく', () => {
    setRandomSource(mulberry32(7));
    const r = applyEvent(makePlayer({ currentNode: 'start' }), makeEvent({ kind: 'move_steps', steps: 3 }), 1);
    expect(dist.get(r.player.currentNode)!).toBeLessThanOrEqual(dist.get('start')!);
  });

  it('前進は後退より平均的にゴールへ近づく', () => {
    const N = 40;
    let fwd = 0;
    let bwd = 0;
    for (let s = 0; s < N; s++) {
      setRandomSource(mulberry32(s + 1));
      const f = applyEvent(makePlayer({ currentNode: 'tokyo' }), makeEvent({ kind: 'move_steps', steps: 3 }), 1);
      setRandomSource(mulberry32(s + 1));
      const b = applyEvent(makePlayer({ currentNode: 'tokyo' }), makeEvent({ kind: 'move_steps', steps: -3 }), 1);
      fwd += dist.get(f.player.currentNode)!;
      bwd += dist.get(b.player.currentNode)!;
    }
    expect(fwd / N).toBeLessThan(bwd / N);
  });
});
