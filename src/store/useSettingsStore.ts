import { create } from 'zustand';
import { setSoundConfig } from '../utils/sound';

// 子供向けの「ふりがな（ルビ）」表示や効果音など、ゲーム外の設定。localStorage に永続化する。
const FURIGANA_KEY = 'tsuri_furigana_enabled';
const SOUND_KEY = 'tsuri_sound_enabled';
const VOLUME_KEY = 'tsuri_sound_volume';

/** 効果音の音量の既定値（控えめ） */
export const DEFAULT_SOUND_VOLUME = 0.3;

function loadFurigana(): boolean {
  try {
    const v = localStorage.getItem(FURIGANA_KEY);
    if (v === null) return true; // 既定はON（子供向け）
    return v === '1';
  } catch {
    return true;
  }
}

function loadSound(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    if (v === null) return true; // 既定はON
    return v === '1';
  } catch {
    return true;
  }
}

function loadVolume(): number {
  try {
    const v = localStorage.getItem(VOLUME_KEY);
    if (v === null) return DEFAULT_SOUND_VOLUME;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_SOUND_VOLUME;
  } catch {
    return DEFAULT_SOUND_VOLUME;
  }
}

interface SettingsState {
  furiganaEnabled: boolean;
  setFurigana: (enabled: boolean) => void;
  toggleFurigana: () => void;
  /** 効果音 ON/OFF */
  soundEnabled: boolean;
  /** 効果音の音量（0〜1） */
  soundVolume: number;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setSoundVolume: (volume: number) => void;
}

const initialSound = loadSound();
const initialVolume = loadVolume();
setSoundConfig({ enabled: initialSound, volume: initialVolume });

export const useSettingsStore = create<SettingsState>((set, get) => ({
  furiganaEnabled: loadFurigana(),
  setFurigana: (enabled) => {
    try { localStorage.setItem(FURIGANA_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set({ furiganaEnabled: enabled });
  },
  toggleFurigana: () => get().setFurigana(!get().furiganaEnabled),

  soundEnabled: initialSound,
  soundVolume: initialVolume,
  setSoundEnabled: (enabled) => {
    try { localStorage.setItem(SOUND_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    setSoundConfig({ enabled });
    set({ soundEnabled: enabled });
  },
  toggleSound: () => get().setSoundEnabled(!get().soundEnabled),
  setSoundVolume: (volume) => {
    const v = Math.min(1, Math.max(0, volume));
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* ignore */ }
    setSoundConfig({ volume: v });
    set({ soundVolume: v });
  },
}));
