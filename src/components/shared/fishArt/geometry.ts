// 魚の絵の形の計算（DOM を使わない純粋関数）。座標は 240×150 の絵の中（頭が左・尾が右）。
// 輪郭は「背の線（口→尾の付け根の上）」と「腹の線（尾の付け根の下→口）」の2本で持ち、
// ひれはその線に沿って生やす。

export type Pt = [number, number];

/** 絵の中の数を短く書く（小数1桁） */
export const n1 = (v: number): string => String(Math.round(v * 10) / 10);
export const pt = (p: Pt): string => `${n1(p[0])},${n1(p[1])}`;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 配列の値を 0..1 で補間する（ひれ条の長さの並びなど） */
export function interp(arr: readonly number[], t: number): number {
  if (arr.length === 1) return arr[0];
  const x = Math.min(1, Math.max(0, t)) * (arr.length - 1);
  const i = Math.min(arr.length - 2, Math.floor(x));
  return lerp(arr[i], arr[i + 1], x - i);
}

/** 決まった順に出る乱数（魚ごとに模様を固定する） */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---- パス（M / L / C / Q / Z だけ）を点の列にする
const cache = new Map<string, Pt[]>();
export function samplePath(d: string, perSeg = 32): Pt[] {
  const hit = cache.get(d);
  if (hit) return hit;
  const tok = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let i = 0, cmd = 'M';
  let cur: Pt = [0, 0], start: Pt = [0, 0];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'Z') { pts.push(start); cur = start; continue; }
    if (cmd === 'M') { cur = [num(), num()]; start = cur; pts.push(cur); cmd = 'L'; continue; }
    if (cmd === 'L') { const p: Pt = [num(), num()]; for (let k = 1; k <= 4; k++) pts.push([lerp(cur[0], p[0], k / 4), lerp(cur[1], p[1], k / 4)]); cur = p; continue; }
    if (cmd === 'Q') {
      const c: Pt = [num(), num()], p: Pt = [num(), num()];
      for (let k = 1; k <= perSeg; k++) {
        const t = k / perSeg, u = 1 - t;
        pts.push([u * u * cur[0] + 2 * u * t * c[0] + t * t * p[0], u * u * cur[1] + 2 * u * t * c[1] + t * t * p[1]]);
      }
      cur = p; continue;
    }
    if (cmd === 'C') {
      const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()];
      for (let k = 1; k <= perSeg; k++) {
        const t = k / perSeg, u = 1 - t;
        pts.push([
          u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
          u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1],
        ]);
      }
      cur = p; continue;
    }
    i++; // 知らない記号は読み飛ばす
  }
  cache.set(d, pts);
  return pts;
}

/** 線の上で x のときの y（いちばん近い点） */
export function edgeY(pts: readonly Pt[], x: number): number {
  let best = pts[0], bd = Infinity;
  for (const p of pts) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p; } }
  return best[1];
}

/** 背の線と腹の線から体の輪郭を作る */
export function bodyPath(top: string, bottom: string): string {
  return `${top} ${bottom.replace(/^\s*M/, 'L')} Z`;
}

export interface FinShape { d: string; rays: [Pt, Pt][] }

/** 縁に沿うひれ（背びれ・尻びれ）。side=-1 は上向き、+1 は下向き */
export interface EdgeFin {
  x0: number; x1: number; n: number;
  /** ひれ条の長さの並び（前→後） */
  h: readonly number[];
  /** spiny=棘のある膜（切れ込み）/ soft=なめらか */
  kind: 'spiny' | 'soft';
  /** 尾の側へ倒れる角度（ラジアン） */
  lean?: number;
  /** 棘の間の膜の切れ込みの深さ（0..1、小さいほど深い） */
  notch?: number;
}
export function finAlong(edge: string, fin: EdgeFin, side: -1 | 1): FinShape {
  const pts = samplePath(edge).filter(p => p[0] >= fin.x0 && p[0] <= fin.x1).sort((a, b) => a[0] - b[0]);
  if (pts.length < 3) return { d: '', rays: [] };
  const n = Math.max(2, fin.n), bases: Pt[] = [], tips: Pt[] = [], dirs: Pt[] = [];
  const lean = fin.lean ?? 0.4;
  for (let i = 0; i < n; i++) {
    const k = Math.round((i / (n - 1)) * (pts.length - 1));
    const b = pts[k], pa = pts[Math.max(0, k - 2)], pb = pts[Math.min(pts.length - 1, k + 2)];
    let tx = pb[0] - pa[0], ty = pb[1] - pa[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = side < 0 ? ty : -ty, ny = side < 0 ? -tx : tx;
    const dx = nx * Math.cos(lean) + tx * Math.sin(lean), dy = ny * Math.cos(lean) + ty * Math.sin(lean);
    const h = interp(fin.h, i / (n - 1));
    bases.push(b); dirs.push([dx, dy]); tips.push([b[0] + dx * h, b[1] + dy * h]);
  }
  let d = `M ${pt(bases[0])} L ${pt(tips[0])}`;
  for (let i = 0; i < n - 1; i++) {
    if (fin.kind === 'spiny') {
      const hb = interp(fin.h, (i + 1) / (n - 1)) * (fin.notch ?? 0.6);
      const nb: Pt = [bases[i + 1][0] + dirs[i + 1][0] * hb, bases[i + 1][1] + dirs[i + 1][1] * hb];
      const c: Pt = [lerp(tips[i][0], nb[0], 0.55), lerp(tips[i][1], nb[1], 0.55) + (side < 0 ? 1.2 : -1.2)];
      d += ` Q ${pt(c)} ${pt(nb)} L ${pt(tips[i + 1])}`;
    } else {
      const m: Pt = [(tips[i][0] + tips[i + 1][0]) / 2, (tips[i][1] + tips[i + 1][1]) / 2];
      d += ` Q ${pt(tips[i])} ${pt(m)}`;
      if (i === n - 2) d += ` L ${pt(tips[n - 1])}`;
    }
  }
  d += ` L ${pt(bases[n - 1])}`;
  for (const p of pts.filter(p => p[0] < bases[n - 1][0] && p[0] > bases[0][0]).reverse()) d += ` L ${pt(p)}`;
  d += ' Z';
  return { d, rays: bases.map((b, i) => [b, tips[i]] as [Pt, Pt]) };
}

/** 扇のひれ（胸びれ・腹びれ）。角度は +x（尾の向き）から、下向きが正 */
export interface FanFin { base: Pt; a0: number; a1: number; len: readonly number[]; n: number }
export function fan(fin: FanFin): FinShape {
  const [bx, by] = fin.base, n = Math.max(2, fin.n), edge: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = lerp(fin.a0, fin.a1, t), L = interp(fin.len, t);
    edge.push([bx + Math.cos(a) * L, by + Math.sin(a) * L]);
  }
  let d = `M ${n1(bx)},${n1(by)} L ${pt(edge[0])}`;
  for (let i = 0; i < n; i++) {
    const m: Pt = [(edge[i][0] + edge[i + 1][0]) / 2, (edge[i][1] + edge[i + 1][1]) / 2];
    d += ` Q ${pt(edge[i])} ${pt(m)}`;
  }
  d += ` L ${pt(edge[n])} Z`;
  return { d, rays: edge.map(e => [[bx, by] as Pt, [lerp(bx, e[0], 0.94), lerp(by, e[1], 0.94)] as Pt]) };
}

/** 尾びれ。forked 二又 / lunate 三日月 / round 丸 / truncate 切れ（ほぼ直線） / point とがり */
export interface TailFin {
  x: number; top: number; bot: number; spread: number;
  form: 'forked' | 'lunate' | 'round' | 'truncate' | 'point';
  lmin?: number; lmax: number; n: number;
  /** 下の葉を長く（トビウオ）。1 で同じ */
  lowerK?: number;
}
export function caudal(c: TailFin): FinShape {
  const n = c.n, bases: Pt[] = [], edge: Pt[] = [];
  const lmin = c.lmin ?? c.lmax * 0.5;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = lerp(-c.spread, c.spread, u), w = Math.abs(2 * u - 1);
    let L: number;
    switch (c.form) {
      case 'forked': L = lmin + (c.lmax - lmin) * Math.pow(w, 1.25); break;
      case 'lunate': L = lmin + (c.lmax - lmin) * Math.pow(w, 0.7); break;
      case 'truncate': L = c.lmax / Math.max(0.55, Math.cos(a)) * (1 - 0.06 * w); break;
      case 'point': L = c.lmax * (1 - 0.8 * w); break;
      default: L = c.lmax * (1 - 0.18 * w * w);
    }
    if (u > 0.5 && c.lowerK) L *= lerp(1, c.lowerK, (u - 0.5) * 2);
    const b: Pt = [c.x - 2, lerp(c.top, c.bot, u)];
    bases.push(b); edge.push([b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L]);
  }
  let d = `M ${pt(bases[0])} L ${pt(edge[0])}`;
  for (let i = 0; i < n; i++) {
    const m: Pt = [(edge[i][0] + edge[i + 1][0]) / 2, (edge[i][1] + edge[i + 1][1]) / 2];
    d += ` Q ${pt(edge[i])} ${pt(m)}`;
  }
  d += ` L ${pt(edge[n])} L ${pt(bases[n])} Z`;
  return { d, rays: bases.map((b, i) => [b, [lerp(b[0], edge[i][0], 0.94), lerp(b[1], edge[i][1], 0.94)] as Pt] as [Pt, Pt]) };
}

/** 小離鰭（サバ・マグロの尾の前に並ぶ小さなひれ） */
export interface Finlets { x0: number; x1: number; n: number; h: number }
export function finlets(edge: string, fl: Finlets, side: -1 | 1): string[] {
  const pts = samplePath(edge).filter(p => p[0] >= fl.x0 && p[0] <= fl.x1).sort((a, b) => a[0] - b[0]);
  if (pts.length < 2) return [];
  const out: string[] = [];
  for (let i = 0; i < fl.n; i++) {
    const b = pts[Math.round((fl.n === 1 ? 0 : i / (fl.n - 1)) * (pts.length - 1))];
    const tip: Pt = [b[0] + 3.6, b[1] + side * fl.h];
    out.push(`M ${n1(b[0] - 2)},${n1(b[1] - side * 0.6)} L ${pt(tip)} L ${n1(b[0] + 2.4)},${n1(b[1] - side * 0.6)} Z`);
  }
  return out;
}

// ---- 色
export function mix(hex: string, to: string, a: number): string {
  const p = (s: string, k: number) => parseInt(s.slice(1 + k * 2, 3 + k * 2), 16);
  return '#' + [0, 1, 2].map(k => Math.round(lerp(p(hex, k), p(to, k), a)).toString(16).padStart(2, '0')).join('');
}
