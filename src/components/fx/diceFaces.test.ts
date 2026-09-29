import { describe, expect, it } from 'vitest';
import { FACES, PIPS, TOP_ROT, VIEW_TILT, diceTransform } from './diceFaces';
import { hash01 } from './prng';
import { finishLabel } from './nodeStyle';

// CSS の rotateX / rotateY（y 軸は下向き、z 軸は手前向き）をベクトルに適用する
type V = [number, number, number];
const rad = (d: number) => (d * Math.PI) / 180;
function rotX(v: V, deg: number): V {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}
function rotY(v: V, deg: number): V {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}
/** "rotateX(a) rotateY(b) ..." をベクトルに適用する（CSS と同じく右から順にかかる） */
function applyTransform(t: string, v: V): V {
  const ops = [...t.matchAll(/rotate([XY])\((-?[\d.]+)deg\)/g)].reverse();
  for (const [, axis, deg] of ops) v = axis === 'X' ? rotX(v, Number(deg)) : rotY(v, Number(deg));
  return v;
}
/** 面の配置 transform（"rotateY(90deg) translateZ(h)" 等）から面の法線を求める */
const faceNormal = (value: number): V => applyTransform(FACES.find(f => f.value === value)!.transform(50), [0, 0, 1]);
/** 立方体の transform をかけたあとの各面の法線 */
const normalsAfter = (t: string) => [1, 2, 3, 4, 5, 6].map(f => ({ f, n: applyTransform(t, faceNormal(f)) }));
// 上向きは y が負。見下ろす傾きをかけた「真上」にいちばん近い面が上の面。手前（見る人の方）は z が正
const UP = rotX([0, -1, 0], VIEW_TILT);
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const topFace = (t: string) => normalsAfter(t).reduce((a, b) => (dot(b.n, UP) > dot(a.n, UP) ? b : a)).f;
const mostVisible = (t: string) => normalsAfter(t).reduce((a, b) => (b.n[2] > a.n[2] ? b : a)).f;

describe('3D サイコロの向き', () => {
  it('向かい合う面の和は7で、1〜6が1面ずつある', () => {
    const values = FACES.map(f => f.value).sort();
    expect(values).toEqual([1, 2, 3, 4, 5, 6]);
    for (const v of values) {
      const n = faceNormal(v);
      const opposite = faceNormal(7 - v);
      expect(n[0] + opposite[0]).toBeCloseTo(0);
      expect(n[1] + opposite[1]).toBeCloseTo(0);
      expect(n[2] + opposite[2]).toBeCloseTo(0);
    }
  });

  it('TOP_ROT で出目の面が真上を向く', () => {
    for (let v = 1; v <= 6; v++) {
      const [rx, ry] = TOP_ROT[v];
      expect(applyTransform(`rotateX(${rx}deg) rotateY(${ry}deg)`, faceNormal(v))[1]).toBeCloseTo(-1);
    }
  });

  it('振って止まると、出目の面が上にあり、いちばん大きく見える（何回振っても・何個目でも）', () => {
    for (let v = 1; v <= 6; v++) {
      for (const rollId of [1, 2, 7]) {
        for (const seed of [0, 1, 2]) {
          const t = diceTransform(v, rollId, seed);
          expect(topFace(t)).toBe(v);
          expect(mostVisible(t)).toBe(v);
        }
      }
    }
  });

  it('振る前の構えは1の目が上', () => {
    expect(topFace(diceTransform(3, 0))).toBe(1);
    expect(mostVisible(diceTransform(3, 0))).toBe(1);
  });

  it('振る前と後で transform の関数の並びが同じ（CSS の遷移で転がって見える）', () => {
    const shape = (t: string) => [...t.matchAll(/(rotate[XY])\(/g)].map(m => m[1]).join(' ');
    expect(shape(diceTransform(4, 3, 1))).toBe(shape(diceTransform(1, 0)));
  });

  it('目の数は出目と一致する', () => {
    for (let v = 1; v <= 6; v++) expect(PIPS[v]).toHaveLength(v);
  });
});

describe('演出の補助', () => {
  it('hash01 は決定論的で 0以上1未満', () => {
    for (let i = 0; i < 200; i++) {
      const a = hash01(7, i, 3);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
      expect(hash01(7, i, 3)).toBe(a);
    }
  });

  it('着順の呼び名', () => {
    expect(finishLabel(0)).toBe('一着');
    expect(finishLabel(3)).toBe('四着');
  });
});
