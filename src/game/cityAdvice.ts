// まちづくりの「損得の見込み」（純粋関数）。建てる前に「月にいくら入り、何か月で元が取れるか」を出す。
// CPU の工事選び（cpuAI.chooseCityAction）と同じ計算（建てた後の月収 − 今の月収）なので、
// 公園が自分の住宅を押し上げる分や、発電所が自分の店に電気を届ける分、独占で3倍になる分も入る。
// 季節・景気・成長は含めない（今の町の姿のままなら、という見込み）。
import type { BuildingKind, CityState, TownStats } from './city';
import {
  computeAllStats, plotIncome, poweredTownsWithBuildings, monopolyOwner, getTownInfo, build, upgrade, acquire, canBuild, buildCost,
  isUpgradable, recoveryMonthsLeft, CITY_ECONOMY, tourismGrowthDemand,
} from './city';
import { ordinanceContext, ordinancePlotIncome, ordinanceMonthlyCost, mayorOf } from './mayor';

/** 見込みの判定の境目（企画書の案1。建物の回収期間の目標「10〜20か月」に合わせてある） */
export const ADVICE = {
  /** ◎: この月数以内に元が取れる */
  bestMonths: 12,
  /** ○: この月数以内に元が取れる（△ は残りの月数以内、× はそれ以上か収入なし） */
  goodMonths: 20,
  /** 商業地: 近くに住む人がこれより少ないと「客が少ない」 */
  customersMin: 60,
  /** 育ちやすさ 1・2・3 になる、月ごとの成長の確率 */
  growthSteps: [0.05, 0.2, 0.35],
  /** 足りないもの: 需要がこれ以上なら「足りない」、幸福度がこれ未満なら「公園が足りない」 */
  needDemand: 0.5,
  needHappiness: 4,
};

/** プレイヤーの月収の見込み（月末処理の収入計算と同じ考え方。条例の町税・負担も含む。成長・災害は含めない） */
export function playerMonthlyIncome(state: CityState, playerIndex: number): number {
  const stats = computeAllStats(state);
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    const st = stats.get(id);
    if (!st) continue;
    const mono = monopolyOwner(town);
    const ord = ordinanceContext(town);
    const taxer = ord?.kind === 'tax' && ord.mayor === playerIndex; // 町長として町税を受け取る町
    for (const p of town.plots) {
      if (!p || (p.owner !== playerIndex && !taxer)) continue;
      let v = plotIncome(p, id, st, p.kind === 'power' ? poweredTownsWithBuildings(state, id) : 0);
      if (v > 0 && mono === p.owner) v = Math.round(v * CITY_ECONOMY.monopolyMul);
      const o = ordinancePlotIncome(ord, p, v);
      total += p.owner === playerIndex ? o.income - o.tax : o.tax;
    }
    if (ord?.mayor === playerIndex) total -= ordinanceMonthlyCost(ord.kind);
  }
  return total;
}

/**
 * 見込みの判定。
 * best ◎ = 12か月以内 / good ○ = 20か月以内 / slow △ = 残りの月数以内 / never × = それ以上か収入なし /
 * support 支え = 公園・発電所で、収入は少ないが町を助ける（幸福度・電気）
 */
export type AdviceVerdict = 'best' | 'good' | 'slow' | 'never' | 'support';

/** 見込みに添える理由（悪い方: 電気なし・客が少ない・余っている / 良い方: 独占が完成・町長になれる・復興の割引き） */
export type AdviceReason = 'no_power' | 'no_customers' | 'low_demand' | 'completes_monopoly' | 'becomes_mayor' | 'recovery_discount';

/** 悪い方の理由（× や △ の物に1行で出す） */
export const ADVICE_BAD_REASONS: readonly AdviceReason[] = ['no_power', 'no_customers', 'low_demand'];

export interface ActionPreview {
  cost: number;
  /** 自分の月収の増え方（季節・成長は含めない） */
  gain: number;
  /** 元を取る月数。gain <= 0 なら null */
  payback: number | null;
  verdict: AdviceVerdict;
  reasons: AdviceReason[];
}

export interface BuildPreview extends ActionPreview {
  kind: BuildingKind;
  /** 育ちやすさ（0 = ほとんど育たない 〜 3 = よく育つ。公園・発電所・漁港は 0） */
  growth: 0 | 1 | 2 | 3;
  /** 今は建てられない理由（canBuild の文。建てられるなら null）。お金が足りないだけなら見込みは出す */
  blocked: string | null;
  /** いちばんのおすすめ（建てられる物のうち、○ 以上でいちばん早く元が取れる物。1つだけ） */
  recommended: boolean;
}

export type TownNeed = 'power' | 'park' | 'homes' | 'shops' | 'jobs';

/** 元を取る月数（端数は切り上げ。収入が増えなければ null） */
export function paybackMonths(cost: number, gain: number): number | null {
  return gain > 0 ? Math.max(1, Math.ceil(cost / gain)) : null;
}

/** 判定の印を決める。supportKind は公園・発電所（元が遅くても × にせず「支え」と出す） */
export function verdictFor(payback: number | null, monthsLeft: number, supportKind = false): AdviceVerdict {
  if (payback !== null && payback <= ADVICE.bestMonths) return 'best';
  if (payback !== null && payback <= ADVICE.goodMonths) return 'good';
  if (supportKind) return 'support';
  if (payback !== null && payback <= monthsLeft) return 'slow';
  return 'never';
}

/** 月ごとに育つ確率（city.simulateRound の自然成長と同じ式。視察の上乗せは含めない） */
function growthChance(kind: BuildingKind, st: TownStats): number {
  if (!isUpgradable(kind)) return 0;
  const E = CITY_ECONOMY;
  const d = kind === 'res' ? st.demand.r : kind === 'com' ? st.demand.c : kind === 'ind' ? st.demand.i : tourismGrowthDemand(st.happiness);
  return Math.max(
    d > 0 ? Math.min(E.growthMax, E.growthBase + d * E.growthPerDemand) : 0,
    d > E.growthFloorMinDemand && st.happiness >= E.growthFloorHappiness ? E.growthFloor : 0,
  );
}

function growthLevel(chance: number): 0 | 1 | 2 | 3 {
  const [a, b, c] = ADVICE.growthSteps;
  return chance < a ? 0 : chance < b ? 1 : chance < c ? 2 : 3;
}

/** 工事の前後を比べて、良い方の理由（独占が完成・町長になれる・復興の割引き）を拾う */
function goodReasons(before: CityState, after: CityState, nodeId: string, playerIndex: number, discount: boolean): AdviceReason[] {
  const out: AdviceReason[] = [];
  const t0 = before.towns[nodeId];
  const t1 = after.towns[nodeId];
  if (monopolyOwner(t1) === playerIndex && monopolyOwner(t0) !== playerIndex) out.push('completes_monopoly');
  else if (mayorOf(t1) === playerIndex && mayorOf(t0) !== playerIndex) out.push('becomes_mayor');
  if (discount && recoveryMonthsLeft(t0) > 0) out.push('recovery_discount');
  return out;
}

/**
 * 空き地に建てられる物それぞれの見込み（町で建てられる種類の順）。
 * money が足りない物も見込みは出す（blocked に理由。おすすめにはしない）。
 * monthsLeft は残りの月数（△ と × の境目）。turn は建てた巡の記録に使うだけ。
 */
export function previewBuild(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number, turn: number, monthsLeft: number): BuildPreview[] {
  const info = getTownInfo(nodeId);
  const town = state.towns[nodeId];
  if (!info || !town) return [];
  const base = playerMonthlyIncome(state, playerIndex);
  const now = computeAllStats(state).get(nodeId);

  const out: BuildPreview[] = info.allowed.map(kind => {
    const cost = buildCost(kind, nodeId, town);
    const blocked = canBuild(state, nodeId, kind, plotIndex, money);
    // お金が足りないだけなら、建てたつもりで見込みを出す
    const r = build(state, nodeId, plotIndex, kind, playerIndex, Infinity, turn);
    if (!r.ok) return { kind, cost, gain: 0, payback: null, verdict: 'never', reasons: [], growth: 0, blocked: blocked ?? r.reason, recommended: false };

    const gain = playerMonthlyIncome(r.state, playerIndex) - base;
    const payback = paybackMonths(cost, gain);
    const after = computeAllStats(r.state).get(nodeId);
    const reasons: AdviceReason[] = [];
    if (after && !after.powered && (kind === 'res' || kind === 'com' || kind === 'ind')) reasons.push('no_power');
    if (after && kind === 'com' && after.popNear < ADVICE.customersMin) reasons.push('no_customers');
    // 「今は余っている」は建てる前の需要で見る（建てた後は自分の1軒ぶん下がるため）
    const demandNow = !now ? 0 : kind === 'res' ? now.demand.r : kind === 'com' ? now.demand.c : kind === 'ind' ? now.demand.i : 0;
    if (demandNow < 0) reasons.push('low_demand');
    reasons.push(...goodReasons(state, r.state, nodeId, playerIndex, true));
    return {
      kind, cost, gain, payback,
      verdict: verdictFor(payback, monthsLeft, kind === 'park' || kind === 'power'),
      reasons,
      growth: after ? growthLevel(growthChance(kind, after)) : 0,
      blocked,
      recommended: false,
    };
  });

  // おすすめ: 今すぐ建てられて ○ 以上のうち、いちばん早く元が取れる物（同じなら月収の増え方が大きい物）
  let best: BuildPreview | null = null;
  for (const p of out) {
    if (p.blocked || p.payback === null || (p.verdict !== 'best' && p.verdict !== 'good')) continue;
    if (!best || p.payback < best.payback! || (p.payback === best.payback && p.gain > best.gain)) best = p;
  }
  if (best) best.recommended = true;
  return out;
}

/** 再開発（等級を1つ上げる）の見込み。自分の建物でない・最高等級・空き家などで再開発できなければ null */
export function previewUpgrade(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, monthsLeft = Infinity): ActionPreview | null {
  const r = upgrade(state, nodeId, plotIndex, playerIndex, Infinity);
  if (!r.ok) return null;
  const gain = playerMonthlyIncome(r.state, playerIndex) - playerMonthlyIncome(state, playerIndex);
  const payback = paybackMonths(r.cost, gain);
  return { cost: r.cost, gain, payback, verdict: verdictFor(payback, monthsLeft), reasons: goodReasons(state, r.state, nodeId, playerIndex, true) };
}

/** 買収の見込み（代金は地上げの札を使わない値段）。自分の建物・建物なしなら null */
export function previewAcquire(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, monthsLeft = Infinity): ActionPreview | null {
  const r = acquire(state, nodeId, plotIndex, playerIndex, Infinity);
  if (!r.ok) return null;
  const gain = playerMonthlyIncome(r.state, playerIndex) - playerMonthlyIncome(state, playerIndex);
  const payback = paybackMonths(r.cost, gain);
  // 買収は復興の割引きが効かない
  return { cost: r.cost, gain, payback, verdict: verdictFor(payback, monthsLeft), reasons: goodReasons(state, r.state, nodeId, playerIndex, false) };
}

/**
 * この町に足りないもの: 電気が来ていない / 幸福度が低い（公園）/ 住・商・工の需要が高い。
 * 店と働き口は、その町で建てられるときだけ出す（建てられない物を足りないと言っても手が打てない）。
 */
export function townNeeds(state: CityState, nodeId: string): TownNeed[] {
  const info = getTownInfo(nodeId);
  const st = computeAllStats(state).get(nodeId);
  if (!info || !st) return [];
  const out: TownNeed[] = [];
  if (!st.powered) out.push('power');
  if (st.happiness < ADVICE.needHappiness) out.push('park');
  if (st.demand.r >= ADVICE.needDemand) out.push('homes');
  if (st.demand.c >= ADVICE.needDemand && info.allowed.includes('com')) out.push('shops');
  if (st.demand.i >= ADVICE.needDemand && info.allowed.includes('ind')) out.push('jobs');
  return out;
}
