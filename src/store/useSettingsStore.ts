import { create } from 'zustand';

// 子供向けの「ふりがな（ルビ）」表示など、ゲーム外の表示設定。localStorage に永続化する。
const FURIGANA_KEY = 'tsuri_furigana_enabled';

function loadFurigana(): boolean {
  try {
    const v = localStorage.getItem(FURIGANA_KEY);
    if (v === null) return true; // 既定はON（子供向け）
    return v === '1';
  } catch {
    return true;
  }
}

interface SettingsState {
  furiganaEnabled: boolean;
  setFurigana: (enabled: boolean) => void;
  toggleFurigana: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  furiganaEnabled: loadFurigana(),
  setFurigana: (enabled) => {
    try { localStorage.setItem(FURIGANA_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set({ furiganaEnabled: enabled });
  },
  toggleFurigana: () => get().setFurigana(!get().furiganaEnabled),
}));
