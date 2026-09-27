import type { FishRarity } from '../../game/types';
import type { StrikeOutcome } from '../../hooks/useFishing';
import { FAIL_HINT, RARITY_PULL_LINE } from './miniGameMeta';
import { HEAD_START_PROGRESS } from './reelSim';
import { Ripple, Splash } from './FishingScene';
import Ruby from '../shared/Ruby';

interface StrikingPhaseProps {
  success: boolean;
  outcome: StrikeOutcome | null;
  rarity: FishRarity | null;
}

/** 合わせの結果。成功は「掛かった！」の一枚絵、失敗は理由とコツを見せて学べるようにする。 */
export default function StrikingPhase({ success, outcome, rarity }: StrikingPhaseProps) {
  if (success) {
    const perfect = outcome === 'perfect';
    const pullLine = rarity ? RARITY_PULL_LINE[rarity] : undefined;
    const big = rarity === 'legendary' || rarity === 'mythical';
    return (
      <div className="absolute inset-0 flex items-center justify-center fg-shake pointer-events-none">
        <div className={`absolute inset-0 fg-flash ${big ? 'bg-shu-400/40' : 'bg-kin-300/35'}`} />
        {/* 集中線 */}
        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fg-burst" width="520" height="520" viewBox="-260 -260 520 520" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <line key={i} x1={Math.cos(a) * 90} y1={Math.sin(a) * 90} x2={Math.cos(a) * 250} y2={Math.sin(a) * 250}
                stroke={i % 2 ? '#f1d893' : '#ef6a52'} strokeWidth={i % 2 ? 3 : 5} strokeLinecap="round" opacity="0.8" />
            );
          })}
        </svg>
        <div className="relative w-0 h-0">
          <Ripple size={150} />
          <Splash count={12} distance={90} />
        </div>
        <div className="absolute text-center px-4">
          <p className="fg-pop font-brush text-6xl text-kin-300 drop-shadow-[0_3px_0_rgba(10,26,44,0.95)]">
            <Ruby>{perfect ? '会心！' : '掛かった！'}</Ruby>
          </p>
          {perfect && (
            <p className="fg-pop mt-2 inline-block rounded-full bg-shu-600/90 px-3 py-1 text-sm font-bold text-washi" style={{ animationDelay: '120ms' }}>
              <Ruby>会心の合わせ</Ruby> スタートで +{HEAD_START_PROGRESS}%
            </p>
          )}
          {pullLine && (
            <p className={`fg-pop mt-3 font-mincho text-lg ${big ? 'text-shu-400' : 'text-washi/85'}`} style={{ animationDelay: '220ms' }}>
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
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center px-6">
        <p className="fg-pop font-mincho text-4xl font-bold text-shu-400 drop-shadow-[0_2px_0_rgba(10,26,44,0.9)]"><Ruby>{info.title}</Ruby></p>
        <p className="text-washi/70 mt-2"><Ruby>魚に逃げられた</Ruby></p>
        <p className="mt-4 inline-block rounded-lg bg-ai-950/60 border border-kin-500/25 px-3 py-2 text-sm text-kin-300">
          <Ruby>コツ</Ruby>: <Ruby>{info.hint}</Ruby>
        </p>
      </div>
    </div>
  );
}
