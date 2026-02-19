import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit as firestoreLimit, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { RankingEntry, ScoreBreakdown, UserInfo } from '../game/types';

// ===== ユーザー名ルックアップ =====

export async function registerUsername(uid: string, username: string): Promise<void> {
  await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid, displayName: username });
  // 検索用プロフィールコレクションにも書き込み
  await setDoc(doc(db, 'profiles', uid), {
    uid,
    displayName: username,
    displayNameLower: username.toLowerCase(),
  }, { merge: true });
}

export async function lookupUserByUsername(username: string): Promise<{ uid: string; displayName: string } | null> {
  // 1. usernamesコレクションから検索（高速）
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  if (snap.exists()) return snap.data() as { uid: string; displayName: string };

  // 2. profilesコレクションからフォールバック検索
  const q = query(
    collection(db, 'profiles'),
    where('displayNameLower', '==', username.toLowerCase()),
  );
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const data = querySnap.docs[0].data() as { uid: string; displayName: string };
    // 次回以降のためにusernamesにも登録
    registerUsername(data.uid, data.displayName).catch(() => {});
    return { uid: data.uid, displayName: data.displayName };
  }

  return null;
}

// ===== 図鑑 =====

export async function saveUserEncyclopedia(uid: string, encyclopedia: Record<string, boolean>): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'encyclopedia'), encyclopedia);
}

export async function loadUserEncyclopedia(uid: string): Promise<Record<string, boolean>> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'encyclopedia'));
  return snap.exists() ? (snap.data() as Record<string, boolean>) : {};
}

// ===== ゲームセーブ =====

export async function saveUserGameState(uid: string, state: unknown): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'saveData'), { state });
}

export async function loadUserGameState(uid: string): Promise<unknown | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'saveData'));
  if (!snap.exists()) return null;
  return (snap.data() as { state: unknown }).state;
}

export async function clearUserGameState(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'saveData'), { state: null });
}

// ===== 装備 =====

export async function saveUserEquipment(uid: string, equipment: unknown): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'equipment'), { equipment });
}

export async function loadUserEquipment(uid: string): Promise<unknown | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'equipment'));
  if (!snap.exists()) return null;
  return (snap.data() as { equipment: unknown }).equipment;
}

// ===== 所持金 =====

export async function saveUserMoney(uid: string, money: number): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'money'), { money });
}

export async function loadUserMoney(uid: string): Promise<number | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'money'));
  if (!snap.exists()) return null;
  return (snap.data() as { money: number }).money;
}

// ===== プロフィール =====

export async function saveUserProfile(uid: string, displayName: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'profile'), {
    displayName,
    lastLoginAt: new Date().toISOString(),
  }, { merge: true });
  // 検索用プロフィールコレクションにも書き込み
  await setDoc(doc(db, 'profiles', uid), {
    uid,
    displayName,
    displayNameLower: displayName.toLowerCase(),
    lastLoginAt: new Date().toISOString(),
  }, { merge: true }).catch(() => {});
}

// ===== ランキング =====

export async function saveUserScore(entry: Omit<RankingEntry, 'id'>): Promise<void> {
  await addDoc(collection(db, 'rankings'), entry);
}

export async function loadScoreRankings(max: number = 50): Promise<RankingEntry[]> {
  const q = query(
    collection(db, 'rankings'),
    orderBy('score', 'desc'),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RankingEntry);
}

export async function loadEncyclopediaRankings(max: number = 50): Promise<RankingEntry[]> {
  const q = query(
    collection(db, 'rankings'),
    orderBy('encyclopediaRate', 'desc'),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RankingEntry);
}

// ===== ユーザー一覧 =====

export async function loadAllUsers(): Promise<UserInfo[]> {
  const snap = await getDocs(collection(db, 'profiles'));
  return snap.docs.map(d => {
    const data = d.data() as { uid: string; displayName: string; lastLoginAt?: string };
    return {
      uid: data.uid,
      displayName: data.displayName,
      lastLoginAt: data.lastLoginAt,
    };
  });
}

// ===== 図鑑リセット =====

export async function resetUserEncyclopedia(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'encyclopedia'), {});
}

// ===== ユーザーごとの図鑑コンプ率取得 =====

export async function loadUserEncyclopediaRate(uid: string): Promise<number> {
  const enc = await loadUserEncyclopedia(uid);
  const count = Object.keys(enc).filter(k => enc[k]).length;
  return count;
}
