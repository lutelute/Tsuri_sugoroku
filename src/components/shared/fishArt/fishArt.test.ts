import { describe, expect, it } from 'vitest';
import { FISH_DATABASE } from '../../../data/fishDatabase';
import { FISH_FORMS } from '../../../data/fishForms';
import { FORMS } from './forms';
import { renderFishSvg } from './render';
import { resolveFishForm } from './styles';
import { samplePath } from './geometry';

describe('魚の絵の型', () => {
  it('割り当ての魚は図鑑にいる・型は形の一覧にある', () => {
    const ids = new Set(FISH_DATABASE.map(f => f.id));
    for (const [id, e] of Object.entries(FISH_FORMS)) {
      expect(ids.has(id), id).toBe(true);
      if ('form' in e) expect(FORMS[e.form], `${id} → ${e.form}`).toBeDefined();
    }
  });

  it('ひれのある魚（標準・細長・平たい・丸い）はすべて型を決めてある', () => {
    const missing = FISH_DATABASE
      .filter(f => ['standard', 'elongated', 'flat', 'round'].includes(f.appearance.bodyShape))
      .filter(f => !(f.id in FISH_FORMS))
      .map(f => `${f.id}(${f.name})`);
    expect(missing).toEqual([]);
  });

  it('どの型も背と腹の線が読め、絵の中に収まる', () => {
    for (const [id, f] of Object.entries(FORMS)) {
      for (const d of [f.top, f.bottom]) {
        const pts = samplePath(d);
        expect(pts.length, id).toBeGreaterThan(10);
        for (const [x, y] of pts) {
          expect(Number.isFinite(x) && Number.isFinite(y), id).toBe(true);
          expect(x >= -2 && x <= 242 && y >= 0 && y <= 150, `${id} (${x},${y})`).toBe(true);
        }
      }
    }
  });

  it('300 種すべてを3つの描き方で描け、数でない値が入らない', () => {
    for (const fish of FISH_DATABASE) {
      const r = resolveFishForm(fish);
      if ('legacy' in r) continue;
      for (const style of ['hanga', 'flat', 'gyotaku'] as const) {
        for (const silhouette of [false, true]) {
          const svg = renderFishSvg(fish, r.entry, { style, small: false, framed: style !== 'flat', silhouette });
          expect(svg, `${fish.id} ${style}`).not.toMatch(/NaN|undefined|Infinity/);
          // 貝の影絵は短いSVGでも成立する。文字数ではなく塗られた閉じた輪郭を確認する。
          expect(svg, `${fish.id} ${style} silhouette=${silhouette}`).toMatch(/<path d="M[^"]+ Z"(?: fill="(?!none)[^"]+")?\/>/);
        }
      }
    }
  });
});
