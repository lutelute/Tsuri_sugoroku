import { describe, it, expect } from 'vitest';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { toRubySegments } from '../../data/furigana';
import {
  FILTER_TEXT, HABITAT_GROUPS, NO_FILTER, RARITY_ORDER, REGION_LABELS, REGION_ORDER,
  filterFish, habitatGroupOf, rarityProgress,
} from './encyclopediaFilter';

const KANJI = /[一-鿿々]/;
const unread = (text: string) => toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);

describe('図鑑をしぼる札（encyclopediaFilter）', () => {
  it('しぼらなければ、全部の魚がもとの順で並ぶ', () => {
    expect(filterFish(FISH_DATABASE, NO_FILTER, {})).toEqual(FISH_DATABASE);
  });

  it('魚のすみかは、どれも 4 つのまとまりのどれかに入っている', () => {
    const known = new Set(HABITAT_GROUPS.flatMap(g => g.habitats));
    for (const fish of FISH_DATABASE) expect(known, `${fish.name}: ${fish.habitat}`).toContain(fish.habitat);
    // 同じすみかが 2 つのまとまりに入っていない
    expect(known.size).toBe(HABITAT_GROUPS.reduce((n, g) => n + g.habitats.length, 0));
  });

  it('すみかでしぼると、まとまりごとの数の合計が全部の数になる', () => {
    const total = HABITAT_GROUPS.reduce((n, g) => n + filterFish(FISH_DATABASE, { ...NO_FILTER, habitat: g.id }, {}).length, 0);
    expect(total).toBe(FISH_DATABASE.length);
    for (const g of HABITAT_GROUPS) expect(filterFish(FISH_DATABASE, { ...NO_FILTER, habitat: g.id }, {}).length).toBeGreaterThan(0);
    expect(habitatGroupOf('渓流')).toBe('river');
    expect(habitatGroupOf('磯')).toBe('shore');
    expect(habitatGroupOf('深海')).toBe('deep');
  });

  it('地方でしぼると、その地方で釣れる魚だけになる（どの地方にも魚がいる）', () => {
    for (const r of REGION_ORDER) {
      const list = filterFish(FISH_DATABASE, { ...NO_FILTER, region: r }, {});
      expect(list.length, r).toBeGreaterThan(0);
      expect(list.every(f => f.regions.includes(r))).toBe(true);
    }
  });

  it('見つけた・まだ でしぼれる。重ねてしぼることもできる', () => {
    const first = FISH_DATABASE[0];
    const enc = { [first.id]: true };
    expect(filterFish(FISH_DATABASE, { ...NO_FILTER, found: 'found' }, enc)).toEqual([first]);
    expect(filterFish(FISH_DATABASE, { ...NO_FILTER, found: 'yet' }, enc).length).toBe(FISH_DATABASE.length - 1);
    const both = filterFish(FISH_DATABASE, { region: first.regions[0], habitat: habitatGroupOf(first.habitat), rarity: first.rarity, found: 'found' }, enc);
    expect(both).toEqual([first]);
  });

  it('めずらしさごとの達成を数える', () => {
    const p0 = rarityProgress(FISH_DATABASE, {});
    expect(RARITY_ORDER.reduce((n, r) => n + p0[r].total, 0)).toBe(FISH_DATABASE.length);
    expect(RARITY_ORDER.every(r => p0[r].found === 0)).toBe(true);
    const all = Object.fromEntries(FISH_DATABASE.map(f => [f.id, true]));
    const p1 = rarityProgress(FISH_DATABASE, all);
    expect(RARITY_ORDER.every(r => p1[r].found === p1[r].total && p1[r].total > 0)).toBe(true);
  });

  it('札の文・地方・すみかの漢字には、すべてふりがなが振られる', () => {
    const texts = [
      ...Object.values(FILTER_TEXT), ...Object.values(REGION_LABELS), ...HABITAT_GROUPS.map(g => g.label),
      ...new Set(FISH_DATABASE.map(f => f.habitat)), ...new Set(FISH_DATABASE.map(f => f.season)),
    ];
    for (const t of texts) expect(unread(t), t).toEqual([]);
  });
});
