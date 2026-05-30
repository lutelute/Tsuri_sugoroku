import type { BoardNode, NodeType } from '../../game/types';
import { computeDistanceToGoal } from '../../utils/pathfinding';

const distanceToGoal = computeDistanceToGoal();

interface MapNodeProps {
  node: BoardNode;
  isReachable: boolean;
  isCurrentPlayer: boolean;
  steps?: number;
  onClick?: () => void;
}

// 和モダン パレット（藍×朱×金を基調に）
const NODE_COLORS: Record<NodeType, string> = {
  start: '#2f9e6e',
  goal: '#e34a33',
  fishing: '#2e5e8c',
  fishing_special: '#8b6fc9',
  shop: '#d4a843',
  event_good: '#2f9e6e',
  event_bad: '#e34a33',
  event_random: '#a06cc9',
  rest: '#1aa6a0',
};

// 絵文字をやめ、明朝の漢字記号で種別を表す
const NODE_GLYPH: Record<NodeType, string> = {
  start: '',   // 鳥居グラフィック
  goal: '',    // 旗グラフィック
  fishing: '釣',
  fishing_special: '名',
  shop: '店',
  event_good: '吉',
  event_bad: '凶',
  event_random: '籤',
  rest: '湯',
};

function darken(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - a)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - a)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - a)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function MapNode({ node, isReachable, isCurrentPlayer, steps, onClick }: MapNodeProps) {
  const color = NODE_COLORS[node.type];
  const special = node.type === 'start' || node.type === 'goal';
  const R = special ? 3.6 : 2.6;
  const dist = distanceToGoal.get(node.id);
  const rim = isCurrentPlayer ? '#ffffff' : 'rgba(212,168,67,0.85)';
  const cx = node.x;
  const cy = node.y;

  return (
    <g
      className={isReachable ? 'cursor-pointer' : ''}
      onClick={isReachable ? onClick : undefined}
    >
      <title>
        {node.name}{dist !== undefined && dist > 0 ? ` - ゴールまで${dist}マス` : dist === 0 ? ' - ゴール' : ''}
      </title>

      {/* 透明な大きいタップ判定（到達可能時は広く、非到達は透過） */}
      <circle
        cx={cx}
        cy={cy}
        r={isReachable ? 8 : 4}
        fill="transparent"
        className={isReachable ? 'cursor-pointer' : 'pointer-events-none'}
      />

      {/* 到達可能ハイライト（金の波紋） */}
      {isReachable && (
        <circle cx={cx} cy={cy} r={R + 2.2} fill="rgba(241,216,147,0.16)" stroke="#f1d893" strokeWidth="0.6" className="pointer-events-none">
          <animate attributeName="r" values={`${R + 1.6};${R + 3.4};${R + 1.6}`} dur="1.1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.45;1" dur="1.1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* 影 */}
      <circle cx={cx} cy={cy + 0.5} r={R} fill="rgba(6,18,31,0.5)" className="pointer-events-none" />

      {/* 本体ディスク */}
      <circle cx={cx} cy={cy} r={R} fill={color} stroke={rim} strokeWidth={isCurrentPlayer ? 0.7 : 0.5} className="pointer-events-none" />
      {/* 内側の陰 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={darken(color, 0.35)} strokeWidth="0.3" opacity="0.6" className="pointer-events-none" />
      {/* 上面の照り */}
      <ellipse cx={cx} cy={cy - R * 0.32} rx={R * 0.62} ry={R * 0.34} fill="#ffffff" opacity="0.22" className="pointer-events-none" />

      {/* 種別グリフ / 特殊グラフィック */}
      {node.type === 'start' ? (
        <g className="pointer-events-none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" fill="none">
          <path d={`M ${cx - 2.4},${cy - 1.6} Q ${cx},${cy - 2.2} ${cx + 2.4},${cy - 1.6}`} />
          <path d={`M ${cx - 2},${cy - 0.5} L ${cx + 2},${cy - 0.5}`} />
          <path d={`M ${cx - 1.4},${cy - 1.7} L ${cx - 1.4},${cy + 1.9}`} />
          <path d={`M ${cx + 1.4},${cy - 1.7} L ${cx + 1.4},${cy + 1.9}`} />
        </g>
      ) : node.type === 'goal' ? (
        <g className="pointer-events-none">
          <path d={`M ${cx - 1.7},${cy - 2.1} L ${cx - 1.7},${cy + 2.1}`} stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" />
          <path d={`M ${cx - 1.7},${cy - 2.1} L ${cx + 1.9},${cy - 1.3} L ${cx - 1.7},${cy - 0.4} Z`} fill="#f1d893" stroke="#b8862f" strokeWidth="0.3" />
        </g>
      ) : (
        <text
          x={cx}
          y={cy + R * 0.36}
          textAnchor="middle"
          fontSize={R * 1.35}
          fill="#ffffff"
          fontWeight="700"
          fontFamily='"Shippori Mincho", serif'
          className="pointer-events-none select-none"
        >
          {NODE_GLYPH[node.type]}
        </text>
      )}

      {/* 歩数バッジ */}
      {isReachable && steps !== undefined && (
        <>
          <circle cx={cx + R + 1} cy={cy - R - 1} r="2" fill="#f1d893" stroke="#6b4e16" strokeWidth="0.3" className="pointer-events-none" />
          <text x={cx + R + 1} y={cy - R - 0.4} textAnchor="middle" fontSize="2.2" fill="#3a2a0e" fontWeight="bold" className="pointer-events-none select-none">
            {steps}
          </text>
        </>
      )}

      {/* ラベル */}
      <text
        x={cx}
        y={cy + R + 2.8}
        textAnchor="middle"
        fontSize="2.2"
        fill={isReachable ? '#f1d893' : '#e9dcc0'}
        opacity={isReachable ? 0.95 : 0.62}
        fontFamily='"Shippori Mincho", serif'
        className="pointer-events-none select-none"
        fontWeight={isReachable ? 'bold' : 'normal'}
      >
        {node.name}
      </text>
    </g>
  );
}
