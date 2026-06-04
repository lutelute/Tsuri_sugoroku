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

  // 複数プレイヤーが同じノードにいる場合のオフセット。
  // v3.1.x: ノード(R=12) を隠さない位置 (マスの右斜め上) に配置する。
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
      {/* 接地影（マスの上） v3: ×3 */}
      <ellipse cx={0} cy={18} rx={6.3} ry={2.1} fill="rgba(6,18,31,0.45)" />

      {/* ピン本体（先端がマスを指す） */}
      <path
        d="M 0,18 L -6.6,1.8 A 8.7 8.7 0 1 1 6.6,1.8 Z"
        fill={player.color}
        stroke="#f1d893"
        strokeWidth="1.65"
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
    </g>
  );
}
