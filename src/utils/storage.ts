import { useAuthStore } from '../store/useAuthStore';
import {
  saveUserGameState,
  loadUserGameState,
  clearUserGameState,
} from '../lib/firestore';

const SAVE_KEY_BASE = 'tsuri_sugoroku_save';
const ENCYCLOPEDIA_KEY_BASE = 'tsuri_sugoroku_encyclopedia';

function getUid(): string | null {
  return useAuthStore.getState().user?.uid ?? null;
}

// ユーザーごとにlocalStorageキーを分離
function saveKey(): string {
  const uid = getUid();
  return uid ? `${SAVE_KEY_BASE}_${uid}` : SAVE_KEY_BASE;
}

// ===== ゲームセーブ =====

export function saveGameState(state: unknown): void {
  try {
    localStorage.setItem(saveKey(), JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
  const uid = getUid();
  if (uid) {
    saveUserGameState(uid, state).catch(() => {});
  }
}

export function loadGameState(): unknown | null {
  try {
    const data = localStorage.getItem(saveKey());
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function loadGameStateAsync(): Promise<unknown | null> {
  const uid = getUid();
  if (uid) {
    try {
      const remote = await loadUserGameState(uid);
      if (remote) return remote;
    } catch {
      // Firestore失敗時はlocalStorageにフォールバック
    }
  }
  return loadGameState();
}

export function clearGameState(): void {
  localStorage.removeItem(saveKey());
  const uid = getUid();
  if (uid) {
    clearUserGameState(uid).catch(() => {});
  }
}

// ===== 図鑑（ゲスト用: localStorageのみ、Firestoreには書き込まない） =====

export function saveEncyclopedia(encyclopedia: Record<string, boolean>): void {
  try {
    localStorage.setItem(ENCYCLOPEDIA_KEY_BASE, JSON.stringify(encyclopedia));
  } catch {
    // ignore
  }
}

export function loadEncyclopedia(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(ENCYCLOPEDIA_KEY_BASE);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
