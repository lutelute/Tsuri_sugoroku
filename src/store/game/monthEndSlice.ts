// 月末の全画面（決算・年度末・貧乏神の悪さ）を閉じるアクション。月末の中身は monthEnd.ts、呼ぶのは turnSlice の nextPlayer。
import type { TurnPhase } from '../../game/types';
import { queueNotice, binboNotice } from './notices';
import type { GameSlice } from './types';

export interface MonthEndActions {
  acknowledgeBinboEvent: () => void;
  acknowledgeCityReport: () => void;
  acknowledgeCityYearEnd: () => void;
  /** 月末の全画面（決算・年度末・貧乏神の悪さ）をまとめて閉じる。貧乏神の悪さは上部のお知らせに回す */
  skipMonthEnd: () => void;
}

export const createMonthEndSlice: GameSlice<MonthEndActions> = (set, get) => ({
  acknowledgeBinboEvent: () => set({ cityBinboEvent: null }),

  acknowledgeCityReport: () => {
    set({ turnPhase: 'idle' });
  },

  acknowledgeCityYearEnd: () => {
    // 最終決算を閉じたら結果発表へ（cityYearEnd は結果画面でも使うので残す）
    if (get().cityYearEnd?.final) {
      get().endGame();
      return;
    }
    set({ turnPhase: 'idle', cityYearEnd: null });
  },

  skipMonthEnd: () => {
    const st = get();
    const ev = st.cityBinboEvent;
    const phase = st.turnPhase;
    if (phase === 'city_yearend' && st.cityYearEnd?.final) {
      set({ cityBinboEvent: null });
      get().endGame();
      return;
    }
    set({
      cityBinboEvent: null,
      ...(phase === 'city_report' || phase === 'city_yearend' ? { turnPhase: 'idle' as TurnPhase } : {}),
      ...(phase === 'city_yearend' ? { cityYearEnd: null } : {}),
    });
    if (ev) queueNotice(set, get, binboNotice(ev, st.players, true));
  },
});
