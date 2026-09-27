import { describe, it, expect, afterEach } from 'vitest';
import { chooseCpuPath, chooseCityAction, chooseShopPurchase, chooseCapitalChoice, cpuCatchChance, playerMonthlyIncome, shouldBuySpecialty } from './cpuAI';
import { createInitialCityState, build, distancesFrom } from './city';
import type { CityState, BuildingKind } from './city';
import type { Player, CapitalEvent } from './types';
import { createInitialEquipment, createEquipmentItem } from './equipment';
import { FISH_DATABASE } from '../data/fishDatabase';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

function makePlayer(over: Partial<Player> = {}): Player {
  return {
    id: 0, name: 'CPU', color: '#fff', currentNode: 'tokyo', money: 20000,
    equipment: createInitialEquipment(), caughtFish: [], score: 0, hasFinished: false, finishOrder: null,
    skipNextTurn: false, extraTurn: false, fishBonusMultiplier: 1, fishBonusTurnsLeft: 0,
    isCpu: true, cpuStyle: 'steady', ...over,
  };
}

function place(s: CityState, id: string, i: number, k: BuildingKind, owner = 0): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

afterEach(() => resetRandomSource());

describe('CPU: 道選び', () => {
  it('まちづくりでは目的地に近づく道を選ぶ', () => {
    setRandomSource(() => 0.5);
    const city = { ...createInitialCityState(), destination: 'osaka', destinationReward: 5000 };
    const d = distancesFrom('osaka');
    // 東京から: 大阪に近づく経路（長野経由）と、遠ざかる経路（銚子）
    const toward = ['tokyo', 'r_nagano_tokyo', 'nagano'];
    const away = ['tokyo', 'r_choshi_tokyo', 'choshi'];
    const valid = [toward, away].every(p => p.every(id => d.has(id)));
    expect(valid).toBe(true);
    const idx = chooseCpuPath({
      paths: [away, toward], mode: 'city', player: makePlayer({ cpuStyle: 'racer' }), playerIndex: 0,
      city, turn: 1, maxTurns: 36, goalClaims: [],
    });
    expect(idx).toBe(1);
  });

  it('釣り旅では凶のマスより名所を選ぶ', () => {
    setRandomSource(() => 0.5);
    const idx = chooseCpuPath({
      paths: [['start', 'x', 'tottori'], ['start', 'y', 'choshi']], mode: 'fishing', player: makePlayer(), playerIndex: 0,
      city: null, turn: 5, maxTurns: 80, goalClaims: [],
    });
    expect(idx).toBe(1);
  });
});

describe('CPU: 工事', () => {
  it('お金に余裕があれば儲かる建物を建てる', () => {
    setRandomSource(mulberry32(1));
    const city = createInitialCityState();
    const act = chooseCityAction(city, 'tokyo', 0, 30000, 'steady', 30);
    expect(act?.type).toBe('build');
  });

  it('予備費を割り込む工事はしない', () => {
    setRandomSource(mulberry32(1));
    const city = createInitialCityState();
    expect(chooseCityAction(city, 'tokyo', 0, 3500, 'steady', 30)).toBeNull();
  });

  it('独占型は独占が完成する手を選ぶ', () => {
    setRandomSource(mulberry32(1));
    let city = createInitialCityState();
    const n = city.towns.sakata.plots.length;
    for (let i = 0; i < n - 1; i++) city = place(city, 'sakata', i, 'res', 0);
    const act = chooseCityAction(city, 'sakata', 0, 50000, 'monopoly', 30);
    expect(act).toMatchObject({ type: 'build', plot: n - 1 });
  });

  it('月収の見込みは建物を建てると増える', () => {
    setRandomSource(mulberry32(1));
    const city = createInitialCityState();
    const after = place(city, 'tokyo', 0, 'res', 0);
    expect(playerMonthlyIncome(after, 0)).toBeGreaterThan(playerMonthlyIncome(city, 0));
  });
});

describe('CPU: 買い物・祭り・釣り', () => {
  it('いちばん低い装備から、店の品ぞろえの範囲で買う', () => {
    const p = makePlayer({ money: 5000 });
    const buy = chooseShopPurchase(p, 1);
    expect(buy).toMatchObject({ type: 'rod', level: 2 });
  });

  it('お金が足りなければ買わない', () => {
    expect(chooseShopPurchase(makePlayer({ money: 500 }), 3)).toBeNull();
  });

  it('祭りではお金になる選択肢を選ぶ', () => {
    const ev: CapitalEvent = {
      id: 't', title: 't', flavor: '', region: 'kanto',
      choices: [
        { id: 'lore', label: '伝承', description: '', effect: { kind: 'lore_event', eventCardId: 'x' } },
        { id: 'cash', label: '賞金', description: '', effect: { kind: 'money', amount: 3000 } },
      ],
    };
    expect(chooseCapitalChoice(ev, makePlayer())).toBe('cash');
  });

  it('釣りの成功率は装備が良いほど高く、レアほど低い', () => {
    const common = FISH_DATABASE.find(f => f.rarity === 'common')!;
    const mythical = FISH_DATABASE.find(f => f.rarity === 'mythical')!;
    const weak = makePlayer();
    const rod = createEquipmentItem('rod', 5);
    const reel = createEquipmentItem('reel', 5);
    const lure = createEquipmentItem('lure', 5);
    const strong = makePlayer({ equipment: { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] } });
    expect(cpuCatchChance(strong, common)).toBeGreaterThan(cpuCatchChance(weak, common));
    expect(cpuCatchChance(weak, mythical)).toBeLessThan(cpuCatchChance(weak, common));
  });
});

describe('CPU: 名産と貧乏神', () => {
  it('空いている名産は予備費を残せるなら買い、他人の物は独占が完成するときだけ買収する', () => {
    expect(shouldBuySpecialty({}, 'sapporo', 0, 20000, 'steady')).toBe(true);
    expect(shouldBuySpecialty({}, 'sapporo', 0, 9500, 'steady')).toBe(false);
    expect(shouldBuySpecialty({}, 'otaru', 0, 99999, 'steady')).toBe(false); // 名産のないマス
    // 北海道: 札幌・釧路（県庁）と函館。釧路と函館を持っていれば、札幌の買収で独占が完成する
    expect(shouldBuySpecialty({ kushiro: 0, hakodate: 0, sapporo: 1 }, 'sapporo', 0, 25000, 'steady')).toBe(true);
    expect(shouldBuySpecialty({ kushiro: 0, sapporo: 1 }, 'sapporo', 0, 25000, 'steady')).toBe(false); // 函館がまだ
    expect(shouldBuySpecialty({ sapporo: 1 }, 'sapporo', 0, 25000, 'steady')).toBe(false);
    // 県庁ではない町の名産も同じ判断（函館は空きなら買う）
    expect(shouldBuySpecialty({}, 'hakodate', 0, 20000, 'steady')).toBe(true);
  });

  it('貧乏神がとりついていると、他の駒のいるマスを通る道を選ぶ', () => {
    setRandomSource(() => 0.5);
    const city = { ...createInitialCityState(), destination: null, destinationReward: 0 };
    const a = ['tokyo', 'r_choshi_tokyo', 'choshi'];
    const b = ['tokyo', 'r_nagano_tokyo', 'nagano'];
    const base = { paths: [a, b], mode: 'city' as const, player: makePlayer(), playerIndex: 0, city, turn: 1, maxTurns: 36, goalClaims: [] };
    // 相手は銚子への中継マスにいる
    expect(chooseCpuPath({ ...base, binboHolder: 0, playerNodes: ['tokyo', 'r_choshi_tokyo'] })).toBe(0);
    // 相手が長野側にいれば、そちらを通る
    expect(chooseCpuPath({ ...base, binboHolder: 0, playerNodes: ['tokyo', 'r_nagano_tokyo'] })).toBe(1);
  });
});
