import { useState, useCallback } from 'react';
import { useGameStore, hasSavedGame } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { loadUserEncyclopedia, resetUserEncyclopedia } from '../../lib/firestore';
import { loadEncyclopedia, saveEncyclopedia } from '../../utils/storage';
import { APP_VERSION } from '../../game/constants';
import { useSettingsStore } from '../../store/useSettingsStore';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import RankingOverlay from '../ranking/RankingOverlay';
import EncyclopediaOverlay from '../encyclopedia/EncyclopediaOverlay';
import UserListOverlay from '../users/UserListOverlay';

export default function TitleScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const resumeGame = useGameStore(s => s.resumeGame);
  const savedExists = hasSavedGame();

  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const furiganaEnabled = useSettingsStore(s => s.furiganaEnabled);
  const toggleFurigana = useSettingsStore(s => s.toggleFurigana);

  const [showRanking, setShowRanking] = useState(false);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [titleEncyclopedia, setTitleEncyclopedia] = useState<Record<string, boolean>>({});

  const handleShowEncyclopedia = useCallback(async () => {
    if (user) {
      try {
        const enc = await loadUserEncyclopedia(user.uid);
        setTitleEncyclopedia(enc);
      } catch {
        setTitleEncyclopedia({});
      }
    } else {
      setTitleEncyclopedia(loadEncyclopedia());
    }
    setShowEncyclopedia(true);
  }, [user]);

  const handleResetEncyclopedia = useCallback(async () => {
    if (user) {
      await resetUserEncyclopedia(user.uid).catch(() => {});
    } else {
      saveEncyclopedia({});
    }
  }, [user]);

  if (showRanking) return <RankingOverlay onClose={() => setShowRanking(false)} />;
  if (showEncyclopedia) return <EncyclopediaOverlay onClose={() => setShowEncyclopedia(false)} standaloneEncyclopedia={titleEncyclopedia} onReset={handleResetEncyclopedia} />;
  if (showUsers) return <UserListOverlay onClose={() => setShowUsers(false)} />;

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-4 select-none">
      {/* ふりがな（ルビ）ON/OFF — 子供向け */}
      <button
        onClick={toggleFurigana}
        className="absolute top-4 left-4 text-xs px-2.5 py-1 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/70 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer z-10"
        title="ふりがなの表示を切り替え"
        aria-pressed={furiganaEnabled}
      >
        ふりがな {furiganaEnabled ? 'ON' : 'OFF'}
      </button>

      {/* ユーザー情報 */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-washi/65 font-mincho">{user.displayName ?? 'ユーザー'}</span>
            <button
              onClick={signOut}
              className="text-xs text-washi/40 hover:text-washi/75 transition-colors cursor-pointer"
            >
              ログアウト
            </button>
          </>
        ) : (
          <button
            onClick={() => setScreen('login')}
            className="text-sm text-kin-300/80 hover:text-kin-300 transition-colors cursor-pointer"
          >
            ログイン
          </button>
        )}
      </div>

      {/* タイトルロゴ */}
      <div className="mb-9 text-center">
        <div className="text-5xl mb-4 animate-float-y">🎣</div>
        <div className="relative inline-block">
          <h1
            className="font-brush text-6xl sm:text-7xl text-washi leading-none animate-ink-rise"
            style={{ textShadow: '0 6px 22px rgba(0,0,0,0.55)' }}
          >
            <Ruby>釣りすごろく</Ruby>
          </h1>
          {/* 朱印 */}
          <span
            className="seal animate-seal-stamp font-mincho absolute -right-4 -bottom-4 w-12 h-12 rounded-md text-[10px] leading-[1.05] font-bold flex-col"
            style={{ animationDelay: '0.55s' }}
          >
            <span><Ruby>日本</Ruby></span>
            <span><Ruby>一周</Ruby></span>
          </span>
        </div>
        <p className="font-mincho text-base text-kin-300/90 mt-6 tracking-[0.32em] animate-ink-rise" style={{ animationDelay: '0.15s' }}>
          <Ruby>日本列島 釣り旅</Ruby>
        </p>
        <p className="text-xs text-washi/30 mt-1">v{APP_VERSION}</p>
      </div>

      {/* 波のアニメーション（金の波文） */}
      <div className="w-full max-w-md mb-12 opacity-40 text-kin-400">
        <svg viewBox="0 0 400 40" className="w-full">
          <path
            d="M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values="
                M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20;
                M0,20 Q50,40 100,20 Q150,0 200,20 Q250,40 300,20 Q350,0 400,20;
                M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20
              "
            />
          </path>
        </svg>
      </div>

      {/* メインボタン */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          onClick={() => setScreen('setup')}
          variant="gold"
          size="lg"
          className="w-full text-center font-mincho tracking-widest"
        >
          ゲームスタート
        </Button>
        {savedExists && (
          <Button
            onClick={resumeGame}
            variant="secondary"
            size="lg"
            className="w-full text-center font-mincho tracking-widest"
          >
            つづきから
          </Button>
        )}
      </div>

      {/* サブボタン（ランキング・図鑑・ユーザー一覧） */}
      <div className="flex gap-3 mt-6 w-full max-w-xs">
        <button
          onClick={() => setShowRanking(true)}
          className="flex-1 py-2.5 rounded-xl bg-ai-800/50 border border-kin-500/25 text-sm text-washi/75 hover:bg-ai-700/60 hover:text-washi transition cursor-pointer flex flex-col items-center gap-1"
        >
          <Icon name="trophy" size={20} className="text-kin-300" /> <Ruby>番付</Ruby>
        </button>
        <button
          onClick={handleShowEncyclopedia}
          className="flex-1 py-2.5 rounded-xl bg-ai-800/50 border border-kin-500/25 text-sm text-washi/75 hover:bg-ai-700/60 hover:text-washi transition cursor-pointer flex flex-col items-center gap-1"
        >
          <Icon name="book" size={20} className="text-kin-300" /> <Ruby>図鑑</Ruby>
        </button>
        <button
          onClick={() => setShowUsers(true)}
          className="flex-1 py-2.5 rounded-xl bg-ai-800/50 border border-kin-500/25 text-sm text-washi/75 hover:bg-ai-700/60 hover:text-washi transition cursor-pointer flex flex-col items-center gap-1"
        >
          <Icon name="users" size={20} className="text-kin-300" /> <Ruby>釣り人</Ruby>
        </button>
      </div>

      {/* フッター */}
      <p className="absolute bottom-4 text-xs text-washi/35 font-mincho tracking-wider">
        <Ruby>稚内から那覇まで、日本の魚を釣り尽くせ</Ruby>
      </p>
    </div>
  );
}
