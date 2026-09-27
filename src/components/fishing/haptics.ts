// 振動（対応端末のみ。iOS Safari などは navigator.vibrate が無いので何もしない）。
export const HAPTIC = {
  nibble: 12,
  bite: [70, 40, 110],
  hook: 45,
  perfect: [30, 30, 60],
  warn: [20, 50, 20],
  jolt: 90,
  danger: 18,
  snap: [140, 60, 220],
  catch: [40, 40, 40, 40, 140],
  miss: 70,
  tap: 8,
} as const;

export function buzz(pattern: number | readonly number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    }
  } catch {
    /* 振動できない環境は無視 */
  }
}
