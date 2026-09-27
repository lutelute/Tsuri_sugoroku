import type { FinishState } from './useFinish';
import { FAIL_HINT } from './miniGameMeta';
import { Splash, Ripple } from './FishingScene';
import Ruby from '../shared/Ruby';

/** ミニゲーム終了の一枚絵: 釣り上げた！ / 糸が切れた… など */
export default function FinishFlash({ state }: { state: FinishState }) {
  if (state.win) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-kin-300/30 fg-flash" />
        <div className="relative flex flex-col items-center">
          <div className="relative w-0 h-0">
            <Ripple size={160} />
            <Ripple size={240} delay={120} />
            <Splash count={12} distance={80} />
          </div>
          <p className="fg-pop font-brush text-5xl text-kin-300 drop-shadow-[0_3px_0_rgba(10,26,44,0.9)]">
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
        <p className="fg-pop font-mincho text-4xl font-bold text-shu-400 drop-shadow-[0_2px_0_rgba(10,26,44,0.9)]">
          <Ruby>{info.title}</Ruby>
        </p>
        <p className="mt-3 text-sm text-washi/75"><Ruby>{info.hint}</Ruby></p>
      </div>
    </div>
  );
}
