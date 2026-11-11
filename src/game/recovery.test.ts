import { describe, it, expect } from 'vitest';
import {
  createInitialCityState, build, upgrade, renovate, acquireCost, plotValue, buildCost, baseBuildCost, upgradeCost, renovateCost,
  computeAllStats, simulateRound, applyDisaster, startBoom, RECOVERY, recoveryMonthsLeft, CITY_ECONOMY, getTownInfo, TOWN_IDS,
} from './city';
import type { CityDisasterReport, CityState, Plot } from './city';
import { settleDisasters, aidFor } from './recovery';
import { createCardState, protectInsured } from './cityCards';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';
import { chooseCpuPath, chooseCityAction } from './cpuAI';
import { NODE_MAP } from '../data/boardNodes';
import type { Player } from './types';

function withPlot(state: CityState, nodeId: string, idx: number, plot: Plot): CityState {
  const plots = [...state.towns[nodeId].plots];
  plots[idx] = plot;
  return { ...state, towns: { ...state.towns, [nodeId]: { ...state.towns[nodeId], plots } } };
}

function recovering(state: CityState, nodeId: string, months = RECOVERY.months): CityState {
  return { ...state, towns: { ...state.towns, [nodeId]: { ...state.towns[nodeId], recovery: months } } };
}

/** tokyo の区画0が全壊した、という報告 */
function destroyedReport(nodeId: string, owner: number, kind: Plot['kind'] = 'res', vacant = false): CityDisasterReport {
  return { kind: 'fire', title: '大火事', area: '', damages: [{ nodeId, kind, owner, destroyed: true, ...(vacant ? { vacant: true } : {}) }] };
}

describe('復興特需: 費用', () => {
  it('建設・再開発・空き家の修理が3割引きになる', () => {
    let s = createInitialCityState();
    const before = buildCost('res', 'tokyo', s.towns.tokyo);
    const r = build(s, 'tokyo', 0, 'res', 0, 1e6, 1);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const plot = s.towns.tokyo.plots[0]!;
    const upNormal = upgradeCost(plot, 'tokyo', s.towns.tokyo);
    const renoNormal = renovateCost(plot, 'tokyo', s.towns.tokyo);

    const rs = recovering(s, 'tokyo');
    expect(buildCost('res', 'tokyo', rs.towns.tokyo)).toBe(Math.round((before * RECOVERY.costMul) / 100) * 100);
    expect(upgradeCost(plot, 'tokyo', rs.towns.tokyo)).toBeLessThan(upNormal);
    expect(renovateCost(plot, 'tokyo', rs.towns.tokyo)).toBeLessThan(renoNormal);
    // 実際の工事の支払いも割引後
    const b2 = build(rs, 'tokyo', 1, 'res', 0, 1e6, 1);
    expect(b2.ok && b2.cost).toBe(buildCost('res', 'tokyo', rs.towns.tokyo));
    const up = upgrade(rs, 'tokyo', 0, 0, 1e6);
    expect(up.ok && up.cost).toBe(upgradeCost(plot, 'tokyo', rs.towns.tokyo));
    const vacantState = withPlot(rs, 'tokyo', 0, { ...plot, vacant: true });
    const reno = renovate(vacantState, 'tokyo', 0, 0, 1e6);
    expect(reno.ok && reno.cost).toBe(renovateCost(plot, 'tokyo', rs.towns.tokyo));
  });

  it('資産価値・買収額は下がらない（被災者の建物が安く買われない）', () => {
    let s = createInitialCityState();
    const r = build(s, 'tokyo', 0, 'com', 0, 1e6, 1);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const plot = s.towns.tokyo.plots[0]!;
    const rs = recovering(s, 'tokyo');
    expect(plotValue(plot, 'tokyo', rs.towns.tokyo)).toBe(plotValue(plot, 'tokyo', s.towns.tokyo));
    expect(acquireCost(plot, 'tokyo', rs.towns.tokyo)).toBe(acquireCost(plot, 'tokyo', s.towns.tokyo));
    expect(baseBuildCost('com', 'tokyo', rs.towns.tokyo)).toBe(buildCost('com', 'tokyo', s.towns.tokyo));
  });
});

describe('復興特需: 需要', () => {
  it('住宅・商業の需要が上がり、工業は上がらない', () => {
    let s = createInitialCityState();
    const r = build(s, 'sendai', 0, 'res', 0, 1e6, 1);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    const a = computeAllStats(s).get('sendai')!.demand;
    const b = computeAllStats(recovering(s, 'sendai')).get('sendai')!.demand;
    expect(b.r - a.r).toBeCloseTo(RECOVERY.demand, 5);
    expect(b.c - a.c).toBeCloseTo(RECOVERY.demand, 5);
    expect(b.i).toBeCloseTo(a.i, 5);
  });

  it('目的地の特需と重なっても足し算しない（大きい方）', () => {
    const s = createInitialCityState();
    const base = computeAllStats(s).get('sendai')!.demand;
    const both = computeAllStats(recovering(startBoom(s, 'sendai'), 'sendai')).get('sendai')!.demand;
    const boomOnly = computeAllStats(startBoom(s, 'sendai')).get('sendai')!.demand;
    const bigger = Math.max(CITY_ECONOMY.destinationBoomDemand, RECOVERY.demand);
    expect(both.r - base.r).toBeCloseTo(bigger, 5);
    expect(both.c - base.c).toBeCloseTo(bigger, 5);
    // 工業は目的地の特需のぶんだけ
    expect(both.i).toBeCloseTo(boomOnly.i, 5);
  });
});

describe('復興特需: 残り月', () => {
  it('月末ごとに1減り、6回目の月末で切れる', () => {
    setRandomSource(mulberry32(3));
    try {
      let s = recovering(createInitialCityState(), 'sendai');
      for (let m = 1; m <= RECOVERY.months; m++) {
        s = simulateRound(s, 2, 30 + m, [0, 0]).state; // 建物が無いので災害は起きない
        expect(recoveryMonthsLeft(s.towns.sendai)).toBe(RECOVERY.months - m);
      }
      expect(s.towns.sendai.recovery).toBeUndefined();
    } finally {
      resetRandomSource();
    }
  });
});

describe('見舞金と特需の始まり（settleDisasters）', () => {
  it('全壊した建物の持ち主に建設費の3割、損壊（1段階ダウン）は0', () => {
    const s = createInitialCityState();
    const report: CityDisasterReport = {
      kind: 'quake', title: '地震', area: '', damages: [
        { nodeId: 'tokyo', kind: 'res', owner: 0, destroyed: true },
        { nodeId: 'tokyo', kind: 'com', owner: 1, destroyed: false },
      ],
    };
    const out = settleDisasters(s, s, [report], 2);
    expect(out.aid[0]).toBe(Math.round((baseBuildCost('res', 'tokyo', s.towns.tokyo) * RECOVERY.aidRate) / 100) * 100);
    expect(out.aid[1]).toBe(0);
    expect(out.recoveryTowns).toEqual(['tokyo']);
    expect(recoveryMonthsLeft(out.state.towns.tokyo)).toBe(RECOVERY.months);
    expect(out.headlines.some(h => h.includes('復興特需'))).toBe(true);
  });

  it('見舞金は割引前・被災前の地価で計算する（特需中の町でも減らない）', () => {
    const s = createInitialCityState();
    const inRecovery = recovering(s, 'tokyo', 2);
    expect(aidFor('res', 'tokyo', inRecovery.towns.tokyo)).toBe(aidFor('res', 'tokyo', s.towns.tokyo));
  });

  it('空き家だった建物の見舞金は半額', () => {
    const s = createInitialCityState();
    const full = settleDisasters(s, s, [destroyedReport('tokyo', 0)], 1).aid[0];
    const vacant = settleDisasters(s, s, [destroyedReport('tokyo', 0, 'res', true)], 1).aid[0];
    expect(vacant).toBe(Math.round((full * RECOVERY.vacantAidMul) / 100) * 100);
  });

  it('2度目の被災は残り月を最大に戻す（積み上げない）', () => {
    const s = recovering(createInitialCityState(), 'tokyo', 2);
    const out = settleDisasters(s, s, [destroyedReport('tokyo', 0)], 1);
    expect(recoveryMonthsLeft(out.state.towns.tokyo)).toBe(RECOVERY.months);
  });

  it('被害がなければ何もしない', () => {
    const s = createInitialCityState();
    const out = settleDisasters(s, s, [{ kind: 'quake', title: '地震', area: '', damages: [] }], 2);
    expect(out.state).toBe(s);
    expect(out.aid).toEqual([0, 0]);
    expect(out.headlines).toEqual([]);
  });

  it('保険で元に戻った建物には見舞金を出さず、被害がすべて戻った町は特需にしない', () => {
    setRandomSource(mulberry32(11));
    try {
      let s = createInitialCityState();
      const r = build(s, 'tokyo', 0, 'res', 0, 1e6, 1);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
      const cards = { ...createCardState(2), insured: [0] };
      const hit = applyDisaster(s, 'fire', { targetPlayer: 0 });
      expect(hit.report.damages).toHaveLength(1);
      const ins = protectInsured(s, hit.state, hit.report, cards);
      const out = settleDisasters(s, ins.city, [ins.report], 2);
      expect(out.aid).toEqual([0, 0]);
      expect(recoveryMonthsLeft(out.state.towns.tokyo)).toBe(0);
      // 保険がなければ見舞金と特需
      const plain = settleDisasters(s, hit.state, [hit.report], 2);
      expect(plain.aid[0]).toBeGreaterThan(0);
      expect(recoveryMonthsLeft(plain.state.towns.tokyo)).toBe(RECOVERY.months);
    } finally {
      resetRandomSource();
    }
  });

  it('保険の {...前, ...後} の合成でも、切れた特需が生き返らない', () => {
    setRandomSource(mulberry32(5));
    try {
      let s = createInitialCityState();
      const r = build(s, 'tokyo', 0, 'res', 0, 1e6, 1);
      if (!r.ok) throw new Error(r.reason);
      s = recovering(r.state, 'tokyo', 1);
      // 月末: 残り1 → 切れる。その後で保険が被害を戻す想定
      const after = simulateRound(s, 1, 31, [0]).state;
      expect(recoveryMonthsLeft(after.towns.tokyo)).toBe(0);
      const merged = { ...s.towns.tokyo, ...after.towns.tokyo };
      expect(recoveryMonthsLeft(merged)).toBe(0);
    } finally {
      resetRandomSource();
    }
  });

  it('災害の報告に空き家の印が付く', () => {
    setRandomSource(mulberry32(2));
    try {
      let s = createInitialCityState();
      const r = build(s, 'tokyo', 0, 'res', 0, 1e6, 1);
      if (!r.ok) throw new Error(r.reason);
      s = withPlot(r.state, 'tokyo', 0, { ...r.state.towns.tokyo.plots[0]!, vacant: true });
      const hit = applyDisaster(s, 'fire', { targetPlayer: 0 });
      expect(hit.report.damages[0].vacant).toBe(true);
      expect(getTownInfo('tokyo')).not.toBeNull();
    } finally {
      resetRandomSource();
    }
  });
});

describe('CPU: 復興特需の町をねらう', () => {
  const towns = TOWN_IDS.filter(id => NODE_MAP.get(id)?.type === 'fishing');
  const player = { currentNode: 'tokyo', money: 50000, cpuStyle: 'steady' } as unknown as Player;

  it('建てられる復興特需の町へ向かう道を選ぶ', () => {
    const [a, b] = towns;
    const base = { ...createInitialCityState(), destination: null };
    for (const target of [a, b]) {
      const city = recovering(base, target);
      const ctx = { paths: [['tokyo', a], ['tokyo', b]], mode: 'city' as const, player, playerIndex: 0, city, turn: 5, maxTurns: 36, goalClaims: [] };
      const picked = chooseCpuPath(ctx);
      expect(ctx.paths[picked][1]).toBe(target);
    }
  });

  it('割引で予備費の内に収まれば建てる', () => {
    const nodeId = 'sendai';
    const s = createInitialCityState();
    const reserve = 3000; // cpuAI の steady の予備費
    // 住宅がふだんは買えず、割引なら買える所持金（公園など赤字の建物は CPU が選ばないので住宅で比べる）
    const res = buildCost('res', nodeId, s.towns[nodeId]);
    const resRec = buildCost('res', nodeId, recovering(s, nodeId).towns[nodeId]);
    const money = reserve + Math.round((res + resRec) / 2);
    const normal = chooseCityAction(s, nodeId, 0, money, 'steady', 24);
    expect(normal?.type === 'build' && normal.kind === 'res').toBe(false);
    const rec = chooseCityAction(recovering(s, nodeId), nodeId, 0, money, 'steady', 24);
    expect(rec?.type).toBe('build');
  });
});
