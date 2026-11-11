import type { FishRarity } from '../../game/types';
import type { FinishState } from './useFinish';
import { FAIL_HINT } from './miniGameMeta';
import { Splash, Ripple, SplashCrown } from './FishingScene';
import LeapFish from './scene/LeapFish';
import Ruby from '../shared/Ruby';

/** ミニゲーム終了の一枚絵: 釣り上げた！ / 糸が切れた… など */
interface FinishFlashProps {
  state: FinishState;
  /** 釣り上げた魚（水面から飛び出して手前に来る絵を出す） */
  fishId?: string;
  rarity?: FishRarity;
}

export default function FinishFlash({ state, fishId, rarity }: FinishFlashProps) {
  if (state.win) {
    const big = rarity === 'legendary' || rarity === 'mythical';
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-kin-300/30 fg-flash" />
        <div className="relative flex flex-col items-center">
          <div className="relative w-0 h-0">
            <Ripple size={200} flat />
            <Ripple size={320} delay={120} flat />
            <SplashCrown size={170} tone="kin" />
            <SplashCrown size={110} delay={150} />
            <Splash count={12} distance={96} spread={170} />
            {/* 魚が水面から飛び出して、手前へ来る */}
            {fishId && <LeapFish fishId={fishId} big={big} />}
          </div>
          <p className="um-ink fg-pop font-brush text-5xl sm:text-6xl text-kin-300 mt-3">
            <Ruby>釣り上げた！</Ruby>
          </p>
        </div>
      </div>
    );
  }
  const info = FAIL_HINT[state.reason];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-ai-950/45">
      <div className="text-center px-6">
        <p className="um-ink fg-pop font-mincho text-4xl sm:text-5xl font-bold text-shu-400">
          <Ruby>{info.title}</Ruby>
        </p>
        <p className="mt-3 text-sm sm:text-base text-washi/90"><Ruby>{info.hint}</Ruby></p>
      </div>
    </div>
  );
}
