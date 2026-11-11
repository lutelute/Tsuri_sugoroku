// 地図の上の町の姿: 小さな建物の絵の大きさ（townMarks.tsx の絵と揃える）。
import type { BuildingKind } from '../../game/city';

/** 1軒の幅 */
export const MINI_W = 4.4;

/** 絵の高さ（並べる順と、印の置き場所に使う） */
export function miniHeight(kind: BuildingKind, level: number): number {
  const lv = Math.max(1, Math.min(3, Math.round(level))) - 1;
  switch (kind) {
    case 'res': return [4.8, 6.6, 9][lv];
    case 'com': return [3.8, 6.8, 10.6][lv];
    case 'ind': return [5.2, 7.8, 10.6][lv];
    case 'tourism': return [4.8, 7.8, 11][lv];
    case 'park': return 5.8;
    case 'power': return 11;
    case 'port': return 6.6;
  }
}
