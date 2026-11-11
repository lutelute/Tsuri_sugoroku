// 町の絵: 建物の絵の型・大きさ・共通の形（React の部品ではないものをここに置く）。
// 絵そのものは buildings.tsx。
import type { BuildingKind } from '../../../game/city';
import { KIND } from './palette';
import type { Leaf } from './palette';

/** 観光名所の姿（古都は塔、城下町は城、温泉の町は旅館） */
export type TourismStyle = 'pagoda' | 'castle' | 'ryokan';

export interface ArtCtx {
  /** 持ち主の色（のれん・垂れ幕・旗）。無ければ建物ごとの決まった色 */
  owner?: string;
  /** 窓や提灯に灯りがともる（電気が来ている） */
  lit: boolean;
  /** 屋根や木に雪が積もる */
  snow: boolean;
  leaf: Leaf;
  pine: string;
  grass: string;
  /** 小さな記号用: 細部を省く */
  icon: boolean;
  /** 墨の線の太さ */
  sw: number;
  tourism: TourismStyle;
}

/** 記号や図解で使う、季節や町に寄らない既定の調子 */
export const PLAIN_CTX: ArtCtx = {
  lit: true,
  snow: false,
  leaf: { main: '#6fbd62', light: '#9ad67f', dark: '#4f9d5d', bare: false },
  pine: '#3f8a58',
  grass: KIND.park,
  icon: false,
  sw: 0.9,
  tourism: 'pagoda',
};

/** 反りのある瓦屋根の形。ey=軒の高さ、E=軒の半幅、R=棟の半幅、h=屋根の高さ */
export function roofD(cx: number, ey: number, E: number, R: number, h: number, up = 0.9): string {
  const mx = (E + R) / 2;
  return `M${cx - E} ${ey - up}Q${cx - mx} ${ey - h * 0.3} ${cx - R} ${ey - h}L${cx + R} ${ey - h}Q${cx + mx} ${ey - h * 0.3} ${cx + E} ${ey - up}L${cx + E - 1.6} ${ey}L${cx - E + 1.6} ${ey}Z`;
}

/** 絵の大きさ（幅 w・高さ h）。記号の縮尺と、街並みの絵の当たり判定に使う */
export function artBox(kind: BuildingKind, level: number, tourism: TourismStyle = 'pagoda'): { w: number; h: number } {
  const lv = Math.max(1, Math.min(3, Math.round(level))) - 1;
  switch (kind) {
    case 'res': return [{ w: 42, h: 17 }, { w: 37, h: 31 }, { w: 46, h: 50 }][lv];
    case 'com': return [{ w: 29, h: 21 }, { w: 41, h: 36 }, { w: 42, h: 57 }][lv];
    case 'ind': return [{ w: 36, h: 26 }, { w: 40, h: 44 }, { w: 45, h: 55 }][lv];
    case 'park': return { w: 44, h: 28 };
    case 'power': return { w: 46, h: 42 };
    case 'port': return { w: 46, h: 26 };
    case 'tourism':
      if (tourism === 'castle') return [{ w: 42, h: 23 }, { w: 40, h: 36 }, { w: 46, h: 50 }][lv];
      if (tourism === 'ryokan') return [{ w: 38, h: 26 }, { w: 40, h: 36 }, { w: 46, h: 50 }][lv];
      return [{ w: 40, h: 19 }, { w: 40, h: 39 }, { w: 46, h: 53 }][lv];
  }
}

/** 煙・湯けむりの出る所（地面が y=0、中心が x=0）。TownScene が動く煙を重ねるのに使う */
export function smokeVents(kind: BuildingKind, level: number, tourism: TourismStyle = 'pagoda'): { x: number; y: number; steam?: boolean }[] {
  const lv = Math.max(1, Math.min(3, Math.round(level)));
  if (kind === 'ind') return lv === 1 ? [{ x: 7.8, y: -23 }] : lv === 2 ? [{ x: 17.5, y: -41 }] : [{ x: -15, y: -52 }, { x: -5.4, y: -45 }];
  if (kind === 'power') return [{ x: -14.5, y: -37, steam: true }];
  if (kind === 'tourism' && tourism === 'ryokan') return [{ x: lv === 1 ? -2 : lv === 2 ? -8 : -13, y: lv === 1 ? -20 : lv === 2 ? -30 : -37, steam: true }];
  return [];
}
