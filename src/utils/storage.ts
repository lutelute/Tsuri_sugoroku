import { useAuthStore } from '../store/useAuthStore';
import {
  saveUserGameState,
  loadUserGameState,
  clearUserGameState,
  saveUserEncyclopedia,
  loadUserEncyclopedia,
} from '../lib/firestore';

const SAVE_KEY = 'tsuri_sugoroku_save';
const ENCYCLOPEDIA_KEY = 'tsuri_sugoroku_encyclopedia';

function getUid(): string | null {
  return useAuthStore.getState().user?.uid ?? null;
}

// ===== ゲームセーブ =====

export function saveGameState(state: unknown): void {
  // localStorage に常に保存（即座に）
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
  // ログイン中は Firestore にも保存（非同期、fire-and-forget）
  const uid = getUid();
  if (uid) {
    saveUserGameState(uid, state).catch(() => {});
  }
}

export function loadGameState(): unknown | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
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
  localStorage.removeItem(SAVE_KEY);
  const uid = getUid();
  if (uid) {
    clearUserGameState(uid).catch(() => {});
  }
}

// ===== 図鑑 =====

export function saveEncyclopedia(encyclopedia: Record<string, boolean>): void {
  try {
    localStorage.setItem(ENCYCLOPEDIA_KEY, JSON.stringify(encyclopedia));
  } catch {
    // ignore
  }
  const uid = getUid();
  if (uid) {
    saveUserEncyclopedia(uid, encyclopedia).catch(() => {});
  }
}

export function loadEncyclopedia(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(ENCYCLOPEDIA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function loadEncyclopediaAsync(): Promise<Record<string, boolean>> {
  const uid = getUid();
  if (uid) {
    try {
      const remote = await loadUserEncyclopedia(uid);
      if (remote && Object.keys(remote).length > 0) return remote;
    } catch {
      // Firestore失敗時はlocalStorageにフォールバック
    }
  }
  return loadEncyclopedia();
}
