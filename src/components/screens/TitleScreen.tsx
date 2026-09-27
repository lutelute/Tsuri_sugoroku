import { useState, useCallback, lazy, Suspense } from 'react';
import { useGameStore, hasSavedGame } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { loadUserEncyclopedia, resetUserEncyclopedia } from '../../lib/firestore';
import { loadEncyclopedia, saveEncyclopedia } from '../../utils/storage';
import { APP_VERSION, MODE_STORAGE_KEY } from '../../game/constants';
import { useSettingsStore } from '../../store/useSettingsStore';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { TitleGuideControls } from '../guide/GuideButtons';
import { useGuideStore } from '../../store/useGuideStore';
import RankingOverlay from '../ranking/RankingOverlay';
import EncyclopediaOverlay from '../encyclopedia/EncyclopediaOverlay';
import UserListOverlay from '../users/UserListOverlay';
import DevPanel from '../dev/DevPanel';
import Stamp from '../fx/Stamp';
import { playChime } from '../../utils/sound';

/** 音量の3段階（既定は「小」＝控えめ） */
const VOLUME_STEPS = [
  { label: '小', value: 0.3 },
  { label: '中', value: 0.55 },
  { label: '大', value: 0.85 },
];
function volumeStepIndex(v: number): number {
  let best = 0;
  VOLUME_STEPS.forEach((st, i) => {
    if (Math.abs(st.value - v) < Math.abs(VOLUME_STEPS[best].value - v)) best = i;
  });
  return best;
}

/** スピーカーの小さな絵（OFF は斜線） */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d="M4 9h4l5-4v14l-5-4H4Z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

// 設定画面（SetupScreen）が初期モードを読むキー。タイトルで選んだ遊び方をそのまま引き継ぐ。
type TitleMode = 'fishing' | 'city';

/** 釣り旅の絵: 朝日・波・跳ねる魚と竿 */
function FishingArt() {
  return (
    <svg viewBox="0 0 120 64" className="w-full h-16" aria-hidden="true">
      <circle cx="96" cy="16" r="10" fill="#e34a33" opacity="0.9" />
      <path d="M6 62 Q30 30 60 8" fill="none" stroke="#b8862f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 8 Q66 26 76 40" fill="none" stroke="#f4ecd8" strokeWidth="0.8" opacity="0.8" />
      <path d="M70 42 q9 -9 20 -2 l7 -5 v12 l-7 -5 q-11 7 -20 0 z" fill="#f1d893" stroke="#9a6f24" strokeWidth="0.8" />
      <circle cx="75" cy="40" r="1.1" fill="#1a1510" />
      <path d="M0 64 V54 Q10 46 20 54 T40 54 T60 54 T80 54 T100 54 T120 54 V64 Z" fill="#24496e" />
      <path d="M0 54 Q10 46 20 54 T40 54 T60 54 T80 54 T100 54 T120 54" fill="none" stroke="#7fa9cd" strokeWidth="1.6" />
      <path d="M8 60 Q14 56 20 60 M48 60 Q54 56 60 60 M88 60 Q94 56 100 60" fill="none" stroke="#7fa9cd" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** まちづくりの絵: 家・商店・ビル・工場・発電所・公園の町並み */
function CityArt() {
  return (
    <svg viewBox="0 0 120 64" className="w-full h-16" aria-hidden="true">
      <circle cx="18" cy="14" r="7" fill="#f1d893" opacity="0.85" />
      {/* 家 */}
      <path d="M6 54 V40 L15 32 L24 40 V54 Z" fill="#e6c266" stroke="#1a1510" strokeWidth="1" strokeLinejoin="round" />
      <rect x="12.5" y="45" width="5" height="9" fill="#1a1510" opacity="0.55" />
      {/* 商店（のれん） */}
      <rect x="27" y="38" width="18" height="16" fill="#e34a33" stroke="#1a1510" strokeWidth="1" />
      <path d="M26 38 h20 l-2 4 h-16 Z" fill="#f4ecd8" stroke="#1a1510" strokeWidth="0.8" />
      {/* ビル */}
      <rect x="48" y="16" width="16" height="38" fill="#4a7faf" stroke="#1a1510" strokeWidth="1" />
      <path d="M52 22h3M58 22h3M52 28h3M58 28h3M52 34h3M58 34h3M52 40h3M58 40h3" stroke="#f4ecd8" strokeWidth="1.6" opacity="0.85" />
      {/* 工場と煙 */}
      <path d="M67 54 V44 l7 4 v-4 l7 4 v-4 l7 4 V54 Z" fill="#8a7a64" stroke="#1a1510" strokeWidth="1" strokeLinejoin="round" />
      <rect x="84" y="30" width="4" height="16" fill="#6b5a44" stroke="#1a1510" strokeWidth="0.8" />
      <circle cx="87" cy="25" r="3" fill="#d8c79e" opacity="0.7" />
      <circle cx="91" cy="19" r="4" fill="#d8c79e" opacity="0.5" />
      {/* 発電所（冷却塔） */}
      <path d="M94 54 Q96 44 95 36 H105 Q104 44 106 54 Z" fill="#7fa9cd" stroke="#1a1510" strokeWidth="1" />
      {/* 公園の木 */}
      <rect x="111.5" y="46" width="2" height="8" fill="#6b4a2a" />
      <circle cx="112.5" cy="43" r="5" fill="#2f9e6e" stroke="#1a1510" strokeWidth="0.8" />
      <path d="M0 54 H120 V64 H0 Z" fill="#15314f" />
      <path d="M0 54 H120" stroke="#d4a843" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

// 遊び方の画面は開いたときに読み込む（図解が町や地図のデータを使うので、タイトルの初回表示に含めない）
const HowToPlayOverlay = lazy(() => import('../guide/HowToPlayOverlay'));

export default function TitleScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const openHowTo = useGuideStore(s => s.openHowTo);
  const howToOpen = useGuideStore(s => s.howTo !== null);
  const resumeGame = useGameStore(s => s.resumeGame);
  const savedExists = hasSavedGame();

  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const furiganaEnabled = useSettingsStore(s => s.furiganaEnabled);
  const toggleFurigana = useSettingsStore(s => s.toggleFurigana);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const soundVolume = useSettingsStore(s => s.soundVolume);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setSoundVolume = useSettingsStore(s => s.setSoundVolume);
  const volIdx = volumeStepIndex(soundVolume);

  // 音を入れたら・音量を変えたら、りんを一打して聞かせる（押した操作で音が解禁される）
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playChime();
  };
  const cycleVolume = () => {
    setSoundVolume(VOLUME_STEPS[(volIdx + 1) % VOLUME_STEPS.length].value);
    playChime();
  };

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

  // 遊び方を選んで設定画面へ（設定画面の初期モードに反映される）
  const startWith = (mode: TitleMode) => {
    try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch { /* 保存できなくても設定画面で選べる */ }
    setScreen('setup');
  };

  if (showRanking) return <RankingOverlay onClose={() => setShowRanking(false)} />;
  if (showEncyclopedia) return <EncyclopediaOverlay onClose={() => setShowEncyclopedia(false)} standaloneEncyclopedia={titleEncyclopedia} onReset={handleResetEncyclopedia} />;
  if (showUsers) return <UserListOverlay onClose={() => setShowUsers(false)} />;

  return (
    <div className="relative flex flex-col items-center justify-center-safe h-full px-4 pt-14 pb-12 overflow-y-auto select-none">
      {/* ふりがな（ルビ）・効果音の ON/OFF — 子供向け */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
        <button
          onClick={toggleFurigana}
          className="text-xs px-2.5 py-1 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/70 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer"
          title="ふりがなの表示を切り替え"
          aria-pressed={furiganaEnabled}
        >
          ふりがな {furiganaEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={toggleSound}
          className="text-xs px-2.5 py-1 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/70 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer inline-flex items-center gap-1"
          title="効果音を切り替え"
          aria-pressed={soundEnabled}
        >
          <SpeakerIcon on={soundEnabled} />
          おと {soundEnabled ? 'ON' : 'OFF'}
        </button>
        {soundEnabled && (
          <button
            onClick={cycleVolume}
            className="text-xs w-7 h-7 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/70 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer font-mincho"
            title="効果音の大きさ（小・中・大）"
            aria-label={`効果音の大きさ ${VOLUME_STEPS[volIdx].label}`}
          >
            {VOLUME_STEPS[volIdx].label}
          </button>
        )}
      </div>

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
      <div className="mb-6 text-center">
        <div className="relative inline-block mt-6">
          {/* 朝日（日輪）: 一度だけ昇る */}
          <span
            aria-hidden="true"
            className="fx-pop absolute -top-6 right-2 w-24 h-24 rounded-full"
            style={{ background: 'radial-gradient(circle at 40% 35%, #ef6a52, #c63a26 70%, #a92e1d)', opacity: 0.85, boxShadow: '0 0 40px rgba(227,74,51,0.45)' }}
          />
          <h1
            className="relative font-brush text-6xl sm:text-7xl text-washi leading-none animate-ink-rise"
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
        <p className="font-mincho text-base text-kin-300/90 mt-6 tracking-[0.28em] animate-ink-rise" style={{ animationDelay: '0.15s' }}>
          <Ruby>日本列島 釣り旅 ＆ まちづくり</Ruby>
        </p>
        <p className="text-xs text-washi/30 mt-1">v{APP_VERSION}</p>
      </div>

      {/* 金の波文（一度だけ筆で引くように描く） */}
      <div className="w-full max-w-sm mb-3 opacity-45 text-kin-400" aria-hidden="true">
        <svg viewBox="0 0 400 40" className="w-full">
          <path
            className="fx-draw"
            pathLength={1}
            d="M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* メインボタン */}
      <p className="font-mincho text-xs text-washi/55 tracking-[0.3em] mb-2 fx-rise" style={{ '--d': '250ms' } as React.CSSProperties}>
        <Ruby>あそびかたを選んでスタート</Ruby>
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {([
          { mode: 'fishing' as TitleMode, title: '釣り旅', desc: '魚300種を釣りながら、ゴールの那覇をめざす', art: <FishingArt />, isNew: false },
          { mode: 'city' as TitleMode, title: 'まちづくり', desc: '町に建物を建てて育て、長者番付の頂点へ', art: <CityArt />, isNew: true },
        ]).map((o, i) => (
          <button
            key={o.mode}
            onClick={() => startWith(o.mode)}
            className="fx-mode-card fx-rise relative text-left rounded-2xl overflow-visible bg-ai-800/60 hover:bg-ai-700/70 border border-kin-500/35 hover:border-kin-400/70 shadow-xl cursor-pointer p-2.5 pb-3"
            style={{ '--d': `${350 + i * 120}ms` } as React.CSSProperties}
            aria-label={`${o.title}であそぶ`}
          >
            {o.isNew && (
              <span className="absolute -top-2.5 -right-2 z-10">
                <Stamp tone="shu" size={30} delay={1100} tilt={12} silent>新</Stamp>
              </span>
            )}
            <span className="block rounded-xl overflow-hidden border border-kin-500/20 bg-ai-900/50">{o.art}</span>
            <span className="block font-brush text-2xl text-washi mt-1.5 leading-tight"><Ruby>{o.title}</Ruby></span>
            <span className="block text-[11px] text-washi/60 leading-snug mt-0.5 min-h-[2.6em]"><Ruby>{o.desc}</Ruby></span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#3a2a0e] bg-gradient-to-b from-kin-300 to-kin-600 rounded-full px-3 py-1 font-mincho tracking-widest">
              <Ruby>あそぶ</Ruby> ›
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
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

      {/* サブボタン（遊び方・ランキング・図鑑・ユーザー一覧） */}
      <div className="flex gap-3 mt-5 w-full max-w-xs">
        <button
          onClick={() => openHowTo('fishing')}
          className="flex-1 py-2.5 rounded-xl bg-ai-800/50 border border-kin-500/25 text-sm text-washi/75 hover:bg-ai-700/60 hover:text-washi transition cursor-pointer flex flex-col items-center gap-1"
        >
          <Icon name="info" size={20} className="text-kin-300" /> <Ruby>遊び方</Ruby>
        </button>
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

      {/* 案内役: 遊んでいる途中の指差し案内の ON/OFF と、はじめから */}
      <TitleGuideControls />

      {/* フッター */}
      <p className="absolute bottom-4 text-xs text-washi/35 font-mincho tracking-wider">
        <Ruby>稚内から那覇まで、釣って・建てて・日本一へ</Ruby>
      </p>

      {/* 開発用チートパネル（DEVビルドのみ） */}
      {import.meta.env.DEV && <DevPanel />}

      {howToOpen && (
        <Suspense fallback={null}>
          <HowToPlayOverlay />
        </Suspense>
      )}
    </div>
  );
}
