import { useEffect, useState } from 'react';
import { isGreat } from '../../game/binbo';
import type { BinboState } from '../../game/binbo';
import type { Player } from '../../game/types';
import type { MoveInfo } from './PlayerToken';
import { MOVE_STEP_MS, scaled } from '../../game/tempo';
import { useTempoScale } from '../../store/useSettingsStore';
import { binboSwapDelayMs } from './binboDisplay';
import { useReducedMotion } from '../fx/useReducedMotion';

export interface DisplayedBinbo {
  holder: number | null;
  great: boolean;
}

/**
 * 地図に描く貧乏神の持ち主。ストアの値に少し遅れて追いつく（見た目だけ。ストアはそのまま）。
 * とりついていた人が動いて誰かに移したときは、動いた駒が移り先のマスに着くまで元の駒に乗せておく。
 * 動きを減らす設定では待たずにすぐ付け替える。
 */
export function useDisplayedBinbo(binbo: BinboState | undefined, players: Player[], lastMove: MoveInfo | null): DisplayedBinbo {
  const reduced = useReducedMotion();
  // CPU の手番は速さの設定で駒の1マスが縮むので、付け替えの遅れも同じ倍率にする
  const scale = useTempoScale(!!players[lastMove?.playerIndex ?? -1]?.isCpu);
  const stepMs = scaled(MOVE_STEP_MS, scale);
  const holder = binbo?.playerIndex ?? null;
  const great = isGreat(binbo);
  const [shown, setShown] = useState<DisplayedBinbo>({ holder, great });
  const holderNode = holder !== null ? players[holder]?.currentNode : undefined;

  useEffect(() => {
    if (shown.holder === holder && shown.great === great) return;
    let delay = 0;
    const movedFromShown = !!lastMove && shown.holder !== null && lastMove.playerIndex === shown.holder;
    if (!reduced && holder !== null && holder !== shown.holder && movedFromShown && holderNode) {
      delay = binboSwapDelayMs(lastMove.path, holderNode, stepMs);
    }
    const t = window.setTimeout(() => setShown({ holder, great }), delay);
    return () => clearTimeout(t);
  }, [holder, great, shown.holder, shown.great, reduced, lastMove, holderNode, stepMs]);

  return shown;
}
