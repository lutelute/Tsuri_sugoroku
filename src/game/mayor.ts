// 町長と条例（まちづくりモード）。React / ストアに依存しない純粋関数。
//
// ルール:
//  - 町長: 町の区画数の半分「より多く」の建物を持つ人。区画は発展で増えるので、町が育つと町長の座が空くことがある。
//    独占（city.monopolyOwner。もとの区画数以上を1人で持つ）している人は、区画の半分に届かなくても町長とみなす。
//  - 町長は町を訪れたとき、条例を1つ決められる（1か月に1回まで。工事の回数は使わない）。今の条例をやめることもできる。
//    「1か月に1回」は町の lastEnact で数える（やめた直後に別の条例を出す、を防ぐ）。
//  - 条例はその町の全員の建物に効く（町税は町長以外の建物の収入から取る）。
//  - 町長が替わっても条例は町に残り、新しい町長が引き継ぐ（月々の負担も新しい町長が払う）。
//  - 町長がいない町では条例はお休み（効果も負担も出ない）。誰かが町長になるとまた効き始める。
//
// city.ts がこのファイルを使う（計算の差し込み口）ので、ここから city.ts の値は読み込まない（型だけ）。
import type { CityActionResult, CityState, Plot, TownState } from './city';
import { NODE_MAP } from '../data/boardNodes';

// ===== 型 =====

export type OrdinanceKind = 'factory' | 'childcare' | 'tourism' | 'scenery' | 'tax';

/** 町に出ている条例（TownState.ordinance） */
export interface Ordinance {
  kind: OrdinanceKind;
  /** 決めた人 */
  by: number;
  /** 決めた巡（月） */
  turn: number;
}

/** 今効いている条例と、その町長 */
export interface OrdinanceContext {
  kind: OrdinanceKind;
  mayor: number;
}

// ===== 定数（難易度調整係が調整する） =====

export const ORDINANCE_ECONOMY = {
  /** 町長になるのに必要な、区画数に対する建物の割合（これ「より多く」） */
  mayorShare: 0.5,
  /** 工場誘致: 工業の需要 / 公害 */
  factoryIndDemand: 1.0,
  factoryPollution: 1.5,
  /** 子育て支援: 住宅の需要 / 町長の月々の負担 */
  childcareResDemand: 1.0,
  childcareCost: 150,
  /** 観光振興: 観光名所の収入の倍率 / 幸福度 / 町長の月々の負担 */
  tourismIncomeMul: 1.3,
  tourismHappiness: 0.5,
  tourismCost: 100,
  /** 景観条例: 幸福度（工業地の新築は禁止） */
  sceneryHappiness: 2,
  /**
   * 町税: 町長以外の建物の収入から町長へ入る割合 / 幸福度
   * （難易度調整係: 1割では幸福度−1 の損のほうが大きく、出した条例の7%・1局¥600しか動かなかった。2割で12%・1局¥1,700。
   *   それでもまちの収入の0.2%で、町税だけでは勝てない）
   */
  taxRate: 0.2,
  taxHappiness: -1,
  /** 条例を決めるときのお金 */
  enactCost: 0,
};

export const ORDINANCE_KINDS: OrdinanceKind[] = ['factory', 'childcare', 'tourism', 'scenery', 'tax'];

const E = ORDINANCE_ECONOMY;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const ORDINANCE_INFO: Record<OrdinanceKind, { name: string; short: string; effect: string; burden: string; color: string }> = {
  factory: { name: '工場誘致', short: '工', effect: `工業の需要+${E.factoryIndDemand}・公害+${E.factoryPollution}`, burden: 'なし', color: '#c99a2e' },
  childcare: { name: '子育て支援', short: '育', effect: `住宅の需要+${E.childcareResDemand}`, burden: `毎月¥${E.childcareCost}`, color: '#4f9d5d' },
  tourism: { name: '観光振興', short: '観', effect: `観光収入+${pct(E.tourismIncomeMul - 1)}・幸福度+${E.tourismHappiness}`, burden: `毎月¥${E.tourismCost}`, color: '#d9628a' },
  scenery: { name: '景観条例', short: '景', effect: `幸福度+${E.sceneryHappiness}・工業地の新築を禁止`, burden: 'なし', color: '#2f7f6a' },
  tax: { name: '町税', short: '税', effect: `ほかのプレイヤーの建物の収入の${pct(E.taxRate)}が町長へ・幸福度${E.taxHappiness}`, burden: 'なし', color: '#8a5a9a' },
};

// ===== 町長 =====

/** 独占している人（city.monopolyOwner と同じ判定。city.ts を読み込まないためここにも置く） */
function monopolist(town: TownState): number | null {
  const built = town.plots.filter((p): p is Plot => !!p);
  const need = town.base ?? town.plots.length;
  if (built.length === 0 || built.length < need) return null;
  const owner = built[0].owner;
  return built.every(p => p.owner === owner) ? owner : null;
}

/** 町長になるのに必要な建物の数（区画数の半分より多く） */
export function mayorThreshold(town: TownState): number {
  return Math.floor(town.plots.length * E.mayorShare) + 1;
}

/** 町長（いなければ null） */
export function mayorOf(town: TownState | undefined): number | null {
  if (!town) return null;
  const mono = monopolist(town);
  if (mono !== null) return mono;
  const need = mayorThreshold(town);
  const count = new Map<number, number>();
  for (const p of town.plots) if (p) count.set(p.owner, (count.get(p.owner) ?? 0) + 1);
  for (const [owner, n] of count) if (n >= need) return owner;
  return null;
}

/** その人の町長への近さ（UI・CPU 用）: 持っている建物の数・必要な数・今の町長 */
export function mayorStanding(town: TownState, playerIndex: number): { mine: number; need: number; mayor: number | null } {
  const mine = town.plots.filter(p => p && p.owner === playerIndex).length;
  return { mine, need: mayorThreshold(town), mayor: mayorOf(town) };
}

// ===== 条例の効き目 =====

/** 今効いている条例（町長がいない町ではお休みなので null） */
export function ordinanceContext(town: TownState | undefined): OrdinanceContext | null {
  const ord = town?.ordinance;
  if (!ord) return null;
  const mayor = mayorOf(town);
  return mayor === null ? null : { kind: ord.kind, mayor };
}

/** 町の状態への効き目（computeAllStats に足す） */
export function ordinanceStatsEffect(town: TownState | undefined): { happiness: number; pollution: number; r: number; i: number } {
  const ctx = ordinanceContext(town);
  const out = { happiness: 0, pollution: 0, r: 0, i: 0 };
  switch (ctx?.kind) {
    case 'factory': out.i = E.factoryIndDemand; out.pollution = E.factoryPollution; break;
    case 'childcare': out.r = E.childcareResDemand; break;
    case 'tourism': out.happiness = E.tourismHappiness; break;
    case 'scenery': out.happiness = E.sceneryHappiness; break;
    case 'tax': out.happiness = E.taxHappiness; break;
  }
  return out;
}

/** 景観条例で工業地の新築が禁止されているか */
export function isIndustryBanned(town: TownState | undefined): boolean {
  return ordinanceContext(town)?.kind === 'scenery';
}

/**
 * 1つの建物の月収への効き目（月末の収入配りと、CPU の見込みで同じ計算を使う）。
 * income は季節・独占を掛けたあとの月収。返り値の income は観光振興を掛けたもの、tax は持ち主から町長へ移す額。
 */
export function ordinancePlotIncome(ctx: OrdinanceContext | null, plot: Plot, income: number): { income: number; tax: number } {
  if (!ctx || income <= 0) return { income, tax: 0 };
  let v = income;
  if (ctx.kind === 'tourism' && plot.kind === 'tourism') v = Math.round(v * E.tourismIncomeMul);
  const tax = ctx.kind === 'tax' && plot.owner !== ctx.mayor ? Math.round(v * E.taxRate) : 0;
  return { income: v, tax };
}

/** 条例の月々の負担（町長が払う） */
export function ordinanceMonthlyCost(kind: OrdinanceKind | null | undefined): number {
  return kind === 'childcare' ? E.childcareCost : kind === 'tourism' ? E.tourismCost : 0;
}

// ===== 条例を決める =====

/** 条例を決められるか（kind が null なら今の条例をやめる）。できなければ理由 */
export function canEnact(state: CityState, nodeId: string, playerIndex: number, kind: OrdinanceKind | null, money: number, turn: number): string | null {
  const town = state.towns[nodeId];
  if (!town) return 'ここには条例がない';
  if (mayorOf(town) !== playerIndex) return '条例を決められるのは町長だけ';
  const cur = town.ordinance;
  const last = town.lastEnact ?? (cur ? { by: cur.by, turn: cur.turn } : undefined);
  if (last && last.by === playerIndex && last.turn === turn) return '条例は1か月に1回まで';
  if (kind === null) return cur ? null : 'やめる条例がない';
  if (cur?.kind === kind) return 'すでにこの条例が出ている';
  if (money < E.enactCost) return 'お金が足りない';
  return null;
}

/** 条例を決める（kind が null なら今の条例をやめる） */
export function enactOrdinance(state: CityState, nodeId: string, playerIndex: number, kind: OrdinanceKind | null, money: number, turn: number): CityActionResult {
  const err = canEnact(state, nodeId, playerIndex, kind, money, turn);
  if (err) return { ok: false, reason: err };
  const town = state.towns[nodeId];
  const name = NODE_MAP.get(nodeId)?.name ?? '';
  const prev = town.ordinance;
  const ordinance: Ordinance | undefined = kind ? { kind, by: playerIndex, turn } : undefined;
  const next: TownState = { ...town, ordinance, lastEnact: { by: playerIndex, turn } };
  if (!ordinance) delete next.ordinance;
  const message = kind
    ? `${name}に「${ORDINANCE_INFO[kind].name}」の条例を出した`
    : `${name}の「${prev ? ORDINANCE_INFO[prev.kind].name : ''}」の条例をやめた`;
  return { ok: true, state: { ...state, towns: { ...state.towns, [nodeId]: next } }, cost: kind ? E.enactCost : 0, message };
}

/** 月末に町長の座が替わった町（見出し用）。前後の状態を比べる */
export function mayorChanges(before: CityState, after: CityState): { nodeId: string; from: number | null; to: number | null }[] {
  const out: { nodeId: string; from: number | null; to: number | null }[] = [];
  for (const [id, t] of Object.entries(after.towns)) {
    const b = before.towns[id];
    if (b === t) continue;
    const from = mayorOf(b);
    const to = mayorOf(t);
    if (from !== to) out.push({ nodeId: id, from, to });
  }
  return out;
}

