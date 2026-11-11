// 物価（案3）と入居率（案8）の単体テスト。
// 物価は「年が進むと、賞金も罰もカードの値段も買い物代も上がる」。建設費と建物の収入には掛けない。
import { describe, it, expect, afterEach } from 'vitest';
import {
  CITY_ECONOMY, priceScale, priceRiseAfter, pickDestination, visitorFees, occupancyRate, plotIncome, computeAllStats,
  createInitialCityState, build, buildCost, simulateRound,
} from './city';
import type { CityState, BuildingKind } from './city';
import { BINBO, binboWasteAmount, binboMischief } from './binbo';
import { computeYearEnd } from './cityAwards';
import { CARD_INFO, CARD_PRICE_MAX_SCALE, cardPrice, buyCard, createCardState } from './cityCards';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

afterEach(() => resetRandomSource());

function place(s: CityState, id: string, i: number, k: BuildingKind, owner: number, level = 1): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  if (level === 1) return r.state;
  const plots = [...r.state.towns[id].plots];
  plots[i] = { ...plots[i]!, level };
  return { ...r.state, towns: { ...r.state.towns, [id]: { ...r.state.towns[id], plots } } };
}

const Y = CITY_ECONOMY.yearScale;

describe('物価の倍率', () => {
  it('年度ごとに決まる（1〜12巡が1年目）。表より先の年は最後の倍率のまま', () => {
    expect(priceScale(1)).toBe(Y[0]);
    expect(priceScale(12)).toBe(Y[0]);
    expect(priceScale(13)).toBe(Y[1]);
    expect(priceScale(25)).toBe(Y[2]);
    expect(priceScale(37)).toBe(Y[3]);
    expect(priceScale(12 * 10)).toBe(Y[Y.length - 1]);
    expect(priceScale(0)).toBe(Y[0]);
  });

  it('年ごとに上がっていく（下がらない）', () => {
    for (let i = 1; i < Y.length; i++) expect(Y[i]).toBeGreaterThanOrEqual(Y[i - 1]);
  });

  it('3月を締めたとき（4月の始まり）だけ「物価が上がった」になる', () => {
    expect(priceRiseAfter(11)).toBeNull();
    expect(priceRiseAfter(12)).toEqual({ scale: Y[1], ratio: Y[1] / Y[0] });
    expect(priceRiseAfter(13)).toBeNull();
    expect(priceRiseAfter(24)).toEqual({ scale: Y[2], ratio: Y[2] / Y[1] });
    expect(priceRiseAfter(36)).toEqual({ scale: Y[3], ratio: Y[3] / Y[2] });
    // 表の最後の年を過ぎたら、もう上がらない
    expect(priceRiseAfter(12 * Y.length)).toBeNull();
  });
});

describe('物価を掛けるもの', () => {
  it('目的地の賞金: 同じ行き先なら、年ごとの倍率ぶん上がる', () => {
    const pick = (turn: number) => {
      setRandomSource(mulberry32(5));
      return pickDestination(null, 'tokyo', turn);
    };
    const y1 = pick(1);
    const y2 = pick(13);
    const y3 = pick(25);
    expect(y2.nodeId).toBe(y1.nodeId);
    // 賞金は倍率を掛けてから ¥100 単位に丸めるので、比はぴったりにはならない
    expect(y2.reward / y1.reward).toBeCloseTo(Y[1] / Y[0], 1);
    expect(y3.reward / y1.reward).toBeCloseTo(Y[2] / Y[0], 1);
    expect(y3.reward % 100).toBe(0);
  });

  it('買い物代: 単価に掛かる。所持金の割合の上限はそのまま', () => {
    const s = place(createInitialCityState(), 'tokyo', 0, 'com', 1, 2);
    const y1 = visitorFees(s, 'tokyo', 0, 1e6, 1).total;
    expect(y1).toBeGreaterThan(0);
    expect(visitorFees(s, 'tokyo', 0, 1e6).total).toBe(y1); // turn を省くと1年目
    expect(visitorFees(s, 'tokyo', 0, 1e6, 13).total).toBe(y1 * Y[1]);
    expect(visitorFees(s, 'tokyo', 0, 1e6, 25).total).toBe(y1 * Y[2]);
    // お金の少ない人は、何年目でも所持金の visitorMaxRate まで
    const cap = Math.floor(1000 * CITY_ECONOMY.visitorMaxRate);
    expect(visitorFees(s, 'tokyo', 0, 1000, 25).total).toBeLessThanOrEqual(cap);
  });

  it('貧乏神の無駄遣い: 上限に掛かる（率は所持金に比例するのでそのまま）', () => {
    const rich = 1e6;
    expect(binboWasteAmount(rich)).toBe(BINBO.wasteCap);
    expect(binboWasteAmount(rich, 1, Y[2])).toBe(BINBO.wasteCap * Y[2]);
    expect(binboWasteAmount(rich, BINBO.greatMultiplier, Y[2])).toBe(BINBO.wasteCap * BINBO.greatMultiplier * Y[2]);
    // 上限に届かない所持金なら、物価が上がっても額は同じ
    expect(binboWasteAmount(5000, 1, Y[2])).toBe(binboWasteAmount(5000));
  });

  it('貧乏神が人に渡す額: 3年目は1年目の yearScale 倍', () => {
    const city = createInitialCityState();
    const binbo = { playerIndex: 0, months: 1 };
    // くじの重み: 無駄遣い40・売る25・渡す20・何もしない15 → 0.7 は「渡す」
    const give = (turn?: number) => {
      setRandomSource(() => 0.7);
      return binboMischief(binbo, city, 0, [50000, 100], undefined, turn);
    };
    const y1 = give();
    expect(y1.kind).toBe('give');
    expect(y1.moneyDeltas).toEqual([-BINBO.giveAmount, BINBO.giveAmount]);
    const y3 = give(25);
    expect(y3.moneyDeltas).toEqual([-BINBO.giveAmount * Y[2], BINBO.giveAmount * Y[2]]);
  });

  it('称号の賞金と罰金: 年度末の巡の倍率が掛かる（長者は名誉だけで0のまま）', () => {
    const s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    const prize = (turn: number, id: string) => computeYearEnd(s, [10000, 10000], turn, 12000).titles.find(t => t.id === id)?.prize;
    const jinko1 = prize(12, 'jinko');
    expect(jinko1).toBeGreaterThan(0);
    expect(prize(24, 'jinko')).toBe(jinko1! * Y[1]);
    expect(prize(36, 'jinko')).toBe(jinko1! * Y[2]);
    expect(prize(36, 'choja')).toBe(0);
  });

  it('カードの値段: 物価が掛かるが、上限は CARD_PRICE_MAX_SCALE 倍', () => {
    const base = CARD_INFO.hoken.price!;
    expect(cardPrice('hoken')).toBe(base);
    expect(cardPrice('hoken', 13)).toBe(base * Math.min(CARD_PRICE_MAX_SCALE, Y[1]));
    expect(cardPrice('hoken', 25)).toBe(base * Math.min(CARD_PRICE_MAX_SCALE, Y[2]));
    expect(cardPrice('hoken', 37)).toBe(base * CARD_PRICE_MAX_SCALE);
    expect(cardPrice('tokkyu', 25)).toBeNull(); // 売っていない札
    const cs = createCardState(2);
    const y1 = buyCard(cs, 0, 'hoken', 1e6);
    const y3 = buyCard(cs, 0, 'hoken', 1e6, 25);
    expect('cost' in y1 && y1.cost).toBe(base);
    expect('cost' in y3 && y3.cost).toBe(cardPrice('hoken', 25));
    // 1年目の値段ぶんしか持っていないと、3年目は買えない
    expect(buyCard(cs, 0, 'hoken', base, 25)).toEqual({ error: 'お金が足りない' });
  });
});

describe('物価を掛けないもの', () => {
  it('建設費と建物の収入は年が進んでも同じ', () => {
    const s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    expect(buildCost('res', 'tokyo', s.towns.tokyo)).toBe(buildCost('res', 'tokyo', s.towns.tokyo));
    // 同じ月（6月）の1年目と3年目で、まちの収入が同じ
    const income = (turn: number) => {
      setRandomSource(() => 0.99);
      return simulateRound(s, 1, turn, [0]).report.players[0].income;
    };
    expect(income(3 + 24)).toBe(income(3));
  });
});

describe('入居率', () => {
  const E = CITY_ECONOMY;

  it('住宅の需要が0以上なら満室、マイナスが大きいほど下がり、下限で止まる', () => {
    expect(occupancyRate(0)).toBe(1);
    expect(occupancyRate(2)).toBe(1);
    expect(occupancyRate(-1)).toBeCloseTo(Math.max(E.occupancyMin, 1 - E.occupancyPerDemand), 5);
    expect(occupancyRate(-99)).toBe(E.occupancyMin);
    expect(E.occupancyMin).toBeGreaterThan(0);
    expect(E.occupancyMin).toBeLessThanOrEqual(1);
  });

  it('住宅の収入に掛かる（商業・工業には掛からない）', () => {
    const s = place(place(createInitialCityState(), 'tokyo', 0, 'res', 0), 'tokyo', 1, 'com', 0);
    const st = computeAllStats(s).get('tokyo')!;
    const [res, com] = s.towns.tokyo.plots;
    const full = { ...st, demand: { ...st.demand, r: 0 } };
    const low = { ...st, demand: { ...st.demand, r: -1 } };
    expect(plotIncome(res!, 'tokyo', low, 0)).toBe(Math.round(plotIncome(res!, 'tokyo', full, 0) * occupancyRate(-1)));
    expect(plotIncome(com!, 'tokyo', low, 0)).toBe(plotIncome(com!, 'tokyo', full, 0));
  });
});
