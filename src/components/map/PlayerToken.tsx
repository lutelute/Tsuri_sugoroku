import type { Player } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';

interface PlayerTokenProps {
  player: Player;
  index: number;
  totalPlayers: number;
  isCurrent?: boolean;
}

export default function PlayerToken({ player, index, totalPlayers, isCurrent }: PlayerTokenProps) {
  const node = NODE_MAP.get(player.currentNode);
  if (!node) return null;

  const offset = totalPlayers > 1 ? (index - (totalPlayers - 1) / 2) * 12 : 0;
  const x = node.x + 14 + offset;
  const y = node.y - 26;

  return (
    <g
      aria-hidden="true"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.7s ease-in-out',
      }}
    >
      {/* 現在プレイヤーの強調オーラ (脈動) */}
      {isCurrent && (
        <>
          <circle cx={0} cy={2} r={14} fill="none" stroke={player.color} strokeWidth="1.8" opacity="0.7">
            <animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={0} cy={2} r={11} fill={player.color} opacity="0.18">
            <animate attributeName="opacity" values="0.30;0.10;0.30" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* 接地影 */}
      <ellipse cx={0} cy={18} rx={6.3} ry={2.1} fill="rgba(6,18,31,0.45)" />

      {/* ピン本体（先端がマスを指す） */}
      <path
        d="M 0,18 L -6.6,1.8 A 8.7 8.7 0 1 1 6.6,1.8 Z"
        fill={player.color}
        stroke={isCurrent ? '#ffffff' : '#f1d893'}
        strokeWidth={isCurrent ? 2.2 : 1.65}
        strokeLinejoin="round"
      />
      {/* 上面の照り */}
      <ellipse cx={-2.1} cy={-5.4} rx={3} ry={2.1} fill="#ffffff" opacity="0.35" />

      {/* 番号の白丸 */}
      <circle cx={0} cy={-3} r={5.1} fill="#fbf6e8" />
      <text
        x={0}
        y={-2.85}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6.9"
        fill={player.color}
        fontWeight="bold"
        fontFamily='"Shippori Mincho", serif'
        className="pointer-events-none select-none"
      >
        {player.id + 1}
      </text>

      {/* 現在プレイヤーの上に小さな矢印インジケーター */}
      {isCurrent && (
        <path
          d="M 0,-14 L -3,-9 L 3,-9 Z"
          fill="#ffffff"
          stroke={player.color}
          strokeWidth="0.6"
        >
          <animate attributeName="opacity" values="1;0.5;1" dur="1.0s" repeatCount="indefinite" />
        </path>
      )}
    </g>
  );
}
