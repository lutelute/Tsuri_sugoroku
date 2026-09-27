import { memo, useEffect, useState } from 'react';
import type { Player } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';

/** 1マス進むのにかける時間（GameScreen の到着演出待ちと共有） */
export const MOVE_STEP_MS = 190;

export interface MoveInfo {
  playerIndex: number;
  path: string[];
  seq: number;
}

interface PlayerTokenProps {
  player: Player;
  index: number;
  totalPlayers: number;
  isCurrent?: boolean;
  move: MoveInfo | null;
  /** 同じマスにいる駒の中での並び順 */
  stackIndex: number;
  stackSize: number;
}

function PlayerTokenImpl({ player, index, isCurrent, move, stackIndex, stackSize }: PlayerTokenProps) {
  // 表示上の現在マス（移動中は経路に沿って1マスずつ進める）
  const [shownNode, setShownNode] = useState(player.currentNode);

  useEffect(() => {
    const timers: number[] = [];
    const path = move && move.playerIndex === index ? move.path : null;
    if (path && path.length > 1 && path[path.length - 1] === player.currentNode) {
      path.slice(1).forEach((nid, i) => {
        timers.push(window.setTimeout(() => setShownNode(nid), i * MOVE_STEP_MS));
      });
    } else {
      timers.push(window.setTimeout(() => setShownNode(player.currentNode), 0));
    }
    return () => timers.forEach(t => clearTimeout(t));
    // move.seq が変わったとき（新しい移動）と currentNode が変わったときだけ再生
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentNode, move?.seq]);

  const node = NODE_MAP.get(shownNode) ?? NODE_MAP.get(player.currentNode);
  if (!node) return null;

  const moving = shownNode !== player.currentNode;
  const offset = stackSize > 1 && !moving ? (stackIndex - (stackSize - 1) / 2) * 13 : 0;
  const x = node.x + 12 + offset;
  const y = node.y - 22;

  return (
    <g
      aria-hidden="true"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: `transform ${moving ? MOVE_STEP_MS - 20 : 450}ms ${moving ? 'linear' : 'ease-in-out'}`,
      }}
    >
      {/* 現在プレイヤーの強調オーラ (脈動) */}
      {isCurrent && (
        <circle cx={0} cy={2} r={14} fill="none" stroke={player.color} strokeWidth="1.8" opacity="0.7">
          <animate attributeName="r" values="12;20;12" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.6s" repeatCount="indefinite" />
        </circle>
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

const PlayerToken = memo(PlayerTokenImpl);
export default PlayerToken;
