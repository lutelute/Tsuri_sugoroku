import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const { signUp, signIn, signInGuest, loading, error, clearError } = useAuthStore();
  const setScreen = useGameStore(s => s.setScreen);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    const success = mode === 'register'
      ? await signUp(username.trim(), password)
      : await signIn(username.trim(), password);
    if (success) setScreen('title');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 select-none">
      <div className="panel-ai w-full max-w-sm p-6">
        <div className="flex flex-col items-center mb-2">
          <span className="seal mb-3 flex items-center justify-center w-12 h-12 rounded-full">
            <Icon name="login" size={26} className="text-shu-400" />
          </span>
          <h2 className="text-3xl font-mincho text-kin-300 text-center ink-underline">
            <Ruby>{mode === 'login' ? 'ログイン' : '新規登録'}</Ruby>
          </h2>
        </div>
        <p className="text-sm text-washi/50 text-center mb-6 mt-3">
          <Ruby>データをクラウドに保存して、どの端末からでも遊べます</Ruby>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-shu-500/20 border border-shu-500/30 text-shu-400 text-sm text-center whitespace-pre-line">
            <Ruby>{error}</Ruby>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-mincho text-washi/70 mb-1">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl bg-ai-900/50 border border-kin-500/30 text-washi placeholder-washi/30 outline-none focus:border-kin-400 transition-colors"
              placeholder="ユーザー名を入力"
            />
          </div>
          <div>
            <label className="block text-sm font-mincho text-washi/70 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="w-full px-4 py-3 rounded-xl bg-ai-900/50 border border-kin-500/30 text-washi placeholder-washi/30 outline-none focus:border-kin-400 transition-colors"
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
            className="w-full flex items-center justify-center gap-2"
          >
            <Icon name="login" size={20} />
            <Ruby>{loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}</Ruby>
          </Button>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
            className="text-sm font-mincho text-kin-300/70 hover:text-kin-300 transition-colors cursor-pointer"
          >
            <Ruby>{mode === 'login' ? 'アカウントを作成する' : 'ログインに戻る'}</Ruby>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-kin-500/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="panel-ai px-3 py-0.5 rounded-full text-washi/40"><Ruby>または</Ruby></span>
            </div>
          </div>

          <Button
            onClick={async () => {
              const ok = await signInGuest();
              if (ok) setScreen('title');
            }}
            variant="secondary"
            size="md"
            disabled={loading}
            className="w-full text-center"
          >
            <Ruby>{loading ? '処理中...' : 'ゲストで遊ぶ'}</Ruby>
          </Button>
        </div>
      </div>
    </div>
  );
}
