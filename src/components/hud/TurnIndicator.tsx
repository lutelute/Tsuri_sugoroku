import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { computeDistanceToGoal } from '../../utils/pathfinding';
import { calendarLabel } from '../../game/city';
import { GOAL_CLOSE_ROUNDS } from '../../game/constants';
import Ruby from '../shared/Ruby';

const distanceToGoal = computeDistanceToGoal();

const PHASE_LABELS: Record<string, string> = {
  idle: 'サイコロを振ろう',
  roulette: 'サイコロ回転中...',
  path_selection: '移動先を選んでください',
  moving: '移動中...',
  node_action: 'マスのアクション',
  fishing_choice: '釣り方を選ぼう',
  fishing: '釣り中',
  shop: 'ショップ',
  event: 'イベント発生！',
  rest: '休憩中',
  capital_event: '祭り',
  action_choice: 'アクション選択',
  city: 'まちづくり',
  city_event: 'まちの出来事',
  city_report: '月末の決算',
  turn_end: 'ターン終了',
};

export default function TurnIndicator() {
  const { turn, player, turnPhase, maxTurns, destination, destinationReward, isCity, firstFinishTurn } = useGameStore(
    useShallow(s => ({
      firstFinishTurn: s.firstFinishTurn,
      turn: s.turn,
      player: s.players[s.currentPlayerIndex],
      turnPhase: s.turnPhase,
      maxTurns: s.settings.maxTurns,
      destination: s.city?.destination ?? null,
      destinationReward: s.city?.destinationReward ?? 0,
      isCity: s.settings.mode === 'city',
    })),
  );
  const node = NODE_MAP.get(player?.currentNode || '');
  const remainingDist = player ? distanceToGoal.get(player.currentNode) : undefined;
  const cal = calendarLabel(turn);
  const destName = destination ? NODE_MAP.get(destination)?.name : null;

  return (
    <div
      className="backdrop-blur-sm px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-sm transition-colors duration-500"
      style={{
        backgroundColor: player?.color ? `${player.color}18` : 'rgba(0,0,0,0.3)',
        borderBottom: `2px solid ${player?.color || 'transparent'}`,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="font-mincho text-washi/60 whitespace-nowrap">
          {isCity ? (
            <>{cal.year}<Ruby>年目</Ruby> {cal.month}<Ruby>月</Ruby>{maxTurns > 0 && <span className="text-washi/35 text-xs ml-1">(<Ruby>残り</Ruby>{Math.max(0, maxTurns - turn + 1)})</span>}</>
          ) : (
            <>{turn}{maxTurns > 0 ? `/${maxTurns}` : ''} <Ruby>巡目</Ruby></>
          )}
        </span>
        <span className="text-kin-500/40">｜</span>
        <span key={`${turn}-${player?.id}`} className="fx-rise font-bold font-mincho truncate" style={{ color: player?.color }}>{player?.name}</span>
        {player && player.fishBonusMultiplier > 1 && (
          <span className="bg-kin-500/20 text-kin-300 text-xs font-bold px-2 py-0.5 rounded-full border border-kin-500/35 whitespace-nowrap">
            x{player.fishBonusMultiplier} ({player.fishBonusTurnsLeft}T)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-washi/70 min-w-0 text-xs sm:text-sm">
        {isCity && destName && (
          <span key={destination ?? ''} className="fx-pop whitespace-nowrap bg-shu-600/25 border border-shu-500/40 rounded-full px-2 py-0.5 text-shu-200 font-mincho">
            <Ruby>目的地</Ruby> <Ruby>{destName}</Ruby> <span className="text-kin-300 tabular-nums">¥{destinationReward.toLocaleString()}</span>
          </span>
        )}
        {node && <span className="hidden sm:inline font-mincho truncate"><Ruby>{node.name}</Ruby></span>}
        {!isCity && firstFinishTurn != null && (
          <span className="whitespace-nowrap bg-shu-600/25 border border-shu-500/40 rounded-full px-2 py-0.5 text-shu-200 font-mincho text-xs" title="最初の人がゴールしたので、残り巡数で全体が終わる">
            <Ruby>締切まで</Ruby> {Math.max(0, firstFinishTurn + GOAL_CLOSE_ROUNDS - turn + 1)}<Ruby>巡</Ruby>
          </span>
        )}
        {!isCity && remainingDist !== undefined && remainingDist > 0 && (
          <span className="text-kin-300/75 text-xs whitespace-nowrap">ゴールまで {remainingDist} マス</span>
        )}
        <span key={turnPhase} className="fx-fade-in hidden sm:inline whitespace-nowrap"><Ruby>{PHASE_LABELS[turnPhase] || ''}</Ruby></span>
      </div>
    </div>
  );
}
