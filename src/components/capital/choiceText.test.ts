// 祭りの選択肢の説明文の額が、まちづくりの物価に合わせて替わることを確かめる（データの文は1年目の額のまま）。
import { describe, it, expect } from 'vitest';
import { CAPITAL_EVENTS } from '../../data/capitalEvents';
import { choiceText } from './choiceText';

describe('祭りの選択肢の額と物価', () => {
  const feasts = Object.values(CAPITAL_EVENTS).flatMap(ev => ev.choices).filter(c => c.effect.kind === 'feast' && (c.effect as { moneyBonus?: number }).moneyBonus);

  it('宴の説明文には、もらえる額がそのまま書いてある（置き換えの手がかり）', () => {
    expect(feasts.length).toBeGreaterThan(0);
    for (const c of feasts) {
      const n = (c.effect as { moneyBonus: number }).moneyBonus;
      expect(c.description.includes(`¥${n.toLocaleString()}`) || c.description.includes(`¥${n}`), `${c.id}: ${c.description}`).toBe(true);
    }
  });

  it('物価が2倍なら、説明文の額も2倍に替わる。1倍なら替わらない', () => {
    for (const c of feasts) {
      const n = (c.effect as { moneyBonus: number }).moneyBonus;
      expect(choiceText(c, 1)).toBe(c.description);
      expect(choiceText(c, 2)).toContain(`¥${(n * 2).toLocaleString()}`);
    }
  });
});
