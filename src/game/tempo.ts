// テンポ（待ち時間・お知らせの順番待ち・CPU の速さ）。React に依存しない純粋な定義と関数。
// 画面（GameScreen / CpuDriver / PlayerToken）とテストの両方から使い、時間の数字をここに集める。

/** CPU の速さ（設定で選ぶ） */
export type CpuSpeed = 'slow' | 'normal' | 'fast';

export const CPU_SPEEDS: CpuSpeed[] = ['slow', 'normal', 'fast'];

export const CPU_SPEED_LABEL: Record<CpuSpeed, string> = {
  slow: 'ゆっくり',
  normal: 'ふつう',
  fast: 'はやい',
};

/** CPU の手番の待ち時間に掛ける倍率（ふつう=0.85 は v4.2.0 までの間より少し速い） */
export const CPU_SPEED_SCALE: Record<CpuSpeed, number> = {
  slow: 1.4,
  normal: 0.85,
  fast: 0.45,
};

/** CPU の手番を早送りしている間の倍率（速さの設定に関係なく） */
export const CPU_SKIP_SCALE = 0.15;

/** 手番の待ち時間に掛ける倍率。人の手番は常に 1 */
export function tempoScale(isCpuTurn: boolean, speed: CpuSpeed, skipping: boolean): number {
  if (!isCpuTurn) return 1;
  return skipping ? CPU_SKIP_SCALE : CPU_SPEED_SCALE[speed];
}

/** 倍率を掛けた時間（ms）。0 にはしない（描画の順番が崩れないよう最低 1 フレーム空ける） */
export function scaled(ms: number, scale: number): number {
  return Math.max(16, Math.round(ms * scale));
}

/** CPU の段階ごとの「間」（ms）。人が目で追える速さにする（倍率を掛ける前の値） */
export const CPU_STEP_DELAY: Partial<Record<string, number>> = {
  idle: 900,
  roulette: 400,
  path_selection: 1100,
  fishing_choice: 900,
  shop: 900,
  event: 1200,
  capital_event: 1300,
  rest: 700,
  city: 1100,
  city_event: 1300,
  action_choice: 800,
};

/** 1マス進むのにかける時間 */
export const MOVE_STEP_MS = 190;
/** 駒が着いてからマスの処理に移るまでの間（到着の巻物と判子を見せる） */
export const ARRIVAL_PAUSE_MS = 900;
/** ターン終了から次の手番までの間 */
export const TURN_END_MS = 1200;
/** ゴールの祝いを見せる時間（タップで早送りできる） */
export const GOAL_CELEBRATION_MS = 4200;
/** 行動選択で「ターンを終える」以外に選べることがなくなったら、自動で終えるまでの間 */
export const AUTO_END_MS = 60;

// ===== お知らせ（瓦版・貧乏神）の順番待ち =====

/** 瓦版を1件だけ見せるときの時間 */
export const TOAST_MS = 4200;
/** 後ろに順番待ちがあるときの時間（溜まりすぎないよう短くする） */
export const TOAST_BUSY_MS = 2000;
/** 倍率を掛けても、これより短くはしない */
export const TOAST_MIN_MS = 1200;
/** 貧乏神がとりついた・移ったお知らせの時間 */
export const BINBO_TOAST_MS = 2800;
/** 順番待ちに置ける数（見ている1件は含めない） */
export const NOTICE_QUEUE_MAX = 4;

/** 画面上部のお知らせ。city は瓦版、binbo は貧乏神がとりついた・移ったお知らせ */
export type Notice =
  | { kind: 'city'; title: string; body: string; /** 溢れても捨てない */ important?: boolean }
  | { kind: 'binbo'; reason: 'destination' | 'pass'; playerIndex: number; fromIndex?: number; great: boolean };

/**
 * お知らせを順番待ちの最後に積む。
 * - 同じ見出しの瓦版が続くとき（CPU が同じ町で2軒建てた等）は本文をつないで1件にする。まったく同じものは重ねない。
 * - 溢れたら、古い順に「捨ててよい瓦版」から捨てる（貧乏神と important は捨てない）。
 */
export function pushNotice(queue: readonly Notice[], n: Notice, max = NOTICE_QUEUE_MAX): Notice[] {
  const last = queue[queue.length - 1];
  if (n.kind === 'city' && last?.kind === 'city' && last.title === n.title) {
    if (last.body.split('／').includes(n.body)) return [...queue];
    return [...queue.slice(0, -1), { ...last, body: `${last.body}／${n.body}`, important: last.important || n.important }];
  }
  let q = [...queue, n];
  while (q.length > max) {
    const i = q.findIndex(x => x.kind === 'city' && !x.important);
    if (i < 0) break;
    q = q.filter((_, k) => k !== i);
  }
  return q;
}

/** お知らせを見せる時間（ms）。順番待ちがあれば短く、CPU の手番なら速さの倍率を掛ける */
export function noticeDurationMs(kind: Notice['kind'], waiting: number, scale: number): number {
  const base = kind === 'binbo' ? (waiting > 0 ? TOAST_BUSY_MS : BINBO_TOAST_MS) : waiting > 0 ? TOAST_BUSY_MS : TOAST_MS;
  return Math.max(TOAST_MIN_MS, Math.round(base * scale));
}

// ===== 月末の割り込み =====

/** 月末決算のうち、全画面で見せるかの判定に使う部分 */
export interface MonthReportLike {
  disasters: { damages: unknown[] }[];
  players: { declined: number; vacated?: number }[];
}

/**
 * 月末の決算を全画面で見せる「大事な月」か。
 * 災害で壊れた建物がある月と、人が遊んでいる席の建物が衰退・空き家になった月だけ。
 * 自然な成長や発展度の上昇だけの月は、上部のお知らせ（決算のまとめ）で流す。
 * humans が空（CPU だけ）のときは全員を見る。
 */
export function isNotableMonth(report: MonthReportLike | null, humans: readonly number[]): boolean {
  if (!report) return false;
  if (report.disasters.some(d => d.damages.length > 0)) return true;
  const seats = humans.length ? humans : report.players.map((_, i) => i);
  return seats.some(i => (report.players[i]?.declined ?? 0) > 0 || (report.players[i]?.vacated ?? 0) > 0);
}

/**
 * 貧乏神の月末の悪さを全画面（寸劇）で見せるか。
 * とりつかれたのが人のとき、大貧乏神に化けたとき、CPU だけの対局のときは見せる。
 * CPU がとりつかれた普通の月は、上部のお知らせで流す（毎月の全画面で待たされないように）。
 */
export function showBinboFullScreen(victimIsCpu: boolean, becameGreat: boolean, anyHuman: boolean): boolean {
  return !victimIsCpu || becameGreat || !anyHuman;
}

// ===== 行動選択 =====

/**
 * 行動選択で「ターンを終える」以外に選べることがあるか（無ければ押させずに自動で終える）。
 * まちづくりの町では町の画面を開き直せる。釣り旅の釣り場ではもう一度釣れる。
 */
export function hasActionChoices(opts: { isCity: boolean; inTown: boolean; fishingNode: boolean; fishingLeft: boolean }): boolean {
  if (opts.isCity) return opts.inTown;
  return opts.fishingNode && opts.fishingLeft;
}
