// 町の絵: 町の状態から「何をどこに描くか」を決める純粋関数（React に依存しない）。
// 絵のための計算だけ。ルールや数値は game/city.ts のものを読むだけで、変えない。
import { getTownInfo, calendarLabel, recoveryMonthsLeft, monopolyOwner } from '../../../game/city';
import type { CityState, Plot, TownClass, TownStats } from '../../../game/city';
import { mayorOf } from '../../../game/mayor';
import type { TownTraitId } from '../../../data/cityTraits';
import type { Region } from '../../../game/types';
import type { TourismStyle } from './art';

/** その町と分かる目印（実在の建物や山を様式化したもの） */
export type Landmark =
  | 'tower' | 'osakajo' | 'kinshachi' | 'clock' | 'ferris' | 'portTower' | 'seaTorii'
  | 'fuji' | 'volcano' | 'daibutsu' | 'daimonji' | 'shuri' | 'dunes';

const LANDMARKS: Record<string, Landmark> = {
  tokyo: 'tower',
  osaka: 'osakajo',
  nagoya: 'kinshachi',
  sapporo: 'clock',
  yokohama: 'ferris',
  kobe: 'portTower',
  hiroshima: 'seaTorii',
  shizuoka: 'fuji',
  numazu: 'fuji',
  odawara: 'fuji',
  kagoshima: 'volcano',
  kirishima: 'volcano',
  kamakura: 'daibutsu',
  nara: 'daibutsu',
  kyoto: 'daimonji',
  naha: 'shuri',
  tottori: 'dunes',
};

/** 南の島・南国の町（冬も緑で、ヤシが立つ） */
const SOUTH = new Set(['naha', 'amami', 'tokunoshima', 'tanegashima', 'yakushima', 'aoshima', 'miyazaki']);

export interface SlotModel {
  /** 区画の番号（town.plots の添字） */
  index: number;
  row: number;
  /** 区画の中心の x */
  x: number;
  /** 通りの高さ（建物の地面） */
  baseY: number;
  plot: Plot | null;
}

export interface SceneModel {
  nodeId: string;
  name: string;
  cls: TownClass;
  region: Region;
  traits: TownTraitId[];
  month: number;
  tier: number;
  landmark: Landmark | null;
  /** 背景に海が見える（港町・港湾都市など） */
  sea: boolean;
  south: boolean;
  /** 町に雪が積もる（雪国・北国の冬） */
  snowy: boolean;
  /** 遠くの山の頂が白い */
  snowCaps: boolean;
  tourism: TourismStyle;
  W: number;
  H: number;
  /** 地平線の高さ */
  horizon: number;
  /** 地面（陸）の始まる高さ。港町は海を広く見せるぶん下がる */
  groundY: number;
  /** 段ごとの通りの高さ（奥から手前） */
  rows: number[];
  slotW: number;
  /** 建物の絵の倍率（区画の幅に合わせて大きく描く） */
  scale: number;
  slots: SlotModel[];
  built: number;
  powered: boolean;
  /** 公害による空のくすみ（0〜1） */
  smog: number;
  /** 幸福度による賑わい（0=さびしい 1=ふつう 2=にぎやか） */
  joy: 0 | 1 | 2;
  /** 通りを歩く人の数 */
  walkers: number;
  /** 表通りの裏に並ぶ家の数（人口が増えるほど家並みが広がる） */
  houses: number;
  /** 復興特需の残り月数 */
  recovery: number;
  mayor: number | null;
  monopoly: number | null;
}

export const SCENE_W = 360;
const PER_ROW = 6;
const SLOT_MAX = 64;
const ROW_GAP = 68;

/** 区画の数から段の分け方を決める（6 区画までは1段、それより多ければ奥と手前に分ける） */
export function rowCounts(n: number): number[] {
  if (n <= PER_ROW) return [Math.max(0, n)];
  const rows = Math.ceil(n / PER_ROW);
  const out: number[] = [];
  let left = n;
  for (let r = rows; r >= 1; r--) {
    const c = Math.ceil(left / r);
    out.push(c);
    left -= c;
  }
  return out;
}

export function walkersFor(population: number): number {
  if (population <= 0) return 0;
  return Math.max(1, Math.min(10, 1 + Math.floor(population / 60)));
}

/** 裏の家並みの数（人口 40 人ごとに1軒、16軒まで） */
export function housesFor(population: number): number {
  return Math.max(0, Math.min(16, Math.round(population / 40)));
}

export function smogFor(pollution: number): number {
  return Math.max(0, Math.min(1, (pollution - 2) / 10));
}

export function joyFor(happiness: number): 0 | 1 | 2 {
  return happiness >= 6 ? 2 : happiness >= 3.5 ? 1 : 0;
}

export function tourismStyleOf(cls: TownClass, traits: TownTraitId[]): TourismStyle {
  if (traits.includes('joka')) return 'castle';
  if (cls === 'onsen' || traits.includes('yunomachi')) return 'ryokan';
  return 'pagoda';
}

/** 町の絵の設計図を作る。町でないマスは null */
export function buildSceneModel(city: CityState, nodeId: string, turn: number, stats: TownStats | undefined): SceneModel | null {
  const info = getTownInfo(nodeId);
  const town = city.towns[nodeId];
  if (!info || !town) return null;
  const month = calendarLabel(turn).month;
  const counts = rowCounts(town.plots.length);
  const widest = Math.max(1, ...counts);
  const slotW = Math.min(SLOT_MAX, (SCENE_W - 16) / widest);
  const two = counts.length > 1;
  const horizon = two ? 70 : 78;
  const rows = counts.map((_, r) => horizon + (two ? 52 : 54) + r * ROW_GAP);
  const H = rows[rows.length - 1] + 40;
  const scale = Math.max(1, Math.min(two ? 1.15 : 1.24, slotW / 50));
  const slots: SlotModel[] = [];
  let idx = 0;
  counts.forEach((c, r) => {
    const x0 = (SCENE_W - c * slotW) / 2;
    for (let i = 0; i < c; i++) {
      slots.push({ index: idx, row: r, x: x0 + (i + 0.5) * slotW, baseY: rows[r], plot: town.plots[idx] ?? null });
      idx++;
    }
  });
  const south = SOUTH.has(nodeId);
  const winter = month === 12 || month <= 2;
  const landmark = LANDMARKS[nodeId] ?? null;
  return {
    nodeId,
    name: info.name,
    cls: info.cls,
    region: info.region,
    traits: info.traits,
    month,
    tier: town.tier ?? 0,
    landmark,
    sea: info.cls === 'port' || info.traits.includes('kowan') || landmark === 'seaTorii' || landmark === 'volcano',
    south,
    snowy: winter && !south && (info.traits.includes('yukiguni') || info.region === 'hokkaido' || info.region === 'tohoku'),
    snowCaps: !south && (month >= 11 || month <= 4),
    tourism: tourismStyleOf(info.cls, info.traits),
    W: SCENE_W,
    H,
    horizon,
    groundY: horizon + (info.cls === 'port' ? 15 : 5),
    rows,
    slotW,
    scale,
    slots,
    built: town.plots.filter(Boolean).length,
    powered: stats?.powered ?? false,
    smog: smogFor(stats?.pollution ?? 0),
    joy: joyFor(stats?.happiness ?? 5),
    walkers: walkersFor(stats?.population ?? 0),
    houses: housesFor(stats?.population ?? 0),
    recovery: recoveryMonthsLeft(town),
    mayor: mayorOf(town),
    monopoly: monopolyOwner(town),
  };
}
