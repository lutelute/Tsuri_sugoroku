import { useState, useCallback, useRef, useEffect } from 'react';
import { randomInt } from '../utils/random';
import { ROULETTE_MIN, ROULETTE_MAX } from '../game/constants';
import { useReducedMotion } from '../components/fx/useReducedMotion';

/** サイコロが転がって止まるまでの時間 */
export const DICE_ROLL_MS = 1500;
/** 動きを減らす設定のときの待ち時間 */
const DICE_ROLL_MS_REDUCED = 350;

/**
 * サイコロを振る。振った瞬間に出目を決め（displayValue）、
 * 転がる演出（rollMs）が終わってから onResult を呼ぶ。
 */
export function useRoulette(onResult: (result: number) => void) {
  const reduced = useReducedMotion();
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayValue, setDisplayValue] = useState(1);
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

    const finalResult = randomInt(ROULETTE_MIN, ROULETTE_MAX);
    setDisplayValue(finalResult);
    setRollId(id => id + 1);
    setIsSpinning(true);

    const t = window.setTimeout(() => {
      spinningRef.current = false;
      setIsSpinning(false);
      onResult(finalResult);
    }, rollMs);
    timeoutChain.current.push(t);
  }, [onResult, rollMs]);

  return { isSpinning, displayValue, rollId, rollMs, spin };
}
