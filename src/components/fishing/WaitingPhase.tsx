import { useState, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import type { Fish } from '../../game/types';
import { getStrikeGreenZone } from '../../game/fishing';
import { STRIKE_PERFECT_FRACTION, STRIKE_RING_PERIOD_MS } from './strike';
import { SIZE_CLASS_PX } from './miniGameMeta';
import { Bobber, Ripple, Splash } from './FishingScene';
import { buzz, HAPTIC } from './haptics';
import { playBite, playNibble, playTap } from '../../utils/sound';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';

/** 輪が消えてから「見逃し」にするまでの猶予（正規化時間） */
const MISS_GRACE_T = 0.06;
/** 輪の最大半径（SVG座標） */
const RING_R0 = 120;

interface WaitingPhaseProps {
  hasBite: boolean;
  fish: Fish;
  strikeLevel: number;
  onStrike: (t: number) => void;
  onEarlyTap: () => boolean;
  onMiss: () => void;
}

/**
 * 当たり待ち → 合わせ。
 * 待ち: 浮きがゆらゆら、ときどきピクッ（前アタリ）。魚影が下をうろつく。押すと「早合わせ」で当たりが遅れる。
 * 当たり: 浮きが沈み、朱の輪が縮んでいく。輪が金の帯に入った（金色に光った）瞬間にタップ。
 */
export default function WaitingPhase({ hasBite, fish, strikeLevel, onStrike, onEarlyTap, onMiss }: WaitingPhaseProps) {
  const [nibble, setNibble] = useState(0);
  const [early, setEarly] = useState<{ id: number; penalized: boolean } | null>(null);
  const [t, setT] = useState(0);
  const [tappedT, setTappedT] = useState<number | null>(null);
  const biteAtRef = useRef(0);
  const doneRef = useRef(false);

  const period = STRIKE_RING_PERIOD_MS[fish.rarity];
  const greenZone = getStrikeGreenZone(strikeLevel);
  const isBig = fish.rarity === 'legendary' || fish.rarity === 'mythical';
  const shadowW = Math.min(110, SIZE_CLASS_PX[fish.appearance?.size ?? 'medium'] ?? 72);
  const shadow = useMemo(
    () => <FishIllustration fishId={fish.id} width={shadowW} height={Math.round(shadowW * 2 / 3)} silhouette />,
    [fish.id, shadowW],
  );

  // 前アタリ（ピクッ）: 当たりまでの間、ランダムに浮きが動く
  useEffect(() => {
    if (hasBite) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setNibble(n => n + 1);
        buzz(HAPTIC.nibble);
        playNibble();
        schedule();
      }, 900 + Math.random() * 1500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [hasBite]);

  // 早合わせの文言を消す
  useEffect(() => {
    if (!early) return;
    const timer = window.setTimeout(() => setEarly(null), 1100);
    return () => clearTimeout(timer);
  }, [early]);

  const miss = useEffectEvent(() => onMiss());

  // 本アタリ: 輪を縮める（実時間ベース。端末のリフレッシュレートに依存しない）
  useEffect(() => {
    if (!hasBite) return;
    buzz(HAPTIC.bite);
    playBite();
    biteAtRef.current = performance.now();
    let raf = 0;
    const loop = () => {
      if (doneRef.current) return;
      const nt = (performance.now() - biteAtRef.current) / period;
      setT(Math.min(1, nt));
      if (nt >= 1 + MISS_GRACE_T) {
        doneRef.current = true;
        miss();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasBite, period]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (doneRef.current) return;
    if (!hasBite) {
      const penalized = onEarlyTap();
      buzz(HAPTIC.tap);
      playTap();
      setEarly(prev => ({ id: (prev?.id ?? 0) + 1, penalized }));
      return;
    }
    doneRef.current = true;
    const nt = (performance.now() - biteAtRef.current) / period;
    setTappedT(nt);
    onStrike(nt);
  };

  const shownT = tappedT ?? t;
  const ringR = Math.max(0, RING_R0 * (1 - shownT));
  const inBand = hasBite && Math.abs(shownT - 0.5) <= greenZone / 2;

  return (
    <div className="absolute inset-0 fg-touch cursor-pointer" onPointerDown={handlePointerDown}>
      {/* 上部の案内 */}
      <div className="absolute top-[8%] inset-x-0 text-center px-4 pointer-events-none">
        {!hasBite ? (
          <>
            <p className="font-mincho text-xl text-washi/80"><Ruby>当たりを待とう…</Ruby></p>
            <p className="text-xs text-washi/50 mt-1"><Ruby>浮きが沈んだら、輪をよく見てタップ</Ruby></p>
            {isBig && <p className="text-sm text-kin-300 mt-2 fg-blink" style={{ animationDuration: '1.2s' }}><Ruby>水面がざわついている…</Ruby></p>}
          </>
        ) : (
          <>
            <p className="fg-pop font-brush text-5xl text-shu-400 drop-shadow-[0_3px_0_rgba(10,26,44,0.9)]"><Ruby>当たり！</Ruby></p>
            <p className="text-sm text-washi/85 mt-2"><Ruby>輪が光ったらタップ！</Ruby></p>
          </>
        )}
      </div>

      {/* 浮きの位置（CastPhase と同じ座標） */}
      <div className="absolute left-1/2 top-[56%] w-0 h-0">
        {/* 魚影 */}
        <div className="absolute left-0 top-[46px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {isBig && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-24 rounded-full fg-aura"
              style={{ background: fish.rarity === 'mythical' ? 'radial-gradient(closest-side, rgba(239,106,82,0.55), transparent)' : 'radial-gradient(closest-side, rgba(241,216,147,0.5), transparent)' }}
            />
          )}
          <div className={hasBite ? 'fg-dart-in' : 'fg-patrol'} style={{ opacity: hasBite ? undefined : 0.35 }}>
            {shadow}
          </div>
        </div>

        {/* 波紋（前アタリ・本アタリ） */}
        <div className="absolute left-0 top-[6px] w-0 h-0">
          {nibble > 0 && !hasBite && <Ripple key={`r${nibble}`} size={56} />}
          {hasBite && (
            <>
              <Ripple size={110} />
              <Ripple size={170} delay={140} />
              <Splash count={8} distance={46} />
            </>
          )}
        </div>

        {/* 浮き */}
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[55%] pointer-events-none">
          <Bobber state={hasBite ? 'sink' : 'idle'} nibbleKey={nibble} />
        </div>

        {/* 合わせの輪 */}
        {hasBite && (
          <svg
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible"
            width={280} height={280} viewBox="-140 -140 280 280" aria-hidden
          >
            {/* 金の帯（竿が良いほど太い） */}
            <circle r={RING_R0 * 0.5} fill="none" stroke="#d4a843" strokeOpacity={inBand ? 0.6 : 0.32} strokeWidth={RING_R0 * greenZone} />
            {/* 会心の芯 */}
            <circle r={RING_R0 * 0.5} fill="none" stroke="#f1d893" strokeOpacity="0.55" strokeWidth={RING_R0 * greenZone * STRIKE_PERFECT_FRACTION * 2} />
            {/* 縮む輪 */}
            <circle
              r={ringR}
              fill="none"
              stroke={inBand ? '#f7e7b8' : '#ef6a52'}
              strokeWidth={inBand ? 7 : 4}
              style={inBand ? { filter: 'drop-shadow(0 0 6px rgba(241,216,147,0.9))' } : undefined}
            />
          </svg>
        )}
      </div>

      {/* 早合わせのフィードバック */}
      {early && (
        <div key={early.id} className="absolute left-1/2 top-[40%] -translate-x-1/2 text-center pointer-events-none">
          <p className="fg-pop font-mincho text-2xl font-bold text-shu-400 drop-shadow-[0_2px_0_rgba(10,26,44,0.9)]"><Ruby>まだ早い！</Ruby></p>
          {early.penalized && <p className="text-xs text-washi/70 mt-1"><Ruby>魚が警戒した…</Ruby></p>}
        </div>
      )}
    </div>
  );
}
