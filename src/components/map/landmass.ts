import { BOARD_NODES } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';

// ノード座標を内包する「陸地」シルエットを生成する。
// 各島ごとにノード点群の凸包を取り、外側へ膨らませて Catmull-Rom で平滑化し、
// 海岸線らしい有機的な閉曲線（SVGパス）を作る。これで盤面が「日本地図」に見える。

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

function landPath(nodes: BoardNode[], pad: number): string {
  const pts = nodes.map(n => ({ x: n.x, y: n.y }));
  return smoothClosedPath(expand(convexHull(pts), pad));
}

const inRegions = (regions: string[]) => BOARD_NODES.filter(n => regions.includes(n.region));

// 4つの主要な島（本州は複数地域を結合）
// v3.x: 座標スケール×3に追従してpadも×3
export const LAND_PATHS: string[] = [
  landPath(inRegions(['hokkaido']), 27),
  landPath(inRegions(['tohoku', 'kanto', 'chubu', 'kinki', 'chugoku']), 24),
  landPath(inRegions(['shikoku']), 24),
  landPath(BOARD_NODES.filter(n => n.region === 'kyushu' && n.y < 480), 24),
];

// 南西諸島（種子島〜那覇・ゴール）は小さな島として個別に描く
export const ISLANDS = BOARD_NODES
  .filter(n => n.region === 'kyushu' && n.y >= 480)
  .map(n => ({ cx: n.x, cy: n.y, rx: 21, ry: 18 }));

// 地方名の透かしラベル（各地域ノードの重心に配置）
const REGION_NAMES: Record<string, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部',
  kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州',
};
export const REGION_LABELS = Object.entries(REGION_NAMES).map(([region, name]) => {
  const ns = BOARD_NODES.filter(n => n.region === region && n.y < 480);
  const src = ns.length ? ns : BOARD_NODES.filter(n => n.region === region);
  const cx = src.reduce((s, n) => s + n.x, 0) / src.length;
  const cy = src.reduce((s, n) => s + n.y, 0) / src.length;
  return { name, x: cx, y: cy };
});
