import { useAuthStore } from '../store/useAuthStore';
import {
  saveUserGameState,
  loadUserGameState,
  clearUserGameState,
  saveUserEncyclopedia,
  loadUserEncyclopedia,
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

function encyclopediaKey(): string {
  const uid = getUid();
  return uid ? `${ENCYCLOPEDIA_KEY_BASE}_${uid}` : ENCYCLOPEDIA_KEY_BASE;
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

// ===== 図鑑 =====

export function saveEncyclopedia(encyclopedia: Record<string, boolean>): void {
  try {
    localStorage.setItem(encyclopediaKey(), JSON.stringify(encyclopedia));
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
    const data = localStorage.getItem(encyclopediaKey());
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// 特定ユーザーの図鑑に魚を追加（マルチプレイ用）
export function saveEncyclopediaForPlayer(uid: string, fishId: string): void {
  // Firestoreからそのユーザーの図鑑を取得し、マージして保存
  loadUserEncyclopedia(uid).then(existing => {
    const updated = { ...existing, [fishId]: true };
    saveUserEncyclopedia(uid, updated).catch(() => {});
  }).catch(() => {});
}

export async function loadEncyclopediaAsync(): Promise<Record<string, boolean>> {
  const uid = getUid();
  if (uid) {
    try {
      const remote = await loadUserEncyclopedia(uid);
      if (remote) return remote;
    } catch {
      // Firestore失敗時はlocalStorageにフォールバック
    }
  }
  return loadEncyclopedia();
}
