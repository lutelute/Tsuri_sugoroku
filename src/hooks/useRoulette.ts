import { useState, useCallback, useRef } from 'react';
import { randomInt } from '../utils/random';

export function useRoulette(onResult: (result: number) => void) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayValue, setDisplayValue] = useState(1);
  const timeoutChain = useRef<number[]>([]);

  const spin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalSteps = 18;
    const finalResult = randomInt(1, 6);

    // タイムアウトチェーンで減速を表現
    let elapsed = 0;
    for (let i = 0; i < totalSteps; i++) {
      const delay = i < 10 ? 80 : 80 + (i - 10) * 40; // 後半で減速
      elapsed += delay;
      const isLast = i === totalSteps - 1;
      const step = i;

      const t = window.setTimeout(() => {
        if (isLast) {
          setDisplayValue(finalResult);
          setIsSpinning(false);
          onResult(finalResult);
        } else {
          // 最後の3ステップは最終値に近い値を表示
          if (step >= totalSteps - 3) {
            setDisplayValue(randomInt(1, 6));
          } else {
            setDisplayValue(randomInt(1, 6));
          }
        }
      }, elapsed);

      timeoutChain.current.push(t);
    }
  }, [isSpinning, onResult]);

  return { isSpinning, displayValue, spin };
}
