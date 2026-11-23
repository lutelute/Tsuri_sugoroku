import { describe, it, expect } from 'vitest';
import { ACCOUNT_TEXT, MEMBERS_TEXT, QUIT_TEXT } from './sessionText';
import { toRubySegments } from '../../data/furigana';

const KANJI = /[㐀-䶿一-鿿々]/;

/** ふりがなが振られずに残る漢字（子どもが読めない所） */
function unreadKanji(text: string): string[] {
  return toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);
}

function texts(obj: Record<string, string | ((a: string) => string)>): string[] {
  return Object.values(obj).map(v => (typeof v === 'function' ? v('たろう') : v));
}

describe('やめる・なかまの画面の文', () => {
  it('漢字にはすべてふりがなが振られる', () => {
    const all = [...texts(QUIT_TEXT), ...texts(MEMBERS_TEXT), ...texts(ACCOUNT_TEXT)];
    const missing = all.flatMap(t => unreadKanji(t).map(k => `${k}（${t}）`));
    expect(missing).toEqual([]);
  });
});
