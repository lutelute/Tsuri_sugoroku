import { useEffect, useState } from 'react';
import Ruby from '../shared/Ruby';

interface StepCountdownProps {
  steps: number;
  stepMs: number;
  /** 経路の1歩ごとに、歩数に数えるか（まちづくりの線路は数えない）。省くと全部数える */
  counted?: boolean[];
}

/** 駒が進むあいだ「あと3マス → 2 → 1」と数える。0 になると消える（到着演出へ引き継ぐ）。線路の上では「汽車」の札を出す。 */
export default function StepCountdown({ steps, stepMs, counted }: StepCountdownProps) {
  // done = 進み終えた歩数（経路の上の位置）
  const [done, setDone] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    for (let i = 1; i <= steps; i++) {
      timers.push(window.setTimeout(() => setDone(i), i * stepMs));
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [steps, stepMs]);

  const isCounted = (i: number) => counted?.[i] !== false;
  let left = 0;
  for (let i = done; i < steps; i++) if (isCounted(i)) left++;
  if (done >= steps || left <= 0) return null;
  // いま渡っている1歩が線路なら、歩数は減らさずに「汽車」と出す
  const onRail = !isCounted(done);
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="panel-ai rounded-full pl-4 pr-5 py-1.5 flex items-baseline gap-2 shadow-xl border-kin-500/40">
        {onRail && <span className="fx-tick font-mincho text-xs text-kin-200 border border-kin-400/50 rounded-full px-2 py-0.5 self-center"><Ruby>汽車</Ruby></span>}
        <span className="font-mincho text-sm text-washi/75"><Ruby>あと</Ruby></span>
        <span key={left} className="fx-tick font-brush text-3xl leading-none text-kin-300 tabular-nums min-w-[1ch] text-center">{left}</span>
        <span className="font-mincho text-sm text-washi/75"><Ruby>マス</Ruby></span>
      </div>
    </div>
  );
}
