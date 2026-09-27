import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createInitialCityState, getTownInfo, build, upgrade, acquire, buildCost, computeAllStats, computePowered,
  simulateRound, applyDisaster, pickDestination, applyCityEvent, cityScore, monopolyOwner, portFee,
  TOWN_IDS, CITY_EVENT_CARDS, POWER_RANGE, distancesFrom, townNeighbors, calendarLabel, CITY_ECONOMY,
  visitorFees, startBoom, seasonOf,
} from './city';
import { getReachableNodes } from '../utils/pathfinding';
import type { CityState } from './city';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

function place(state: CityState, nodeId: string, plotIndex: number, kind: Parameters<typeof build>[3], owner = 0, level = 1): CityState {
  const r = build(state, nodeId, plotIndex, kind, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  if (level > 1) {
    const plots = [...r.state.towns[nodeId].plots];
    plots[plotIndex] = { ...plots[plotIndex]!, level };
    return { ...r.state, towns: { ...r.state.towns, [nodeId]: { plots } } };
  }
  return r.state;
}

describe('まちづくり: 町の定義', () => {
  it('町は中継・スタート・ゴール以外のマス', () => {
    expect(TOWN_IDS.length).toBeGreaterThan(60);
    expect(getTownInfo('start')).toBeNull();
    expect(getTownInfo('goal')).toBeNull();
    expect(TOWN_IDS.some(id => id.startsWith('r_'))).toBe(false);
  });

  it('東京・大阪・名古屋は大都市、港町は漁港が建てられる', () => {
    expect(getTownInfo('tokyo')?.cls).toBe('metro');
    expect(getTownInfo('osaka')?.plots).toBe(8);
    const choshi = getTownInfo('choshi')!;
    expect(choshi.cls).toBe('port');
    expect(choshi.allowed).toContain('port');
    expect(choshi.allowed).not.toContain('power');
  });

  it('初期状態では全区画が空き、目的地が決まっている', () => {
    setRandomSource(mulberry32(1));
    const s = createInitialCityState();
    resetRandomSource();
    expect(Object.values(s.towns).every(t => t.plots.every(p => p === null))).toBe(true);
    expect(s.destination).toBeTruthy();
    expect(s.destinationReward).toBeGreaterThan(2000);
  });

  it('近隣の町は中継マスを挟んだ隣町', () => {
    const nb = townNeighbors('tokyo');
    expect(nb.length).toBeGreaterThan(0);
    for (const id of nb) expect(distancesFrom('tokyo').get(id)).toBeLessThanOrEqual(2);
  });

  it('暦: 1巡目は1年目4月、10巡目は2年目1月', () => {
    expect(calendarLabel(1)).toEqual({ year: 1, month: 4 });
    expect(calendarLabel(10)).toEqual({ year: 2, month: 1 });
  });
});

describe('まちづくり: 建設・再開発・買収', () => {
  let s: CityState;
  beforeEach(() => {
    setRandomSource(mulberry32(7));
    s = createInitialCityState();
  });
  afterEach(() => resetRandomSource());

  it('建設すると区画が埋まり、地価に応じた費用がかかる', () => {
    const r = build(s, 'tokyo', 0, 'res', 0, 100000, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(buildCost('res', 'tokyo'));
    expect(buildCost('res', 'tokyo')).toBeGreaterThan(buildCost('res', 'sakata'));
    expect(r.state.towns.tokyo.plots[0]).toMatchObject({ kind: 'res', level: 1, owner: 0 });
    // 元の状態は不変
    expect(s.towns.tokyo.plots[0]).toBeNull();
  });

  it('お金不足・使用中区画・許可されない建物は失敗する', () => {
    expect(build(s, 'tokyo', 0, 'res', 0, 10, 1).ok).toBe(false);
    const s2 = place(s, 'tokyo', 0, 'res');
    expect(build(s2, 'tokyo', 0, 'com', 1, 1e9, 1).ok).toBe(false);
    expect(build(s, 'choshi', 0, 'power', 0, 1e9, 1).ok).toBe(false); // 港町に発電所は不可
    const s3 = place(s, 'tokyo', 1, 'power');
    expect(build(s3, 'tokyo', 2, 'power', 0, 1e9, 1).ok).toBe(false); // 1町1基
  });

  it('再開発で等級が上がり、公園は再開発できない', () => {
    const s2 = place(place(s, 'tokyo', 0, 'res'), 'tokyo', 1, 'park');
    const up = upgrade(s2, 'tokyo', 0, 0, 1e9);
    expect(up.ok && up.state.towns.tokyo.plots[0]?.level).toBe(2);
    expect(upgrade(s2, 'tokyo', 1, 0, 1e9).ok).toBe(false);
    expect(upgrade(s2, 'tokyo', 0, 1, 1e9).ok).toBe(false); // 他人の建物
  });

  it('買収すると持ち主が変わり、前の持ち主が返る', () => {
    const s2 = place(s, 'tokyo', 0, 'com', 1);
    const r = acquire(s2, 'tokyo', 0, 0, 1e9);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.towns.tokyo.plots[0]?.owner).toBe(0);
    expect(r.prevOwner).toBe(1);
    expect(r.cost).toBeGreaterThan(buildCost('com', 'tokyo'));
  });

  it('独占: 全区画を1人で埋めると独占', () => {
    let s2 = s;
    const n = s.towns.sakata.plots.length;
    for (let i = 0; i < n; i++) s2 = place(s2, 'sakata', i, i === 0 ? 'ind' : 'res', 0);
    expect(monopolyOwner(s2.towns.sakata)).toBe(0);
    const s3 = acquire(s2, 'sakata', 0, 1, 1e9);
    expect(s3.ok && monopolyOwner(s3.state.towns.sakata)).toBe(null);
  });
});

describe('まちづくり: シミュレーション', () => {
  afterEach(() => resetRandomSource());

  it('発電所は一定距離の町へ送電する', () => {
    setRandomSource(mulberry32(3));
    const s = place(createInitialCityState(), 'tokyo', 0, 'power');
    const powered = computePowered(s);
    expect(powered.has('tokyo')).toBe(true);
    const d = distancesFrom('tokyo');
    for (const id of powered) expect(d.get(id)!).toBeLessThanOrEqual(POWER_RANGE);
    expect(powered.has('naha')).toBe(false);
  });

  it('工業は公害を出し、公園は吸収する', () => {
    setRandomSource(mulberry32(3));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'ind', 0, 3);
    s = place(s, 'tokyo', 1, 'res');
    const polluted = computeAllStats(s).get('tokyo')!;
    s = place(s, 'tokyo', 2, 'park');
    s = place(s, 'tokyo', 3, 'park');
    const green = computeAllStats(s).get('tokyo')!;
    expect(polluted.pollution).toBeGreaterThan(green.pollution);
    expect(green.happiness).toBeGreaterThan(polluted.happiness);
  });

  it('電気のない商工業は収入が大きく落ちる', () => {
    setRandomSource(mulberry32(5));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0, 3);
    s = place(s, 'tokyo', 1, 'com', 0);
    const noPower = simulateRound(s, 1, 1, [0]).incomes[0];
    setRandomSource(mulberry32(5));
    const s2 = place(s, 'tokyo', 2, 'power', 1);
    const withPower = simulateRound(s2, 2, 1, [0, 0]).incomes[0];
    expect(withPower).toBeGreaterThan(noPower);
  });

  it('月末処理で収入が入り、履歴が積み上がる', () => {
    setRandomSource(mulberry32(11));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'power', 0);
    s = place(s, 'tokyo', 1, 'res', 0);
    s = place(s, 'tokyo', 2, 'com', 1);
    s = place(s, 'tokyo', 3, 'ind', 1);
    const r = simulateRound(s, 2, 1, [1000, 1000]);
    expect(r.report.players).toHaveLength(2);
    expect(r.incomes[1]).toBeGreaterThan(0);
    expect(r.state.history).toHaveLength(1);
    expect(r.report.players[0].population).toBeGreaterThan(0);
  });

  it('需要があれば町は自然に発展していく（長期）', () => {
    setRandomSource(mulberry32(21));
    let s = createInitialCityState();
    s = place(s, 'nagoya', 0, 'power', 0);
    s = place(s, 'nagoya', 1, 'res', 0);
    s = place(s, 'nagoya', 2, 'res', 0);
    s = place(s, 'nagoya', 3, 'com', 0);
    s = place(s, 'nagoya', 4, 'ind', 0);
    s = place(s, 'nagoya', 5, 'park', 0);
    const before = s.towns.nagoya.plots.reduce((a, p) => a + (p?.level ?? 0), 0);
    let money = [0];
    for (let t = 1; t <= 12; t++) {
      const r = simulateRound(s, 1, t + 1, money); // 台風の月(8,9月)を含む
      s = r.state;
      money = [money[0] + r.incomes[0]];
    }
    const after = s.towns.nagoya.plots.reduce((a, p) => a + (p?.level ?? 0), 0);
    expect(after).toBeGreaterThanOrEqual(before);
    expect(money[0]).toBeGreaterThan(0);
  });
});

describe('まちづくり: 災害・イベント・目的地', () => {
  afterEach(() => resetRandomSource());

  it('火事は対象プレイヤーの建物だけを1つ壊す', () => {
    setRandomSource(mulberry32(9));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0);
    s = place(s, 'tokyo', 1, 'res', 1);
    const r = applyDisaster(s, 'fire', { targetPlayer: 1 });
    expect(r.report.damages).toHaveLength(1);
    expect(r.report.damages[0].owner).toBe(1);
    expect(r.state.towns.tokyo.plots[0]).not.toBeNull();
    expect(r.state.towns.tokyo.plots[1]).toBeNull();
  });

  it('地震は指定地方の建物だけに被害を出す', () => {
    setRandomSource(() => 0); // 必ず当たる
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0, 2);
    s = place(s, 'osaka', 0, 'res', 0, 2);
    const r = applyDisaster(s, 'quake', { region: 'kanto' });
    expect(r.state.towns.tokyo.plots[0]?.level).toBe(1);
    expect(r.state.towns.osaka.plots[0]?.level).toBe(2);
  });

  it('備え: 公園のある町は地震の被災率が下がる', () => {
    expect(CITY_ECONOMY.parkQuakeHit).toBeLessThan(CITY_ECONOMY.quakeHit);
    // 乱数を被災率の間に置くと、公園のない町だけが被災する
    const between = (CITY_ECONOMY.parkQuakeHit + CITY_ECONOMY.quakeHit) / 2;
    setRandomSource(() => between);
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0, 2);
    s = place(s, 'tokyo', 1, 'park', 0);
    s = place(s, 'yokohama', 0, 'res', 0, 2);
    const r = applyDisaster(s, 'quake', { region: 'kanto' });
    expect(r.state.towns.tokyo.plots[0]?.level).toBe(2);
    expect(r.state.towns.yokohama.plots[0]?.level).toBe(1);
  });

  it('目的地は現在地から離れた都市で、賞金は距離に比例', () => {
    setRandomSource(mulberry32(4));
    const d = pickDestination(null, 'tokyo');
    expect(d.nodeId).not.toBe('tokyo');
    expect(distancesFrom('tokyo').get(d.nodeId)!).toBeGreaterThanOrEqual(6);
    expect(d.reward).toBeGreaterThanOrEqual(2000 + 6 * 220 - 100);
  });

  it('全てのまちイベントが例外なく適用できる', () => {
    setRandomSource(mulberry32(2));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0);
    for (const card of CITY_EVENT_CARDS) {
      const out = applyCityEvent(s, card, 0, 'tokyo', 3);
      expect(typeof out.message).toBe('string');
      expect(Number.isFinite(out.moneyDelta)).toBe(true);
    }
  });

  it('総資産 = 所持金 + 建物の価値、漁港は釣果の手数料(portFeeRate)を持ち主へ', () => {
    setRandomSource(mulberry32(2));
    let s = createInitialCityState();
    s = place(s, 'choshi', 0, 'port', 1);
    s = place(s, 'choshi', 1, 'res', 0);
    const sc = cityScore(s, 0, 5000);
    expect(sc.assets).toBe(5000 + sc.property);
    expect(sc.buildings).toBe(1);
    expect(portFee(s, 'choshi', 1000)).toEqual({ owner: 1, fee: Math.round(1000 * CITY_ECONOMY.portFeeRate) });
    expect(portFee(s, 'tokyo', 1000)).toBeNull();
  });
});

describe('まちづくり: 季節・買い物代・目的地（第2弾）', () => {
  afterEach(() => resetRandomSource());

  it('暦: 12月は年末商戦で商業の収入が増える', () => {
    setRandomSource(() => 0.99); // 成長・災害を起こさない
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'power', 0);
    s = place(s, 'tokyo', 1, 'res', 0, 3);
    s = place(s, 'tokyo', 2, 'com', 1, 2);
    expect(seasonOf(9).month).toBe(12);
    const nov = simulateRound(s, 2, 8, [0, 0]).incomes[1]; // 11月（紅葉: 商業は変わらない）
    const dec = simulateRound(s, 2, 9, [0, 0]).incomes[1]; // 12月
    expect(dec).toBeGreaterThan(nov);
  });

  it('買い物代: 他人の商業・観光に払い、自分の店と空き家は払わない。所持金の一定割合まで', () => {
    setRandomSource(mulberry32(3));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'com', 1, 2);
    s = place(s, 'tokyo', 1, 'tourism', 2, 1);
    s = place(s, 'tokyo', 2, 'com', 0, 3);
    const f = visitorFees(s, 'tokyo', 0, 100000);
    expect(f.payments.map(x => x.owner).sort()).toEqual([1, 2]);
    expect(f.total).toBeGreaterThan(0);
    const capped = visitorFees(s, 'tokyo', 0, 1000);
    expect(capped.total).toBeLessThanOrEqual(Math.floor(1000 * CITY_ECONOMY.visitorMaxRate));
    // 空き家は払わない
    const plots = [...s.towns.tokyo.plots];
    plots[0] = { ...plots[0]!, vacant: true };
    const s2 = { ...s, towns: { ...s.towns, tokyo: { ...s.towns.tokyo, plots } } };
    expect(visitorFees(s2, 'tokyo', 0, 100000).payments.map(x => x.owner)).toEqual([2]);
  });

  it('目的地: 年を追うごとに賞金が上がる', () => {
    setRandomSource(() => 0.3);
    const y1 = pickDestination(null, 'tokyo', 1);
    setRandomSource(() => 0.3);
    const y3 = pickDestination(null, 'tokyo', 25);
    expect(y3.nodeId).toBe(y1.nodeId);
    expect(y3.reward).toBeGreaterThan(y1.reward);
  });

  it('目的地の特需で需要が上がり、月末ごとに残り月数が減る', () => {
    setRandomSource(() => 0.99);
    let s = createInitialCityState();
    s = place(s, 'sendai', 0, 'res', 0);
    const before = computeAllStats(s).get('sendai')!.demand.r;
    s = startBoom(s, 'sendai');
    expect(computeAllStats(s).get('sendai')!.demand.r).toBeGreaterThan(before);
    const after = simulateRound(s, 1, 1, [0]).state;
    expect(after.booms?.[0].monthsLeft).toBe(CITY_ECONOMY.destinationBoomMonths - 1);
  });

  it('経路: 目的地は歩数が残っていても止まれる', () => {
    const d = distancesFrom('tokyo');
    const target = [...d.entries()].find(([id, dist]) => dist === 2 && getTownInfo(id))![0];
    const without = getReachableNodes('tokyo', 5).map(p => p[p.length - 1]);
    const withStop = getReachableNodes('tokyo', 5, [target]).map(p => p[p.length - 1]);
    expect(without.includes(target)).toBe(false);
    expect(withStop.includes(target)).toBe(true);
  });
});

describe('まちづくり: 災害で町の状態が消えない', () => {
  afterEach(() => resetRandomSource());
  it('地震で壊れても発展度・地価・もとの区画数は残る', () => {
    setRandomSource(() => 0);
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0, 2);
    s = { ...s, towns: { ...s.towns, tokyo: { ...s.towns.tokyo, tier: 2, land: 1.2, base: 8 } } };
    const r = applyDisaster(s, 'quake', { region: 'kanto' });
    expect(r.report.damages.length).toBeGreaterThan(0);
    expect(r.state.towns.tokyo).toMatchObject({ tier: 2, land: 1.2, base: 8 });
  });
});
