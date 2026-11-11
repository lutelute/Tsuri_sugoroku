import { describe, it, expect } from 'vitest';
import { splitCubic, cubicAt, cubicD } from './rodPath';
import type { Cubic } from './rodPath';

const rod: Cubic = [[88, 100], [85, 62], [77, 9], [69, 3]];

describe('竿の曲線', () => {
  it('分けた2本は元の曲線の上でつながる', () => {
    const [a, b] = splitCubic(rod, 0.44);
    expect(a[0]).toEqual(rod[0]);
    expect(b[3]).toEqual(rod[3]);
    expect(a[3]).toEqual(b[0]);
    // 前半の中ほどは、元の曲線の t=0.22 と同じ点
    const mid = cubicAt(a, 0.5);
    const want = cubicAt(rod, 0.22);
    expect(mid[0]).toBeCloseTo(want[0], 6);
    expect(mid[1]).toBeCloseTo(want[1], 6);
  });

  it('両端は端の点になる', () => {
    expect(cubicAt(rod, 0)).toEqual(rod[0]);
    expect(cubicAt(rod, 1)).toEqual(rod[3]);
    expect(cubicD(rod)).toBe('M 88.0 100.0 C 85.0 62.0 77.0 9.0 69.0 3.0');
  });
});
