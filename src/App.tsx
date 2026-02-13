import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import TitleScreen from './components/screens/TitleScreen';
import SetupScreen from './components/screens/SetupScreen';
import GameScreen from './components/screens/GameScreen';
import ResultScreen from './components/screens/ResultScreen';
import LoginScreen from './components/screens/LoginScreen';

export default function App() {
  const screen = useGameStore(s => s.screen);
  const syncFromCloud = useGameStore(s => s.syncFromCloud);
  const init = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);

  // Firebase Auth リスナー初期化
  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  // ログイン状態変化時にクラウドからデータ同期
  useEffect(() => {
    if (initialized && user) {
      syncFromCloud();
    }
  }, [initialized, user, syncFromCloud]);

  // 認証初期化待ち
  if (!initialized) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white/50 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {screen === 'title' && <TitleScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
      {screen === 'login' && <LoginScreen />}
    </div>
  );
}
