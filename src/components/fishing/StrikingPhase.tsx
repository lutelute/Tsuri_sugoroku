import { useMemo } from 'react';
import type { FishRarity } from '../../game/types';
import type { StrikeOutcome } from '../../hooks/useFishing';
import { FAIL_HINT, RARITY_PULL_LINE } from './miniGameMeta';
import { HEAD_START_PROGRESS } from './reelSim';
import { QUICK_CATCH_PERFECT_SIZE } from '../../game/fishing';
import { Bobber, Ripple, Splash, SplashCrown } from './FishingScene';
import FishIllustration from '../shared/FishIllustration';
import FishShadow from './scene/FishShadow';
import LeapFish from './scene/LeapFish';
import Ruby from '../shared/Ruby';

interface StrikingPhaseProps {
  success: boolean;
  outcome: StrikeOutcome | null;
  rarity: FishRarity | null;
  /** 掛かった魚（水面の下で暴れる影を出す） */
  fishId?: string;
  /** 雑魚は手早く: やり取りを省いて、このまま釣り上げる */
  quick?: boolean;
}

/** 合わせの結果。成功は「掛かった！」の一枚絵（水柱・暴れる魚影・集中線）、失敗は理由とコツを見せて学べるようにする。 */
export default function StrikingPhase({ success, outcome, rarity, fishId, quick = false }: StrikingPhaseProps) {
  const shadow = useMemo(
    () => (fishId ? <FishIllustration fishId={fishId} width={96} height={64} silhouette /> : null),
    [fishId],
  );

  if (success) {
    const perfect = outcome === 'perfect';
    const pullLine = rarity ? RARITY_PULL_LINE[rarity] : undefined;
    const big = rarity === 'legendary' || rarity === 'mythical';
    return (
      <div className="absolute inset-0 fg-shake pointer-events-none">
        <div className={`absolute inset-0 fg-flash ${big ? 'bg-shu-400/40' : 'bg-kin-300/35'}`} />
        {/* 浮きのあった所: 集中線・水柱・暴れる魚影 */}
        <div className="absolute left-1/2 top-[56%] w-0 h-0">
          <svg className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 fg-burst" width="560" height="560" viewBox="-280 -280 560 560" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return (
                <line key={i} x1={Math.cos(a) * 96} y1={Math.sin(a) * 96} x2={Math.cos(a) * 270} y2={Math.sin(a) * 270}
                  stroke={i % 2 ? '#f1d893' : '#ef6a52'} strokeWidth={i % 2 ? 3 : 5} strokeLinecap="round" opacity="0.85" />
              );
            })}
          </svg>
          {shadow && !quick && (
            <div className="um-shadow-pos absolute left-0 -translate-x-1/2 -translate-y-1/2">
              <div className="um-thrash">
                <FishShadow k={big ? 1.25 : 1} opacity={0.8}>{shadow}</FishShadow>
              </div>
            </div>
          )}
          <div className="absolute left-0 top-[6px] w-0 h-0">
            <Ripple size={190} flat />
            <Ripple size={300} delay={120} flat />
            <SplashCrown size={big ? 190 : 150} tone={perfect || big ? 'kin' : 'foam'} />
            <SplashCrown size={big ? 120 : 96} delay={160} />
            <Splash count={12} distance={96} spread={170} />
            {/* 手早く: そのまま水面から抜き上げる */}
            {quick && fishId && <LeapFish fishId={fishId} delayMs={300} />}
          </div>
        </div>
        <div className="um-ink absolute inset-x-0 top-[13%] text-center px-4">
          <p className={`fg-pop font-brush text-kin-300 ${quick ? 'text-4xl sm:text-6xl' : 'text-6xl sm:text-7xl'}`}>
            <Ruby>{quick ? '手早く釣り上げた！' : perfect ? '会心！' : '掛かった！'}</Ruby>
          </p>
          {perfect && !quick && (
            <p className="fg-pop mt-2 inline-block rounded-full bg-shu-600/95 px-3 py-1 text-sm font-bold text-washi" style={{ animationDelay: '120ms', textShadow: 'none' }}>
              <Ruby>会心の合わせ</Ruby> スタートで +{HEAD_START_PROGRESS}%
            </p>
          )}
          {perfect && quick && (
            <p className="fg-pop mt-2 inline-block rounded-full bg-shu-600/95 px-3 py-1 text-sm font-bold text-washi" style={{ animationDelay: '120ms', textShadow: 'none' }}>
              <Ruby>会心の合わせ</Ruby> <Ruby>大きさ</Ruby> +{Math.round(QUICK_CATCH_PERFECT_SIZE * 100)}%
            </p>
          )}
          {pullLine && !quick && (
            <p className={`fg-pop mt-3 font-mincho text-lg sm:text-xl ${big ? 'text-shu-400' : 'text-washi'}`} style={{ animationDelay: '220ms' }}>
              <Ruby>{pullLine}</Ruby>
            </p>
          )}
        </div>
      </div>
    );
  }

  const reason = outcome === 'early' || outcome === 'late' || outcome === 'missed' ? outcome : 'missed';
  const info = FAIL_HINT[reason];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 浮きがぽかりと戻り、魚の去ったあとに波紋だけが残る */}
      <div className="absolute left-1/2 top-[56%] w-0 h-0">
        <div className="absolute left-0 top-[6px] w-0 h-0">
          <Ripple size={130} flat />
          <Ripple size={220} delay={260} flat />
        </div>
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[55%]">
          <Bobber state="idle" nibbleKey={1} />
        </div>
      </div>
      <div className="um-ink absolute inset-x-0 top-[14%] text-center px-6">
        <p className="fg-pop font-mincho text-4xl sm:text-5xl font-bold text-shu-400"><Ruby>{info.title}</Ruby></p>
        <p className="text-washi/90 mt-2"><Ruby>魚に逃げられた</Ruby></p>
        <p className="mt-4 inline-block rounded-lg bg-ai-950/75 border border-kin-500/40 px-3 py-2 text-sm text-kin-300" style={{ textShadow: 'none' }}>
          <Ruby>コツ</Ruby>: <Ruby>{info.hint}</Ruby>
        </p>
      </div>
    </div>
  );
}
