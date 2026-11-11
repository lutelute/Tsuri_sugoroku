// 町の絵: 色と季節の調子（街並みの絵 TownScene・建物の記号 BuildingGlyph で共有する）。
// 浮世絵の調子に合わせ、平たい色面と墨の輪郭で描く。色は index.css の @theme（藍・朱・金・和紙）に寄せる。

export const INK = '#1c140c';
export const WASHI = '#fbf6e8';
export const WASHI2 = '#e9dcc0';
export const WASHI3 = '#d8c79e';
export const PLASTER = '#f4ecd8';
export const KIN = '#d4a843';
export const KIN_L = '#f1d893';
export const KIN_D = '#b8862f';
export const SHU = '#c63a26';
export const SHU_L = '#ef6a52';
export const SHU_D = '#a92e1d';
export const AI9 = '#0c1f33';
export const AI7 = '#15314f';
export const AI5 = '#24496e';
export const AI4 = '#2e5e8c';
export const AI3 = '#4a7faf';
export const AI2 = '#7fa9cd';
export const WOOD = '#6b4b2a';
export const WOOD_L = '#9a7648';
export const WOOD_D = '#4a3320';
export const STONE = '#b9b1a0';
export const STONE_D = '#8f8878';
export const BRICK = '#a4553b';
export const BRICK_D = '#7c3d2a';
export const SNOW = '#fbfdff';
export const SNOW_SHADE = '#d5e2ec';
/** 灯りのついた窓・消えた窓 */
export const WIN_LIT = '#ffdc82';
export const WIN_DARK = '#3b4856';

/** 建物の種類ごとの色（city.ts の BUILDING_INFO の色と同じ系統。屋根や壁に使う） */
export const KIND = {
  res: '#4f9d5d',
  resD: '#34724a',
  com: '#3a78b8',
  comD: '#234f80',
  ind: '#cfa23c',
  indD: '#8a6a2a',
  indRoof: '#6f5a3c',
  park: '#7cc36b',
  power: '#e0c341',
  port: '#4fb0c6',
  portD: '#2f7f95',
  tour: '#d0628a',
  tourD: '#9a3d60',
} as const;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 木の葉の色。bare は葉の落ちた木（冬）、blossom は枝に咲く花（梅） */
export interface Leaf {
  main: string;
  light: string;
  dark: string;
  bare: boolean;
  blossom?: string;
}

export type Cloud = 'haze' | 'puffs' | 'nyudo' | 'rain' | 'wind' | 'thin';
export type Orb = 'sun' | 'red' | 'moon' | 'none';
export type SeasonExtra = 'sakura' | 'koinobori' | 'ajisai' | 'matsuri' | 'hanabi' | 'typhoon' | 'momiji' | 'yearend' | 'newyear' | 'yuki' | 'ume';

/** その月の絵の調子 */
export interface Mood {
  month: number;
  season: Season;
  /** 空の色: 上・中ほど・地平線 */
  sky: [string, string, string];
  orb: Orb;
  cloud: Cloud;
  /** 夕暮れ・夜（窓や提灯の灯りが映える） */
  dusk: boolean;
  leaf: Leaf;
  /** 常緑の木（松・杉） */
  pine: string;
  grass: string;
  soil: string;
  hillFar: string;
  hillNear: string;
  extra: SeasonExtra;
}

const BARE: Leaf = { main: '#8a7862', light: '#a8967c', dark: '#6a5a48', bare: true };

const MOODS: Record<number, Omit<Mood, 'month'>> = {
  4: {
    season: 'spring', sky: ['#6f9fc9', '#cfe2ea', '#fbe4e0'], orb: 'sun', cloud: 'haze', dusk: false,
    leaf: { main: '#f2b3c4', light: '#fbd9e1', dark: '#dd8aa3', bare: false },
    pine: '#4f8a63', grass: '#a3cb7f', soil: '#d9c79c', hillFar: '#a9c3c9', hillNear: '#8fb98a', extra: 'sakura',
  },
  5: {
    season: 'spring', sky: ['#4a7faf', '#b5d6e6', '#eef4e4'], orb: 'sun', cloud: 'puffs', dusk: false,
    leaf: { main: '#6fbd62', light: '#9ad67f', dark: '#4f9d5d', bare: false },
    pine: '#3f8a58', grass: '#93cf72', soil: '#d6c596', hillFar: '#9dbfc6', hillNear: '#7fb47a', extra: 'koinobori',
  },
  6: {
    season: 'summer', sky: ['#687d90', '#a9b9c0', '#dde1d8'], orb: 'none', cloud: 'rain', dusk: false,
    leaf: { main: '#4f9d5d', light: '#6fb56a', dark: '#3a7d4c', bare: false },
    pine: '#356f50', grass: '#7fb56a', soil: '#c2b48e', hillFar: '#93a8ae', hillNear: '#6f9c78', extra: 'ajisai',
  },
  7: {
    season: 'summer', sky: ['#2e5e8c', '#7fb2d9', '#e1eef0'], orb: 'sun', cloud: 'nyudo', dusk: false,
    leaf: { main: '#3f8f55', light: '#5faa60', dark: '#2f7446', bare: false },
    pine: '#2f6f4c', grass: '#6fb55f', soil: '#d3c08f', hillFar: '#7fa3bd', hillNear: '#5f9a6a', extra: 'matsuri',
  },
  8: {
    season: 'summer', sky: ['#0c1f33', '#2b4f78', '#e99a6c'], orb: 'moon', cloud: 'thin', dusk: true,
    leaf: { main: '#2f7446', light: '#3f8f55', dark: '#24583a', bare: false },
    pine: '#255a40', grass: '#4f8a52', soil: '#a8946c', hillFar: '#3a5674', hillNear: '#34604f', extra: 'hanabi',
  },
  9: {
    season: 'autumn', sky: ['#5a6d7e', '#98a8ae', '#ddd6c2'], orb: 'none', cloud: 'wind', dusk: false,
    leaf: { main: '#5d8f4d', light: '#7fa860', dark: '#44703c', bare: false },
    pine: '#3a7050', grass: '#93ae62', soil: '#cbb98c', hillFar: '#8597a3', hillNear: '#6f8f66', extra: 'typhoon',
  },
  10: {
    season: 'autumn', sky: ['#4a7faf', '#e3d8ad', '#f8e6c2'], orb: 'sun', cloud: 'thin', dusk: false,
    leaf: { main: '#e08a2c', light: '#f1b54a', dark: '#c6502a', bare: false },
    pine: '#3f7a56', grass: '#c2b060', soil: '#d6bf8a', hillFar: '#b3a78c', hillNear: '#c98a4a', extra: 'momiji',
  },
  11: {
    season: 'autumn', sky: ['#5b4f78', '#e39a74', '#f8dcae'], orb: 'red', cloud: 'thin', dusk: false,
    leaf: { main: '#c63a26', light: '#e36a3a', dark: '#8f2a1a', bare: false },
    pine: '#3a6f52', grass: '#b89a58', soil: '#cfb27e', hillFar: '#8f7f96', hillNear: '#a9583a', extra: 'momiji',
  },
  12: {
    season: 'winter', sky: ['#102a44', '#44688f', '#efcfb4'], orb: 'moon', cloud: 'thin', dusk: true,
    leaf: BARE,
    pine: '#3d6b57', grass: '#a79c7c', soil: '#b8a680', hillFar: '#566f8c', hillNear: '#6a7a6f', extra: 'yearend',
  },
  1: {
    season: 'winter', sky: ['#2e5e8c', '#cfe0e6', '#fdeedd'], orb: 'red', cloud: 'haze', dusk: false,
    leaf: BARE,
    pine: '#3f7358', grass: '#b5ab8c', soil: '#cdbb92', hillFar: '#9db4c4', hillNear: '#8a9a8a', extra: 'newyear',
  },
  2: {
    season: 'winter', sky: ['#7f97ad', '#cad8de', '#f0f2ef'], orb: 'none', cloud: 'haze', dusk: false,
    leaf: BARE,
    pine: '#44755c', grass: '#b9b29a', soil: '#cbbd9a', hillFar: '#a9bcc9', hillNear: '#93a39a', extra: 'yuki',
  },
  3: {
    season: 'spring', sky: ['#7fa9cd', '#dce9e8', '#f8efdc'], orb: 'sun', cloud: 'haze', dusk: false,
    leaf: { ...BARE, blossom: '#e88aa6' },
    pine: '#4a8560', grass: '#a9c284', soil: '#d6c69c', hillFar: '#a9c0c6', hillNear: '#93b08a', extra: 'ume',
  },
};

/** 月（1〜12）から絵の調子を引く */
export function moodOf(month: number): Mood {
  const m = ((Math.round(month) - 1 + 120) % 12) + 1;
  return { ...MOODS[m], month: m };
}

/** 文字列から決まった数を作る（町ごとに山の形・人の並びを変えるための種） */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/** 2色を混ぜる（t=0 で a、t=1 で b）。#rrggbb だけ受ける */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
