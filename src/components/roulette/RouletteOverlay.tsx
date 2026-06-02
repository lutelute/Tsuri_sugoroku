import { useCallback, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useRoulette } from '../../hooks/useRoulette';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ai-950/65 backdrop-blur-sm">
      <div className="text-center">
        <p className="text-lg text-washi/75 mb-4 font-mincho">
          <span style={{ color: player.color }} className="font-bold">{player.name}</span> <Ruby>の番</Ruby>
        </p>

        {/* サイコロ表示（和紙の盆に転がす） */}
        <div className="washi-card inline-flex items-center justify-center rounded-2xl w-40 h-40 mb-8">
          <div className={`text-8xl leading-none select-none text-[#2a2118] ${isSpinning ? 'animate-pulse' : ''} ${showResult && !isSpinning ? 'animate-dice-result' : ''}`}>
            {DICE_FACES[displayValue]}
          </div>
        </div>

        <div>
          {!isSpinning && !showResult && (
            <Button onClick={spin} variant="gold" size="lg" className="font-mincho tracking-widest">
              <Ruby>サイコロを振る</Ruby>
            </Button>
          )}

          {isSpinning && (
            <p className="text-kin-300/70 text-sm animate-pulse font-mincho"><Ruby>回転中…</Ruby></p>
          )}
        </div>
      </div>
    </div>
  );
}
