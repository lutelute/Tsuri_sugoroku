import { useState, useEffect, useEffectEvent, useRef, useMemo } from 'react';
import type { Fish, FishRarity, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel, interpolateBonus } from '../../game/fishing';
import { REEL_TIME_EXTENSION } from '../../game/constants';
import { SIZE_CLASS_PX } from './miniGameMeta';
import type { FailReason } from './miniGameMeta';
import { useFinish } from './useFinish';
import { buzz, HAPTIC } from './haptics';
import { playHit, playTap } from '../../utils/sound';
import { Splash } from './FishingScene';
import MiniGameIntro from './MiniGameIntro';
import FinishFlash from './FinishFlash';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';

// ===== 難易度（ミニゲーム係） =====
/** 必要ヒット数 */
const HITS_REQUIRED: Record<FishRarity, number> = { common: 3, uncommon: 4, rare: 4, legendary: 5, mythical: 6 };
/** 泳ぐ速さ（px/秒） */
const SWIM_SPEED: Record<FishRarity, number> = { common: 90, uncommon: 105, rare: 118, legendary: 130, mythical: 142 };
/** 1秒あたりの急発進（ダッシュ）の起こりやすさ */
const DART_PER_SEC: Record<FishRarity, number> = { common: 0.12, uncommon: 0.25, rare: 0.35, legendary: 0.5, mythical: 0.65 };
/** 制限時間 = 基本 + 必要ヒット数×1ヒットあたり（秒）。リールの延長は半分だけ乗る */
const BASE_TIME_S = 6;
const TIME_PER_HIT_S = 2.4;
/** 会心の合わせの時間ボーナス（秒） */
const HEAD_START_TIME_S = 3;
/** 当たり判定の半径（px）: 基本 + 竿（strike）1レベルごと */
const HIT_RADIUS_BASE = 38;
const HIT_RADIUS_PER_LEVEL = 6;
/** 外したタップで魚が驚く（速くなる）時間と倍率 */
const STARTLE_S = 0.6;
const STARTLE_MUL = 1.7;
/** 当てた後に逃げる時間と倍率 */
const FLEE_S = 0.45;
const FLEE_MUL = 2.4;
const DART_S = 0.35;
const DART_MUL = 2.2;

interface TargetPhaseProps {
  fish: Fish;
  equipment: PlayerEquipment;
  /** 会心の合わせのボーナス（イベントファイトでは無し） */
  headStart?: boolean;
  onSuccess: () => void;
  onFail: (reason: FailReason) => void;
}

interface Fx { id: number; x: number; y: number; hit: boolean }

export default function TargetPhase({ fish, equipment, headStart = false, onSuccess, onFail }: TargetPhaseProps) {
  const required = HITS_REQUIRED[fish.rarity];

  // 装備効果: 竿=当たり判定拡大 / リール=制限時間延長 / ルアー=魚がゆっくり
  const rodLevel = getEffectiveLevel(equipment, 'strike');
  const reelLevel = getEffectiveLevel(equipment, 'tensionTolerance');
  const lureLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const hitRadius = HIT_RADIUS_BASE + Math.max(0, rodLevel - 1) * HIT_RADIUS_PER_LEVEL;
  const totalTime = BASE_TIME_S + required * TIME_PER_HIT_S + interpolateBonus(REEL_TIME_EXTENSION, reelLevel) / 2000 + (headStart ? HEAD_START_TIME_S : 0);
  const speed = SWIM_SPEED[fish.rarity] * Math.max(0.6, 1 - Math.max(0, lureLevel - 1) * 0.08);
  const dartRate = DART_PER_SEC[fish.rarity];

  const [started, setStarted] = useState(false);
  const [hits, setHits] = useState(0);
  const [frame, setFrame] = useState({ x: 160, y: 170, facing: 1, timeLeft: totalTime });
  const [fx, setFx] = useState<Fx[]>([]);
  const { finished, finish, isDone } = useFinish(onSuccess, onFail);

  const areaRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 320, h: 340 });
  const posRef = useRef({ x: 160, y: 170, vx: 1, vy: 0 });
  const waypointRef = useRef({ x: 160, y: 170 });
  const boostRef = useRef({ until: 0, mul: 1 });
  const hitsRef = useRef(0);
  const fxIdRef = useRef(0);
  const clockRef = useRef(0);

  const fishW = Math.min(84, SIZE_CLASS_PX[fish.appearance?.size ?? 'medium'] ?? 72);
  const fishEl = useMemo(
    () => <FishIllustration fishId={fish.id} width={fishW} height={Math.round(fishW * 2 / 3)} />,
    [fish.id, fishW],
  );

  // 水槽の大きさを測る（端末ごとに違う）
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const timeUp = useEffectEvent(() => finish(false, 'timeout'));

  // 泳ぎ（実時間ベース）
  useEffect(() => {
    if (!started) return;
    const margin = 36;
    const pickWaypoint = (awayFrom?: { x: number; y: number }) => {
      const { w, h } = sizeRef.current;
      let best = { x: w / 2, y: h / 2 };
      let bestD = -1;
      // 逃げるときは離れた候補を選ぶ
      for (let i = 0; i < (awayFrom ? 5 : 1); i++) {
        const c = { x: margin + Math.random() * (w - margin * 2), y: margin + Math.random() * (h - margin * 2) };
        const d = awayFrom ? Math.hypot(c.x - awayFrom.x, c.y - awayFrom.y) : 0;
        if (d > bestD) { best = c; bestD = d; }
      }
      waypointRef.current = best;
    };
    const { w, h } = sizeRef.current;
    posRef.current = { x: w / 2, y: h / 2, vx: 1, vy: 0 };
    pickWaypoint();

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (isDone()) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      clockRef.current += dt;
      const t = clockRef.current;
      const pos = posRef.current;
      const wp = waypointRef.current;

      // たまに急発進
      if (t > boostRef.current.until && Math.random() < dartRate * dt) {
        pickWaypoint();
        boostRef.current = { until: t + DART_S, mul: DART_MUL };
      }
      const mul = t < boostRef.current.until ? boostRef.current.mul : 1;

      // 目的地へ向けてなめらかに旋回
      const dx = wp.x - pos.x;
      const dy = wp.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 24) pickWaypoint();
      const turn = Math.min(1, dt * 4);
      pos.vx += ((dx / (dist || 1)) - pos.vx) * turn;
      pos.vy += ((dy / (dist || 1)) - pos.vy) * turn;
      const norm = Math.hypot(pos.vx, pos.vy) || 1;
      const { w: aw, h: ah } = sizeRef.current;
      pos.x = Math.max(margin, Math.min(aw - margin, pos.x + (pos.vx / norm) * speed * mul * dt));
      pos.y = Math.max(margin, Math.min(ah - margin, pos.y + (pos.vy / norm) * speed * mul * dt));

      const left = Math.max(0, totalTime - t);
      setFrame({ x: pos.x, y: pos.y, facing: pos.vx > 0 ? -1 : 1, timeLeft: left });
      if (left <= 0) {
        timeUp();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, speed, dartRate, totalTime, isDone]);

  const handleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!started || isDone()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tx = e.clientX - rect.left;
    const ty = e.clientY - rect.top;
    const pos = posRef.current;
    const hit = Math.hypot(tx - pos.x, ty - pos.y) <= hitRadius;
    const id = ++fxIdRef.current;
    const t = clockRef.current;
    // 演出は少し経ったら消す
    window.setTimeout(() => setFx(list => list.filter(f => f.id !== id)), 520);

    if (hit) {
      hitsRef.current++;
      setHits(hitsRef.current);
      setFx(list => [...list, { id, x: pos.x, y: pos.y, hit: true }]);
      buzz(HAPTIC.hook);
      playHit(hitsRef.current - 1);
      // 当てた方向から逃げる
      const { w, h } = sizeRef.current;
      const margin = 36;
      let best = { x: w / 2, y: h / 2 };
      let bestD = -1;
      for (let i = 0; i < 5; i++) {
        const c = { x: margin + Math.random() * (w - margin * 2), y: margin + Math.random() * (h - margin * 2) };
        const d = Math.hypot(c.x - tx, c.y - ty);
        if (d > bestD) { best = c; bestD = d; }
      }
      waypointRef.current = best;
      boostRef.current = { until: t + FLEE_S, mul: FLEE_MUL };
      if (hitsRef.current >= required) finish(true);
    } else {
      setFx(list => [...list, { id, x: tx, y: ty, hit: false }]);
      buzz(HAPTIC.tap);
      playTap();
      // 驚いて速くなる（連打対策）
      boostRef.current = { until: t + STARTLE_S, mul: STARTLE_MUL };
    }
  };

  const timeRatio = frame.timeLeft / totalTime;

  return (
    <div className="relative w-full h-full flex flex-col items-center px-4 pb-4 pt-2 fg-touch">
      <div className="w-full max-w-md flex items-center justify-between h-12 shrink-0">
        <p className="font-mincho text-xl font-bold text-washi/90"><Ruby>魚をタップ！</Ruby></p>
        <span className={`rounded-full px-3 py-1 text-sm tabular-nums border ${frame.timeLeft <= 4 ? 'bg-shu-600/80 border-shu-400 text-washi fg-blink' : 'bg-ai-950/60 border-kin-500/30 text-washi/85'}`}>
          <Ruby>残り</Ruby> {Math.ceil(frame.timeLeft)}<Ruby>秒</Ruby>
        </span>
      </div>

      {/* ヒット数（珠） */}
      <div className="flex gap-2 mb-2 shrink-0" aria-label={`${hits}/${required}`}>
        {Array.from({ length: required }, (_, i) => (
          <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < hits ? 'bg-kin-400 border-kin-300 fg-pop' : 'border-kin-500/40 bg-ai-950/50'}`} />
        ))}
      </div>

      {/* 水槽 */}
      <div
        ref={areaRef}
        className="relative w-full max-w-md flex-1 min-h-[240px] rounded-2xl overflow-hidden border border-kin-500/20 bg-gradient-to-b from-ai-600/70 via-ai-800/85 to-ai-950 cursor-crosshair"
        onPointerDown={handleTap}
      >
        <div className="absolute inset-0 w-[calc(100%+96px)] fg-waves opacity-40 pointer-events-none" />
        {/* 魚 */}
        <div
          className="absolute pointer-events-none"
          style={{ left: frame.x, top: frame.y, transform: `translate(-50%, -50%) scaleX(${frame.facing})` }}
        >
          {fishEl}
        </div>
        {/* タップの演出 */}
        {fx.map(f => (
          f.hit ? (
            <div key={f.id} className="absolute w-0 h-0 pointer-events-none" style={{ left: f.x, top: f.y }}>
              <Splash count={8} distance={40} />
              <span className="absolute -translate-x-1/2 -translate-y-[160%] fg-pop font-brush text-2xl text-kin-300 whitespace-nowrap drop-shadow-[0_2px_0_rgba(10,26,44,0.9)]"><Ruby>当たり</Ruby></span>
            </div>
          ) : (
            <span
              key={f.id}
              className="absolute rounded-full border-2 border-washi/50 fg-tap-miss"
              style={{ left: f.x, top: f.y, width: 44, height: 44 }}
            />
          )
        ))}
      </div>

      {/* 残り時間バー */}
      <div className="w-full max-w-md mt-3 h-2 rounded-full bg-ai-950/70 overflow-hidden border border-kin-500/15 shrink-0">
        <div
          className={`h-full rounded-full ${timeRatio > 0.4 ? 'bg-ai-300' : timeRatio > 0.2 ? 'bg-kin-500' : 'bg-shu-500'}`}
          style={{ width: `${timeRatio * 100}%` }}
        />
      </div>
      <p className="text-xs text-washi/50 mt-2 shrink-0 fg-tall-only"><Ruby>外すと魚が驚いて速くなる</Ruby></p>

      {!started && (
        <MiniGameIntro game="target" bonusText={headStart ? `会心の合わせ: 時間 +${HEAD_START_TIME_S}秒` : undefined} onDone={() => setStarted(true)} />
      )}
      {finished && <FinishFlash state={finished} />}
    </div>
  );
}
