import { describe, it, expect } from 'vitest';
import type { CaughtFish, Fish, Region } from '../../game/types';
import type { CityTitle } from '../../game/cityAwards';
import {
  isSelfCaught, findBigCatch, catchWeightKg, newSpeciesCounts, regionCatches,
  findBestMonth, findBiggestTown, tallyTitles, isRankShown,
} from './highlights';

function fish(id: string, points: number): Fish {
  return {
    id, name: id, rarity: 'common', points, regions: ['kanto'], minEquipmentLevel: 1, description: '', emoji: '',
    appearance: {} as Fish['appearance'], weight: { min: 1, max: 5 }, season: '', habitat: '', difficulty: 1,
  };
}
const FISH = new Map([fish('aji', 100), fish('tai', 400), fish('maguro', 900)].map(f => [f.id, f]));
const c = (fishId: string, size: number, extra: Partial<CaughtFish> = {}): CaughtFish => ({ fishId, caughtAt: 'n1', turn: 1, size, ...extra });

describe('いちばんの大物', () => {
  it('点×大きさが最大の1匹を選ぶ', () => {
    const big = findBigCatch([{ caughtFish: [c('aji', 2), c('tai', 1)] }, { caughtFish: [c('tai', 1.4)] }], FISH);
    expect(big?.playerIndex).toBe(1);
    expect(big?.fish.id).toBe('tai');
    expect(big?.value).toBeCloseTo(560);
  });

  it('イベント札・祭りでもらった魚は選ばない（大漁の追加は自分の釣果）', () => {
    expect(isSelfCaught(c('tai', 1))).toBe(true);
    expect(isSelfCaught(c('tai', 1, { via: 'tairyou' }))).toBe(true);
    expect(isSelfCaught(c('tai', 1, { via: 'event' }))).toBe(false);
    expect(isSelfCaught(c('tai', 1, { via: 'capital' }))).toBe(false);
    const big = findBigCatch([{ caughtFish: [c('maguro', 2, { via: 'event' }), c('maguro', 1.9, { via: 'capital' }), c('aji', 1)] }], FISH);
    expect(big?.fish.id).toBe('aji');
  });

  it('同じ値なら先に釣ったほう。誰も釣っていなければ null', () => {
    const big = findBigCatch([{ caughtFish: [c('tai', 1, { turn: 5 })] }, { caughtFish: [c('tai', 1, { turn: 2 })] }], FISH);
    expect(big?.playerIndex).toBe(1);
    expect(findBigCatch([{ caughtFish: [] }], FISH)).toBeNull();
    expect(findBigCatch([{ caughtFish: [c('unknown', 2)] }], FISH)).toBeNull();
  });

  it('重さは釣果の画面と同じ式', () => {
    expect(catchWeightKg(fish('x', 1), 1.5)).toBe('7.0');
  });
});

describe('図鑑に新しく載った数', () => {
  it('開始時との差を席ごとに数える', () => {
    const now = [{ aji: true, tai: true, maguro: true }, { aji: true }];
    const before = [{ aji: true }, {}];
    expect(newSpeciesCounts(now, before, 2)).toEqual([2, 1]);
  });
  it('開始時の図鑑が無い席・false の項目も扱える', () => {
    expect(newSpeciesCounts([{ aji: true, tai: false }], [], 2)).toEqual([1, 0]);
  });
});

describe('地方ごとの釣った種類', () => {
  const regionOf = (id: string): Region | undefined => ({ n1: 'kanto', n2: 'kanto', n3: 'kyushu' } as Record<string, Region>)[id];
  it('釣った場所の地方で、種類を数えて多い順に並べる', () => {
    const list = regionCatches([
      { caughtFish: [c('aji', 1, { caughtAt: 'n1' }), c('aji', 1.2, { caughtAt: 'n2' }), c('tai', 1, { caughtAt: 'n2' }), c('maguro', 1, { caughtAt: 'n3' })] },
      { caughtFish: [c('aji', 1, { caughtAt: 'n3' }), c('tai', 1, { caughtAt: 'zzz' })] },
    ], regionOf);
    expect(list[0]).toEqual({ playerIndex: 0, region: 'kanto', species: 2 });
    expect(list.slice(1)).toEqual([
      { playerIndex: 0, region: 'kyushu', species: 1 },
      { playerIndex: 1, region: 'kyushu', species: 1 },
    ]);
  });
});

describe('いちばん資産が伸びた月', () => {
  it('となり合う月の差が最大の人と月を返す', () => {
    const history = [
      { turn: 1, assets: [100, 100], population: [0, 0] },
      { turn: 2, assets: [150, 400], population: [0, 0] },
      { turn: 3, assets: [900, 380], population: [0, 0] },
    ];
    expect(findBestMonth(history, 2)).toEqual({ playerIndex: 0, turn: 3, delta: 750 });
  });
  it('伸びた月が無い・履歴が足りないなら null', () => {
    expect(findBestMonth([{ turn: 1, assets: [100], population: [0] }], 1)).toBeNull();
    expect(findBestMonth([{ turn: 1, assets: [100], population: [0] }, { turn: 2, assets: [90], population: [0] }], 1)).toBeNull();
  });
});

describe('いちばん大きな町', () => {
  it('人口が最大の町。誰も住んでいなければ null', () => {
    expect(findBiggestTown(new Map([['a', { population: 10 }], ['b', { population: 250 }], ['c', { population: 0 }]]))).toEqual({ nodeId: 'b', population: 250 });
    expect(findBiggestTown(new Map([['a', { population: 0 }]]))).toBeNull();
  });
});

describe('取った称号', () => {
  const t = (id: CityTitle['id'], playerIndex: number, prize = 1000): CityTitle => ({ id, name: id, playerIndex, reason: '', prize });
  it('年度ごとの記録から席ごとに数え、公害大王（罰金）は数えない', () => {
    const tally = tallyTitles([
      { year: 1, titles: [t('choja', 0, 0), t('jinko', 1), t('kogai', 1, -1500)] },
      { year: 2, titles: [t('choja', 1, 0), t('denryoku', 1)] },
    ], 3);
    expect(tally.counts).toEqual([1, 3, 0]);
    expect(tally.top).toBe(1);
    expect(tally.topTitles.map(x => x.id)).toEqual(['jinko', 'choja', 'denryoku']);
  });
  it('誰も取っていなければ top は null', () => {
    expect(tallyTitles([], 2)).toEqual({ counts: [0, 0], top: null, topTitles: [] });
  });
});

describe('順に明かす', () => {
  it('下の順位から見えていく', () => {
    // 4人: 1人明かした = 4位だけ
    expect([0, 1, 2, 3].map(r => isRankShown(r, 4, 1))).toEqual([false, false, false, true]);
    expect([0, 1, 2, 3].map(r => isRankShown(r, 4, 3))).toEqual([false, true, true, true]);
    expect([0, 1, 2, 3].map(r => isRankShown(r, 4, 4))).toEqual([true, true, true, true]);
    expect(isRankShown(0, 1, 0)).toBe(false);
  });
});
