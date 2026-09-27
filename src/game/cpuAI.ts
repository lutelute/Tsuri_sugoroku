// CPU 対戦相手の判断（純粋関数）。ストアや React に依存しない。
// 釣り旅・まちづくりの両モードで「どの道を進むか」「何を建てるか」「何を買うか」などを決める。
//
// 性格:
//  - steady  堅実型: 需要に合わせて建て、お金を残す
//  - monopoly 独占型: 独占の完成と買収を優先
//  - racer   目的地型: 目的地（釣り旅ではゴールや名所）への道を最優先
import type { Player, BoardNode, CapitalEvent, EquipmentType, Fish } from './types';
import type { CityState, BuildingKind, Plot } from './city';
import {
  getTownInfo, computeAllStats, plotIncome, poweredTownsWithBuildings, monopolyOwner, distancesFrom,
  build, upgrade, acquire, renovate, buildCost, canBuild, isUpgradable, MAX_BUILDING_LEVEL, CITY_ECONOMY, visitorFees,
} from './city';
import { NODE_MAP } from '../data/boardNodes';
import { EQUIPMENT_DATA } from '../data/equipmentData';
import { SHOP_TIER_MAX_LEVEL, MAX_EQUIPMENT_LEVEL } from './constants';
import { isSpecialtyNode, specialtyBuyCost, regionOfSpecialty, regionSpecialtyIds } from './citySpecialties';
import { getEquippedLevel, getEquipmentLevels, getEquippedItem } from './equipment';
import { computeDistanceToGoal } from '../utils/pathfinding';
import { random } from '../utils/random';

export type CpuStyle = 'steady' | 'monopoly' | 'racer';

export const CPU_STYLE_LABEL: Record<CpuStyle, string> = {
  steady: '堅実',
  monopoly: '独占',
  racer: '目的地',
};

export const CPU_STYLES: CpuStyle[] = ['steady', 'monopoly', 'racer'];

const GOAL_DIST = computeDistanceToGoal();

// ===== 道選び =====

export interface PathContext {
  paths: string[][];
  mode: 'fishing' | 'city';
  player: Player;
  playerIndex: number;
  city: CityState | null;
  turn: number;
  maxTurns: number;
  goalClaims: number[];
  /** 貧乏神がとりついている人と、全員の現在地（押し付け合いの判断） */
  binboHolder?: number | null;
  playerNodes?: string[];
}

function cheapestBuildCost(nodeId: string, city: CityState): number {
  const info = getTownInfo(nodeId);
  if (!info) return Infinity;
  return Math.min(...info.allowed.map(k => buildCost(k, nodeId, city.towns[nodeId])));
}

function repairNeeded(player: Player): boolean {
  return player.equipment.inventory.some(i => Object.values(player.equipment.equipped).includes(i.id) && i.durability < 55);
}

function canUpgradeAtShop(player: Player, node: BoardNode): boolean {
  const maxLevel = SHOP_TIER_MAX_LEVEL[node.shopTier ?? 1] ?? 3;
  return (['rod', 'reel', 'lure'] as EquipmentType[]).some(t => {
    const lv = getEquippedLevel(player.equipment, t);
    const next = EQUIPMENT_DATA.find(e => e.type === t && e.level === lv + 1);
    return !!next && next.level <= maxLevel && player.money >= next.cost + 500;
  });
}

function scoreFishingEndpoint(ctx: PathContext, nodeId: string): number {
  const node = NODE_MAP.get(nodeId);
  if (!node) return -99;
  const hasRod = !!getEquippedItem(ctx.player.equipment, 'rod');
  const lateness = ctx.maxTurns > 0 ? ctx.turn / ctx.maxTurns : 0.4;
  let s = 0;
  switch (node.type) {
    case 'fishing_special': s = hasRod ? 7 : 0; break;
    case 'fishing': s = hasRod ? 5 : 0; break;
    case 'capital': s = 4; break;
    case 'shop': s = !hasRod ? 9 : canUpgradeAtShop(ctx.player, node) ? 4 : 0.5; break;
    case 'start': s = !hasRod ? 6 : canUpgradeAtShop(ctx.player, node) ? 2 : 0; break;
    case 'event_good': s = 2.5; break;
    case 'event_random': s = 1; break;
    case 'event_bad': s = -3; break;
    case 'rest': s = repairNeeded(ctx.player) ? 4 : 0.8; break;
    case 'route': s = 0.3; break;
    case 'goal': s = lateness > 0.72 ? 14 : -2; break;
  }
  // 終盤ほどゴールへ近づくことを重視
  const d0 = GOAL_DIST.get(ctx.player.currentNode) ?? 40;
  const d1 = GOAL_DIST.get(nodeId) ?? 40;
  const w = Math.max(0, Math.min(1, (lateness - 0.45) * 2.5)) * (ctx.player.cpuStyle === 'racer' ? 1.6 : 1);
  s += (d0 - d1) * 1.1 * w;
  return s;
}

function scoreCityEndpoint(ctx: PathContext, nodeId: string): number {
  const city = ctx.city!;
  const node = NODE_MAP.get(nodeId);
  if (!node) return -99;
  const style = ctx.player.cpuStyle ?? 'steady';
  let s = 0;
  // 目的地
  if (city.destination) {
    if (nodeId === city.destination) s += 25;
    const dd = distancesFrom(city.destination);
    const d0 = dd.get(ctx.player.currentNode) ?? 40;
    const d1 = dd.get(nodeId) ?? 40;
    s += (d0 - d1) * (style === 'racer' ? 3.2 : style === 'monopoly' ? 1.4 : 2);
  }
  const town = city.towns[nodeId];
  if (town) {
    const empty = town.plots.filter(p => !p).length;
    const mine = town.plots.filter(p => p && p.owner === ctx.playerIndex).length;
    const others = town.plots.filter(p => p && p.owner !== ctx.playerIndex).length;
    if (empty > 0 && ctx.player.money >= cheapestBuildCost(nodeId, city)) s += 4;
    // 自分の建物がある町は視察になる。空き家が迫っていれば優先して見に行く
    if (mine > 0) s += 2 + (style === 'monopoly' ? 1.5 : 0);
    if (town.plots.some(p => p && p.owner === ctx.playerIndex && (p.vacant || (p.lowMonths ?? 0) > 0))) s += 3;
    if (mine > 0 && others === 0 && empty > 0 && empty <= 2) s += style === 'monopoly' ? 8 : 5; // 独占が目前
  }
  // 他人の店の多い町は買い物代がかかる（¥200ごとに1点減点）
  s -= visitorFees(city, nodeId, ctx.playerIndex, ctx.player.money).total / 200;
  if (node.type === 'event_good') s += 2;
  if (node.type === 'event_bad') s -= 2.5;
  if (node.type === 'goal') s += ctx.goalClaims.includes(ctx.playerIndex) ? -1 : 8;
  return s;
}

/** 進む経路の index を返す */
export function chooseCpuPath(ctx: PathContext): number {
  let best = 0;
  let bestScore = -Infinity;
  ctx.paths.forEach((path, i) => {
    const end = path[path.length - 1];
    let base = ctx.mode === 'city' && ctx.city ? scoreCityEndpoint(ctx, end) : scoreFishingEndpoint(ctx, end);
    // 貧乏神がとりついていたら、他の駒のいるマスを通って押し付ける
    if (ctx.binboHolder === ctx.playerIndex && ctx.playerNodes) {
      const others = new Set(ctx.playerNodes.filter((_, j) => j !== ctx.playerIndex));
      if (path.slice(1).some(id => others.has(id))) base += 7;
    }
    const score = base + random() * 0.9; // 同点を散らす程度の気まぐれ
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

// ===== まちづくり: 工事の判断 =====

/** プレイヤーの月収の見込み（月末処理の収入計算と同じ考え方。成長・災害は含めない） */
export function playerMonthlyIncome(state: CityState, playerIndex: number): number {
  const stats = computeAllStats(state);
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    const st = stats.get(id);
    if (!st) continue;
    const mono = monopolyOwner(town);
    for (const p of town.plots) {
      if (!p || p.owner !== playerIndex) continue;
      let v = plotIncome(p, id, st, p.kind === 'power' ? poweredTownsWithBuildings(state, id) : 0);
      if (v > 0 && mono === playerIndex) v = Math.round(v * CITY_ECONOMY.monopolyMul);
      total += v;
    }
  }
  return total;
}

export type CityAction =
  | { type: 'build'; plot: number; kind: BuildingKind }
  | { type: 'upgrade'; plot: number }
  | { type: 'acquire'; plot: number }
  | { type: 'renovate'; plot: number };

const RESERVE: Record<CpuStyle, number> = { steady: 3000, monopoly: 1200, racer: 1800 };
const HORIZON = 18; // 何か月で元を取れるかの見通し

/** 今いる町で行う工事を1つ選ぶ（なければ null） */
export function chooseCityAction(state: CityState, nodeId: string, playerIndex: number, money: number, style: CpuStyle, monthsLeft: number): CityAction | null {
  const town = state.towns[nodeId];
  const info = getTownInfo(nodeId);
  if (!town || !info) return null;
  const reserve = RESERVE[style];
  const horizon = Math.max(3, Math.min(HORIZON, monthsLeft));
  const baseIncome = playerMonthlyIncome(state, playerIndex);
  const wasMono = monopolyOwner(town) === playerIndex;

  const candidates: { action: CityAction; value: number }[] = [];
  const evaluate = (action: CityAction, next: CityState, cost: number) => {
    if (money - cost < reserve) return;
    const gain = playerMonthlyIncome(next, playerIndex) - baseIncome;
    // 建物は資産として残るので、費用の一部は戻ってくる扱い
    let value = gain * horizon - cost * 0.55;
    const nowMono = monopolyOwner(next.towns[nodeId]) === playerIndex;
    if (nowMono && !wasMono) value += (style === 'monopoly' ? 9000 : 4500);
    candidates.push({ action, value });
  };

  const empty = town.plots.findIndex(p => !p);
  if (empty >= 0) {
    for (const kind of info.allowed) {
      if (canBuild(state, nodeId, kind, empty, money)) continue;
      const r = build(state, nodeId, empty, kind, playerIndex, money, 0);
      if (r.ok) evaluate({ type: 'build', plot: empty, kind }, r.state, r.cost);
    }
  }
  town.plots.forEach((p: Plot | null, i) => {
    if (!p) return;
    if (p.owner === playerIndex && p.vacant) {
      const r = renovate(state, nodeId, i, playerIndex, money);
      if (r.ok) evaluate({ type: 'renovate', plot: i }, r.state, r.cost);
    } else if (p.owner === playerIndex && isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL) {
      const r = upgrade(state, nodeId, i, playerIndex, money);
      if (r.ok) evaluate({ type: 'upgrade', plot: i }, r.state, r.cost);
    } else if (p.owner !== playerIndex && (style === 'monopoly' || empty < 0)) {
      const r = acquire(state, nodeId, i, playerIndex, money);
      if (r.ok) evaluate({ type: 'acquire', plot: i }, r.state, r.cost);
    }
  });

  candidates.sort((a, b) => b.value - a.value);
  const best = candidates[0];
  return best && best.value > 0 ? best.action : null;
}

// ===== 釣り旅: 買い物・祭り・釣り =====

/** 釣具店で買う装備（1回に1つ。なければ null） */
export function chooseShopPurchase(player: Player, shopTier: number): { type: EquipmentType; level: number; cost: number } | null {
  const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] ?? 3;
  const levels = getEquipmentLevels(player.equipment);
  // 低いものから（同じなら 竿 → リール → ルアー）
  const order = (['rod', 'reel', 'lure'] as EquipmentType[]).sort((a, b) => levels[a] - levels[b]);
  for (const type of order) {
    const lv = levels[type];
    if (lv >= MAX_EQUIPMENT_LEVEL) continue;
    const next = EQUIPMENT_DATA.find(e => e.type === type && e.level === lv + 1);
    if (!next || next.level > maxLevel) continue;
    if (player.money - next.cost >= 800) return { type, level: next.level, cost: next.cost };
  }
  return null;
}

/** 県の祭りの選択肢から最も得なものを選ぶ */
export function chooseCapitalChoice(event: CapitalEvent, player: Player): string {
  const levels = getEquipmentLevels(player.equipment);
  const avg = (levels.rod + levels.reel + levels.lure) / 3;
  const damaged = player.equipment.inventory.reduce((s, it) => s + (100 - it.durability), 0);
  let best = event.choices[0]?.id ?? '';
  let bestValue = -Infinity;
  for (const c of event.choices) {
    const e = c.effect;
    let v = 0;
    switch (e.kind) {
      case 'money': v = e.amount; break;
      case 'feast': v = e.moneyBonus + damaged * 12; break;
      case 'extra_turn': v = 1600; break;
      case 'lore_event': v = 0; break;
      case 'specialty_shop': {
        const cur = getEquippedLevel(player.equipment, e.equipmentType);
        v = player.money >= e.price + 800 && e.level > cur ? (e.level - cur) * 2200 - e.price * 0.4 : -1;
        break;
      }
      case 'special_fishing': {
        const chance = Math.max(0.15, Math.min(0.92, 0.55 + (avg / 5) * 0.32 - (e.difficulty - 1) * 0.08));
        v = chance * (e.reward + 1500);
        break;
      }
    }
    if (v > bestValue) {
      bestValue = v;
      best = c.id;
    }
  }
  return best;
}

const RARITY_PENALTY: Record<Fish['rarity'], number> = { common: 0, uncommon: 0.07, rare: 0.16, legendary: 0.28, mythical: 0.38 };

/** CPU の釣りの成否（ミニゲームは遊ばず、装備とレア度から確率で決める） */
export function cpuCatchChance(player: Player, fish: Fish): number {
  const levels = getEquipmentLevels(player.equipment);
  const avg = (levels.rod + levels.reel + levels.lure) / 3;
  const noReel = !getEquippedItem(player.equipment, 'reel');
  return Math.max(0.12, Math.min(0.93, 0.78 - RARITY_PENALTY[fish.rarity] + (avg - 1) * 0.055 - (noReel ? 0.2 : 0)));
}


// ===== まちづくり: 名産 =====

/**
 * 今いる町の名産を買うか（県庁でも、名物で知られる町でも同じ）。空きなら予備費を残して買い、他人のものは独占型か、
 * 地方独占が完成する・大金持ちのときだけ買収する。
 */
export function shouldBuySpecialty(owners: Record<string, number> | undefined, nodeId: string, playerIndex: number, money: number, style: CpuStyle): boolean {
  if (!isSpecialtyNode(nodeId)) return false;
  const owner = owners?.[nodeId];
  if (owner === playerIndex) return false;
  const cost = specialtyBuyCost(owners, nodeId);
  const reserve = RESERVE[style];
  if (owner === undefined) return money - cost >= reserve;
  const region = regionOfSpecialty(nodeId);
  const completes = !!region && regionSpecialtyIds(region).every(id => id === nodeId || owners?.[id] === playerIndex);
  if (completes) return money - cost >= reserve * 0.5;
  return style === 'monopoly' ? money - cost >= reserve + 4000 : money - cost >= 25000;
}
