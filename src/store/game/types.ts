// ゲームストアの型。状態（GameState）と、機能ごとの部品（スライス）が持つアクションを1つにまとめる。
// 状態の型は src/game/types.ts の GameState。アクションの型は各スライスのファイルにある。
import type { StoreApi } from 'zustand';
import type { GameState } from '../../game/types';
import type { Notice } from '../../game/tempo';
import type { SessionActions } from './sessionSlice';
import type { TurnActions } from './turnSlice';
import type { FishingActions } from './fishingSlice';
import type { EquipmentActions } from './equipmentSlice';
import type { EventActions } from './eventSlice';
import type { CityActions } from './citySlice';
import type { MonthEndActions } from './monthEndSlice';
import type { NoticeActions } from './notices';
import type { DevActions } from './devSlice';

/** お知らせ（瓦版・貧乏神）の順番待ち。見せている1件は cityToast / cityBinboToast */
export interface NoticeState {
  noticeQueue: Notice[];
}

export type GameActions = SessionActions & TurnActions & FishingActions & EquipmentActions & EventActions
  & CityActions & MonthEndActions & NoticeActions & DevActions;

export type GameStore = GameState & NoticeState & GameActions;

export type GameSet = StoreApi<GameStore>['setState'];
export type GameGet = StoreApi<GameStore>['getState'];

/** 機能ごとの部品。ストアの set / get を受け取り、アクションを返す */
export type GameSlice<T> = (set: GameSet, get: GameGet) => T;
