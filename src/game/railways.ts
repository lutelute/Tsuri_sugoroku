// まちづくりモードの鉄道（⑮）。中継マスに線路を敷くと、歩数を使わずに通り抜けられ、つながった町どうしが近所になる。
// React / ストアに依存しない純粋関数だけで構成する。状態は CityState.rails（中継マス → 持ち主）。
//
// ルール:
//  - 自分の建物がある町に隣り合う中継マスに、工事1回で線路を敷ける。値段は中継マスの地形（routeTheme）で決まる。
//  - 線路のある中継マスは歩数を使わずに通り抜け、そこには止まれない（getReachableNodes の passThrough）。
//  - 線路でつながった町どうしは RAIL_ECONOMY.linkSegments 区間先まで近所として、人口と働き口を分け合う。公害は伝わらない。
//  - 他人の線路を通ると、1区間ごとに運賃を持ち主へ払う。維持費は1区間につき毎月。
//
// city.ts がこのファイルを読み込むので、ここでは city.ts から値を読み込まない（型だけ）。循環参照を避けるため。
import type { CityActionResult, CityState } from './city';
import type { RouteTheme } from './types';
import { NODE_MAP } from '../data/boardNodes';
import { buildAdjacencyList } from '../data/boardEdges';

/** 線路のある中継マス → 持ち主（プレイヤー index） */
export type RailMap = Record<string, number>;

/**
 * 鉄道の数値。難易度調整係が balance.city.sim.test.ts（36か月・4人）で測って決めた。既存の CITY_ECONOMY とは分けて置く。
 *
 * 測って分かったこと: 盤面が広く（中継マス128）、1区間を他の人が通るのは月に0.13回ほどしかない。
 * 叩き台（運賃100・維持費40・資産5割）では1区間が毎月¥20の赤字で、線路を敷くほど負けた（鉄道王の勝率 0.6%）。
 * 線路は「儲けの柱」ではなく「損をしない便利な資産」に置く: 敷いた値段はそのまま資産に残り、運賃が維持費を上回る
 * （1区間で月に¥50ほどの黒字＝値段の1%強）。値段の全額を運賃で取り戻すことはまずない（建物の月収は値段の8%ほど）。
 * 線路ばかり敷く鉄道王は勝率 9%（帯 8〜45% の下の端）。建物に回すお金が減るぶんだけ弱い。
 */
export const RAIL_ECONOMY = {
  /** 地形ごとの線路の値段（街道・川 / 峠 / 海路=船の航路） */
  price: { town: 3000, river: 3000, mountain: 4500, sea: 6000 } as Record<RouteTheme, number>,
  /** 地形の決まっていない中継マス（ジグザグ盤など） */
  defaultPrice: 3000,
  /** 他人の線路を1区間通るたびに持ち主へ払う運賃（町の買い物代と同じくらいの重さ。100 では維持費も出なかった） */
  fare: 550,
  /** 1回の移動で払う運賃の上限（所持金に対する割合。町の買い物代と同じ） */
  fareMaxRate: 0.25,
  /** 1区間の毎月の維持費（運賃の見込み 月¥65〜80 の3割ほど） */
  upkeep: 20,
  /** 線路で何区間先の町まで近所として扱うか */
  linkSegments: 3,
  /**
   * 資産として数える割合（敷いた値段に対して。総資産・最終得点に入る）。建物・名産と同じ10割。
   * 画面に出ない数字なので、5割や8割だと「線路を敷いたら総資産が減った」という見えない損になる（8割で鉄道王の勝率 7%、10割で 9%）
   */
  assetRate: 1,
};

/** 地形の呼び名（町の画面・遊び方で使う） */
export const RAIL_THEME_LABEL: Record<RouteTheme, string> = {
  town: '街道',
  river: '川沿い',
  mountain: '峠',
  sea: '航路',
};

const ADJ = buildAdjacencyList();
const EMPTY: RailMap = {};

// ===== 盤面 =====

export function isRouteNode(nodeId: string): boolean {
  return NODE_MAP.get(nodeId)?.type === 'route';
}

/** 中継マスの地形（無ければ null） */
export function routeThemeOf(routeId: string): RouteTheme | null {
  return NODE_MAP.get(routeId)?.routeTheme ?? null;
}

/** 線路の値段 */
export function railPrice(routeId: string): number {
  const t = routeThemeOf(routeId);
  return t ? RAIL_ECONOMY.price[t] : RAIL_ECONOMY.defaultPrice;
}

/** 地形の呼び名（地形がなければ「道」） */
export function railThemeLabel(routeId: string): string {
  const t = routeThemeOf(routeId);
  return t ? RAIL_THEME_LABEL[t] : '道';
}

/** 中継マスの両端（盤面の隣） */
export function routeEnds(routeId: string): string[] {
  return ADJ.get(routeId) ?? [];
}

/** 線路の敷かれた中継マスの集合（経路探索の passThrough に渡す） */
export function railPassSet(rails: RailMap | undefined): Set<string> {
  return new Set(Object.keys(rails ?? EMPTY));
}

/** その人の線路の区間数 */
export function railCount(rails: RailMap | undefined, playerIndex: number): number {
  let n = 0;
  for (const owner of Object.values(rails ?? EMPTY)) if (owner === playerIndex) n++;
  return n;
}

// ===== 敷く =====

export interface RailOption {
  routeId: string;
  /** 中継マスの名前（例: 東京〜横浜） */
  name: string;
  /** 中継マスの向こう側のマス */
  otherEnd: string | null;
  theme: RouteTheme | null;
  price: number;
  /** すでに敷かれていれば持ち主 */
  owner: number | null;
  /** 敷けない理由（敷けるなら null） */
  reason: string | null;
}

function ownsBuildingIn(state: CityState, townId: string, playerIndex: number): boolean {
  return !!state.towns[townId]?.plots.some(p => p && p.owner === playerIndex);
}

/** 線路を敷けるか。敷けなければ理由を返す */
export function canLayRail(state: CityState, townId: string, routeId: string, playerIndex: number, money: number): string | null {
  if (!state.towns[townId]) return 'ここは町ではない';
  if (!isRouteNode(routeId) || !routeEnds(townId).includes(routeId)) return 'この町に隣り合う中継マスではない';
  if (!ownsBuildingIn(state, townId, playerIndex)) return '自分の建物がある町でだけ敷ける';
  const owner = state.rails?.[routeId];
  if (owner !== undefined) return owner === playerIndex ? 'もう自分の線路がある' : 'もう他の人の線路がある';
  if (money < railPrice(routeId)) return 'お金が足りない';
  return null;
}

/** 町に隣り合う中継マスの一覧（敷ける・敷けないにかかわらず）。町の画面で使う */
export function railOptions(state: CityState, townId: string, playerIndex: number, money: number): RailOption[] {
  return routeEnds(townId)
    .filter(isRouteNode)
    .map(routeId => {
      const owner = state.rails?.[routeId];
      return {
        routeId,
        name: NODE_MAP.get(routeId)?.name ?? routeId,
        otherEnd: routeEnds(routeId).find(id => id !== townId) ?? null,
        theme: routeThemeOf(routeId),
        price: railPrice(routeId),
        owner: owner ?? null,
        reason: canLayRail(state, townId, routeId, playerIndex, money),
      };
    });
}

/** 線路を敷く（工事1回。回数の数え方はストアが決める） */
export function layRail(state: CityState, townId: string, routeId: string, playerIndex: number, money: number): CityActionResult {
  const err = canLayRail(state, townId, routeId, playerIndex, money);
  if (err) return { ok: false, reason: err };
  const cost = railPrice(routeId);
  const name = NODE_MAP.get(routeId)?.name ?? '中継マス';
  const sea = routeThemeOf(routeId) === 'sea';
  return {
    ok: true,
    state: { ...state, rails: { ...(state.rails ?? EMPTY), [routeId]: playerIndex } },
    cost,
    message: sea ? `${name}に船の航路を開いた` : `${name}に線路を敷いた`,
  };
}

// ===== 移動 =====

/**
 * 経路のうち、他人の線路を通った分の運賃（1区間ごと）。1回の移動で払うのは所持金の fareMaxRate まで。
 * 出発地と終点は数えない（線路には止まれないので、終点が線路になることはない）。
 */
export function railFares(rails: RailMap | undefined, path: string[], moverIndex: number, moverMoney = Infinity): { payments: { owner: number; amount: number }[]; total: number } {
  if (!rails || path.length < 3) return { payments: [], total: 0 };
  const byOwner = new Map<number, number>();
  // 払うのは所持金の fareMaxRate まで（運賃で一気に文無しにしない）
  let left = Number.isFinite(moverMoney) ? Math.floor(Math.max(0, moverMoney) * RAIL_ECONOMY.fareMaxRate) : Infinity;
  for (const id of path.slice(1, -1)) {
    const owner = rails[id];
    if (owner === undefined || owner === moverIndex || left <= 0) continue;
    const pay = Math.min(left, RAIL_ECONOMY.fare);
    left -= pay;
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + pay);
  }
  const payments = [...byOwner.entries()].map(([owner, amount]) => ({ owner, amount }));
  return { payments, total: payments.reduce((s, p) => s + p.amount, 0) };
}

/** 経路のうち、サイコロの歩数に数えるマスの数（線路は数えない） */
export function countedSteps(path: string[], rails: RailMap | undefined): number {
  return path.slice(1).filter(id => rails?.[id] === undefined).length;
}

const DIST_CACHE = new WeakMap<RailMap, Map<string, Map<string, number>>>();

/**
 * 線路を考えた「歩数の」距離（線路のマスに入るのは0歩、ほかは1歩）。0-1 BFS。
 * 線路が無ければ盤面の距離（city.distancesFrom）と同じ。CPU の道選びで目的地までの近さに使う。
 */
export function railDistancesFrom(rails: RailMap | undefined, from: string): Map<string, number> {
  const key = rails ?? EMPTY;
  let byFrom = DIST_CACHE.get(key);
  if (!byFrom) {
    byFrom = new Map();
    DIST_CACHE.set(key, byFrom);
  }
  const cached = byFrom.get(from);
  if (cached) return cached;

  const dist = new Map<string, number>([[from, 0]]);
  const deque: string[] = [from];
  while (deque.length) {
    const cur = deque.shift()!;
    const d = dist.get(cur)!;
    for (const nb of ADJ.get(cur) ?? []) {
      const w = key[nb] !== undefined ? 0 : 1;
      const nd = d + w;
      if (nd < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, nd);
        if (w === 0) deque.unshift(nb);
        else deque.push(nb);
      }
    }
  }
  byFrom.set(from, dist);
  return dist;
}

// ===== 近所（人口と働き口を分け合う町） =====

/**
 * 線路でつながったマスと区間数（maxSegments 以内。自分は含めない）。
 * 線路のある中継マスを1区間として数え、線路のない中継マスは通れない。中継マス以外のマス（町・スタート等）を返す。
 */
export function railLinkedNodes(rails: RailMap | undefined, fromNode: string, maxSegments = RAIL_ECONOMY.linkSegments): Map<string, number> {
  const out = new Map<string, number>();
  if (!rails || maxSegments <= 0) return out;
  const seg = new Map<string, number>([[fromNode, 0]]);
  const deque: string[] = [fromNode];
  while (deque.length) {
    const cur = deque.shift()!;
    const d = seg.get(cur)!;
    for (const nb of ADJ.get(cur) ?? []) {
      let nd: number;
      if (isRouteNode(nb)) {
        if (rails[nb] === undefined) continue; // 線路のない中継マスは通れない
        nd = d + 1;
      } else {
        // 町などへは、線路の中継マスからしか入らない（隣の町へ直接つながる道は線路ではない）
        if (!isRouteNode(cur)) continue;
        nd = d;
      }
      if (nd > maxSegments || nd >= (seg.get(nb) ?? Infinity)) continue;
      seg.set(nb, nd);
      if (nd === d) deque.unshift(nb);
      else deque.push(nb);
    }
  }
  for (const [id, d] of seg) if (id !== fromNode && !isRouteNode(id)) out.set(id, d);
  return out;
}

const LINK_CACHE = new WeakMap<RailMap, Map<string, string[]>>();

/**
 * 町ごとの「線路でつながった近所」（maxSegments 以内）。線路が1本もなければ空。
 * rails は書き換えずに作り直す前提なので、同じ rails には計算結果を使い回す。
 */
export function railNeighborMap(rails: RailMap | undefined): Map<string, string[]> {
  if (!rails || Object.keys(rails).length === 0) return new Map();
  const cached = LINK_CACHE.get(rails);
  if (cached) return cached;
  const map = new Map<string, string[]>();
  const starts = new Set<string>();
  for (const routeId of Object.keys(rails)) for (const end of routeEnds(routeId)) if (!isRouteNode(end)) starts.add(end);
  for (const id of starts) {
    const linked = [...railLinkedNodes(rails, id).keys()];
    if (linked.length) map.set(id, linked);
  }
  LINK_CACHE.set(rails, map);
  return map;
}

/**
 * 町の近所（盤面で近い町 + 線路でつながった町）。人口と働き口の分け合いに使う。公害には使わない。
 * boardNeighbors は city.townNeighbors の結果。isTown は町かどうか（スタート・ゴールを除く）。
 */
export function mergeRailNeighbors(boardNeighbors: string[], railNear: string[] | undefined, self: string, isTown: (id: string) => boolean): string[] {
  if (!railNear || railNear.length === 0) return boardNeighbors;
  const set = new Set(boardNeighbors);
  const out = [...boardNeighbors];
  for (const id of railNear) {
    if (id === self || set.has(id) || !isTown(id)) continue;
    set.add(id);
    out.push(id);
  }
  return out;
}

// ===== 月末 =====

/** プレイヤーごとの線路の維持費（毎月） */
export function railUpkeep(rails: RailMap | undefined, playerCount: number): number[] {
  const out = Array.from({ length: playerCount }, () => 0);
  for (const owner of Object.values(rails ?? EMPTY)) if (owner >= 0 && owner < playerCount) out[owner] += RAIL_ECONOMY.upkeep;
  return out;
}

/** 線路の資産価値（敷いた値段 × assetRate の合計） */
export function playerRailValue(rails: RailMap | undefined, playerIndex: number): number {
  let v = 0;
  for (const [routeId, owner] of Object.entries(rails ?? EMPTY)) if (owner === playerIndex) v += Math.round(railPrice(routeId) * RAIL_ECONOMY.assetRate);
  return v;
}

// ===== CPU =====

/**
 * CPU が線路を敷くときの見込み（難易度調整係が balance.city.sim.test.ts で調整）。
 * 目安: 4人戦の6割ほどの局で誰かが敷き、CPU は1局に1〜2区間（自分の建物がある町どうしを結ぶ）。敷きすぎると建物に回すお金が減って弱くなる。
 */
export const RAIL_CPU = {
  /** 敷いた後にも、予備費に加えてこれだけは残す */
  extraReserve: 3000,
  /** 値段の重み（値段がそのまま資産に残るので、建物と同じ 0.55） */
  costWeight: 0.55,
  /** 新しくつながる「自分の建物がある町」1つあたりの得（行き来のたびに歩数が浮く。盤面で近所の町でも数える） */
  linkMine: 3000,
  /** 新しくつながる「他人の建物だけがある町」1つあたりの得（人口と働き口が増える） */
  linkOther: 400,
  /** どこへでも少し速く動ける得と、他の人が通って入る運賃の見込み（運賃500 × 月0.13回 × 18か月 ≒ 1,200 を含む） */
  mobility: 1300,
  /** 目的地まで1歩近くなるごとの得（目的地型はその倍） */
  shortcutStep: 550,
};

/**
 * CPU 用: この線路を敷く「計画としての値打ち」（収入の増減は含めない。cpuAI が playerMonthlyIncome で別に数える）。
 * 新しく線路でつながる町（自分の建物がある町は大きく）と、今の目的地への近道を足す。
 */
export function railPlanValue(state: CityState, townId: string, routeId: string, playerIndex: number, racer = false): number {
  const nextRails: RailMap = { ...(state.rails ?? EMPTY), [routeId]: playerIndex };
  const before = railLinkedNodes(state.rails, townId);
  const after = railLinkedNodes(nextRails, townId);
  let v = RAIL_CPU.mobility;
  for (const id of after.keys()) {
    if (before.has(id)) continue;
    const plots = state.towns[id]?.plots ?? [];
    if (plots.some(p => p && p.owner === playerIndex)) v += RAIL_CPU.linkMine;
    else if (plots.some(Boolean)) v += RAIL_CPU.linkOther;
  }
  if (state.destination) {
    const d0 = railDistancesFrom(state.rails, state.destination).get(townId);
    const d1 = railDistancesFrom(nextRails, state.destination).get(townId);
    if (d0 !== undefined && d1 !== undefined && d1 < d0) v += (d0 - d1) * RAIL_CPU.shortcutStep * (racer ? 2 : 1);
  }
  return v;
}
