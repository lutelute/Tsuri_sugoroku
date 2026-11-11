// 行き先のおすすめ（損得係）: いまの分かれ道のおすすめ順を返すフック。
// 並べ方と理由は game/pathAdvice.ts（CPU の道選びと同じ点。人は堅実型の重み・乱数なし）。
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { pathContextOf, rankPaths } from '../../game/pathAdvice';
import type { RankedPath } from '../../game/pathAdvice';

/** いまの分かれ道のおすすめ順。CPU の手番・分かれ道でないとき・設定「おすすめ」が切のときは null */
export function usePathAdvice(): RankedPath[] | null {
  const enabled = useSettingsStore(s => s.adviceEnabled);
  const st = useGameStore(
    useShallow(s => ({
      phase: s.turnPhase,
      players: s.players,
      currentPlayerIndex: s.currentPlayerIndex,
      reachableNodes: s.reachableNodes,
      settings: s.settings,
      city: s.city,
      turn: s.turn,
      cityGoalClaims: s.cityGoalClaims,
      firstFinishTurn: s.firstFinishTurn,
    })),
  );
  return useMemo(() => {
    if (!enabled || st.phase !== 'path_selection' || st.reachableNodes.length === 0) return null;
    const player = st.players[st.currentPlayerIndex];
    if (!player || player.isCpu) return null;
    return rankPaths(pathContextOf(st));
  }, [enabled, st]);
}
