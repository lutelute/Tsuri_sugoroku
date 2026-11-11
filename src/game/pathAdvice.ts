// 行き先のおすすめ（純粋関数）。分かれ道の候補を CPU の道選びと同じ点（気まぐれなし）で並べ、
// いちばん効いている理由を「理由の札」にする。人には堅実型の重みで出す（cpuStyle が無ければ堅実型）。
// 点の内訳は cpuAI.pathScoreParts がそのまま返すので、重みを変えるとおすすめと理由も一緒に変わる。
import type { GameState } from './types';
import type { PathContext, PathReason, ScorePart } from './cpuAI';
import { pathScoreParts } from './cpuAI';
import { fishingLastTurn } from './deadline';
import { NODE_MAP } from '../data/boardNodes';

/** 理由の札の種類。点の理由（PathReason）と、点に出ない場面の呼び名（村のカード・ただの町） */
export type PathTagKind = PathReason | 'card' | 'town';

export interface PathTag {
  kind: PathTagKind;
  /** 一覧やボタンに出す文（ふりがな辞書で読める語だけ） */
  label: string;
  /** 地図の金の輪に添える短い文 */
  short: string;
}

export type PathWarnKind = 'fee' | 'fare' | 'bad' | 'early_goal';

export interface PathWarn {
  kind: PathWarnKind;
  label: string;
  /** 払う額（fee・fare。ほかは 0） */
  amount: number;
}

export interface RankedPath {
  /** reachableNodes の中の番号（selectPath に渡す） */
  index: number;
  nodeId: string;
  /** CPU の道選びと同じ点（気まぐれを足す前） */
  score: number;
  /** いちばん効いている理由 */
  tag: PathTag;
  /** 点を上げている理由すべて（強い順。先頭が tag）。無ければ空 */
  tags: PathTag[];
  /** 注意の札（買い物代・運賃・悪い出来事） */
  warns: PathWarn[];
  /** tag が点を上げている理由か（false なら、マスの種類を言っているだけ） */
  hasReason: boolean;
}

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/**
 * 点がこれ以上の内訳だけを「理由」として札にする。
 * 道のマス（0.3）・直す物のない温泉（0.8）・買う物のない店（0.5）のような弱い点は、理由とは言わない。
 */
const REASON_MIN = 1;

/** 点を上げている理由 → 札。amount は ScorePart の amount（独占までの空き地など） */
function tagOf(reason: PathReason, amount: number | undefined): PathTag {
  switch (reason) {
    case 'destination': return { kind: reason, label: '目的地に着く', short: '目的地' };
    case 'toward': return { kind: reason, label: '目的地に近づく', short: '近づく' };
    case 'build': return { kind: reason, label: '建てられる町', short: '建てる' };
    case 'recovery': return { kind: reason, label: '復興特需の町', short: '復興' };
    case 'inspect': return { kind: reason, label: '自分の町を視察', short: '視察' };
    case 'rescue': return { kind: reason, label: '空き家を防ぐ', short: '空き家' };
    case 'monopoly': return { kind: reason, label: `独占まであと${amount ?? 1}区画`, short: '独占' };
    case 'ordinance': return { kind: reason, label: '町長として条例を出す', short: '条例' };
    case 'binbo': return { kind: reason, label: '貧乏神を押し付ける', short: '押し付け' };
    case 'village_good': return { kind: reason, label: '良い出来事の村', short: '良い村' };
    case 'special': return { kind: reason, label: '名所の釣り場', short: '名所' };
    case 'fishing': return { kind: reason, label: '釣り場', short: '釣り場' };
    case 'festival': return { kind: reason, label: 'お祭り', short: 'お祭り' };
    case 'shop':
    case 'start': return { kind: reason, label: '釣具店', short: '釣具店' };
    case 'event_good': return { kind: reason, label: '良い札のマス', short: '良い札' };
    case 'event_random': return { kind: reason, label: '運だめしのマス', short: '運だめし' };
    case 'rest': return { kind: reason, label: '温泉', short: '温泉' };
    case 'goal': return { kind: reason, label: 'ゴール', short: 'ゴール' };
    case 'goal_toward': return { kind: reason, label: 'ゴールに近づく', short: 'ゴールへ' };
    case 'road': return { kind: reason, label: '道のマス', short: '道' };
    default: return { kind: reason, label: '道のマス', short: '道' };
  }
}

/** 点を上げている理由が無いとき: マスの種類をそのまま札にする */
function fallbackTag(ctx: PathContext, nodeId: string): PathTag {
  const node = NODE_MAP.get(nodeId);
  if (!node) return tagOf('road', undefined);
  if (ctx.mode === 'city') {
    switch (node.type) {
      case 'route': return tagOf('road', undefined);
      case 'goal': return tagOf('goal', undefined);
      case 'start': return tagOf('shop', undefined);
      case 'event_good':
      case 'event_random':
      case 'event_bad': return { kind: 'card', label: 'カードがもらえる村', short: 'カード' };
      default: return { kind: 'town', label: '町のマス', short: '町' };
    }
  }
  switch (node.type) {
    case 'fishing_special': return tagOf('special', undefined);
    case 'fishing': return tagOf('fishing', undefined);
    case 'capital': return tagOf('festival', undefined);
    case 'shop':
    case 'start': return tagOf('shop', undefined);
    case 'event_good': return tagOf('event_good', undefined);
    case 'event_random': return tagOf('event_random', undefined);
    case 'event_bad': return { kind: 'event_bad', label: '悪い札のマス', short: '悪い札' };
    case 'rest': return tagOf('rest', undefined);
    case 'goal': return tagOf('goal', undefined);
    default: return tagOf('road', undefined);
  }
}

function warnsOf(ctx: PathContext, parts: ScorePart[]): PathWarn[] {
  const out: PathWarn[] = [];
  for (const p of parts) {
    if (p.reason === 'fee' && (p.amount ?? 0) > 0) out.push({ kind: 'fee', label: `買い物代 ${yen(p.amount!)}`, amount: p.amount! });
    else if (p.reason === 'fare' && (p.amount ?? 0) > 0) out.push({ kind: 'fare', label: `運賃 ${yen(p.amount!)}`, amount: p.amount! });
    else if (p.reason === 'village_bad') out.push({ kind: 'bad', label: '悪い出来事の村', amount: 0 });
    else if (p.reason === 'event_bad') out.push({ kind: 'bad', label: '悪い札のマス', amount: 0 });
    else if (p.reason === 'goal' && p.value < 0 && ctx.mode !== 'city') out.push({ kind: 'early_goal', label: 'ゴールはまだ早い', amount: 0 });
  }
  return out;
}

/** 1本の道の点・理由・注意（index は ctx.paths の中の番号） */
export function describePath(ctx: PathContext, index: number): RankedPath {
  const path = ctx.paths[index] ?? [];
  const nodeId = path[path.length - 1] ?? '';
  const parts = pathScoreParts(ctx, path);
  let score = 0;
  for (const p of parts) score += p.value;
  const tags = parts
    .filter(p => p.value >= REASON_MIN)
    .sort((a, b) => b.value - a.value)
    .map(p => tagOf(p.reason, p.amount));
  return {
    index,
    nodeId,
    score,
    tag: tags[0] ?? fallbackTag(ctx, nodeId),
    tags,
    warns: warnsOf(ctx, parts),
    hasReason: tags.length > 0,
  };
}

/** 行き先をおすすめ順に並べる（点の高い順。同点は注意の少ない方、それも同じなら元の順）。乱数は使わない */
export function rankPaths(ctx: PathContext): RankedPath[] {
  return ctx.paths
    .map((_, i) => describePath(ctx, i))
    .sort((a, b) => b.score - a.score || a.warns.length - b.warns.length || a.index - b.index);
}

/** おすすめとして地図に輪を出す数（上位3つ。2つ目・3つ目は点を上げている理由があるものだけ） */
export const ADVICE_TOP = 3;

export function topPaths(ranked: RankedPath[]): RankedPath[] {
  return ranked.slice(0, ADVICE_TOP).filter((r, i) => i === 0 || r.hasReason);
}

type PathStateLike = Pick<GameState, 'players' | 'currentPlayerIndex' | 'reachableNodes' | 'settings' | 'city' | 'turn' | 'cityGoalClaims' | 'firstFinishTurn'>;

/**
 * ストアの状態から道選びの状況を作る（CPU の道選びと、人へのおすすめで同じものを使う）。
 * 釣り旅: 誰かがゴールしたら締め切りを「最後の巡」とみなす。無制限（0）で誰もゴールしていなければ 0 のまま（中盤とみなす）。
 */
export function pathContextOf(st: PathStateLike): PathContext {
  const isCity = st.settings.mode === 'city';
  const last = fishingLastTurn(st.firstFinishTurn, st.settings.maxTurns);
  return {
    paths: st.reachableNodes,
    mode: isCity ? 'city' : 'fishing',
    player: st.players[st.currentPlayerIndex],
    playerIndex: st.currentPlayerIndex,
    city: st.city,
    turn: st.turn,
    maxTurns: isCity || !Number.isFinite(last) ? st.settings.maxTurns : last,
    goalClaims: st.cityGoalClaims,
    binboHolder: st.city?.binbo?.playerIndex ?? null,
    playerNodes: st.players.map(p => p.currentNode),
  };
}

/**
 * CPU の「狙い」の文（思案中の札に出す）。選んだ道のいちばん効いている理由を、行き先の名前つきで言う。
 * 例: 「金沢の独占まであと1区画…」「目的地の仙台へ急ぐ」
 */
export function pathAim(ctx: PathContext, r: RankedPath): string {
  const name = NODE_MAP.get(r.nodeId)?.name ?? '';
  const dest = ctx.city?.destination ? NODE_MAP.get(ctx.city.destination)?.name ?? '' : '';
  switch (r.tag.kind) {
    case 'destination': return `目的地の${name}に一番乗りだ`;
    case 'toward': return `目的地の${dest}へ急ぐ`;
    case 'build': return `${name}に建てに行く`;
    case 'recovery': return `${name}の復興を手伝う`;
    case 'inspect': return `${name}の様子を見に行く`;
    case 'rescue': return `${name}の空き家が心配だ`;
    case 'monopoly': return `${name}の${r.tag.label}…`;
    case 'ordinance': return `${name}に条例を出しに行く`;
    case 'binbo': return '貧乏神を押し付けに行く';
    case 'village_good': return `${name}で良い出来事を待つ`;
    case 'special': return `名所の${name}で大物を狙う`;
    case 'fishing': return `${name}で釣りをする`;
    case 'festival': return `${name}のお祭りへ`;
    case 'shop':
    case 'start': return `${name}の釣具店へ`;
    case 'event_good': return `${name}で良い札を引く`;
    case 'event_random': return `${name}で運だめし`;
    case 'rest': return `${name}の温泉でひと休み`;
    case 'goal': return 'ゴールへ向かう';
    case 'goal_toward': return 'ゴールへ急ぐ';
    default: return `${name}へ進む`;
  }
}
