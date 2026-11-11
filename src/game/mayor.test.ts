import { describe, it, expect, afterEach } from 'vitest';
import {
  mayorOf, mayorThreshold, mayorStanding, canEnact, enactOrdinance, ordinanceContext, ordinanceStatsEffect,
  ordinancePlotIncome, ordinanceMonthlyCost, isIndustryBanned, mayorChanges, ORDINANCE_ECONOMY, ORDINANCE_KINDS,
} from './mayor';
import type { OrdinanceKind } from './mayor';
import { chooseOrdinance, mayorSeatValue, mayorTownValue } from './mayorAI';
import { chooseCityAction, playerMonthlyIncome } from './cpuAI';
import {
  createInitialCityState, computeAllStats, canBuild, simulateRound, getTownInfo, TOWN_IDS, acquire,
} from './city';
import type { CityState, Plot, BuildingKind, TownState } from './city';
import { setRandomSource, resetRandomSource } from '../utils/random';

afterEach(() => resetRandomSource());

const E = ORDINANCE_ECONOMY;

/** 町の区画を並べ直す（null は空き地）。区画数も plots の長さに合わせる */
function setTown(s: CityState, nodeId: string, plots: (Plot | null)[], over: Partial<TownState> = {}): CityState {
  return { ...s, towns: { ...s.towns, [nodeId]: { ...s.towns[nodeId], plots, ...over } } };
}
const P = (kind: BuildingKind, owner: number, level = 1): Plot => ({ kind, level, owner, builtTurn: 1 });
const withOrd = (s: CityState, nodeId: string, kind: OrdinanceKind, by = 0): CityState =>
  ({ ...s, towns: { ...s.towns, [nodeId]: { ...s.towns[nodeId], ordinance: { kind, by, turn: 1 } } } });

/** 格ごとの町（盤面や町の特色の表が変わってもテストが壊れないように探す） */
const townOf = (cls: string) => TOWN_IDS.find(id => getTownInfo(id)?.cls === cls)!;

describe('町長: 区画の半分より多くを持つ人', () => {
  const base = createInitialCityState();

  it('6区画なら4つ以上、5区画なら3つ以上で町長', () => {
    const six = { plots: Array.from({ length: 6 }, () => null) } as TownState;
    const five = { plots: Array.from({ length: 5 }, () => null) } as TownState;
    expect(mayorThreshold(six)).toBe(4);
    expect(mayorThreshold(five)).toBe(3);
  });

  it('ちょうど半分では町長にならない', () => {
    const s = setTown(base, 'tokyo', [P('res', 0), P('res', 0), P('res', 0), P('com', 1), null, null]);
    expect(mayorOf(s.towns.tokyo)).toBeNull();
    const s2 = setTown(base, 'tokyo', [P('res', 0), P('res', 0), P('res', 0), P('com', 0), P('com', 1), null]);
    expect(mayorOf(s2.towns.tokyo)).toBe(0);
  });

  it('空き家も持ち物として数える', () => {
    const s = setTown(base, 'tokyo', [P('res', 2), { ...P('res', 2), vacant: true }, P('res', 2), P('res', 1), null]);
    expect(mayorOf(s.towns.tokyo)).toBe(2);
  });

  it('独占している人は、区画の半分に届かなくても町長', () => {
    // もとの区画数3の町が発展で6区画になり、3つを1人で持つ（独占の判定は「もとの区画数以上を1人で」）
    const s = setTown(base, 'tokyo', [P('res', 1), P('res', 1), P('com', 1), null, null, null], { base: 3 });
    expect(mayorOf(s.towns.tokyo)).toBe(1);
  });

  it('町が発展して区画が増えると、町長の座が空くことがある', () => {
    const plots = [P('res', 0), P('res', 0), P('res', 0), P('res', 0), P('com', 1), null];
    const s = setTown(base, 'tokyo', plots, { base: 6 });
    expect(mayorOf(s.towns.tokyo)).toBe(0);
    const grown = setTown(base, 'tokyo', [...plots, null, null], { base: 6 });
    expect(mayorOf(grown.towns.tokyo)).toBeNull();
    expect(mayorChanges(s, grown)).toEqual([{ nodeId: 'tokyo', from: 0, to: null }]);
  });

  it('あと何つで町長かがわかる', () => {
    const s = setTown(base, 'tokyo', [P('res', 0), P('res', 0), P('com', 1), null, null, null]);
    expect(mayorStanding(s.towns.tokyo, 0)).toEqual({ mine: 2, need: 4, mayor: null });
  });
});

describe('条例を決める', () => {
  const base = setTown(createInitialCityState(), 'tokyo', [P('res', 0), P('res', 0), P('res', 0), P('com', 0), P('com', 1), null]);

  it('町長だけが決められる', () => {
    expect(canEnact(base, 'tokyo', 1, 'tax', 99999, 5)).toBe('条例を決められるのは町長だけ');
    const r = enactOrdinance(base, 'tokyo', 0, 'tax', 99999, 5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.towns.tokyo.ordinance).toEqual({ kind: 'tax', by: 0, turn: 5 });
      expect(r.cost).toBe(E.enactCost);
      expect(r.message).toContain('町税');
      expect(base.towns.tokyo.ordinance).toBeUndefined(); // 元の状態は書き換えない
    }
  });

  it('同じ条例は出せない・1か月に1回まで・次の月なら替えられる', () => {
    const r = enactOrdinance(base, 'tokyo', 0, 'tax', 99999, 5);
    if (!r.ok) throw new Error(r.reason);
    expect(canEnact(r.state, 'tokyo', 0, 'tax', 99999, 6)).toBe('すでにこの条例が出ている');
    expect(canEnact(r.state, 'tokyo', 0, 'tourism', 99999, 5)).toBe('条例は1か月に1回まで');
    expect(canEnact(r.state, 'tokyo', 0, 'tourism', 99999, 6)).toBeNull();
  });

  it('やめることもできる（出ていなければやめられない）', () => {
    expect(canEnact(base, 'tokyo', 0, null, 0, 5)).toBe('やめる条例がない');
    const s = withOrd(base, 'tokyo', 'childcare');
    const r = enactOrdinance(s, 'tokyo', 0, null, 0, 5);
    expect(r.ok && r.state.towns.tokyo.ordinance).toBeUndefined();
  });

  it('町長が替わっても条例は残り、新しい町長のものとして効く', () => {
    let s = withOrd(base, 'tokyo', 'tax', 0);
    // 1番が0番の建物を3つ買って町長に（4/6）
    for (const idx of [0, 1, 2]) {
      const r = acquire(s, 'tokyo', idx, 1, 1e9);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    expect(mayorOf(s.towns.tokyo)).toBe(1);
    expect(s.towns.tokyo.ordinance?.kind).toBe('tax');
    expect(ordinanceContext(s.towns.tokyo)).toEqual({ kind: 'tax', mayor: 1 });
  });

  it('町長がいない町では条例はお休み（効き目も負担もない）', () => {
    const s = setTown(withOrd(base, 'tokyo', 'scenery'), 'tokyo', [P('res', 0), P('res', 1), null, null, null, null]);
    expect(ordinanceContext(s.towns.tokyo)).toBeNull();
    expect(ordinanceStatsEffect(s.towns.tokyo)).toEqual({ happiness: 0, pollution: 0, r: 0, i: 0 });
    expect(isIndustryBanned(s.towns.tokyo)).toBe(false);
  });
});

describe('条例の効き目', () => {
  // 工業地だけの村（住む人がいないので、需要の差が条例の分だけになる）
  const village = townOf('village');
  const n = getTownInfo(village)!.plots;
  const plots = Array.from({ length: n }, (_, i) => (i < Math.floor(n / 2) + 1 ? P('ind', 0) : null));
  const bare = setTown(createInitialCityState(), village, plots);
  const stat = (s: CityState) => computeAllStats(s).get(village)!;

  it('工場誘致: 工業の需要+1.0・公害+1.5', () => {
    const a = stat(bare);
    const b = stat(withOrd(bare, village, 'factory'));
    expect(b.demand.i - a.demand.i).toBeCloseTo(E.factoryIndDemand, 1);
    expect(b.pollution - a.pollution).toBeCloseTo(E.factoryPollution, 5);
    expect(b.happiness - a.happiness).toBeCloseTo(-E.factoryPollution, 5);
  });

  it('子育て支援: 住宅の需要+1.0', () => {
    expect(stat(withOrd(bare, village, 'childcare')).demand.r - stat(bare).demand.r).toBeCloseTo(E.childcareResDemand, 1);
  });

  it('観光振興・景観条例・町税: 幸福度が +0.5 / +2 / −1', () => {
    const h0 = stat(bare).happiness;
    expect(stat(withOrd(bare, village, 'tourism')).happiness - h0).toBeCloseTo(E.tourismHappiness, 5);
    expect(stat(withOrd(bare, village, 'scenery')).happiness - h0).toBeCloseTo(E.sceneryHappiness, 5);
    expect(stat(withOrd(bare, village, 'tax')).happiness - h0).toBeCloseTo(E.taxHappiness, 5);
  });

  it('景観条例: 工業地の新築は禁止（ほかの建物は建てられる）', () => {
    const s = withOrd(setTown(createInitialCityState(), 'tokyo', [P('res', 0), P('res', 0), P('res', 0), P('res', 0), null, null]), 'tokyo', 'scenery');
    expect(canBuild(s, 'tokyo', 'ind', 4, 1e9)).toBe('景観条例で工業地の新築は禁止されている');
    expect(canBuild(s, 'tokyo', 'com', 4, 1e9)).toBeNull();
  });

  it('観光振興は観光名所の月収を増やし（tourismIncomeMul）、町税は町長以外の建物から決まった割合（taxRate）を取る', () => {
    const tour = P('tourism', 0);
    expect(ordinancePlotIncome({ kind: 'tourism', mayor: 0 }, tour, 1000)).toEqual({ income: Math.round(1000 * E.tourismIncomeMul), tax: 0 });
    expect(ordinancePlotIncome({ kind: 'tourism', mayor: 0 }, P('res', 0), 1000)).toEqual({ income: 1000, tax: 0 });
    expect(ordinancePlotIncome({ kind: 'tax', mayor: 0 }, P('com', 1), 850)).toEqual({ income: 850, tax: Math.round(850 * E.taxRate) });
    expect(ordinancePlotIncome({ kind: 'tax', mayor: 0 }, P('com', 0), 850)).toEqual({ income: 850, tax: 0 });
    expect(ordinancePlotIncome({ kind: 'tax', mayor: 0 }, P('park', 1), -60)).toEqual({ income: -60, tax: 0 });
    expect(ordinancePlotIncome(null, tour, 1000)).toEqual({ income: 1000, tax: 0 });
  });

  it('負担は子育て支援が月¥150、観光振興が月¥100、ほかはなし', () => {
    expect(ORDINANCE_KINDS.map(k => ordinanceMonthlyCost(k))).toEqual([0, E.childcareCost, E.tourismCost, 0, 0]);
  });
});

describe('月末: 町税と条例の負担', () => {
  // 9月（季節の倍率なし）
  const TURN = 6;
  const town = [P('res', 0), P('res', 0), P('res', 0), P('res', 0), P('com', 1, 2), null];

  it('町税: 町長以外の建物の月収の一部（taxRate）が町長へ動き、レポートに内訳が出る', () => {
    setRandomSource(() => 0.99);
    const s = withOrd(setTown(createInitialCityState(), 'tokyo', town), 'tokyo', 'tax');
    const r = simulateRound(s, 2, TURN, [10000, 10000]);
    const [p0, p1] = r.report.players;
    expect(p1.taxPaid).toBeGreaterThan(0);
    expect(p0.mayorTax).toBe(p1.taxPaid);
    expect(p1.taxPaid).toBe(Math.round(p1.income * E.taxRate));
    expect(p1.net).toBe(p1.income - p1.upkeep);
    expect(p0.taxPaid).toBe(0);
  });

  it('好景気・不景気の札があっても、町税の払う額と受け取る額は同じ（景気を掛けた後の収入から取る）', () => {
    const base = withOrd(setTown(createInitialCityState(), 'tokyo', town), 'tokyo', 'tax');
    const run = (buffs: CityState['buffs']) => {
      setRandomSource(() => 0.99);
      return simulateRound({ ...base, buffs }, 2, TURN, [10000, 10000]).report.players;
    };
    const [m0, p0] = run([]);
    // 払う側が不景気: 収入が半分になり、町税も半分。町長が受け取る額も同じだけ減る
    const [m1, p1] = run([{ playerIndex: 1, kind: 'recession', roundsLeft: 2 }]);
    expect(p1.income).toBe(Math.round(p0.income * 0.5));
    expect(p1.taxPaid).toBe(Math.round(p0.taxPaid! * 0.5));
    expect(m1.mayorTax).toBe(p1.taxPaid);
    expect(m1.income).toBe(m0.income - m0.mayorTax! + m1.mayorTax!);
    // 町長が好景気: 自分の建物の収入だけ 1.5倍。受け取る町税は増えない
    const [m2, p2] = run([{ playerIndex: 0, kind: 'boom', roundsLeft: 2 }]);
    expect(m2.mayorTax).toBe(p2.taxPaid);
    expect(p2.taxPaid).toBe(p0.taxPaid);
    expect(m2.income).toBe(Math.round((m0.income - m0.mayorTax!) * 1.5) + m0.mayorTax!);
  });

  it('条例がなければ町税は動かない', () => {
    setRandomSource(() => 0.99);
    const r = simulateRound(setTown(createInitialCityState(), 'tokyo', town), 2, TURN, [10000, 10000]);
    expect(r.report.players.map(p => [p.mayorTax, p.taxPaid, p.ordinanceCost])).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  it('子育て支援の負担は町長が払う。町長がいなくなるとお休みで払わない', () => {
    setRandomSource(() => 0.99);
    const s = withOrd(setTown(createInitialCityState(), 'tokyo', town), 'tokyo', 'childcare');
    expect(simulateRound(s, 2, TURN, [0, 0]).report.players[0].ordinanceCost).toBe(E.childcareCost);
    const noMayor = setTown(s, 'tokyo', [P('res', 0), P('res', 0), P('com', 1), null, null, null]);
    expect(simulateRound(noMayor, 2, TURN, [0, 0]).report.players[0].ordinanceCost).toBe(0);
  });

  it('CPU の月収の見込みにも町税が入る', () => {
    const s = setTown(createInitialCityState(), 'tokyo', town);
    const taxed = withOrd(s, 'tokyo', 'tax');
    // 町長は受け取るので増え、払う側は減る（幸福度−1のぶんの目減りを含む）
    expect(playerMonthlyIncome(taxed, 1)).toBeLessThan(playerMonthlyIncome(s, 1));
    expect(playerMonthlyIncome(taxed, 0) - playerMonthlyIncome(s, 0)).toBeGreaterThan(-200);
  });
});

describe('CPU の町長', () => {
  // 育ちきった観光名所の町（育つ見込みの差が出ないので、観光振興の1.3倍がそのまま効く）
  const tourTown = [P('tourism', 0, 3), P('tourism', 0, 3), P('tourism', 0, 3), P('res', 0), P('res', 1), null];

  it('育ちきった観光名所を持つ町長は観光振興を選ぶ', () => {
    const s = setTown(createInitialCityState(), 'tokyo', tourTown);
    expect(chooseOrdinance(s, 'tokyo', 0, 10000, 5)?.kind).toBe('tourism');
  });

  it('他人の稼ぎが大きい町の町長は町税を選ぶ', () => {
    // 7区画のうち町長が公園4つ、ほかの3人が育った住宅を持つ
    const s = setTown(createInitialCityState(), 'tokyo', [P('park', 0), P('park', 0), P('park', 0), P('park', 0), P('res', 1, 3), P('res', 2, 3), P('res', 3, 3)]);
    expect(chooseOrdinance(s, 'tokyo', 0, 10000, 5)?.kind).toBe('tax');
  });

  it('町長でなければ条例を考えない', () => {
    const s = setTown(createInitialCityState(), 'tokyo', [P('tourism', 0), P('res', 1), null, null, null, null]);
    expect(chooseOrdinance(s, 'tokyo', 0, 10000, 5)).toBeNull();
  });

  it('お金がなくて建てられなくても、町長なら条例を出す（条例は工事の回数を使わないので、工事の候補には入らない）', () => {
    const s = setTown(createInitialCityState(), 'tokyo', tourTown);
    expect(chooseOrdinance(s, 'tokyo', 0, 500, 5)?.kind).toBe('tourism');
    expect(chooseCityAction(s, 'tokyo', 0, 500, 'steady', 20)).toBeNull();
  });

  it('今月もう決めたら、同じ月には決め直さない', () => {
    const s = withOrd(setTown(createInitialCityState(), 'tokyo', tourTown), 'tokyo', 'tax');
    const same = { ...s, towns: { ...s.towns, tokyo: { ...s.towns.tokyo, ordinance: { kind: 'tax' as const, by: 0, turn: 5 } } } };
    expect(chooseOrdinance(same, 'tokyo', 0, 10000, 5)).toBeNull();
    expect(chooseOrdinance(same, 'tokyo', 0, 10000, 6)?.kind).toBe('tourism');
  });

  it('町長になる工事には座の値打ちが乗る（町長にならなければ0）', () => {
    const mayorState = setTown(createInitialCityState(), 'tokyo', [P('res', 0), P('res', 0), P('res', 0), P('res', 0), P('com', 1, 3), null]);
    expect(mayorSeatValue(mayorState, 'tokyo', 0, 18, 'steady')).toBeGreaterThan(0);
    expect(mayorSeatValue(mayorState, 'tokyo', 1, 18, 'steady')).toBe(0);
  });

  it('条例の見込みから負担が引かれる（公園だけの町では幸福度が変わっても収入は変わらない）', () => {
    const s = setTown(createInitialCityState(), 'tokyo', [P('park', 0), P('park', 0), P('park', 0), P('park', 0), null, null]);
    const none = mayorTownValue(s, 'tokyo', 0, null);
    expect(mayorTownValue(s, 'tokyo', 0, 'tourism')).toBeCloseTo(none - E.tourismCost, 5);
    expect(mayorTownValue(s, 'tokyo', 0, 'childcare')).toBeCloseTo(none - E.childcareCost, 5);
    expect(mayorTownValue(s, 'tokyo', 0, 'scenery')).toBeCloseTo(none, 5);
    // 得になる条例がなければ何も出さない
    expect(chooseOrdinance(s, 'tokyo', 0, 10000, 5)).toBeNull();
  });
});
