import { useState, useCallback, useRef, useEffect } from 'react';
import { clampDiceCount, rollDiceFaces } from '../game/cityCards';
import { useReducedMotion } from '../components/fx/useReducedMotion';

/** サイコロが転がって止まるまでの時間 */
export const DICE_ROLL_MS = 1500;
/** 動きを減らす設定のときの待ち時間 */
const DICE_ROLL_MS_REDUCED = 350;

export interface RouletteOptions {
  /** サイコロの個数（1〜3。急行=2・特急=3） */
  count?: number;
  /** サイコロ1個あたりの出目の上限（牛歩=2）。null なら上限なし */
  cap?: number | null;
}

/**
 * サイコロを振る。振った瞬間に出目を決め（faces / total）、
 * 転がる演出（rollMs）が終わってから onResult(合計, 各出目) を呼ぶ。
 * 1個・上限なしのときの乱数の使い方はこれまでと同じ（randomInt(1,6) を1回）。
 */
export function useRoulette(onResult: (total: number, faces: number[]) => void, options: RouletteOptions = {}) {
  const reduced = useReducedMotion();
  const count = clampDiceCount(options.count);
  const cap = options.cap ?? null;
  const [isSpinning, setIsSpinning] = useState(false);
  const [faces, setFaces] = useState<number[]>(() => Array.from({ length: count }, () => 1));
  const [rollId, setRollId] = useState(0);
  const timeoutChain = useRef<number[]>([]);
  const spinningRef = useRef(false);
  const rollMs = reduced ? DICE_ROLL_MS_REDUCED : DICE_ROLL_MS;

  // アンマウント時に保留中のタイマーを全て解除（onResult/setStateの遅延発火を防ぐ）
  useEffect(() => {
    return () => {
      timeoutChain.current.forEach(t => clearTimeout(t));
      timeoutChain.current = [];
    };
  }, []);

  const spin = useCallback(() => {
    // 連打で二重に振らない
    if (spinningRef.current) return;
    spinningRef.current = true;

    const rolled = rollDiceFaces(count, cap);
    const sum = rolled.reduce((s, v) => s + v, 0);
    setFaces(rolled);
    setRollId(id => id + 1);
    setIsSpinning(true);

    const t = window.setTimeout(() => {
      spinningRef.current = false;
      setIsSpinning(false);
      onResult(sum, rolled);
    }, rollMs);
    timeoutChain.current.push(t);
  }, [onResult, rollMs, count, cap]);

  // 個数が途中で変わっても表示が崩れないよう、足りない分は1で埋める
  const shown = Array.from({ length: count }, (_, i) => faces[i] ?? 1);
  const total = shown.reduce((s, v) => s + v, 0);

  return {
    isSpinning,
    /** 1個目の出目（これまでの互換） */
    displayValue: shown[0],
    faces: shown,
    total,
    count,
    cap,
    rollId,
    rollMs,
    spin,
  };
}
