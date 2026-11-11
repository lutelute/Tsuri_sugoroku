import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from '../fx/useReducedMotion';

/** 順位を明かす間隔（ms）。1位の前だけ、ひと呼吸長くためる */
export const REVEAL_INTERVAL_MS = 1200;
const WINNER_EXTRA_MS = 350;

/**
 * 順位を下から1人ずつ明かす（4位 → … → 1位）。
 * shown = 明かした人数（下の順位から）。skip() で全員を一度に出す（押せば早送り）。
 * 動きを減らす設定では、はじめから全員を出す。
 */
export function useRankReveal(count: number, interval = REVEAL_INTERVAL_MS, startDelay = 700): { shown: number; done: boolean; skip: () => void } {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced || shown >= count) return;
    const wait = shown === 0 ? startDelay : interval + (shown === count - 1 && count > 1 ? WINNER_EXTRA_MS : 0);
    const timer = window.setTimeout(() => setShown(s => Math.min(count, s + 1)), wait);
    return () => clearTimeout(timer);
  }, [shown, count, interval, startDelay, reduced]);

  const skip = useCallback(() => setShown(count), [count]);
  const eff = reduced ? count : Math.min(shown, count);
  return { shown: eff, done: eff >= count, skip };
}
