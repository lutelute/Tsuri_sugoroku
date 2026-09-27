// 案内役（モーションガイド）: どの状況で、どの案内を出すかの判定。
// React・DOM に依存しない純粋関数だけで書き、guideRules.test.ts で確かめる。
// 画面側（GuideLayer）は data-guide 属性で指し示す要素を探し、見つかったときだけ案内を出す。
import type { GameMode, GameState, NodeType, TurnPhase } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';
import { CITY_ACTIONS_PER_VISIT, CITY_ECONOMY, isTown, monopolyOwner } from '../../game/city';
import { getSpecialty } from '../../game/citySpecialties';
import { GOAL_CLOSE_ROUNDS } from '../../game/constants';

/** 地図の上に重ねる案内（GuideMapLayer が描く） */
export type GuideMapCue =
  | 'token'        // 手番の駒を輪で囲む
  | 'goal'         // 駒からゴールの方向へ矢印（釣り旅）
  | 'path'         // 分かれ道の各候補の道に光を流す
  | 'destination'  // 駒から目的地の方向へ矢印（まちづくり）
  | 'binbo';       // 貧乏神のとりついた駒を輪で囲む

/** 案内の判定に使う、いまの状況のまとめ */
export interface GuideContext {
  onGame: boolean;
  mode: GameMode;
  phase: TurnPhase;
  /** いまの手番の人が人間か */
  humanTurn: boolean;
  /** 人間が1人でもいるか（決算の画面は人が閉じるので CPU の手番でも出す） */
  anyHuman: boolean;
  /** CPU が1人でもいるか */
  anyCpu: boolean;
  /** 手番と段階の区切り。同じ段階では案内を1つまでにする */
  phaseKey: string;
  turn: number;
  playerIndex: number;
  nodeType: NodeType | null;
  inTown: boolean;
  /** 同じ釣りマスでもう一度釣れる（1回以上釣った後） */
  canFishAgain: boolean;
  /** 1ターンに同じ釣りマスで釣れる回数 */
  maxFishing: number;
  caughtCount: number;
  handSize: number;
  hasDestination: boolean;
  binboHolder: number | null;
  binboHolderName: string;
  /** 瓦版のお知らせの見出し */
  toastTitle: string | null;
  /** 貧乏神の月末の悪さの画面を表示中（この間は案内を出さない） */
  binboEventShown: boolean;
  /** 祭りの結果を表示中 */
  capitalResultShown: boolean;
  firstFinishTurn: number | null;
  /** 直近の月末決算がある（2か月目以降） */
  hasMonthReport: boolean;
  /** いる町での自分の建物の数と、独占している人 */
  myPlotsHere: number;
  monopolyHere: number | null;
  hasSpecialtyHere: boolean;
}

export interface GuideText {
  title: string;
  body: string;
}

export interface GuideDef {
  id: string;
  mode: GameMode | 'both';
  /** 指し示す要素（data-guide の値）。状況で変わるものは関数 */
  target: string | ((ctx: GuideContext) => string);
  /** 同じ data-guide の要素が複数あるとき、すべてを囲む（既定は最初に見えている1つ） */
  union?: boolean;
  /** 出す条件 */
  when: (ctx: GuideContext) => boolean;
  /** 出している間ずっと満たすべき条件（省略時は when と同じ） */
  keep?: (ctx: GuideContext) => boolean;
  text: (ctx: GuideContext) => GuideText;
  /** 条件を満たしてから出すまでの間（ms）。画面が現れる演出を待つ */
  delayMs: number;
  /** 地図の上の案内 */
  map?: GuideMapCue[];
  /** 操作の結果として現れる案内。同じ段階で前の案内の直後でも出してよい */
  chain?: boolean;
  /** CPU の手番でも出す（人が閉じる画面の案内） */
  anyTurn?: boolean;
  /** これらを見ていたら出さない（同じことを別の場面で説明済み） */
  skipIfSeen?: string[];
}

const FISHING_NODES = new Set<NodeType>(['fishing', 'fishing_special']);

/** 手番の頭の案内は「〇〇の番」の帯が横切ってから出す */
const IDLE_DELAY = 1900;

/**
 * 案内の一覧。上から順に調べ、最初に条件を満たしたものを出す（1度に1つ）。
 * 全面の画面（決算・札・店など）を先に、手番の頭（idle）の案内を後ろに並べる。
 */
export const GUIDES: GuideDef[] = [
  // ===== 人が閉じる全面の画面 =====
  {
    id: 'city-yearend', mode: 'city', anyTurn: true, target: 'city-yearend', delayMs: 1800,
    when: c => c.phase === 'city_yearend',
    text: () => ({ title: '年度末の大決算', body: '3月は総資産の番付と称号の発表。称号には賞金がつくものもあるよ。' }),
  },
  {
    id: 'city-report', mode: 'city', anyTurn: true, target: 'city-report', delayMs: 1600,
    when: c => c.phase === 'city_report',
    text: () => ({ title: '月末の決算', body: '建物の持ち主にお金が入る。条件の良い建物は育つ（▲）よ。' }),
  },
  // ===== 止まったマスの画面 =====
  {
    id: 'event', mode: 'fishing', target: 'event-card', delayMs: 900,
    when: c => c.phase === 'event',
    text: () => ({ title: '運命の札', body: '札をめくると、良いことも悪いことも起きる。' }),
  },
  {
    id: 'city-event', mode: 'city', target: 'city-event', delayMs: 900,
    when: c => c.phase === 'city_event',
    text: () => ({ title: 'まちの出来事', body: '札をめくろう。補助金などの良いことも、地震や台風もある。' }),
  },
  {
    id: 'festival', mode: 'both', target: 'festival', delayMs: 1000,
    when: c => c.phase === 'capital_event' && !c.capitalResultShown,
    text: () => ({ title: '県庁のお祭り', body: 'どれか1つ選んで参加しよう。お金や魚がもらえることもある。' }),
  },
  {
    id: 'shop', mode: 'both', target: 'shop', delayMs: 900,
    when: c => c.phase === 'shop',
    text: () => ({ title: '釣具店', body: '竿・リール・ルアーが買える。レベルの高い道具ほど釣りやすい。' }),
  },
  {
    id: 'rest', mode: 'both', target: 'rest', delayMs: 900,
    when: c => c.phase === 'rest',
    text: () => ({ title: '温泉でひと休み', body: 'お金がもらえて、傷んだ道具を直せるよ。' }),
  },
  {
    id: 'fish-choice', mode: 'both', target: 'fish-normal', delayMs: 800,
    when: c => c.phase === 'fishing_choice',
    text: () => ({ title: '釣り方を選ぼう', body: '岸からの釣りは無料。船釣りはお金がかかるけど、めずらしい魚が出やすい。' }),
  },
  // ===== 分かれ道 =====
  {
    id: 'path', mode: 'both', target: 'path-list', delayMs: 600, map: ['path'],
    when: c => c.phase === 'path_selection',
    text: () => ({ title: '行き先を選ぼう', body: '光っているマスをタップしよう。下の一覧からも選べるよ。' }),
  },
  // ===== まちづくり: 町の画面 =====
  {
    id: 'city-dest-first', mode: 'city', delayMs: 900, map: ['destination'],
    target: c => (c.phase === 'city' ? 'actions-left' : 'destination'),
    when: c => (c.phase === 'city' || c.phase === 'action_choice') && !!c.toastTitle && c.toastTitle.includes('一番乗り'),
    keep: c => c.phase === 'city' || c.phase === 'action_choice',
    text: () => ({ title: '一番乗り！', body: '賞金に加えて、この町では工事が1回多くできる。次の目的地も決まったよ。' }),
  },
  {
    id: 'city-build', mode: 'city', target: 'build-options', delayMs: 300, chain: true,
    when: c => c.phase === 'city',
    text: () => ({ title: '何を建てる？', body: '町の需要（住・商・工）の緑が伸びている物ほど育ちやすい。建物は月末にお金を生むよ。' }),
  },
  {
    id: 'city-town', mode: 'city', target: 'plot-empty', delayMs: 700,
    when: c => c.phase === 'city',
    text: () => ({ title: '空き地に建てよう', body: `「空き地」をタップして、建てる物を選ぶ。1回の訪問で工事は${CITY_ACTIONS_PER_VISIT}回まで。` }),
  },
  {
    id: 'city-specialty', mode: 'city', target: 'specialty', delayMs: 700,
    when: c => c.phase === 'city' && c.hasSpecialtyHere,
    text: () => ({ title: '名産を買おう', body: '県庁には名産がある。持っていると毎月収入が入る。地方の名産をぜんぶ集めると収入2倍！' }),
  },
  {
    id: 'city-monopoly', mode: 'city', target: 'plots', delayMs: 700,
    when: c => c.phase === 'city' && c.myPlotsHere >= 2 && c.monopolyHere === null,
    text: () => ({ title: '独占をねらおう', body: `町のもとの区画をぜんぶ自分の建物にすると独占。収入が${CITY_ECONOMY.monopolyMul}倍になる。` }),
  },
  {
    id: 'city-hand', mode: 'city', target: 'hand', delayMs: 800,
    when: c => (c.phase === 'idle' || c.phase === 'city') && c.handSize > 0,
    text: () => ({ title: 'カードが来た！', body: '札をタップすると説明が出る。「使う」で使えるよ。振る前に使う札と、町で使う札がある。' }),
  },
  // ===== 手番の頭 =====
  {
    id: 'roll', mode: 'both', target: 'roll', delayMs: IDLE_DELAY, map: ['token', 'goal'],
    when: c => c.phase === 'idle',
    text: c => (c.mode === 'city'
      ? { title: 'サイコロを振ろう', body: '出た目の数だけ駒が進む。光っている輪があなたの駒だよ。' }
      : { title: 'サイコロを振ろう', body: '出た目の数だけ駒が進む。矢印の方にゴールの那覇があるよ。' }),
  },
  {
    id: 'city-binbo', mode: 'city', target: 'binbo-card', delayMs: IDLE_DELAY, map: ['binbo'],
    when: c => c.phase === 'idle' && c.binboHolder !== null,
    text: c => (c.binboHolder === c.playerIndex
      ? { title: '貧乏神がとりついた', body: '月末に悪さをする。ほかの駒とすれ違うか、同じマスに止まると移せるよ。' }
      : { title: `${c.binboHolderName}に貧乏神`, body: 'すれ違ったり同じマスに止まったりすると移される。近づきすぎに注意！' }),
  },
  {
    id: 'city-destination', mode: 'city', target: 'destination', delayMs: IDLE_DELAY, map: ['destination'],
    when: c => c.phase === 'idle' && c.hasDestination,
    text: () => ({ title: '目的地をめざそう', body: '旗の立った町が目的地。一番乗りで賞金がもらえる。矢印の方へ進もう。' }),
  },
  {
    id: 'city-monthend', mode: 'city', target: 'players-bar', delayMs: IDLE_DELAY, skipIfSeen: ['city-report'],
    when: c => c.phase === 'idle' && c.hasMonthReport,
    text: () => ({ title: '月末の決算', body: '毎月の終わりに建物からお金が入る。下の欄の総資産で比べよう。' }),
  },
  {
    id: 'city-season', mode: 'city', target: 'season', delayMs: IDLE_DELAY,
    when: c => c.phase === 'idle' && c.turn >= 2,
    text: () => ({ title: '季節の行事', body: '月ごとの行事で、観光や商業の収入が変わる。今の季節は上に出るよ。' }),
  },
  {
    id: 'deadline', mode: 'fishing', target: 'deadline', delayMs: IDLE_DELAY,
    when: c => c.phase === 'idle' && c.firstFinishTurn !== null,
    text: () => ({ title: 'ゴールした人がいる', body: `最初のゴールから${GOAL_CLOSE_ROUNDS}巡で終わり。残りの巡数は上に出るよ。` }),
  },
  {
    id: 'tools', mode: 'fishing', target: 'side-tools', union: true, delayMs: IDLE_DELAY,
    when: c => c.phase === 'idle' && c.caughtCount > 0,
    text: () => ({ title: '道具箱・魚籠・図鑑', body: '道具の付け替えと修理、釣った魚、集めた魚の図鑑はここから見られる。' }),
  },
  // ===== 行動選択 =====
  {
    id: 'fish-again', mode: 'fishing', target: 'action-choice', delayMs: 700,
    when: c => c.phase === 'action_choice' && c.canFishAgain,
    text: c => ({ title: 'もう一度釣れる', body: `同じ釣りマスでは、1ターンに${c.maxFishing}回まで釣れるよ。` }),
  },
  {
    id: 'turn-end', mode: 'both', target: 'action-choice', delayMs: 700,
    when: c => c.phase === 'action_choice' && !c.canFishAgain,
    text: () => ({ title: 'ターンを終える', body: 'やることが済んだら「ターンを終了する」。次の人の番になるよ。' }),
  },
  {
    id: 'cpu-speed', mode: 'both', target: 'cpu-speed', delayMs: IDLE_DELAY,
    when: c => c.phase === 'idle' && c.anyCpu && c.turn >= 2,
    text: () => ({ title: 'CPUの速さ', body: 'CPUの番の速さはここで変えられる。CPUの番に画面をタップすると早送りできるよ。' }),
  },
  {
    id: 'howto-button', mode: 'both', target: 'howto', delayMs: IDLE_DELAY,
    when: c => c.phase === 'idle' && c.turn >= 3,
    text: () => ({ title: '遊び方はここ', body: 'わからなくなったら、このボタンで遊び方を見られるよ。' }),
  },
];

const GUIDE_BY_ID = new Map(GUIDES.map(g => [g.id, g]));

export function guideById(id: string | null | undefined): GuideDef | undefined {
  return id ? GUIDE_BY_ID.get(id) : undefined;
}

export function targetOf(g: GuideDef, ctx: GuideContext): string {
  return typeof g.target === 'function' ? g.target(ctx) : g.target;
}

function turnOk(g: GuideDef, ctx: GuideContext): boolean {
  return g.anyTurn ? ctx.anyHuman : ctx.humanTurn;
}

export interface PickOptions {
  seen: ReadonlySet<string>;
  /** 指し示す要素が画面にあるか */
  hasTarget: (target: string) => boolean;
  /** 直前に案内を閉じた段階（同じ段階では chain の案内だけ続けて出す） */
  lastPhaseKey?: string | null;
}

/** いま出すべき案内（なければ null） */
export function pickGuide(ctx: GuideContext, opts: PickOptions): GuideDef | null {
  if (!ctx.onGame || ctx.binboEventShown) return null;
  for (const g of GUIDES) {
    if (opts.seen.has(g.id)) continue;
    if (g.skipIfSeen?.some(id => opts.seen.has(id))) continue;
    if (g.mode !== 'both' && g.mode !== ctx.mode) continue;
    if (!turnOk(g, ctx)) continue;
    if (opts.lastPhaseKey === ctx.phaseKey && !g.chain) continue;
    if (!g.when(ctx)) continue;
    if (!opts.hasTarget(targetOf(g, ctx))) continue;
    return g;
  }
  return null;
}

/** 出している案内を、まだ出し続けてよいか（状況が過ぎたら閉じる） */
export function stillValid(g: GuideDef, ctx: GuideContext): boolean {
  if (!ctx.onGame || ctx.binboEventShown || !turnOk(g, ctx)) return false;
  return (g.keep ?? g.when)(ctx);
}

/** ストアの状態から、案内の判定に使う状況をまとめる */
export function buildGuideContext(
  s: Pick<GameState,
    'screen' | 'settings' | 'turnPhase' | 'players' | 'currentPlayerIndex' | 'turn' | 'nodeActionsThisTurn'
    | 'cityCards' | 'city' | 'cityToast' | 'cityBinboEvent' | 'lastCapitalResult' | 'firstFinishTurn' | 'cityReport'>,
  maxFishingPerTurn: number,
): GuideContext {
  const pi = s.currentPlayerIndex;
  const player = s.players[pi];
  const node = player ? NODE_MAP.get(player.currentNode) : undefined;
  const mode: GameMode = s.settings.mode === 'city' ? 'city' : 'fishing';
  const town = node && s.city ? s.city.towns[node.id] : undefined;
  const holder = s.city?.binbo?.playerIndex ?? null;
  const isFishingNode = !!node && FISHING_NODES.has(node.type);
  return {
    onGame: s.screen === 'game' && !!player,
    mode,
    phase: s.turnPhase,
    humanTurn: !!player && !player.isCpu,
    anyHuman: s.players.some(p => !p.isCpu),
    anyCpu: s.players.some(p => !!p.isCpu),
    phaseKey: `${s.turn}:${pi}:${s.turnPhase}`,
    turn: s.turn,
    playerIndex: pi,
    nodeType: node?.type ?? null,
    inTown: mode === 'city' && isTown(node),
    canFishAgain: mode === 'fishing' && isFishingNode && s.nodeActionsThisTurn > 0 && s.nodeActionsThisTurn < maxFishingPerTurn,
    maxFishing: maxFishingPerTurn,
    caughtCount: player?.caughtFish.length ?? 0,
    handSize: s.cityCards?.hands[pi]?.length ?? 0,
    hasDestination: !!s.city?.destination,
    binboHolder: holder,
    binboHolderName: holder !== null ? s.players[holder]?.name ?? '' : '',
    toastTitle: s.cityToast?.title ?? null,
    binboEventShown: !!s.cityBinboEvent && s.turnPhase !== 'city_report' && s.turnPhase !== 'city_yearend',
    capitalResultShown: !!s.lastCapitalResult,
    firstFinishTurn: s.firstFinishTurn,
    hasMonthReport: !!s.cityReport && s.turn >= 2,
    myPlotsHere: town ? town.plots.filter(p => p && p.owner === pi).length : 0,
    monopolyHere: town ? monopolyOwner(town) : null,
    hasSpecialtyHere: !!node && !!getSpecialty(node.id),
  };
}
