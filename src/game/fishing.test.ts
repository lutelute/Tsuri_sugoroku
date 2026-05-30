import { describe, it, expect, afterEach } from 'vitest';
import type { PlayerEquipment } from './types';
import {
  interpolateBonus, getStrikeGreenZone, getEffectiveLevel,
  generateFishSize, selectFish, checkTairyou, createCaughtFish,
} from './fishing';
import { LURE_BITE_SPEED_BONUS, TAIRYOU_BONUS_MAX } from './constants';
import { createInitialEquipment, createEquipmentItem } from './equipment';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

afterEach(() => resetRandomSource());

describe('interpolateBonus', () => {
  const arr = LURE_BITE_SPEED_BONUS; // [0,0,0.15,0.25,0.35,0.5]

  it('整数レベルは配列の値そのまま', () => {
    expect(interpolateBonus(arr, 1)).toBe(0);
    expect(interpolateBonus(arr, 2)).toBe(0.15);
    expect(interpolateBonus(arr, 5)).toBe(0.5);
  });

  it('小数レベルは線形補間', () => {
    expect(interpolateBonus(arr, 2.5)).toBeCloseTo(0.2, 5);
  });

  it('範囲外は[1, length-1]にクランプ', () => {
    expect(interpolateBonus(arr, 0.5)).toBe(arr[1]);
    expect(interpolateBonus(arr, 99)).toBe(arr[5]);
  });
});

describe('getStrikeGreenZone', () => {
  it('Lv1=0.27, Lv5=0.47（useFishingとWaitingPhaseで共有する式）', () => {
    expect(getStrikeGreenZone(1)).toBeCloseTo(0.27, 5);
    expect(getStrikeGreenZone(5)).toBeCloseTo(0.47, 5);
  });
});

describe('getEffectiveLevel', () => {
  it('初期装備(全Lv1)のstrike実効レベルは1.0', () => {
    const eq = createInitialEquipment();
    expect(getEffectiveLevel(eq, 'strike')).toBeCloseTo(1.0, 5);
  });

  it('ルアー主力の能力はルアーレベルに強く依存する', () => {
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const lure = createEquipmentItem('lure', 5);
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
    // rareChance: rod0.1 + reel0.2 + lure0.7 = 0.1+0.2+3.5 = 3.8
    expect(getEffectiveLevel(eq, 'rareChance')).toBeCloseTo(3.8, 5);
  });
});

describe('generateFishSize', () => {
  it('装備なしでも 0.5〜2.0 の範囲に収まる', () => {
    setRandomSource(mulberry32(99));
    for (let i = 0; i < 2000; i++) {
      const s = generateFishSize();
      expect(s).toBeGreaterThanOrEqual(0.5);
      expect(s).toBeLessThanOrEqual(2.0);
    }
  });
});

describe('selectFish', () => {
  it('ルアー未装着なら必ずコモンを返す', () => {
    setRandomSource(mulberry32(5));
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: null }, inventory: [rod, reel] };
    for (let i = 0; i < 30; i++) {
      const fish = selectFish('tokyo', 'kanto', eq, false);
      expect(fish.rarity).toBe('common');
    }
  });

  it('船釣りはレア以上を優先する', () => {
    setRandomSource(mulberry32(3));
    const eq = createInitialEquipment();
    // 船釣りはレア/伝説/神話のみ（無ければuncommon以上にフォールバック）
    for (let i = 0; i < 30; i++) {
      const fish = selectFish('tokyo', 'kanto', eq, false, true);
      expect(['uncommon', 'rare', 'legendary', 'mythical']).toContain(fish.rarity);
    }
  });
});

describe('checkTairyou', () => {
  it('乱数が確率を上回れば0匹', () => {
    setRandomSource(() => 0.999);
    const eq = createInitialEquipment();
    expect(checkTairyou(eq, false)).toBe(0);
  });

  it('発動時は 1〜TAIRYOU_BONUS_MAX 匹', () => {
    const rod = createEquipmentItem('rod', 1);
    const reel = createEquipmentItem('reel', 1);
    const lure = createEquipmentItem('lure', 5); // 大漁確率を確保
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
    setRandomSource(() => 0); // 確実に発動
    const n = checkTairyou(eq, false);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(TAIRYOU_BONUS_MAX);
  });
});

describe('createCaughtFish', () => {
  it('指定情報とサイズ(>=0.5)を持つ釣果を生成', () => {
    setRandomSource(mulberry32(11));
    const caught = createCaughtFish('test_fish', 'tokyo', 7);
    expect(caught.fishId).toBe('test_fish');
    expect(caught.caughtAt).toBe('tokyo');
    expect(caught.turn).toBe(7);
    expect(caught.size).toBeGreaterThanOrEqual(0.5);
  });
});
