import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { Fish, PlayerEquipment } from '../../game/types';
import { buildReelParams, createReelState, stepReel, HEAD_START_PROGRESS } from './reelSim';
import type { FishMood, ReelResult } from './reelSim';
import { SIZE_CLASS_PX } from './miniGameMeta';
import type { FailReason } from './miniGameMeta';
import { useFinish } from './useFinish';
import { buzz, HAPTIC } from './haptics';
import { playReelTick, playSplash, playTension } from '../../utils/sound';
import { Ripple } from './FishingScene';
import MiniGameIntro from './MiniGameIntro';
import FinishFlash from './FinishFlash';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';

/** テンション比がこれ以上で「危ない」（赤・振動） */
const DANGER = 0.85;
/** テンション比がこれ以上で「注意」（金） */
const CAUTION = 0.6;
/** 危ない時の振動間隔（ms） */
const DANGER_BUZZ_MS = 380;

interface ReelingPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  /** 会心の合わせのボーナス（イベントファイトでは無し） */
  headStart?: boolean;
  onSuccess: () => void;
  onFail: (reason: FailReason) => void;
}

interface Frame {
  progress: number;
  tension: number;
  mood: FishMood;
  elapsed: number;
  holding: boolean;
  /** 魚の横位置（%） */
  fishX: number;
  /** 1=左向き（絵の既定）/ -1=右向き */
  facing: 1 | -1;
  shakeX: number;
  shakeY: number;
  joltSeq: number;
}

const MOOD_TEXT: Record<FishMood, { text: string; className: string }> = {
  calm: { text: '長押しで巻く', className: 'text-washi/80' },
  warn: { text: 'くるぞ…！ 指を離せ！', className: 'text-shu-400 fg-blink' },
  surge: { text: '暴れている！ 待て！', className: 'text-shu-400' },
  tired: { text: '弱った！ 今だ、巻け！', className: 'text-kin-300' },
};

/**
 * やり取り（リーリング）: 長押しで巻き、離すと糸が休まる。
 * 魚は 静か→予兆→暴れ→弱り を繰り返す（レア度で激しさが変わる。数値は reelSim.ts）。
 * シミュレーションは rAF で実時間進行し、ストアは更新しない（終了時だけ onSuccess/onFail）。
 */
export default function ReelingPhase({ fish, equipment, headStart = false, onSuccess, onFail }: ReelingPhaseProps) {
  const params = useMemo(() => buildReelParams(equipment, fish.rarity), [equipment, fish.rarity]);
  const [started, setStarted] = useState(false);
  const [frame, setFrame] = useState<Frame>(() => ({
    progress: headStart ? HEAD_START_PROGRESS : 0,
    tension: 0,
    mood: 'calm',
    elapsed: 0,
    holding: false,
    fishX: 50,
    facing: 1,
    shakeX: 0,
    shakeY: 0,
    joltSeq: 0,
  }));
  const pointersRef = useRef<Set<number> | null>(null);
  const keyHoldRef = useRef(false);
  const { finished, finish, isDone } = useFinish(onSuccess, onFail);

  const fishW = Math.min(104, SIZE_CLASS_PX[fish.appearance?.size ?? 'medium'] ?? 72);
  const fishEl = useMemo(
    () => <FishIllustration fishId={fish.id} width={fishW} height={Math.round(fishW * 2 / 3)} silhouette />,
    [fish.id, fishW],
  );

  const end = useEffectEvent((result: ReelResult) => {
    if (result === 'caught') finish(true);
    else finish(false, result === 'snapped' ? 'snap' : 'timeout');
  });

  // シミュレーション本体（開始後）
  useEffect(() => {
    if (!started) return;
    const sim = createReelState(params, Math.random, headStart);
    let last = performance.now();
    let raf = 0;
    let lastMood: FishMood = sim.mood;
    let lastJolt = -1;
    let joltSeq = 0;
    let lastDanger = 0;
    let swim = 0;
    let tickFrom = sim.progress;

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const holding = (pointersRef.current?.size ?? 0) > 0 || keyHoldRef.current;
      stepReel(sim, params, dt, holding, Math.random);
      // 巻いて寄ってきたら「カリッ」（寄せ 2% ごと。音は sound 側でも間引く）
      if (holding && sim.progress - tickFrom >= 2) {
        tickFrom = sim.progress;
        playReelTick();
      } else if (sim.progress < tickFrom) {
        tickFrom = sim.progress;
      }

      if (sim.mood !== lastMood) {
        if (sim.mood === 'warn') buzz(HAPTIC.warn);
        lastMood = sim.mood;
      }
      if (sim.joltAt !== lastJolt) {
        lastJolt = sim.joltAt;
        joltSeq++;
        buzz(HAPTIC.jolt);
        playSplash();
      }
      const ratio = sim.tension / params.tensionLimit;
      if (ratio >= DANGER && now - lastDanger > DANGER_BUZZ_MS) {
        buzz(HAPTIC.danger);
        playTension();
        lastDanger = now;
      }

      // 魚の動き: 静か=ゆったり / 予兆=止まって向きを変える / 暴れ=速く大きく / 弱り=のろのろ
      const swimSpeed = sim.mood === 'surge' ? 5.5 : sim.mood === 'warn' ? 0.5 : sim.mood === 'tired' ? 0.6 : 1.4;
      swim += dt * swimSpeed;
      const amp = sim.mood === 'surge' ? 30 : 18;
      const shake = sim.mood === 'surge' ? 3 : sim.mood === 'warn' ? 1.4 : 0;
      setFrame({
        progress: sim.progress,
        tension: sim.tension,
        mood: sim.mood,
        elapsed: sim.elapsed,
        holding,
        fishX: 50 + Math.sin(swim) * amp,
        facing: Math.cos(swim) >= 0 ? -1 : 1,
        shakeX: (Math.random() - 0.5) * shake * 2,
        shakeY: (Math.random() - 0.5) * shake,
        joltSeq,
      });

      if (sim.result !== 'playing') {
        end(sim.result);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, params, headStart]);

  // PC: スペース / Enter の長押しでも巻ける
  useEffect(() => {
    const isHoldKey = (e: KeyboardEvent) => e.code === 'Space' || e.code === 'Enter';
    const down = (e: KeyboardEvent) => {
      if (!isHoldKey(e)) return;
      e.preventDefault();
      keyHoldRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (isHoldKey(e)) keyHoldRef.current = false;
    };
    const reset = () => {
      keyHoldRef.current = false;
      pointersRef.current?.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!started || isDone()) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 古いブラウザ */
    }
    if (!pointersRef.current) pointersRef.current = new Set();
    pointersRef.current.add(e.pointerId);
  };
  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current?.delete(e.pointerId);
  };

  const ratio = Math.min(1, frame.tension / params.tensionLimit);
  const danger = ratio >= DANGER;
  const timeLeft = Math.max(0, params.timeLimit - frame.elapsed);
  const progressRatio = Math.min(1, frame.progress / params.target);
  // 魚の深さ: 寄せるほど水面へ
  const fishY = 86 - progressRatio * 60;
  const lineColor = danger ? '#ef6a52' : ratio >= CAUTION ? '#e6c266' : 'rgba(244,236,216,0.85)';
  // 竿先: テンションが上がるほど魚の方へしなる
  const tipX = 72 - ratio * 12 + (frame.fishX - 50) * 0.1;
  const tipY = 6 + ratio * 18;
  const mouthX = frame.fishX + frame.facing * -7;
  const sag = (1 - ratio) * 14;
  const midX = (tipX + mouthX) / 2;
  const midY = (tipY + fishY) / 2 + sag;
  const moodInfo = MOOD_TEXT[frame.mood];
  const aura = fish.rarity === 'mythical' ? 'rgba(239,106,82,0.5)' : fish.rarity === 'legendary' ? 'rgba(241,216,147,0.45)' : fish.rarity === 'rare' ? 'rgba(127,169,205,0.4)' : null;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center px-4 pb-4 pt-2 fg-touch cursor-pointer"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onContextMenu={e => e.preventDefault()}
    >
      {/* 状況の見出し + 残り時間 */}
      <div className="w-full max-w-md flex items-center justify-between gap-2 h-12 shrink-0">
        <p key={frame.mood} className={`fg-pop font-mincho text-xl font-bold drop-shadow-[0_2px_0_rgba(10,26,44,0.9)] ${moodInfo.className}`}>
          <Ruby>{frame.mood === 'calm' && frame.holding ? '巻いている…' : moodInfo.text}</Ruby>
        </p>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm tabular-nums border ${timeLeft <= 5 ? 'bg-shu-600/80 border-shu-400 text-washi fg-blink' : 'bg-ai-950/60 border-kin-500/30 text-washi/85'}`}>
          <Ruby>残り</Ruby> {Math.ceil(timeLeft)}<Ruby>秒</Ruby>
        </span>
      </div>

      {/* 水中の断面 */}
      <div key={frame.joltSeq} className={`relative w-full max-w-md flex-1 min-h-[200px] rounded-2xl overflow-hidden border border-kin-500/20 bg-gradient-to-b from-ai-500/60 via-ai-800/80 to-ai-950 ${frame.joltSeq ? 'fg-shake' : ''}`}>
        {/* 水面 */}
        <div className="absolute inset-x-0 top-[14%] h-px bg-kin-300/50" />
        <div className="absolute inset-x-0 top-0 h-[14%] bg-ai-950/50" />
        <div className="absolute top-[14%] bottom-0 left-0 w-[calc(100%+96px)] fg-waves opacity-40" />

        {/* 竿と糸 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d={`M 104 106 Q 96 ${40 + ratio * 10} ${tipX} ${tipY}`} fill="none" stroke="#3b2a1a" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={`M 104 106 Q 96 ${40 + ratio * 10} ${tipX} ${tipY}`} fill="none" stroke="#b8862f" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={`M ${tipX} ${tipY} Q ${midX} ${midY} ${mouthX} ${fishY}`} fill="none" stroke={lineColor} strokeWidth={danger ? 2.6 : 1.6} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* 魚 */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${frame.fishX}%`, top: `${fishY}%`, transform: `translate(-50%, -50%) translate(${frame.shakeX}px, ${frame.shakeY}px)` }}
        >
          {aura && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-28 rounded-full fg-aura" style={{ background: `radial-gradient(closest-side, ${aura}, transparent)` }} />
          )}
          <div style={{ transform: `scaleX(${frame.facing}) rotate(${frame.mood === 'tired' ? 16 : frame.mood === 'surge' ? -8 : 0}deg)`, opacity: 0.8 }}>
            {fishEl}
          </div>
          {frame.mood === 'warn' && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-shu-500 text-washi font-black flex items-center justify-center fg-blink">!</span>
          )}
          {frame.mood === 'surge' && (
            <div className="absolute left-1/2 top-1/2 w-0 h-0">
              <Ripple key={Math.floor(frame.elapsed * 3)} size={90} />
            </div>
          )}
          {frame.mood === 'tired' && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-kin-500/90 px-2 text-[11px] font-bold text-sumi"><Ruby>弱った</Ruby></span>
          )}
        </div>
      </div>

      {/* ゲージ */}
      <div className="w-full max-w-md mt-3 space-y-2 shrink-0">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className={danger ? 'text-shu-400 font-bold' : 'text-washi/75'}><Ruby>{danger ? '糸が切れそう！' : '糸の張り'}</Ruby></span>
            <span className="text-washi/50 tabular-nums">{Math.round(ratio * 100)}%</span>
          </div>
          <div className="relative h-4 rounded-full overflow-hidden bg-ai-950/70 border border-kin-500/20">
            <div className="absolute inset-y-0 left-0 w-[60%] bg-emerald-600/20" />
            <div className="absolute inset-y-0 left-[60%] w-[25%] bg-kin-500/20" />
            <div className="absolute inset-y-0 left-[85%] right-0 bg-shu-500/30" />
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${ratio * 100}%`, background: lineColor }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-washi/75"><Ruby>寄せ</Ruby></span>
            <span className="text-washi/50 tabular-nums"><Ruby>あと</Ruby> {Math.max(0, Math.ceil(100 - progressRatio * 100))}%</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden bg-ai-950/70 border border-kin-500/20">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ai-300 to-kin-400" style={{ width: `${progressRatio * 100}%` }} />
          </div>
        </div>
      </div>

      {/* リール（押している間だけ回る） */}
      <div className="mt-3 flex flex-col items-center shrink-0 fg-tall-only">
        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg transition-transform duration-75 ${frame.holding ? 'scale-95 border-kin-300 bg-ai-500' : 'border-kin-500/50 bg-ai-800'}`}>
          <svg className={frame.holding ? 'fg-reel-spin' : ''} width="46" height="46" viewBox="0 0 46 46" aria-hidden>
            <circle cx="23" cy="23" r="15" fill="none" stroke="#f1d893" strokeWidth="3" />
            <circle cx="23" cy="23" r="4" fill="#f1d893" />
            <path d="M23 23 L36 10" stroke="#f1d893" strokeWidth="3" strokeLinecap="round" />
            <circle cx="37" cy="9" r="4" fill="#e34a33" />
          </svg>
        </div>
        <p className="text-xs text-washi/55 mt-1.5"><Ruby>画面を長押しで巻く・離すと休む</Ruby></p>
      </div>

      {danger && !finished && <div className="absolute inset-0 fg-danger" />}

      {!started && (
        <MiniGameIntro
          game="reeling"
          bonusText={headStart ? `会心の合わせ: 寄せ +${HEAD_START_PROGRESS}%` : undefined}
          onDone={() => setStarted(true)}
        />
      )}
      {finished && <FinishFlash state={finished} />}
    </div>
  );
}
