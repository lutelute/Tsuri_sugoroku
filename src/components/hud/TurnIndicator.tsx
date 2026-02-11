import { useGameStore } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { computeDistanceToGoal } from '../../utils/pathfinding';

const distanceToGoal = computeDistanceToGoal();

export default function TurnIndicator() {
  const { turn, players, currentPlayerIndex, turnPhase, settings } = useGameStore();
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(player?.currentNode || '');
  const remainingDist = player ? distanceToGoal.get(player.currentNode) : undefined;

  const phaseLabels: Record<string, string> = {
    idle: 'サイコロを振ろう',
    roulette: 'サイコロ回転中...',
    path_selection: '移動先を選んでください',
    moving: '移動中...',
    node_action: 'マスのアクション',
    fishing: '釣り中',
    shop: 'ショップ',
    event: 'イベント発生！',
    rest: '休憩中',
    action_choice: 'アクション選択',
    turn_end: 'ターン終了',
  };

  return (
    <div
      className="backdrop-blur-sm px-4 py-2 flex items-center justify-between text-sm transition-all duration-500 ease-in-out"
      style={{
        backgroundColor: player?.color ? `${player.color}15` : 'rgba(0,0,0,0.3)',
        borderBottom: `2px solid ${player?.color || 'transparent'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-white/50 transition-opacity duration-300">
          Turn {turn}{settings.maxTurns > 0 ? `/${settings.maxTurns}` : ''}
        </span>
        <span className="text-white/30">|</span>
        <span
          className="font-bold transition-all duration-500 ease-in-out"
          style={{ color: player?.color }}
        >
          {player?.name}
        </span>
      </div>

      <div className="flex items-center gap-2 text-white/60 transition-opacity duration-300">
        {player && player.fishBonusMultiplier > 1 && (
          <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
            x{player.fishBonusMultiplier} ({player.fishBonusTurnsLeft}T)
          </span>
        )}
        {node && <span className="mr-2">{node.name}</span>}
        {remainingDist !== undefined && remainingDist > 0 && (
          <span className="text-cyan-300/80 text-xs">
            ゴールまであと {remainingDist} マス
          </span>
        )}
        <span>{phaseLabels[turnPhase] || ''}</span>
      </div>
    </div>
  );
}
