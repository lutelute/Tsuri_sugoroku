// まちづくりすごろく（SimCity 風モード）のゲームロジック。
// React / ストアに依存しない純粋関数だけで構成し、Vitest で検証する。
//
// 仕組みの要点:
//  - 盤面の「町」マス（中継・スタート・ゴール以外）に区画(plot)があり、止まったプレイヤーが建物を建てる。
//  - 住宅(R)・商業(C)・工業(I) のバランス、電力、公害、公園・観光による幸福度で、町は毎月「自然に」成長/衰退する。
//  - 月末に建物の持ち主へ税収・売上が入る。発電所は周囲の町へ送電し、送電料を得る。
//  - 地震・台風などの災害が町を壊す。目的地へ一番乗りすると賞金。
import type { BoardNode, NodeType, Region } from './types';
import { BOARD_NODES, NODE_MAP } from '../data/boardNodes';
import { buildAdjacencyList } from '../data/boardEdges';
import { random } from '../utils/random';

// ===== 型 =====

export type BuildingKind = 'res' | 'com' | 'ind' | 'park' | 'power' | 'port' | 'tourism';
export type TownClass = 'metro' | 'city' | 'port' | 'onsen' | 'market' | 'village';

export interface Plot {
  kind: BuildingKind;
  level: number; // 1..3（住宅/商業/工業/観光は自然成長する）
  owner: number; // プレイヤー index
  builtTurn: number;
}

export interface TownState {
  plots: (Plot | null)[];
}

export interface CityBuff {
  playerIndex: number;
  kind: 'boom' | 'recession';
  roundsLeft: number;
}

export interface CityHistoryPoint {
  turn: number;
  assets: number[];
  population: number[];
}

export interface CityDamage {
  nodeId: string;
  kind: BuildingKind;
  owner: number;
  destroyed: boolean; // true: 全壊 / false: 1段階ダウン
}

export interface CityDisasterReport {
  kind: DisasterKind;
  title: string;
  area: string;
  damages: CityDamage[];
}

export interface CityPlayerReport {
  income: number;
  upkeep: number;
  net: number;
  population: number;
  populationDelta: number;
  grown: number;
  declined: number;
}

export interface CityReport {
  turn: number; // 集計したラウンド
  players: CityPlayerReport[];
  disasters: CityDisasterReport[];
  headlines: string[];
}

export interface CityState {
  towns: Record<string, TownState>;
  destination: string | null;
  destinationReward: number;
  buffs: CityBuff[];
  history: CityHistoryPoint[];
}

export type DisasterKind = 'quake' | 'typhoon' | 'fire' | 'kaiju';

// ===== 定数 =====

export const CITY_INITIAL_MONEY = 12000;
export const CITY_START_NODE = 'tokyo';
export const CITY_ACTIONS_PER_VISIT = 2;
export const CITY_DEFAULT_MONTHS = 36;
export const CITY_GOAL_BONUS = 5000;
export const MAX_BUILDING_LEVEL = 3;
/** 送電の届く距離（盤面のマス数。中継マスを含む） */
export const POWER_RANGE = 6;
/** 近隣の町とみなす距離（隣の町 = 中継マスを1つ挟んで2） */
export const NEIGHBOR_RANGE = 2;

export const BUILDING_INFO: Record<BuildingKind, { name: string; short: string; cost: number; desc: string; color: string }> = {
  res: { name: '住宅地', short: '住', cost: 2000, desc: '人が住む。雇用と幸福度が高いと自然に発展し、税収が増える', color: '#4f9d5d' },
  com: { name: '商業地', short: '商', cost: 3000, desc: '近くの人口が多いほど売上UP。電力が必要', color: '#3d7fc4' },
  ind: { name: '工業地', short: '工', cost: 3500, desc: '雇用と大きな売上を生むが公害を出す。電力が必要', color: '#c99a2e' },
  park: { name: '公園', short: '園', cost: 1500, desc: '幸福度UP・公害を吸収。維持費 ¥60/月', color: '#7cc36b' },
  power: { name: '発電所', short: '電', cost: 9000, desc: `周囲${POWER_RANGE}マスの町へ送電し、送電料を得る。維持費 ¥250/月`, color: '#e0c341' },
  port: { name: '漁港', short: '港', cost: 5000, desc: 'この町で誰かが釣るたび水揚げ手数料。商業も活気づく', color: '#4fb0c6' },
  tourism: { name: '観光名所', short: '観', cost: 6000, desc: '幸福度が高いほど観光収入UP。人気が出ると発展する', color: '#d9628a' },
};

export const TOWN_CLASS_INFO: Record<TownClass, { name: string; plots: number; landValue: number; allowed: BuildingKind[] }> = {
  metro: { name: '大都市', plots: 8, landValue: 2.0, allowed: ['res', 'com', 'ind', 'park', 'power', 'tourism'] },
  city: { name: '都市', plots: 6, landValue: 1.5, allowed: ['res', 'com', 'ind', 'park', 'power', 'tourism'] },
  port: { name: '港町', plots: 4, landValue: 1.1, allowed: ['res', 'com', 'ind', 'park', 'port'] },
  onsen: { name: '温泉町', plots: 4, landValue: 1.1, allowed: ['res', 'com', 'park', 'tourism'] },
  market: { name: '商都', plots: 5, landValue: 1.3, allowed: ['res', 'com', 'ind', 'park', 'power'] },
  village: { name: '村', plots: 3, landValue: 0.8, allowed: ['res', 'ind', 'park', 'power'] },
};

const METRO = new Set(['tokyo', 'osaka', 'nagoya']);
const TOWN_TYPES: Set<NodeType> = new Set(['capital', 'fishing', 'fishing_special', 'shop', 'rest', 'event_good', 'event_bad', 'event_random']);

// ===== 町の静的情報 =====

export function isTown(node: BoardNode | undefined): node is BoardNode {
  return !!node && TOWN_TYPES.has(node.type);
}

export function townClassOf(node: BoardNode): TownClass {
  if (METRO.has(node.id)) return 'metro';
  switch (node.type) {
    case 'capital': return 'city';
    case 'fishing':
    case 'fishing_special': return 'port';
    case 'rest': return 'onsen';
    case 'shop': return 'market';
    default: return 'village';
  }
}

export interface TownInfo {
  id: string;
  name: string;
  region: Region;
  cls: TownClass;
  plots: number;
  landValue: number;
  allowed: BuildingKind[];
}

export const TOWN_IDS: string[] = BOARD_NODES.filter(isTown).map(n => n.id);

const TOWN_INFO_CACHE = new Map<string, TownInfo>();
export function getTownInfo(nodeId: string): TownInfo | null {
  const cached = TOWN_INFO_CACHE.get(nodeId);
  if (cached) return cached;
  const node = NODE_MAP.get(nodeId);
  if (!isTown(node)) return null;
  const cls = townClassOf(node);
  const ci = TOWN_CLASS_INFO[cls];
  const info: TownInfo = { id: node.id, name: node.name, region: node.region, cls, plots: ci.plots, landValue: ci.landValue, allowed: ci.allowed };
  TOWN_INFO_CACHE.set(nodeId, info);
  return info;
}

// ===== グラフ距離 =====

const ADJ = buildAdjacencyList();

/** nodeId から maxDist 以内の全ノードまでの距離（BFS） */
export function distancesFrom(nodeId: string, maxDist = Infinity): Map<string, number> {
  const dist = new Map<string, number>([[nodeId, 0]]);
  const q = [nodeId];
  while (q.length) {
    const cur = q.shift()!;
    const d = dist.get(cur)!;
    if (d >= maxDist) continue;
    for (const nb of ADJ.get(cur) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        q.push(nb);
      }
    }
  }
  return dist;
}

const NEIGHBOR_CACHE = new Map<string, string[]>();
/** 近隣の町（自分を除く） */
export function townNeighbors(nodeId: string): string[] {
  const c = NEIGHBOR_CACHE.get(nodeId);
  if (c) return c;
  const res = [...distancesFrom(nodeId, NEIGHBOR_RANGE).keys()].filter(id => id !== nodeId && getTownInfo(id));
  NEIGHBOR_CACHE.set(nodeId, res);
  return res;
}

// ===== 初期化 =====

export function createInitialCityState(): CityState {
  const towns: Record<string, TownState> = {};
  for (const id of TOWN_IDS) {
    const info = getTownInfo(id)!;
    towns[id] = { plots: Array.from({ length: info.plots }, () => null) };
  }
  const destination = pickDestination(null, CITY_START_NODE);
  return {
    towns,
    destination: destination.nodeId,
    destinationReward: destination.reward,
    buffs: [],
    history: [],
  };
}

// ===== 費用・価値 =====

export function buildCost(kind: BuildingKind, nodeId: string): number {
  const info = getTownInfo(nodeId);
  const lv = info?.landValue ?? 1;
  return Math.round((BUILDING_INFO[kind].cost * lv) / 100) * 100;
}

/** 建物の資産価値 */
export function plotValue(plot: Plot, nodeId: string): number {
  const base = buildCost(plot.kind, nodeId);
  return Math.round(base * (1 + 0.6 * (plot.level - 1)));
}

export function upgradeCost(plot: Plot, nodeId: string): number {
  return Math.round((buildCost(plot.kind, nodeId) * 0.8 * plot.level) / 100) * 100;
}

export function acquireCost(plot: Plot, nodeId: string): number {
  return Math.round((plotValue(plot, nodeId) * 1.5) / 100) * 100;
}

/** 等級を上げられる建物か（公園・発電所・漁港は1段階のみ） */
export function isUpgradable(kind: BuildingKind): boolean {
  return kind === 'res' || kind === 'com' || kind === 'ind' || kind === 'tourism';
}

// ===== 建設・再開発・買収 =====

export type CityActionResult = { ok: true; state: CityState; cost: number; message: string } | { ok: false; reason: string };

function withTown(state: CityState, nodeId: string, plots: (Plot | null)[]): CityState {
  return { ...state, towns: { ...state.towns, [nodeId]: { plots } } };
}

export function canBuild(state: CityState, nodeId: string, kind: BuildingKind, plotIndex: number, money: number): string | null {
  const info = getTownInfo(nodeId);
  const town = state.towns[nodeId];
  if (!info || !town) return 'ここには建てられない';
  if (!info.allowed.includes(kind)) return `${info.name}（${TOWN_CLASS_INFO[info.cls].name}）には${BUILDING_INFO[kind].name}を建てられない`;
  if (plotIndex < 0 || plotIndex >= town.plots.length) return '区画がない';
  if (town.plots[plotIndex]) return 'その区画は使用中';
  if ((kind === 'power' || kind === 'port') && town.plots.some(p => p?.kind === kind)) return `${BUILDING_INFO[kind].name}は1つの町に1つまで`;
  if (money < buildCost(kind, nodeId)) return 'お金が足りない';
  return null;
}

export function build(state: CityState, nodeId: string, plotIndex: number, kind: BuildingKind, playerIndex: number, money: number, turn: number): CityActionResult {
  const err = canBuild(state, nodeId, kind, plotIndex, money);
  if (err) return { ok: false, reason: err };
  const cost = buildCost(kind, nodeId);
  const plots = [...state.towns[nodeId].plots];
  plots[plotIndex] = { kind, level: 1, owner: playerIndex, builtTurn: turn };
  const info = getTownInfo(nodeId)!;
  return { ok: true, state: withTown(state, nodeId, plots), cost, message: `${info.name}に${BUILDING_INFO[kind].name}を建てた` };
}

export function upgrade(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number): CityActionResult {
  const town = state.towns[nodeId];
  const plot = town?.plots[plotIndex];
  if (!plot) return { ok: false, reason: '建物がない' };
  if (plot.owner !== playerIndex) return { ok: false, reason: '自分の建物ではない' };
  if (!isUpgradable(plot.kind)) return { ok: false, reason: 'この建物は再開発できない' };
  if (plot.level >= MAX_BUILDING_LEVEL) return { ok: false, reason: 'すでに最高等級' };
  const cost = upgradeCost(plot, nodeId);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };
  const plots = [...town.plots];
  plots[plotIndex] = { ...plot, level: plot.level + 1 };
  return { ok: true, state: withTown(state, nodeId, plots), cost, message: `${BUILDING_INFO[plot.kind].name}を再開発（等級${plot.level + 1}）` };
}

export function acquire(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number): CityActionResult & { prevOwner?: number } {
  const town = state.towns[nodeId];
  const plot = town?.plots[plotIndex];
  if (!plot) return { ok: false, reason: '建物がない' };
  if (plot.owner === playerIndex) return { ok: false, reason: 'すでに自分の建物' };
  const cost = acquireCost(plot, nodeId);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };
  const plots = [...town.plots];
  plots[plotIndex] = { ...plot, owner: playerIndex };
  return { ok: true, state: withTown(state, nodeId, plots), cost, prevOwner: plot.owner, message: `${BUILDING_INFO[plot.kind].name}を買収した` };
}

// ===== 町の状態計算 =====

export interface TownStats {
  population: number;
  jobs: number;
  pollution: number;
  happiness: number;
  powered: boolean;
  demand: { r: number; c: number; i: number };
  /** 近隣を含む人口（商業の客・工業の働き手） */
  popNear: number;
}

function sumLevel(plots: (Plot | null)[], kind: BuildingKind): number {
  let s = 0;
  for (const p of plots) if (p?.kind === kind) s += p.level;
  return s;
}
function countKind(plots: (Plot | null)[], kind: BuildingKind): number {
  let s = 0;
  for (const p of plots) if (p?.kind === kind) s++;
  return s;
}

/** 発電所から送電が届いている町 */
export function computePowered(state: CityState): Set<string> {
  const powered = new Set<string>();
  for (const [id, town] of Object.entries(state.towns)) {
    if (!town.plots.some(p => p?.kind === 'power')) continue;
    for (const [nid, d] of distancesFrom(id, POWER_RANGE)) {
      if (d <= POWER_RANGE) powered.add(nid);
    }
  }
  return powered;
}

export function computeAllStats(state: CityState): Map<string, TownStats> {
  const powered = computePowered(state);
  // 1. 町ごとの素の値
  const base = new Map<string, { R: number; C: number; I: number; P: number; T: number; port: boolean; cls: TownClass }>();
  for (const [id, town] of Object.entries(state.towns)) {
    const info = getTownInfo(id);
    if (!info) continue;
    base.set(id, {
      R: sumLevel(town.plots, 'res'),
      C: sumLevel(town.plots, 'com'),
      I: sumLevel(town.plots, 'ind'),
      P: countKind(town.plots, 'park'),
      T: sumLevel(town.plots, 'tourism'),
      port: town.plots.some(p => p?.kind === 'port'),
      cls: info.cls,
    });
  }
  // 2. 公害（自町 + 近隣からの流入）
  const pollution = new Map<string, number>();
  for (const [id, b] of base) {
    let pol = b.I * 3 - b.P * 2;
    for (const nb of townNeighbors(id)) {
      const nbb = base.get(nb);
      if (nbb) pol += nbb.I * 1.2;
    }
    pollution.set(id, Math.max(0, Math.round(pol * 10) / 10));
  }
  // 3. 幸福度・人口
  const pop = new Map<string, number>();
  const hap = new Map<string, number>();
  for (const [id, b] of base) {
    const isPowered = powered.has(id);
    const h = 5 + b.P * 3 + b.T + (b.cls === 'onsen' ? 2 : 0) - (pollution.get(id) ?? 0) - (isPowered ? 0 : 3);
    hap.set(id, Math.round(h * 10) / 10);
    const factor = Math.max(0.3, Math.min(1.5, 0.6 + h * 0.06)) * (isPowered ? 1 : 0.7);
    pop.set(id, Math.round(b.R * 100 * factor));
  }
  // 4. 需要（RCI）
  const out = new Map<string, TownStats>();
  for (const [id, b] of base) {
    const isPowered = powered.has(id);
    let popNear = pop.get(id) ?? 0;
    let jobsNear = b.C * 50 + b.I * 80 + b.T * 30;
    for (const nb of townNeighbors(id)) {
      const nbb = base.get(nb);
      popNear += (pop.get(nb) ?? 0) * 0.5;
      if (nbb) jobsNear += (nbb.C * 50 + nbb.I * 80 + nbb.T * 30) * 0.5;
    }
    const h = hap.get(id) ?? 0;
    const r = (jobsNear - popNear * 0.6) / 100 + (h - 4) * 0.12 + 0.4;
    const c = (popNear * 0.45 - b.C * 60) / 100 + (b.port ? 0.4 : 0) + (isPowered ? 0 : -1.5);
    const i = (popNear * 0.35 - b.I * 70) / 100 + 0.6 + (isPowered ? 0 : -1.5);
    out.set(id, {
      population: pop.get(id) ?? 0,
      jobs: b.C * 50 + b.I * 80 + b.T * 30,
      pollution: pollution.get(id) ?? 0,
      happiness: h,
      powered: isPowered,
      demand: { r: round1(r), c: round1(c), i: round1(i) },
      popNear: Math.round(popNear),
    });
  }
  return out;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// ===== 収入 =====

/** 1つの建物の月収（維持費はマイナス） */
export function plotIncome(plot: Plot, nodeId: string, stats: TownStats, poweredTownsWithBuildings: number): number {
  const info = getTownInfo(nodeId);
  const lv = info?.landValue ?? 1;
  const powerK = stats.powered ? 1 : 0;
  switch (plot.kind) {
    case 'res': {
      const k = Math.max(0.3, Math.min(1.5, 0.6 + stats.happiness * 0.06)) * (stats.powered ? 1 : 0.7);
      return Math.round(110 * plot.level * lv * k);
    }
    case 'com': {
      const customers = Math.min(1.3, stats.popNear / Math.max(1, 60 * plot.level * 2));
      return Math.round(170 * plot.level * lv * (0.3 + customers) * (powerK ? 1 : 0.3));
    }
    case 'ind': {
      const workers = Math.min(1.2, (stats.popNear + 60) / Math.max(1, 70 * plot.level * 2));
      return Math.round(210 * plot.level * lv * (0.4 + workers * 0.6) * (powerK ? 1 : 0.2));
    }
    case 'tourism':
      return Math.round(260 * plot.level * Math.max(0.4, 0.6 + stats.happiness * 0.06));
    case 'power':
      return Math.min(12, poweredTownsWithBuildings) * 90 - 250;
    case 'port':
      return 180;
    case 'park':
      return -60;
  }
}

/** 発電所のある町から送電している「建物のある町」の数（送電料の基準） */
export function poweredTownsWithBuildings(state: CityState, powerTown: string): number {
  let n = 0;
  for (const [nid, d] of distancesFrom(powerTown, POWER_RANGE)) {
    if (d <= POWER_RANGE && state.towns[nid]?.plots.some(p => p && p.kind !== 'power')) n++;
  }
  return n;
}

// ===== 月末シミュレーション =====

export interface SimulationResult {
  state: CityState;
  report: CityReport;
  incomes: number[]; // プレイヤーごとの純収支（ストアでお金に加算する）
}

export function playerPopulation(state: CityState, playerIndex: number, stats = computeAllStats(state)): number {
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const R = sumLevel(town.plots, 'res');
    if (R === 0) continue;
    const mine = town.plots.reduce((acc, p) => acc + (p?.kind === 'res' && p.owner === playerIndex ? p.level : 0), 0);
    total += Math.round((s.population * mine) / R);
  }
  return total;
}

export function playerPropertyValue(state: CityState, playerIndex: number): number {
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    for (const p of town.plots) if (p && p.owner === playerIndex) total += plotValue(p, id);
  }
  return total;
}

/** 所有する建物の数 */
export function playerBuildingCount(state: CityState, playerIndex: number): number {
  let n = 0;
  for (const town of Object.values(state.towns)) for (const p of town.plots) if (p && p.owner === playerIndex) n++;
  return n;
}

/** 町の全区画を1人で埋めている（独占） */
export function monopolyOwner(town: TownState): number | null {
  if (town.plots.length === 0 || town.plots.some(p => !p)) return null;
  const owner = town.plots[0]!.owner;
  return town.plots.every(p => p!.owner === owner) ? owner : null;
}

function monthOf(turn: number): number {
  return ((turn - 1 + 3) % 12) + 1; // 1巡目 = 4月
}

export function calendarLabel(turn: number): { year: number; month: number } {
  return { year: Math.floor((turn - 1 + 3) / 12) + 1, month: monthOf(turn) };
}

/**
 * 1ラウンド（1か月）を進める: 収入計算 → 自然成長/衰退 → 季節の災害 → 履歴記録。
 * 収入は成長前の状態で計算する（今月の町の姿に対して入る）。
 */
export function simulateRound(state: CityState, playerCount: number, turn: number, moneys: number[]): SimulationResult {
  const stats = computeAllStats(state);
  const powered = computePowered(state);
  const poweredWithBuildings = new Map<string, number>(); // 発電所の町 → 送電先のうち建物がある町の数
  for (const [id, town] of Object.entries(state.towns)) {
    if (town.plots.some(p => p?.kind === 'power')) poweredWithBuildings.set(id, poweredTownsWithBuildings(state, id));
  }

  const income = Array.from({ length: playerCount }, () => 0);
  const upkeep = Array.from({ length: playerCount }, () => 0);
  const popBefore = Array.from({ length: playerCount }, (_, i) => playerPopulation(state, i, stats));

  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const mono = monopolyOwner(town);
    for (const p of town.plots) {
      if (!p || p.owner >= playerCount) continue;
      let v = plotIncome(p, id, s, poweredWithBuildings.get(id) ?? 0);
      if (v > 0 && mono === p.owner) v = Math.round(v * 1.5); // 独占ボーナス
      if (v >= 0) income[p.owner] += v;
      else upkeep[p.owner] += -v;
    }
  }

  // 景気バフ
  const buffs: CityBuff[] = [];
  for (const b of state.buffs) {
    if (b.playerIndex < playerCount) {
      income[b.playerIndex] = Math.round(income[b.playerIndex] * (b.kind === 'boom' ? 1.5 : 0.5));
    }
    if (b.roundsLeft > 1) buffs.push({ ...b, roundsLeft: b.roundsLeft - 1 });
  }

  // 自然成長・衰退
  const grown = Array.from({ length: playerCount }, () => 0);
  const declined = Array.from({ length: playerCount }, () => 0);
  const headlines: string[] = [];
  const towns: Record<string, TownState> = {};
  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s || town.plots.every(p => !p)) {
      towns[id] = town;
      continue;
    }
    let changed = false;
    const plots = town.plots.map(p => {
      if (!p || !isUpgradable(p.kind)) return p;
      const d = p.kind === 'res' ? s.demand.r : p.kind === 'com' ? s.demand.c : p.kind === 'ind' ? s.demand.i : (s.happiness - 7) / 2;
      const r = random();
      if (p.level < MAX_BUILDING_LEVEL && d > 0 && r < Math.min(0.4, d * 0.22)) {
        changed = true;
        if (p.owner < playerCount) grown[p.owner]++;
        return { ...p, level: p.level + 1 };
      }
      const unpoweredDecay = (p.kind === 'com' || p.kind === 'ind') && !s.powered;
      if (p.level > 1 && ((d < -1.5 && r > 0.75) || (unpoweredDecay && r > 0.7))) {
        changed = true;
        if (p.owner < playerCount) declined[p.owner]++;
        return { ...p, level: p.level - 1 };
      }
      return p;
    });
    towns[id] = changed ? { plots } : town;
  }

  let next: CityState = { ...state, towns, buffs };

  // 季節の災害（8〜9月は台風、まれに地震）
  const disasters: CityDisasterReport[] = [];
  const month = monthOf(turn);
  const hasBuildings = Object.values(next.towns).some(t => t.plots.some(Boolean));
  if (hasBuildings) {
    if ((month === 8 || month === 9) && random() < 0.25) {
      const r = applyDisaster(next, 'typhoon');
      next = r.state;
      disasters.push(r.report);
    } else if (random() < 0.03) {
      const r = applyDisaster(next, 'quake');
      next = r.state;
      disasters.push(r.report);
    }
  }

  // 目玉ニュース
  const allStats = computeAllStats(next);
  let bestTown: string | null = null;
  let bestPop = 0;
  for (const [id, s] of allStats) {
    if (s.population > bestPop) {
      bestPop = s.population;
      bestTown = id;
    }
  }
  if (bestTown && bestPop >= 300) headlines.push(`人口日本一の町は${getTownInfo(bestTown)?.name}（${bestPop.toLocaleString()}人）`);
  const unpoweredTowns = Object.entries(next.towns).filter(([id, t]) => t.plots.some(p => p && (p.kind === 'com' || p.kind === 'ind')) && !powered.has(id)).length;
  if (unpoweredTowns > 0) headlines.push(`電気の来ていない商工業の町が${unpoweredTowns}つ。発電所が求められている`);

  // 履歴
  const popAfter = Array.from({ length: playerCount }, (_, i) => playerPopulation(next, i, allStats));
  const net = income.map((v, i) => v - upkeep[i]);
  const assets = Array.from({ length: playerCount }, (_, i) => (moneys[i] ?? 0) + net[i] + playerPropertyValue(next, i));
  next = { ...next, history: [...next.history, { turn, assets, population: popAfter }].slice(-120) };

  return {
    state: next,
    incomes: net,
    report: {
      turn,
      players: income.map((v, i) => ({
        income: v,
        upkeep: upkeep[i],
        net: net[i],
        population: popAfter[i],
        populationDelta: popAfter[i] - popBefore[i],
        grown: grown[i],
        declined: declined[i],
      })),
      disasters,
      headlines,
    },
  };
}

// ===== 災害 =====

const REGION_JA: Record<Region, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州・沖縄',
};

const DISASTER_TITLE: Record<DisasterKind, string> = {
  quake: '大鯰の地震',
  typhoon: '台風上陸',
  fire: '大火事',
  kaiju: '大王イカ上陸',
};

function damagePlot(p: Plot, destroy: boolean): Plot | null {
  if (destroy || p.level <= 1) return null;
  return { ...p, level: p.level - 1 };
}

/**
 * 災害を起こす。
 * quake: 地方全体の建物が30%で損壊 / typhoon: 地方の港町・都市が25%で損壊 /
 * fire: 対象プレイヤーの建物1つが全焼 / kaiju: 海辺の町から3つの町を進み、各町の最大の建物を壊す
 */
export function applyDisaster(
  state: CityState,
  kind: DisasterKind,
  opts: { region?: Region; targetPlayer?: number; startTown?: string } = {},
): { state: CityState; report: CityDisasterReport } {
  const towns = { ...state.towns };
  const damages: CityDamage[] = [];
  const regions: Region[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];
  // 建物のある地方を優先して選ぶ（誰も困らない災害は盛り上がらない）
  // （ただし毎回狙い撃ちにならないよう、4割は全国から無作為）
  const builtRegions = regions.filter(r => Object.entries(towns).some(([id, t]) => getTownInfo(id)?.region === r && t.plots.some(Boolean)));
  const pool = builtRegions.length && random() < 0.6 ? builtRegions : regions;
  const region = opts.region ?? pool[Math.floor(random() * pool.length)];
  let area = REGION_JA[region];

  // 等級2以上は1段階ダウン。等級1の建物は35%の確率でだけ全壊（残りは持ちこたえる）
  const hit = (id: string, pred: (p: Plot) => boolean, chance: number) => {
    const t = towns[id];
    if (!t) return;
    let changed = false;
    const plots = t.plots.map(p => {
      if (!p || !pred(p) || random() >= chance) return p;
      if (p.level <= 1 && random() >= 0.35) return p;
      changed = true;
      const np = damagePlot(p, false);
      damages.push({ nodeId: id, kind: p.kind, owner: p.owner, destroyed: np === null });
      return np;
    });
    if (changed) towns[id] = { plots };
  };

  if (kind === 'quake') {
    for (const id of Object.keys(towns)) if (getTownInfo(id)?.region === region) hit(id, p => p.kind !== 'park' && p.kind !== 'power', 0.3);
  } else if (kind === 'typhoon') {
    for (const id of Object.keys(towns)) {
      const info = getTownInfo(id);
      if (info?.region === region && (info.cls === 'port' || info.cls === 'city' || info.cls === 'metro')) hit(id, p => p.kind !== 'power', 0.25);
    }
  } else if (kind === 'fire') {
    const owned: { id: string; idx: number }[] = [];
    for (const [id, t] of Object.entries(towns)) {
      t.plots.forEach((p, idx) => {
        if (p && p.kind !== 'park' && (opts.targetPlayer === undefined || p.owner === opts.targetPlayer)) owned.push({ id, idx });
      });
    }
    if (owned.length) {
      const pick = owned[Math.floor(random() * owned.length)];
      const t = towns[pick.id];
      const p = t.plots[pick.idx]!;
      const plots = [...t.plots];
      plots[pick.idx] = null;
      towns[pick.id] = { plots };
      damages.push({ nodeId: pick.id, kind: p.kind, owner: p.owner, destroyed: true });
      area = getTownInfo(pick.id)?.name ?? area;
    }
  } else if (kind === 'kaiju') {
    const coastal = Object.keys(towns).filter(id => getTownInfo(id)?.cls === 'port' && (opts.region ? getTownInfo(id)?.region === opts.region : true));
    let cur = opts.startTown ?? coastal[Math.floor(random() * Math.max(1, coastal.length))];
    const visited: string[] = [];
    for (let step = 0; step < 3 && cur; step++) {
      visited.push(cur);
      const t = towns[cur];
      if (t) {
        let best = -1;
        t.plots.forEach((p, idx) => {
          if (p && (best < 0 || p.level > t.plots[best]!.level)) best = idx;
        });
        if (best >= 0) {
          const p = t.plots[best]!;
          const plots = [...t.plots];
          plots[best] = null;
          towns[cur] = { plots };
          damages.push({ nodeId: cur, kind: p.kind, owner: p.owner, destroyed: true });
        }
      }
      const nexts = townNeighbors(cur).filter(n => !visited.includes(n));
      cur = nexts.length ? nexts[Math.floor(random() * nexts.length)] : '';
    }
    area = visited.map(id => getTownInfo(id)?.name).filter(Boolean).join('→');
  }

  return { state: { ...state, towns }, report: { kind, title: DISASTER_TITLE[kind], area, damages } };
}

// ===== 目的地 =====

const DESTINATION_CANDIDATES = BOARD_NODES.filter(n => n.type === 'capital').map(n => n.id);

/** 次の目的地を選ぶ。賞金は前の地点からの距離に比例 */
export function pickDestination(current: string | null, from: string): { nodeId: string; reward: number } {
  const dist = distancesFrom(from);
  const pool = DESTINATION_CANDIDATES.filter(id => id !== current && id !== from && (dist.get(id) ?? 0) >= 6);
  const list = pool.length ? pool : DESTINATION_CANDIDATES.filter(id => id !== current);
  const nodeId = list[Math.floor(random() * list.length)];
  const d = dist.get(nodeId) ?? 10;
  return { nodeId, reward: Math.round((2000 + d * 220) / 100) * 100 };
}

// ===== まちのイベントカード =====

export type CityEventEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'money_per_building'; amount: number }
  | { kind: 'buff'; buff: 'boom' | 'recession'; rounds: number }
  | { kind: 'disaster'; disaster: DisasterKind }
  | { kind: 'free_build'; building: BuildingKind }
  | { kind: 'growth'; chance: number };

export interface CityEventCard {
  id: string;
  name: string;
  type: 'good' | 'bad' | 'random';
  description: string;
  effect: CityEventEffect;
}

export const CITY_EVENT_CARDS: CityEventCard[] = [
  // 良い
  { id: 'c_subsidy', name: '国からの補助金', type: 'good', description: '地方創生の補助金が下りた！建物1つにつき¥500。', effect: { kind: 'money_per_building', amount: 500 } },
  { id: 'c_boom', name: '好景気', type: 'good', description: '町に活気があふれる！2か月の間、収入1.5倍。', effect: { kind: 'buff', buff: 'boom', rounds: 2 } },
  { id: 'c_migration', name: '移住ブーム', type: 'good', description: 'テレビで紹介され、あなたの町へ移住者が殺到！建物が発展するかも。', effect: { kind: 'growth', chance: 0.5 } },
  { id: 'c_free_house', name: '空き家バンク', type: 'good', description: 'この町の空き家を無償で譲り受けた！空き区画に住宅地が建つ。', effect: { kind: 'free_build', building: 'res' } },
  { id: 'c_free_park', name: '篤志家の寄付', type: 'good', description: '地元の名士が公園を寄付してくれた！空き区画に公園が建つ。', effect: { kind: 'free_build', building: 'park' } },
  { id: 'c_expo', name: '博覧会の誘致', type: 'good', description: '博覧会の誘致に成功！¥6,000の協賛金。', effect: { kind: 'money', amount: 6000 } },
  { id: 'c_furusato', name: 'ふるさと納税', type: 'good', description: '返礼品が大人気！¥3,000の寄付が集まった。', effect: { kind: 'money', amount: 3000 } },
  // 悪い
  { id: 'c_quake', name: '大鯰が暴れた', type: 'bad', description: '地下の大鯰が身をよじり、大地震が発生！ある地方の建物が損壊する。', effect: { kind: 'disaster', disaster: 'quake' } },
  { id: 'c_typhoon', name: '大型台風', type: 'bad', description: '大型台風が上陸！港町と都市に被害が出る。', effect: { kind: 'disaster', disaster: 'typhoon' } },
  { id: 'c_fire', name: '火の用心', type: 'bad', description: 'あなたの建物の1つで火事が起きた…！', effect: { kind: 'disaster', disaster: 'fire' } },
  { id: 'c_kaiju', name: '大王イカ上陸', type: 'bad', description: '巨大な大王イカが港に上陸し、町を踏み荒らしながら進む！', effect: { kind: 'disaster', disaster: 'kaiju' } },
  { id: 'c_recession', name: '不景気', type: 'bad', description: '景気が冷え込んだ…2か月の間、収入が半分に。', effect: { kind: 'buff', buff: 'recession', rounds: 2 } },
  { id: 'c_tax', name: '固定資産税', type: 'bad', description: '固定資産税の納付書が届いた。建物1つにつき¥400を支払う。', effect: { kind: 'money_per_building', amount: -400 } },
  // どちらでも
  { id: 'c_lottery', name: '年末ジャンボ', type: 'random', description: '宝くじが当たった…かも？', effect: { kind: 'money', amount: 2000 } },
  { id: 'c_election', name: '町長選挙', type: 'random', description: '選挙戦で町が盛り上がる。選挙費用¥1,500。', effect: { kind: 'money', amount: -1500 } },
];

export function drawCityEvent(type?: 'good' | 'bad' | 'random'): CityEventCard {
  const pool = type ? CITY_EVENT_CARDS.filter(c => c.type === type) : CITY_EVENT_CARDS;
  return pool[Math.floor(random() * pool.length)];
}

export interface CityEventOutcome {
  state: CityState;
  moneyDelta: number;
  message: string;
  disaster?: CityDisasterReport;
}

/** まちイベントの効果を適用する（お金の増減はストア側で player.money に反映） */
export function applyCityEvent(state: CityState, card: CityEventCard, playerIndex: number, nodeId: string, turn: number): CityEventOutcome {
  const e = card.effect;
  switch (e.kind) {
    case 'money':
      return { state, moneyDelta: e.amount, message: e.amount >= 0 ? `¥${e.amount.toLocaleString()} を得た` : `¥${(-e.amount).toLocaleString()} を支払った` };
    case 'money_per_building': {
      const n = playerBuildingCount(state, playerIndex);
      const amt = e.amount * n;
      return { state, moneyDelta: amt, message: n === 0 ? '建物がないので関係なかった' : `建物${n}つ分で ${amt >= 0 ? '+' : '−'}¥${Math.abs(amt).toLocaleString()}` };
    }
    case 'buff':
      return {
        state: { ...state, buffs: [...state.buffs, { playerIndex, kind: e.buff, roundsLeft: e.rounds }] },
        moneyDelta: 0,
        message: e.buff === 'boom' ? `${e.rounds}か月間、収入1.5倍！` : `${e.rounds}か月間、収入が半分…`,
      };
    case 'disaster': {
      const node = NODE_MAP.get(nodeId);
      const r = applyDisaster(state, e.disaster, {
        region: e.disaster === 'fire' ? undefined : node?.region,
        targetPlayer: e.disaster === 'fire' ? playerIndex : undefined,
      });
      const n = r.report.damages.length;
      return { state: r.state, moneyDelta: 0, message: n === 0 ? `${r.report.area}で発生したが、被害はなかった` : `${r.report.area}で${n}件の被害`, disaster: r.report };
    }
    case 'free_build': {
      const town = state.towns[nodeId];
      const idx = town ? town.plots.findIndex(p => !p) : -1;
      if (!town || idx < 0) {
        return { state, moneyDelta: 1500, message: '空き区画がなかったので、代わりに¥1,500を受け取った' };
      }
      const plots = [...town.plots];
      plots[idx] = { kind: e.building, level: 1, owner: playerIndex, builtTurn: turn };
      return { state: withTown(state, nodeId, plots), moneyDelta: 0, message: `${getTownInfo(nodeId)?.name}に${BUILDING_INFO[e.building].name}が建った！` };
    }
    case 'growth': {
      let grown = 0;
      const towns = { ...state.towns };
      for (const [id, t] of Object.entries(towns)) {
        let changed = false;
        const plots = t.plots.map(p => {
          if (p && p.owner === playerIndex && isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL && random() < e.chance) {
            changed = true;
            grown++;
            return { ...p, level: p.level + 1 };
          }
          return p;
        });
        if (changed) towns[id] = { plots };
      }
      return { state: { ...state, towns }, moneyDelta: 0, message: grown ? `建物が${grown}つ発展した！` : '発展できる建物がなかった…' };
    }
  }
}

// ===== 最終成績 =====

export interface CityScore {
  money: number;
  property: number;
  assets: number;
  population: number;
  buildings: number;
  monopolies: number;
}

export function cityScore(state: CityState, playerIndex: number, money: number): CityScore {
  const property = playerPropertyValue(state, playerIndex);
  let monopolies = 0;
  for (const t of Object.values(state.towns)) if (monopolyOwner(t) === playerIndex) monopolies++;
  return {
    money,
    property,
    assets: money + property,
    population: playerPopulation(state, playerIndex),
    buildings: playerBuildingCount(state, playerIndex),
    monopolies,
  };
}

/** 釣りで漁港の町に落ちるお金（漁港の持ち主へ） */
export function portFee(state: CityState, nodeId: string, sellPrice: number): { owner: number; fee: number } | null {
  const port = state.towns[nodeId]?.plots.find(p => p?.kind === 'port');
  if (!port) return null;
  return { owner: port.owner, fee: Math.round(sellPrice * 0.2) };
}
