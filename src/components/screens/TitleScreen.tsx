import { useState, useCallback, lazy, Suspense } from 'react';
import { useGameStore, hasSavedGame } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { loadUserEncyclopedia, resetUserEncyclopedia } from '../../lib/firestore';
import { loadEncyclopedia, saveEncyclopedia } from '../../utils/storage';
import { APP_VERSION, MODE_STORAGE_KEY } from '../../game/constants';
import { useSettingsStore } from '../../store/useSettingsStore';
import { FISH_ART_LABELS } from '../shared/fishArt/styles';
import { FISH_DATABASE } from '../../data/fishDatabase';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { TitleGuideControls } from '../guide/GuideButtons';
import { useGuideStore } from '../../store/useGuideStore';
import RankingOverlay from '../ranking/RankingOverlay';
import EncyclopediaOverlay from '../encyclopedia/EncyclopediaOverlay';
import UserListOverlay from '../users/UserListOverlay';
import DevPanel from '../dev/DevPanel';
import TitleHero from '../title/TitleHero';
import ModeCard from '../title/ModeCard';
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
  // 行き先のおすすめ（分かれ道の金の輪と理由の札）
  const adviceEnabled = useSettingsStore(s => s.adviceEnabled);
  const toggleAdvice = useSettingsStore(s => s.toggleAdvice);
  const fishArt = useSettingsStore(s => s.fishArt);
  const cycleFishArt = useSettingsStore(s => s.cycleFishArt);

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

  const pill = 'hr-pill text-[10px] min-[380px]:text-[11px] sm:text-xs px-1.5 min-[380px]:px-2 py-1 rounded-full bg-ai-900/60 border border-kin-500/30 text-washi/80 hover:text-washi hover:bg-ai-700/70 transition cursor-pointer whitespace-nowrap';
  const subBtn = 'hr-subbtn flex-1 min-h-14 py-2 rounded-xl bg-ai-900/85 border border-kin-500/35 text-sm text-washi/80 hover:bg-ai-700/70 hover:text-washi transition cursor-pointer flex flex-col items-center justify-center gap-1';

  return (
    <div className="hr-title relative h-full overflow-y-auto overflow-x-hidden select-none">
      <div className="hr-title-stage">
        <div className="hr-top">
          {/* 主役の一枚絵（朝日・日本列島の影・大波・はねる鯛） */}
          <TitleHero />

          <div className="hr-topbar">
            {/* ふりがな（ルビ）・効果音・行き先のおすすめの ON/OFF — 子供向け */}
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <button
                onClick={toggleFurigana}
                className={pill}
                title="ふりがなの表示を切り替え"
                aria-pressed={furiganaEnabled}
              >
                ふりがな {furiganaEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={toggleSound}
                className={`${pill} inline-flex items-center gap-1`}
                title="効果音を切り替え"
                aria-pressed={soundEnabled}
              >
                <SpeakerIcon on={soundEnabled} />
                おと {soundEnabled ? 'ON' : 'OFF'}
              </button>
              {soundEnabled && (
                <button
                  onClick={cycleVolume}
                  className="hr-pill text-xs w-7 h-7 rounded-full bg-ai-900/60 border border-kin-500/30 text-washi/80 hover:text-washi hover:bg-ai-700/70 transition cursor-pointer font-mincho"
                  title="効果音の大きさ（小・中・大）"
                  aria-label={`効果音の大きさ ${VOLUME_STEPS[volIdx].label}`}
                >
                  {VOLUME_STEPS[volIdx].label}
                </button>
              )}
              <button
                onClick={toggleAdvice}
                className={pill}
                title="分かれ道で、行き先のおすすめ（金の輪と理由）を出す・出さない"
                aria-pressed={adviceEnabled}
              >
                おすすめ {adviceEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={cycleFishArt}
                className={pill}
                title="魚の絵の描き方を切り替え（木版・描き分け・魚拓・もとの絵）"
              >
                <Ruby>{`魚の絵 ${FISH_ART_LABELS[fishArt]}`}</Ruby>
              </button>
            </div>

            {/* ユーザー情報 */}
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <>
                  <span className="text-sm text-washi/85 font-mincho max-w-[9em] truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{user.displayName ?? 'ユーザー'}</span>
                  <button onClick={signOut} className={pill}>
                    ログアウト
                  </button>
                </>
              ) : (
                <button onClick={() => setScreen('login')} className={`${pill} !text-kin-300`}>
                  ログイン
                </button>
              )}
            </div>
          </div>

          {/* 題字（絵として扱う。ふりがなは付けない） */}
          <header className="hr-head">
            <h1 className="hr-logo font-brush" aria-label="釣りすごろく">
              <span className="hr-logo-a animate-ink-rise" aria-hidden="true">釣り</span>
              <span className="hr-logo-b animate-ink-rise" aria-hidden="true" style={{ animationDelay: '0.14s' }}>すごろく</span>
              {/* 朱印 */}
              <span className="hr-logo-seal seal animate-seal-stamp font-mincho" aria-hidden="true" style={{ animationDelay: '0.6s' }}>
                <span>日本</span>
                <span>一周</span>
              </span>
            </h1>
            <p className="hr-sub font-mincho animate-ink-rise" style={{ animationDelay: '0.26s' }}>
              <Ruby>日本列島 釣り旅 ＆ まちづくり</Ruby>
            </p>
            <p className="hr-version">v{APP_VERSION}</p>
          </header>
        </div>

        {/* 遊び方の札と、そのほかの入り口 */}
        <div className="hr-menu">
          <p className="hr-pick font-mincho fx-rise" style={{ '--d': '250ms' } as React.CSSProperties}>
            <span><Ruby>あそびかたを選んでスタート</Ruby></span>
          </p>
          <div className="hr-modes">
            <ModeCard
              mode="fishing"
              title="釣り旅"
              desc={`魚${FISH_DATABASE.length}種を釣りながら、ゴールの那覇をめざす`}
              ariaLabel="釣り旅であそぶ"
              onClick={() => startWith('fishing')}
              cta
              delay={350}
            />
            <ModeCard
              mode="city"
              title="まちづくり"
              desc="町に建物を建てて育て、長者番付の頂点へ"
              ariaLabel="まちづくりであそぶ"
              onClick={() => startWith('city')}
              cta
              isNew
              delay={470}
            />
          </div>

          {savedExists && (
            <Button
              onClick={resumeGame}
              variant="secondary"
              size="lg"
              className="w-full mt-3 text-center font-mincho tracking-widest !bg-ai-900/70"
            >
              つづきから
            </Button>
          )}

          {/* サブボタン（遊び方・ランキング・図鑑・ユーザー一覧） */}
          <div className="flex gap-2.5 mt-4 w-full">
            <button onClick={() => openHowTo('fishing')} className={subBtn}>
              <Icon name="info" size={20} className="text-kin-300" /> <Ruby>遊び方</Ruby>
            </button>
            <button onClick={() => setShowRanking(true)} className={subBtn}>
              <Icon name="trophy" size={20} className="text-kin-300" /> <Ruby>番付</Ruby>
            </button>
            <button onClick={handleShowEncyclopedia} className={subBtn}>
              <Icon name="book" size={20} className="text-kin-300" /> <Ruby>図鑑</Ruby>
            </button>
            <button onClick={() => setShowUsers(true)} className={subBtn}>
              <Icon name="users" size={20} className="text-kin-300" /> <Ruby>釣り人</Ruby>
            </button>
          </div>

          {/* 案内役: 遊んでいる途中の指差し案内の ON/OFF と、はじめから */}
          <div className="hr-guide">
            <TitleGuideControls />
          </div>
        </div>

        {/* フッター */}
        <p className="hr-foot font-mincho">
          <Ruby>稚内から那覇まで、釣って・建てて・日本一へ</Ruby>
        </p>
      </div>

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
