// CPU の町長としての判断（純粋関数）。どの条例を出すか、町長の座にどれだけの値打ちがあるか。
import type { CityState, Plot, TownState, TownStats } from './city';
import { computeAllStats, plotIncome, poweredTownsWithBuildings, monopolyOwner, isUpgradable, MAX_BUILDING_LEVEL, CITY_ECONOMY, tourismGrowthDemand } from './city';
import type { OrdinanceKind } from './mayor';
import { ORDINANCE_KINDS, canEnact, ordinanceContext, ordinancePlotIncome, ordinanceMonthlyCost, mayorOf } from './mayor';

/** CPU の町長判断の重み（ゲームの数値ではなく、CPU の考え方） */
export const CPU_MAYOR = {
  /** 1段育つことの値打ち（その建物の1段ぶんの月収 × この月数ぶん。育った後もずっと入るため） */
  growthMonths: 6,
  /** 条例を替えるのは、月々これ以上得になるときだけ（工事1回を使うため） */
  minGain: 40,
  /** 町長になる工事への上乗せ: 最良の条例の得 × 見通しの月数 × この割合 */
  seatGainShare: 0.5,
  /** 町長の座そのものの値打ち（他人に町税を取られない・景観条例で工場を締め出せる等） */
  seatBonus: { steady: 600, monopoly: 1500, racer: 400 } as Record<'steady' | 'monopoly' | 'racer', number>,
};

/** 月末の自然成長の確率（city.simulateRound と同じ式） */
function growChance(d: number, happiness: number): number {
  const E = CITY_ECONOMY;
  return Math.max(
    d > 0 ? Math.min(E.growthMax, E.growthBase + d * E.growthPerDemand) : 0,
    d > E.growthFloorMinDemand && happiness >= E.growthFloorHappiness ? E.growthFloor : 0,
  );
}

function demandFor(p: Plot, st: TownStats): number {
  if (p.kind === 'res') return st.demand.r;
  if (p.kind === 'com') return st.demand.c;
  if (p.kind === 'ind') return st.demand.i;
  return tourismGrowthDemand(st.happiness);
}

function withOrdinance(state: CityState, nodeId: string, playerIndex: number, kind: OrdinanceKind | null): CityState {
  const town = state.towns[nodeId];
  const next: TownState = { ...town, ordinance: kind ? { kind, by: playerIndex, turn: 0 } : undefined };
  if (!kind) delete next.ordinance;
  return { ...state, towns: { ...state.towns, [nodeId]: next } };
}

/**
 * 町長 playerIndex が、この町の条例を kind（null はなし）にしたときの、この町での月々の損得の見込み。
 * 自分の建物の月収（観光振興を含む）＋町税の受け取り−条例の負担＋育つ見込み。町が1つの町だけに効くので、この町だけを見る。
 */
export function mayorTownValue(state: CityState, nodeId: string, playerIndex: number, kind: OrdinanceKind | null): number {
  const trial = withOrdinance(state, nodeId, playerIndex, kind);
  const town = trial.towns[nodeId];
  if (!town) return 0;
  const st = computeAllStats(trial).get(nodeId);
  if (!st) return 0;
  const ctx = ordinanceContext(town);
  const mono = monopolyOwner(town);
  let v = 0;
  for (const p of town.plots) {
    if (!p) continue;
    let inc = plotIncome(p, nodeId, st, p.kind === 'power' ? poweredTownsWithBuildings(trial, nodeId) : 0);
    if (inc > 0 && mono === p.owner) inc = Math.round(inc * CITY_ECONOMY.monopolyMul);
    const o = ordinancePlotIncome(ctx, p, inc);
    if (p.owner !== playerIndex) {
      if (ctx?.mayor === playerIndex) v += o.tax;
      continue;
    }
    v += o.income - (ctx && ctx.mayor !== playerIndex ? o.tax : 0);
    if (isUpgradable(p.kind) && !p.vacant && p.level < MAX_BUILDING_LEVEL && o.income > 0) {
      v += growChance(demandFor(p, st), st.happiness) * (o.income / p.level) * CPU_MAYOR.growthMonths;
    }
  }
  if (ctx?.mayor === playerIndex) v -= ordinanceMonthlyCost(ctx.kind);
  return v;
}

/**
 * 町長として出す条例を選ぶ（kind が null なら今の条例をやめる）。今のままより月々 minGain 以上得にならなければ null。
 * 町長でない・今月もう決めた、などで決められないときも null。
 */
export function chooseOrdinance(state: CityState, nodeId: string, playerIndex: number, money: number, turn: number): { kind: OrdinanceKind | null; gain: number } | null {
  const town = state.towns[nodeId];
  if (!town || mayorOf(town) !== playerIndex) return null;
  const current = town.ordinance?.kind ?? null;
  const base = mayorTownValue(state, nodeId, playerIndex, current);
  let best: { kind: OrdinanceKind | null; gain: number } | null = null;
  const options: (OrdinanceKind | null)[] = current ? [...ORDINANCE_KINDS, null] : ORDINANCE_KINDS;
  for (const kind of options) {
    if (canEnact(state, nodeId, playerIndex, kind, money, turn)) continue;
    const gain = mayorTownValue(state, nodeId, playerIndex, kind) - base;
    if (!best || gain > best.gain) best = { kind, gain };
  }
  return best && best.gain >= CPU_MAYOR.minGain ? best : null;
}

/**
 * 町長の座の値打ち（その工事で町長になるときに上乗せする）。
 * 座そのものの値打ち＋、なった後に出せる最良の条例の得×見通しの月数×seatGainShare。
 */
export function mayorSeatValue(next: CityState, nodeId: string, playerIndex: number, horizon: number, style: 'steady' | 'monopoly' | 'racer'): number {
  const town = next.towns[nodeId];
  if (!town || mayorOf(town) !== playerIndex) return 0;
  const current = town.ordinance?.kind ?? null;
  const base = mayorTownValue(next, nodeId, playerIndex, current);
  let bestGain = 0;
  for (const kind of ORDINANCE_KINDS) {
    if (kind === current) continue;
    bestGain = Math.max(bestGain, mayorTownValue(next, nodeId, playerIndex, kind) - base);
  }
  return CPU_MAYOR.seatBonus[style] + bestGain * horizon * CPU_MAYOR.seatGainShare;
}
