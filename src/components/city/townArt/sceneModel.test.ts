import { describe, it, expect } from 'vitest';
import { createInitialCityState, getTownInfo, TOWN_IDS, CITY_ECONOMY, BUILDING_INFO, MAX_BUILDING_LEVEL } from '../../../game/city';
import type { BuildingKind, CityState } from '../../../game/city';
import { buildSceneModel, rowCounts, walkersFor, housesFor, smogFor, joyFor, tourismStyleOf, SCENE_W } from './sceneModel';
import { artBox } from './art';
import type { TourismStyle } from './art';
import { moodOf } from './palette';

/** 月（1〜12）になる巡（1巡目 = 4月） */
const turnOfMonth = (month: number) => ((month - 4 + 12) % 12) + 1;

/** 発展度 tier まで育った町（区画が増えている） */
function cityAtTier(nodeId: string, tier: number): CityState {
  const c = createInitialCityState();
  const info = getTownInfo(nodeId)!;
  const plots = Array.from({ length: info.plots + tier * CITY_ECONOMY.tierPlotBonus }, () => null);
  return { ...c, towns: { ...c.towns, [nodeId]: { plots, tier, base: info.plots } } };
}

/** スマホ幅 360px の町の画面で、絵が置かれる幅（左右の余白 16px ずつ） */
const PHONE_SCENE_PX = 328;
const MIN_TAP_PX = 44;

describe('町の絵の設計図（sceneModel）', () => {
  it('区画が 6 つまでは1段、それより多ければ奥と手前の2段に分ける', () => {
    expect(rowCounts(3)).toEqual([3]);
    expect(rowCounts(6)).toEqual([6]);
    expect(rowCounts(7)).toEqual([4, 3]);
    expect(rowCounts(8)).toEqual([4, 4]);
    expect(rowCounts(11)).toEqual([6, 5]);
    for (let n = 1; n <= 14; n++) expect(rowCounts(n).reduce((a, b) => a + b, 0)).toBe(n);
  });

  it('どの町・どの発展度でも、区画はスマホ幅で 44px 以上の押せる幅があり、絵の中に収まる', () => {
    for (const id of TOWN_IDS) {
      for (let tier = 0; tier <= 3; tier++) {
        const city = cityAtTier(id, tier);
        const m = buildSceneModel(city, id, 1, undefined)!;
        expect(m, id).not.toBeNull();
        expect(m.slots.length).toBe(city.towns[id].plots.length);
        const px = PHONE_SCENE_PX / m.W;
        expect(m.slotW * px, `${id} tier${tier} の区画の幅`).toBeGreaterThanOrEqual(MIN_TAP_PX);
        // 当たり判定の高さは 50 単位以上（TownScene の top = max(50, …)）
        expect(50 * px).toBeGreaterThanOrEqual(MIN_TAP_PX);
        for (const s of m.slots) {
          expect(s.x - m.slotW / 2).toBeGreaterThanOrEqual(0);
          expect(s.x + m.slotW / 2).toBeLessThanOrEqual(m.W);
          expect(s.baseY).toBe(m.rows[s.row]);
        }
        // 区画の番号は左上から順
        expect(m.slots.map(s => s.index)).toEqual(m.slots.map((_, i) => i));
        // 絵が縦に伸びすぎない（スマホで画面の 1/3 ほどまで）
        expect(m.H * px).toBeLessThanOrEqual(260);
      }
    }
  });

  it('どの建物の絵も、いちばん狭い区画の幅に収まる', () => {
    const kinds = Object.keys(BUILDING_INFO) as BuildingKind[];
    const styles: TourismStyle[] = ['pagoda', 'castle', 'ryokan'];
    for (const slotW of [(SCENE_W - 16) / 6, 64]) {
      for (const two of [false, true]) {
        const scale = Math.max(1, Math.min(two ? 1.15 : 1.24, slotW / 50));
        for (const kind of kinds) {
          for (let lv = 1; lv <= MAX_BUILDING_LEVEL; lv++) {
            for (const style of styles) {
              const box = artBox(kind, lv, style);
              expect(box.w * scale, `${kind} 等級${lv}`).toBeLessThanOrEqual(slotW);
              // 奥の段の通りにかぶらない高さ（段の間隔 68）
              expect(box.h * (two ? scale : 1)).toBeLessThanOrEqual(68);
            }
          }
        }
      }
    }
  });

  it('人口が増えるほど、通りの人と裏の家並みが増える', () => {
    expect(walkersFor(0)).toBe(0);
    expect(housesFor(0)).toBe(0);
    let w = 0;
    let h = 0;
    for (let pop = 0; pop <= 1200; pop += 20) {
      expect(walkersFor(pop)).toBeGreaterThanOrEqual(w);
      expect(housesFor(pop)).toBeGreaterThanOrEqual(h);
      w = walkersFor(pop);
      h = housesFor(pop);
    }
    expect(walkersFor(1200)).toBeLessThanOrEqual(10);
    expect(housesFor(1200)).toBeLessThanOrEqual(16);
    expect(walkersFor(20)).toBe(1);
  });

  it('公害と幸福度が絵の調子に出る', () => {
    expect(smogFor(0)).toBe(0);
    expect(smogFor(2)).toBe(0);
    expect(smogFor(7)).toBeCloseTo(0.5);
    expect(smogFor(30)).toBe(1);
    expect(joyFor(1)).toBe(0);
    expect(joyFor(5)).toBe(1);
    expect(joyFor(8)).toBe(2);
  });

  it('1巡目は4月。雪が積もるのは雪国・北国の冬だけ、南の町には積もらない', () => {
    const c = createInitialCityState();
    expect(buildSceneModel(c, 'tokyo', 1, undefined)!.month).toBe(4);
    expect(buildSceneModel(c, 'tokyo', 12, undefined)!.month).toBe(3);
    for (const mo of [12, 1, 2]) {
      expect(buildSceneModel(c, 'sapporo', turnOfMonth(mo), undefined)!.snowy, `札幌 ${mo}月`).toBe(true);
      expect(buildSceneModel(c, 'kanazawa', turnOfMonth(mo), undefined)!.snowy, `金沢 ${mo}月`).toBe(true);
      expect(buildSceneModel(c, 'tokyo', turnOfMonth(mo), undefined)!.snowy, `東京 ${mo}月`).toBe(false);
      expect(buildSceneModel(c, 'naha', turnOfMonth(mo), undefined)!.snowy, `那覇 ${mo}月`).toBe(false);
    }
    for (const mo of [3, 4, 7, 10]) expect(buildSceneModel(c, 'sapporo', turnOfMonth(mo), undefined)!.snowy).toBe(false);
    expect(buildSceneModel(c, 'naha', turnOfMonth(1), undefined)!.south).toBe(true);
  });

  it('観光名所の姿は町の特色で変わる（城下町は城、温泉の町は旅館、ほかは塔）', () => {
    expect(tourismStyleOf('city', ['joka', 'yukiguni'])).toBe('castle');
    expect(tourismStyleOf('onsen', [])).toBe('ryokan');
    expect(tourismStyleOf('city', ['yunomachi'])).toBe('ryokan');
    expect(tourismStyleOf('city', ['koto'])).toBe('pagoda');
    const c = createInitialCityState();
    expect(buildSceneModel(c, 'kanazawa', 1, undefined)!.tourism).toBe('castle');
    expect(buildSceneModel(c, 'beppu', 1, undefined)!.tourism).toBe('ryokan');
    expect(buildSceneModel(c, 'kyoto', 1, undefined)!.tourism).toBe('pagoda');
  });

  it('町でないマスは絵を作らない', () => {
    const c = createInitialCityState();
    expect(buildSceneModel(c, 'start', 1, undefined)).toBeNull();
    expect(buildSceneModel(c, 'no-such-town', 1, undefined)).toBeNull();
  });

  it('どの月にも絵の調子がある', () => {
    for (let mo = 1; mo <= 12; mo++) {
      const mood = moodOf(mo);
      expect(mood.month).toBe(mo);
      expect(mood.sky).toHaveLength(3);
    }
    expect(moodOf(13).month).toBe(1);
  });
});
