import { describe, expect, it } from 'vitest';
import { FACES, FACE_ROT, PIPS, REST_TILT, IDLE_ROT } from './diceFaces';
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
/** 面の配置 transform（"rotateY(90deg) translateZ(h)" 等）から面の法線を求める */
function faceNormal(value: number): V {
  const t = FACES.find(f => f.value === value)!.transform(50);
  let n: V = [0, 0, 1];
  const ops = [...t.matchAll(/rotate([XY])\((-?\d+)deg\)/g)].reverse();
  for (const [, axis, deg] of ops) n = axis === 'X' ? rotX(n, Number(deg)) : rotY(n, Number(deg));
  return n;
}
/** 立方体の transform: rotateX(rx) rotateY(ry) → 右から順に適用 */
function applyCube(n: V, rx: number, ry: number): V {
  return rotX(rotY(n, ry), rx);
}

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

  it('FACE_ROT で出目の面が正面（手前向き）に来る', () => {
    for (let v = 1; v <= 6; v++) {
      const [rx, ry] = FACE_ROT[v];
      const n = applyCube(faceNormal(v), rx, ry);
      expect(n[2]).toBeCloseTo(1);
    }
  });

  it('止まったときの傾きと余分な回転を足しても、出目の面がいちばん手前を向く', () => {
    for (let v = 1; v <= 6; v++) {
      const [fx, fy] = FACE_ROT[v];
      const rx = fx + REST_TILT[0] + 360 * 3;
      const ry = fy + REST_TILT[1] + 360 * 2;
      const zs = [1, 2, 3, 4, 5, 6].map(f => ({ f, z: applyCube(faceNormal(f), rx, ry)[2] }));
      const front = zs.reduce((a, b) => (b.z > a.z ? b : a));
      expect(front.f).toBe(v);
      // 斜め上から見下ろす（上面側の面も少し見える）ので、上を向いた面の z は正
      expect(front.z).toBeGreaterThan(0.85);
    }
  });

  it('振る前の構えは1の目が手前', () => {
    const zs = [1, 2, 3, 4, 5, 6].map(f => ({ f, z: applyCube(faceNormal(f), IDLE_ROT[0], IDLE_ROT[1])[2] }));
    expect(zs.reduce((a, b) => (b.z > a.z ? b : a)).f).toBe(1);
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
