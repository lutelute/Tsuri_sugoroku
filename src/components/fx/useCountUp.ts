import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * 数値を target まで滑らかに数え上げる（requestAnimationFrame）。
 * from を渡すとその値から、省略時は直前に表示していた値から数える。
 * 動きを減らす設定では即座に target を表示する。
 */
export function useCountUp(target: number, durationMs = 800, from?: number, delayMs = 0): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(from ?? target);
  const shownRef = useRef(from ?? target);

  useEffect(() => {
    const start = shownRef.current;
    let raf = 0;
    let timer = 0;
    if (start === target) return;
    const run = () => {
      if (reduced || durationMs <= 0) {
        raf = requestAnimationFrame(() => {
          shownRef.current = target;
          setShown(target);
        });
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(start + (target - start) * eased);
        shownRef.current = v;
        setShown(v);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (delayMs > 0 && !reduced) timer = window.setTimeout(run, delayMs);
    else run();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [target, durationMs, delayMs, reduced]);

  return shown;
}
