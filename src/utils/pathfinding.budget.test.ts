// 経路探索が、線路（歩数を使わないマス）が盤じゅうに敷かれても固まらないことを確かめる。
import { describe, it, expect } from 'vitest';
import { getReachableNodes } from './pathfinding';
import { BOARD_NODES } from '../data/boardNodes';

describe('経路探索の手数の上限', () => {
  it('すべての中継マスに線路があっても、18歩の行き先を1秒以内に返す', () => {
    const allRoutes = new Set(BOARD_NODES.filter(n => n.type === 'route').map(n => n.id));
    const t0 = Date.now();
    const paths = getReachableNodes('tokyo', 18, [], allRoutes);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(paths.length).toBeGreaterThan(0);
    // 線路の上には止まらない
    for (const p of paths) expect(allRoutes.has(p[p.length - 1])).toBe(false);
  });

  it('線路がなければ、上限は結果を変えない（6歩の行き先の数は今までどおり2つ以上）', () => {
    expect(getReachableNodes('tokyo', 6).length).toBeGreaterThan(1);
  });
});
