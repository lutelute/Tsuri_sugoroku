import type { Player } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';

interface PlayerTokenProps {
  player: Player;
  index: number;
  totalPlayers: number;
}

export default function PlayerToken({ player, index, totalPlayers }: PlayerTokenProps) {
  const node = NODE_MAP.get(player.currentNode);
  if (!node) return null;

  // 複数プレイヤーが同じノードにいる場合のオフセット
  const offset = totalPlayers > 1 ? (index - (totalPlayers - 1) / 2) * 2.2 : 0;
  const x = node.x + offset;
  const y = node.y - 3.5;

  return (
    <g
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.7s ease-in-out',
      }}
    >
      {/* 影 */}
      <ellipse
        cx={0}
        cy={2}
        rx={1.2}
        ry={0.4}
        fill="rgba(0,0,0,0.3)"
      />

      {/* プレイヤーマーカー */}
      <circle
        cx={0}
        cy={0}
        r={1.5}
        fill={player.color}
        stroke="white"
        strokeWidth="0.4"
      />

      {/* プレイヤー番号 */}
      <text
        x={0}
        y={0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="1.4"
        fill="white"
        fontWeight="bold"
        className="pointer-events-none select-none"
      >
        {player.id + 1}
      </text>
    </g>
  );
}
