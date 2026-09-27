import { lazy, Suspense, useEffect, useRef } from 'react';
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import TitleScreen from './components/screens/TitleScreen';
// タイトル以外は遅延読み込み（地図の海岸線データや釣りミニゲームを初回表示に含めない）
const SetupScreen = lazy(() => import('./components/screens/SetupScreen'));
const GameScreen = lazy(() => import('./components/screens/GameScreen'));
const ResultScreen = lazy(() => import('./components/screens/ResultScreen'));
const LoginScreen = lazy(() => import('./components/screens/LoginScreen'));
const CpuDriver = lazy(() => import('./components/cpu/CpuDriver'));

export default function App() {
  const screen = useGameStore(s => s.screen);
  const syncFromCloud = useGameStore(s => s.syncFromCloud);
  const clearUserData = useGameStore(s => s.clearUserData);
  const setScreen = useGameStore(s => s.setScreen);
  const init = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  const prevUidRef = useRef<string | null>(null);

  // Firebase Auth リスナー初期化
  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  // ユーザー切替時のデータ同期・リセット
  useEffect(() => {
    if (!initialized) return;
    const currentUid = user?.uid ?? null;
    const prevUid = prevUidRef.current;

    if (currentUid !== prevUid) {
      if (currentUid) {
        // ログイン → クラウドからそのユーザーのデータを読込
        syncFromCloud();
      } else if (prevUid) {
        // ログアウト → メモリ上のデータをクリアしてタイトルに戻る
        clearUserData();
        setScreen('title');
      }
      prevUidRef.current = currentUid;
    }
  }, [initialized, user, syncFromCloud, clearUserData, setScreen]);

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
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/50 text-sm">読み込み中...</div>}>
        {screen === 'title' && <TitleScreen />}
        {screen === 'setup' && <SetupScreen />}
        {screen === 'game' && <GameScreen />}
        {screen === 'game' && <CpuDriver />}
        {screen === 'result' && <ResultScreen />}
        {screen === 'login' && <LoginScreen />}
      </Suspense>
    </div>
  );
}
