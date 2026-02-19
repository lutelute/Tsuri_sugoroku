import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { saveUserProfile, registerUsername } from '../lib/firestore';

function toEmail(username: string): string {
  return `${username.toLowerCase()}@tsuri.local`;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  signUp: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password);
      await updateProfile(cred.user, { displayName: username });
      await saveUserProfile(cred.user.uid, username);
      await registerUsername(cred.user.uid, username);
      set({ user: cred.user, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登録に失敗しました';
      let displayMsg = msg;
      if (msg.includes('email-already-in-use')) displayMsg = 'このユーザー名は既に使われています。\n「ログインに戻る」から既存アカウントでログインしてください。';
      else if (msg.includes('weak-password')) displayMsg = 'パスワードは6文字以上で設定してください。';
      else if (msg.includes('network')) displayMsg = 'ネットワークに接続できません。\n接続を確認してもう一度お試しください。';
      set({ loading: false, error: displayMsg });
    }
  },

  signIn: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, toEmail(username), password);
      await saveUserProfile(cred.user.uid, username);
      // 既存ユーザーでもusernamesコレクションに登録（検索用）
      await registerUsername(cred.user.uid, username).catch(() => {});
      set({ user: cred.user, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ログインに失敗しました';
      let displayMsg = msg;
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) displayMsg = 'ユーザー名またはパスワードが正しくありません。\n初めての方は「アカウントを作成する」から登録してください。';
      else if (msg.includes('wrong-password')) displayMsg = 'パスワードが正しくありません。\nもう一度確認して入力してください。';
      else if (msg.includes('too-many-requests')) displayMsg = 'ログイン試行回数が上限を超えました。\nしばらく待ってから再度お試しください。';
      else if (msg.includes('network')) displayMsg = 'ネットワークに接続できません。\n接続を確認してもう一度お試しください。';
      set({ loading: false, error: displayMsg });
    }
  },

  signInGuest: async () => {
    set({ loading: true, error: null });
    try {
      const cred = await signInAnonymously(auth);
      const guestName = `ゲスト${cred.user.uid.slice(0, 4)}`;
      await updateProfile(cred.user, { displayName: guestName });
      await saveUserProfile(cred.user.uid, guestName);
      set({ user: cred.user, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ゲストログインに失敗しました';
      let displayMsg = msg;
      if (msg.includes('operation-not-allowed')) displayMsg = 'ゲストログインは現在利用できません。\n「アカウントを作成する」から登録してお遊びください。';
      else if (msg.includes('network')) displayMsg = 'ネットワークに接続できません。\n接続を確認してもう一度お試しください。';
      set({ loading: false, error: displayMsg });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, initialized: true });
      // 既存ユーザーでもusernamesコレクションに自動登録（検索可能にする）
      if (user?.displayName) {
        registerUsername(user.uid, user.displayName).catch(() => {});
      }
    });
    return unsubscribe;
  },
}));
