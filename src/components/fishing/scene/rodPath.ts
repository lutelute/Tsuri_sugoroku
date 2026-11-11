// 竿（3次ベジェ）を太さの違う節に分けて描くための計算。
// 伸び縮みする座標（viewBox を引き伸ばした SVG）では pathLength と点線で太さを変えられないので、曲線そのものを分ける。

export type Pt = [number, number];
export type Cubic = [Pt, Pt, Pt, Pt];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 3次ベジェを t（0〜1）の点で前後2本に分ける（ド・カステリョ） */
export function splitCubic(c: Cubic, t: number): [Cubic, Cubic] {
  const ab = lerp(c[0], c[1], t);
  const bc = lerp(c[1], c[2], t);
  const cd = lerp(c[2], c[3], t);
  const abc = lerp(ab, bc, t);
  const bcd = lerp(bc, cd, t);
  const mid = lerp(abc, bcd, t);
  return [[c[0], ab, abc, mid], [mid, bcd, cd, c[3]]];
}

/** 曲線上の点 */
export function cubicAt(c: Cubic, t: number): Pt {
  return splitCubic(c, t)[0][3];
}

/** SVG の d（M … C …） */
export function cubicD(c: Cubic): string {
  const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M ${f(c[0])} C ${f(c[1])} ${f(c[2])} ${f(c[3])}`;
}

/** 曲線上の t の位置に、進む向きへ短い線（竹の節）を置く。len は前後の長さ（t の幅） */
export function nodeD(c: Cubic, t: number, len = 0.006): string {
  const a = cubicAt(c, Math.max(0, t - len));
  const b = cubicAt(c, Math.min(1, t + len));
  return `M ${a[0].toFixed(2)} ${a[1].toFixed(2)} L ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
}
