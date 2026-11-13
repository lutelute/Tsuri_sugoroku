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
// 開発ビルドだけ: 街並みの絵の確かめ用の一覧（URL に ?gallery=town）
const TownSceneGallery = import.meta.env.DEV && new URLSearchParams(window.location.search).get('gallery') === 'town' ? lazy(() => import('./components/dev/TownSceneGallery')) : null;
// 開発ビルドだけ: 札・道具・祭り・温泉の絵の確かめ用の一覧（URL に ?gallery=art）
const ArtGallery = import.meta.env.DEV && new URLSearchParams(window.location.search).get('gallery') === 'art' ? lazy(() => import('./components/dev/ArtGallery')) : null;
// 開発ビルドだけ: 図鑑の魚 300 種の確かめ用の一覧（URL に ?gallery=fish）
const FishGallery = import.meta.env.DEV && new URLSearchParams(window.location.search).get('gallery') === 'fish' ? lazy(() => import('./components/dev/FishGallery')) : null;
// 開発ビルドだけ: めずらしさ別の札と台紙（URL に ?gallery=cards）
const CardGallery = import.meta.env.DEV && new URLSearchParams(window.location.search).get('gallery') === 'cards' ? lazy(() => import('./components/dev/CardGallery')) : null;

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

  if (TownSceneGallery) return <Suspense fallback={null}><TownSceneGallery /></Suspense>;
  if (ArtGallery) return <Suspense fallback={null}><ArtGallery /></Suspense>;
  if (FishGallery) return <Suspense fallback={null}><FishGallery /></Suspense>;
  if (CardGallery) return <Suspense fallback={null}><CardGallery /></Suspense>;

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
