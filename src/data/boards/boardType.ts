// アクティブなボードタイプの読み書き。
// ゲーム開始時に SetupScreen で選択 → localStorage に保存 → リロードで全モジュールに反映。
// (ESM の動的切替は難しいため、シンプルにリロードベースの設計)

import type { BoardType } from '../../game/types';

const KEY = 'tsuri_sugoroku_board_type';
const DEFAULT: BoardType = 'realistic';

export function getActiveBoardType(): BoardType {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'realistic' || v === 'snake' || v === 'islands') return v;
  } catch {}
  return DEFAULT;
}

export function setActiveBoardType(t: BoardType): void {
  try {
    localStorage.setItem(KEY, t);
  } catch {}
}

export const BOARD_TYPE_LABEL: Record<BoardType, string> = {
  realistic: '日本列島（地理）',
  snake: 'ジグザグ伝統盤',
  islands: '島ホップ（地方分離）',
};

export const BOARD_TYPE_DESC: Record<BoardType, string> = {
  realistic: '日本地図上で釣り場を巡る本来のレイアウト。',
  snake: '左右に蛇行する古典的すごろく。並びが分かりやすい。',
  islands: '8地方を独立した島として配置。地方ごとの世界観を楽しむ。',
};
