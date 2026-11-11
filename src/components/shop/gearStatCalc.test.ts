import { describe, it, expect } from 'vitest';
import { createEquipmentItem, createInitialEquipment } from '../../game/equipment';
import { getEffectiveLevel } from '../../game/fishing';
import type { PlayerEquipment } from '../../game/types';
import { toRubySegments } from '../../data/furigana';
import { GEAR_COMPARE_LABEL, GEAR_STAT_MAX, GEAR_STAT_ROWS, GEAR_TEXT, durabilityTone, gearCompare, gearStatRows } from './gearStatCalc';

const KANJI = /[一-鿿々]/;
const unread = (text: string) => toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);

function equipmentOf(rod: number, reel: number, lure: number): PlayerEquipment {
  const r = createEquipmentItem('rod', rod);
  const e = createEquipmentItem('reel', reel);
  const l = createEquipmentItem('lure', lure);
  return { equipped: { rod: r.id, reel: e.id, lure: l.id }, inventory: [r, e, l] };
}

describe('道具の能力の棒（gearStatCalc）', () => {
  it('いまの値は、遊びの計算（getEffectiveLevel）と同じ', () => {
    const eq = equipmentOf(3, 2, 4);
    for (const row of gearStatRows(eq, 'rod', 3)) {
      expect(row.now).toBeCloseTo(getEffectiveLevel(eq, row.ability), 6);
      expect(row.next).toBeCloseTo(row.now, 6);
    }
  });

  it('持ちかえたときの値は、その道具だけを入れかえた計算になる', () => {
    const eq = equipmentOf(1, 1, 1);
    const swapped = equipmentOf(5, 1, 1);
    for (const row of gearStatRows(eq, 'rod', 5)) {
      expect(row.next).toBeCloseTo(getEffectiveLevel(swapped, row.ability), 6);
      expect(row.next).toBeGreaterThan(row.now);
      expect(row.next).toBeLessThanOrEqual(GEAR_STAT_MAX);
    }
  });

  it('竿は合わせ、リールは巻きと糸の強さ、ルアーは当たりがいちばん伸びる', () => {
    const eq = createInitialEquipment();
    const gain = (type: 'rod' | 'reel' | 'lure') => Object.fromEntries(gearStatRows(eq, type, 5).map(r => [r.ability, r.next - r.now]));
    const rod = gain('rod');
    const reel = gain('reel');
    const lure = gain('lure');
    expect(rod.strike).toBeGreaterThan(rod.reeling);
    expect(reel.reeling).toBeGreaterThan(reel.strike);
    expect(reel.tensionTolerance).toBeGreaterThan(reel.biteSpeed);
    expect(lure.biteSpeed).toBeGreaterThan(lure.strike);
  });

  it('いまの道具より上・同じ・下が分かる', () => {
    const eq = equipmentOf(3, 2, 4);
    expect(gearCompare(eq, 'rod', 4)).toBe(1);
    expect(gearCompare(eq, 'rod', 3)).toBe(0);
    expect(gearCompare(eq, 'rod', 2)).toBe(-1);
    // 何もつけていなければ、どの道具でも「上がる」
    const bare: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [] };
    expect(gearCompare(bare, 'lure', 1)).toBe(1);
  });

  it('耐久の色は 50・20 を境に変わる', () => {
    expect(durabilityTone(100)).toBe('good');
    expect(durabilityTone(51)).toBe('good');
    expect(durabilityTone(50)).toBe('warn');
    expect(durabilityTone(21)).toBe('warn');
    expect(durabilityTone(20)).toBe('bad');
    expect(durabilityTone(0)).toBe('bad');
  });

  it('棒の名前と見出しの漢字には、すべてふりがなが振られる', () => {
    const texts = [...GEAR_STAT_ROWS.map(r => r.label), ...Object.values(GEAR_COMPARE_LABEL), ...Object.values(GEAR_TEXT)];
    for (const t of texts) expect(unread(t), t).toEqual([]);
  });
});
