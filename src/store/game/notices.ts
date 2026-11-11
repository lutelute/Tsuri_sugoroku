// お知らせ（瓦版・貧乏神がとりついた/移った）の順番待ち。見せるのは cityToast / cityBinboToast のどちらか1件だけ。
// ストアの中からお知らせを出すときは queueNotice(set, get, …) を、画面や CPU からは announce を使う。
import type { GameState, Player } from '../../game/types';
import { mergeNoticeBody, pushNotice } from '../../game/tempo';
import type { Notice } from '../../game/tempo';
import type { GameGet, GameSet, GameSlice, GameStore } from './types';

export interface NoticeActions {
  dismissBinboToast: () => void;
  dismissCityToast: () => void;
  /** 画面上部のお知らせ（CPU の行動報告など） */
  announce: (title: string, body: string) => void;
}

/** お知らせの通し番号（表示の key と演出のやり直しに使う。閉じても戻さない） */
let noticeSeq = 0;

/** お知らせ1件を「見せている」状態にする差分 */
function showNotice(n: Notice): Partial<GameStore> {
  noticeSeq++;
  if (n.kind === 'city') return { cityToast: { title: n.title, body: n.body, seq: noticeSeq } };
  return { cityBinboToast: { reason: n.reason, playerIndex: n.playerIndex, fromIndex: n.fromIndex, great: n.great, seq: noticeSeq } };
}

/** お知らせを出す。何も出ていなければすぐ出し、出ていれば順番待ちに積む（重ねて出さない・上書きしない） */
export function queueNotice(set: GameSet, get: GameGet, n: Notice) {
  const st = get();
  if (!st.cityToast && !st.cityBinboToast && st.noticeQueue.length === 0) {
    set(showNotice(n));
  } else if (n.kind === 'city' && st.cityToast?.title === n.title && st.noticeQueue.length === 0) {
    // いま見せている瓦版と同じ見出し（CPU が同じ町で続けて建てた等）は、本文をつないで見せ続ける。
    // 同じ文は並べずに「 ×2」とまとめる（tempo.mergeNoticeBody）
    set({ cityToast: { ...st.cityToast, body: mergeNoticeBody(st.cityToast.body, n.body) } });
  } else {
    set({ noticeQueue: pushNotice(st.noticeQueue, n) });
  }
}

/** 見せていたお知らせを閉じ（cleared）、何も出ていなければ順番待ちの先頭を出す */
function nextNotice(st: GameStore, cleared: Partial<GameStore>): Partial<GameStore> {
  const after = { ...st, ...cleared };
  if (after.cityToast || after.cityBinboToast) return cleared;
  const [head, ...rest] = st.noticeQueue;
  return head ? { ...cleared, ...showNotice(head), noticeQueue: rest } : cleared;
}

/** 貧乏神の月末の悪さを上部のお知らせで流すときの文面 */
export function binboNotice(ev: NonNullable<GameState['cityBinboEvent']>, players: Player[], important = false): Notice {
  return { kind: 'city', title: `${ev.great ? '大貧乏神' : '貧乏神'}の悪さ（${players[ev.playerIndex]?.name ?? ''}）`, body: ev.message, important };
}

export const createNoticeSlice: GameSlice<NoticeActions> = (set, get) => ({
  dismissBinboToast: () => set(st => nextNotice(st, { cityBinboToast: null })),

  dismissCityToast: () => set(st => nextNotice(st, { cityToast: null })),

  announce: (title, body) => queueNotice(set, get, { kind: 'city', title, body }),
});
