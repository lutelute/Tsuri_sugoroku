import { useState, useEffect, useEffectEvent, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { Fish, FishRarity, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel } from '../../game/fishing';
import type { FailReason } from './miniGameMeta';
import { HEAD_START_PROGRESS } from './reelSim';
import { useFinish } from './useFinish';
import { buzz, HAPTIC } from './haptics';
import { playBite, playHit, playNibble, playTap } from '../../utils/sound';
import { Bobber, Ripple, Splash, SplashCrown } from './FishingScene';
import { StageAnchor, StageScope } from './scene/FishingStage';
import { SurfaceRig } from './scene/Angler';
import { GaugeLabel, ProgressGauge } from './scene/Gauges';
import MiniGameIntro from './MiniGameIntro';
import FinishFlash from './FinishFlash';
import Ruby from '../shared/Ruby';

// ===== 難易度（ミニゲーム係） =====
/** 基本ラウンド数（リールが良いと増える） */
const ROUNDS: Record<FishRarity, number> = { common: 6, uncommon: 6, rare: 5, legendary: 5, mythical: 5 };
/** 1ラウンドの最大進捗（大物ほど1回で寄せられる量が少ない） */
const PER_ROUND: Record<FishRarity, number> = { common: 34, uncommon: 30, rare: 26, legendary: 22, mythical: 19 };
/** 1ラウンド中の「ピクッ（フェイント）」の最大回数 */
const FAKES_MAX: Record<FishRarity, number> = { common: 0, uncommon: 1, rare: 1, legendary: 2, mythical: 2 };
/** 反応の評価幅（ms）。竿（strike）で広がる */
const BASE_THRESHOLD_MS = 700;
const THRESHOLD_PER_ROD_LEVEL = 90;
/** これより速い反応は満点 */
const INSTANT_MS = 150;
/** 沈んでから押さなかった場合、評価幅＋この時間でそのラウンドは終わり */
const READY_GRACE_MS = 500;
/** お手つきで進捗がこの割合に減る */
const FOUL_KEEP = 0.75;
const BEST_KEY = 'tsuri_best_reaction_ms';

type RoundState = 'waiting' | 'ready' | 'result' | 'foul';
type Grade = 'great' | 'fast' | 'ok' | 'slow' | 'foul';

const GRADE_TEXT: Record<Grade, { text: string; className: string }> = {
  great: { text: 'いなずま！', className: 'text-kin-300' },
  fast: { text: '速い！', className: 'text-kin-300' },
  ok: { text: 'よし', className: 'text-washi' },
  slow: { text: '遅い…', className: 'text-washi/60' },
  foul: { text: 'お手つき！', className: 'text-shu-400' },
};

function gradeOf(ms: number): Grade {
  if (ms < 250) return 'great';
  if (ms < 400) return 'fast';
  if (ms < 600) return 'ok';
  return 'slow';
}

function loadBest(): number | null {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

interface ReactionPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  /** 会心の合わせのボーナス（イベントファイトでは無し） */
  headStart?: boolean;
  onSuccess: () => void;
  onFail: (reason: FailReason) => void;
}

/** 早合わせ: 浮きが「沈んだ瞬間」にタップ。ピクッ（フェイント）で押すとお手つき。 */
export default function ReactionPhase(props: ReactionPhaseProps) {
  return <StageScope><ReactionGame {...props} /></StageScope>;
}

function ReactionGame({ fish, equipment, headStart = false, onSuccess, onFail }: ReactionPhaseProps) {
  // 装備効果: 竿=評価幅が広い / リール=ラウンド追加 / ルアー=1回の寄せ量アップ
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'reeling');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const threshold = BASE_THRESHOLD_MS + Math.max(0, rodLevel - 1) * THRESHOLD_PER_ROD_LEVEL;
  const totalRounds = ROUNDS[fish.rarity] + Math.floor(Math.max(0, reelLevel - 1) * 0.5);
  const perRound = PER_ROUND[fish.rarity] * (1 + Math.max(0, lureLevel - 1) * 0.12);
  const fakesMax = FAKES_MAX[fish.rarity];

  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(1);
  /** お手つきで同じラウンドをやり直すたびに増える（ラウンドの effect を再起動する鍵） */
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(headStart ? HEAD_START_PROGRESS : 0);
  const [roundState, setRoundState] = useState<RoundState>('waiting');
  const [fakeSeq, setFakeSeq] = useState(0);
  const [last, setLast] = useState<{ grade: Grade; ms: number | null; gained: number } | null>(null);
  const [history, setHistory] = useState<Grade[]>([]);
  const [best, setBest] = useState<number | null>(loadBest);
  const [newRecord, setNewRecord] = useState(false);
  const { finished, finish, isDone } = useFinish(onSuccess, onFail);
  const color = useGameStore(st => st.players[st.currentPlayerIndex]?.color ?? '#e34a33');

  const stateRef = useRef<RoundState>('waiting');
  const progressRef = useRef(headStart ? HEAD_START_PROGRESS : 0);
  const readyAtRef = useRef(0);
  const afterRef = useRef<number | null>(null);
  /** 進行中ラウンドのタイマー（お手つき時に即座に止める） */
  const roundTimersRef = useRef<number[]>([]);

  const setState = (s: RoundState) => {
    stateRef.current = s;
    setRoundState(s);
  };

  // 結果表示後の「次へ」タイマーはアンマウントで解除
  useEffect(() => () => {
    if (afterRef.current !== null) clearTimeout(afterRef.current);
  }, []);

  /** ラウンドの結果を確定し、少し見せてから次のラウンド or 終了 */
  const resolveRound = (grade: Grade, ms: number | null, gained: number) => {
    roundTimersRef.current.forEach(id => clearTimeout(id));
    setState('result');
    const next = Math.min(100, progressRef.current + gained);
    progressRef.current = next;
    setProgress(next);
    setLast({ grade, ms, gained });
    setHistory(h => [...h, grade]);
    afterRef.current = window.setTimeout(() => {
      if (isDone()) return;
      if (progressRef.current >= 100) {
        finish(true);
      } else if (round >= totalRounds) {
        finish(false, 'short');
      } else {
        setState('waiting');
        setRound(round + 1);
      }
    }, 900);
  };

  const onSlow = useEffectEvent(() => {
    if (stateRef.current === 'ready') resolveRound('slow', null, 0);
  });
  const onReady = useEffectEvent(() => {
    if (stateRef.current !== 'waiting' || isDone()) return;
    readyAtRef.current = performance.now();
    setState('ready');
    buzz(HAPTIC.bite);
    playBite();
  });

  // 1ラウンド: 待ち（フェイント数回）→ 沈む → 押す or 時間切れ
  useEffect(() => {
    if (!started) return;
    const timers: number[] = [];
    const wait = 1400 + Math.random() * 2000;
    const fakes = Math.floor(Math.random() * (fakesMax + 1));
    for (let i = 0; i < fakes; i++) {
      const at = 400 + Math.random() * Math.max(200, wait - 800);
      timers.push(window.setTimeout(() => {
        if (stateRef.current !== 'waiting') return;
        setFakeSeq(n => n + 1);
        buzz(HAPTIC.nibble);
        playNibble();
      }, at));
    }
    timers.push(window.setTimeout(() => onReady(), wait));
    timers.push(window.setTimeout(() => onSlow(), wait + threshold + READY_GRACE_MS));
    roundTimersRef.current = timers;
    return () => timers.forEach(id => clearTimeout(id));
  }, [started, round, attempt, fakesMax, threshold]);

  const handleTap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!started || isDone()) return;
    const s = stateRef.current;
    if (s === 'waiting') {
      // お手つき: 寄せが減り、同じラウンドをやり直し（このラウンドの「沈む」予定は取り消す）
      roundTimersRef.current.forEach(id => clearTimeout(id));
      setState('foul');
      buzz(HAPTIC.miss);
      playTap();
      const kept = Math.floor(progressRef.current * FOUL_KEEP);
      progressRef.current = kept;
      setProgress(kept);
      setLast({ grade: 'foul', ms: null, gained: 0 });
      setHistory(h => [...h, 'foul']);
      afterRef.current = window.setTimeout(() => {
        setState('waiting');
        setAttempt(a => a + 1);
      }, 1200);
      return;
    }
    if (s === 'ready') {
      const rt = Math.round(performance.now() - readyAtRef.current);
      const ratio = Math.max(0, Math.min(1, 1 - Math.max(0, rt - INSTANT_MS) / threshold));
      const gained = Math.round(perRound * ratio);
      buzz(HAPTIC.hook);
      playHit(round * 2, ratio >= 0.5);
      if (best === null || rt < best) {
        setBest(rt);
        setNewRecord(true);
        try { localStorage.setItem(BEST_KEY, String(rt)); } catch { /* 保存できない環境 */ }
      }
      resolveRound(gradeOf(rt), rt, gained);
    }
  };

  const grade = last ? GRADE_TEXT[last.grade] : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center px-4 pb-4 pt-2 fg-touch cursor-pointer" onPointerDown={handleTap}>
      <div className="relative z-[1] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex items-center justify-between h-12 shrink-0">
        <p className="um-ink font-mincho text-xl sm:text-2xl font-bold text-washi"><Ruby>早合わせ</Ruby></p>
        <span className="um-pill">
          {round}/{totalRounds} <Ruby>回</Ruby>
        </span>
      </div>

      {/* 寄せ */}
      <div className="relative z-[1] w-full max-w-md md:max-w-3xl lg:max-w-5xl shrink-0">
        <GaugeLabel left="寄せ" right={`${Math.round(progress)}%`} />
        <ProgressGauge ratio={progress / 100} smooth />
      </div>

      {/* 水面と浮き（窓のまん中が水面） */}
      <div className={`um-window um-bob-lg w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-1 min-h-[220px] mt-3 ${roundState === 'ready' ? 'is-ready' : ''}`}>
        <StageAnchor surface={0.5} offset={6} />
        <SurfaceRig color={color} state={roundState === 'ready' ? 'bite' : 'idle'} surface={0.5} compact bigBobber />
        {roundState === 'ready' && <div className="absolute inset-0 bg-shu-500/15" />}
        <div className="absolute left-1/2 top-1/2 w-0 h-0">
          <div className="absolute left-0 top-[6px] w-0 h-0">
            {roundState === 'ready' && (
              <>
                <Ripple size={170} flat />
                <Ripple size={260} delay={120} flat />
                <SplashCrown size={110} />
                <Splash count={8} distance={56} spread={150} />
              </>
            )}
            {roundState === 'waiting' && fakeSeq > 0 && <Ripple key={`f${fakeSeq}`} size={96} flat />}
          </div>
          <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[55%]">
            <Bobber state={roundState === 'ready' ? 'sink' : 'idle'} nibbleKey={fakeSeq} />
          </div>
        </div>
        {roundState === 'ready' && (
          <p className="um-ink absolute top-[10%] inset-x-0 text-center fg-pop font-brush text-5xl sm:text-6xl text-shu-400"><Ruby>今！</Ruby></p>
        )}
        {roundState === 'waiting' && (
          <p className="um-ink absolute top-[10%] inset-x-0 text-center text-washi/90 text-sm sm:text-base"><Ruby>じっと待って…</Ruby></p>
        )}
        {(roundState === 'result' || roundState === 'foul') && grade && last && (
          <div key={history.length} className="um-ink absolute top-[8%] inset-x-0 text-center fg-pop">
            <p className={`font-mincho text-3xl sm:text-4xl font-bold ${grade.className}`}><Ruby>{grade.text}</Ruby></p>
            <p className="text-sm text-washi/90 mt-1 tabular-nums">
              {last.ms !== null ? `${last.ms}ms ・ ` : ''}
              {last.grade === 'foul' ? <Ruby>寄せが減った…</Ruby> : `+${last.gained}%`}
            </p>
          </div>
        )}
      </div>

      {/* 記録: これまでの反応と自己ベスト（上達が見える） */}
      <div className="relative z-[1] w-full max-w-md md:max-w-3xl lg:max-w-5xl mt-3 flex items-center justify-between shrink-0">
        <div className="flex gap-1.5">
          {history.map((g, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ring-1 ring-ai-950/60 ${g === 'great' ? 'bg-kin-300' : g === 'fast' ? 'bg-kin-500' : g === 'ok' ? 'bg-ai-200' : g === 'slow' ? 'bg-ai-400' : 'bg-shu-500'}`}
            />
          ))}
        </div>
        <span className={`text-xs tabular-nums ${newRecord ? 'text-kin-300 font-bold' : 'text-washi/70'}`}>
          {newRecord && <Ruby>新記録！</Ruby>} <Ruby>自己ベスト</Ruby> {best !== null ? `${best}ms` : '—'}
        </span>
      </div>
      <p className="relative z-[1] text-xs text-washi/70 mt-2 shrink-0 fg-tall-only"><Ruby>ピクッではなく、沈んだ瞬間にタップ</Ruby></p>

      {!started && (
        <MiniGameIntro game="reaction" bonusText={headStart ? `会心の合わせ: 寄せ +${HEAD_START_PROGRESS}%` : undefined} onDone={() => setStarted(true)} />
      )}
      {finished && <FinishFlash state={finished} fishId={fish.id} rarity={fish.rarity} />}
    </div>
  );
}
