#!/usr/bin/env node
// 日本地図ジオメトリ生成スクリプト
// ------------------------------------------------------------
// 入力: 都道府県 TopoJSON（dataofjapan/land の japan.topojson）
//   出典: 地球地図日本（国土地理院） https://www.gsi.go.jp/kankyochiri/gm_jpn.html
// 出力: src/data/japanGeo.ts（ゲーム座標に投影・簡略化済みの SVG パス）
//
// ゲーム座標への投影式（v3.2.5 以降のノード座標と同一）:
//   x = 84 + (lon - 127.7) * 67.6
//   y = 1445 - (lat - 26.2) * 79.4
//
// 使い方:
//   node scripts/build-japan-geo.mjs [path/to/japan.topojson]
//   （引数省略時は GitHub から取得）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data/japanGeo.ts');
const SRC_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson';

// 簡略化の許容誤差（ゲーム座標単位。1単位 ≒ 1.4km）
const EPS = 0.55;
// これより小さい島は捨てる（ゲーム座標の面積単位²）。ただしマスの近くの島は残す。
const MIN_RING_AREA = 4;
const KEEP_NEAR_NODE = 26;

const project = ([lon, lat]) => [84 + (lon - 127.7) * 67.6, 1445 - (lat - 26.2) * 79.4];

// 都道府県コード → 表示用の地方
function regionOf(code) {
  if (code === 1) return 'hokkaido';
  if (code <= 7) return 'tohoku';
  if (code <= 14) return 'kanto';
  if (code <= 23) return 'chubu';
  if (code <= 30) return 'kinki';
  if (code <= 35) return 'chugoku';
  if (code <= 39) return 'shikoku';
  if (code <= 46) return 'kyushu';
  return 'okinawa';
}

async function loadTopo() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(fs.readFileSync(arg, 'utf8'));
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

// ノード座標（島を残す判定に使う）を realisticData_nodes.ts から素朴に抽出
function loadNodePoints() {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/data/realisticData_nodes.ts'), 'utf8');
  const pts = [];
  const re = /type: '(\w+)'[^}]*?x: (-?[\d.]+), y: (-?[\d.]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] === 'route') continue;
    pts.push([Number(m[2]), Number(m[3])]);
  }
  return pts;
}

// Douglas–Peucker（端点は必ず保持 → 共有アークの位相が保たれる）
function simplify(points, eps) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function ringArea(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  }
  return Math.abs(s / 2);
}

const f1 = (v) => Math.round(v * 10) / 10;

function pathOfRing(pts) {
  if (pts.length < 3) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  let px = f1(pts[0][0]);
  let py = f1(pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const x = f1(pts[i][0]);
    const y = f1(pts[i][1]);
    if (x === px && y === py) continue;
    // 相対座標で短く
    d += `l${f1(x - px)} ${f1(y - py)}`;
    px = x;
    py = y;
  }
  return d + 'Z';
}

function pathOfLine(pts) {
  if (pts.length < 2) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  let px = f1(pts[0][0]);
  let py = f1(pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const x = f1(pts[i][0]);
    const y = f1(pts[i][1]);
    if (x === px && y === py) continue;
    d += `l${f1(x - px)} ${f1(y - py)}`;
    px = x;
    py = y;
  }
  return d;
}

async function main() {
  const topo = await loadTopo();
  const { scale, translate } = topo.transform;
  const nodePts = loadNodePoints();

  // 1. アークをデコード→投影→簡略化
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    const pts = arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return project([x * scale[0] + translate[0], y * scale[1] + translate[1]]);
    });
    return simplify(pts, EPS);
  });
  const arcPoints = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());

  // 2. 都道府県ごとのリングを組み立て、小島を間引く
  const arcUse = new Map(); // arcIndex → Set(prefCode)
  const prefs = [];
  for (const g of topo.objects.japan.geometries) {
    const code = g.properties.id;
    const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
    const rings = [];
    for (const poly of polys) {
      for (const ringArcs of poly) {
        let pts = [];
        for (const ai of ringArcs) {
          const p = arcPoints(ai);
          pts = pts.length ? pts.concat(p.slice(1)) : p.slice();
        }
        const area = ringArea(pts);
        const near = nodePts.some(([nx, ny]) => pts.some(([x, y]) => Math.abs(x - nx) + Math.abs(y - ny) < KEEP_NEAR_NODE));
        if (area < MIN_RING_AREA && !(near && area > 0.6)) continue;
        rings.push({ pts, arcs: ringArcs });
        for (const ai of ringArcs) {
          const k = ai >= 0 ? ai : ~ai;
          if (!arcUse.has(k)) arcUse.set(k, new Set());
          arcUse.get(k).add(code);
        }
      }
    }
    prefs.push({ code, name: g.properties.nam_ja, region: regionOf(code), rings });
  }
  prefs.sort((a, b) => a.code - b.code);

  // 3. 線レイヤ（海岸線 / 県境 / 地方境）
  const coast = [];
  const prefBorders = [];
  const regionBorders = [];
  const codeRegion = new Map(prefs.map((p) => [p.code, p.region]));
  for (const [k, users] of arcUse) {
    const d = pathOfLine(arcs[k]);
    if (!d) continue;
    if (users.size === 1) {
      // 1県だけが使うアーク = 海岸線（県内の自己接触は稀なので無視）
      coast.push(d);
    } else {
      const regions = new Set([...users].map((c) => codeRegion.get(c)));
      (regions.size > 1 ? regionBorders : prefBorders).push(d);
    }
  }

  // 4. 地方ごとのラベル重心（最大リング基準）
  const regionBoxes = {};
  for (const p of prefs) {
    for (const r of p.rings) {
      const b = (regionBoxes[p.region] ??= { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
      for (const [x, y] of r.pts) {
        b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
        b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
      }
    }
  }

  const prefOut = prefs.map((p) => {
    // 県名ラベル位置: 最大リングの重心
    const big = p.rings.slice().sort((a, b) => ringArea(b.pts) - ringArea(a.pts))[0];
    let cx = 0; let cy = 0;
    if (big) {
      for (const [x, y] of big.pts) { cx += x; cy += y; }
      cx /= big.pts.length; cy /= big.pts.length;
    }
    return {
      code: p.code,
      name: p.name,
      region: p.region,
      d: p.rings.map((r) => pathOfRing(r.pts)).join(''),
      lx: f1(cx),
      ly: f1(cy),
    };
  });

  const totalPts = prefs.reduce((s, p) => s + p.rings.reduce((t, r) => t + r.pts.length, 0), 0);

  const header = `// 自動生成ファイル — 直接編集しないこと。\n// 生成: node scripts/build-japan-geo.mjs\n// 出典: 地球地図日本（国土地理院）を dataofjapan/land 経由で取得し、ゲーム座標へ投影・簡略化\n// 投影: x = 84 + (lon - 127.7) * 67.6, y = 1445 - (lat - 26.2) * 79.4\n// 頂点数: ${totalPts}\n\n`;
  const body = [
    `export type GeoRegion = 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kinki' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa';`,
    ``,
    `export interface GeoPrefecture {`,
    `  code: number;`,
    `  name: string;`,
    `  region: GeoRegion;`,
    `  /** SVG パス（複数リング連結） */`,
    `  d: string;`,
    `  /** 県名ラベルの位置（最大の島の重心） */`,
    `  lx: number;`,
    `  ly: number;`,
    `}`,
    ``,
    `export const GEO_PREFECTURES: GeoPrefecture[] = ${JSON.stringify(prefOut)};`,
    ``,
    `/** 海岸線（1県のみが使うアーク） */`,
    `export const GEO_COAST = ${JSON.stringify(coast.join(''))};`,
    ``,
    `/** 同じ地方内の県境 */`,
    `export const GEO_PREF_BORDERS = ${JSON.stringify(prefBorders.join(''))};`,
    ``,
    `/** 地方どうしの境界 */`,
    `export const GEO_REGION_BORDERS = ${JSON.stringify(regionBorders.join(''))};`,
    ``,
    `/** 地方ごとの外接矩形 */`,
    `export const GEO_REGION_BOUNDS: Record<GeoRegion, { minX: number; minY: number; maxX: number; maxY: number }> = ${JSON.stringify(
      Object.fromEntries(Object.entries(regionBoxes).map(([k, b]) => [k, { minX: f1(b.minX), minY: f1(b.minY), maxX: f1(b.maxX), maxY: f1(b.maxY) }])),
    )};`,
    ``,
  ].join('\n');

  fs.writeFileSync(OUT, header + body);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${kb} KB, ${totalPts} vertices, ${prefOut.length} prefectures)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
