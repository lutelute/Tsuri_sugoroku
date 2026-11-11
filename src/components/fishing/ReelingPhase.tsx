import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { Fish, PlayerEquipment } from '../../game/types';
import { buildReelParams, createReelState, stepReel, HEAD_START_PROGRESS } from './reelSim';
import type { FishMood, ReelResult } from './reelSim';
import { SIZE_CLASS_PX } from './miniGameMeta';
import type { FailReason } from './miniGameMeta';
import { useFinish } from './useFinish';
import { buzz, HAPTIC } from './haptics';
import { playReelTick, playSplash, playTension } from '../../utils/sound';
import { Ripple, SplashCrown } from './FishingScene';
import { StageAnchor } from './scene/FishingStage';
import { AnglerFigure } from './scene/Angler';
import FishShadow from './scene/FishShadow';
import { GaugeLabel, ProgressGauge, ReelWheel, TensionGauge } from './scene/Gauges';
import { cubicD, nodeD, splitCubic } from './scene/rodPath';
import type { Cubic } from './scene/rodPath';
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
  const color = useGameStore(st => st.players[st.currentPlayerIndex]?.color ?? '#e34a33');

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
  const lineColor = danger ? '#ef6a52' : ratio >= CAUTION ? '#e6c266' : 'rgba(244,236,216,0.9)';
  // 竿: 根元は右下の釣り人の陰。張りが上がるほど、竿先が魚の方へ大きく引きこまれてしなる
  // 危ないときは糸と竿先が震える
  const tremble = danger ? Math.sin(frame.elapsed * 95) * 1.1 : 0;
  const tipX = 69 - ratio * 25 + (frame.fishX - 50) * 0.14 + tremble * 0.7;
  const tipY = 3 + ratio * 9;
  const rod: Cubic = [[88, 100], [85, 62], [77 - ratio * 5, 9 - ratio * 5], [tipX, tipY]];
  // 竹竿は根元が太く先が細い。3本に分けて太さを変える（分け目は 44% と 72%）
  const [butt, rest] = splitCubic(rod, 0.44);
  const [mid, tip] = splitCubic(rest, 0.5);
  const mouthX = frame.fishX + frame.facing * -10;
  const sag = (1 - ratio) * 14;
  const midX = (tipX + mouthX) / 2 + tremble;
  const midY = (tipY + fishY) / 2 + sag;
  const lineD = `M ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${mouthX.toFixed(1)} ${fishY.toFixed(1)}`;
  const moodInfo = MOOD_TEXT[frame.mood];
  const aura = fish.rarity === 'mythical' ? 'rgba(239,106,82,0.6)' : fish.rarity === 'legendary' ? 'rgba(247,225,150,0.58)' : fish.rarity === 'rare' ? 'rgba(150,210,245,0.5)' : null;
  // めずらしい魚ほど影が大きい
  const presence = fish.rarity === 'mythical' ? 1.4 : fish.rarity === 'legendary' ? 1.25 : fish.rarity === 'rare' ? 1.1 : 1;
  const wag = frame.mood === 'surge' ? 'is-fast' : frame.mood === 'tired' ? 'is-slow' : '';
  // 寄せが 25・50・75% を越えるたびに、水面でしぶきが上がる（見た目だけ）
  const milestone = Math.min(3, Math.floor(progressRatio * 4));

  return (
    <div
      className="relative w-full h-full flex flex-col items-center px-4 pb-4 pt-2 fg-touch cursor-pointer"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onContextMenu={e => e.preventDefault()}
    >
      {/* 状況の見出し + 残り時間 */}
      <div className="relative z-[1] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex items-center justify-between gap-2 h-12 shrink-0">
        <p key={frame.mood} className={`um-ink fg-pop font-mincho text-xl sm:text-2xl font-bold ${moodInfo.className}`}>
          <Ruby>{frame.mood === 'calm' && frame.holding ? '巻いている…' : moodInfo.text}</Ruby>
        </p>
        <span className={`um-pill ${timeLeft <= 5 ? 'is-urgent fg-blink' : ''}`}>
          <Ruby>残り</Ruby> {Math.ceil(timeLeft)}<Ruby>秒</Ruby>
        </span>
      </div>

      {/* 水中の断面（窓の向こうに舞台の絵が見える。水面は上から14%） */}
      {/* 外を暗くする影は動かない枠に持たせる（揺れる窓に巨大な影を付けると、合成の層が画面より大きくなる） */}
      <div className="um-window-frame w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-1 min-h-[200px] flex">
      <div key={frame.joltSeq} className={`um-window is-inner w-full ${frame.joltSeq ? 'fg-shake' : ''}`}>
        <StageAnchor surface={0.14} />

        {/* 竿と糸 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" strokeLinecap="round" aria-hidden>
          {danger && <path d={lineD} stroke="#ef6a52" strokeOpacity="0.4" strokeWidth="7" vectorEffect="non-scaling-stroke" />}
          <path d={lineD} stroke={lineColor} strokeWidth={danger ? 2.8 : ratio >= CAUTION ? 2.1 : 1.6} vectorEffect="non-scaling-stroke" />
          <path d={cubicD(tip)} stroke="#24170b" strokeWidth="4.6" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(mid)} stroke="#24170b" strokeWidth="7.6" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(butt)} stroke="#24170b" strokeWidth="10.6" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(tip)} stroke="#c9963c" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(mid)} stroke="#c9963c" strokeWidth="5.2" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(butt)} stroke="#c9963c" strokeWidth="8.2" vectorEffect="non-scaling-stroke" />
          <path d={cubicD(butt)} stroke="#f1d893" strokeWidth="1.8" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
          {/* 竹の節 */}
          <g stroke="#3b2a1a" strokeOpacity="0.7" strokeLinecap="butt">
            <path d={nodeD(butt, 0.34)} strokeWidth="9.4" vectorEffect="non-scaling-stroke" />
            <path d={nodeD(butt, 0.68)} strokeWidth="9.4" vectorEffect="non-scaling-stroke" />
            <path d={nodeD(butt, 0.99)} strokeWidth="9.4" vectorEffect="non-scaling-stroke" />
            <path d={nodeD(mid, 0.5, 0.012)} strokeWidth="6.4" vectorEffect="non-scaling-stroke" />
            <path d={nodeD(mid, 0.99, 0.012)} strokeWidth="6.4" vectorEffect="non-scaling-stroke" />
            <path d={nodeD(tip, 0.5, 0.012)} strokeWidth="3.6" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {milestone > 0 && !finished && (
          <div key={milestone} className="absolute w-0 h-0 pointer-events-none" style={{ left: `${frame.fishX}%`, top: '14%' }}>
            <Ripple size={150} flat />
            <SplashCrown size={84 + milestone * 14} />
          </div>
        )}

        {/* 魚（その魚の形の影絵） */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${frame.fishX}%`, top: `${fishY}%`, transform: `translate(-50%, -50%) translate(${frame.shakeX}px, ${frame.shakeY}px)` }}
        >
          {aura && (
            <div className="um-aura fg-aura" style={{ '--um-k': presence, background: `radial-gradient(closest-side, ${aura}, transparent)` } as CSSProperties} />
          )}
          <div style={{ transform: `scaleX(${frame.facing}) rotate(${frame.mood === 'tired' ? 16 : frame.mood === 'surge' ? -8 : 0}deg)` }}>
            <div className={`um-wag ${wag}`}>
              <FishShadow k={presence} wake>{fishEl}</FishShadow>
            </div>
          </div>
          {frame.mood === 'warn' && (
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-shu-500 text-washi font-black flex items-center justify-center fg-blink shadow-[0_0_0_2px_rgba(10,26,44,0.6)]">!</span>
          )}
          {frame.mood === 'surge' && (
            <div className="absolute left-1/2 top-1/2 w-0 h-0">
              <Ripple key={Math.floor(frame.elapsed * 3)} size={120} />
            </div>
          )}
          {frame.mood === 'tired' && (
            <span className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-kin-500/95 px-2 text-[11px] font-bold text-sumi shadow-[0_0_0_2px_rgba(10,26,44,0.5)]"><Ruby>弱った</Ruby></span>
          )}
        </div>

        {/* 近景の釣り人（竿の根元を隠す） */}
        <AnglerFigure color={color} className="um-angler-corner" />
      </div>
      </div>

      {/* ゲージ */}
      <div className="relative z-[1] w-full max-w-md md:max-w-3xl lg:max-w-5xl mt-3 space-y-2 shrink-0">
        <div>
          <GaugeLabel left={danger ? '糸が切れそう！' : '糸の張り'} right={`${Math.round(ratio * 100)}%`} alert={danger} />
          <TensionGauge ratio={ratio} color={lineColor} caution={CAUTION} danger={DANGER} />
        </div>
        <div>
          <GaugeLabel left="寄せ" right={<><Ruby>あと</Ruby> {Math.max(0, Math.ceil(100 - progressRatio * 100))}%</>} />
          <ProgressGauge ratio={progressRatio} />
        </div>
      </div>

      {/* リール（押している間だけ回る） */}
      <div className="relative z-[1] mt-3 flex flex-col items-center shrink-0 fg-tall-only">
        <ReelWheel holding={frame.holding} />
        <p className="text-xs text-washi/70 mt-1.5"><Ruby>画面を長押しで巻く・離すと休む</Ruby></p>
      </div>

      {danger && !finished && <div className="absolute inset-0 fg-danger" />}

      {!started && (
        <MiniGameIntro
          game="reeling"
          bonusText={headStart ? `会心の合わせ: 寄せ +${HEAD_START_PROGRESS}%` : undefined}
          onDone={() => setStarted(true)}
        />
      )}
      {finished && <FinishFlash state={finished} fishId={fish.id} rarity={fish.rarity} />}
    </div>
  );
}
