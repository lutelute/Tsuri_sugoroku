import { create } from 'zustand';
import { setSoundConfig } from '../utils/sound';
import { CPU_SPEEDS, tempoScale } from '../game/tempo';
import type { CpuSpeed } from '../game/tempo';
import { DEFAULT_FISH_ART, FISH_ART_PREFS } from '../components/shared/fishArt/styles';
import type { FishArtPref } from '../components/shared/fishArt/styles';

// 子供向けの「ふりがな（ルビ）」表示や効果音など、ゲーム外の設定。localStorage に永続化する。
const FURIGANA_KEY = 'tsuri_furigana_enabled';
const SOUND_KEY = 'tsuri_sound_enabled';
const VOLUME_KEY = 'tsuri_sound_volume';
const CPU_SPEED_KEY = 'tsuri_cpu_speed';
const QUICK_CATCH_KEY = 'tsuri_quick_catch';
const ADVICE_KEY = 'tsuri_advice_enabled';
const FISH_ART_KEY = 'tsuri_fish_art';

/** 魚の絵の描き方。既定は木版 */
function loadFishArt(): FishArtPref {
  try {
    const v = localStorage.getItem(FISH_ART_KEY);
    return FISH_ART_PREFS.includes(v as FishArtPref) ? (v as FishArtPref) : DEFAULT_FISH_ART;
  } catch {
    return DEFAULT_FISH_ART;
  }
}

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

function loadCpuSpeed(): CpuSpeed {
  try {
    const v = localStorage.getItem(CPU_SPEED_KEY);
    return CPU_SPEEDS.includes(v as CpuSpeed) ? (v as CpuSpeed) : 'normal';
  } catch {
    return 'normal';
  }
}

/** 雑魚は手早く（釣り係）。既定は入 */
function loadQuickCatch(): boolean {
  try {
    return localStorage.getItem(QUICK_CATCH_KEY) !== '0';
  } catch {
    return true;
  }
}

/** 行き先のおすすめを出す（損得係）。既定は入 */
function loadAdvice(): boolean {
  try {
    return localStorage.getItem(ADVICE_KEY) !== '0';
  } catch {
    return true;
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
  /** CPU の手番の速さ（ゆっくり／ふつう／はやい） */
  cpuSpeed: CpuSpeed;
  setCpuSpeed: (speed: CpuSpeed) => void;
  /** ゆっくり → ふつう → はやい → ゆっくり… */
  cycleCpuSpeed: () => void;
  /** 雑魚は手早く: 道具が育ったら、小物は合わせに成功したところで釣り上げる（やり取りを省く） */
  quickCatch: boolean;
  setQuickCatch: (enabled: boolean) => void;
  toggleQuickCatch: () => void;
  /** おすすめを出す: 分かれ道で、行き先の上位3つに金の輪と理由の札を出す */
  adviceEnabled: boolean;
  setAdvice: (enabled: boolean) => void;
  toggleAdvice: () => void;
  /** 魚の絵の描き方（木版／描き分け／魚拓／もとの絵） */
  fishArt: FishArtPref;
  setFishArt: (pref: FishArtPref) => void;
  /** 木版 → 描き分け → 魚拓 → もとの絵 → 木版… */
  cycleFishArt: () => void;
  /** CPU の手番を早送り中か（保存しない。人の手番になったら戻す） */
  cpuSkipping: boolean;
  setCpuSkipping: (skipping: boolean) => void;
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

  cpuSpeed: loadCpuSpeed(),
  setCpuSpeed: (speed) => {
    try { localStorage.setItem(CPU_SPEED_KEY, speed); } catch { /* ignore */ }
    set({ cpuSpeed: speed });
  },
  cycleCpuSpeed: () => {
    const i = CPU_SPEEDS.indexOf(get().cpuSpeed);
    get().setCpuSpeed(CPU_SPEEDS[(i + 1) % CPU_SPEEDS.length]);
  },
  quickCatch: loadQuickCatch(),
  setQuickCatch: (enabled) => {
    try { localStorage.setItem(QUICK_CATCH_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set({ quickCatch: enabled });
  },
  toggleQuickCatch: () => get().setQuickCatch(!get().quickCatch),
  adviceEnabled: loadAdvice(),
  setAdvice: (enabled) => {
    try { localStorage.setItem(ADVICE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set({ adviceEnabled: enabled });
  },
  toggleAdvice: () => get().setAdvice(!get().adviceEnabled),
  fishArt: loadFishArt(),
  setFishArt: (pref) => {
    try { localStorage.setItem(FISH_ART_KEY, pref); } catch { /* ignore */ }
    set({ fishArt: pref });
  },
  cycleFishArt: () => {
    const i = FISH_ART_PREFS.indexOf(get().fishArt);
    get().setFishArt(FISH_ART_PREFS[(i + 1) % FISH_ART_PREFS.length]);
  },
  cpuSkipping: false,
  setCpuSkipping: (skipping) => set({ cpuSkipping: skipping }),
}));

/** いまの手番の待ち時間に掛ける倍率（React の外から読むとき用） */
export function currentTempoScale(isCpuTurn: boolean): number {
  const st = useSettingsStore.getState();
  return tempoScale(isCpuTurn, st.cpuSpeed, st.cpuSkipping);
}

/** 手番の待ち時間に掛ける倍率を購読する（速さを変える・早送りするとすぐ効く） */
export function useTempoScale(isCpuTurn: boolean): number {
  return useSettingsStore(st => tempoScale(isCpuTurn, st.cpuSpeed, st.cpuSkipping));
}
