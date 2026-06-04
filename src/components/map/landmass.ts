import { BOARD_NODES } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';

// v3.2.4: 教材レベルの地理正確性を優先。
// 塗り分けは「実際の島の輪郭」だけにする(誤接続を防ぐ)。
//   1. 北海道
//   2. 本州 (東北+関東+中部+近畿+中国 を1島として描く — 全て陸続き)
//   3. 四国 (本州・九州とは海峡で分離)
//   4. 九州本島
//   5. 種子島・屋久島
//   6. 沖縄・奄美 (各島は独立)
// 各地方(8地方)の認識は文字ラベルだけで担保し、地方境界線は描かない。

type Pt = { x: number; y: number };

// === 凸包 + 平滑化 (元の実装) ===
function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expand(hull: Pt[], pad: number): Pt[] {
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad };
  });
}

function smoothClosedPath(pts: Pt[]): string {
  const n = pts.length;
  if (n < 3) return '';
  const f = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${f(pts[0].x)},${f(pts[0].y)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2.x)},${f(p2.y)} `;
  }
  return d + 'Z';
}

function landPath(nodes: BoardNode[], pad: number): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) {
    const n = nodes[0];
    return `M ${n.x - pad},${n.y} A ${pad},${pad * 0.85} 0 1,0 ${n.x + pad},${n.y} A ${pad},${pad * 0.85} 0 1,0 ${n.x - pad},${n.y} Z`;
  }
  if (nodes.length === 2) {
    const a = nodes[0], b = nodes[1];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const rx = len / 2 + pad;
    const ry = pad * 0.9;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return `M ${cx - rx},${cy} A ${rx},${ry} ${ang} 1,0 ${cx + rx},${cy} A ${rx},${ry} ${ang} 1,0 ${cx - rx},${cy} Z`;
  }
  const pts = nodes.map(n => ({ x: n.x, y: n.y }));
  return smoothClosedPath(expand(convexHull(pts), pad));
}

// === ノード分類 (誤接続防止) ===
// 沖縄・奄美 (本土から離れた南西諸島の主要島)
const OKINAWA_IDS = new Set(['amami', 'tokunoshima', 'naha', 'goal', 'r_amami_tokunoshima', 'r_yakushima_amami', 'r_naha_goal']);
// 種子島・屋久島
const TANEGASHIMA_IDS = new Set(['tanegashima', 'yakushima', 'r_tanegashima_yakushima', 'r_kagoshima_tanegashima', 'r_kagoshima_yakushima']);

const byRegion = (r: string) => BOARD_NODES.filter(n => n.region === r);
const kyushuMain = BOARD_NODES.filter(n =>
  n.region === 'kyushu' && !OKINAWA_IDS.has(n.id) && !TANEGASHIMA_IDS.has(n.id)
);
const honshuNodes = BOARD_NODES.filter(n =>
  ['tohoku', 'kanto', 'chubu', 'kinki', 'chugoku'].includes(n.region)
);

// 個別の小島 (沖縄諸島は1ノードずつバラバラの島なので個別に楕円で描く)
function buildOkinawaIslands(): string[] {
  // 主要な「島」となるノードだけを個別に描き、route ノードは描かない
  const mainOkinawa = BOARD_NODES.filter(n =>
    ['amami', 'tokunoshima', 'naha'].includes(n.id)
  );
  return mainOkinawa.map(n => {
    const r = 40;
    return `M ${n.x - r},${n.y} A ${r},${r * 0.8} 0 1,0 ${n.x + r},${n.y} A ${r},${r * 0.8} 0 1,0 ${n.x - r},${n.y} Z`;
  });
}

function buildTanegashimaIslands(): string[] {
  const main = BOARD_NODES.filter(n => ['tanegashima', 'yakushima'].includes(n.id));
  return main.map(n => {
    const r = 32;
    return `M ${n.x - r},${n.y} A ${r},${r * 0.8} 0 1,0 ${n.x + r},${n.y} A ${r},${r * 0.8} 0 1,0 ${n.x - r},${n.y} Z`;
  });
}

// === メイン: 4つの主要島 + 南西諸島 ===
// 「四国-九州」「四国-中国」「本州-九州」「本州-四国」が誤接続しないよう、各島は独立した凸包で描く。
const tanegashimaPaths = buildTanegashimaIslands();
const okinawaPaths = buildOkinawaIslands();

// pad は隣接島との誤接続を避けるため絞る
//   本州: 35 (関東/中部内陸まで含む)
//   北海道: 45 (孤立島なので余裕)
//   四国: 24 (中国/九州との海峡を確保)
//   九州: 30 (四国との豊後水道を確保)
export const LAND_PATHS: string[] = [
  landPath(byRegion('hokkaido'), 45),
  landPath(honshuNodes, 35),
  landPath(byRegion('shikoku'), 24),
  landPath(kyushuMain, 30),
  ...tanegashimaPaths,
  ...okinawaPaths,
];

// 各path に対応する tone (色相シフト用)
export const LAND_TONES: number[] = [
  0.0,        // 北海道
  0.3,        // 本州
  0.6,        // 四国
  0.7,        // 九州本島
  ...tanegashimaPaths.map(() => 0.85),  // 種子島・屋久島
  ...okinawaPaths.map(() => 1.0),       // 奄美・徳之島・那覇
];

export const ISLANDS: { cx: number; cy: number; rx: number; ry: number }[] = [];

// === 10地方ラベル (誤接続のない正しい位置に) ===
// 8地方 + 種子島屋久 + 沖縄奄美 で 10。すべて文字ラベルだけ。
export interface AreaLabel { name: string; x: number; y: number }

const labelCenter = (nodes: BoardNode[]) => {
  if (nodes.length === 0) return null;
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  return { x: cx, y: cy };
};

export const REGION_LABELS: AreaLabel[] = [
  { name: '北海道', ...(labelCenter(byRegion('hokkaido')) ?? { x: 0, y: 0 }) },
  { name: '東北', ...(labelCenter(byRegion('tohoku')) ?? { x: 0, y: 0 }) },
  { name: '関東', ...(labelCenter(byRegion('kanto')) ?? { x: 0, y: 0 }) },
  { name: '中部', ...(labelCenter(byRegion('chubu')) ?? { x: 0, y: 0 }) },
  { name: '近畿', ...(labelCenter(byRegion('kinki')) ?? { x: 0, y: 0 }) },
  { name: '中国', ...(labelCenter(byRegion('chugoku')) ?? { x: 0, y: 0 }) },
  { name: '四国', ...(labelCenter(byRegion('shikoku')) ?? { x: 0, y: 0 }) },
  { name: '九州', ...(labelCenter(kyushuMain) ?? { x: 0, y: 0 }) },
  { name: '種子島・屋久島', ...(labelCenter(BOARD_NODES.filter(n => TANEGASHIMA_IDS.has(n.id) && ['tanegashima','yakushima'].includes(n.id))) ?? { x: 0, y: 0 }) },
  { name: '沖縄・奄美', ...(labelCenter(BOARD_NODES.filter(n => ['amami','tokunoshima','naha'].includes(n.id))) ?? { x: 0, y: 0 }) },
];

// MAP_AREAS は後方互換のため、JapanMap が tone を参照するのに使われる
export interface MapArea {
  id: string;
  name: string;
  nodes: BoardNode[];
  pad: number;
  tone: number;
}

export const MAP_AREAS: MapArea[] = [
  { id: 'hokkaido', name: '北海道', nodes: byRegion('hokkaido'), pad: 55, tone: 0.0 },
  { id: 'honshu', name: '本州', nodes: honshuNodes, pad: 50, tone: 0.3 },
  { id: 'shikoku', name: '四国', nodes: byRegion('shikoku'), pad: 42, tone: 0.6 },
  { id: 'kyushu_main', name: '九州', nodes: kyushuMain, pad: 48, tone: 0.7 },
  { id: 'tanegashima', name: '種子島・屋久島', nodes: BOARD_NODES.filter(n => TANEGASHIMA_IDS.has(n.id)), pad: 32, tone: 0.85 },
  { id: 'okinawa', name: '沖縄・奄美', nodes: BOARD_NODES.filter(n => OKINAWA_IDS.has(n.id)), pad: 40, tone: 1.0 },
];
