#!/usr/bin/env node
// 盤面ノード座標の再配置スクリプト
// ------------------------------------------------------------
// 主要マス: 実在地の緯度経度 → ゲーム座標へ投影し、重なり回避の弱い反発で微調整。
// 中継マス(route): 両端マスの中点。近すぎる場合は法線方向へ逃がす。
// 投影式は scripts/build-japan-geo.mjs と同一（地図と完全に一致させるため）。
//
// 使い方: node scripts/relayout-nodes.mjs   （src/data/realisticData_nodes.ts を上書き）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES = path.resolve(__dirname, '../src/data/realisticData_nodes.ts');
const EDGES = path.resolve(__dirname, '../src/data/realisticData_edges.ts');

const project = (lat, lon) => [84 + (lon - 127.7) * 67.6, 1445 - (lat - 26.2) * 79.4];

// 実在地（市役所・港付近）の緯度経度
const LATLON = {
  start: [44.02, 144.27], // 網走
  goal: [25.35, 127.8], // 沖縄本島の南の海（旅の終着点）
  wakkanai: [45.415, 141.673],
  kushiro: [42.985, 144.381],
  asahikawa: [43.771, 142.365],
  obihiro: [42.924, 143.196],
  sapporo: [43.062, 141.354],
  otaru: [43.19, 140.994],
  hakodate: [41.769, 140.729],
  aomori: [40.822, 140.747],
  akita: [39.72, 140.103],
  morioka: [39.702, 141.154],
  kamaishi: [39.276, 141.886],
  yamagata: [38.255, 140.34],
  sakata: [38.914, 139.836],
  sendai: [38.268, 140.872],
  tsuruoka: [38.727, 139.827],
  niigata: [37.916, 139.036],
  fukushima: [37.75, 140.468],
  choshi: [35.735, 140.827],
  tokyo: [35.681, 139.767],
  yokohama: [35.444, 139.638],
  kamakura: [35.319, 139.547],
  odawara: [35.264, 139.152],
  nikko: [36.72, 139.698],
  maebashi: [36.389, 139.063],
  chichibu: [35.992, 139.085],
  nagano: [36.648, 138.194],
  toyama: [36.695, 137.211],
  kanazawa: [36.561, 136.656],
  takayama: [36.146, 137.252],
  shizuoka: [34.975, 138.383],
  numazu: [35.096, 138.863],
  nagoya: [35.181, 136.906],
  fukui: [36.064, 136.219],
  matsumoto: [36.238, 137.972],
  hamamatsu: [34.71, 137.726],
  maizuru: [35.474, 135.386],
  kyoto: [35.011, 135.768],
  nara: [34.685, 135.805],
  ise: [34.487, 136.709],
  kobe: [34.69, 135.196],
  osaka: [34.694, 135.502],
  wakayama: [34.226, 135.167],
  shirarahama: [33.678, 135.348],
  toba: [34.481, 136.843],
  tottori: [35.501, 134.235],
  matsue: [35.468, 133.049],
  kurashiki: [34.585, 133.772],
  okayama: [34.662, 133.935],
  onomichi: [34.409, 133.205],
  hiroshima: [34.385, 132.455],
  shimonoseki: [33.958, 130.941],
  hagi: [34.408, 131.399],
  iwakuni: [34.166, 132.22],
  tokushima: [34.07, 134.555],
  kochi: [33.559, 133.531],
  matsuyama: [33.839, 132.765],
  uwajima: [33.223, 132.56],
  takamatsu: [34.34, 134.047],
  shimanto: [32.991, 132.934],
  naruto: [34.172, 134.609],
  fukuoka: [33.59, 130.401],
  saga: [33.249, 130.299],
  beppu: [33.284, 131.491],
  oita: [33.238, 131.612],
  nagasaki: [32.75, 129.878],
  kumamoto: [32.803, 130.708],
  nobeoka: [32.582, 131.665],
  miyazaki: [31.911, 131.424],
  kagoshima: [31.596, 130.557],
  kirishima: [31.741, 130.763],
  amakusa: [32.458, 130.193],
  aoshima: [31.805, 131.475],
  tanegashima: [30.732, 130.997],
  yakushima: [30.43, 130.57],
  amami: [28.377, 129.494],
  tokunoshima: [27.73, 128.96],
  naha: [26.212, 127.681],
};

const MAIN_MIN_DIST = 31; // 主要マス同士の最小距離（ラベルが重ならない程度）
const MAX_DRIFT = 22; // 実在地からの最大ずれ（≒30km）
const ROUTE_MIN_DIST = 15; // 中継マスと他マスの最小距離
const LAND_INSET = 3; // 陸の都市を海岸線から内側へ入れる量

// ===== 陸地判定（生成済みの japanGeo.ts の県ポリゴンを使う） =====
const GEO = path.resolve(__dirname, '../src/data/japanGeo.ts');
const rings = [];
{
  const geoSrc = fs.readFileSync(GEO, 'utf8');
  const m = geoSrc.match(/GEO_PREFECTURES: GeoPrefecture\[\] = (\[.*?\]);\n/s);
  const prefs = JSON.parse(m[1]);
  for (const p of prefs) {
    for (const part of p.d.split('Z')) {
      if (!part.startsWith('M')) continue;
      const toks = part.slice(1).split('l');
      let [x, y] = toks[0].trim().split(' ').map(Number);
      const ring = [[x, y]];
      for (const t of toks.slice(1)) {
        const [dx, dy] = t.trim().split(' ').map(Number);
        x += dx; y += dy;
        ring.push([x, y]);
      }
      rings.push(ring);
    }
  }
}
function inRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const onLand = (x, y) => rings.some(r => inRing(x, y, r));
/** 最寄りの海岸線上の点と、そこから陸側へ inset だけ入った点 */
function nearestLand(x, y, inset) {
  let best = null;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[j];
      const [bx, by] = r[i];
      const dx = bx - ax, dy = by - ay;
      const L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
      const qx = ax + t * dx, qy = ay + t * dy;
      const d = Math.hypot(qx - x, qy - y);
      if (!best || d < best.d) best = { d, qx, qy };
    }
  }
  if (!best) return null;
  // 海岸線から陸側へ（点→海岸の方向にさらに inset 進む）
  const vx = best.qx - x, vy = best.qy - y;
  const vl = Math.hypot(vx, vy) || 1;
  for (const k of [inset, inset * 0.5, 0.5]) {
    const nx = best.qx + (vx / vl) * k, ny = best.qy + (vy / vl) * k;
    if (onLand(nx, ny)) return { x: nx, y: ny, d: best.d };
  }
  return { x: best.qx, y: best.qy, d: best.d };
}

const src = fs.readFileSync(NODES, 'utf8');
const edgeSrc = fs.readFileSync(EDGES, 'utf8');

// ノード行を解析
const lineRe = /\{ id: '(\w+)',[^\n]*?type: '(\w+)'[^\n]*?x: (-?[\d.]+), y: (-?[\d.]+)/g;
const nodes = new Map();
let m;
while ((m = lineRe.exec(src))) {
  nodes.set(m[1], { id: m[1], type: m[2], x: Number(m[3]), y: Number(m[4]) });
}

// 隣接
const adj = new Map();
const edgeRe = /from: '(\w+)', to: '(\w+)'/g;
while ((m = edgeRe.exec(edgeSrc))) {
  for (const [a, b] of [[m[1], m[2]], [m[2], m[1]]]) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
}

// 1. 主要マス: 投影 + 反発
const main = [...nodes.values()].filter((n) => n.type !== 'route');
const missing = main.filter((n) => !LATLON[n.id]).map((n) => n.id);
if (missing.length) {
  console.error('LATLON 未定義:', missing.join(', '));
  process.exit(1);
}
const anchor = new Map();
for (const n of main) {
  let [x, y] = project(...LATLON[n.id]);
  // 実在地が海岸線のわずかに外（港）に出る場合も、陸の上に置く
  if (n.id !== 'goal') {
    if (!onLand(x, y)) {
      const q = nearestLand(x, y, LAND_INSET);
      if (q && q.d < 12) { x = q.x; y = q.y; }
    }
    n.landLocked = onLand(x, y);
  }
  anchor.set(n.id, [x, y]);
  n.x = x;
  n.y = y;
}
for (let iter = 0; iter < 200; iter++) {
  let moved = 0;
  for (let i = 0; i < main.length; i++) {
    for (let j = i + 1; j < main.length; j++) {
      const a = main[i];
      const b = main[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < MAIN_MIN_DIST) {
        const push = (MAIN_MIN_DIST - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        moved++;
      }
    }
  }
  // 実在地へ引き戻し + ずれ上限 + 陸の都市は陸に留める
  for (const n of main) {
    const [ax, ay] = anchor.get(n.id);
    n.x += (ax - n.x) * 0.05;
    n.y += (ay - n.y) * 0.05;
    const dx = n.x - ax;
    const dy = n.y - ay;
    const d = Math.hypot(dx, dy);
    if (d > MAX_DRIFT) {
      n.x = ax + (dx / d) * MAX_DRIFT;
      n.y = ay + (dy / d) * MAX_DRIFT;
    }
    if (n.landLocked && !onLand(n.x, n.y)) {
      const q = nearestLand(n.x, n.y, LAND_INSET);
      if (q && q.d < 30) { n.x = q.x; n.y = q.y; }
    }
  }
  if (moved === 0 && iter > 5) break;
}

// 2. 中継マス: 両端の中点 → 近接回避
const routes = [...nodes.values()].filter((n) => n.type === 'route');
for (const r of routes) {
  const nb = (adj.get(r.id) || []).map((id) => nodes.get(id)).filter(Boolean);
  if (nb.length >= 2) {
    r.x = (nb[0].x + nb[1].x) / 2;
    r.y = (nb[0].y + nb[1].y) / 2;
    r.a = nb[0];
    r.b = nb[1];
  }
}
for (let iter = 0; iter < 60; iter++) {
  let moved = 0;
  for (const r of routes) {
    if (!r.a) continue;
    const ex = r.b.x - r.a.x;
    const ey = r.b.y - r.a.y;
    const el = Math.hypot(ex, ey) || 1;
    const px = -ey / el;
    const py = ex / el;
    for (const o of nodes.values()) {
      if (o === r) continue;
      const dx = r.x - o.x;
      const dy = r.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < ROUTE_MIN_DIST) {
        // 法線方向（相手から離れる向き）へずらす
        const side = dx * px + dy * py >= 0 ? 1 : -1;
        const push = (ROUTE_MIN_DIST - d) * 0.6 + 0.5;
        r.x += px * push * side;
        r.y += py * push * side;
        moved++;
      }
    }
  }
  if (moved === 0) break;
}

// 3. 書き戻し（x, y の数値だけ置換）
const round = (v) => Math.round(v);
let out = src.replace(lineRe, (whole, id) => {
  const n = nodes.get(id);
  return whole.replace(/x: -?[\d.]+, y: -?[\d.]+/, `x: ${round(n.x)}, y: ${round(n.y)}`);
});
out = out.replace("description: '冒険の始まり！装備を整えよう'", "description: 'オホーツクの港町・網走から冒険の始まり！装備を整えよう'");
fs.writeFileSync(NODES, out);

// レポート
const drift = main
  .map((n) => ({ id: n.id, d: Math.hypot(n.x - anchor.get(n.id)[0], n.y - anchor.get(n.id)[1]) }))
  .sort((a, b) => b.d - a.d)
  .slice(0, 8)
  .map((o) => `${o.id}:${o.d.toFixed(1)}`)
  .join(' ');
console.log(`relayout: main=${main.length} route=${routes.length}`);
console.log(`最大ずれ上位: ${drift}`);
const sea = main.filter(n => n.id !== 'goal' && !onLand(n.x, n.y)).map(n => n.id);
console.log(`海上の主要マス: ${sea.join(', ') || 'なし'}`);
let minPair = [Infinity, '', ''];
for (let i = 0; i < main.length; i++) for (let j = i + 1; j < main.length; j++) {
  const d = Math.hypot(main[i].x - main[j].x, main[i].y - main[j].y);
  if (d < minPair[0]) minPair = [d, main[i].id, main[j].id];
}
console.log(`最も近い主要マス: ${minPair[1]}-${minPair[2]} ${minPair[0].toFixed(1)}`);
