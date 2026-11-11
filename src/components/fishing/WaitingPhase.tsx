import { useState, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Fish } from '../../game/types';
import { getStrikeGreenZone } from '../../game/fishing';
import { STRIKE_PERFECT_FRACTION, STRIKE_RING_PERIOD_MS } from './strike';
import { SIZE_CLASS_PX } from './miniGameMeta';
import { Bobber, Ripple, Splash, SplashCrown } from './FishingScene';
import { buzz, HAPTIC } from './haptics';
import { playBite, playNibble, playTap } from '../../utils/sound';
import FishIllustration from '../shared/FishIllustration';
import FishShadow from './scene/FishShadow';
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
      <div className="um-ink absolute top-[8%] inset-x-0 text-center px-4 pointer-events-none">
        {!hasBite ? (
          <>
            <p className="font-mincho text-xl sm:text-2xl text-washi"><Ruby>当たりを待とう…</Ruby></p>
            <p className="text-xs sm:text-sm text-washi/80 mt-1"><Ruby>浮きが沈んだら、輪をよく見てタップ</Ruby></p>
            {isBig && <p className="text-sm text-kin-300 mt-2 fg-blink" style={{ animationDuration: '1.2s' }}><Ruby>水面がざわついている…</Ruby></p>}
          </>
        ) : (
          <>
            <p className="fg-pop font-brush text-5xl sm:text-6xl text-shu-400"><Ruby>当たり！</Ruby></p>
            <p className="text-sm sm:text-base text-washi mt-2"><Ruby>輪が光ったらタップ！</Ruby></p>
          </>
        )}
      </div>

      {/* 浮きの位置（CastPhase と同じ座標） */}
      <div className="absolute left-1/2 top-[56%] w-0 h-0">
        {/* 魚影: その魚の形の影絵が、浮きの下をうろつく */}
        <div className="um-shadow-pos absolute left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {isBig && (
            <div
              className="um-aura fg-aura"
              style={{ '--um-k': 1.25, background: fish.rarity === 'mythical' ? 'radial-gradient(closest-side, rgba(239,106,82,0.62), transparent)' : 'radial-gradient(closest-side, rgba(247,225,150,0.6), transparent)' } as CSSProperties}
            />
          )}
          <div className={hasBite ? 'fg-dart-in' : 'um-patrol'} style={{ opacity: hasBite ? undefined : 0.6 }}>
            <FishShadow k={isBig ? 1.25 : 1} wake={!hasBite}>{shadow}</FishShadow>
          </div>
        </div>

        {/* 波紋と水しぶき（前アタリ・本アタリ） */}
        <div className="absolute left-0 top-[6px] w-0 h-0">
          {nibble > 0 && !hasBite && <Ripple key={`r${nibble}`} size={84} flat />}
          {hasBite && (
            <>
              <Ripple size={150} flat />
              <Ripple size={230} delay={140} flat />
              <SplashCrown size={isBig ? 130 : 96} />
              <Splash count={8} distance={52} spread={150} />
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
            className="um-ring absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible"
            viewBox="-140 -140 280 280" aria-hidden
          >
            {/* 輪の下地（明るい空や波の上でも帯が読めるように） */}
            <circle r={RING_R0 * 0.5} fill="none" stroke="#0a1a2c" strokeOpacity="0.3" strokeWidth={RING_R0 * greenZone + 5} />
            {/* 金の帯（竿が良いほど太い） */}
            <circle r={RING_R0 * 0.5} fill="none" stroke="#e6c266" strokeOpacity={inBand ? 0.78 : 0.46} strokeWidth={RING_R0 * greenZone} />
            {/* 会心の芯 */}
            <circle r={RING_R0 * 0.5} fill="none" stroke="#fff3c4" strokeOpacity="0.6" strokeWidth={RING_R0 * greenZone * STRIKE_PERFECT_FRACTION * 2} />
            {/* 縮む輪 */}
            <circle r={ringR} fill="none" stroke="#0a1a2c" strokeOpacity="0.5" strokeWidth={inBand ? 10 : 7} />
            <circle
              r={ringR}
              fill="none"
              stroke={inBand ? '#fff3c4' : '#ef6a52'}
              strokeWidth={inBand ? 7 : 4}
            />
          </svg>
        )}
      </div>

      {/* 早合わせのフィードバック */}
      {early && (
        <div key={early.id} className="um-ink absolute left-1/2 top-[30%] -translate-x-1/2 text-center pointer-events-none">
          <p className="fg-pop font-mincho text-2xl font-bold text-shu-400 whitespace-nowrap"><Ruby>まだ早い！</Ruby></p>
          {early.penalized && <p className="text-xs text-washi/85 mt-1 whitespace-nowrap"><Ruby>魚が警戒した…</Ruby></p>}
        </div>
      )}
    </div>
  );
}
