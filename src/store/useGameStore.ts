// ゲームのストア（1つだけ）。中身は機能ごとの部品（src/store/game/*）に分けてあり、ここで1つに組み立てる。
//
//   game/initialState.ts   初期値・手番ごとに戻す値・MAX_FISHING_PER_TURN
//   game/sessionSlice.ts   新しい対局・再開（セーブの読み込み）・終了・クラウド同期
//   game/turnSlice.ts      サイコロ・分かれ道・マスの処理（釣り旅）・ターン終了・次の人
//   game/moveHooks.ts      移動が確定した直後の処理（貧乏神のすれ違い）
//   game/cityArrival.ts    まちづくりのマス到着の処理・ゴールの着順賞金
//   game/monthEnd.ts       月末の処理（収入 → 保険 → 貧乏神 → 年度末）と見せ方。ストアに依存しない
//   game/monthEndSlice.ts  月末の全画面を閉じる
//   game/fishingSlice.ts   釣り（ミニゲーム・釣果・CPU の釣り）
//   game/equipmentSlice.ts 装備と店
//   game/eventSlice.ts     イベント札と県庁の祭り
//   game/citySlice.ts      町での操作（建設・再開発・買収・修繕・カード・名産・まちの出来事）
//   game/notices.ts        お知らせの順番待ち
//   game/devSlice.ts       開発用のずる
//   game/types.ts          GameStore の型（状態 + 各部品のアクション）
//
// 状態やアクションを足したら gameStore.shape.test.ts の一覧にも足す。
import { create } from 'zustand';
import type { GameStore } from './game/types';
import { initialState, MAX_FISHING_PER_TURN } from './game/initialState';
import { createSessionSlice, hasSavedGame } from './game/sessionSlice';
import { createTurnSlice } from './game/turnSlice';
import { createFishingSlice } from './game/fishingSlice';
import { createEquipmentSlice } from './game/equipmentSlice';
import { createEventSlice } from './game/eventSlice';
import { createCitySlice } from './game/citySlice';
import { createMonthEndSlice } from './game/monthEndSlice';
import { createNoticeSlice } from './game/notices';
import { createDevSlice } from './game/devSlice';

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  noticeQueue: [],
  ...createSessionSlice(set, get),
  ...createTurnSlice(set, get),
  ...createFishingSlice(set, get),
  ...createEquipmentSlice(set, get),
  ...createEventSlice(set, get),
  ...createCitySlice(set, get),
  ...createMonthEndSlice(set, get),
  ...createNoticeSlice(set, get),
  ...createDevSlice(set, get),
}));

export { MAX_FISHING_PER_TURN, hasSavedGame };
export type { GameStore };
