import { create } from 'zustand';

// 案内役（遊び方・モーションガイド）の設定と状態。
// 「ガイドを出すか」「どの案内を見たか」は localStorage に残す（使えない環境でも動くよう try/catch で包む）。
const ENABLED_KEY = 'tsuri_guide_enabled';
const SEEN_KEY = 'tsuri_guide_seen';

/** 遊び方の画面のどちらのページ群を開くか */
export type HowToMode = 'fishing' | 'city';

/** 保存された「見た案内」の文字列を読み取る（壊れていたら空とみなす） */
export function parseSeen(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function loadEnabled(): boolean {
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    return v === null ? true : v === '1'; // 既定はON（初めての人向け）
  } catch {
    return true;
  }
}

function loadSeen(): string[] {
  try {
    return parseSeen(localStorage.getItem(SEEN_KEY));
  } catch {
    return [];
  }
}

function saveSeen(seen: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* 保存できなくても、この回の間は二度出さない */ }
}

interface GuideState {
  /** その場で動いて教える案内を出すか */
  enabled: boolean;
  /** 見た（閉じた・済ませた）案内の id */
  seen: string[];
  /** いま出ている案内（地図の上の案内もこれを見て描く） */
  activeId: string | null;
  /** 開いている遊び方の画面（null は閉じている） */
  howTo: HowToMode | null;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  markSeen: (id: string) => void;
  /** 見た記録を消して、案内をはじめから出す */
  resetSeen: () => void;
  setActive: (id: string | null) => void;
  openHowTo: (mode: HowToMode) => void;
  closeHowTo: () => void;
}

export const useGuideStore = create<GuideState>((set, get) => ({
  enabled: loadEnabled(),
  seen: loadSeen(),
  activeId: null,
  howTo: null,
  setEnabled: (enabled) => {
    try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set(enabled ? { enabled } : { enabled, activeId: null });
  },
  toggleEnabled: () => get().setEnabled(!get().enabled),
  markSeen: (id) => {
    if (get().seen.includes(id)) return;
    const seen = [...get().seen, id];
    saveSeen(seen);
    set({ seen });
  },
  resetSeen: () => {
    saveSeen([]);
    set({ seen: [], activeId: null });
  },
  setActive: (id) => {
    if (get().activeId !== id) set({ activeId: id });
  },
  openHowTo: (mode) => set({ howTo: mode }),
  closeHowTo: () => set({ howTo: null }),
}));
