import { useEffect, useState } from 'react';
import Ruby from '../shared/Ruby';

interface StepCountdownProps {
  steps: number;
  stepMs: number;
}

/** 駒が進むあいだ「あと3マス → 2 → 1」と数える。0 になると消える（到着演出へ引き継ぐ）。 */
export default function StepCountdown({ steps, stepMs }: StepCountdownProps) {
  const [left, setLeft] = useState(steps);

  useEffect(() => {
    const timers: number[] = [];
    for (let i = 1; i <= steps; i++) {
      timers.push(window.setTimeout(() => setLeft(steps - i), i * stepMs));
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [steps, stepMs]);

  if (left <= 0) return null;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="panel-ai rounded-full pl-4 pr-5 py-1.5 flex items-baseline gap-2 shadow-xl border-kin-500/40">
        <span className="font-mincho text-sm text-washi/75"><Ruby>あと</Ruby></span>
        <span key={left} className="fx-tick font-brush text-3xl leading-none text-kin-300 tabular-nums min-w-[1ch] text-center">{left}</span>
        <span className="font-mincho text-sm text-washi/75"><Ruby>マス</Ruby></span>
      </div>
    </div>
  );
}
