// まちづくりモードのヘッドレス・バランスシミュレーション。
// city.ts の純粋関数（build / upgrade / acquire / simulateRound / applyCityEvent …）をそのまま使い、
// 36か月（36巡）の4人戦を「建て方の方針が違う戦略」同士で回して、経済の偏りを測る。
//
// ■ 仮定
//  - 移動: 到達可能マスのうち「自分の方針で工事できる町・祭りのある県庁所在地・目的地・釣り場」を好んで選ぶ。
//  - 町に止まったら方針に従って最大2回工事する（予備費¥500を残す）。県庁所在地では祭りの「宴」で賞金を受け取る。
//  - 自分の建物がある町に止まったら視察する（recordInspection）。自分の空き家は、需要が戻っていれば修理する（工事1回分）。
//    住宅偏重・独占は、自分の住宅に空き家の警告（lowMonths>0）が出た町では商業・公園・工業を混ぜる。
//  - 釣り場の町では3回釣る（成功率は balance.fishing.sim と同じ近似）。売上の2割が漁港の持ち主に入る。
//  - 村マスは必ず「まちの出来事」、中継マスは3割で小さな道中イベント、ゴール賞金は1人1回の着順制（ストアと同じ）。
//  - 第2弾（ストアと同じ順番）: 目的地は通過中でも止まれる。一番乗りで賞金（年ごとに上がる）・特需・追加工事・貧乏神。
//    止まった町で他人の商業・観光に買い物代を払う。県庁で名産を買う（工事1回）。カードは cityCards.chooseCpuCard の素朴な判断で使い、
//    大都市・商都の売り場で工事券か保険を買う。月末は季節の倍率込みの収入 → 保険 → 貧乏神の悪さ → 3月は年度末の称号。
//    貧乏神にとりつかれたボットは、他の駒のいるマスを通る経路を好んで押し付ける。
//  - 戦略:
//      res     住宅偏重（住宅需要のある町に住宅を建てて育てる。幸福度が低ければ公園）
//      indpow  商工業+発電所（電気の来ていない町に発電所 → 商業/工業）
//      tour    観光（観光名所＋公園、建てられない町では住宅）
//      mono    独占狙い（4区画以下の町を1人で埋め、他人の建物・名産を買収して独占する。大きな町では需要に沿って建てる）
//      demand  需要追従（RCI需要が一番高いものを建てる分散型。港町では漁港も建てる）
//      fisher  釣り専念（建てずに釣りと祭りだけ）
//
// 計測結果を見たいときは BALANCE_REPORT_DIR=/path npx vitest run src/game/balance.city.sim.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { BuildingKind, CityState, CityDisasterReport } from './city';
import {
  createInitialCityState, getTownInfo, canBuild, build, upgrade, acquire, renovate, recordInspection, buildCost, upgradeCost, acquireCost, renovateCost,
  computeAllStats, plotIncome, poweredTownsWithBuildings, monopolyOwner, simulateRound, drawCityEvent, applyCityEvent,
  pickDestination, portFee, playerPropertyValue, isUpgradable, isTown, distancesFrom, startBoom, visitorFees, seasonOf, plotValue,
  BUILDING_INFO, CITY_ECONOMY, CITY_INITIAL_MONEY, CITY_START_NODE, CITY_ACTIONS_PER_VISIT, CITY_DEFAULT_MONTHS, MAX_BUILDING_LEVEL,
} from './city';
import {
  buySpecialty, isSpecialtyNode, specialtyIncome, isSpecialtyMonopolized, regionalMonopolies, regionOfSpecialty,
  regionSpecialtyIds, ownerOf, playerSpecialtyValue, specialtyBuyCost, SPECIALTY_ECONOMY,
} from './citySpecialties';
import type { CardState, CardEffect } from './cityCards';
import {
  createCardState, drawCard, addCard, buyCard, playCard, diceCap, tickSlow, consumeLandGrab, landGrabPrice,
  pickWarpDestination, emptyPlotIndex, suggestFreeBuildKind, freeBuild, protectInsured, chooseCpuCard, rollDiceFaces,
  hasCardShop, CARD_DROP_VILLAGE, CARD_DROP_ROUTE,
} from './cityCards';
import { attachOnDestination, transferOnMove, tickMonth, binboMischief, BINBO } from './binbo';
import { computeYearEnd, isYearEndTurn } from './cityAwards';
import type { Player, PlayerEquipment, FishRarity } from './types';
import { selectFish, createCaughtFish, checkTairyou, getEffectiveLevel, getStrikeGreenZone } from './fishing';
import { createInitialEquipment, applyDurabilityLoss, getEquippedItem, isBroken } from './equipment';
import { FISH_SELL_PRICE, REST_MONEY_BONUS } from './constants';
import { NODE_MAP } from '../data/boardNodes';
import { getCapitalEvent, CAPITAL_EVENTS } from '../data/capitalEvents';
import { FISH_DATABASE } from '../data/fishDatabase';
import { getReachableNodes } from '../utils/pathfinding';
import { setRandomSource, resetRandomSource, mulberry32, random } from '../utils/random';

export type Strategy = 'res' | 'indpow' | 'tour' | 'mono' | 'demand' | 'fisher';
const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));
const RESERVE = 500;

// 取り込み（ミニゲーム）の成功率。ミニゲーム係のボット計測（src/components/fishing/reelSim.ts・装備3種同レベル・
// 各600回の「慣れた子」）を実効リールLvで補間した近似。
//   common 100% / uncommon 97% / rare Lv1 48%・Lv2以上 100% / legendary Lv2 75%・Lv3以上 100% / mythical Lv4 84%・Lv5 85%
function reelProb(eq: PlayerEquipment, rarity: FishRarity): number {
  const lv = getEffectiveLevel(eq, 'reeling');
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  let p: number;
  switch (rarity) {
    case 'common': p = 0.99; break;
    case 'uncommon': p = 0.97; break;
    case 'rare': p = clamp(0.48 + 0.51 * (lv - 1), 0.48, 0.99); break;
    case 'legendary': p = clamp(0.75 + 0.24 * (lv - 2), 0.3, 0.99); break;
    case 'mythical': p = clamp(0.84 + 0.01 * (lv - 4), 0.2, 0.85) - (lv < 4 ? 0.3 * (4 - lv) : 0); break;
  }
  return getEquippedItem(eq, 'reel') ? Math.max(0.05, p) : Math.max(0.05, p) * 0.6;
}

function successProb(eq: PlayerEquipment, rarity: FishRarity): number {
  const g = getStrikeGreenZone(getEffectiveLevel(eq, 'strike'));
  const pStrike = Math.min(0.95, 0.25 + 1.8 * g);
  return pStrike * reelProb(eq, rarity);
}

interface PlotTrack {
  kind: BuildingKind;
  owner: number;
  builtMonth: number; // 建てた巡
  invested: number;
  cum: number;
  paybackMonth: number | null; // 建ててから回収までの月数
  level2Month: number | null;
  level3Month: number | null;
  natural: number; // 自然成長で上がった回数
  open: boolean;
}

/** 名産の保有記録（回収期間の計測用） */
interface SpecTrack {
  nodeId: string;
  owner: number;
  month: number;
  cost: number;
  cum: number;
  paybackMonth: number | null;
}

interface PTrack {
  strategy: Strategy;
  income: { city: number; fish: number; portFee: number; festival: number; destination: number; event: number; rest: number; goal: number; visitor: number; award: number };
  income12: Record<string, number> | null; // 12か月目終了時点の収入内訳（序盤の構成比用）
  spend: { build: number; upgrade: number; acquire: number; renovate: number; specialty: number; visitor: number; card: number };
  binboLoss: number; // 貧乏神で失った額（無駄遣い・渡した額・半値で売った差額）
  acquiredFrom: number; // 買収されて受け取った額
  disasterLoss: number;
  maxSingleLossShare: number;
  assetsAt: number[];
  buildingsAt: number[];
  cityIncomeAt: number[]; // その月のまちの純収入
}

interface CGame {
  state: CityState;
  players: Player[];
  tracks: PTrack[];
  plots: Map<string, PlotTrack>;
  closed: PlotTrack[];
  turn: number;
  disasterLossTotal: number;
  propertySum: number; // 月ごとの全プレイヤー資産価値の合計（平均算出用）
  disasterEvents: number;
  levelUps: number;
  upgradablePlotMonths: number;
  kindUps: Record<string, number>;
  kindPlotMonths: Record<string, number>;
  goalClaims: number[];
  cards: CardState;
  pendingDice: number;
  bonusActions: number; // この手番の追加工事（目的地・工事券）
  specs: Map<string, SpecTrack>;
  specsClosed: SpecTrack[];
  regionMonoMonths: number;
  regionMonoEver: boolean;
  binboDamage: number; // binboMischief が返す「被害額」の合計
  binboMonths: number[]; // プレイヤーごとの、月末にとりつかれていた月数
  binboAttaches: number;
  binboTransfers: number;
  visitorTotal: number;
  cardUses: Record<string, number>;
  cardsBought: number;
  awardsTotal: number;
  renovations: number;
  inspections: number;
  vacated: number;
  resDemandHist: number[]; // 住宅区画・月の需要分布 [>0, -0.5〜0, -1.5〜-0.5, ≤-1.5]
}

function makePlayer(i: number): Player {
  return {
    id: i, name: `P${i + 1}`, color: '#fff', currentNode: CITY_START_NODE, money: CITY_INITIAL_MONEY,
    equipment: createInitialEquipment(), caughtFish: [], score: 0, hasFinished: false, finishOrder: null,
    skipNextTurn: false, extraTurn: false, fishBonusMultiplier: 1, fishBonusTurnsLeft: 0,
  };
}

const plotKey = (nodeId: string, idx: number) => `${nodeId}#${idx}`;

function totalProperty(g: CGame): number {
  let s = 0;
  for (let i = 0; i < g.players.length; i++) s += playerPropertyValue(g.state, i);
  return s;
}

/** 災害・イベントの前後で資産価値の目減りを測る */
function measureLoss(g: CGame, before: CityState, after: CityState) {
  let total = 0;
  for (let i = 0; i < g.players.length; i++) {
    const b = playerPropertyValue(before, i);
    const a = playerPropertyValue(after, i);
    const loss = Math.max(0, b - a);
    if (loss > 0) {
      g.tracks[i].disasterLoss += loss;
      if (b > 0) g.tracks[i].maxSingleLossShare = Math.max(g.tracks[i].maxSingleLossShare, loss / b);
      total += loss;
    }
  }
  if (total > 0) g.disasterEvents++;
  g.disasterLossTotal += total;
}

/** 区画の追跡情報を state に合わせる（壊れた区画を閉じる） */
function syncPlots(g: CGame) {
  for (const [key, t] of g.plots) {
    if (!t.open) continue;
    const [nodeId, idxS] = key.split('#');
    const p = g.state.towns[nodeId]?.plots[Number(idxS)];
    if (!p || p.kind !== t.kind) {
      t.open = false;
      g.closed.push(t);
      g.plots.delete(key);
    } else {
      t.owner = p.owner;
      if (p.level >= 2 && t.level2Month === null) t.level2Month = g.turn - t.builtMonth + 1;
      if (p.level >= MAX_BUILDING_LEVEL && t.level3Month === null) t.level3Month = g.turn - t.builtMonth + 1;
    }
  }
}

// 同じ状態に対する町の統計を使い回す（候補マスを評価するたびに全町を計算し直さない。挙動は変わらない）
let statsCacheKey: CityState | null = null;
let statsCacheVal: ReturnType<typeof computeAllStats> | null = null;
function cachedStats(state: CityState): ReturnType<typeof computeAllStats> {
  if (statsCacheKey !== state || !statsCacheVal) {
    statsCacheKey = state;
    statsCacheVal = computeAllStats(state);
  }
  return statsCacheVal;
}

// ===== 戦略: 工事の選択 =====

type Act = { type: 'build'; idx: number; kind: BuildingKind } | { type: 'upgrade'; idx: number } | { type: 'acquire'; idx: number } | { type: 'renovate'; idx: number };

/** 建物の種類に対応する需要（観光は幸福度から） */
function demandOf(kind: BuildingKind, st: { demand: { r: number; c: number; i: number }; happiness: number }): number {
  return kind === 'res' ? st.demand.r : kind === 'com' ? st.demand.c : kind === 'ind' ? st.demand.i : kind === 'tourism' ? (st.happiness - CITY_ECONOMY.tourismGrowthHappiness) / 2 : 0;
}

function chooseAction(g: CGame, i: number, nodeId: string): Act | null {
  const strat = g.tracks[i].strategy;
  if (strat === 'fisher') return null;
  const info = getTownInfo(nodeId);
  const town = g.state.towns[nodeId];
  if (!info || !town) return null;
  const money = g.players[i].money - RESERVE;
  const st = cachedStats(g.state).get(nodeId)!;
  const empty = town.plots.map((p, idx) => (p ? -1 : idx)).filter(idx => idx >= 0);
  const canB = (kind: BuildingKind) => empty.length > 0 && !canBuild(g.state, nodeId, kind, empty[0], money);
  const buildA = (kind: BuildingKind): Act => ({ type: 'build', idx: empty[0], kind });
  const ownUp = (kinds: BuildingKind[]) => {
    const cands = town.plots
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p && p.owner === i && !p.vacant && kinds.includes(p.kind) && isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL)
      .filter(({ p, idx }) => upgradeCost(p!, nodeId, town) <= money && idx >= 0);
    cands.sort((a, b) => a.p!.level - b.p!.level);
    return cands[0] ? ({ type: 'upgrade', idx: cands[0].idx } as Act) : null;
  };
  // 自分の空き家は、需要が空き家の境目より上に戻っていれば直す（戻っていなければ直してもすぐ空く）
  const vacantIdx = town.plots.findIndex(p => p && p.owner === i && p.vacant && demandOf(p.kind, st) > CITY_ECONOMY.vacancyDemand && renovateCost(p, nodeId, town) <= money);
  if (vacantIdx >= 0) return { type: 'renovate', idx: vacantIdx };
  // 空き家の警告（自分の住宅の lowMonths>0 か空き家）: 住宅が余っているので、雇用や幸福度を足す
  const resWarn = town.plots.some(p => p && p.owner === i && p.kind === 'res' && (p.vacant || (p.lowMonths ?? 0) > 0));
  const mixForRes = (): Act | null => {
    if (st.powered && canB('com') && st.demand.c > -0.5) return buildA('com');
    if (canB('park') && st.happiness < 8) return buildA('park');
    if (st.powered && canB('ind') && info.cls !== 'onsen') return buildA('ind');
    return null;
  };

  switch (strat) {
    case 'res': {
      // 住宅需要がひどくマイナスの町（住宅の供給過多）には建てない。空き家の警告が出たら商業・公園・工業を混ぜる
      if (resWarn) {
        const mix = mixForRes();
        if (mix) return mix;
      }
      if (canB('res') && st.demand.r > -0.5) return buildA('res');
      const mine = town.plots.some(p => p?.owner === i && p.kind === 'res');
      if (mine && st.happiness < 6 && canB('park')) return buildA('park');
      const up = ownUp(['res']);
      if (up && st.demand.r > -1) return up;
      return null;
    }
    case 'indpow': {
      const hasComInd = info.allowed.includes('ind') || info.allowed.includes('com');
      if (!st.powered && hasComInd && canB('power')) return buildA('power');
      if (st.powered) {
        const pref: BuildingKind[] = st.demand.i >= st.demand.c ? ['ind', 'com'] : ['com', 'ind'];
        for (const k of pref) if (canB(k)) return buildA(k);
        const up = ownUp(['com', 'ind']);
        if (up) return up;
      }
      return null;
    }
    case 'tour': {
      if (canB('tourism')) return buildA('tourism');
      const up = ownUp(['tourism']);
      if (up) return up;
      const mine = town.plots.some(p => p?.owner === i);
      if (mine && canB('park') && st.happiness < 8) return buildA('park');
      if (!info.allowed.includes('tourism') && canB('res')) return buildA('res');
      return null;
    }
    case 'mono': {
      // 区画の少ない町（もとの区画が4以下）を1人で埋めて独占ボーナスを狙う
      const small = (town.base ?? town.plots.length) <= 4;
      if (!small) {
        // 大きな町では独占は狙わず、需要に沿って建てて資金を寝かせない
        const up = ownUp(['res', 'ind', 'com', 'tourism']);
        if (up) return up;
        const opts: { k: BuildingKind; d: number }[] = [
          { k: 'res' as BuildingKind, d: st.demand.r },
          { k: 'com' as BuildingKind, d: st.powered ? st.demand.c : -9 },
          { k: 'ind' as BuildingKind, d: st.powered ? st.demand.i : -9 },
        ].sort((a, b) => b.d - a.d);
        for (const o of opts) if (o.d > 0 && canB(o.k)) return buildA(o.k);
        return null;
      }
      const others = town.plots.map((p, idx) => ({ p, idx })).filter(({ p }) => p && p.owner !== i);
      const mineN = town.plots.filter(p => p?.owner === i).length;
      // 他人の建物が1〜2つで自分が同数以上なら買収して独占に近づける
      if (others.length > 0 && others.length <= 2 && mineN >= others.length) {
        const cheapest = others.sort((a, b) => acquireCost(a.p!, nodeId, town) - acquireCost(b.p!, nodeId, town))[0];
        if (acquireCost(cheapest.p!, nodeId, town) <= money) return { type: 'acquire', idx: cheapest.idx };
      }
      if (others.length <= 1) {
        // 住宅が余り気味（需要 < −0.5 か空き家の警告）なら、住宅の代わりに雇用・幸福度を足して埋める
        const resOk = st.demand.r > -0.5 && !resWarn;
        const fill: BuildingKind[] = info.cls === 'onsen' ? ['tourism', 'com', 'park'] : info.cls === 'port' ? ['port', 'ind', 'com', 'park'] : st.powered ? ['ind', 'park'] : ['power', 'park'];
        const pref: BuildingKind[] = resOk ? ['res', ...fill] : fill;
        for (const k of pref) if (canB(k)) return buildA(k);
      }
      return ownUp(['res', 'ind', 'com', 'tourism']);
    }
    case 'demand': {
      if (info.allowed.includes('port') && canB('port')) return buildA('port');
      const hasComInd = info.allowed.includes('ind') || info.allowed.includes('com');
      if (!st.powered && hasComInd && canB('power') && town.plots.some(p => p?.kind === 'com' || p?.kind === 'ind')) return buildA('power');
      if (st.pollution >= 3 && canB('park')) return buildA('park');
      const opts: { k: BuildingKind; d: number }[] = [
        { k: 'res' as BuildingKind, d: st.demand.r },
        { k: 'com' as BuildingKind, d: st.powered ? st.demand.c : -9 },
        { k: 'ind' as BuildingKind, d: st.powered ? st.demand.i : -9 },
      ].sort((a, b) => b.d - a.d);
      for (const o of opts) if (o.d > -1 && canB(o.k)) return buildA(o.k);
      if (canB('tourism') && st.happiness >= 6) return buildA('tourism');
      return ownUp(['res', 'com', 'ind', 'tourism']);
    }
  }
  return null;
}

/**
 * 名産を買うか。空きなら建てる戦略はみな買う（予備費を残して払えるとき）。
 * 独占狙いは、その地方で自分が半分以上を持っていれば他人の名産も買収する。釣り専念は買わない。
 */
function wantSpecialty(g: CGame, i: number, nodeId: string): boolean {
  const strat = g.tracks[i].strategy;
  if (strat === 'fisher' || !isSpecialtyNode(nodeId)) return false;
  const owners = g.state.specialties;
  const owner = ownerOf(owners, nodeId);
  if (owner === i) return false;
  const cost = specialtyBuyCost(owners, nodeId);
  if (g.players[i].money - RESERVE < cost) return false;
  if (owner === null) return true;
  if (strat !== 'mono') return false;
  const region = regionOfSpecialty(nodeId);
  const ids = region ? regionSpecialtyIds(region) : [];
  const mine = ids.filter(id => ownerOf(owners, id) === i).length;
  return mine * 2 >= ids.length;
}

function doActions(g: CGame, i: number, nodeId: string) {
  let used = 0;
  const limit = () => CITY_ACTIONS_PER_VISIT + g.bonusActions;
  // 名産（工事1回を使う）
  if (used < limit() && wantSpecialty(g, i, nodeId)) {
    const p = g.players[i];
    const r = buySpecialty(g.state.specialties, nodeId, i, p.money);
    if (r.ok) {
      used++;
      g.state = { ...g.state, specialties: { ...r.owners } };
      p.money -= r.cost;
      g.tracks[i].spend.specialty += r.cost;
      if (r.prevOwner !== undefined) {
        g.players[r.prevOwner].money += r.cost;
        g.tracks[r.prevOwner].acquiredFrom += r.cost;
      }
      const old = g.specs.get(nodeId);
      if (old) {
        g.specsClosed.push(old);
        g.specs.delete(nodeId);
      }
      g.specs.set(nodeId, { nodeId, owner: i, month: g.turn, cost: r.cost, cum: 0, paybackMonth: null });
    }
  }
  while (used < limit()) {
    const act = chooseAction(g, i, nodeId);
    if (!act) return;
    const p = g.players[i];
    const tr = g.tracks[i];
    if (act.type === 'build') {
      const r = build(g.state, nodeId, act.idx, act.kind, i, p.money, g.turn);
      if (!r.ok) return;
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.build += r.cost;
      g.plots.set(plotKey(nodeId, act.idx), { kind: act.kind, owner: i, builtMonth: g.turn, invested: r.cost, cum: 0, paybackMonth: null, level2Month: null, level3Month: null, natural: 0, open: true });
    } else if (act.type === 'upgrade') {
      const r = upgrade(g.state, nodeId, act.idx, i, p.money);
      if (!r.ok) return;
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.upgrade += r.cost;
      const t = g.plots.get(plotKey(nodeId, act.idx));
      if (t) t.invested += r.cost;
    } else if (act.type === 'renovate') {
      const r = renovate(g.state, nodeId, act.idx, i, p.money);
      if (!r.ok) return;
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.renovate += r.cost;
      g.renovations++;
      const t = g.plots.get(plotKey(nodeId, act.idx));
      if (t) t.invested += r.cost;
    } else {
      // 地上げが効いていれば価値の1.1倍で買収できる（ストアの cityAcquire と同じ）
      const town = g.state.towns[nodeId];
      const plot = town?.plots[act.idx];
      let price: number | null = null;
      if (plot) {
        const lg = consumeLandGrab(g.cards, i);
        if (lg.used) {
          price = landGrabPrice(plotValue(plot, nodeId, town));
          if (p.money < price) return;
          g.cards = lg.cs;
        }
      }
      const r = acquire(g.state, nodeId, act.idx, i, price !== null ? Infinity : p.money);
      if (!r.ok) return;
      const cost = price ?? r.cost;
      g.state = r.state;
      p.money -= cost;
      tr.spend.acquire += cost;
      if (r.prevOwner !== undefined) {
        g.players[r.prevOwner].money += cost;
        g.tracks[r.prevOwner].acquiredFrom += cost;
      }
    }
    used++;
    syncPlots(g);
  }
}

// ===== 釣り（まちづくり中の寄り道） =====

function doFishing(g: CGame, i: number, nodeId: string) {
  const p = g.players[i];
  const node = NODE_MAP.get(nodeId)!;
  for (let k = 0; k < 3; k++) {
    if (!getEquippedItem(p.equipment, 'rod')) return;
    const isSpecial = node.type === 'fishing_special';
    const fish = selectFish(node.id, node.region, p.equipment, isSpecial, false);
    if (random() < successProb(p.equipment, fish.rarity)) {
      const all = [createCaughtFish(fish.id, node.id, g.turn, p.equipment)];
      const bonus = checkTairyou(p.equipment, isSpecial);
      for (let b = 0; b < bonus; b++) all.push(createCaughtFish(selectFish(node.id, node.region, p.equipment, isSpecial, false).id, node.id, g.turn, p.equipment));
      let sale = 0;
      for (const c of all) {
        const fd = FISH_MAP.get(c.fishId);
        sale += fd ? Math.round((FISH_SELL_PRICE[fd.rarity] ?? 200) * c.size) : 200;
      }
      p.money += sale;
      g.tracks[i].income.fish += sale;
      const fee = portFee(g.state, nodeId, sale);
      if (fee && fee.fee > 0 && g.players[fee.owner]) {
        g.players[fee.owner].money += fee.fee;
        g.tracks[fee.owner].income.portFee += fee.fee;
      }
    }
    // 耐久度（壊れたら持ち物の予備に付け替える）
    p.equipment = applyDurabilityLoss(p.equipment);
    const eq = p.equipment;
    for (const t of ['rod', 'reel', 'lure'] as const) {
      if (eq.equipped[t]) continue;
      const cand = eq.inventory.find(it => it.type === t && !isBroken(it));
      if (cand) p.equipment = { ...p.equipment, equipped: { ...p.equipment.equipped, [t]: cand.id } };
    }
  }
}

// ストア(useGameStore.ts)の中継マスの道中イベント（ROAD_EVENTS）とゴール着順賞金（CITY_GOAL_REWARDS）の写し
const ROAD_EVENT_AMOUNTS = [600, -300, 500, -400, 800, -500];
const CITY_GOAL_REWARDS = [5000, 3000, 2000, 1000];

// ===== 移動 =====

function endpointScore(g: CGame, i: number, path: string[], fromNode: string): number {
  const nodeId = path[path.length - 1];
  const strat = g.tracks[i].strategy;
  const node = NODE_MAP.get(nodeId);
  if (!node) return -99;
  let s = random();
  if (g.state.destination === nodeId) s += 3 + g.state.destinationReward / 2000;
  else if (g.state.destination) {
    const d = distancesFrom(g.state.destination);
    s += ((d.get(fromNode) ?? 30) - (d.get(nodeId) ?? 30)) * 0.15;
  }
  if (node.type === 'capital') s += 1.5;
  if (node.type === 'fishing' || node.type === 'fishing_special') s += strat === 'fisher' ? 4 : 0.8;
  if (node.type === 'event_bad') s -= 1;
  if (node.type === 'rest') s += 0.5;
  if (isTown(node) && strat !== 'fisher' && (chooseAction(g, i, nodeId) || wantSpecialty(g, i, nodeId))) s += 3;
  // 貧乏神にとりつかれていたら、他の駒のいるマスを通って押し付けたい
  if (g.state.binbo?.playerIndex === i) {
    const others = new Set(g.players.filter((_, k) => k !== i).map(pl => pl.currentNode));
    if (path.slice(1).some(n => others.has(n))) s += 5;
  }
  // 買い物代を払う町は少し避ける（他人の商業・観光の多い町）
  const fee = visitorFees(g.state, nodeId, i, g.players[i].money).total;
  s -= fee / 1500;
  return s;
}

function playerNodes(g: CGame): string[] {
  return g.players.map(pl => pl.currentNode);
}

/** 貧乏神: とりつかれた人が動いたら、通ったマスの駒へ移る */
function binboMove(g: CGame, i: number, path: string[]) {
  const r = transferOnMove(g.state.binbo, i, path, playerNodes(g));
  if (r.to !== null) {
    g.state = { ...g.state, binbo: r.binbo };
    g.binboTransfers++;
  }
}

/** 災害の前後で保険を効かせる（ストアの applyInsurance と同じ） */
function insure(g: CGame, before: CityState, after: CityState, disasters: CityDisasterReport[]): CityState {
  let city = after;
  for (const d of disasters) {
    const r = protectInsured(before, city, d, g.cards);
    city = r.city;
    g.cards = r.cs;
  }
  return city;
}

function playBotCard(g: CGame, i: number, idx: number, target: number | undefined, timing: 'before_roll' | 'in_town', nodeId: string): CardEffect | null {
  const r = playCard(g.cards, i, idx, target, { timing, hasEmptyPlot: emptyPlotIndex(g.state, nodeId) >= 0, pendingDice: g.pendingDice });
  if ('error' in r) return null;
  g.cards = r.cs;
  g.cardUses[r.card] = (g.cardUses[r.card] ?? 0) + 1;
  return r.effect;
}

/** 到着したマスの処理（ストアの executeCityNodeAction と同じ順番）と町の画面 */
function arrive(g: CGame, i: number, best: string) {
  const p = g.players[i];
  const node = NODE_MAP.get(best)!;
  const tr = g.tracks[i];
  // 目的地に一番乗り: 賞金・次の目的地・特需・追加工事・貧乏神
  if (g.state.destination === best) {
    p.money += g.state.destinationReward;
    tr.income.destination += g.state.destinationReward;
    const nd = pickDestination(best, best, g.turn);
    g.state = startBoom({ ...g.state, destination: nd.nodeId, destinationReward: nd.reward }, best);
    g.bonusActions += CITY_ECONOMY.destinationBonusActions;
    const prev = g.state.binbo?.playerIndex ?? null;
    const nb = attachOnDestination(g.state.binbo, i, playerNodes(g), best, g.players.length, g.players.map(pl => pl.money));
    g.state = { ...g.state, binbo: nb };
    if (nb.playerIndex !== null && nb.playerIndex !== prev) g.binboAttaches++;
  }
  // 客としての買い物代
  const fees = visitorFees(g.state, best, i, p.money);
  if (fees.total > 0) {
    p.money = Math.max(0, p.money - fees.total);
    tr.spend.visitor += fees.total;
    g.visitorTotal += fees.total;
    for (const pay of fees.payments) {
      g.players[pay.owner].money += pay.amount;
      g.tracks[pay.owner].income.visitor += pay.amount;
    }
  }
  // 視察
  const ins = recordInspection(g.state, best, i);
  if (ins.inspected && ins.state !== g.state) {
    g.state = ins.state;
    g.inspections++;
  }
  let panel = false;
  let cardDrawn = false;
  switch (node.type) {
    case 'event_good':
    case 'event_bad':
    case 'event_random': {
      // 村マスでは必ず「まちの出来事」。半分の確率でカードも引く
      const kind = node.type === 'event_good' ? 'good' : node.type === 'event_bad' ? 'bad' : 'random';
      const card = drawCityEvent(kind);
      const before = g.state;
      const out = applyCityEvent(g.state, card, i, best, g.turn);
      g.state = out.disaster ? insure(g, before, out.state, [out.disaster]) : out.state;
      const nm = Math.max(0, p.money + out.moneyDelta);
      tr.income.event += nm - p.money;
      p.money = nm;
      if (card.effect.kind === 'disaster') measureLoss(g, before, g.state);
      if (card.effect.kind === 'free_build') {
        const town = g.state.towns[best];
        town?.plots.forEach((pl, idx) => {
          if (pl && pl.builtTurn === g.turn && pl.owner === i && !g.plots.has(plotKey(best, idx))) {
            g.plots.set(plotKey(best, idx), { kind: pl.kind, owner: i, builtMonth: g.turn, invested: 0, cum: 0, paybackMonth: null, level2Month: null, level3Month: null, natural: 0, open: true });
          }
        });
      }
      syncPlots(g);
      if (random() < CARD_DROP_VILLAGE) cardDrawn = true;
      panel = isTown(node);
      break;
    }
    case 'route':
      if (random() < CARD_DROP_ROUTE) cardDrawn = true;
      if (random() < 0.3) {
        const amt = ROAD_EVENT_AMOUNTS[Math.floor(random() * ROAD_EVENT_AMOUNTS.length)];
        const nm = Math.max(0, p.money + amt);
        tr.income.event += nm - p.money;
        p.money = nm;
      }
      break;
    case 'rest':
      p.money += REST_MONEY_BONUS;
      tr.income.rest += REST_MONEY_BONUS;
      panel = true;
      break;
    case 'goal':
      // 着順賞金は1人1回
      if (!g.goalClaims.includes(i)) {
        const reward = CITY_GOAL_REWARDS[g.goalClaims.length] ?? CITY_GOAL_REWARDS[CITY_GOAL_REWARDS.length - 1];
        g.goalClaims.push(i);
        p.money += reward;
        tr.income.goal += reward;
      }
      break;
    case 'start':
      break;
    default:
      panel = isTown(node);
  }
  if (cardDrawn) g.cards = addCard(g.cards, i, drawCard()).cs;
  if (!panel) return;
  // 町の画面: 祭り → 釣り → カード（誘致・地上げ・工事券）→ 売り場 → 名産・工事
  if (node.type === 'capital' && node.capitalEventId) {
    const ev = getCapitalEvent(node.capitalEventId);
    const feast = ev?.choices.find(c => c.effect.kind === 'feast');
    if (feast && feast.effect.kind === 'feast') {
      p.money += feast.effect.moneyBonus;
      tr.income.festival += feast.effect.moneyBonus;
      p.equipment = { ...p.equipment, inventory: p.equipment.inventory.map(it => ({ ...it, durability: 100 })) };
      const eq = p.equipment;
      for (const t of ['rod', 'reel', 'lure'] as const) {
        if (!eq.equipped[t]) {
          const cand = eq.inventory.find(it => it.type === t);
          if (cand) p.equipment = { ...p.equipment, equipped: { ...p.equipment.equipped, [t]: cand.id } };
        }
      }
    }
  }
  if (node.type === 'fishing' || node.type === 'fishing_special') doFishing(g, i, best);
  if (tr.strategy !== 'fisher') {
    const town = g.state.towns[best];
    const wantsAcquire = tr.strategy === 'mono' && !!town && town.plots.some(pl => pl && pl.owner !== i);
    const pick = chooseCpuCard(g.cards, i, { distToDestination: Infinity, money: p.money, isInTown: true, opponents: [], hasEmptyPlot: emptyPlotIndex(g.state, best) >= 0, wantsAcquire });
    if (pick) {
      const e = playBotCard(g, i, pick.index, pick.target, 'in_town', best);
      if (e?.kind === 'build_bonus') g.bonusActions += e.extra;
      if (e?.kind === 'free_build') {
        const idx = emptyPlotIndex(g.state, best);
        const kind = idx >= 0 ? suggestFreeBuildKind(g.state, best, idx) : null;
        if (idx >= 0 && kind) {
          const b = freeBuild(g.state, best, idx, kind, i, g.turn);
          if (b.ok) g.state = b.state;
        }
      }
    }
    // 売り場（大都市・商都）: お金に余裕があり手札が少なければ工事券か保険を1枚
    if (hasCardShop(best) && p.money >= 8000 && (g.cards.hands[i]?.length ?? 0) < 2) {
      const want = p.money >= 15000 ? 'kojiken' : 'hoken';
      const r = buyCard(g.cards, i, want, p.money);
      if (!('error' in r)) {
        g.cards = r.cs;
        p.money -= r.cost;
        tr.spend.card += r.cost;
        g.cardsBought++;
      }
    }
  }
  doActions(g, i, best);
}

function playTurn(g: CGame, i: number) {
  const p = g.players[i];
  g.pendingDice = 1;
  g.bonusActions = 0;
  // サイコロの前のカード（保険・牛歩・急行/特急・ぶっとび・地上げ）
  if (g.tracks[i].strategy !== 'fisher' || (g.cards.hands[i]?.length ?? 0) > 0) {
    const dist = g.state.destination ? distancesFrom(g.state.destination) : null;
    const pick = chooseCpuCard(g.cards, i, {
      distToDestination: dist?.get(p.currentNode) ?? Infinity,
      money: p.money,
      isInTown: false,
      opponents: g.players.map((pl, k) => ({ index: k, distToDestination: dist?.get(pl.currentNode) ?? Infinity })),
      pendingDice: g.pendingDice,
    });
    if (pick) {
      const e = playBotCard(g, i, pick.index, pick.target, 'before_roll', p.currentNode);
      if (e?.kind === 'dice') g.pendingDice = e.count;
      if (e?.kind === 'warp') {
        const from = p.currentNode;
        const dest = pickWarpDestination(from);
        p.currentNode = dest;
        binboMove(g, i, [from, dest]);
        arrive(g, i, dest);
        g.cards = tickSlow(g.cards, i);
        return;
      }
    }
  }
  const faces = rollDiceFaces(g.pendingDice, diceCap(g.cards, i));
  const steps = faces.reduce((a, b) => a + b, 0);
  const stops = g.state.destination ? [g.state.destination] : [];
  const paths = getReachableNodes(p.currentNode, steps, stops);
  let bestPath = paths[0];
  let bestS = -Infinity;
  for (const pa of paths) {
    const sc = endpointScore(g, i, pa, p.currentNode);
    if (sc > bestS) {
      bestS = sc;
      bestPath = pa;
    }
  }
  const best = bestPath[bestPath.length - 1];
  p.currentNode = best;
  binboMove(g, i, bestPath);
  arrive(g, i, best);
  g.cards = tickSlow(g.cards, i);
}

/** 月末: 区画ごとの収入を記録してから simulateRound を回す */
function monthEnd(g: CGame) {
  const stats = computeAllStats(g.state);
  const season = seasonOf(g.turn);
  const pw = new Map<string, number>();
  for (const [id, town] of Object.entries(g.state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const mono = monopolyOwner(town);
    town.plots.forEach((p, idx) => {
      if (!p) return;
      if (p.kind === 'power' && !pw.has(id)) pw.set(id, poweredTownsWithBuildings(g.state, id));
      let v = plotIncome(p, id, s, pw.get(id) ?? 0);
      const tinfo = getTownInfo(id);
      if (v > 0 && tinfo) v = Math.round(v * season.mul(p.kind, tinfo.cls, tinfo.region));
      if (v > 0 && mono === p.owner) v = Math.round(v * CITY_ECONOMY.monopolyMul);
      const t = g.plots.get(plotKey(id, idx));
      if (t) {
        t.cum += v;
        if (t.paybackMonth === null && t.cum >= t.invested) t.paybackMonth = g.turn - t.builtMonth + 1;
      }
      if (p.kind === 'res') {
        const d = s.demand.r;
        g.resDemandHist[d > 0 ? 0 : d > -0.5 ? 1 : d > -1.5 ? 2 : 3]++;
      }
      if (isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL) {
        g.upgradablePlotMonths++;
        g.kindPlotMonths[p.kind] = (g.kindPlotMonths[p.kind] ?? 0) + 1;
      }
    });
  }
  // 名産の月収（simulateRound と同じ式）で回収を記録し、地方独占を数える
  const owners = g.state.specialties;
  for (const t of g.specs.values()) {
    if (ownerOf(owners, t.nodeId) !== t.owner) continue;
    t.cum += specialtyIncome(t.nodeId, season.month, isSpecialtyMonopolized(owners, t.nodeId));
    if (t.paybackMonth === null && t.cum >= t.cost) t.paybackMonth = g.turn - t.month + 1;
  }
  const monoRegions = Object.keys(regionalMonopolies(owners)).length;
  g.regionMonoMonths += monoRegions;
  if (monoRegions > 0) g.regionMonoEver = true;
  const before = g.state;
  const levelsBefore = new Map<string, number>();
  for (const [id, town] of Object.entries(before.towns)) town.plots.forEach((p, idx) => p && levelsBefore.set(plotKey(id, idx), p.level));
  const sim = simulateRound(g.state, g.players.length, g.turn, g.players.map(p => p.money));
  g.vacated += sim.report.players.reduce((a, pr) => a + (pr.vacated ?? 0), 0);
  sim.incomes.forEach((v, i) => {
    const nm = Math.max(0, g.players[i].money + v);
    g.tracks[i].cityIncomeAt[g.turn] = v;
    g.tracks[i].income.city += nm - g.players[i].money;
    g.players[i].money = nm;
  });
  // 自然成長の回数（成長は災害より先に適用される。災害で下がった区画は数えない）
  for (const [id, town] of Object.entries(sim.state.towns)) {
    town.plots.forEach((p, idx) => {
      const lb = levelsBefore.get(plotKey(id, idx));
      if (p && lb !== undefined && p.level > lb) {
        g.levelUps++;
        g.kindUps[p.kind] = (g.kindUps[p.kind] ?? 0) + 1;
        const t = g.plots.get(plotKey(id, idx));
        if (t) t.natural++;
      }
    });
  }
  // 季節の災害による損失（地震・台風は 等級1の全壊=建設費 / 1段階ダウン=建設費×0.6）
  if (sim.report.disasters.length) {
    let total = 0;
    const perOwner = new Map<number, number>();
    for (const d of sim.report.disasters) for (const dmg of d.damages) {
      const c = buildCost(dmg.kind, dmg.nodeId, before.towns[dmg.nodeId]);
      const loss = dmg.destroyed ? c : Math.round(c * 0.6);
      total += loss;
      perOwner.set(dmg.owner, (perOwner.get(dmg.owner) ?? 0) + loss);
    }
    for (const [o, loss] of perOwner) {
      if (!g.tracks[o]) continue;
      g.tracks[o].disasterLoss += loss;
      const b = playerPropertyValue(before, o);
      if (b > 0) g.tracks[o].maxSingleLossShare = Math.max(g.tracks[o].maxSingleLossShare, loss / b);
    }
    if (total > 0) g.disasterEvents++;
    g.disasterLossTotal += total;
  }
  g.state = insure(g, before, sim.state, sim.report.disasters);
  // 貧乏神: 月を数え、とりついた人に悪さをする
  const prevB = g.state.binbo;
  if (prevB && prevB.playerIndex !== null) {
    const b = tickMonth(prevB);
    const who = b.playerIndex!;
    const moneys = g.players.map(pl => pl.money);
    const mm = binboMischief(b, { ...g.state, binbo: b }, who, moneys);
    mm.moneyDeltas.forEach((d, k) => {
      g.players[k].money = Math.max(0, g.players[k].money + d);
    });
    g.binboDamage += mm.damage;
    const lost = mm.kind === 'sell' ? (mm.sold ?? []).reduce((a, x) => a + x.value - x.price, 0) : Math.max(0, -(mm.moneyDeltas[who] ?? 0));
    g.tracks[who].binboLoss += lost;
    g.binboMonths[who]++;
    g.state = { ...mm.city, binbo: b };
  }
  // 年度末（3月）の称号: 賞金・罰金
  if (isYearEndTurn(g.turn)) {
    const ye = computeYearEnd(g.state, g.players.map(pl => pl.money), g.turn, CITY_INITIAL_MONEY);
    for (const t of ye.titles) {
      const wp = g.players[t.playerIndex];
      if (!wp) continue;
      const nm = Math.max(0, wp.money + t.prize);
      g.tracks[t.playerIndex].income.award += nm - wp.money;
      g.awardsTotal += nm - wp.money;
      wp.money = nm;
    }
  }
  syncPlots(g);
  g.propertySum += totalProperty(g);
  g.players.forEach((p, i) => {
    g.tracks[i].assetsAt[g.turn] = p.money + playerPropertyValue(g.state, i) + playerSpecialtyValue(g.state.specialties, i);
    g.tracks[i].buildingsAt[g.turn] = Object.values(g.state.towns).reduce((a, t) => a + t.plots.filter(pl => pl?.owner === i).length, 0);
    if (g.turn === 12) g.tracks[i].income12 = { ...g.tracks[i].income };
  });
}

export function simulateCityGame(seed: number, strategies: Strategy[], months = CITY_DEFAULT_MONTHS): CGame {
  setRandomSource(mulberry32(seed));
  const g: CGame = {
    state: createInitialCityState(),
    players: strategies.map((_, i) => makePlayer(i)),
    tracks: strategies.map(s => ({
      strategy: s,
      income: { city: 0, fish: 0, portFee: 0, festival: 0, destination: 0, event: 0, rest: 0, goal: 0, visitor: 0, award: 0 },
      income12: null,
      spend: { build: 0, upgrade: 0, acquire: 0, renovate: 0, specialty: 0, visitor: 0, card: 0 },
      binboLoss: 0,
      acquiredFrom: 0,
      disasterLoss: 0,
      maxSingleLossShare: 0,
      assetsAt: [],
      buildingsAt: [],
      cityIncomeAt: [],
    })),
    plots: new Map(),
    closed: [],
    turn: 1,
    disasterLossTotal: 0,
    propertySum: 0,
    disasterEvents: 0,
    levelUps: 0,
    upgradablePlotMonths: 0,
    kindUps: {},
    kindPlotMonths: {},
    goalClaims: [],
    cards: createCardState(strategies.length),
    pendingDice: 1,
    bonusActions: 0,
    specs: new Map(),
    specsClosed: [],
    regionMonoMonths: 0,
    regionMonoEver: false,
    binboDamage: 0,
    binboMonths: strategies.map(() => 0),
    binboAttaches: 0,
    binboTransfers: 0,
    visitorTotal: 0,
    cardUses: {},
    cardsBought: 0,
    awardsTotal: 0,
    renovations: 0,
    inspections: 0,
    vacated: 0,
    resDemandHist: [0, 0, 0, 0],
  };
  for (let t = 1; t <= months; t++) {
    g.turn = t;
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (p.skipNextTurn) {
        p.skipNextTurn = false;
        continue;
      }
      for (let guard = 0; guard < 4; guard++) {
        playTurn(g, i);
        if (!p.extraTurn) break;
        p.extraTurn = false;
      }
      p.extraTurn = false;
    }
    monthEnd(g);
  }
  resetRandomSource();
  return g;
}

// ===== 集計 =====

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
};
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}
const r0 = (v: number) => (Number.isFinite(v) ? Math.round(v) : NaN);
const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN);

export interface CitySummary {
  label: string;
  games: number;
  byStrategy: Record<string, { n: number; assets: number; assetsSd: number; wins: number; winRate: number; buildings: number; money: number; property: number; owned: Record<string, string>; income: Record<string, number>; spend: Record<string, number>; disasterLoss: number; maxLossShare: number }>;
  paybackMedian: Record<string, number>;
  paybackRecovered: Record<string, number>;
  paybackCount: Record<string, number>;
  level3Median: number;
  level3Rate: number;
  growthPerPlotMonth: number;
  annualDisasterLossRate: number;
  leaderAt12Wins: number;
  leaderAt24Wins: number;
  winnerShareOfTotal: number;
  finalGapTop2: number;
  assetsMedianAt: Record<number, number>;
  buildingsMeanAt: Record<number, number>;
  incomeShare: Record<string, number>;
  incomeShare12: Record<string, number>;
  kindRoi: Record<string, { n: number; invested: number; cum: number; roi: number; perMonth: number }>;
  kindGrowth: Record<string, number>;
  level2Median: number;
  tierMedian: { t1: number; t2: number; t3: number }; // 36か月で発展度が壱以上・弐以上・参になった町の数（中央値）
  vacatedPerGame: number;
  specialtyPayback: number; // 最初の24か月に買った名産の回収月数（中央値）
  specialtyRecovered: number; // そのうち回収できた割合(%)
  specialtiesOwnedAtEnd: number; // 最終月に持ち主のいる名産の数（平均）
  regionMonoEverRate: number; // 地方独占が一度でも起きた局の割合(%)
  regionMonoAtEndRate: number; // 最終月に地方独占がある局の割合(%)
  regionMonoMonthsPerGame: number; // 地方独占の「地方×月」の合計（1局平均）
  binboDamagePerGame: number; // 貧乏神の被害額（binboMischief の damage 合計・1局平均）
  binboLossPerGame: number; // 実際に失った額（無駄遣い・渡した額・半値売りの差額・1局平均）
  binboMaxShareMedian: number; // 1局の中で一番長くとりつかれた人の割合（中央値。4人で均等なら25%）
  binboMaxShareP90: number;
  binboLossShareOfAssets: number; // 失った額 ÷ 最終総資産（とりつかれた人ごと・中央値%）
  visitorPerGame: number; // 買い物代の総額（1局）
  cardUsesPerGame: Record<string, number>;
  cardsBoughtPerGame: number;
  awardsPerGame: number;
  vacantAtEnd: number; // 最終月に空き家だった区画の割合(%)
  renovationsPerGame: number;
  inspectionsPerGame: number;
  resDemandHist: number[];
}

export function summarizeCity(label: string, games: CGame[], months = CITY_DEFAULT_MONTHS): CitySummary {
  const byStrategy: CitySummary['byStrategy'] = {};
  const rows: { strat: Strategy; assets: number; win: boolean; tr: PTrack; buildings: number; money: number; property: number; owned: Record<string, [number, number]> }[] = [];
  let lead12 = 0;
  let lead24 = 0;
  const gaps: number[] = [];
  const winnerShare: number[] = [];
  for (const g of games) {
    const finals = g.tracks.map(t => t.assetsAt[months]);
    const winner = finals.indexOf(Math.max(...finals));
    const argmax = (arr: number[]) => arr.indexOf(Math.max(...arr));
    if (argmax(g.tracks.map(t => t.assetsAt[12])) === winner) lead12++;
    if (argmax(g.tracks.map(t => t.assetsAt[24])) === winner) lead24++;
    const sorted = [...finals].sort((a, b) => b - a);
    gaps.push((sorted[0] - sorted[1]) / Math.max(1, sorted[0]));
    winnerShare.push(sorted[0] / Math.max(1, finals.reduce((a, b) => a + b, 0)));
    g.tracks.forEach((t, i) => {
      const owned: Record<string, [number, number]> = {};
      for (const town of Object.values(g.state.towns)) for (const pl of town.plots) {
        if (!pl || pl.owner !== i) continue;
        const o = owned[pl.kind] ?? [0, 0];
        owned[pl.kind] = [o[0] + 1, o[1] + pl.level];
      }
      rows.push({ strat: t.strategy, assets: finals[i], win: i === winner, tr: t, buildings: t.buildingsAt[months], money: g.players[i].money, property: playerPropertyValue(g.state, i), owned });
    });
  }
  const strats = [...new Set(rows.map(r => r.strat))];
  for (const s of strats) {
    const rs = rows.filter(r => r.strat === s);
    const inc: Record<string, number> = {};
    for (const k of Object.keys(rs[0].tr.income)) inc[k] = r0(mean(rs.map(r => r.tr.income[k as keyof PTrack['income']])));
    const sp: Record<string, number> = {};
    for (const k of Object.keys(rs[0].tr.spend)) sp[k] = r0(mean(rs.map(r => r.tr.spend[k as keyof PTrack['spend']])));
    byStrategy[s] = {
      n: rs.length,
      assets: r0(mean(rs.map(r => r.assets))),
      assetsSd: r0(sd(rs.map(r => r.assets))),
      wins: rs.filter(r => r.win).length,
      winRate: r2((rs.filter(r => r.win).length / rs.length) * 100),
      buildings: r2(mean(rs.map(r => r.buildings))),
      money: r0(mean(rs.map(r => r.money))),
      property: r0(mean(rs.map(r => r.property))),
      owned: Object.fromEntries(['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'].map(k => {
        const cnt = mean(rs.map(r => r.owned[k]?.[0] ?? 0));
        const lv = rs.reduce((a, r) => a + (r.owned[k]?.[1] ?? 0), 0) / Math.max(1, rs.reduce((a, r) => a + (r.owned[k]?.[0] ?? 0), 0));
        return [k, `${r2(cnt)}件/Lv${r2(lv)}`];
      }).filter(([, v]) => !String(v).startsWith('0件'))),
      income: inc,
      spend: sp,
      disasterLoss: r0(mean(rs.map(r => r.tr.disasterLoss))),
      maxLossShare: r2(quantile(rs.map(r => r.tr.maxSingleLossShare), 0.9) * 100),
    };
  }
  // 回収期間（最初の18か月に建てた建物。回収できなかったものは Infinity）
  const allPlots: PlotTrack[] = [];
  for (const g of games) {
    allPlots.push(...g.closed, ...g.plots.values());
  }
  const paybackMedian: Record<string, number> = {};
  const paybackRecovered: Record<string, number> = {};
  const paybackCount: Record<string, number> = {};
  for (const k of ['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'] as BuildingKind[]) {
    const ps = allPlots.filter(p => p.kind === k && p.builtMonth <= 18 && p.invested > 0);
    paybackCount[k] = ps.length;
    if (!ps.length) continue;
    const vals = ps.map(p => p.paybackMonth ?? Infinity);
    paybackMedian[k] = quantile(vals, 0.5);
    paybackRecovered[k] = r2((ps.filter(p => p.paybackMonth !== null).length / ps.length) * 100);
  }
  const up = allPlots.filter(p => isUpgradable(p.kind) && p.builtMonth <= 18);
  const l3 = up.filter(p => p.level3Month !== null).map(p => p.level3Month!);
  const totalLevelUps = games.reduce((a, g) => a + g.levelUps, 0);
  const totalPlotMonths = games.reduce((a, g) => a + g.upgradablePlotMonths, 0);
  const lossRate = mean(games.map(g => (g.disasterLossTotal / (months / 12)) / Math.max(1, g.propertySum / months)));
  const assetsMedianAt: Record<number, number> = {};
  const buildingsMeanAt: Record<number, number> = {};
  for (const t of [6, 12, 24, months]) {
    assetsMedianAt[t] = r0(quantile(rows.map(r => r.tr.assetsAt[t]), 0.5));
    buildingsMeanAt[t] = r2(mean(rows.map(r => r.tr.buildingsAt[t])));
  }
  // 収入の構成比（建てる戦略のみ）
  const builders = rows.filter(r => r.strat !== 'fisher');
  const incKeys = Object.keys(builders[0].tr.income) as (keyof PTrack['income'])[];
  const incTot = incKeys.reduce((a, k) => a + builders.reduce((b, r) => b + Math.max(0, r.tr.income[k]), 0), 0);
  const incomeShare: Record<string, number> = {};
  for (const k of incKeys) incomeShare[k] = r2((builders.reduce((b, r) => b + Math.max(0, r.tr.income[k]), 0) / Math.max(1, incTot)) * 100);
  const inc12Tot = incKeys.reduce((a, k) => a + builders.reduce((b, r) => b + Math.max(0, r.tr.income12?.[k] ?? 0), 0), 0);
  const incomeShare12: Record<string, number> = {};
  for (const k of incKeys) incomeShare12[k] = r2((builders.reduce((b, r) => b + Math.max(0, r.tr.income12?.[k] ?? 0), 0) / Math.max(1, inc12Tot)) * 100);
  // 建物種別ごとの収益（ゲーム全体・建てた区画のみ）
  const kindRoi: CitySummary['kindRoi'] = {};
  for (const k of ['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'] as BuildingKind[]) {
    const ps = allPlots.filter(p => p.kind === k);
    if (!ps.length) continue;
    const inv = ps.reduce((a, p) => a + p.invested, 0);
    const cum = ps.reduce((a, p) => a + p.cum, 0);
    const months = ps.reduce((a, p) => a + (CITY_DEFAULT_MONTHS - p.builtMonth + 1), 0);
    kindRoi[k] = { n: r2(ps.length / games.length), invested: r0(inv / games.length), cum: r0(cum / games.length), roi: r2(cum / Math.max(1, inv)), perMonth: r0(cum / Math.max(1, months)) };
  }
  const kindGrowth: Record<string, number> = {};
  for (const k of ['res', 'com', 'ind', 'tourism']) {
    const ups = games.reduce((a, g) => a + (g.kindUps[k] ?? 0), 0);
    const pm = games.reduce((a, g) => a + (g.kindPlotMonths[k] ?? 0), 0);
    kindGrowth[k] = r2((ups / Math.max(1, pm)) * 100);
  }
  return {
    label,
    games: games.length,
    kindRoi,
    kindGrowth,
    level2Median: r0(quantile(up.map(p => p.level2Month ?? Infinity), 0.5)),
    tierMedian: {
      t1: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 1).length), 0.5),
      t2: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 2).length), 0.5),
      t3: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 3).length), 0.5),
    },
    vacatedPerGame: r2(mean(games.map(g => g.vacated))),
    ...(() => {
      const sp = games.flatMap(g => [...g.specsClosed, ...g.specs.values()]).filter(t => t.month <= 24);
      const rec = sp.filter(t => t.paybackMonth !== null);
      return {
        specialtyPayback: quantile(sp.map(t => t.paybackMonth ?? Infinity), 0.5),
        specialtyRecovered: r2((rec.length / Math.max(1, sp.length)) * 100),
      };
    })(),
    specialtiesOwnedAtEnd: r2(mean(games.map(g => Object.keys(g.state.specialties ?? {}).length))),
    regionMonoEverRate: r2((games.filter(g => g.regionMonoEver).length / games.length) * 100),
    regionMonoAtEndRate: r2((games.filter(g => Object.keys(regionalMonopolies(g.state.specialties)).length > 0).length / games.length) * 100),
    regionMonoMonthsPerGame: r2(mean(games.map(g => g.regionMonoMonths))),
    binboDamagePerGame: r0(mean(games.map(g => g.binboDamage))),
    binboLossPerGame: r0(mean(games.map(g => g.tracks.reduce((a, t) => a + t.binboLoss, 0)))),
    ...(() => {
      const shares = games.map(g => {
        const tot = g.binboMonths.reduce((a, b) => a + b, 0);
        return tot > 0 ? Math.max(...g.binboMonths) / tot : NaN;
      }).filter(Number.isFinite);
      const lossShares = games.flatMap(g => g.tracks.map(t => (t.binboLoss > 0 ? t.binboLoss / Math.max(1, t.assetsAt[months]) : NaN))).filter(Number.isFinite);
      return {
        binboMaxShareMedian: r2(quantile(shares, 0.5) * 100),
        binboMaxShareP90: r2(quantile(shares, 0.9) * 100),
        binboLossShareOfAssets: r2(quantile(lossShares, 0.5) * 100),
      };
    })(),
    visitorPerGame: r0(mean(games.map(g => g.visitorTotal))),
    cardUsesPerGame: (() => {
      const out: Record<string, number> = {};
      for (const g of games) for (const [k, v] of Object.entries(g.cardUses)) out[k] = (out[k] ?? 0) + v / games.length;
      for (const k of Object.keys(out)) out[k] = r2(out[k]);
      return out;
    })(),
    cardsBoughtPerGame: r2(mean(games.map(g => g.cardsBought))),
    awardsPerGame: r0(mean(games.map(g => g.awardsTotal))),
    vacantAtEnd: r2((games.reduce((a, g) => a + Object.values(g.state.towns).reduce((b, t) => b + t.plots.filter(p => p?.vacant).length, 0), 0)
      / Math.max(1, games.reduce((a, g) => a + Object.values(g.state.towns).reduce((b, t) => b + t.plots.filter(Boolean).length, 0), 0))) * 100),
    renovationsPerGame: r2(mean(games.map(g => g.renovations))),
    inspectionsPerGame: r2(mean(games.map(g => g.inspections))),
    resDemandHist: (() => {
      const h = [0, 1, 2, 3].map(k => games.reduce((a, g) => a + g.resDemandHist[k], 0));
      const t = h.reduce((a, b) => a + b, 0);
      return h.map(v => r2((v / Math.max(1, t)) * 100));
    })(),
    byStrategy,
    paybackMedian,
    paybackRecovered,
    paybackCount,
    level3Median: r0(quantile(l3, 0.5)),
    level3Rate: r2((l3.length / Math.max(1, up.length)) * 100),
    growthPerPlotMonth: r2((totalLevelUps / Math.max(1, totalPlotMonths)) * 100),
    annualDisasterLossRate: r2(lossRate * 100),
    leaderAt12Wins: r2((lead12 / games.length) * 100),
    leaderAt24Wins: r2((lead24 / games.length) * 100),
    winnerShareOfTotal: r2(mean(winnerShare) * 100),
    finalGapTop2: r2(mean(gaps) * 100),
    assetsMedianAt,
    buildingsMeanAt,
    incomeShare,
    incomeShare12,
  };
}

function formatCity(s: CitySummary): string {
  const L: string[] = [];
  L.push(`### ${s.label}（${s.games}局）`);
  L.push('| 戦略 | 最終総資産(平均) | SD | 勝率 | 建物数 | 災害損失 | 1回の最大損失率(p90) |');
  L.push('|---|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(s.byStrategy)) L.push(`| ${k} | ¥${v.assets} | ${v.assetsSd} | ${v.winRate}% | ${v.buildings} | ¥${v.disasterLoss} | ${v.maxLossShare}% |`);
  for (const [k, v] of Object.entries(s.byStrategy)) L.push(`- ${k} 現金¥${v.money} 建物¥${v.property} 保有 ${JSON.stringify(v.owned)} 収入 ${JSON.stringify(v.income)} 支出 ${JSON.stringify(v.spend)}`);
  L.push(`回収期間(中央値・月) ${JSON.stringify(s.paybackMedian)} / 回収できた割合% ${JSON.stringify(s.paybackRecovered)} / 件数 ${JSON.stringify(s.paybackCount)}`);
  L.push(`等級2到達(中央値) ${s.level2Median}か月 / 最高等級到達(中央値) ${s.level3Median}か月（到達率 ${s.level3Rate}%） / 自然成長 ${s.growthPerPlotMonth}%/区画・月 種別 ${JSON.stringify(s.kindGrowth)}`);
  L.push(`発展度(36か月・町の数の中央値) 壱以上 ${s.tierMedian.t1} / 弐以上 ${s.tierMedian.t2} / 参 ${s.tierMedian.t3}`);
  L.push(`名産: 回収 ${s.specialtyPayback}か月（中央値・24か月以内に買ったもの。回収できた割合 ${s.specialtyRecovered}%） / 最終月に持ち主のいる名産 ${s.specialtiesOwnedAtEnd}件`);
  L.push(`地方独占: 一度でも起きた局 ${s.regionMonoEverRate}% / 最終月にある局 ${s.regionMonoAtEndRate}% / 地方×月 ${s.regionMonoMonthsPerGame}（1局）`);
  L.push(`貧乏神: 被害額 ¥${s.binboDamagePerGame}/局（実損 ¥${s.binboLossPerGame}） / 一番長くとりつかれた人の割合 中央値 ${s.binboMaxShareMedian}%・p90 ${s.binboMaxShareP90}% / 実損÷最終総資産 ${s.binboLossShareOfAssets}%（中央値）`);
  L.push(`買い物代 ¥${s.visitorPerGame}/局 / 年度末の称号 ¥${s.awardsPerGame}/局 / カード使用 ${JSON.stringify(s.cardUsesPerGame)} 購入 ${s.cardsBoughtPerGame}枚/局`);
  L.push(`空き家の発生 ${s.vacatedPerGame}件/局 / 最終月の空き家率 ${s.vacantAtEnd}% / 修理 ${s.renovationsPerGame}件/局 / 視察 ${s.inspectionsPerGame}回/局`);
  L.push(`住宅区画の需要分布(>0 / -0.5〜0 / -1.5〜-0.5 / ≤-1.5) ${JSON.stringify(s.resDemandHist)}%`);
  L.push(`災害の年間損失率 ${s.annualDisasterLossRate}%（資産価値比）`);
  L.push(`12か月目の首位が勝つ率 ${s.leaderAt12Wins}% / 24か月目の首位が勝つ率 ${s.leaderAt24Wins}% / 1位と2位の差 ${s.finalGapTop2}% / 1位の資産シェア ${s.winnerShareOfTotal}%`);
  L.push(`総資産(中央値) ${JSON.stringify(s.assetsMedianAt)} / 建物数(平均) ${JSON.stringify(s.buildingsMeanAt)}`);
  L.push(`収入構成比(建てる戦略) ${JSON.stringify(s.incomeShare)}`);
  L.push(`収入構成比(建てる戦略・最初の12か月) ${JSON.stringify(s.incomeShare12)}`);
  L.push(`種別の収益(1局平均: 件数/投資/累計収入/倍率/1件1か月) ${JSON.stringify(s.kindRoi)}`);
  return L.join('\n');
}

function rotateRun(seedBase: number, lineup: Strategy[], perSeat: number): CGame[] {
  const games: CGame[] = [];
  for (let rot = 0; rot < lineup.length; rot++) {
    const seats = lineup.map((_, k) => lineup[(k + rot) % lineup.length]);
    for (let s = 1; s <= perSeat; s++) games.push(simulateCityGame(seedBase + rot * 1000 + s, seats));
  }
  return games;
}

/** 5つの「建てる」戦略から4人を選ぶ全組み合わせ × 席ローテーション（並びの偏りを消す） */
export const BUILDER_STRATEGIES: Strategy[] = ['res', 'indpow', 'tour', 'mono', 'demand'];
function fieldRun(seedBase: number, perSeat: number): CGame[] {
  const games: CGame[] = [];
  for (let skip = 0; skip < BUILDER_STRATEGIES.length; skip++) {
    const lineup = BUILDER_STRATEGIES.filter((_, k) => k !== skip);
    games.push(...rotateRun(seedBase + skip * 10000, lineup, perSeat));
  }
  return games;
}

export interface SoloSummary {
  strategy: Strategy;
  games: number;
  assets: number;
  naturalUps: number; // 1局あたりの自然成長の回数
  incomeAt12: number;
  incomeAt36: number;
  buildings: number;
}

/** 1人プレイ（対戦相手なし）でも町が育つかを見る */
export function soloRun(strategy: Strategy, seeds: number, months = CITY_DEFAULT_MONTHS): SoloSummary {
  const gs: CGame[] = [];
  for (let s = 1; s <= seeds; s++) gs.push(simulateCityGame(7000 + s, [strategy], months));
  return {
    strategy,
    games: seeds,
    assets: r0(mean(gs.map(g => g.tracks[0].assetsAt[months]))),
    naturalUps: r2(mean(gs.map(g => g.levelUps))),
    incomeAt12: r0(mean(gs.map(g => g.tracks[0].cityIncomeAt[12] ?? 0))),
    incomeAt36: r0(mean(gs.map(g => g.tracks[0].cityIncomeAt[months] ?? 0))),
    buildings: r2(mean(gs.map(g => g.tracks[0].buildingsAt[months]))),
  };
}

// ===== テスト =====

const ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const REPORT_DIR = ENV.BALANCE_REPORT_DIR;
// 調整用: BALANCE_SWEEP='[{"resIncome":180}, ...]' で CITY_ECONOMY を差し替えながら少数局で比較する
const SWEEP = ENV.BALANCE_SWEEP;
const report: string[] = [];

describe.skipIf(!SWEEP)('まちづくり: パラメータ掃引（調整用）', () => {
  it('掃引', () => {
    const base = { ...CITY_ECONOMY };
    const baseCosts = Object.fromEntries(Object.entries(BUILDING_INFO).map(([k, v]) => [k, v.cost]));
    const configs = JSON.parse(SWEEP!) as (Partial<typeof CITY_ECONOMY> & { costs?: Record<string, number>; festivalMoneyScale?: number; sp?: Partial<typeof SPECIALTY_ECONOMY>; binbo?: Partial<typeof BINBO> })[];
    const spBase = { ...SPECIALTY_ECONOMY };
    const binboBase = { ...BINBO };
    const out: string[] = [];
    // 祭りの宴の賞金（capitalEvents.ts）の元の値。festivalMoneyScale で倍率をかけて比較できる
    const feastBase = new Map<object, number>();
    for (const ev of Object.values(CAPITAL_EVENTS)) for (const c of ev.choices) if (c.effect.kind === 'feast') feastBase.set(c.effect, c.effect.moneyBonus);
    const setFeast = (k: number) => { for (const [eff, v] of feastBase) (eff as { moneyBonus: number }).moneyBonus = Math.round(v * k); };
    for (const cfg of configs) {
      const { costs, festivalMoneyScale, sp, binbo, ...eco } = cfg;
      setFeast(festivalMoneyScale ?? 1);
      Object.assign(SPECIALTY_ECONOMY, spBase, sp ?? {});
      Object.assign(BINBO, binboBase, binbo ?? {});
      Object.assign(CITY_ECONOMY, base, eco);
      for (const [k, v] of Object.entries(BUILDING_INFO)) v.cost = costs?.[k] ?? baseCosts[k];
      const a = summarizeCity('field', fieldRun(Number(ENV.BALANCE_SWEEP_BASE ?? 100), Number(ENV.BALANCE_SWEEP_SEEDS ?? 3)));
      const w = (s: CitySummary) => Object.entries(s.byStrategy).map(([k, v]) => `${k}:${v.winRate}%/¥${Math.round(v.assets / 1000)}k`).join(' ');
      const solo = BUILDER_STRATEGIES.map(st => soloRun(st, 10)).map(o => `${o.strategy}:¥${Math.round(o.assets / 1000)}k/成長${o.naturalUps}/月収${o.incomeAt12}→${o.incomeAt36}`).join(' ');
      out.push(`${JSON.stringify(cfg)}\n  ${w(a)} | pay ${JSON.stringify(a.paybackMedian)} L2 ${a.level2Median} grow ${JSON.stringify(a.kindGrowth)} dis ${a.annualDisasterLossRate}% p90loss ${Math.max(...Object.values(a.byStrategy).map(v => v.maxLossShare))}% lead12 ${a.leaderAt12Wins}% lead24 ${a.leaderAt24Wins}% early ${JSON.stringify(a.incomeShare12)} tier ${JSON.stringify(a.tierMedian)} vac ${a.vacatedPerGame}/${a.vacantAtEnd}% ren ${a.renovationsPerGame}\n  spec pay ${a.specialtyPayback}(${a.specialtyRecovered}%) mono ${a.regionMonoEverRate}/${a.regionMonoAtEndRate}% binbo ¥${a.binboDamagePerGame}(実損¥${a.binboLossPerGame}, 資産比${a.binboLossShareOfAssets}%) max ${a.binboMaxShareMedian}/${a.binboMaxShareP90}% visitor ¥${a.visitorPerGame} award ¥${a.awardsPerGame} cards ${JSON.stringify(a.cardUsesPerGame)}\n  solo ${solo}`);
    }
    Object.assign(CITY_ECONOMY, base);
    Object.assign(SPECIALTY_ECONOMY, spBase);
    Object.assign(BINBO, binboBase);
    for (const [k, v] of Object.entries(BUILDING_INFO)) v.cost = baseCosts[k];
    setFeast(1);
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/city-sweep.txt`, out.join('\n'));
  }, 900_000);
});

describe.skipIf(!!SWEEP)('まちづくりバランス（ヘッドレス36か月シミュレーション）', () => {
  let field: CitySummary;
  let withFisher: CitySummary;
  let solos: SoloSummary[];

  beforeAll(() => {
    field = summarizeCity('5戦略の総当たり（4人選出×席ローテーション）', fieldRun(100, 8));
    withFisher = summarizeCity('釣り専念を交えた対戦', rotateRun(900, ['fisher', 'demand', 'res', 'indpow'], 6));
    solos = BUILDER_STRATEGIES.map(st => soloRun(st, 20));
    report.push('## まちづくりモード', formatCity(field), formatCity(withFisher));
    report.push(['### 1人プレイ（20局平均）', '| 戦略 | 最終総資産 | 自然成長の回数 | 12か月目の月収 | 36か月目の月収 | 建物数 |', '|---|---|---|---|---|---|',
      ...solos.map(o => `| ${o.strategy} | ¥${o.assets} | ${o.naturalUps} | ¥${o.incomeAt12} | ¥${o.incomeAt36} | ${o.buildings} |`)].join('\n'));
  }, 600_000);

  afterAll(() => {
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/city-balance.md`, report.join('\n\n'));
  });

  it('単一の必勝戦略がない（各戦略の勝率 8〜45%、4人戦の均等は25%）', () => {
    for (const s of BUILDER_STRATEGIES) {
      expect(field.byStrategy[s].winRate, s).toBeGreaterThanOrEqual(8);
      expect(field.byStrategy[s].winRate, s).toBeLessThanOrEqual(45);
    }
  });

  it('戦略間の最終総資産の差が極端でない（最下位 ≥ 首位の60%）', () => {
    const assets = BUILDER_STRATEGIES.map(s => field.byStrategy[s].assets);
    expect(Math.min(...assets) / Math.max(...assets)).toBeGreaterThanOrEqual(0.6);
  });

  it('建物の回収期間はおおむね10〜20か月（公園は維持費のみなので対象外）', () => {
    for (const k of ['res', 'com', 'ind', 'power', 'tourism', 'port']) {
      expect(field.paybackMedian[k], k).toBeGreaterThanOrEqual(9);
      expect(field.paybackMedian[k], k).toBeLessThanOrEqual(21);
    }
  });

  it('町は1年ほどで目に見えて育つ（等級2到達の中央値 ≤ 14か月）', () => {
    expect(field.level2Median).toBeLessThanOrEqual(14);
    expect(field.growthPerPlotMonth).toBeGreaterThanOrEqual(4);
  });

  it('災害は痛いが致命的でない（年間損失は資産価値の2〜8%、1回で失うのはp90でも35%以下）', () => {
    expect(field.annualDisasterLossRate).toBeGreaterThanOrEqual(2);
    expect(field.annualDisasterLossRate).toBeLessThanOrEqual(8);
    for (const s of BUILDER_STRATEGIES) expect(field.byStrategy[s].maxLossShare, s).toBeLessThanOrEqual(35);
  });

  it('終盤まで逆転の余地がある（12か月目の首位が勝つ率 ≤ 60%、24か月目 ≤ 80%）', () => {
    expect(field.leaderAt12Wins).toBeLessThanOrEqual(60);
    expect(field.leaderAt24Wins).toBeLessThanOrEqual(80);
  });

  it('1人プレイでも町が育つ（住宅・需要追従・独占は1局で自然成長8回以上、12か月目の月収 ¥1,500以上）', () => {
    for (const o of solos.filter(x => x.strategy === 'res' || x.strategy === 'demand' || x.strategy === 'mono')) {
      expect(o.naturalUps, o.strategy).toBeGreaterThanOrEqual(8);
      expect(o.incomeAt12, o.strategy).toBeGreaterThanOrEqual(1500);
    }
  });

  it('空き家は起きるが町の1割以下（最終月の空き家率 2〜10%）', () => {
    expect(field.vacantAtEnd).toBeGreaterThanOrEqual(2);
    expect(field.vacantAtEnd).toBeLessThanOrEqual(10);
  });

  it('発展度は36か月で多くの町が壱に、いくつかの町が参に届く', () => {
    expect(field.tierMedian.t1).toBeGreaterThanOrEqual(10);
    expect(field.tierMedian.t3).toBeGreaterThanOrEqual(2);
  });

  it('名産は安全な資産として回収できる（回収 9〜21か月）', () => {
    expect(field.specialtyPayback).toBeGreaterThanOrEqual(9);
    expect(field.specialtyPayback).toBeLessThanOrEqual(21);
  });

  it('貧乏神は痛いが致命的でなく、特定の人に張り付きすぎない', () => {
    expect(field.binboDamagePerGame).toBeGreaterThan(0);
    expect(field.binboLossShareOfAssets).toBeLessThanOrEqual(10);
    expect(field.binboMaxShareMedian).toBeLessThanOrEqual(60);
    expect(field.binboMaxShareP90).toBeLessThanOrEqual(75);
  });

  it('買い物代は実際に行き交う（1局 ¥3,000以上）', () => {
    expect(field.visitorPerGame).toBeGreaterThanOrEqual(3000);
  });

  it('まちの収入が主役で、序盤は釣り・祭りの収入も意味を持つ', () => {
    expect(field.incomeShare.city).toBeGreaterThanOrEqual(55);
    expect(field.incomeShare12.city).toBeGreaterThanOrEqual(40);
    expect(field.incomeShare12.fish).toBeGreaterThanOrEqual(3);
    // 釣りだけでは勝てない（まちを作らないと総資産で大きく負ける）
    expect(withFisher.byStrategy.fisher.winRate).toBe(0);
  });
});
