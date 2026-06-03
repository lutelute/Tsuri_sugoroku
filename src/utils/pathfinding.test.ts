import { describe, it, expect } from 'vitest';
import { getReachableNodes, computeDistanceToGoal, getNeighbors } from './pathfinding';

describe('computeDistanceToGoal', () => {
  const dist = computeDistanceToGoal();

  it('ゴール自身の距離は0', () => {
    expect(dist.get('goal')).toBe(0);
  });

  it('スタートからゴールへの有限距離が存在する', () => {
    const d = dist.get('start');
    expect(d).toBeDefined();
    expect(d!).toBeGreaterThan(0);
    expect(Number.isFinite(d!)).toBe(true);
  });
});

describe('getReachableNodes', () => {
  it('1歩で隣接ノードへ到達でき、各パスはstartから始まる', () => {
    const paths = getReachableNodes('start', 1);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p[0]).toBe('start');
      expect(p.length).toBe(2);
    }
  });

  it('3歩の各パスは最大4ノード（start + 3歩）で重複ノードを含まない', () => {
    const paths = getReachableNodes('start', 3);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p[0]).toBe('start');
      expect(p.length).toBeLessThanOrEqual(4);
      expect(new Set(p).size).toBe(p.length); // 重複なし
    }
  });

  it('0歩なら自分自身のみ', () => {
    expect(getReachableNodes('start', 0)).toEqual([['start']]);
  });

  it('終点が一意化されている（同じ終点の重複パスがない）', () => {
    const paths = getReachableNodes('start', 4);
    const endpoints = paths.map(p => p[p.length - 1]);
    expect(new Set(endpoints).size).toBe(endpoints.length);
  });
});

describe('getNeighbors', () => {
  it('startの隣接には街道中継マス(r_start_wakkanai/r_start_kushiro)を含む', () => {
    // v2.x: 県と県の間に street ノードを挿入したため、startの直接隣接は中継マスになった
    const n = getNeighbors('start');
    expect(n).toContain('r_start_wakkanai');
    expect(n).toContain('r_start_kushiro');
  });

  it('未知ノードは空配列', () => {
    expect(getNeighbors('___nonexistent___')).toEqual([]);
  });
});
