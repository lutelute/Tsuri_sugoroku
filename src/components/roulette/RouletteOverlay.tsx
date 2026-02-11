import { useCallback, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useRoulette } from '../../hooks/useRoulette';
import Button from '../shared/Button';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function RouletteOverlay() {
  const { rollDice, players, currentPlayerIndex } = useGameStore();
  const player = players[currentPlayerIndex];
  const [showResult, setShowResult] = useState(false);

  const handleResult = useCallback((result: number) => {
    setShowResult(true);
    setTimeout(() => rollDice(result), 600);
  }, [rollDice]);

  const { isSpinning, displayValue, spin } = useRoulette(handleResult);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="text-center">
        <p className="text-lg text-white/70 mb-2">
          <span style={{ color: player.color }} className="font-bold">{player.name}</span> のターン
        </p>

        {/* サイコロ表示 */}
        <div className={`text-9xl mb-8 select-none ${isSpinning ? 'animate-pulse' : ''} ${showResult && !isSpinning ? 'animate-dice-result' : ''}`}>
          {DICE_FACES[displayValue]}
        </div>

        {!isSpinning && !showResult && (
          <Button onClick={spin} variant="gold" size="lg">
            サイコロを振る
          </Button>
        )}

        {isSpinning && (
          <p className="text-white/50 text-sm animate-pulse">回転中...</p>
        )}
      </div>
    </div>
  );
}
