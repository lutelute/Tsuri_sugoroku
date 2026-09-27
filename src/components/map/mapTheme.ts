// 地図の配色・座標ユーティリティ（地形/凡例/ノードで共有する単一の真実）
import type { GeoRegion } from '../../data/japanGeo';

/** ゲーム座標への投影（scripts/build-japan-geo.mjs・relayout-nodes.mjs と同一式） */
export function projectLatLon(lat: number, lon: number): { x: number; y: number } {
  return { x: 84 + (lon - 127.7) * 67.6, y: 1445 - (lat - 26.2) * 79.4 };
}

/** 陸地の塗り（和紙地に地方ごとの淡い色味） */
export const REGION_LAND: Record<GeoRegion, string> = {
  hokkaido: '#cfd8cc',
  tohoku: '#d9c9ae',
  kanto: '#e3d4b2',
  chubu: '#c8d3a8',
  kinki: '#e4cf9e',
  chugoku: '#c4d4c2',
  shikoku: '#dcc5c6',
  kyushu: '#e0c1a2',
  okinawa: '#bcdcd0',
};

/** 凡例・地方ラベル・ノード外枠に使う濃い地方色 */
export const REGION_ACCENT: Record<GeoRegion, string> = {
  hokkaido: '#5e8aa8',
  tohoku: '#8a5a6a',
  kanto: '#7a7a8a',
  chubu: '#5f8a4e',
  kinki: '#a07a40',
  chugoku: '#4e8a86',
  shikoku: '#8a5a86',
  kyushu: '#a05a3a',
  okinawa: '#3f8f9a',
};

export const REGION_NAME: Record<GeoRegion, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  kyushu: '九州',
  okinawa: '沖縄',
};

/** 地方名ラベルの位置（すべて海上） */
export const REGION_LABEL_POS: Record<GeoRegion, { x: number; y: number }> = {
  hokkaido: { x: 1205, y: 245 },
  tohoku: { x: 1150, y: 430 },
  kanto: { x: 1075, y: 760 },
  chubu: { x: 640, y: 540 },
  kinki: { x: 655, y: 935 },
  chugoku: { x: 410, y: 630 },
  shikoku: { x: 505, y: 955 },
  kyushu: { x: 130, y: 870 },
  okinawa: { x: 235, y: 1470 },
};

/** 海の名前 */
export const SEA_LABELS: { name: string; x: number; y: number; size: number }[] = [
  { name: '日本海', ...projectLatLon(39.6, 135.4), size: 34 },
  { name: '太平洋', ...projectLatLon(31.6, 139.6), size: 42 },
  { name: 'オホーツク海', ...projectLatLon(45.3, 145.9), size: 26 },
  { name: '東シナ海', ...projectLatLon(29.8, 126.9), size: 28 },
];

/** 地図の既定表示範囲（日本全体） */
export const MAP_BOUNDS = { minX: -60, minY: -140, maxX: 1320, maxY: 1560 };

/** マスの描画半径（ノード・ラベル・町のスカイラインで共有） */
export function nodeRadius(node: { type: string }): number {
  switch (node.type) {
    case 'capital': return 10;
    case 'start':
    case 'goal': return 9.5;
    case 'route': return 3.6;
    default: return 7.5;
  }
}
