import type { BoardNode, NodeType } from '../../game/types';
import { computeDistanceToGoal } from '../../utils/pathfinding';

const distanceToGoal = computeDistanceToGoal();

interface MapNodeProps {
  node: BoardNode;
  isReachable: boolean;
  isCurrentPlayer: boolean;
  onClick?: () => void;
}

const NODE_COLORS: Record<NodeType, string> = {
  start: '#10b981',
  goal: '#f43f5e',
  fishing: '#3b82f6',
  fishing_special: '#8b5cf6',
  shop: '#f59e0b',
  event_good: '#22c55e',
  event_bad: '#ef4444',
  event_random: '#a855f7',
  rest: '#14b8a6',
};

const NODE_ICONS: Record<NodeType, string> = {
  start: '🚩',
  goal: '🏁',
  fishing: '🐟',
  fishing_special: '🌟',
  shop: '🏪',
  event_good: '✨',
  event_bad: '⚡',
  event_random: '❓',
  rest: '🏖️',
};

export default function MapNode({ node, isReachable, isCurrentPlayer, onClick }: MapNodeProps) {
  const color = NODE_COLORS[node.type];
  const radius = node.type === 'start' || node.type === 'goal' ? 2.5 : 2;
  const labelFontSize = 1.8;
  const iconFontSize = 2;
  const dist = distanceToGoal.get(node.id);

  return (
    <g
      className={`${isReachable ? 'cursor-pointer' : ''}`}
      onClick={isReachable ? onClick : undefined}
    >
      {/* ツールチップ: ノード名 + ゴールまでの距離 */}
      <title>
        {node.name}{dist !== undefined && dist > 0 ? ` - ゴールまで${dist}マス` : dist === 0 ? ' - ゴール' : ''}
      </title>

      {/* 透明な大きいクリック判定エリア */}
      <circle
        cx={node.x}
        cy={node.y}
        r={isReachable ? 6 : 4}
        fill="transparent"
        className={isReachable ? 'cursor-pointer' : ''}
      />

      {/* 到達可能ハイライト */}
      {isReachable && (
        <>
          {/* 塗りつぶしハイライト */}
          <circle
            cx={node.x}
            cy={node.y}
            r={radius + 2}
            fill="rgba(251, 191, 36, 0.15)"
            stroke="#fbbf24"
            strokeWidth="0.6"
          >
            <animate
              attributeName="r"
              values={`${radius + 1.5};${radius + 3};${radius + 1.5}`}
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* ノード本体 */}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={color}
        stroke={isCurrentPlayer ? '#ffffff' : 'rgba(0,0,0,0.3)'}
        strokeWidth={isCurrentPlayer ? 0.5 : 0.3}
        opacity={0.9}
      />

      {/* アイコン */}
      <text
        x={node.x}
        y={node.y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={iconFontSize}
        className="pointer-events-none select-none"
      >
        {NODE_ICONS[node.type]}
      </text>

      {/* ラベル */}
      <text
        x={node.x}
        y={node.y + 4.5}
        textAnchor="middle"
        fontSize={labelFontSize}
        fill="white"
        opacity="0.7"
        className="pointer-events-none select-none"
        fontWeight={isReachable ? 'bold' : 'normal'}
      >
        {node.name}
      </text>
    </g>
  );
}
