import { describe, it, expect } from 'vitest';
import { REALISTIC_NODES } from '../data/realisticData_nodes';
import { CITY_TRAITS, TOWN_TRAITS } from '../data/cityTraits';
import type { TownTraitId } from '../data/cityTraits';
import { toRubySegments } from '../data/furigana';
import {
  createInitialCityState, getTownInfo, isTown, computeAllStats, plotIncome, simulateRound, seasonalIncomeMul, seasonOf, townClassOf,
  TOWN_CLASS_INFO, CITY_ECONOMY,
} from './city';
import type { BuildingKind, CityState, Plot, TownStats } from './city';
import { traitIncomeMul, traitPollutionMul, traitDemand, traitSeasonMul, traitIdsOf } from './cityTraits';
import { hasCardShop } from './cityCards';
import { chooseCityAction } from './cpuAI';
import { traitEffectText, monthsLabel } from '../components/city/traitText';

const NODE_BY_ID = new Map(REALISTIC_NODES.map(n => [n.id, n]));
const KANJI = /[㐀-䶿一-鿿々]/;
const unread = (t: string) => toRubySegments(t).filter(s => !s.r && KANJI.test(s.t)).map(s => s.t);

/** 空の町の区画に建物を1つ置いた状態 */
function withPlot(state: CityState, nodeId: string, kind: BuildingKind, level = 1, owner = 0): CityState {
  const town = state.towns[nodeId];
  const plots = [...town.plots];
  plots[0] = { kind, level, owner, builtTurn: 1 } as Plot;
  return { ...state, towns: { ...state.towns, [nodeId]: { ...town, plots } } };
}

/** 暦の月から、その月になる巡目（1巡目=4月） */
const turnOfMonth = (month: number) => ((month - 4 + 12) % 12) + 1;

const STATS: TownStats = { population: 200, jobs: 100, pollution: 0, happiness: 6, powered: true, demand: { r: 0, c: 0, i: 0 }, popNear: 300 };

describe('町の特色: データ', () => {
  it('特色のある町は盤面の町マスで、特色は0〜2個・理由の説明がある', () => {
    for (const [id, e] of Object.entries(CITY_TRAITS)) {
      expect(isTown(NODE_BY_ID.get(id)), id).toBe(true);
      expect(e.traits.length, id).toBeLessThanOrEqual(2);
      expect(new Set(e.traits).size, id).toBe(e.traits.length);
      for (const t of e.traits) expect(TOWN_TRAITS[t], `${id}:${t}`).toBeDefined();
      // 特色がない行は、町の格を直すための行
      if (e.traits.length === 0) expect(e.cls, id).toBeDefined();
      expect(e.note.length, id).toBeGreaterThan(0);
    }
  });

  it('町の格を直す行は、マスの種類から決まる格と違う格にする', () => {
    for (const [id, e] of Object.entries(CITY_TRAITS)) {
      if (!e.cls) continue;
      const node = NODE_BY_ID.get(id)!;
      const byType = townClassOf({ ...node, id: '__no_trait__' });
      expect(e.cls, id).not.toBe(byType);
    }
  });

  it('どの特色も少なくとも2つの町に付いている', () => {
    const count = new Map<TownTraitId, number>();
    for (const e of Object.values(CITY_TRAITS)) for (const t of e.traits) count.set(t, (count.get(t) ?? 0) + 1);
    for (const id of Object.keys(TOWN_TRAITS) as TownTraitId[]) expect(count.get(id) ?? 0, id).toBeGreaterThanOrEqual(2);
  });

  it('特色の名前・由来・効果の説明・町の理由の漢字はすべてふりがなで読める', () => {
    const texts: string[] = [];
    for (const d of Object.values(TOWN_TRAITS)) texts.push(d.name, d.flavor, traitEffectText(d));
    for (const [id, e] of Object.entries(CITY_TRAITS)) {
      texts.push(e.note);
      for (const t of e.traits) texts.push(traitEffectText(TOWN_TRAITS[t], id));
    }
    const missing = texts.flatMap(t => unread(t).map(k => `${k}（${t}）`));
    expect(missing).toEqual([]);
  });
});

describe('町の特色: 町の格と建てられる建物', () => {
  it('神戸は都市、倉敷・酒田・旭川は商都、霧島は温泉町に直る', () => {
    expect(getTownInfo('kobe')?.cls).toBe('city');
    expect(getTownInfo('kurashiki')?.cls).toBe('market');
    expect(getTownInfo('sakata')?.cls).toBe('market');
    expect(getTownInfo('asahikawa')?.cls).toBe('market');
    expect(getTownInfo('kirishima')?.cls).toBe('onsen');
    expect(getTownInfo('kobe')?.plots).toBe(TOWN_CLASS_INFO.city.plots);
    expect(createInitialCityState().towns.kobe.plots.length).toBe(TOWN_CLASS_INFO.city.plots);
  });

  it('古都・門前町と城下町は村でも観光名所を建てられ、港湾都市は漁港と観光名所を建てられる', () => {
    for (const id of ['nara', 'kamakura', 'nikko', 'takayama', 'nagano', 'matsumoto', 'hagi']) {
      expect(getTownInfo(id)?.cls, id).toBe('village');
      expect(getTownInfo(id)?.allowed, id).toContain('tourism');
    }
    for (const id of ['yokohama', 'kobe', 'fukuoka', 'nagasaki', 'hakodate']) {
      expect(getTownInfo(id)?.allowed, id).toEqual(expect.arrayContaining(['port', 'tourism']));
    }
    // 並びは BUILDING_INFO の順（UI の建設ボタンの並びが崩れない）
    expect(getTownInfo('nara')?.allowed).toEqual(['res', 'ind', 'park', 'power', 'tourism']);
  });

  it('特色のない町は今までどおり（銚子は港町で発電所なし）', () => {
    const choshi = getTownInfo('choshi')!;
    expect(choshi.traits).toEqual([]);
    expect(choshi.cls).toBe('port');
    expect(choshi.allowed).toEqual(TOWN_CLASS_INFO.port.allowed);
  });

  it('商都に直った町にはカード売り場ができる', () => {
    expect(hasCardShop('sakata')).toBe(true);
    expect(hasCardShop('kurashiki')).toBe(true);
    expect(hasCardShop('choshi')).toBe(false);
  });
});

describe('町の特色: 収入・需要・公害', () => {
  it('古都は観光、港湾都市は商業の収入が上がる（同じ格の特色のない町と比べる）', () => {
    const tour = { kind: 'tourism', level: 1, owner: 0, builtTurn: 1 } as Plot;
    const com = { kind: 'com', level: 1, owner: 0, builtTurn: 1 } as Plot;
    // 京都・横浜・仙台はどれも都市
    expect(plotIncome(tour, 'kyoto', STATS, 0)).toBe(Math.round(plotIncome(tour, 'sendai', STATS, 0) * TOWN_TRAITS.koto.incomeMul!.tourism!));
    expect(plotIncome(com, 'yokohama', STATS, 0)).toBe(Math.round(plotIncome(com, 'sendai', STATS, 0) * TOWN_TRAITS.kowan.incomeMul!.com!));
    expect(traitIncomeMul('sendai', 'tourism')).toBe(1);
  });

  it('維持費（負の収入）には特色の倍率を掛けない', () => {
    const park = { kind: 'park', level: 1, owner: 0, builtTurn: 1 } as Plot;
    expect(plotIncome(park, 'kyoto', STATS, 0)).toBe(-CITY_ECONOMY.parkUpkeep);
  });

  it('工業地帯は工業の需要が上がり、城下町は商業の需要が上がる', () => {
    const stats = computeAllStats(createInitialCityState());
    // 名古屋と東京はどちらも大都市、金沢と仙台はどちらも都市（空の町どうしで比べる）
    expect(stats.get('nagoya')!.demand.i - stats.get('tokyo')!.demand.i).toBeCloseTo(TOWN_TRAITS.kogyo.demand!.i!, 5);
    expect(stats.get('kanazawa')!.demand.c - stats.get('sendai')!.demand.c).toBeCloseTo(TOWN_TRAITS.joka.demand!.c!, 5);
    expect(traitDemand('choshi')).toEqual({ r: 0, c: 0, i: 0 });
  });

  it('工業地帯の工場は公害が少ない（近くの町へ流れる分も）', () => {
    const base = createInitialCityState();
    const polHere = (id: string) => computeAllStats(withPlot(base, id, 'ind')).get(id)!.pollution;
    // 浜松（工業地帯）と静岡（特色なし）はどちらも港町
    expect(polHere('hamamatsu')).toBeCloseTo(3 * TOWN_TRAITS.kogyo.pollutionMul!, 1);
    expect(polHere('shizuoka')).toBeCloseTo(3, 1);
    expect(traitPollutionMul('shizuoka')).toBe(1);
  });
});

describe('町の特色: 季節', () => {
  it('雪国は冬の住宅が下がり、2月の観光が上がる。暦の雪まつり（北海道）とは重ねない', () => {
    const feb = seasonOf(turnOfMonth(2));
    const dec = seasonOf(turnOfMonth(12));
    expect(feb.month).toBe(2);
    expect(seasonalIncomeMul(feb, 'tourism', 'sapporo')).toBe(2); // 暦の2倍だけ（4倍にしない）
    expect(seasonalIncomeMul(feb, 'res', 'sapporo')).toBe(0.9); // 暦の0.9だけ
    expect(seasonalIncomeMul(feb, 'tourism', 'niigata')).toBe(2); // 暦では1倍の関東でも雪国なら2倍
    expect(seasonalIncomeMul(feb, 'tourism', 'tokyo')).toBe(1);
    expect(seasonalIncomeMul(dec, 'res', 'sapporo')).toBe(0.9);
    expect(seasonalIncomeMul(dec, 'com', 'sapporo')).toBe(dec.mul('com', 'city', 'hokkaido')); // 年末商戦はそのまま
  });

  it('湯の町は冬の観光が1.5倍。月末の収入（simulateRound）にも効く', () => {
    const jan = turnOfMonth(1);
    expect(traitSeasonMul('beppu', 'tourism', 1)).toBe(1.5);
    expect(traitSeasonMul('beppu', 'tourism', 7)).toBe(1);
    // 別府（湯の町）と大分（特色なし）はどちらも温泉町。観光名所1つだけの町で1月の収入を比べる
    const inc = (id: string) => simulateRound(withPlot(createInitialCityState(), id, 'tourism'), 1, jan, [0]).report.players[0].income;
    expect(inc('beppu') / inc('oita')).toBeCloseTo(1.5, 1);
  });

  it('月の並びの表示は年をまたいでもひとつながり', () => {
    expect(monthsLabel([12, 1, 2])).toBe('12〜2月');
    expect(monthsLabel([2])).toBe('2月');
    expect(monthsLabel([4, 5, 9, 10])).toBe('4〜5月・9〜10月');
  });
});

describe('町の特色: 説明文と CPU', () => {
  it('効果の説明は数値から作り、元から建てられる建物は書かない', () => {
    expect(traitEffectText(TOWN_TRAITS.koto, 'nara')).toContain('観光名所を建てられる');
    expect(traitEffectText(TOWN_TRAITS.koto, 'kyoto')).not.toContain('建てられる');
    expect(traitEffectText(TOWN_TRAITS.koto)).toContain(`観光の収入×${TOWN_TRAITS.koto.incomeMul!.tourism}`);
    expect(traitEffectText(TOWN_TRAITS.kogyo)).toContain(`工業の需要+${TOWN_TRAITS.kogyo.demand!.i}`);
    expect(traitEffectText(TOWN_TRAITS.yunomachi)).toContain('12〜2月は観光の収入×1.5');
  });

  it('CPU は特色で建てられるようになった建物も選び、選ぶ建物はいつもその町で建てられる物', () => {
    const st = createInitialCityState();
    // 古都の村（奈良）では観光名所を建てる
    const nara = chooseCityAction(st, 'nara', 0, 30000, 'steady', 24);
    expect(nara).toEqual({ type: 'build', plot: 0, kind: 'tourism' });
    for (const id of Object.keys(CITY_TRAITS)) {
      const a = chooseCityAction(st, id, 0, 30000, 'steady', 24);
      if (a?.type === 'build') expect(getTownInfo(id)!.allowed, id).toContain(a.kind);
    }
    expect(traitIdsOf('nara')).toEqual(['koto']);
  });
});
