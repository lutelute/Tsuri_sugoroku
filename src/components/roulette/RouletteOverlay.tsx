import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useRoulette } from '../../hooks/useRoulette';
import Dice3D from '../fx/Dice3D';
import Confetti from '../fx/Confetti';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import { playDiceLand, playDiceRoll, playGood } from '../../utils/sound';

/** 出目を見せてから移動に移るまでの間 */
const RESULT_HOLD_MS = 950;

/** 端の出目にはひとこと添える */
const RESULT_REMARK: Record<number, string> = {
  1: 'ちょっとだけ…',
  6: '最高の出目！',
};

export default function RouletteOverlay() {
  const rollDice = useGameStore(s => s.rollDice);
  const player = useGameStore(s => s.players[s.currentPlayerIndex]);
  const [result, setResult] = useState<number | null>(null);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
  }, []);

  const handleResult = useCallback((r: number) => {
    playDiceLand();
    if (r === 6) playGood();
    setResult(r);
    holdTimer.current = window.setTimeout(() => rollDice(r), RESULT_HOLD_MS);
  }, [rollDice]);

  const { isSpinning, displayValue, rollId, rollMs, spin: rollNow } = useRoulette(handleResult);
  const spin = useCallback(() => {
    playDiceRoll();
    rollNow();
  }, [rollNow]);
  const canRoll = !isSpinning && result === null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ai-950/65 backdrop-blur-sm">
      {result === 6 && <Confetti variant="kin" mode="burst" count={34} seed={rollId + 3} originY="42%" />}
      <div className="text-center">
        <p className="text-lg text-washi/75 mb-2 font-mincho">
          <span style={{ color: player.color }} className="font-bold">{player.name}</span> <Ruby>の番</Ruby>
        </p>

        {/* サイコロ（和紙の盆に放り上げる） */}
        <div className="relative mx-auto flex items-center justify-center" style={{ width: 240, height: 230 }}>
          {result !== null && <div className="fx-rays" />}
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-52 h-10 rounded-[50%] bg-ai-900/60 border border-kin-500/25" aria-hidden="true" />
          <Dice3D
            value={displayValue}
            rollId={rollId}
            rolling={isSpinning}
            durationMs={rollMs}
            size={100}
            onClick={canRoll ? spin : undefined}
          />
          {result !== null && <div className="fx-ring" />}
        </div>

        <div className="min-h-[92px] flex flex-col items-center justify-start">
          {canRoll && (
            <>
              <Button onClick={spin} variant="gold" size="lg" className="font-mincho tracking-widest">
                <Ruby>サイコロを振る</Ruby>
              </Button>
              <p className="text-[11px] text-washi/40 mt-2"><Ruby>サイコロをタップしても振れる</Ruby></p>
            </>
          )}

          {isSpinning && (
            <p className="text-kin-300/75 text-sm font-mincho tracking-[0.3em]"><Ruby>コロコロ…</Ruby></p>
          )}

          {result !== null && (
            <div className="animate-bounce-in flex flex-col items-center" role="status">
              <div className="flex items-baseline gap-2">
                <span className="font-brush text-7xl leading-none kinpaku" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))' }}>{result}</span>
                <span className="font-mincho text-lg font-bold text-washi"><Ruby>マス進む</Ruby></span>
              </div>
              {RESULT_REMARK[result] && (
                <span className={`font-mincho text-sm mt-1 ${result === 6 ? 'text-kin-300' : 'text-washi/60'}`}><Ruby>{RESULT_REMARK[result]}</Ruby></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
