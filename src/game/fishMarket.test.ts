import { describe, it, expect } from 'vitest';
import type { CityState, Plot, TownStats } from './city';
import { createInitialCityState, computeAllStats, startBoom, priceScale, calendarLabel, CITY_ECONOMY } from './city';
import {
  FISH_MARKET, isFishingSpot, fishMarketMul, fisheryOf, fishPriceParts, fishPriceMul, fishSalePrice, expectedTownFishPrice,
  boatFishingCost, isBoomCatch, isDerbyTurn, derbyPrize, recordDerby, derbyStandings, settleDerby, cpuTownCasts, DERBY_HEADLINE_PREFIX,
  derbySeasonLabel, priceBreakdownText,
} from './fishMarket';
import { FISH_SELL_PRICE, BOAT_FISHING_COST } from './constants';
import { createInitialEquipment, createEquipmentItem } from './equipment';
import type { PlayerEquipment } from './types';

const TOWN = 'otaru'; // 釣り場の町（港町）

const plot = (kind: Plot['kind'], level = 1, extra: Partial<Plot> = {}): Plot => ({ kind, level, owner: 0, builtTurn: 1, ...extra });

/** 町の区画を直接置く（建てられる種類の制限は見ない） */
function withPlots(state: CityState, nodeId: string, plots: (Plot | null)[], tier = 0): CityState {
  const town = state.towns[nodeId];
  const filled = town.plots.map((_, i) => plots[i] ?? null);
  for (let i = town.plots.length; i < plots.length; i++) filled.push(plots[i]);
  return { ...state, towns: { ...state.towns, [nodeId]: { ...town, plots: filled, tier } } };
}

const stats = (over: Partial<TownStats>): TownStats => ({
  population: 0, jobs: 0, pollution: 0, happiness: 5, powered: true, demand: { r: 0, c: 0, i: 0 }, popNear: 0, ...over,
});

/** 7月の巡（1巡目=4月なので 4・16・28巡目） */
const JULY = [4, 16, 28];

describe('魚市場: 賑わい（fishMarketMul）', () => {
  it('何も無い町は 1.0。町でないマスも 1.0', () => {
    const s = createInitialCityState();
    expect(fishMarketMul(s, TOWN)).toBe(1);
    expect(fishMarketMul(s, 'start')).toBe(1);
  });

  it('商業の等級の合計×0.15（上限6）・漁港 +0.5・発展度×0.1 を足す', () => {
    const s = createInitialCityState();
    expect(fishMarketMul(withPlots(s, TOWN, [plot('com', 2)]), TOWN)).toBeCloseTo(1.3, 5);
    expect(fishMarketMul(withPlots(s, TOWN, [plot('com', 3), plot('com', 1)]), TOWN)).toBeCloseTo(1.6, 5);
    expect(fishMarketMul(withPlots(s, TOWN, [plot('port')]), TOWN)).toBeCloseTo(1.5, 5);
    expect(fishMarketMul(withPlots(s, TOWN, [], 2), TOWN)).toBeCloseTo(1.2, 5);
  });

  it('いちばん賑わっても 2.7（商業は等級6ぶんまで・漁港・発展度参）', () => {
    const s = withPlots(createInitialCityState(), TOWN, [plot('com', 3), plot('com', 3), plot('com', 3), plot('port')], 3);
    expect(fishMarketMul(s, TOWN)).toBeCloseTo(2.7, 5);
  });

  it('空き家の商業地は数えない', () => {
    const s = withPlots(createInitialCityState(), TOWN, [plot('com', 3, { vacant: true }), plot('com', 1)]);
    expect(fishMarketMul(s, TOWN)).toBeCloseTo(1.15, 5);
  });
});

describe('魚市場: 漁場（fisheryOf）', () => {
  const s = createInitialCityState();

  it('公害3以上で荒れ（売値0.6倍）、6以上でひどく荒れ（コモンだけ・売値0.3倍）', () => {
    const rough = fisheryOf(s, TOWN, stats({ pollution: 3 }));
    expect(rough.level).toBe('rough');
    expect(rough.priceMul).toBe(FISH_MARKET.roughPriceMul);
    expect(rough.select).toBeUndefined();
    const ruined = fisheryOf(s, TOWN, stats({ pollution: 6 }));
    expect(ruined.level).toBe('ruined');
    expect(ruined.priceMul).toBe(FISH_MARKET.ruinedPriceMul);
    expect(ruined.select).toEqual({ commonOnly: true });
  });

  it('幸福度7以上は豊かな海（レア以上の重み1.5倍）。荒れているときは豊かにならない', () => {
    const rich = fisheryOf(s, TOWN, stats({ happiness: 7 }));
    expect(rich.level).toBe('rich');
    expect(rich.priceMul).toBe(1);
    expect(rich.select).toEqual({ rareMul: FISH_MARKET.richRareMul });
    expect(fisheryOf(s, TOWN, stats({ happiness: 9, pollution: 3.5 })).level).toBe('rough');
  });

  it('それ以外はふつう。何も建っていない町もふつう', () => {
    expect(fisheryOf(s, TOWN, stats({ happiness: 6.9, pollution: 2.9 })).level).toBe('normal');
    expect(fisheryOf(s, TOWN).level).toBe('normal');
    expect(fisheryOf(s, 'start').level).toBe('normal');
  });

  it('工場を建てると実際に漁場が荒れる（町の統計とつながっている）', () => {
    const one = withPlots(createInitialCityState(), TOWN, [plot('ind', 1)]);
    expect(computeAllStats(one).get(TOWN)!.pollution).toBeGreaterThanOrEqual(FISH_MARKET.roughPollution);
    expect(fisheryOf(one, TOWN).level).toBe('rough');
    const two = withPlots(createInitialCityState(), TOWN, [plot('ind', 2)]);
    expect(fisheryOf(two, TOWN).level).toBe('ruined');
    // 公園を足すと和らぐ
    const eased = withPlots(createInitialCityState(), TOWN, [plot('ind', 1), plot('park')]);
    expect(fisheryOf(eased, TOWN).level).not.toBe('rough');
  });
});

describe('魚市場: 売値', () => {
  it('売値の倍率 = 賑わい × 漁場 × 物価', () => {
    const s = withPlots(createInitialCityState(), TOWN, [plot('com', 2), plot('port')]);
    for (const turn of [1, 13, 25, 37]) {
      const parts = fishPriceParts(s, TOWN, turn);
      expect(parts.bustle).toBeCloseTo(1.8, 5);
      expect(parts.scale).toBe(priceScale(turn));
      expect(parts.mul).toBeCloseTo(1.8 * parts.fishery.priceMul * priceScale(turn), 5);
      expect(fishPriceMul(s, TOWN, turn)).toBe(parts.mul);
    }
  });

  it('内訳の1行: 等倍のものは省く', () => {
    const plain = createInitialCityState();
    expect(priceBreakdownText(fishPriceParts(plain, TOWN, 1))).toBe('');
    const lively = withPlots(createInitialCityState(), TOWN, [plot('com', 2), plot('port'), plot('ind', 1), plot('park'), plot('park')]);
    expect(priceBreakdownText(fishPriceParts(lively, TOWN, 13))).toBe('賑わい ×1.8・物価 ×2');
    const dirty = withPlots(createInitialCityState(), TOWN, [plot('com', 1), plot('ind', 1)]);
    expect(priceBreakdownText(fishPriceParts(dirty, TOWN, 1))).toBe('賑わい ×1.15・漁場 荒れ ×0.6');
  });

  it('荒れた漁場は売値が下がる', () => {
    const clean = withPlots(createInitialCityState(), TOWN, [plot('com', 2)]);
    const dirty = withPlots(createInitialCityState(), TOWN, [plot('com', 2), plot('ind', 1)]);
    expect(fishPriceMul(dirty, TOWN, 1)).toBeCloseTo(fishPriceMul(clean, TOWN, 1) * FISH_MARKET.roughPriceMul, 5);
  });

  it('倍率を渡さなければ釣り旅と同じ売値（基本の売値 × 大きさを四捨五入）', () => {
    for (const [rarity, base] of Object.entries(FISH_SELL_PRICE)) {
      for (const size of [0.5, 0.83, 1, 1.37, 2.1]) {
        expect(fishSalePrice(rarity as 'common', size)).toBe(Math.round(base * size));
      }
    }
    expect(fishSalePrice('rare', 1.2, 3.6)).toBe(Math.round(700 * 1.2 * 3.6));
  });

  it('1匹の見込み（帯の「1匹 約¥◯」）は賑わいと物価で上がり、竿が無ければ 0', () => {
    const eq = createInitialEquipment();
    const plain = createInitialCityState();
    const lively = withPlots(createInitialCityState(), TOWN, [plot('com', 2), plot('port')]);
    const base = expectedTownFishPrice(plain, TOWN, 1, eq);
    expect(base).toBeGreaterThan(200);
    expect(base).toBeLessThan(450);
    expect(base % 10).toBe(0);
    expect(expectedTownFishPrice(lively, TOWN, 1, eq)).toBeGreaterThan(base * 1.6);
    expect(expectedTownFishPrice(plain, TOWN, 13, eq)).toBeGreaterThan(base * 1.8);
    const reel = createEquipmentItem('reel', 1);
    const noRod: PlayerEquipment = { equipped: { rod: null, reel: reel.id, lure: null }, inventory: [reel] };
    expect(expectedTownFishPrice(plain, TOWN, 1, noRod)).toBe(0);
  });

  it('船釣りの代金は、まちづくりでは物価で上がる。釣り旅は定額', () => {
    const s = createInitialCityState();
    expect(boatFishingCost(null, 30)).toBe(BOAT_FISHING_COST);
    expect(boatFishingCost(s, 1)).toBe(BOAT_FISHING_COST);
    expect(boatFishingCost(s, 13)).toBe(BOAT_FISHING_COST * priceScale(13));
  });
});

describe('魚市場: 大物で町おこし', () => {
  it('レア以上がいれば町おこし', () => {
    expect(isBoomCatch([{ rarity: 'common' }, { rarity: 'uncommon' }])).toBe(false);
    expect(isBoomCatch([{ rarity: 'common' }, { rarity: 'rare' }])).toBe(true);
    expect(isBoomCatch([{ rarity: 'mythical' }])).toBe(true);
    expect(isBoomCatch([])).toBe(false);
  });

  it('startBoom: 月数を渡せる。既定は目的地の特需と同じ月数', () => {
    const s = createInitialCityState();
    expect(startBoom(s, TOWN).booms).toEqual([{ nodeId: TOWN, monthsLeft: CITY_ECONOMY.destinationBoomMonths }]);
    expect(startBoom(s, TOWN, FISH_MARKET.boomMonths).booms).toEqual([{ nodeId: TOWN, monthsLeft: 3 }]);
  });

  it('startBoom: 短い特需で、残りの長い特需を縮めない（長い方が残る）', () => {
    const long = startBoom(createInitialCityState(), TOWN); // 6か月
    expect(startBoom(long, TOWN, 3).booms).toEqual([{ nodeId: TOWN, monthsLeft: CITY_ECONOMY.destinationBoomMonths }]);
    const short = startBoom(createInitialCityState(), TOWN, 2);
    expect(startBoom(short, TOWN, 3).booms).toEqual([{ nodeId: TOWN, monthsLeft: 3 }]);
    // ほかの町の特需はそのまま
    const two = startBoom(startBoom(createInitialCityState(), 'choshi'), TOWN, 3);
    expect(two.booms).toHaveLength(2);
  });
});

describe('魚市場: 7月の釣り大会', () => {
  it('7月は 4・16・28巡目', () => {
    for (const t of JULY) expect(isDerbyTurn(t)).toBe(true);
    for (const t of [1, 3, 5, 12, 15, 17, 36]) expect(isDerbyTurn(t)).toBe(false);
    expect(calendarLabel(4).month).toBe(FISH_MARKET.derbyMonth);
  });

  it('季節の札: 7月だけ「釣り大会」と賞金（物価こみ）を返す', () => {
    expect(derbySeasonLabel(3)).toBeNull();
    expect(derbySeasonLabel(4)).toEqual({ name: '釣り大会', desc: '水揚げ1位に ¥3,000' });
    expect(derbySeasonLabel(28)).toEqual({ name: '釣り大会', desc: `水揚げ1位に ¥${(3000 * priceScale(28)).toLocaleString()}` });
  });

  it('7月に釣った売値だけを席ごとに数える', () => {
    let s = createInitialCityState();
    expect(recordDerby(s, 0, 500, 3, 4)).toBe(s); // 6月は数えない
    s = recordDerby(s, 1, 500, 4, 4);
    s = recordDerby(s, 1, 300, 4, 4);
    s = recordDerby(s, 3, 700, 4, 4);
    expect(s.derby).toEqual({ year: 1, totals: [0, 800, 0, 700] });
    expect(recordDerby(s, 0, 0, 4, 4)).toBe(s); // 売値0は数えない
  });

  it('途中経過: 7月だけ出る。1位と賞金（物価こみ）が分かる', () => {
    let s = createInitialCityState();
    expect(derbyStandings(s, 3, 4)).toBeNull();
    expect(derbyStandings(s, 4, 4)).toEqual({ totals: [0, 0, 0, 0], leaders: [], top: 0, prize: 3000 });
    s = recordDerby(s, 2, 900, 4, 4);
    expect(derbyStandings(s, 4, 4)).toEqual({ totals: [0, 0, 900, 0], leaders: [2], top: 900, prize: 3000 });
    expect(derbyPrize(16)).toBe(FISH_MARKET.derbyPrize * priceScale(16));
  });

  it('月末の精算: 水揚げ1位に ¥3,000×物価。記録は消える', () => {
    let s = createInitialCityState();
    s = recordDerby(s, 0, 400, 16, 3);
    s = recordDerby(s, 2, 1200, 16, 3);
    const r = settleDerby(s, 16, ['あ', 'い', 'う']);
    expect(r.winners).toEqual([2]);
    expect(r.prize).toBe(3000 * priceScale(16));
    expect(r.top).toBe(1200);
    expect(r.headline).toBe(`${DERBY_HEADLINE_PREFIX}: うが優勝（水揚げ ¥1,200）賞金 ¥${(3000 * priceScale(16)).toLocaleString()}`);
    expect(r.state.derby).toBeUndefined();
    expect('derby' in r.state).toBe(false);
  });

  it('同額の1位は賞金を山分け（100円未満は切り捨て）', () => {
    let s = createInitialCityState();
    for (const i of [0, 1, 2]) s = recordDerby(s, i, 600, 4, 4);
    const r = settleDerby(s, 4, ['あ', 'い', 'う', 'え']);
    expect(r.winners).toEqual([0, 1, 2]);
    expect(r.prize).toBe(1000);
    expect(r.headline).toContain('あ・い・うが優勝');
  });

  it('誰も釣らなかった7月は見出しも賞金も無い。7月以外は何もしない', () => {
    const s = createInitialCityState();
    const none = settleDerby(s, 4, ['あ', 'い']);
    expect(none.winners).toEqual([]);
    expect(none.headline).toBeNull();
    const other = settleDerby(s, 5, ['あ', 'い']);
    expect(other.state).toBe(s);
    expect(other.headline).toBeNull();
  });

  it('前の年の記録が残っていても、次の年の7月は0から数える', () => {
    let s: CityState = { ...createInitialCityState(), derby: { year: 1, totals: [9999, 0] } };
    expect(derbyStandings(s, 16, 2)?.totals).toEqual([0, 0]);
    s = recordDerby(s, 1, 300, 16, 2);
    expect(s.derby).toEqual({ year: 2, totals: [0, 300] });
  });
});

describe('魚市場: CPU が釣る回数', () => {
  const eq = createInitialEquipment();

  it('釣り場の町で、竿があり、まだ釣っていなければ決まった回数', () => {
    expect(cpuTownCasts('fishing', eq, 0)).toBe(FISH_MARKET.cpuCastsPerVisit);
    expect(cpuTownCasts('fishing_special', eq, 0)).toBe(FISH_MARKET.cpuCastsPerVisit);
  });

  it('釣り場でない・もう釣った・竿が無いときは釣らない', () => {
    expect(cpuTownCasts('capital', eq, 0)).toBe(0);
    expect(cpuTownCasts(undefined, eq, 0)).toBe(0);
    expect(cpuTownCasts('fishing', eq, 1)).toBe(0);
    const noRod: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [] };
    expect(cpuTownCasts('fishing', noRod, 0)).toBe(0);
  });

  it('釣り場のマスの判定', () => {
    expect(isFishingSpot(TOWN)).toBe(true);
    expect(isFishingSpot('choshi')).toBe(true);
    expect(isFishingSpot('tokyo')).toBe(false);
  });
});
