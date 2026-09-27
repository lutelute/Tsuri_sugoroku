// まちづくりモードのカード（桃鉄風の一発逆転と、相手の邪魔）。
// React / ストアに依存しない純粋関数だけで構成する。状態（CardState）は引数で受け取り、新しい値を返す。
//
// ストア側の流れ:
//  - 入手: 村マスは CARD_DROP_VILLAGE、中継マスは CARD_DROP_ROUTE の確率で drawCard → addCard。
//          大都市・商都（hasCardShop）の売り場では buyCard。
//  - 使う: playCard（別名 useCardEffect）で手札から出し、返ってきた effect をストアが処理する。
//  - サイコロ: diceCap（牛歩）と effect.count を RouletteOverlay に渡す。出目は rollDiceFaces。
//  - ターン終わり: tickSlow。災害: protectInsured（保険）。買収: consumeLandGrab + landGrabPrice。
import type { BuildingKind, CityActionResult, CityDisasterReport, CityState, Plot, TownClass } from './city';
import { TOWN_IDS, build, canBuild, getTownInfo } from './city';
import { ROULETTE_MAX, ROULETTE_MIN } from './constants';
import { random, randomInt } from '../utils/random';

// ===== 型 =====

export type CityCardId = 'kyuko' | 'tokkyu' | 'buttobi' | 'gyuho' | 'jiage' | 'kojiken' | 'hoken' | 'yuchi';
/** カードを使える場面（both = サイコロの前でも町の中でも） */
export type CardTiming = 'before_roll' | 'in_town' | 'both';
/** 今の場面 */
export type CardUseTiming = 'before_roll' | 'in_town';
/** 札の色分け（移動・妨害・町・守り） */
export type CardCategory = 'move' | 'attack' | 'town' | 'guard';

export interface CardState {
  /** プレイヤーごとの手札（先頭が一番古い札） */
  hands: CityCardId[][];
  /** 牛歩: その人の出目が SLOW_CAP までになる残りターン */
  slow: { playerIndex: number; turnsLeft: number }[];
  /** 保険が有効なプレイヤー */
  insured: number[];
  /** 地上げが有効なプレイヤー */
  landGrab: number[];
}

export interface CardInfo {
  name: string;
  desc: string;
  /** 売値。null は売っていない（村マスや中継マスで引くしかない） */
  price: number | null;
  timing: CardTiming;
  /** 札の真ん中に大きく書く一文字 */
  glyph: string;
  category: CardCategory;
  /** 引くときの重み（合計100） */
  weight: number;
}

/** ストアが処理する効果 */
export type CardEffect =
  | { kind: 'dice'; count: 2 | 3 }
  | { kind: 'warp' }
  | { kind: 'slow'; target: number }
  | { kind: 'land_grab' }
  | { kind: 'build_bonus'; extra: number }
  | { kind: 'insurance' }
  | { kind: 'free_build' };

export interface PlayCardContext {
  /** 今の場面。渡すと、場面違いのカードを弾く */
  timing?: CardUseTiming;
  /** 誘致: 今いる町に空き区画があるか。false を渡すと弾く */
  hasEmptyPlot?: boolean;
  /** このターンのサイコロの個数（急行を使った後に急行を重ねない） */
  pendingDice?: number;
}

export type PlayCardResult =
  | { cs: CardState; effect: CardEffect; card: CityCardId; message: string }
  | { error: string };

// ===== 定数 =====

/** 手札の上限 */
export const MAX_HAND = 4;
/** サイコロの最大個数 */
export const MAX_DICE = 3;
/** 牛歩の続くターン数 */
export const SLOW_TURNS = 2;
/** 牛歩中の出目の上限（サイコロ1個あたり） */
export const SLOW_CAP = 2;
/** 地上げを使ったときの買収倍率（ふだんは1.5倍） */
export const LAND_GRAB_RATE = 1.1;
/** 工事券で増える工事の回数 */
export const KOJIKEN_EXTRA = 2;
/** 村マス（event_*）でカードを引く確率 */
export const CARD_DROP_VILLAGE = 0.5;
/** 中継マスでカードを引く確率 */
export const CARD_DROP_ROUTE = 0.15;
/** カード売り場のある町の格 */
export const CARD_SHOP_CLASSES: readonly TownClass[] = ['metro', 'market'];

export const CARD_IDS: readonly CityCardId[] = ['kyuko', 'tokkyu', 'buttobi', 'gyuho', 'jiage', 'kojiken', 'hoken', 'yuchi'];

export const CARD_INFO: Record<CityCardId, CardInfo> = {
  kyuko: { name: '急行', desc: 'このターンはサイコロを2個振る', price: 1500, timing: 'before_roll', glyph: '急', category: 'move', weight: 22 },
  tokkyu: { name: '特急', desc: 'このターンはサイコロを3個振る', price: null, timing: 'before_roll', glyph: '特', category: 'move', weight: 6 },
  buttobi: { name: 'ぶっとび', desc: '日本のどこかの町へ飛んでいく', price: 800, timing: 'before_roll', glyph: '飛', category: 'move', weight: 14 },
  gyuho: { name: '牛歩', desc: '選んだ相手は2ターンの間、出目が2まで', price: 2000, timing: 'before_roll', glyph: '牛', category: 'attack', weight: 12 },
  jiage: { name: '地上げ', desc: '次の買収が1.5倍でなく1.1倍で済む', price: 2500, timing: 'both', glyph: '地', category: 'town', weight: 10 },
  kojiken: { name: '工事券', desc: 'この町での工事の回数が2回増える', price: 1800, timing: 'in_town', glyph: '工', category: 'town', weight: 14 },
  hoken: { name: '保険', desc: '次の災害の被害を1回だけ防ぐ', price: 1200, timing: 'before_roll', glyph: '保', category: 'guard', weight: 14 },
  yuchi: { name: '誘致', desc: '今いる町の空き区画に1軒ただで建てる', price: null, timing: 'in_town', glyph: '誘', category: 'town', weight: 8 },
};

/** 札の種類ごとの色と帯の文字（移動=藍・妨害=朱・まち=金茶・守り=松葉） */
export const CARD_CATEGORY_INFO: Record<CardCategory, { color: string; label: string }> = {
  move: { color: '#24496e', label: '移動' },
  attack: { color: '#c63a26', label: '妨害' },
  town: { color: '#9a6f24', label: 'まち' },
  guard: { color: '#1f6b3a', label: '守り' },
};

/** 使える場面の説明 */
export const CARD_TIMING_LABEL: Record<CardTiming, string> = {
  before_roll: 'サイコロを振る前に使う',
  in_town: '町の画面で使う',
  both: '振る前・町の画面で使える',
};

/** 売り場に並ぶカード（売値の安い順） */
export const SHOP_CARDS: readonly CityCardId[] = CARD_IDS.filter(id => CARD_INFO[id].price !== null)
  .slice()
  .sort((a, b) => (CARD_INFO[a].price ?? 0) - (CARD_INFO[b].price ?? 0));

const TOTAL_WEIGHT = CARD_IDS.reduce((s, id) => s + CARD_INFO[id].weight, 0);

// ===== 手札 =====

export function createCardState(playerCount: number): CardState {
  return {
    hands: Array.from({ length: Math.max(0, playerCount) }, () => []),
    slow: [],
    insured: [],
    landGrab: [],
  };
}

/** カードを1枚引く（重み付き）。rngValue（0以上1未満）を渡すとそれで決める */
export function drawCard(rngValue?: number): CityCardId {
  const v = rngValue ?? random();
  const r = Math.min(Math.max(Number.isFinite(v) ? v : 0, 0), 1 - Number.EPSILON) * TOTAL_WEIGHT;
  let acc = 0;
  for (const id of CARD_IDS) {
    acc += CARD_INFO[id].weight;
    if (r < acc) return id;
  }
  return CARD_IDS[CARD_IDS.length - 1];
}

function withHand(cs: CardState, playerIndex: number, hand: CityCardId[]): CardState {
  const hands = cs.hands.slice();
  hands[playerIndex] = hand;
  return { ...cs, hands };
}

/** 手札に加える。上限を超えたら一番古い札を捨てる（捨てた札を返す） */
export function addCard(cs: CardState, playerIndex: number, card: CityCardId): { cs: CardState; discarded?: CityCardId } {
  if (playerIndex < 0 || playerIndex >= cs.hands.length) return { cs };
  const hand = [...cs.hands[playerIndex], card];
  const discarded = hand.length > MAX_HAND ? hand.shift() : undefined;
  return discarded ? { cs: withHand(cs, playerIndex, hand), discarded } : { cs: withHand(cs, playerIndex, hand) };
}

/** 手札の index 番目を取り除く（無ければそのまま） */
export function removeCard(cs: CardState, playerIndex: number, index: number): CardState {
  const hand = cs.hands[playerIndex];
  if (!hand || index < 0 || index >= hand.length) return cs;
  return withHand(cs, playerIndex, hand.filter((_, i) => i !== index));
}

/** 売り場で買う。手札がいっぱいのときは買えない（大事な札をうっかり捨てないため） */
export function buyCard(cs: CardState, playerIndex: number, card: CityCardId, money: number): { cs: CardState; cost: number } | { error: string } {
  const price = CARD_INFO[card].price;
  if (price === null) return { error: `${CARD_INFO[card].name}は売っていない` };
  const hand = cs.hands[playerIndex];
  if (!hand) return { error: 'プレイヤーがいない' };
  if (hand.length >= MAX_HAND) return { error: `手札がいっぱい（${MAX_HAND}枚まで）` };
  if (money < price) return { error: 'お金が足りない' };
  return { cs: addCard(cs, playerIndex, card).cs, cost: price };
}

/** その場面で使えるカードか */
export function canUseAt(card: CityCardId, timing: CardUseTiming): boolean {
  const t = CARD_INFO[card].timing;
  return t === 'both' || t === timing;
}

/** カード売り場のある町か（大都市・商都） */
export function hasCardShop(nodeId: string): boolean {
  const cls = getTownInfo(nodeId)?.cls;
  return !!cls && CARD_SHOP_CLASSES.includes(cls);
}

// ===== 一時的な効果 =====

export function isSlowed(cs: CardState, playerIndex: number): boolean {
  return cs.slow.some(s => s.playerIndex === playerIndex && s.turnsLeft > 0);
}

/** 出目の上限（サイコロ1個あたり）。牛歩中なら SLOW_CAP、そうでなければ null */
export function diceCap(cs: CardState, playerIndex: number): number | null {
  return isSlowed(cs, playerIndex) ? SLOW_CAP : null;
}

/** その人のターンの終わりに呼ぶ。牛歩の残りを1減らし、0になったら外す */
export function tickSlow(cs: CardState, playerIndex: number): CardState {
  if (!cs.slow.some(s => s.playerIndex === playerIndex)) return cs;
  const slow = cs.slow
    .map(s => (s.playerIndex === playerIndex ? { ...s, turnsLeft: s.turnsLeft - 1 } : s))
    .filter(s => s.turnsLeft > 0);
  return { ...cs, slow };
}

export function hasInsurance(cs: CardState, playerIndex: number): boolean {
  return cs.insured.includes(playerIndex);
}

/** 保険を1回使う。入っていなければ used: false */
export function consumeInsurance(cs: CardState, playerIndex: number): { cs: CardState; used: boolean } {
  if (!hasInsurance(cs, playerIndex)) return { cs, used: false };
  return { cs: { ...cs, insured: cs.insured.filter(p => p !== playerIndex) }, used: true };
}

export function hasLandGrab(cs: CardState, playerIndex: number): boolean {
  return cs.landGrab.includes(playerIndex);
}

/** 地上げを1回使う。効いていなければ used: false */
export function consumeLandGrab(cs: CardState, playerIndex: number): { cs: CardState; used: boolean } {
  if (!hasLandGrab(cs, playerIndex)) return { cs, used: false };
  return { cs: { ...cs, landGrab: cs.landGrab.filter(p => p !== playerIndex) }, used: true };
}

/** 地上げのときの買収額（city.plotValue の値から。ふだんの acquireCost は 1.5倍） */
export function landGrabPrice(plotValue: number): number {
  return Math.round((plotValue * LAND_GRAB_RATE) / 100) * 100;
}

// ===== カードを使う =====

const USE_MESSAGE: Record<CityCardId, string> = {
  kyuko: '急行！このターンはサイコロ2個',
  tokkyu: '特急！このターンはサイコロ3個',
  buttobi: 'ぶっとび！どこかの町へ飛んでいく',
  gyuho: `牛歩！相手は${SLOW_TURNS}ターンの間、出目が${SLOW_CAP}まで`,
  jiage: '地上げ屋を雇った。次の買収は1.1倍で済む',
  kojiken: `工事券！この町での工事が${KOJIKEN_EXTRA}回増える`,
  hoken: '保険に入った。次の災害を1回防ぐ',
  yuchi: '誘致！空き区画に1軒ただで建つ',
};

/**
 * 手札の index 番目を使う。成功すると札を手札から除き、ストアが処理する effect を返す。
 * 牛歩は target（相手のプレイヤー index）が必要。ctx を渡すと場面違い・空き区画なし・急行の重ね掛けを弾く。
 */
export function playCard(cs: CardState, playerIndex: number, index: number, target?: number, ctx: PlayCardContext = {}): PlayCardResult {
  const hand = cs.hands[playerIndex];
  const card = hand?.[index];
  if (!card) return { error: 'そのカードは手札にない' };
  const info = CARD_INFO[card];
  if (ctx.timing && !canUseAt(card, ctx.timing)) {
    return { error: info.timing === 'in_town' ? `${info.name}は町の画面で使うカード` : `${info.name}はサイコロを振る前に使うカード` };
  }

  let next = removeCard(cs, playerIndex, index);
  let effect: CardEffect;
  switch (card) {
    case 'kyuko':
    case 'tokkyu': {
      const count = card === 'kyuko' ? 2 : 3;
      if (isSlowed(cs, playerIndex)) return { error: '牛歩中はサイコロを増やせない' };
      if ((ctx.pendingDice ?? 1) >= count) return { error: `このターンはもうサイコロ${ctx.pendingDice}個` };
      effect = { kind: 'dice', count };
      break;
    }
    case 'buttobi':
      effect = { kind: 'warp' };
      break;
    case 'gyuho': {
      if (target === undefined || target === playerIndex) return { error: '牛歩をかける相手を選んでね' };
      if (target < 0 || target >= cs.hands.length) return { error: 'その相手はいない' };
      next = { ...next, slow: [...next.slow.filter(s => s.playerIndex !== target), { playerIndex: target, turnsLeft: SLOW_TURNS }] };
      effect = { kind: 'slow', target };
      break;
    }
    case 'jiage':
      if (hasLandGrab(cs, playerIndex)) return { error: 'すでに地上げが効いている' };
      next = { ...next, landGrab: [...next.landGrab, playerIndex] };
      effect = { kind: 'land_grab' };
      break;
    case 'kojiken':
      effect = { kind: 'build_bonus', extra: KOJIKEN_EXTRA };
      break;
    case 'hoken':
      if (hasInsurance(cs, playerIndex)) return { error: 'すでに保険に入っている' };
      next = { ...next, insured: [...next.insured, playerIndex] };
      effect = { kind: 'insurance' };
      break;
    case 'yuchi':
      if (ctx.hasEmptyPlot === false) return { error: 'この町には空き区画がない' };
      effect = { kind: 'free_build' };
      break;
  }
  return { cs: next, effect, card, message: USE_MESSAGE[card] };
}

/**
 * playCard の別名（依頼時の名前）。
 * 注意: 名前が use で始まるため eslint の rules-of-hooks がフック扱いし、ストアのアクション内やテストで呼ぶと警告になる。
 * 呼ぶときは playCard を使うこと。
 */
export const useCardEffect = playCard;

// ===== 効果の処理を助ける関数（ストア用） =====

/** ぶっとびの行き先（今いる町以外の町を無作為に） */
export function pickWarpDestination(currentNode: string, rngValue?: number): string {
  const pool = TOWN_IDS.filter(id => id !== currentNode);
  if (!pool.length) return currentNode;
  const v = rngValue ?? random();
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(v * pool.length)));
  return pool[i];
}

/** 空き区画の番号（無ければ -1） */
export function emptyPlotIndex(state: CityState, nodeId: string): number {
  return state.towns[nodeId]?.plots.findIndex(p => p === null) ?? -1;
}

/** 誘致で建てる建物のおすすめ（CPU や自動選択用）。建てられなければ null */
export function suggestFreeBuildKind(state: CityState, nodeId: string, plotIndex: number): BuildingKind | null {
  const order: BuildingKind[] = ['res', 'com', 'tourism', 'ind', 'park', 'port', 'power'];
  return order.find(k => canBuild(state, nodeId, k, plotIndex, Number.MAX_SAFE_INTEGER) === null) ?? null;
}

/** 誘致: 等級1をただで建てる（費用0。工事の回数に数えるかはストアが決める） */
export function freeBuild(state: CityState, nodeId: string, plotIndex: number, kind: BuildingKind, playerIndex: number, turn: number): CityActionResult {
  const r = build(state, nodeId, plotIndex, kind, playerIndex, Number.MAX_SAFE_INTEGER, turn);
  if (!r.ok) return r;
  return { ...r, cost: 0, message: `誘致で${r.message}` };
}

/** 災害で壊れたか（なくなった、または同じ持ち主のまま等級が下がった） */
function isDamaged(before: Plot, after: Plot | null): boolean {
  if (!after) return true;
  return after.owner === before.owner && after.kind === before.kind && after.level < before.level;
}

/**
 * 保険: 災害の前後の状態を比べ、保険に入っている人の壊れた建物を元に戻す。
 * 被害を受けた人の保険だけを消費する（被害が無ければ保険は残る）。
 * 使い方: const { state: after, report } = applyDisaster(before, ...); protectInsured(before, after, report, cards)
 */
export function protectInsured(
  before: CityState,
  after: CityState,
  report: CityDisasterReport,
  cs: CardState,
): { city: CityState; report: CityDisasterReport; cs: CardState; protectedPlayers: number[] } {
  const hurt = [...new Set(report.damages.filter(d => cs.insured.includes(d.owner)).map(d => d.owner))];
  if (!hurt.length) return { city: after, report, cs, protectedPlayers: [] };

  const towns = { ...after.towns };
  for (const [id, bt] of Object.entries(before.towns)) {
    const at = after.towns[id];
    if (!at || at === bt) continue;
    let changed = false;
    const plots = at.plots.map((p, i) => {
      const bp = bt.plots[i];
      // 壊れた区画（なくなった・等級が下がった）だけを戻す。同じ月の発展や買収は巻き戻さない
      if (bp && hurt.includes(bp.owner) && isDamaged(bp, p)) {
        changed = true;
        return p ? { ...p, level: bp.level } : bp;
      }
      return p;
    });
    // 災害後の町が発展度などを落としていても、元の値で補う
    if (changed) towns[id] = { ...bt, ...at, plots };
  }
  return {
    city: { ...after, towns },
    report: { ...report, damages: report.damages.filter(d => !hurt.includes(d.owner)) },
    cs: { ...cs, insured: cs.insured.filter(p => !hurt.includes(p)) },
    protectedPlayers: hurt,
  };
}

// ===== サイコロ =====

/** サイコロの個数を 1〜MAX_DICE に収める */
export function clampDiceCount(count: number | null | undefined): number {
  if (count === null || count === undefined || !Number.isFinite(count)) return 1;
  return Math.max(1, Math.min(MAX_DICE, Math.floor(count)));
}

/**
 * サイコロを count 個振った出目を返す。cap（牛歩）はサイコロ1個あたりの上限。
 * 1個・上限なしなら randomInt(1,6) を1回呼ぶだけ（これまでの乱数の使い方と同じ）。
 */
export function rollDiceFaces(count: number | null | undefined = 1, cap: number | null = null): number[] {
  const n = clampDiceCount(count);
  const max = cap !== null && Number.isFinite(cap) && cap >= ROULETTE_MIN ? Math.min(ROULETTE_MAX, Math.floor(cap)) : ROULETTE_MAX;
  return Array.from({ length: n }, () => randomInt(ROULETTE_MIN, max));
}

// ===== CPU =====

export interface CpuCardContext {
  /** 目的地までのマス数（目的地が無ければ Infinity でよい） */
  distToDestination: number;
  money: number;
  /** 町の画面の中か（false ならサイコロを振る前） */
  isInTown: boolean;
  opponents: { index: number; distToDestination: number }[];
  /** 町の中: 空き区画があるか（誘致の判断） */
  hasEmptyPlot?: boolean;
  /** 町の中: 買収したい建物があるか（地上げの判断） */
  wantsAcquire?: boolean;
  /** このターンのサイコロの個数 */
  pendingDice?: number;
}

/**
 * CPU がカードを使うかの素朴な判断。使うなら手札の番号（牛歩なら相手も）を返す。
 * 町の中: 誘致 → 地上げ（買いたい物があれば）→ 工事券（お金があれば）。
 * 振る前: 保険 → 目的地に近い相手へ牛歩 → 遠ければ特急/急行 → とても遠ければぶっとび → お金持ちなら地上げ。
 */
export function chooseCpuCard(cs: CardState, playerIndex: number, context: CpuCardContext): { index: number; target?: number } | null {
  const hand = cs.hands[playerIndex] ?? [];
  if (!hand.length) return null;
  const at = (id: CityCardId) => hand.indexOf(id);
  const has = (id: CityCardId) => hand.includes(id);
  const dist = Number.isFinite(context.distToDestination) ? context.distToDestination : 0;

  if (context.isInTown) {
    if (has('yuchi') && context.hasEmptyPlot !== false) return { index: at('yuchi') };
    if (has('jiage') && context.wantsAcquire && !hasLandGrab(cs, playerIndex)) return { index: at('jiage') };
    if (has('kojiken') && context.money >= 4000) return { index: at('kojiken') };
    return null;
  }

  if (has('hoken') && !hasInsurance(cs, playerIndex)) return { index: at('hoken') };

  if (has('gyuho')) {
    const rival = context.opponents
      .filter(o => o.index !== playerIndex && !isSlowed(cs, o.index) && Number.isFinite(o.distToDestination))
      .sort((a, b) => a.distToDestination - b.distToDestination)[0];
    if (rival && (rival.distToDestination < dist || rival.distToDestination <= 6)) return { index: at('gyuho'), target: rival.index };
  }

  if (!isSlowed(cs, playerIndex) && (context.pendingDice ?? 1) <= 1) {
    if (has('tokkyu') && dist > 12) return { index: at('tokkyu') };
    if (has('kyuko') && dist > 6) return { index: at('kyuko') };
    if (has('tokkyu') && dist > 9) return { index: at('tokkyu') };
  }

  if (has('buttobi') && dist >= 24) return { index: at('buttobi') };
  if (has('jiage') && !hasLandGrab(cs, playerIndex) && context.money >= 10000) return { index: at('jiage') };
  return null;
}
