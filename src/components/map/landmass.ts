import { BOARD_NODES } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';

// ノード座標を内包する「エリア」シルエットを生成する。
// v3.2.x: 10エリア分割
//   1. 北海道 / 2. 東北 / 3. 関東 / 4. 中部 / 5. 近畿
//   6. 中国 / 7. 四国 / 8. 九州本島 / 9. 種子島・屋久島 / 10. 沖縄・奄美
// 各エリアは独立した凸包(or 楕円)で描画し、地域境界が視覚的に分かるようにする。

type Pt = { x: number; y: number };

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

// 閉じた Catmull-Rom スプラインを3次ベジェのパス文字列に変換
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

// 沖縄・奄美エリアのノードID（kyushu領域から南西諸島だけを切り出す）
const OKINAWA_IDS = new Set(['amami', 'tokunoshima', 'naha', 'goal', 'r_amami_tokunoshima', 'r_yakushima_amami', 'r_naha_goal']);
// 種子島・屋久島エリアのノードID
const TANEGASHIMA_IDS = new Set(['tanegashima', 'yakushima', 'r_tanegashima_yakushima', 'r_kagoshima_tanegashima', 'r_kagoshima_yakushima']);

// === 10エリアの定義 ===
export interface MapArea {
  id: string;
  name: string;
  nodes: BoardNode[];
  pad: number;
  tone: number; // 0..1, 微妙な色相シフト（10エリアの識別性を上げる）
}

const byRegion = (r: string, exclude?: Set<string>) =>
  BOARD_NODES.filter(n => n.region === r && (!exclude || !exclude.has(n.id)));

const kyushuMain = BOARD_NODES.filter(n =>
  n.region === 'kyushu' && !OKINAWA_IDS.has(n.id) && !TANEGASHIMA_IDS.has(n.id)
);

export const MAP_AREAS: MapArea[] = [
  { id: 'hokkaido', name: '北海道', nodes: byRegion('hokkaido'), pad: 58, tone: 0.0 },
  { id: 'tohoku', name: '東北', nodes: byRegion('tohoku'), pad: 52, tone: 0.1 },
  { id: 'kanto', name: '関東', nodes: byRegion('kanto'), pad: 50, tone: 0.2 },
  { id: 'chubu', name: '中部', nodes: byRegion('chubu'), pad: 52, tone: 0.3 },
  { id: 'kinki', name: '近畿', nodes: byRegion('kinki'), pad: 50, tone: 0.4 },
  { id: 'chugoku', name: '中国', nodes: byRegion('chugoku'), pad: 50, tone: 0.5 },
  { id: 'shikoku', name: '四国', nodes: byRegion('shikoku'), pad: 46, tone: 0.6 },
  { id: 'kyushu_main', name: '九州', nodes: kyushuMain, pad: 50, tone: 0.7 },
  { id: 'tanegashima', name: '種子島・屋久島', nodes: BOARD_NODES.filter(n => TANEGASHIMA_IDS.has(n.id)), pad: 28, tone: 0.85 },
  { id: 'okinawa', name: '沖縄・奄美', nodes: BOARD_NODES.filter(n => OKINAWA_IDS.has(n.id)), pad: 32, tone: 1.0 },
];

// 各エリアのパス。3点以上なら凸包の平滑パス、それ未満なら楕円風の閉曲線。
function areaPath(area: MapArea): string {
  if (area.nodes.length === 0) return '';
  if (area.nodes.length === 1) {
    const n = area.nodes[0];
    return `M ${n.x - area.pad},${n.y} A ${area.pad},${area.pad * 0.85} 0 1,0 ${n.x + area.pad},${n.y} A ${area.pad},${area.pad * 0.85} 0 1,0 ${n.x - area.pad},${n.y} Z`;
  }
  if (area.nodes.length === 2) {
    // 2点を内包する楕円
    const a = area.nodes[0], b = area.nodes[1];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const rx = len / 2 + area.pad;
    const ry = area.pad * 0.9;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    // 楕円パス（angle 0で水平 → rotate(ang) で傾ける）
    return `M ${cx - rx},${cy} A ${rx},${ry} ${ang} 1,0 ${cx + rx},${cy} A ${rx},${ry} ${ang} 1,0 ${cx - rx},${cy} Z`;
  }
  const pts = area.nodes.map(n => ({ x: n.x, y: n.y }));
  return smoothClosedPath(expand(convexHull(pts), area.pad));
}

export const LAND_PATHS: string[] = MAP_AREAS.map(areaPath);

// ISLANDS は廃止 (沖縄・種子島はエリアに統合した)
export const ISLANDS: { cx: number; cy: number; rx: number; ry: number }[] = [];

// 地方名の透かしラベル（各エリア重心）
export const REGION_LABELS = MAP_AREAS
  .filter(a => a.nodes.length > 0)
  .map(a => {
    const cx = a.nodes.reduce((s, n) => s + n.x, 0) / a.nodes.length;
    const cy = a.nodes.reduce((s, n) => s + n.y, 0) / a.nodes.length;
    return { name: a.name, x: cx, y: cy };
  });
