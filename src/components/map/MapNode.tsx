import type { BoardNode, NodeType, RouteTheme } from '../../game/types';
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
  route: '#7a8a9a',
  capital: '#e8a23a',
};

// 街道テーマ別の色（routeノード時に上書き）
const ROUTE_THEME_COLORS: Record<RouteTheme, string> = {
  mountain: '#7a6a4a',  // 茶系（峠）
  sea: '#4a6a90',       // 藍系（海路）
  river: '#5a8a98',     // 水色系（河川）
  town: '#8a7a64',      // 茶白系（街道宿）
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
  route: '道',
  capital: '都',
};

function darken(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - a)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - a)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - a)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function MapNode({ node, isReachable, isCurrentPlayer, steps, onClick }: MapNodeProps) {
  const isCapital = node.type === 'capital';
  const isRoute = node.type === 'route';
  // routeはrouteThemeに応じて色を上書き
  const color = isRoute && node.routeTheme ? ROUTE_THEME_COLORS[node.routeTheme] : NODE_COLORS[node.type];
  const special = node.type === 'start' || node.type === 'goal' || isCapital;
  // v3.1.x: 座標×4.5 に対してノード半径は相対的に縮小し、視覚的な余白を確保。
  // タップ判定は別途大きいまま（押しやすさは維持）。
  const R = isCapital ? 9.5 : isRoute ? 3.8 : special ? 8.5 : 6;
  const dist = distanceToGoal.get(node.id);
  const rim = isCurrentPlayer ? '#ffffff' : isCapital ? '#fff4cf' : 'rgba(212,168,67,0.85)';
  const cx = node.x;
  const cy = node.y;

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
    >
      <title>
        {node.name}{dist !== undefined && dist > 0 ? ` - ゴールまで${dist}マス` : dist === 0 ? ' - ゴール' : ''}
      </title>

      {/* 透明な大きいタップ判定（v3: ×3スケール。常時クリック可能） */}
      <circle
        cx={cx}
        cy={cy}
        r={isReachable ? 28 : 14}
        fill="transparent"
        className="cursor-pointer"
      />

      {/* capitalノード: 常時光る金のオーラ */}
      {isCapital && (
        <>
          <circle cx={cx} cy={cy} r={R + 10.5} fill="rgba(241,216,147,0.10)" className="pointer-events-none">
            <animate attributeName="r" values={`${R + 7.5};${R + 13.5};${R + 7.5}`} dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="#f1d893" strokeWidth="1.35" opacity="0.7" className="pointer-events-none" />
        </>
      )}

      {/* 到達可能ハイライト（金の波紋） */}
      {isReachable && (
        <circle cx={cx} cy={cy} r={R + 6.6} fill="rgba(241,216,147,0.16)" stroke="#f1d893" strokeWidth="1.8" className="pointer-events-none">
          <animate attributeName="r" values={`${R + 4.8};${R + 10.2};${R + 4.8}`} dur="1.1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.45;1" dur="1.1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* 影 */}
      <circle cx={cx} cy={cy + 1.5} r={R} fill="rgba(6,18,31,0.5)" className="pointer-events-none" />

      {/* 本体ディスク */}
      <circle cx={cx} cy={cy} r={R} fill={color} stroke={rim} strokeWidth={isCurrentPlayer ? 2.1 : 1.5} className="pointer-events-none" />
      {/* 内側の陰 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={darken(color, 0.35)} strokeWidth="0.9" opacity="0.6" className="pointer-events-none" />
      {/* 上面の照り */}
      <ellipse cx={cx} cy={cy - R * 0.32} rx={R * 0.62} ry={R * 0.34} fill="#ffffff" opacity="0.22" className="pointer-events-none" />

      {/* 種別グリフ / 特殊グラフィック（v3: ×3スケール） */}
      {node.type === 'start' ? (
        <g className="pointer-events-none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" fill="none">
          <path d={`M ${cx - 7.2},${cy - 4.8} Q ${cx},${cy - 6.6} ${cx + 7.2},${cy - 4.8}`} />
          <path d={`M ${cx - 6},${cy - 1.5} L ${cx + 6},${cy - 1.5}`} />
          <path d={`M ${cx - 4.2},${cy - 5.1} L ${cx - 4.2},${cy + 5.7}`} />
          <path d={`M ${cx + 4.2},${cy - 5.1} L ${cx + 4.2},${cy + 5.7}`} />
        </g>
      ) : node.type === 'goal' ? (
        <g className="pointer-events-none">
          <path d={`M ${cx - 5.1},${cy - 6.3} L ${cx - 5.1},${cy + 6.3}`} stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d={`M ${cx - 5.1},${cy - 6.3} L ${cx + 5.7},${cy - 3.9} L ${cx - 5.1},${cy - 1.2} Z`} fill="#f1d893" stroke="#b8862f" strokeWidth="0.9" />
        </g>
      ) : isRoute ? (
        // 街道テーマ別の小グラフィック
        <g className="pointer-events-none">
          {node.routeTheme === 'mountain' && (
            <path d={`M ${cx - 3.6},${cy + 2.1} L ${cx},${cy - 3.3} L ${cx + 3.6},${cy + 2.1} Z`} fill="#fff" opacity="0.85" />
          )}
          {node.routeTheme === 'sea' && (
            <path d={`M ${cx - 4.2},${cy} Q ${cx - 2.1},${cy - 2.4} ${cx},${cy} T ${cx + 4.2},${cy}`} fill="none" stroke="#ffffff" strokeWidth="1.65" strokeLinecap="round" opacity="0.9" />
          )}
          {node.routeTheme === 'river' && (
            <g stroke="#ffffff" strokeWidth="1.35" strokeLinecap="round" opacity="0.85">
              <path d={`M ${cx - 3.9},${cy - 1.5} Q ${cx},${cy - 2.7} ${cx + 3.9},${cy - 1.2}`} fill="none" />
              <path d={`M ${cx - 3.9},${cy + 1.2} Q ${cx},${cy + 2.7} ${cx + 3.9},${cy + 1.5}`} fill="none" />
            </g>
          )}
          {node.routeTheme === 'town' && (
            <rect x={cx - 3.3} y={cy - 2.7} width="6.6" height="5.4" rx="0.9" fill="#fff" opacity="0.85" />
          )}
          {!node.routeTheme && (
            <circle cx={cx} cy={cy} r="1.8" fill="#fff" opacity="0.7" />
          )}
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
          <circle cx={cx + R + 3} cy={cy - R - 3} r="6" fill="#f1d893" stroke="#6b4e16" strokeWidth="0.9" className="pointer-events-none" />
          <text x={cx + R + 3} y={cy - R - 1.2} textAnchor="middle" fontSize="6.6" fill="#3a2a0e" fontWeight="bold" className="pointer-events-none select-none">
            {steps}
          </text>
        </>
      )}

      {/* 地名ラベルは JapanMap 側の専用レイヤーで最前面に描画する（隣接ノードの円に隠れないように） */}
    </g>
  );
}
