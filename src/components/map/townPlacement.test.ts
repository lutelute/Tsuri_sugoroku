import { describe, it, expect } from 'vitest';
import { TOWN_IDS } from '../../game/city';
import { NODE_MAP } from '../../data/boardNodes';
import { nodeRadius } from './mapTheme';
import { placeTowns, defaultPlace, placementOverlap, townBox, labelBoxes, TOWN_SCALE } from './townPlacement';
import type { TownSize } from './townPlacement';

/** どの町にも家並みがある終盤の地図（大都市は幅いっぱい、ほかは3〜4軒ぶん） */
function denseSizes(): TownSize[] {
  const metro = new Set(['tokyo', 'osaka', 'nagoya']);
  return TOWN_IDS.map(id => {
    const n = NODE_MAP.get(id)!;
    const big = metro.has(id) || n.type === 'capital';
    return { id, w: big ? 40 : 22, h: big ? 14 : 12 };
  });
}

describe('地図の家並みの置き場所（townPlacement）', () => {
  it('同じ入力なら同じ置き場所になる', () => {
    const a = placeTowns(denseSizes());
    const b = placeTowns(denseSizes());
    expect([...a.entries()]).toEqual([...b.entries()]);
    expect(a.size).toBe(TOWN_IDS.length);
  });

  it('自分のマスの丸を踏まない（寄り・中のどちらの大きさでも）', () => {
    const sizes = denseSizes();
    const places = placeTowns(sizes);
    for (const s of sizes) {
      const n = NODE_MAP.get(s.id)!;
      const r = nodeRadius(n);
      const pl = places.get(s.id)!;
      for (const lod of ['near', 'mid'] as const) {
        const box = townBox(pl, s.w, s.h, TOWN_SCALE[lod]);
        const w = Math.min(box.x1, n.x + r * 0.7) - Math.max(box.x0, n.x - r * 0.7);
        const h = Math.min(box.y1, n.y + r * 0.7) - Math.max(box.y0, n.y - r * 0.7);
        expect(w > 0 && h > 0, `${s.id} ${lod} ${pl.anchor}`).toBe(false);
      }
    }
  });

  it('地名へのかぶりは、すべて左上に置いたときより大きく減る', () => {
    const sizes = denseSizes();
    const places = placeTowns(sizes);
    for (const lod of ['near', 'mid'] as const) {
      let chosen = 0;
      let naive = 0;
      for (const s of sizes) {
        chosen += placementOverlap(s.id, places.get(s.id)!, s, lod).labels;
        naive += placementOverlap(s.id, defaultPlace(s.id)!, s, lod).labels;
      }
      expect(naive, lod).toBeGreaterThan(0);
      expect(chosen, lod).toBeLessThan(naive * 0.75);
    }
  });

  it('ほかのマス（中継マスも）へのかぶりも、左上に置いたときより減る', () => {
    const sizes = denseSizes();
    const places = placeTowns(sizes);
    let chosen = 0;
    let naive = 0;
    for (const s of sizes) {
      chosen += placementOverlap(s.id, places.get(s.id)!, s, 'near').nodes;
      naive += placementOverlap(s.id, defaultPlace(s.id)!, s, 'near').nodes;
    }
    expect(chosen).toBeLessThan(naive);
  });

  it('地名が左に置かれた京都でも、家並みが自分の地名にかぶらない（縁取りの余白ぶんの触れは除く）', () => {
    const size: TownSize = { id: 'kyoto', w: 40, h: 14 };
    const pl = placeTowns([size]).get('kyoto')!;
    for (const lod of ['near', 'mid'] as const) {
      const own = labelBoxes(lod).find(l => l.id === 'kyoto')!.box;
      const box = townBox(pl, size.w, size.h, TOWN_SCALE[lod]);
      const w = Math.min(box.x1, own.x1) - Math.max(box.x0, own.x0);
      const h = Math.min(box.y1, own.y1) - Math.max(box.y0, own.y0);
      // 地名の四角は縁取りぶん 1.6 広げてある。字そのものには届かない
      expect(w > 0 && h > 1.6, lod).toBe(false);
    }
  });

  it('まわりが空いている町は、既定の左上のまま', () => {
    // 1軒だけの小さな家並みは、たいていの町で左上に収まる
    const sizes = TOWN_IDS.map(id => ({ id, w: 7, h: 8 }));
    const places = placeTowns(sizes);
    const ul = sizes.filter(s => places.get(s.id)!.anchor === 'ul').length;
    expect(ul).toBeGreaterThan(TOWN_IDS.length * 0.6);
  });
});
