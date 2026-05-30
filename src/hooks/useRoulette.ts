import { useState, useCallback, useRef, useEffect } from 'react';
import { randomInt } from '../utils/random';
import { ROULETTE_MIN, ROULETTE_MAX } from '../game/constants';

export function useRoulette(onResult: (result: number) => void) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayValue, setDisplayValue] = useState(1);
  const timeoutChain = useRef<number[]>([]);

  // アンマウント時に保留中のタイマーを全て解除（onResult/setStateの遅延発火を防ぐ）
  useEffect(() => {
    return () => {
      timeoutChain.current.forEach(t => clearTimeout(t));
      timeoutChain.current = [];
    };
  }, []);

  const spin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalSteps = 18;
    const finalResult = randomInt(ROULETTE_MIN, ROULETTE_MAX);

    // タイムアウトチェーンで減速を表現
    let elapsed = 0;
    for (let i = 0; i < totalSteps; i++) {
      const delay = i < 10 ? 80 : 80 + (i - 10) * 40; // 後半で減速
      elapsed += delay;
      const isLast = i === totalSteps - 1;

      const t = window.setTimeout(() => {
        if (isLast) {
          setDisplayValue(finalResult);
          setIsSpinning(false);
          onResult(finalResult);
        } else {
          setDisplayValue(randomInt(ROULETTE_MIN, ROULETTE_MAX));
        }
      }, elapsed);

      timeoutChain.current.push(t);
    }
  }, [isSpinning, onResult]);

  return { isSpinning, displayValue, spin };
}
