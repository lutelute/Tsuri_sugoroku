// 釣り旅モードのヘッドレス・バランスシミュレーション。
// ストア(useGameStore)と同じ純粋関数（selectFish / applyEvent / applyDurabilityLoss / calculateScore …）を
// そのまま使い、80巡のプレイを「典型的な方針」で模擬して数値の偏りを測る。
//
// ■ 仮定（人間の操作を置き換えた部分）
//  - ミニゲーム成功率 = ストライク成功率 × 取り込み成功率。
//      ストライク: 緑ゾーン幅 g に対して min(0.95, 0.25 + 1.8g)（Lv1≈0.74 / Lv5≈0.95）
//      取り込み: ミニゲーム係のボット計測（reelSim.ts・慣れた子）をレア度×実効リールLvで補間（reelProb。リール無しは×0.6）
//  - 移動: 到達可能マスの中から「釣り場・県庁所在地・店を好み、最終巡までにゴールへ着くペース」で選ぶ（寄り道型）。
//          直行型は常にゴールへ最短で進む（4人戦で「早抜け」が得かを見る）。
//  - 止まったら釣る（1ターン最大3回）。店（県庁所在地は祭りの後）ではお金が貯まっていれば最も弱い装備から買い替える。
//  - 県庁所在地の祭りは「装備の修理代＋賞金」「特産品の装備」「名物釣り」から期待値が最大の選択肢を選ぶ。
//  - 休憩所では耐久度70未満の装着品を修理する。お金に余裕があり装備が育っていれば名所で船釣りする。
//
// 計測結果を見たいときは BALANCE_REPORT_DIR=/path npx vitest run src/game/balance.fishing.sim.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { Player, EquipmentType, FishRarity, EventCard, PlayerEquipment, ScoreBreakdown } from './types';
import { selectFish, createCaughtFish, checkTairyou, getEffectiveLevel, getStrikeGreenZone } from './fishing';
import {
  createInitialEquipment, createEquipmentItem, applyDurabilityLoss, getEquipmentLevels, getEquippedItem,
  getEquippedLevel, isBroken, calculateRepairCost, repairItem,
} from './equipment';
import { applyEvent } from './events';
import { calculateScore } from './scoring';
import {
  FISH_SELL_PRICE, INITIAL_MONEY, REST_MONEY_BONUS, GOAL_MONEY_REWARD, BOAT_FISHING_COST, SHOP_TIER_MAX_LEVEL,
  DEFAULT_MAX_TURNS, REGION_COMPLETE_BONUS,
} from './constants';
import { getEquipment } from '../data/equipmentData';
import { NODE_MAP } from '../data/boardNodes';
import { EVENT_CARDS } from '../data/eventCards';
import { getCapitalEvent } from '../data/capitalEvents';
import { FISH_DATABASE } from '../data/fishDatabase';
import { getReachableNodes, computeDistanceToGoal } from '../utils/pathfinding';
import { setRandomSource, resetRandomSource, mulberry32, random, randomInt } from '../utils/random';
import type { BoardNode } from './types';

const RARITIES: FishRarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
const TYPES: EquipmentType[] = ['rod', 'lure', 'reel']; // 同レベル時の買い替え優先順
const GOAL_DIST = computeDistanceToGoal();
const START_DIST = GOAL_DIST.get('start') ?? 36;
const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));
const MAX_FISHING_PER_TURN = 3; // useGameStore と同じ


export type Policy = 'wander' | 'direct';
type Phase = 'early' | 'mid' | 'late';

interface Tracker {
  policy: Policy;
  moneyAt: number[]; // index = 巡
  avgLvAt: number[];
  lv3Turn: number | null;
  firstRarityTurn: Partial<Record<FishRarity, number>>;
  fished: Record<Phase, Record<FishRarity, number>>;
  eventFish: Record<FishRarity, number>;
  attempts: number;
  successes: number;
  income: { fish: number; eventPlus: number; eventMinus: number; capital: number; rest: number; goal: number };
  spend: { equip: number; repair: number; boat: number };
  goalTurn: number | null;
  upgrades: number;
  boatTrips: number;
  shopVisits: number;
  capitalChoices: Record<string, number>;
  recent: string[];
  speciesByRegion: Record<string, Set<string>>; // 釣った場所の地方ごとの魚種
  freeUpgrades: number;
}

function emptyRarity(): Record<FishRarity, number> {
  return { common: 0, uncommon: 0, rare: 0, legendary: 0, mythical: 0 };
}

function newTracker(policy: Policy): Tracker {
  return {
    policy,
    moneyAt: [],
    avgLvAt: [],
    lv3Turn: null,
    firstRarityTurn: {},
    fished: { early: emptyRarity(), mid: emptyRarity(), late: emptyRarity() },
    eventFish: emptyRarity(),
    attempts: 0,
    successes: 0,
    income: { fish: 0, eventPlus: 0, eventMinus: 0, capital: 0, rest: 0, goal: 0 },
    spend: { equip: 0, repair: 0, boat: 0 },
    goalTurn: null,
    upgrades: 0,
    boatTrips: 0,
    shopVisits: 0,
    capitalChoices: {},
    recent: [],
    speciesByRegion: {},
    freeUpgrades: 0,
  };
}

function makePlayer(i: number): Player {
  return {
    id: i,
    name: `P${i + 1}`,
    color: '#fff',
    currentNode: 'start',
    money: INITIAL_MONEY,
    equipment: createInitialEquipment(),
    caughtFish: [],
    score: 0,
    hasFinished: false,
    finishOrder: null,
    skipNextTurn: false,
    extraTurn: false,
    fishBonusMultiplier: 1,
    fishBonusTurnsLeft: 0,
  };
}

function avgLevel(eq: PlayerEquipment): number {
  const l = getEquipmentLevels(eq);
  return (l.rod + l.reel + l.lure) / 3;
}

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

/** ミニゲーム成功率の近似（仮定はファイル冒頭） */
export function successProb(eq: PlayerEquipment, rarity: FishRarity): number {
  const g = getStrikeGreenZone(getEffectiveLevel(eq, 'strike'));
  const pStrike = Math.min(0.95, 0.25 + 1.8 * g);
  return Math.max(0, pStrike * reelProb(eq, rarity));
}

/** 壊れて外れたスロットに、持ち物のうち最良の壊れていない装備を付け直す */
function reequip(eq: PlayerEquipment): PlayerEquipment {
  const equipped = { ...eq.equipped };
  for (const t of TYPES) {
    if (equipped[t]) continue;
    const cand = eq.inventory.filter(i => i.type === t && !isBroken(i)).sort((a, b) => b.level - a.level)[0];
    if (cand) equipped[t] = cand.id;
  }
  return { ...eq, equipped };
}

function phaseOf(turn: number, maxTurns: number): Phase {
  if (turn <= maxTurns / 3) return 'early';
  if (turn <= (maxTurns * 2) / 3) return 'mid';
  return 'late';
}

function drawEvent(type?: 'good' | 'bad' | 'random'): EventCard {
  const pool = type ? EVENT_CARDS.filter(e => e.type === type) : EVENT_CARDS;
  return pool[Math.floor(random() * pool.length)];
}

/** シナリオ切り替え。capitalShop: 県庁所在地（shopTier あり）では祭りの結果の後に店へ進む（v4.1 の本番仕様） */
export const SIM_OPTIONS = { capitalShop: true };

interface Game {
  players: Player[];
  trackers: Tracker[];
  encs: Record<string, boolean>[];
  maxTurns: number;
  finished: number;
}

function recordCatch(g: Game, i: number, fishId: string, turn: number, fromEvent: boolean) {
  const f = FISH_MAP.get(fishId);
  if (!f) return;
  g.encs[i][fishId] = true;
  const tr = g.trackers[i];
  const region = NODE_MAP.get(g.players[i].currentNode)?.region;
  if (region) (tr.speciesByRegion[region] ??= new Set()).add(fishId);
  if (fromEvent) tr.eventFish[f.rarity]++;
  else tr.fished[phaseOf(turn, g.maxTurns)][f.rarity]++;
  if (tr.firstRarityTurn[f.rarity] === undefined) tr.firstRarityTurn[f.rarity] = turn;
}

function finish(g: Game, i: number, turn: number) {
  const p = g.players[i];
  if (p.hasFinished) return;
  const reward = GOAL_MONEY_REWARD[g.finished] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1];
  p.hasFinished = true;
  p.finishOrder = g.finished;
  p.money += reward;
  g.trackers[i].income.goal += reward;
  g.trackers[i].goalTurn = turn;
  g.finished++;
}

function typeValue(node: BoardNode, p: Player): number {
  const hasRod = !!getEquippedItem(p.equipment, 'rod');
  switch (node.type) {
    case 'fishing': return hasRod ? 3 : 0;
    case 'fishing_special': return hasRod ? 4.5 : 0;
    case 'capital': return 3;
    case 'shop': return p.money >= 2500 ? 3.5 : 0.5;
    case 'rest': {
      const worn = TYPES.some(t => (getEquippedItem(p.equipment, t)?.durability ?? 0) < 50);
      return worn ? 2.5 : 1;
    }
    case 'event_good': return 2;
    case 'event_random': return 1;
    case 'event_bad': return -2;
    case 'start': return -1;
    default: return 0;
  }
}

function chooseEndpoint(g: Game, i: number, paths: string[][], turn: number): string {
  const p = g.players[i];
  const tr = g.trackers[i];
  const ends = paths.map(pa => pa[pa.length - 1]);
  const curD = GOAL_DIST.get(p.currentNode) ?? 99;
  const remaining = g.maxTurns - turn;
  // 1ターン平均3マス前進として、最終巡に間に合わなくなりそうなら急ぐ
  const hurry = tr.policy === 'direct' || curD / 3 >= remaining - 3;
  let best = ends[0];
  let bestScore = -Infinity;
  for (const e of ends) {
    const node = NODE_MAP.get(e);
    if (!node) continue;
    const d = GOAL_DIST.get(e) ?? 99;
    let s: number;
    if (e === 'goal') s = hurry ? 1e6 : -1e6;
    else if (hurry) s = -d * 10 + typeValue(node, p) * 0.5 + random() * 0.1;
    else {
      // 目標ペース: 最終巡の数ターン前にゴール圏へ
      const desired = START_DIST * Math.max(0, 1 - (turn + 1) / (g.maxTurns - 6));
      s = typeValue(node, p)
        - 0.6 * Math.max(0, d - desired)
        - 0.15 * Math.max(0, desired - d)
        - (tr.recent.includes(e) ? 1.5 : 0)
        + random();
    }
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  return best;
}

/** 1回釣る（成功/失敗にかかわらず耐久度が減る＝endFishing と同じ） */
function fishOnce(g: Game, i: number, node: BoardNode, turn: number, boat: boolean) {
  const p = g.players[i];
  const tr = g.trackers[i];
  const isSpecial = node.type === 'fishing_special';
  const fish = selectFish(node.id, node.region, p.equipment, isSpecial, boat);
  tr.attempts++;
  if (random() < successProb(p.equipment, fish.rarity)) {
    tr.successes++;
    const all = [createCaughtFish(fish.id, node.id, turn, p.equipment)];
    const bonus = checkTairyou(p.equipment, isSpecial);
    for (let k = 0; k < bonus; k++) {
      const extra = selectFish(node.id, node.region, p.equipment, isSpecial, boat);
      all.push(createCaughtFish(extra.id, node.id, turn, p.equipment));
    }
    let sale = 0;
    for (const c of all) {
      const fd = FISH_MAP.get(c.fishId);
      sale += fd ? Math.round((FISH_SELL_PRICE[fd.rarity] ?? 200) * c.size) : 200;
      recordCatch(g, i, c.fishId, turn, false);
    }
    p.caughtFish = [...p.caughtFish, ...all.map(c => ({ ...c, bonusMultiplier: p.fishBonusMultiplier }))];
    p.money += sale;
    tr.income.fish += sale;
  }
  p.equipment = reequip(applyDurabilityLoss(p.equipment));
}

function doFishing(g: Game, i: number, node: BoardNode, turn: number) {
  const p = g.players[i];
  if (!getEquippedItem(p.equipment, 'rod')) return;
  const tr = g.trackers[i];
  // 船釣り: お金と装備に余裕があるときだけ（¥10,000で3回）
  const boat = node.type === 'fishing_special' && p.money >= BOAT_FISHING_COST + 6000 && avgLevel(p.equipment) >= 3;
  if (boat) {
    p.money -= BOAT_FISHING_COST;
    tr.spend.boat += BOAT_FISHING_COST;
    tr.boatTrips++;
  }
  for (let k = 0; k < MAX_FISHING_PER_TURN; k++) {
    if (!getEquippedItem(p.equipment, 'rod')) break;
    fishOnce(g, i, node, turn, boat);
  }
}

/** 店: 最も弱い装備から、買える範囲で最も良いものに買い替える（予備費¥1,000は残す） */
function doShop(g: Game, i: number, maxLevel: number) {
  const p = g.players[i];
  const tr = g.trackers[i];
  tr.shopVisits++;
  const RESERVE = 1000;
  for (let guard = 0; guard < 6; guard++) {
    const order = [...TYPES].sort((a, b) => getEquippedLevel(p.equipment, a) - getEquippedLevel(p.equipment, b));
    let bought = false;
    for (const t of order) {
      const cur = getEquippedLevel(p.equipment, t);
      for (let lv = maxLevel; lv > cur; lv--) {
        const eq = getEquipment(t, lv);
        if (!eq || eq.cost <= 0) continue;
        if (p.money - RESERVE >= eq.cost) {
          const item = createEquipmentItem(t, lv);
          p.money -= eq.cost;
          tr.spend.equip += eq.cost;
          tr.upgrades++;
          p.equipment = { equipped: { ...p.equipment.equipped, [t]: item.id }, inventory: [...p.equipment.inventory, item] };
          bought = true;
          break;
        }
      }
      if (bought) break;
    }
    if (!bought) break;
  }
}

function doRest(g: Game, i: number) {
  const p = g.players[i];
  const tr = g.trackers[i];
  p.money += REST_MONEY_BONUS;
  tr.income.rest += REST_MONEY_BONUS;
  // 各種の最良装備（壊れていても）を耐久度70未満なら修理
  for (const t of TYPES) {
    const best = p.equipment.inventory.filter(it => it.type === t).sort((a, b) => b.level - a.level)[0];
    if (!best || best.durability >= 70) continue;
    const cost = calculateRepairCost(best);
    if (p.money >= cost + 300) {
      p.money -= cost;
      tr.spend.repair += cost;
      p.equipment = repairItem(p.equipment, best.id);
      p.equipment = { ...p.equipment, equipped: { ...p.equipment.equipped, [t]: best.id } };
    }
  }
}

function doCapital(g: Game, i: number, node: BoardNode, turn: number) {
  const p = g.players[i];
  const tr = g.trackers[i];
  const ev = node.capitalEventId ? getCapitalEvent(node.capitalEventId) : undefined;
  if (!ev) {
    doShop(g, i, SHOP_TIER_MAX_LEVEL[node.shopTier ?? 1] ?? 3);
    return;
  }
  const repairValue = p.equipment.inventory
    .filter(it => TYPES.some(t => p.equipment.equipped[t] === it.id) || isBroken(it))
    .reduce((a, it) => a + calculateRepairCost(it), 0);
  const lv = getEquipmentLevels(p.equipment);
  const avg = (lv.rod + lv.reel + lv.lure) / 3;
  let best = ev.choices[0];
  let bestV = -Infinity;
  for (const c of ev.choices) {
    const e = c.effect;
    let v = -Infinity;
    switch (e.kind) {
      case 'feast': v = e.moneyBonus + repairValue; break;
      case 'specialty_shop': v = e.level > getEquippedLevel(p.equipment, e.equipmentType) && p.money >= e.price + 500 ? 1e5 : -Infinity; break;
      case 'special_fishing': {
        const chance = Math.max(0.15, Math.min(0.92, 0.55 + (avg / 5) * 0.32 - (e.difficulty - 1) * 0.08));
        const f = FISH_MAP.get(e.fishId);
        v = chance * (e.reward + (f ? f.points * 1.3 : 0));
        break;
      }
      case 'money': v = e.amount; break;
      case 'extra_turn': v = 1500; break;
      case 'lore_event': v = 0; break;
    }
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  tr.capitalChoices[best.effect.kind] = (tr.capitalChoices[best.effect.kind] ?? 0) + 1;
  const e = best.effect;
  switch (e.kind) {
    case 'feast':
      p.money += e.moneyBonus;
      tr.income.capital += e.moneyBonus;
      p.equipment = reequip({ ...p.equipment, inventory: p.equipment.inventory.map(it => ({ ...it, durability: 100 })) });
      break;
    case 'specialty_shop': {
      const item = createEquipmentItem(e.equipmentType, e.level);
      p.money -= e.price;
      tr.spend.equip += e.price;
      tr.upgrades++;
      p.equipment = { equipped: { ...p.equipment.equipped, [e.equipmentType]: item.id }, inventory: [...p.equipment.inventory, item] };
      break;
    }
    case 'special_fishing': {
      const chance = Math.max(0.15, Math.min(0.92, 0.55 + (avg / 5) * 0.32 - (e.difficulty - 1) * 0.08));
      if (random() < chance) {
        p.caughtFish = [...p.caughtFish, { fishId: e.fishId, caughtAt: node.id, turn, size: 1.3 }];
        p.money += e.reward;
        tr.income.capital += e.reward;
        recordCatch(g, i, e.fishId, turn, true);
      }
      break;
    }
    case 'money':
      p.money += e.amount;
      tr.income.capital += e.amount;
      break;
    case 'extra_turn':
      p.extraTurn = true;
      break;
    default:
      break;
  }
  // 祭りの結果を閉じた後、県庁所在地に店があれば寄る
  if (SIM_OPTIONS.capitalShop && node.shopTier) doShop(g, i, SHOP_TIER_MAX_LEVEL[node.shopTier] ?? 3);
}

function doEvent(g: Game, i: number, card: EventCard, turn: number) {
  const p = g.players[i];
  const tr = g.trackers[i];
  const beforeMoney = p.money;
  const beforeFish = p.caughtFish.length;
  const prevNode = p.currentNode;
  const res = applyEvent(p, card, turn);
  if (card.effect.kind === 'free_upgrade') tr.freeUpgrades++;
  Object.assign(p, res.player);
  const dm = p.money - beforeMoney;
  if (dm > 0) tr.income.eventPlus += dm;
  else tr.income.eventMinus += -dm;
  for (const c of p.caughtFish.slice(beforeFish)) recordCatch(g, i, c.fishId, turn, true);
  p.equipment = reequip(p.equipment);
  if (p.currentNode !== prevNode && NODE_MAP.get(p.currentNode)?.type === 'goal') finish(g, i, turn);
}

function playTurn(g: Game, i: number, turn: number) {
  const p = g.players[i];
  const tr = g.trackers[i];
  const dice = randomInt(1, 6);
  const paths = getReachableNodes(p.currentNode, dice);
  const dest = chooseEndpoint(g, i, paths, turn);
  p.currentNode = dest;
  tr.recent = [...tr.recent.slice(-4), dest];
  const node = NODE_MAP.get(dest)!;
  switch (node.type) {
    case 'fishing':
    case 'fishing_special':
      doFishing(g, i, node, turn);
      break;
    case 'shop':
    case 'start':
      doShop(g, i, SHOP_TIER_MAX_LEVEL[node.shopTier ?? 1] ?? 3);
      break;
    case 'event_good':
      doEvent(g, i, drawEvent('good'), turn);
      break;
    case 'event_bad':
      doEvent(g, i, drawEvent('bad'), turn);
      break;
    case 'event_random':
      doEvent(g, i, drawEvent(), turn);
      break;
    case 'rest':
      doRest(g, i);
      break;
    case 'route':
      if (random() < 0.5) doEvent(g, i, drawEvent(), turn);
      break;
    case 'capital':
      doCapital(g, i, node, turn);
      break;
    case 'goal':
      finish(g, i, turn);
      break;
  }
  // ターン終了: 釣りポイント倍率の残りターンを減らす（endTurn と同じ）
  if (p.fishBonusTurnsLeft > 0) {
    p.fishBonusTurnsLeft--;
    if (p.fishBonusTurnsLeft === 0) p.fishBonusMultiplier = 1;
  }
}

export interface FishingGameResult {
  players: Player[];
  trackers: Tracker[];
  scores: ScoreBreakdown[];
}

export function simulateFishingGame(seed: number, policies: Policy[], maxTurns = DEFAULT_MAX_TURNS): FishingGameResult {
  setRandomSource(mulberry32(seed));
  const g: Game = {
    players: policies.map((_, i) => makePlayer(i)),
    trackers: policies.map(pol => newTracker(pol)),
    encs: policies.map(() => ({})),
    maxTurns,
    finished: 0,
  };
  for (let turn = 1; turn <= maxTurns; turn++) {
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (p.hasFinished) continue;
      if (p.skipNextTurn) {
        p.skipNextTurn = false;
        continue;
      }
      for (let guard = 0; guard < 4; guard++) {
        playTurn(g, i, turn);
        if (!p.extraTurn || p.hasFinished) break;
        p.extraTurn = false;
      }
      p.extraTurn = false;
      const tr = g.trackers[i];
      if (tr.lv3Turn === null && avgLevel(p.equipment) >= 3) tr.lv3Turn = turn;
    }
    g.players.forEach((p, i) => {
      g.trackers[i].moneyAt[turn] = p.money;
      g.trackers[i].avgLvAt[turn] = avgLevel(p.equipment);
    });
    if (g.players.every(p => p.hasFinished)) {
      for (let t = turn + 1; t <= maxTurns; t++) g.players.forEach((p, i) => {
        g.trackers[i].moneyAt[t] = p.money;
        g.trackers[i].avgLvAt[t] = avgLevel(p.equipment);
      });
      break;
    }
  }
  resetRandomSource();
  return { players: g.players, trackers: g.trackers, scores: g.players.map((p, i) => calculateScore(p, g.encs[i])) };
}

// ===== 集計 =====

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}
const r0 = (v: number) => (Number.isFinite(v) ? Math.round(v) : NaN);
const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN);

export interface FishingSummary {
  label: string;
  n: number;
  goalRate: number;
  goalTurnMedian: number;
  moneyMedianAt: Record<number, number>;
  moneyMaxMedian: number;
  avgLvAt: Record<number, number>;
  lv3TurnMedian: number;
  lv3Never: number;
  rarityShare: Record<Phase, Record<FishRarity, number>>;
  fishedPerGame: Record<FishRarity, number>;
  eventFishPerGame: Record<FishRarity, number>;
  eventFishShareOfPoints: number;
  reachRate: Record<FishRarity, number>;
  firstTurnMedian: Record<FishRarity, number>;
  successRate: number;
  attemptsPerGame: number;
  score: Record<keyof ScoreBreakdown, number>;
  scoreShare: Record<string, number>;
  income: Record<string, number>;
  spend: Record<string, number>;
  upgradesPerGame: number;
  shopVisitsPerGame: number;
  boatTripsPerGame: number;
  capitalChoices: Record<string, number>;
  regionsWith: Record<number, number>; // k種以上釣った地方の数（平均）
  freeUpgradesPerGame: number;
}

export function summarize(label: string, results: { tr: Tracker; score: ScoreBreakdown; player: Player }[], maxTurns = DEFAULT_MAX_TURNS): FishingSummary {
  const n = results.length;
  const checkpoints = [10, 20, 40, 60, maxTurns];
  const moneyMedianAt: Record<number, number> = {};
  const avgLvAt: Record<number, number> = {};
  for (const t of checkpoints) {
    moneyMedianAt[t] = r0(quantile(results.map(r => r.tr.moneyAt[t] ?? r.tr.moneyAt[r.tr.moneyAt.length - 1]), 0.5));
    avgLvAt[t] = r2(mean(results.map(r => r.tr.avgLvAt[t] ?? r.tr.avgLvAt[r.tr.avgLvAt.length - 1])));
  }
  const rarityShare = { early: emptyRarity(), mid: emptyRarity(), late: emptyRarity() } as Record<Phase, Record<FishRarity, number>>;
  for (const ph of ['early', 'mid', 'late'] as Phase[]) {
    const tot = results.reduce((a, r) => a + RARITIES.reduce((b, k) => b + r.tr.fished[ph][k], 0), 0);
    for (const k of RARITIES) rarityShare[ph][k] = r2((results.reduce((a, r) => a + r.tr.fished[ph][k], 0) / Math.max(1, tot)) * 100);
  }
  const fishedPerGame = emptyRarity();
  const eventFishPerGame = emptyRarity();
  const reachRate = emptyRarity();
  const firstTurnMedian = emptyRarity();
  for (const k of RARITIES) {
    fishedPerGame[k] = r2(mean(results.map(r => r.tr.fished.early[k] + r.tr.fished.mid[k] + r.tr.fished.late[k])));
    eventFishPerGame[k] = r2(mean(results.map(r => r.tr.eventFish[k])));
    const reached = results.filter(r => r.tr.firstRarityTurn[k] !== undefined);
    reachRate[k] = r2((reached.length / n) * 100);
    firstTurnMedian[k] = r0(quantile(reached.map(r => r.tr.firstRarityTurn[k]!), 0.5));
  }
  // イベント由来の魚が魚ポイントに占める割合（おおよそ: 平均pt×匹数）
  const avgPts: Record<FishRarity, number> = emptyRarity();
  for (const k of RARITIES) avgPts[k] = mean(FISH_DATABASE.filter(f => f.rarity === k).map(f => f.points));
  const evPts = RARITIES.reduce((a, k) => a + eventFishPerGame[k] * avgPts[k], 0);
  const fiPts = RARITIES.reduce((a, k) => a + fishedPerGame[k] * avgPts[k], 0);
  const scoreKeys: (keyof ScoreBreakdown)[] = ['fishPoints', 'rarityBonus', 'regionBonus', 'encyclopediaBonus', 'giantFishBonus', 'finishBonus', 'moneyBonus', 'total'];
  const score = {} as Record<keyof ScoreBreakdown, number>;
  for (const k of scoreKeys) score[k] = r0(mean(results.map(r => r.score[k])));
  const scoreShare: Record<string, number> = {};
  for (const k of scoreKeys) if (k !== 'total') scoreShare[k] = r2((score[k] / Math.max(1, score.total)) * 100);
  const income: Record<string, number> = {};
  for (const k of Object.keys(results[0].tr.income) as (keyof Tracker['income'])[]) income[k] = r0(mean(results.map(r => r.tr.income[k])));
  const spend: Record<string, number> = {};
  for (const k of Object.keys(results[0].tr.spend) as (keyof Tracker['spend'])[]) spend[k] = r0(mean(results.map(r => r.tr.spend[k])));
  const capitalChoices: Record<string, number> = {};
  for (const r of results) for (const [k, v] of Object.entries(r.tr.capitalChoices)) capitalChoices[k] = (capitalChoices[k] ?? 0) + v / n;
  for (const k of Object.keys(capitalChoices)) capitalChoices[k] = r2(capitalChoices[k]);
  const lv3 = results.filter(r => r.tr.lv3Turn !== null).map(r => r.tr.lv3Turn!);
  return {
    label,
    n,
    goalRate: r2((results.filter(r => r.tr.goalTurn !== null).length / n) * 100),
    goalTurnMedian: r0(quantile(results.filter(r => r.tr.goalTurn !== null).map(r => r.tr.goalTurn!), 0.5)),
    moneyMedianAt,
    moneyMaxMedian: r0(quantile(results.map(r => Math.max(...r.tr.moneyAt.filter(v => v !== undefined))), 0.5)),
    avgLvAt,
    lv3TurnMedian: r0(quantile(lv3, 0.5)),
    lv3Never: r2(((n - lv3.length) / n) * 100),
    rarityShare,
    fishedPerGame,
    eventFishPerGame,
    eventFishShareOfPoints: r2((evPts / Math.max(1, evPts + fiPts)) * 100),
    reachRate,
    firstTurnMedian,
    successRate: r2((results.reduce((a, r) => a + r.tr.successes, 0) / Math.max(1, results.reduce((a, r) => a + r.tr.attempts, 0))) * 100),
    attemptsPerGame: r2(mean(results.map(r => r.tr.attempts))),
    score,
    scoreShare,
    income,
    spend,
    upgradesPerGame: r2(mean(results.map(r => r.tr.upgrades))),
    shopVisitsPerGame: r2(mean(results.map(r => r.tr.shopVisits))),
    boatTripsPerGame: r2(mean(results.map(r => r.tr.boatTrips))),
    capitalChoices,
    regionsWith: Object.fromEntries([3, 5, 8, 12].map(k => [k, r2(mean(results.map(r => Object.values(r.tr.speciesByRegion).filter(set => set.size >= k).length)))])),
    freeUpgradesPerGame: r2(mean(results.map(r => r.tr.freeUpgrades))),
  };
}

function runMany(label: string, seeds: number, policies: Policy[], pick: (i: number) => boolean = () => true) {
  const rows: { tr: Tracker; score: ScoreBreakdown; player: Player }[] = [];
  const games: FishingGameResult[] = [];
  for (let s = 1; s <= seeds; s++) {
    const res = simulateFishingGame(1000 + s, policies);
    games.push(res);
    res.players.forEach((p, i) => {
      if (pick(i)) rows.push({ tr: res.trackers[i], score: res.scores[i], player: p });
    });
  }
  return { summary: summarize(label, rows), games };
}

function formatSummary(s: FishingSummary): string {
  const L: string[] = [];
  L.push(`### ${s.label}（n=${s.n}）`);
  L.push(`ゴール到達率 ${s.goalRate}% / 到達巡(中央値) ${s.goalTurnMedian} / 試行 ${s.attemptsPerGame}回 成功率 ${s.successRate}%`);
  L.push(`所持金(中央値) ${Object.entries(s.moneyMedianAt).map(([t, v]) => `T${t}:¥${v}`).join(' ')} / 最高額(中央値) ¥${s.moneyMaxMedian}`);
  L.push(`平均装備Lv ${Object.entries(s.avgLvAt).map(([t, v]) => `T${t}:${v}`).join(' ')} / 平均Lv3到達巡(中央値) ${s.lv3TurnMedian}（未到達 ${s.lv3Never}%）`);
  L.push(`買い替え ${s.upgradesPerGame}回 / 無料アップグレード ${s.freeUpgradesPerGame}回 / 店訪問 ${s.shopVisitsPerGame}回 / 船釣り ${s.boatTripsPerGame}回 / 祭りの選択 ${JSON.stringify(s.capitalChoices)}`);
  L.push(`k種以上を釣った地方の数(平均) ${JSON.stringify(s.regionsWith)}`);
  L.push('| 時期 | common | uncommon | rare | legendary | mythical |');
  L.push('|---|---|---|---|---|---|');
  for (const ph of ['early', 'mid', 'late'] as Phase[]) L.push(`| ${ph} | ${RARITIES.map(k => s.rarityShare[ph][k] + '%').join(' | ')} |`);
  L.push(`| 釣果/局 | ${RARITIES.map(k => s.fishedPerGame[k]).join(' | ')} |`);
  L.push(`| イベント魚/局 | ${RARITIES.map(k => s.eventFishPerGame[k]).join(' | ')} |`);
  L.push(`| 到達率 | ${RARITIES.map(k => s.reachRate[k] + '%').join(' | ')} |`);
  L.push(`| 初回巡(中央値) | ${RARITIES.map(k => s.firstTurnMedian[k]).join(' | ')} |`);
  L.push(`イベント魚が魚ptに占める割合(概算) ${s.eventFishShareOfPoints}%`);
  L.push(`スコア平均 ${JSON.stringify(s.score)}`);
  L.push(`スコア構成比 ${JSON.stringify(s.scoreShare)}`);
  L.push(`収入平均 ${JSON.stringify(s.income)} / 支出平均 ${JSON.stringify(s.spend)}`);
  return L.join('\n');
}

// ===== テスト =====

const REPORT_DIR = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BALANCE_REPORT_DIR;
const report: string[] = [];

describe('釣り旅バランス（ヘッドレス80巡シミュレーション）', () => {
  let solo: FishingSummary;
  let quad: FishingSummary;
  let raceDirect: FishingSummary;
  let raceWander: FishingSummary;
  let raceWinRate = 0;
  let firstFinisherWinRate = 0;

  beforeAll(() => {
    solo = runMany('1人・寄り道型', 150, ['wander']).summary;
    const q = runMany('4人・全員寄り道型', 150, ['wander', 'wander', 'wander', 'wander']);
    quad = q.summary;
    // ゴール1着が勝つ率（到着順がどれくらい勝敗に効くか）
    const firstWins = q.games.filter(res => {
      const first = res.players.findIndex(p => p.finishOrder === 0);
      const totals = res.scores.map(sc => sc.total);
      return first >= 0 && totals[first] === Math.max(...totals);
    }).length;
    firstFinisherWinRate = (firstWins / q.games.length) * 100;
    // 早抜け検証: 席順の有利を消すため直行型の席をローテーション
    const directRows: { tr: Tracker; score: ScoreBreakdown; player: Player }[] = [];
    const wanderRows: { tr: Tracker; score: ScoreBreakdown; player: Player }[] = [];
    let directWins = 0;
    let games = 0;
    for (let seat = 0; seat < 4; seat++) {
      const pol: Policy[] = ['wander', 'wander', 'wander', 'wander'];
      pol[seat] = 'direct';
      for (let s = 1; s <= 15; s++) {
        const res = simulateFishingGame(5000 + seat * 100 + s, pol);
        games++;
        const totals = res.scores.map(sc => sc.total);
        if (totals[seat] === Math.max(...totals)) directWins++;
        res.players.forEach((p, i) => (i === seat ? directRows : wanderRows).push({ tr: res.trackers[i], score: res.scores[i], player: p }));
      }
    }
    raceDirect = summarize('4人・直行型（1人）', directRows);
    raceWander = summarize('4人・寄り道型（直行型1人と同卓）', wanderRows);
    raceWinRate = (directWins / games) * 100;
    report.push('## 釣り旅モード', formatSummary(solo), formatSummary(quad), formatSummary(raceDirect), formatSummary(raceWander));
    report.push(`4人・全員寄り道型でゴール1着が勝つ率 ${r2(firstFinisherWinRate)}%（均等なら25%）`);
    report.push(`直行型の勝率 ${r2(raceWinRate)}%（4人中1人なので公平なら25%）`);
    SIM_OPTIONS.capitalShop = false;
    const legacy = runMany('【参考】1人・寄り道型・県庁所在地で店が使えない旧仕様', 150, ['wander']).summary;
    SIM_OPTIONS.capitalShop = true;
    report.push(formatSummary(legacy));
  }, 240_000);

  afterAll(() => {
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/fishing-balance.md`, report.join('\n\n'));
  });

  const highTier = (r: Record<FishRarity, number>) => r.rare + r.legendary + r.mythical;

  it('序盤(Lv1装備)は common が主役で、レア以上は1割程度まで', () => {
    expect(solo.rarityShare.early.common).toBeGreaterThanOrEqual(55);
    expect(highTier(solo.rarityShare.early)).toBeLessThanOrEqual(12);
  });

  it('中盤は rare が時々（10〜28%）、legendary はまだ珍しい', () => {
    expect(solo.rarityShare.mid.rare).toBeGreaterThanOrEqual(10);
    expect(solo.rarityShare.mid.rare).toBeLessThanOrEqual(28);
    expect(solo.rarityShare.mid.legendary).toBeLessThanOrEqual(8);
  });

  it('終盤は legendary/mythical に手が届く（釣果の8〜25%、幻の魚は1人プレイの25〜75%が出会う）', () => {
    const lm = solo.rarityShare.late.legendary + solo.rarityShare.late.mythical;
    expect(lm).toBeGreaterThanOrEqual(8);
    expect(lm).toBeLessThanOrEqual(25);
    expect(solo.reachRate.mythical).toBeGreaterThanOrEqual(25);
    expect(solo.reachRate.mythical).toBeLessThanOrEqual(75);
  });

  it('装備の平均Lv3到達は中盤（全80巡の1/3〜2/3）', () => {
    expect(solo.lv3TurnMedian).toBeGreaterThanOrEqual(DEFAULT_MAX_TURNS / 3);
    expect(solo.lv3TurnMedian).toBeLessThanOrEqual((DEFAULT_MAX_TURNS * 2) / 3);
  });

  it('序盤にお金が足りなすぎない（20巡目の所持金 ≥ ¥5,000）', () => {
    expect(solo.moneyMedianAt[20]).toBeGreaterThanOrEqual(5000);
  });

  it('スコア内訳が1要素に偏らない（最大でも58%、5%以上の要素が4つ以上、残金は22%以下）', () => {
    for (const sm of [solo, quad]) {
      const shares = Object.values(sm.scoreShare);
      expect(Math.max(...shares)).toBeLessThanOrEqual(58);
      expect(shares.filter(v => v >= 5).length).toBeGreaterThanOrEqual(4);
      expect(sm.scoreShare.moneyBonus).toBeLessThanOrEqual(22);
    }
  });

  it('地域制覇は日本を巡れば届く（平均2地方以上）', () => {
    expect(solo.score.regionBonus).toBeGreaterThanOrEqual(2 * REGION_COMPLETE_BONUS);
  });

  it('4人戦ではゴールを急ぐ（釣りの時間を削る）こととゴール順位ボーナスが釣り合う（1着の勝率 15〜60%）', () => {
    expect(firstFinisherWinRate).toBeGreaterThanOrEqual(15);
    expect(firstFinisherWinRate).toBeLessThanOrEqual(60);
  });

  it('ゴールへ直行して早抜けするのが必勝にはならない', () => {
    expect(raceWinRate).toBeLessThanOrEqual(50);
    expect(raceWander.n).toBe(180);
  });
});
