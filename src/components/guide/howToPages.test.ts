import { describe, it, expect } from 'vitest';
import { HOWTO_MODE_LABEL, HOWTO_PAGES } from './howToPages';
import { GUIDES } from './guideRules';
import type { GuideContext } from './guideRules';
import { toRubySegments } from '../../data/furigana';

const KANJI = /[㐀-䶿一-鿿々]/;

/** ふりがなが振られずに残る漢字（子どもが読めない所） */
function unreadKanji(text: string): string[] {
  return toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);
}

describe('遊び方のページ', () => {
  it('どちらのモードにもページがあり、id が重ならない', () => {
    for (const mode of ['fishing', 'city'] as const) {
      expect(HOWTO_PAGES[mode].length).toBeGreaterThanOrEqual(5);
    }
    const ids = [...HOWTO_PAGES.fishing, ...HOWTO_PAGES.city].map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('文章は短い（1ページ2行まで・1行60字まで）', () => {
    for (const p of [...HOWTO_PAGES.fishing, ...HOWTO_PAGES.city]) {
      expect(p.lines.length).toBeLessThanOrEqual(2);
      for (const l of p.lines) expect(l.length).toBeLessThanOrEqual(60);
    }
  });

  it('漢字にはすべてふりがなが振られる', () => {
    const texts = [
      ...Object.values(HOWTO_MODE_LABEL),
      ...[...HOWTO_PAGES.fishing, ...HOWTO_PAGES.city].flatMap(p => [p.title, ...p.lines]),
    ];
    const missing = texts.flatMap(t => unreadKanji(t).map(k => `${k}（${t}）`));
    expect(missing).toEqual([]);
  });
});

describe('案内役のボタンの文字', () => {
  it('漢字にはすべてふりがなが振られる', () => {
    // GuideLayer・GuideButtons・HowToPlayOverlay・TitleScreen の見出しとボタン
    const texts = ['ガイドを表示しない', 'ガイドをはじめから', 'もう一度出るよ', '遊び方'];
    expect(texts.flatMap(unreadKanji)).toEqual([]);
  });
});

describe('その場の案内の文章', () => {
  it('漢字にはすべてふりがなが振られる', () => {
    const c = {
      mode: 'city', binboHolder: 1, playerIndex: 0, binboHolderName: 'たろう', maxFishing: 3,
    } as GuideContext;
    const texts = GUIDES.flatMap(g => [
      g.text({ ...c, mode: 'city' }), g.text({ ...c, mode: 'fishing' }), g.text({ ...c, binboHolder: 0 }),
    ]).flatMap(t => [t.title, t.body]);
    const missing = texts.flatMap(t => unreadKanji(t).map(k => `${k}（${t}）`));
    expect(missing).toEqual([]);
  });
});
