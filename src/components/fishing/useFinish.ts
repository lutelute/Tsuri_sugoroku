import { useCallback, useEffect, useRef, useState } from 'react';
import type { FailReason } from './miniGameMeta';
import { buzz, HAPTIC } from './haptics';
import { playCatch, playLineBreak, playMiss } from '../../utils/sound';

export interface FinishState {
  win: boolean;
  reason: FailReason;
}

const WIN_DELAY_MS = 900;
const LOSE_DELAY_MS = 1000;

/**
 * ミニゲームの締め: 勝敗の演出を少し見せてから onSuccess / onFail を呼ぶ（二重呼び出し防止つき）。
 * finish は rAF ループ・タイマー・イベントハンドラのどこから呼んでもよい。
 */
export function useFinish(onSuccess: () => void, onFail: (reason: FailReason) => void) {
  const [finished, setFinished] = useState<FinishState | null>(null);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const successRef = useRef(onSuccess);
  const failRef = useRef(onFail);

  useEffect(() => {
    successRef.current = onSuccess;
    failRef.current = onFail;
  }, [onSuccess, onFail]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const finish = useCallback((win: boolean, reason: FailReason = 'short') => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinished({ win, reason });
    buzz(win ? HAPTIC.catch : reason === 'snap' ? HAPTIC.snap : HAPTIC.miss);
    if (win) playCatch();
    else if (reason === 'snap') playLineBreak();
    else playMiss();
    timerRef.current = window.setTimeout(() => {
      if (win) successRef.current();
      else failRef.current(reason);
    }, win ? WIN_DELAY_MS : LOSE_DELAY_MS);
  }, []);

  /** もう勝敗が決まったか（ループ・ハンドラ内で使う。描画中には呼ばない） */
  const isDone = useCallback(() => doneRef.current, []);

  return { finished, finish, isDone };
}
