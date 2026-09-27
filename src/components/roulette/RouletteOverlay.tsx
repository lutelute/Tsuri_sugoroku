import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useRoulette } from '../../hooks/useRoulette';
import { clampDiceCount } from '../../game/cityCards';
import Dice3D from '../fx/Dice3D';
import MiniDie from '../fx/MiniDie';
import Confetti from '../fx/Confetti';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import { playDiceLand, playDiceRoll, playGood } from '../../utils/sound';

/** 出目を見せてから移動に移るまでの間 */
const RESULT_HOLD_MS = 950;
/** 複数個のとき、合計を読む時間を少し足す */
const RESULT_HOLD_EXTRA_MS = 300;
/** 複数個のとき、1個ずつずらして止める間隔 */
const DICE_STAGGER_MS = 160;

/** 1個のとき、端の出目にはひとこと添える */
const RESULT_REMARK: Record<number, string> = {
  1: 'ちょっとだけ…',
  6: '最高の出目！',
};

/** 個数ごとのサイコロの大きさ */
const DIE_SIZE: Record<number, number> = { 1: 100, 2: 84, 3: 68 };
/** 個数ごとの盆（影の楕円）の幅 */
const TRAY_WIDTH: Record<number, number> = { 1: 208, 2: 260, 3: 300 };

// カード係: 急行・特急（個数）と牛歩（上限）はストアの pendingDiceCount / pendingDiceCap から読む（無ければ1個・上限なし）
type DiceExtras = { pendingDiceCount?: number | null; pendingDiceCap?: number | null };
const selectDiceCount = (s: object) => clampDiceCount((s as DiceExtras).pendingDiceCount ?? 1);
const selectDiceCap = (s: object) => {
  const cap = (s as DiceExtras).pendingDiceCap;
  return typeof cap === 'number' && cap >= 1 ? cap : null;
};

interface RollResult {
  total: number;
  faces: number[];
}

function remarkFor(r: RollResult, capped: boolean): string | null {
  const n = r.faces.length;
  if (n === 1) return capped ? '牛歩中…のろのろ' : RESULT_REMARK[r.total] ?? null;
  if (r.faces.every(v => v === 6)) return '最高の出目！';
  if (r.faces.every(v => v === r.faces[0])) return 'ゾロ目！';
  return null;
}

/** 大当たり（全部6、または複数個のゾロ目） */
function isJackpot(r: RollResult): boolean {
  return r.faces.every(v => v === 6) || (r.faces.length > 1 && r.faces.every(v => v === r.faces[0]));
}

export default function RouletteOverlay() {
  const rollDice = useGameStore(s => s.rollDice);
  const player = useGameStore(s => s.players[s.currentPlayerIndex]);
  const diceCount = useGameStore(selectDiceCount);
  const diceCap = useGameStore(selectDiceCap);
  const [result, setResult] = useState<RollResult | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }, []);

  const handleResult = useCallback((total: number, faces: number[]) => {
    const r = { total, faces };
    playDiceLand();
    if (isJackpot(r)) playGood();
    setResult(r);
    const hold = RESULT_HOLD_MS + (faces.length > 1 ? RESULT_HOLD_EXTRA_MS : 0);
    timers.current.push(window.setTimeout(() => rollDice(total), hold));
  }, [rollDice]);

  const { isSpinning, faces, rollId, rollMs, count, spin: rollNow } = useRoulette(handleResult, { count: diceCount, cap: diceCap });
  // 動きを減らす設定（rollMs が短い）ときはずらさない
  const stagger = count > 1 && rollMs >= 1000 ? DICE_STAGGER_MS : 0;
  const dieMs = (i: number) => rollMs - (count - 1 - i) * stagger;

  const spin = useCallback(() => {
    playDiceRoll();
    rollNow();
    // 先に止まるサイコロにも着地の音（最後の1個は handleResult で鳴らす）
    for (let i = 0; i < count - 1 && stagger > 0; i++) {
      timers.current.push(window.setTimeout(playDiceLand, rollMs - (count - 1 - i) * stagger));
    }
  }, [rollNow, count, stagger, rollMs]);

  const canRoll = !isSpinning && result === null;
  const size = DIE_SIZE[count] ?? 100;
  const jackpot = result !== null && isJackpot(result);
  const remark = result ? remarkFor(result, diceCap !== null) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ai-950/65 backdrop-blur-sm">
      {jackpot && <Confetti variant="kin" mode="burst" count={34 + (count - 1) * 10} seed={rollId + 3} originY="42%" />}
      <div className="text-center px-4">
        <p className="text-lg text-washi/75 mb-2 font-mincho">
          <span style={{ color: player.color }} className="font-bold">{player.name}</span> <Ruby>の番</Ruby>
        </p>

        {/* カードの効果（急行・特急・牛歩） */}
        {(count > 1 || diceCap !== null) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-1" role="status">
            {count > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-kin-400/70 bg-kin-500/15 px-3 py-0.5 text-sm font-bold font-mincho text-kin-300">
                <Ruby>{count === 3 ? '特急' : '急行'}</Ruby>
                <span className="text-washi/85">・<Ruby>{`サイコロ${count}個`}</Ruby></span>
              </span>
            )}
            {diceCap !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-shu-400/70 bg-shu-600/20 px-3 py-0.5 text-sm font-bold font-mincho text-shu-400">
                <Ruby>牛歩中</Ruby>
                <span className="text-washi/85">・<Ruby>{`出目は${diceCap}まで`}</Ruby></span>
              </span>
            )}
          </div>
        )}

        {/* サイコロ（和紙の盆に放り上げる） */}
        <div className="relative mx-auto flex items-center justify-center" style={{ width: 'min(92vw, 340px)', height: 230 }}>
          {result !== null && <div className="fx-rays" />}
          <div
            className="absolute left-1/2 bottom-3 -translate-x-1/2 h-10 rounded-[50%] bg-ai-900/60 border border-kin-500/25"
            style={{ width: TRAY_WIDTH[count] ?? 208 }}
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-center">
            {faces.map((v, i) => (
              <div key={i} style={count > 1 ? { margin: `0 ${-size * 0.14}px` } : undefined}>
                <Dice3D
                  value={v}
                  rollId={rollId}
                  spinSeed={i}
                  rolling={isSpinning}
                  durationMs={dieMs(i)}
                  size={size}
                  onClick={canRoll ? spin : undefined}
                />
              </div>
            ))}
          </div>
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
              {result.faces.length > 1 && (
                <div className="flex items-center gap-1.5 mb-1 text-washi/70 font-mincho text-base" aria-label={`${result.faces.join('＋')}`}>
                  {result.faces.map((v, i) => (
                    <Fragment key={i}>
                      {i > 0 && <span aria-hidden="true">＋</span>}
                      <MiniDie value={v} size={24} />
                    </Fragment>
                  ))}
                  <span aria-hidden="true">＝</span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="font-brush text-7xl leading-none kinpaku" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))' }}>{result.total}</span>
                <span className="font-mincho text-lg font-bold text-washi"><Ruby>マス進む</Ruby></span>
              </div>
              {remark && (
                <span className={`font-mincho text-sm mt-1 ${jackpot ? 'text-kin-300' : diceCap !== null ? 'text-shu-400' : 'text-washi/60'}`}><Ruby>{remark}</Ruby></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
