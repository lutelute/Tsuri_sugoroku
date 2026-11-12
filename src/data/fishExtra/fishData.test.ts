// 図鑑の魚のデータの点検（1000 種図鑑で足した魚を中心に、全種を見る）。
import { describe, expect, it } from 'vitest';
import { FISH_DATABASE } from '../fishDatabase';
import { FISH_FORMS } from '../fishForms';
import { EXTRA_FISH } from '.';
import { FORMS } from '../../components/shared/fishArt/forms';
import type { FishRarity } from '../../game/types';

const REGIONS = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];
const HABITATS = ['渓流', '清流', '河川', '湖沼', '水田', '河口', '干潟', '砂浜', '堤防', '磯', '沖合', '外洋', '深海'];
const SHAPES = ['standard', 'elongated', 'flat', 'round', 'eel', 'squid', 'octopus', 'crab', 'shell_bivalve', 'shell_spiral', 'catfish', 'shark', 'whale', 'ray', 'urchin', 'oarfish'];
const LEGACY = ['eel', 'squid', 'octopus', 'crab', 'shell_bivalve', 'shell_spiral', 'catfish', 'shark', 'whale', 'ray', 'urchin', 'oarfish', 'round'];
/** めずらしさごとの決まり: 点・必要な道具・難しさ */
const RULES: Record<FishRarity, { pts: [number, number]; lv: [number, number]; diff: [number, number] }> = {
  common: { pts: [80, 150], lv: [1, 1], diff: [1, 3] },
  uncommon: { pts: [200, 400], lv: [1, 2], diff: [1, 3] },
  rare: { pts: [500, 800], lv: [2, 3], diff: [2, 4] },
  legendary: { pts: [1200, 2000], lv: [3, 4], diff: [4, 5] },
  mythical: { pts: [3000, 5000], lv: [5, 5], diff: [5, 5] },
};
const HEX = /^#[0-9a-fA-F]{6}$/;

describe('図鑑の魚のデータ', () => {
  it('id と名前が重ならない', () => {
    const dupe = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
    expect(dupe(FISH_DATABASE.map(f => f.id))).toEqual([]);
    // 名前: もとの 300 種には「アカハタ」が2匹いる（v5.1 まで）。足した魚は全体の中で重ならない
    const extraIds = new Set(EXTRA_FISH.map(f => f.id));
    const names = FISH_DATABASE.map(f => f.name);
    expect(EXTRA_FISH.filter(f => names.filter(n => n === f.name).length > 1 || !extraIds.has(f.id)).map(f => f.name)).toEqual([]);
  });

  it('足した魚の項目が決まりに合う', () => {
    const bad: string[] = [];
    for (const f of EXTRA_FISH) {
      const r = RULES[f.rarity];
      const why: string[] = [];
      if (!/^[a-z][a-z0-9_]*$/.test(f.id)) why.push('id');
      if (!r) why.push('rarity');
      else {
        if (f.points < r.pts[0] || f.points > r.pts[1]) why.push(`points ${f.points}`);
        if (f.minEquipmentLevel < r.lv[0] || f.minEquipmentLevel > r.lv[1]) why.push(`lv ${f.minEquipmentLevel}`);
        if (f.difficulty < r.diff[0] || f.difficulty > r.diff[1]) why.push(`difficulty ${f.difficulty}`);
      }
      if (!f.regions.length || f.regions.some(x => !REGIONS.includes(x))) why.push('regions');
      if (!HABITATS.includes(f.habitat)) why.push(`habitat ${f.habitat}`);
      if (!f.season) why.push('season');
      if (f.description.length < 25 || f.description.length > 110) why.push(`description ${f.description.length}字`);
      if (!(f.weight.min > 0 && f.weight.min < f.weight.max)) why.push('weight');
      if (f.wikiUrl && !f.wikiUrl.startsWith('https://ja.wikipedia.org/wiki/')) why.push('wikiUrl');
      const a = f.appearance;
      if (!HEX.test(a.bodyColor) || !HEX.test(a.accentColor)) why.push('color');
      if (!SHAPES.includes(a.bodyShape)) why.push('bodyShape');
      if (why.length) bad.push(`${f.id}(${f.name}): ${why.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('足した魚はすべて絵の指定がある（型か、もとの絵）', () => {
    const bad: string[] = [];
    for (const f of EXTRA_FISH) {
      const e = FISH_FORMS[f.id];
      if (!e) { bad.push(`${f.id}: 指定なし`); continue; }
      if ('legacy' in e) { if (!LEGACY.includes(e.legacy)) bad.push(`${f.id}: legacy ${e.legacy}`); }
      else if (!(e.form in FORMS)) bad.push(`${f.id}: 型 ${e.form} がない`);
    }
    expect(bad).toEqual([]);
  });

  it('めずらしさの数が 1000 種の目標を超えない', () => {
    const target: Record<FishRarity, number> = { common: 360, uncommon: 300, rare: 200, legendary: 100, mythical: 40 };
    const n: Record<string, number> = {};
    for (const f of FISH_DATABASE) n[f.rarity] = (n[f.rarity] ?? 0) + 1;
    for (const r of Object.keys(target) as FishRarity[]) expect(n[r] ?? 0, r).toBeLessThanOrEqual(target[r]);
  });
});
