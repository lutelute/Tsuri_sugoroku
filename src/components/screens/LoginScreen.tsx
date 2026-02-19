import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import Button from '../shared/Button';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const { signUp, signIn, signInGuest, loading, error, clearError } = useAuthStore();
  const setScreen = useGameStore(s => s.setScreen);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    if (mode === 'register') {
      await signUp(username.trim(), password);
    } else {
      await signIn(username.trim(), password);
    }
    // ログイン成功後、authStoreのuserが更新されるのでApp側でtitleに遷移
    if (useAuthStore.getState().user) {
      setScreen('title');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 select-none">
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-extrabold text-center mb-2">
          <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            {mode === 'login' ? 'ログイン' : '新規登録'}
          </span>
        </h2>
        <p className="text-sm text-white/50 text-center mb-6">
          データをクラウドに保存して、どの端末からでも遊べます
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-sm text-center whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-white/60 mb-1">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 outline-none focus:border-cyan-400 transition-colors"
              placeholder="ユーザー名を入力"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 outline-none focus:border-cyan-400 transition-colors"
              placeholder="パスワードを入力"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSubmit}
            variant="gold"
            size="lg"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full text-center"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
          </Button>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
            className="text-sm text-cyan-300/70 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {mode === 'login' ? 'アカウントを作成する' : 'ログインに戻る'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0f172a] px-3 text-white/30">または</span>
            </div>
          </div>

          <Button
            onClick={async () => {
              await signInGuest();
              if (useAuthStore.getState().user) setScreen('title');
            }}
            variant="secondary"
            size="md"
            disabled={loading}
            className="w-full text-center"
          >
            {loading ? '処理中...' : 'ゲストで遊ぶ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
