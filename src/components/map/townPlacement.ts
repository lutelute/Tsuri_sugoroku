// 地図の上の町の姿（家並み）の置き場所を決める純粋関数。
// 既定はマスの左上。そこが地名・ほかのマス（中継マスも）・ほかの町の家並みにかぶるときは、
// 真上・左・左下の中から、かぶりのいちばん少ない場所を選ぶ（どのマスの町か分かるよう、いつも左か上）。
// 寄った表示（1.2 倍・寄りの地名）と中くらいの表示（1.5 倍・中の地名）の両方で見て、1つに決める。
// 盤と地名の配置は不変なので障害物は一度だけ作り、町ごとの近くの障害物も覚えておく。
import { BOARD_NODES, NODE_MAP } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';
import { CITY_SPECIALTIES } from '../../data/citySpecialties';
import { LABEL_FONT, LABEL_LAYOUT } from './labelLayout';
import type { LabelLod } from './labelLayout';
import { nodeRadius } from './mapTheme';

export type TownAnchor = 'ul' | 'uc' | 'l' | 'dl';

export interface Box { x0: number; y0: number; x1: number; y1: number }

/** 家並みの大きさ（倍率を掛ける前。足もとの帯と、左に並ぶ発展度の丸・町長の家紋を含む） */
export interface TownSize { id: string; w: number; h: number }

export interface TownPlace {
  anchor: TownAnchor;
  /** 動かない角（ここを軸に拡大する）の地図の座標 */
  px: number;
  py: number;
  /** 軸から見た家並みの向き: h は -1=左へ伸びる 0=左右に振り分け 1=右へ伸びる、v は -1=上へ 1=下へ */
  h: -1 | 0 | 1;
  v: -1 | 1;
}

/** index.css の .tw-town の倍率と同じにすること（寄り 1.2・中 1.3） */
export const TOWN_SCALE: Record<Exclude<LabelLod, 'far'>, number> = { near: 1.2, mid: 1.3 };

// 家並みはいつもマスの「左か上」に置く（右上は駒のピン、右は名産の印の場所。どのマスの町か迷わせない）
const ANCHORS: { anchor: TownAnchor; h: -1 | 0 | 1; v: -1 | 1; pref: number; at: (n: BoardNode, r: number) => [number, number] }[] = [
  { anchor: 'ul', h: -1, v: -1, pref: 0, at: (n, r) => [n.x - 0.3, n.y - r] },
  { anchor: 'uc', h: 0, v: -1, pref: 0.25, at: (n, r) => [n.x, n.y - r - 0.8] },
  { anchor: 'l', h: -1, v: -1, pref: 0.45, at: (n, r) => [n.x - r - 1.6, n.y + 3.6] },
  { anchor: 'dl', h: -1, v: 1, pref: 0.9, at: (n, r) => [n.x - 0.3, n.y + r + 0.8] },
];

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/** 家並みの占める四角（軸・向き・大きさ・倍率から） */
export function townBox(p: Pick<TownPlace, 'px' | 'py' | 'h' | 'v'>, w: number, h: number, scale: number): Box {
  const W = w * scale;
  const H = h * scale;
  const x0 = p.h === -1 ? p.px - W : p.h === 0 ? p.px - W / 2 : p.px;
  const y0 = p.v === -1 ? p.py - H : p.py;
  return { x0, y0, x1: x0 + W, y1: y0 + H };
}

// ===== 動かない障害物 =====

interface Obstacle { box: Box; weight: number; owner?: string }

const LABEL_PAD = 1.6;
/** かぶりの重さ: 地名がいちばん重く、次がほかのマス */
const LABEL_WEIGHT = 4;
const NODE_WEIGHT = 3.5;
/** 自分のマスの右上に立つ駒のピン（いつもではないが、大きな町にはよく駒が止まる） */
const PIN_WEIGHT = 2;

/** 地名の四角（labelLayout と同じ見積もり。縁取りの太さぶん少し広げる） */
export function labelBoxes(lod: Exclude<LabelLod, 'far'>): { id: string; box: Box }[] {
  const out: { id: string; box: Box }[] = [];
  for (const n of BOARD_NODES) {
    if (n.type === 'route') continue;
    const L = LABEL_LAYOUT.get(n.id);
    if (!L) continue;
    const major = n.type === 'capital' || n.type === 'start' || n.type === 'goal';
    const fs = major ? LABEL_FONT[lod].cap : LABEL_FONT[lod].node;
    const w = n.name.length * fs * 1.02 + fs * 0.3;
    const h = fs * 1.2;
    const [ox, oy] = L[lod];
    const cx = n.x + ox;
    const cy = n.y + oy;
    out.push({ id: n.id, box: { x0: cx - w / 2 - LABEL_PAD, y0: cy - h / 2 - LABEL_PAD, x1: cx + w / 2 + LABEL_PAD, y1: cy + h / 2 + LABEL_PAD } });
  }
  return out;
}

const STATIC: Record<'near' | 'mid', Obstacle[]> = (() => {
  const make = (lod: 'near' | 'mid'): Obstacle[] => {
    const out: Obstacle[] = [];
    for (const l of labelBoxes(lod)) out.push({ box: l.box, weight: LABEL_WEIGHT, owner: l.id });
    for (const n of BOARD_NODES) {
      const r = nodeRadius(n) + (n.type === 'route' ? 1.6 : 1.2);
      out.push({ box: { x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r }, weight: NODE_WEIGHT, owner: n.id });
      // 名産の印（マスの右）
      if (CITY_SPECIALTIES[n.id]) {
        const x = n.x + nodeRadius(n) + 2;
        out.push({ box: { x0: x - 2, y0: n.y - 2, x1: x + 14, y1: n.y + 16 }, weight: 2 });
      }
    }
    return out;
  };
  return { near: make('near'), mid: make('mid') };
})();

const REACH = 70;
const nearCache = new Map<string, Record<'near' | 'mid', Obstacle[]>>();
function obstaclesNear(n: BoardNode): Record<'near' | 'mid', Obstacle[]> {
  const hit = nearCache.get(n.id);
  if (hit) return hit;
  const pick = (list: Obstacle[]) => list.filter(o => o.box.x1 > n.x - REACH && o.box.x0 < n.x + REACH && o.box.y1 > n.y - REACH && o.box.y0 < n.y + REACH);
  const res = { near: pick(STATIC.near), mid: pick(STATIC.mid) };
  nearCache.set(n.id, res);
  return res;
}

/** かぶりの重さ（小さいほど良い）。placed はすでに置いたほかの町の家並み */
function costOf(n: BoardNode, c: (typeof ANCHORS)[number], size: TownSize, placed: Box[]): number {
  const r = nodeRadius(n);
  const [px, py] = c.at(n, r);
  const near = obstaclesNear(n);
  let cost = c.pref * size.w * size.h * 0.2;
  for (const lod of ['near', 'mid'] as const) {
    const box = townBox({ px, py, h: c.h, v: c.v }, size.w, size.h, TOWN_SCALE[lod]);
    for (const o of near[lod]) {
      // 自分のマスの丸は、どの置き方でも踏まない作りなので数えない（余白ぶんの触れを誤って罰しない）
      if (o.owner === n.id && o.weight === NODE_WEIGHT) continue;
      cost += overlap(box, o.box) * o.weight;
    }
    cost += overlap(box, { x0: n.x + 3, y0: n.y - 41, x1: n.x + 21, y1: n.y - 3 }) * PIN_WEIGHT;
    if (lod === 'near') for (const b of placed) cost += overlap(box, b) * 3;
  }
  return cost;
}

/**
 * 家並みの置き場所を決める。大きい家並みから順に置き、置いたものは次の町の障害物になる。
 * 同じ入力なら同じ結果（描画のたびに揺れない）。
 */
export function placeTowns(sizes: TownSize[]): Map<string, TownPlace> {
  const out = new Map<string, TownPlace>();
  const placed: Box[] = [];
  const order = [...sizes].sort((a, b) => b.w * b.h - a.w * a.h || (a.id < b.id ? -1 : 1));
  for (const size of order) {
    const n = NODE_MAP.get(size.id);
    if (!n) continue;
    let best: { c: (typeof ANCHORS)[number]; cost: number } | null = null;
    for (const c of ANCHORS) {
      const cost = costOf(n, c, size, placed);
      if (!best || cost < best.cost - 1e-6) best = { c, cost };
    }
    if (!best) continue;
    const [px, py] = best.c.at(n, nodeRadius(n));
    const place: TownPlace = { anchor: best.c.anchor, px, py, h: best.c.h, v: best.c.v };
    out.set(size.id, place);
    placed.push(townBox(place, size.w, size.h, TOWN_SCALE.near));
  }
  return out;
}

/** 既定（左上）に置いたときの場所（比べるため・家並みの無いときの印の位置） */
export function defaultPlace(id: string): TownPlace | null {
  const n = NODE_MAP.get(id);
  if (!n) return null;
  const c = ANCHORS[0];
  const [px, py] = c.at(n, nodeRadius(n));
  return { anchor: c.anchor, px, py, h: c.h, v: c.v };
}

/** ある置き方での、地名とほかのマスへのかぶりの面積（テストと点検用） */
export function placementOverlap(id: string, place: TownPlace, size: TownSize, lod: 'near' | 'mid'): { labels: number; nodes: number } {
  const n = NODE_MAP.get(id);
  if (!n) return { labels: 0, nodes: 0 };
  const box = townBox(place, size.w, size.h, TOWN_SCALE[lod]);
  let labels = 0;
  let nodes = 0;
  for (const o of obstaclesNear(n)[lod]) {
    const a = overlap(box, o.box);
    if (a <= 0) continue;
    if (o.weight === LABEL_WEIGHT) labels += a;
    else if (o.weight === NODE_WEIGHT && o.owner !== id) nodes += a;
  }
  return { labels, nodes };
}
