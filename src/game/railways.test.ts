import { describe, it, expect, afterEach } from 'vitest';
import {
  RAIL_ECONOMY, railPrice, railThemeLabel, canLayRail, layRail, railOptions, railPassSet, railFares, countedSteps,
  railDistancesFrom, railLinkedNodes, railNeighborMap, mergeRailNeighbors, railUpkeep, playerRailValue, railCount, isRouteNode,
  railPlanValue, RAIL_CPU,
} from './railways';
import type { RailMap } from './railways';
import { createInitialCityState, build, computeAllStats, simulateRound, cityScore, distancesFrom, townNeighbors, TOWN_IDS, getTownInfo } from './city';
import type { CityState, BuildingKind } from './city';
import { getReachableNodes } from '../utils/pathfinding';
import { chooseCpuPath, railCandidates } from './cpuAI';
import type { Player } from './types';
import { createInitialEquipment } from './equipment';
import { BOARD_NODES } from '../data/boardNodes';
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

function withRails(s: CityState, rails: RailMap): CityState {
  return { ...s, rails };
}

// 東京の周り（実在の盤）: 東京〜横浜=街道 / 日光〜東京=川 / 前橋〜東京=峠 / 東京〜秩父=海路
// 東海道: 東京 -r- 横浜 -r- 鎌倉 -r- 小田原 -r- 静岡
const TOKAIDO = ['r_tokyo_yokohama', 'r_yokohama_kamakura', 'r_kamakura_odawara', 'r_odawara_shizuoka'];

describe('線路の値段と敷く条件', () => {
  it('値段は中継マスの地形で決まる（街道・川 / 峠 / 海路）', () => {
    expect(railPrice('r_tokyo_yokohama')).toBe(RAIL_ECONOMY.price.town);
    expect(railPrice('r_nikko_tokyo')).toBe(RAIL_ECONOMY.price.river);
    expect(railPrice('r_maebashi_tokyo')).toBe(RAIL_ECONOMY.price.mountain);
    expect(railPrice('r_tokyo_chichibu')).toBe(RAIL_ECONOMY.price.sea);
    expect([RAIL_ECONOMY.price.town, RAIL_ECONOMY.price.river, RAIL_ECONOMY.price.mountain, RAIL_ECONOMY.price.sea]).toEqual([3000, 3000, 4500, 6000]);
    expect(railThemeLabel('r_tokyo_chichibu')).toBe('航路');
    expect(railThemeLabel('r_maebashi_tokyo')).toBe('峠');
  });

  it('全ての中継マスに値段がつき、両端は2つ', () => {
    const routes = BOARD_NODES.filter(n => n.type === 'route');
    expect(routes.length).toBeGreaterThan(100);
    for (const r of routes) expect(railPrice(r.id)).toBeGreaterThan(0);
  });

  it('自分の建物がある町に隣り合う中継マスにだけ敷ける', () => {
    let s = createInitialCityState();
    expect(canLayRail(s, 'tokyo', 'r_tokyo_yokohama', 0, 1e6)).toContain('自分の建物');
    s = place(s, 'tokyo', 0, 'res', 0);
    expect(canLayRail(s, 'tokyo', 'r_tokyo_yokohama', 0, 1e6)).toBeNull();
    expect(canLayRail(s, 'tokyo', 'r_yokohama_kamakura', 0, 1e6)).toContain('隣り合う');
    expect(canLayRail(s, 'tokyo', 'yokohama', 0, 1e6)).toContain('隣り合う');
    expect(canLayRail(s, 'r_tokyo_yokohama', 'r_tokyo_yokohama', 0, 1e6)).toContain('町ではない');
    expect(canLayRail(s, 'tokyo', 'r_tokyo_yokohama', 0, 2999)).toBe('お金が足りない');
    // 他の人の建物しかない町では敷けない
    expect(canLayRail(s, 'tokyo', 'r_tokyo_yokohama', 1, 1e6)).toContain('自分の建物');
  });

  it('layRail: 値段を返し、持ち主を記録する。二重には敷けない', () => {
    let s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    s = place(s, 'tokyo', 1, 'com', 1);
    const r = layRail(s, 'tokyo', 'r_tokyo_yokohama', 0, 5000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(3000);
    expect(r.state.rails).toEqual({ r_tokyo_yokohama: 0 });
    expect(r.message).toContain('線路');
    expect(s.rails).toBeUndefined(); // 元の状態は変えない
    expect(canLayRail(r.state, 'tokyo', 'r_tokyo_yokohama', 0, 1e6)).toContain('自分の線路');
    expect(canLayRail(r.state, 'tokyo', 'r_tokyo_yokohama', 1, 1e6)).toContain('他の人の線路');
    const sea = layRail(r.state, 'tokyo', 'r_tokyo_chichibu', 1, 1e6);
    expect(sea.ok && sea.message).toContain('航路');
  });

  it('railOptions: 町の隣の中継マスを、向こう側の町・値段・敷けるかと一緒に並べる', () => {
    let s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    s = withRails(s, { r_tokyo_yokohama: 1 });
    const opts = railOptions(s, 'tokyo', 0, 4000);
    expect(opts.length).toBe(6);
    const yoko = opts.find(o => o.routeId === 'r_tokyo_yokohama')!;
    expect(yoko.otherEnd).toBe('yokohama');
    expect(yoko.owner).toBe(1);
    expect(yoko.reason).not.toBeNull();
    const nikko = opts.find(o => o.routeId === 'r_nikko_tokyo')!;
    expect(nikko.otherEnd).toBe('nikko');
    expect(nikko.reason).toBeNull();
    expect(opts.find(o => o.routeId === 'r_tokyo_chichibu')!.reason).toBe('お金が足りない');
  });
});

describe('線路の上は歩数を使わずに通り抜ける', () => {
  it('1歩で、線路の向こうの町まで行ける。線路の上には止まれない', () => {
    const without = getReachableNodes('tokyo', 1).map(p => p[p.length - 1]);
    expect(without).toContain('r_tokyo_yokohama');
    expect(without).not.toContain('yokohama');

    const pass = railPassSet({ r_tokyo_yokohama: 0 });
    const paths = getReachableNodes('tokyo', 1, [], pass);
    const ends = paths.map(p => p[p.length - 1]);
    expect(ends).toContain('yokohama');
    expect(ends).not.toContain('r_tokyo_yokohama');
    // 線路のない中継マスにはこれまでどおり止まれる
    expect(ends).toContain('r_nikko_tokyo');
    // 経路には線路のマスも入る（駒はそこを通って動く）
    expect(paths.find(p => p[p.length - 1] === 'yokohama')).toEqual(['tokyo', 'r_tokyo_yokohama', 'yokohama']);
  });

  it('線路が続けば、町から町へ1歩ずつ進める（中継マスの分の歩数がいらない）', () => {
    const pass = railPassSet(Object.fromEntries(TOKAIDO.map(r => [r, 0])));
    // 盤面では小田原は6マス先。東海道に線路があれば3歩（横浜・鎌倉・小田原）で着く
    const three = getReachableNodes('tokyo', 3, [], pass);
    const toOdawara = three.find(p => p[p.length - 1] === 'odawara');
    expect(toOdawara).toEqual(['tokyo', 'r_tokyo_yokohama', 'yokohama', 'r_yokohama_kamakura', 'kamakura', 'r_kamakura_odawara', 'odawara']);
    expect(getReachableNodes('tokyo', 3).map(p => p[p.length - 1])).not.toContain('odawara');
    for (const p of three) for (const r of TOKAIDO) expect(p[p.length - 1]).not.toBe(r);
  });

  it('どこから何歩で動いても、終点は線路の上にならず、数える歩数は出目以下', () => {
    const railed: RailMap = {};
    BOARD_NODES.filter(n => n.type === 'route').forEach((n, i) => {
      if (i % 3 === 0) railed[n.id] = i % 2;
    });
    const pass = railPassSet(railed);
    const starts = ['tokyo', 'osaka', 'sapporo', 'fukuoka', 'kanazawa', 'naha'];
    for (const start of starts) {
      for (let steps = 1; steps <= 8; steps++) {
        const paths = getReachableNodes(start, steps, [], pass);
        expect(paths.length).toBeGreaterThan(0);
        for (const p of paths) {
          const end = p[p.length - 1];
          expect(railed[end]).toBeUndefined();
          expect(countedSteps(p, railed)).toBeLessThanOrEqual(steps);
          expect(new Set(p).size).toBe(p.length);
        }
      }
    }
  });

  it('線路の上に立っていても（後から敷かれた）出発できる', () => {
    const pass = railPassSet({ r_tokyo_yokohama: 1 });
    const paths = getReachableNodes('r_tokyo_yokohama', 2, [], pass);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) expect(p[0]).toBe('r_tokyo_yokohama');
  });

  it('線路が無ければ、これまでと同じ経路', () => {
    for (const steps of [1, 3, 6]) {
      expect(getReachableNodes('tokyo', steps, [], railPassSet(undefined))).toEqual(getReachableNodes('tokyo', steps));
    }
  });

  it('countedSteps は線路のマスを数えない', () => {
    expect(countedSteps(['tokyo', 'r_tokyo_yokohama', 'yokohama', 'r_yokohama_kamakura'], { r_tokyo_yokohama: 0 })).toBe(2);
    expect(countedSteps(['tokyo'], undefined)).toBe(0);
  });
});

describe('運賃・維持費・資産', () => {
  const path = ['tokyo', 'r_tokyo_yokohama', 'yokohama', 'r_yokohama_kamakura', 'kamakura'];
  const rails: RailMap = { r_tokyo_yokohama: 1, r_yokohama_kamakura: 1 };

  it('他人の線路を通ると1区間ごとに運賃を払う（自分の線路はただ）', () => {
    expect(railFares(rails, path, 0)).toEqual({ payments: [{ owner: 1, amount: 2 * RAIL_ECONOMY.fare }], total: 2 * RAIL_ECONOMY.fare });
    expect(railFares(rails, path, 1).total).toBe(0);
    expect(railFares(undefined, path, 0).total).toBe(0);
  });

  it('運賃は1回の移動で所持金の一部まで（借金にしない）。持ち主ごとにまとめる', () => {
    // 2区間ぶんを払うと上限を超える所持金: 上限まで払って終わり
    const short = RAIL_ECONOMY.fare + Math.round(RAIL_ECONOMY.fare / 2);
    expect(railFares(rails, path, 0, short).total).toBe(Math.floor(short * RAIL_ECONOMY.fareMaxRate));
    const rich = Math.ceil((2 * RAIL_ECONOMY.fare) / RAIL_ECONOMY.fareMaxRate);
    expect(railFares(rails, path, 0, rich).total).toBe(2 * RAIL_ECONOMY.fare);
    expect(railFares(rails, path, 0, 0).total).toBe(0);
    const mixed = railFares({ r_tokyo_yokohama: 1, r_yokohama_kamakura: 2 }, path, 0);
    expect(mixed.payments).toEqual([{ owner: 1, amount: RAIL_ECONOMY.fare }, { owner: 2, amount: RAIL_ECONOMY.fare }]);
  });

  it('維持費は1区間ごと、資産は敷いた値段の一部（assetRate）', () => {
    const r: RailMap = { r_tokyo_yokohama: 0, r_tokyo_chichibu: 0, r_nikko_tokyo: 1, r_x: 7 };
    expect(railUpkeep(r, 2)).toEqual([2 * RAIL_ECONOMY.upkeep, RAIL_ECONOMY.upkeep]);
    expect(railCount(r, 0)).toBe(2);
    expect(playerRailValue(r, 0)).toBe(Math.round(3000 * RAIL_ECONOMY.assetRate) + Math.round(6000 * RAIL_ECONOMY.assetRate));
    expect(playerRailValue(undefined, 0)).toBe(0);
  });

  it('月末: 維持費が支出に入る（収入の計算は同じ）', () => {
    const base = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    // 東京から遠い北海道の線路（東京の近所は変わらない）
    const railed = withRails(base, { r_wakkanai_asahikawa: 0, r_kushiro_obihiro: 0, r_start_kushiro: 1 });
    setRandomSource(mulberry32(9));
    const a = simulateRound(base, 2, 1, [0, 0]);
    setRandomSource(mulberry32(9));
    const b = simulateRound(railed, 2, 1, [0, 0]);
    expect(b.report.players[0].income).toBe(a.report.players[0].income);
    expect(b.report.players[0].upkeep - a.report.players[0].upkeep).toBe(2 * RAIL_ECONOMY.upkeep);
    expect(b.report.players[1].upkeep - a.report.players[1].upkeep).toBe(RAIL_ECONOMY.upkeep);
    expect(b.state.rails).toEqual(railed.rails); // 月末で線路は消えない
  });

  it('最終得点の資産に線路の価値が入る', () => {
    const s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    const before = cityScore(s, 0, 1000).property;
    const after = cityScore(withRails(s, { r_tokyo_yokohama: 0 }), 0, 1000).property;
    expect(after - before).toBe(Math.round(RAIL_ECONOMY.price.town * RAIL_ECONOMY.assetRate));
  });
});

describe('線路でつながった町は近所になる', () => {
  const tokaido: RailMap = Object.fromEntries(TOKAIDO.map(r => [r, 0]));

  it('3区間先までつながる（4区間目は近所にならない）', () => {
    const linked = railLinkedNodes(tokaido, 'tokyo');
    expect(linked.get('yokohama')).toBe(1);
    expect(linked.get('kamakura')).toBe(2);
    expect(linked.get('odawara')).toBe(3);
    expect(linked.has('shizuoka')).toBe(false);
    for (const r of TOKAIDO) expect(linked.has(r)).toBe(false);
    expect(railLinkedNodes(tokaido, 'shizuoka').get('yokohama')).toBe(3);
  });

  it('線路が途切れると、そこから先はつながらない', () => {
    const broken: RailMap = { r_tokyo_yokohama: 0, r_kamakura_odawara: 1 };
    const linked = railLinkedNodes(broken, 'tokyo');
    expect([...linked.keys()]).toEqual(['yokohama']);
    expect(railLinkedNodes(undefined, 'tokyo').size).toBe(0);
  });

  it('railNeighborMap は線路の端の町ごとにつながった町を持つ（線路が無ければ空）', () => {
    const m = railNeighborMap(tokaido);
    expect(m.get('tokyo')).toEqual(expect.arrayContaining(['yokohama', 'kamakura', 'odawara']));
    expect(m.get('odawara')).toEqual(expect.arrayContaining(['tokyo', 'shizuoka']));
    expect(railNeighborMap({}).size).toBe(0);
    expect(railNeighborMap(tokaido)).toBe(m); // 同じ rails なら使い回す
  });

  it('mergeRailNeighbors は重ねて数えず、町だけを足す', () => {
    const board = townNeighbors('tokyo');
    const merged = mergeRailNeighbors(board, ['yokohama', 'odawara', 'tokyo', 'start'], 'tokyo', id => !!getTownInfo(id));
    expect(merged.filter(x => x === 'yokohama').length).toBe(board.includes('yokohama') ? 1 : 1);
    expect(merged).toContain('odawara');
    expect(merged).not.toContain('tokyo');
    expect(merged).not.toContain('start');
    expect(mergeRailNeighbors(board, undefined, 'tokyo', () => true)).toBe(board);
  });

  it('遠い町の人口と働き口が線路で届く。公害は届かない', () => {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'com', 0);
    // 小田原（東京から盤面で6マス）に住宅と工業
    s = place(s, 'odawara', 0, 'res', 1, 3);
    s = place(s, 'odawara', 1, 'res', 1, 3);
    s = place(s, 'odawara', 2, 'ind', 1, 3);
    expect(distancesFrom('tokyo').get('odawara')).toBeGreaterThan(2);
    const plain = computeAllStats(s).get('tokyo')!;
    const railed = computeAllStats(withRails(s, tokaido)).get('tokyo')!;
    expect(railed.popNear).toBeGreaterThan(plain.popNear);
    expect(railed.pollution).toBe(plain.pollution);
    // 小田原の側から見ても東京の働き口が届き、住宅の需要が変わる
    const oPlain = computeAllStats(s).get('odawara')!;
    const oRailed = computeAllStats(withRails(s, tokaido)).get('odawara')!;
    expect(oRailed.demand.r).toBeGreaterThan(oPlain.demand.r);
  });

  it('もともと近所の町とは、線路があっても重ねて数えない', () => {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'com', 0);
    s = place(s, 'yokohama', 0, 'res', 1, 3);
    expect(townNeighbors('tokyo')).toContain('yokohama');
    const plain = computeAllStats(s).get('tokyo')!;
    const railed = computeAllStats(withRails(s, { r_tokyo_yokohama: 0 })).get('tokyo')!;
    expect(railed.popNear).toBe(plain.popNear);
  });
});

describe('線路を考えた距離', () => {
  it('線路が無ければ盤面の距離と同じ', () => {
    const a = railDistancesFrom(undefined, 'tokyo');
    const b = distancesFrom('tokyo');
    for (const id of TOWN_IDS) expect(a.get(id)).toBe(b.get(id));
  });

  it('線路のマスは0歩で数える', () => {
    const d = railDistancesFrom({ r_tokyo_yokohama: 0, r_yokohama_kamakura: 0 }, 'tokyo');
    expect(d.get('yokohama')).toBe(1);
    expect(d.get('kamakura')).toBe(2);
    expect(distancesFrom('tokyo').get('kamakura')).toBe(4);
    expect(isRouteNode('r_tokyo_yokohama')).toBe(true);
    expect(isRouteNode('tokyo')).toBe(false);
  });
});

function cpu(over: Partial<Player> = {}): Player {
  return {
    id: 0, name: 'CPU', color: '#fff', currentNode: 'tokyo', money: 20000,
    equipment: createInitialEquipment(), caughtFish: [], score: 0, hasFinished: false, finishOrder: null,
    skipNextTurn: false, extraTurn: false, fishBonusMultiplier: 1, fishBonusTurnsLeft: 0,
    isCpu: true, cpuStyle: 'steady', ...over,
  };
}

describe('CPU と鉄道', () => {
  it('自分の町どうしを結ぶ安い線路は、お金に余裕があれば敷く値打ちがある', () => {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0);
    s = place(s, 'yokohama', 0, 'com', 0);
    const c = railCandidates(s, 'tokyo', 0, 30000, 'steady', 30);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].route).toBe('r_tokyo_yokohama');
    expect(c[0].value).toBeGreaterThan(0);
  });

  it('予備費を割るとき・敷けないときは候補にしない', () => {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0);
    s = place(s, 'yokohama', 0, 'com', 0);
    expect(railCandidates(s, 'tokyo', 0, 3000 + RAIL_CPU.extraReserve, 'steady', 30)).toEqual([]);
    expect(railCandidates(s, 'yokohama', 1, 1e6, 'steady', 30)).toEqual([]); // 自分の建物がない町
    const railed = withRails(s, { r_tokyo_yokohama: 1 });
    expect(railCandidates(railed, 'tokyo', 0, 1e6, 'steady', 30).map(x => x.route)).not.toContain('r_tokyo_yokohama');
  });

  it('何もない町へ高い航路を敷く値打ちはない', () => {
    const s = place(createInitialCityState(), 'tokyo', 0, 'res', 0);
    const sea = railCandidates({ ...s, destination: null }, 'tokyo', 0, 1e6, 'steady', 30).find(x => x.route === 'r_tokyo_chichibu');
    expect(sea === undefined || sea.value <= 0).toBe(true);
  });

  it('目的地への近道は値打ちが上がり、目的地型はさらに重く見る', () => {
    const s = { ...place(createInitialCityState(), 'yokohama', 0, 'res', 0), destination: 'odawara' };
    const toward = railPlanValue(s, 'yokohama', 'r_yokohama_kamakura', 0);
    const away = railPlanValue(s, 'yokohama', 'r_tokyo_yokohama', 0);
    expect(toward).toBeGreaterThan(away);
    expect(railPlanValue(s, 'yokohama', 'r_yokohama_kamakura', 0, true)).toBeGreaterThan(toward);
  });

  it('終盤は計画の値打ちを割り引く（元が取れない）', () => {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0);
    s = place(s, 'yokohama', 0, 'com', 0);
    const early = railCandidates(s, 'tokyo', 0, 30000, 'steady', 30)[0];
    const late = railCandidates(s, 'tokyo', 0, 30000, 'steady', 2).find(x => x.route === early.route);
    expect(late!.value).toBeLessThan(early.value);
  });

  it('道選び: 同じくらいの道なら、他人の線路を通って運賃を払う道は避ける', () => {
    setRandomSource(() => 0);
    const city = { ...createInitialCityState(), destination: null, rails: { r_tokyo_yokohama: 1 } as RailMap };
    // どちらも止まった先は線路のない中継マス（点数0）。片方は他人の線路（東京〜横浜）を通る
    const viaRail = ['tokyo', 'r_tokyo_yokohama', 'yokohama', 'r_yokohama_kamakura'];
    const plain = ['tokyo', 'r_nikko_tokyo'];
    const idx = chooseCpuPath({ paths: [viaRail, plain], mode: 'city', player: cpu(), playerIndex: 0, city, turn: 1, maxTurns: 36, goalClaims: [] });
    expect(idx).toBe(1);
    // 自分の線路なら運賃はかからない
    const own = { ...city, rails: { r_tokyo_yokohama: 0 } as RailMap };
    const idx2 = chooseCpuPath({ paths: [plain, viaRail], mode: 'city', player: cpu(), playerIndex: 0, city: own, turn: 1, maxTurns: 36, goalClaims: [] });
    expect(idx2).toBe(0);
  });

  it('道選び: 線路で目的地に近いマスを高く見る', () => {
    setRandomSource(() => 0);
    // 目的地は小田原。東海道に線路があると、横浜は（線路を考えた距離で）小田原にずっと近い
    const city = { ...createInitialCityState(), destination: 'odawara', destinationReward: 5000, rails: Object.fromEntries(TOKAIDO.map(r => [r, 1])) as RailMap };
    const d = railDistancesFrom(city.rails, 'odawara');
    expect(d.get('yokohama')!).toBeLessThan(distancesFrom('odawara').get('yokohama')!);
    const toYokohama = ['tokyo', 'r_tokyo_yokohama', 'yokohama'];
    const toNikko = ['tokyo', 'r_nikko_tokyo', 'nikko'];
    const idx = chooseCpuPath({ paths: [toNikko, toYokohama], mode: 'city', player: cpu({ cpuStyle: 'racer' }), playerIndex: 0, city, turn: 1, maxTurns: 36, goalClaims: [] });
    expect(idx).toBe(1);
  });
});
