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
  const offset = totalPlayers > 1 ? (index - (totalPlayers - 1) / 2) * 3.5 : 0;
  const x = node.x + offset;
  const y = node.y - 5.5;

  return (
    <g
      aria-hidden="true"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.7s ease-in-out',
      }}
    >
      {/* 接地影（マスの上） */}
      <ellipse cx={0} cy={6} rx={2.1} ry={0.7} fill="rgba(6,18,31,0.45)" />

      {/* ピン本体（先端がマスを指す） */}
      <path
        d="M 0,6 L -2.2,0.6 A 2.9 2.9 0 1 1 2.2,0.6 Z"
        fill={player.color}
        stroke="#f1d893"
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      {/* 上面の照り */}
      <ellipse cx={-0.7} cy={-1.8} rx={1} ry={0.7} fill="#ffffff" opacity="0.35" />

      {/* 番号の白丸 */}
      <circle cx={0} cy={-1} r={1.7} fill="#fbf6e8" />
      <text
        x={0}
        y={-0.95}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="2.3"
        fill={player.color}
        fontWeight="bold"
        fontFamily='"Shippori Mincho", serif'
        className="pointer-events-none select-none"
      >
        {player.id + 1}
      </text>
    </g>
  );
}
