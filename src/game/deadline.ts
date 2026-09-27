// 釣り旅の締め切り: 最初の人がゴールしてから GOAL_CLOSE_ROUNDS 巡で終わる。
// ただしゴールへ直行して早く終わらせる抜け道を防ぐため、MIN_CLOSE_TURN 巡目より前には終わらない。
import { GOAL_CLOSE_ROUNDS } from './constants';

/** 締め切りがこれより前の巡には来ない（難易度調整係の計測: 直行の勝率が 42〜56% → 7%） */
export const MIN_CLOSE_TURN = 40;

/**
 * 釣り旅で遊べる最後の巡。誰もゴールしていなければ maxTurns（0 以下なら無制限として Infinity）。
 * ゴールした人がいれば max(MIN_CLOSE_TURN, 最初のゴールの巡 + GOAL_CLOSE_ROUNDS) と maxTurns の小さい方。
 */
export function fishingLastTurn(firstFinishTurn: number | null, maxTurns: number): number {
  const cap = maxTurns > 0 ? maxTurns : Infinity;
  if (firstFinishTurn == null) return cap;
  return Math.min(cap, Math.max(MIN_CLOSE_TURN, firstFinishTurn + GOAL_CLOSE_ROUNDS));
}
