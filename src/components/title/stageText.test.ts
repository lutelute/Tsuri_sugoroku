import { describe, it, expect } from 'vitest';
import { allStageTexts, CPU_TRAIT, REGION_NAME } from './stageText';
import { CPU_STYLES, CPU_STYLE_LABEL } from '../../game/cpuAI';
import { toRubySegments } from '../../data/furigana';

const KANJI = /[㐀-䶿一-鿿々]/;

/** ふりがなが振られずに残る漢字（子どもが読めない所） */
function unreadKanji(text: string): string[] {
  return toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);
}

describe('晴れ舞台係の文（タイトル・設定・結果発表）', () => {
  it('漢字にはすべてふりがなが振られる', () => {
    const texts = [
      ...allStageTexts(),
      // 設定画面の CPU の札に出す性格の名前
      ...Object.values(CPU_STYLE_LABEL),
      // 結果発表の名場面の言い回し（数字が入る文）
      'あと3種類で制覇', '2年目の8月', '大きさ', '種類', '人口', '内訳', '1位', '16匹', '3,256人',
    ];
    const missing = texts.flatMap(t => unreadKanji(t).map(k => `${k}（${t}）`));
    expect(missing).toEqual([]);
  });

  it('CPU の性格と地方には、すべて文がある', () => {
    for (const style of CPU_STYLES) expect(CPU_TRAIT[style]).toBeTruthy();
    expect(Object.keys(REGION_NAME)).toHaveLength(8);
  });
});
