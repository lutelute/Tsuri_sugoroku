import { describe, it, expect, afterEach } from 'vitest';
import {
  BINBO, attachOnDestination, transferOnMove, binboMischief, tickMonth, isGreat, becameGreat,
  binboMultiplier, monthsUntilGreat, binboWasteAmount, pickBinboSales, createBinboState, binboEnabled,
} from './binbo';
import type { BinboState } from './binbo';
import { createInitialCityState, distancesFrom, plotValue, TOWN_IDS } from './city';
import type { CityState, Plot, BuildingKind } from './city';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

afterEach(() => resetRandomSource());

// くじの値: [0,0.4) 無駄遣い / [0.4,0.65) 売る / [0.65,0.85) 渡す / [0.85,1) 何もしない
const R_WASTE = 0.1;
const R_SELL = 0.5;
const R_GIVE = 0.7;
const R_NONE = 0.9;

function withPlot(s: CityState, nodeId: string, idx: number, kind: BuildingKind, owner: number, over: Partial<Plot> = {}): CityState {
  const town = s.towns[nodeId];
  const plots = [...town.plots];
  plots[idx] = { kind, level: 1, owner, builtTurn: 1, ...over };
  return { ...s, towns: { ...s.towns, [nodeId]: { ...town, plots } } };
}

const held = (playerIndex: number, months = 0): BinboState => ({ playerIndex, months });

/** 基準の町から近い順・遠い順の町を取る（盤面データが変わってもテストが壊れないように） */
function townsByDistance(from: string): string[] {
  const d = distancesFrom(from);
  return TOWN_IDS.filter(id => id !== from && d.has(id)).sort((a, b) => d.get(a)! - d.get(b)!);
}

describe('貧乏神: 目的地でとりつく', () => {
  const dest = 'osaka';
  const byDist = townsByDistance(dest);
  const near = byDist[0];
  const far = byDist[byDist.length - 1];

  it('近い町と遠い町がちゃんと距離の差を持つ（前提の確認）', () => {
    const d = distancesFrom(dest);
    expect(d.get(far)!).toBeGreaterThan(d.get(near)!);
  });

  it('到着者以外で目的地から一番遠い人にとりつく', () => {
    const b = attachOnDestination(undefined, 0, [dest, near, far], dest, 3);
    expect(b).toEqual({ playerIndex: 2, months: 0 });
  });

  it('到着者がいちばん遠くても、到着者にはとりつかない', () => {
    // 到着者(1)の位置として遠い町を渡しても、比べるのは他の人だけ
    const b = attachOnDestination(undefined, 1, [near, far, dest], dest, 3);
    expect(b.playerIndex).toBe(0);
  });

  it('1人プレイでは出さない', () => {
    expect(binboEnabled(1)).toBe(false);
    expect(attachOnDestination(undefined, 0, [dest], dest, 1)).toEqual({ playerIndex: null, months: 0 });
  });

  it('CPU を含む2人なら、到着しなかった方にとりつく', () => {
    expect(attachOnDestination(undefined, 0, [dest, dest], dest, 2).playerIndex).toBe(1);
  });

  it('同じ距離なら所持金が多い人にとりつく', () => {
    const b = attachOnDestination(undefined, 0, [dest, far, far, near], dest, 4, [0, 3000, 9000, 50000]);
    expect(b.playerIndex).toBe(2);
  });

  it('距離も所持金も同じなら、到着者の次に手番が来る人', () => {
    expect(attachOnDestination(undefined, 2, [far, far, dest, far], dest, 4, [100, 100, 0, 100]).playerIndex).toBe(3);
    expect(attachOnDestination(undefined, 3, [far, far, far, dest], dest, 4).playerIndex).toBe(0);
  });

  it('同じ人にとりつき直すなら月数を数え続け、別の人なら0から', () => {
    expect(attachOnDestination(held(2, 7), 0, [dest, near, far], dest, 3)).toEqual({ playerIndex: 2, months: 7 });
    expect(attachOnDestination(held(1, 7), 0, [dest, near, far], dest, 3)).toEqual({ playerIndex: 2, months: 0 });
  });
});

describe('貧乏神: 通る・止まると移る', () => {
  const path = ['a', 'b', 'c', 'd'];

  it('とりつかれた人が他の駒のマスを通ると、その駒の持ち主に移る（月数は0から）', () => {
    const r = transferOnMove(held(0, 9), 0, path, ['a', 'x', 'b', 'y']);
    expect(r.to).toBe(2);
    expect(r.binbo).toEqual({ playerIndex: 2, months: 0 });
  });

  it('止まったマスに他の駒がいても移る', () => {
    const r = transferOnMove(held(0), 0, path, ['a', 'd', 'z']);
    expect(r.to).toBe(1);
  });

  it('経路の途中で最初に出会った駒に移る', () => {
    // 2番は c、1番は d。先に通る c の2番へ
    const r = transferOnMove(held(0), 0, path, ['a', 'd', 'c']);
    expect(r.to).toBe(2);
  });

  it('同じマスに何人もいたら、動いた人の次に手番が来る人へ', () => {
    const r = transferOnMove(held(2), 2, path, ['b', 'b', 'a', 'b']);
    expect(r.to).toBe(3);
    const r2 = transferOnMove(held(3), 3, path, ['b', 'b', 'x', 'a']);
    expect(r2.to).toBe(0);
  });

  it('出発マスに一緒にいた駒には移らない（離れるだけ）', () => {
    const r = transferOnMove(held(0, 4), 0, path, ['a', 'a', 'z']);
    expect(r.to).toBeNull();
    expect(r.binbo).toEqual({ playerIndex: 0, months: 4 });
  });

  it('とりつかれていない人が、とりつかれた人のマスを通っても移らない', () => {
    const r = transferOnMove(held(1, 3), 0, path, ['a', 'b', 'z']);
    expect(r.to).toBeNull();
    expect(r.binbo).toEqual({ playerIndex: 1, months: 3 });
  });

  it('まだ誰にもとりついていなければ何も起きない', () => {
    const r = transferOnMove(undefined, 0, path, ['a', 'b']);
    expect(r).toEqual({ binbo: createBinboState(), to: null });
  });

  it('移ったら大貧乏神もふつうの貧乏神に戻る', () => {
    const before = held(0, BINBO.greatMonths);
    expect(isGreat(before)).toBe(true);
    const r = transferOnMove(before, 0, path, ['a', 'c']);
    expect(isGreat(r.binbo)).toBe(false);
  });
});

describe('貧乏神: 月末の悪さ', () => {
  const base = createInitialCityState();

  it('くじの値で悪さの種類が決まる', () => {
    const moneys = [10000, 5000];
    const city = withPlot(base, 'tokyo', 0, 'res', 0);
    const kindAt = (r: number) => {
      setRandomSource(() => r);
      return binboMischief(held(0), city, 0, moneys).kind;
    };
    expect(kindAt(R_WASTE)).toBe('waste');
    expect(kindAt(R_SELL)).toBe('sell');
    expect(kindAt(R_GIVE)).toBe('give');
    expect(kindAt(R_NONE)).toBe('none');
  });

  it('無駄遣い: 所持金の1割（¥100単位）、上限¥3,000', () => {
    setRandomSource(() => R_WASTE);
    const r = binboMischief(held(0), base, 0, [12345, 0]);
    expect(r.kind).toBe('waste');
    expect(r.moneyDeltas).toEqual([-1200, 0]);
    expect(r.damage).toBe(1200);
    expect(r.city).toBe(base);

    const rich = binboMischief(held(0), base, 0, [80000, 0]);
    expect(rich.moneyDeltas[0]).toBe(-3000);
  });

  it('無駄遣いの額の端: 少額は最低¥100、所持金を超えない、0なら0', () => {
    expect(binboWasteAmount(500)).toBe(100);
    expect(binboWasteAmount(60)).toBe(60);
    expect(binboWasteAmount(0)).toBe(0);
    expect(binboWasteAmount(30000)).toBe(3000);
  });

  it('所持金0で無駄遣いを引いたら何もしない', () => {
    setRandomSource(() => R_WASTE);
    const r = binboMischief(held(0), base, 0, [0, 5000]);
    expect(r.rolled).toBe('waste');
    expect(r.kind).toBe('none');
    expect(r.moneyDeltas).toEqual([0, 0]);
  });

  it('売る: 資産価値の一番低い建物を半値で売り、町から消える（発展度などは残る）', () => {
    let city = withPlot(base, 'tokyo', 0, 'res', 0, { level: 3 });
    city = withPlot(city, 'tokyo', 1, 'res', 0, { level: 1 });
    city = withPlot(city, 'tokyo', 2, 'com', 1); // 他人の建物は売らない
    city = { ...city, towns: { ...city.towns, tokyo: { ...city.towns.tokyo, tier: 1, base: city.towns.tokyo.plots.length } } };
    const cheap = city.towns.tokyo.plots[1]!;
    const value = plotValue(cheap, 'tokyo', city.towns.tokyo);
    const price = Math.round((value * 0.5) / 100) * 100;

    setRandomSource(() => R_SELL);
    const r = binboMischief(held(0), city, 0, [5000, 5000]);
    expect(r.kind).toBe('sell');
    expect(r.soldNodeId).toBe('tokyo');
    expect(r.sold).toEqual([{ nodeId: 'tokyo', plotIndex: 1, kind: 'res', value, price }]);
    expect(r.moneyDeltas).toEqual([price, 0]);
    expect(r.damage).toBe(value);
    expect(r.city.towns.tokyo.plots[1]).toBeNull();
    expect(r.city.towns.tokyo.plots[0]).not.toBeNull();
    expect(r.city.towns.tokyo.plots[2]?.owner).toBe(1);
    expect(r.city.towns.tokyo.tier).toBe(1);
    expect(r.city.towns.tokyo.base).toBe(city.towns.tokyo.base);
    // 元の状態は書き換えない
    expect(city.towns.tokyo.plots[1]).not.toBeNull();
  });

  it('空き家は資産価値が半分なので先に売られる', () => {
    let city = withPlot(base, 'tokyo', 0, 'res', 0);
    city = withPlot(city, 'tokyo', 1, 'res', 0, { vacant: true });
    const sales = pickBinboSales(city, 0, 1);
    expect(sales[0].plotIndex).toBe(1);
  });

  it('売る建物がなければ代わりに無駄遣い', () => {
    setRandomSource(() => R_SELL);
    const r = binboMischief(held(0), base, 0, [10000, 0]);
    expect(r.rolled).toBe('sell');
    expect(r.kind).toBe('waste');
    expect(r.moneyDeltas[0]).toBe(-1000);
    expect(r.message).toContain('売る建物がなかった');
  });

  it('渡す: 所持金が一番少ない人に¥1,000', () => {
    setRandomSource(() => R_GIVE);
    const r = binboMischief(held(1), base, 1, [9000, 20000, 3000, 7000], ['一郎', '二郎', '三郎', '四郎']);
    expect(r.kind).toBe('give');
    expect(r.giveTo).toBe(2);
    expect(r.moneyDeltas).toEqual([0, -1000, 1000, 0]);
    expect(r.message).toContain('三郎');
  });

  it('渡す: 所持金が足りなければ持っている分だけ、0なら何もしない', () => {
    setRandomSource(() => R_GIVE);
    expect(binboMischief(held(0), base, 0, [400, 900]).moneyDeltas).toEqual([-400, 400]);
    expect(binboMischief(held(0), base, 0, [0, 900]).kind).toBe('none');
  });

  it('何もしない月はお金も町も変わらない', () => {
    setRandomSource(() => R_NONE);
    const city = withPlot(base, 'tokyo', 0, 'res', 0);
    const r = binboMischief(held(0), city, 0, [10000, 5000]);
    expect(r.kind).toBe('none');
    expect(r.moneyDeltas).toEqual([0, 0]);
    expect(r.city).toBe(city);
  });

  it('悪さの出方は重みどおり（40/25/20/15）', () => {
    setRandomSource(mulberry32(20260927));
    const city = withPlot(base, 'tokyo', 0, 'res', 0);
    const counts: Record<string, number> = { waste: 0, sell: 0, give: 0, none: 0 };
    const N = 4000;
    for (let i = 0; i < N; i++) counts[binboMischief(held(0), city, 0, [10000, 5000]).rolled]++;
    expect(counts.waste / N).toBeCloseTo(0.40, 1);
    expect(counts.sell / N).toBeCloseTo(0.25, 1);
    expect(counts.give / N).toBeCloseTo(0.20, 1);
    expect(counts.none / N).toBeCloseTo(0.15, 1);
  });
});

describe('貧乏神: 大貧乏神', () => {
  const base = createInitialCityState();
  const great = held(0, BINBO.greatMonths);

  it('月末ごとに月数が増え、12か月で大貧乏神に化ける', () => {
    let b: BinboState = held(0);
    for (let m = 1; m < BINBO.greatMonths; m++) {
      b = tickMonth(b);
      expect(isGreat(b)).toBe(false);
    }
    expect(monthsUntilGreat(b)).toBe(1);
    const before = b;
    b = tickMonth(b);
    expect(b.months).toBe(12);
    expect(isGreat(b)).toBe(true);
    expect(becameGreat(before, b)).toBe(true);
    expect(becameGreat(b, tickMonth(b))).toBe(false);
    expect(binboMultiplier(b)).toBe(2);
    expect(monthsUntilGreat(b)).toBe(0);
  });

  it('誰にもとりついていなければ月数は進まない', () => {
    expect(tickMonth(undefined)).toEqual({ playerIndex: null, months: 0 });
    expect(monthsUntilGreat(undefined)).toBeNull();
    expect(binboMultiplier(createBinboState())).toBe(1);
  });

  it('無駄遣いは2倍（率2割・上限¥6,000）', () => {
    setRandomSource(() => R_WASTE);
    expect(binboMischief(great, base, 0, [12345, 0]).moneyDeltas[0]).toBe(-2400);
    expect(binboMischief(great, base, 0, [80000, 0]).moneyDeltas[0]).toBe(-6000);
    const r = binboMischief(great, base, 0, [12345, 0]);
    expect(r.great).toBe(true);
    expect(r.message).toContain('大貧乏神');
  });

  it('建物を2軒売る', () => {
    let city = withPlot(base, 'tokyo', 0, 'res', 0, { level: 3 });
    city = withPlot(city, 'tokyo', 1, 'res', 0);
    city = withPlot(city, 'tokyo', 2, 'com', 0);
    setRandomSource(() => R_SELL);
    const r = binboMischief(great, city, 0, [5000, 5000]);
    expect(r.kind).toBe('sell');
    expect(r.sold).toHaveLength(2);
    expect(r.sold!.map(s => s.plotIndex)).not.toContain(0); // 一番高い建物は残る
    expect(r.city.towns.tokyo.plots.filter(p => p).length).toBe(1);
    expect(r.moneyDeltas[0]).toBe(r.sold!.reduce((a, s) => a + s.price, 0));
  });

  it('渡す額は¥2,000', () => {
    setRandomSource(() => R_GIVE);
    expect(binboMischief(great, base, 0, [10000, 5000]).moneyDeltas).toEqual([-2000, 2000]);
  });
});
