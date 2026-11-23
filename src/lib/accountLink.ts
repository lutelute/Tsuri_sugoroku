// 席をアカウントにつなぐ・アカウントを新しく作る（ゲーム設定と、対局の途中の「なかま」の画面で使う）。
// パスワードの確かめと作成は副インスタンス（verifyAuth）で行い、この端末のログイン状態は変えない。
// Firestore への書き込み（ユーザー名・プロフィール）はメインのログイン（ゲストでもよい）で行う。呼ぶ側で signInGuest しておくこと。
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { verifyAuth } from './firebase';
import { lookupUserByUsername, registerUsername, saveUserProfile } from './firestore';

export interface LinkedAccount {
  uid: string;
  displayName: string;
}

export type AccountResult = { ok: true; account: LinkedAccount } | { ok: false; message: string };

export function accountEmail(username: string): string {
  return `${username.trim().toLowerCase()}@tsuri.local`;
}

/** ユーザー名とパスワードで、いまあるアカウントを確かめる */
export async function verifyAccount(username: string, password: string): Promise<AccountResult> {
  const name = username.trim();
  if (!name || !password) return { ok: false, message: 'なまえとパスワードを入れてね' };
  let found: LinkedAccount | null;
  try {
    found = await lookupUserByUsername(name);
  } catch {
    return { ok: false, message: '検索に失敗しました' };
  }
  if (!found) return { ok: false, message: 'ユーザーが見つかりません' };
  try {
    const cred = await signInWithEmailAndPassword(verifyAuth, accountEmail(name), password);
    await firebaseSignOut(verifyAuth).catch(() => {});
    if (cred.user.uid !== found.uid) return { ok: false, message: 'ユーザー情報が一致しません' };
    return { ok: true, account: found };
  } catch {
    return { ok: false, message: 'パスワードが正しくありません' };
  }
}

/** アカウントを新しく作る（ログインの画面の「アカウントを作成する」と同じ中身） */
export async function createAccount(username: string, password: string): Promise<AccountResult> {
  const name = username.trim();
  if (!name || !password) return { ok: false, message: 'なまえとパスワードを入れてね' };
  if (password.length < 6) return { ok: false, message: 'パスワードは6文字以上にしてね' };
  try {
    const cred = await createUserWithEmailAndPassword(verifyAuth, accountEmail(name), password);
    await updateProfile(cred.user, { displayName: name }).catch(() => {});
    const uid = cred.user.uid;
    await firebaseSignOut(verifyAuth).catch(() => {});
    await registerUsername(uid, name).catch(() => {});
    saveUserProfile(uid, name).catch(() => {});
    return { ok: true, account: { uid, displayName: name } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('email-already-in-use')) return { ok: false, message: 'このなまえは、もう使われています' };
    if (msg.includes('weak-password')) return { ok: false, message: 'パスワードは6文字以上にしてね' };
    if (msg.includes('invalid-email')) return { ok: false, message: 'このなまえは使えません（英字と数字がおすすめ）' };
    if (msg.includes('network')) return { ok: false, message: 'インターネットにつながっていません' };
    return { ok: false, message: '登録に失敗しました' };
  }
}
