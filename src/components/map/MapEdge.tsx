import { memo } from 'react';
import type { BoardNode, RouteTheme } from '../../game/types';
import { BOARD_EDGES } from '../../data/boardEdges';
import { NODE_MAP } from '../../data/boardNodes';
import { curvePath } from './edgeGeometry';

// ノードがどの「島」に属するか (島跨ぎは海路として描く)
const OKINAWA_IDS = new Set(['amami', 'tokunoshima', 'naha', 'goal', 'r_amami_tokunoshima', 'r_yakushima_amami', 'r_naha_goal', 'r_tokunoshima_naha']);
const TANEGASHIMA_IDS = new Set(['tanegashima', 'yakushima', 'r_tanegashima_yakushima']);
function islandOf(n: BoardNode): string {
  if (OKINAWA_IDS.has(n.id)) return 'okinawa';
  if (TANEGASHIMA_IDS.has(n.id)) return 'tanegashima';
  if (n.region === 'hokkaido') return 'hokkaido';
  if (n.region === 'shikoku') return 'shikoku';
  if (n.region === 'kyushu') return 'kyushu';
  return 'honshu';
}

// 両端が同じ routeTheme なら、テーマに合った線を描く。島跨ぎは必ず海路。
function sharedTheme(from: BoardNode, to: BoardNode): RouteTheme | null {
  if (islandOf(from) !== islandOf(to)) return 'sea';
  if (from.routeTheme && from.routeTheme === to.routeTheme) return from.routeTheme;
  if (from.type === 'route' && from.routeTheme && to.type !== 'route') return from.routeTheme;
  if (to.type === 'route' && to.routeTheme && from.type !== 'route') return to.routeTheme;
  return null;
}

const MAJOR = new Set(['capital', 'fishing_special', 'start', 'goal']);

// テーマ別の線（和地図の街道図を意識: 街道=朱、峠=焦茶の破線、川=藍、海路=白の破線）
const THEME_STYLE: Record<RouteTheme | 'default', { color: string; dash?: string; w: number }> = {
  town: { color: '#b8452c', w: 2.6 },
  mountain: { color: '#6b4b2a', dash: '4 3', w: 2.5 },
  river: { color: '#2f7fb4', w: 2.6 },
  sea: { color: '#e6f2ff', dash: '5 4', w: 2.2 },
  default: { color: '#d4a843', dash: '1.6 6', w: 2.4 },
};

interface MapEdgeProps {
  from: BoardNode;
  to: BoardNode;
}

function MapEdge({ from, to }: MapEdgeProps) {
  const theme = sharedTheme(from, to) ?? 'default';
  const style = THEME_STYLE[theme];
  const major = MAJOR.has(from.type) && MAJOR.has(to.type);
  const k = major ? 1.3 : 1;
  const d = curvePath(from, to);
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(20,16,12,0.5)" strokeWidth={(style.w + 2.6) * k} strokeLinecap="round" />
      <path d={d} fill="none" stroke={style.color} strokeWidth={style.w * k} strokeDasharray={style.dash} strokeLinecap="round" />
    </g>
  );
}

/** 全エッジの静的レイヤー（盤面は不変なので一度だけ描画） */
function MapEdgesImpl() {
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {BOARD_EDGES.map((edge, i) => {
        const from = NODE_MAP.get(edge.from);
        const to = NODE_MAP.get(edge.to);
        if (!from || !to) return null;
        return <MapEdge key={i} from={from} to={to} />;
      })}
    </g>
  );
}

export const MapEdges = memo(MapEdgesImpl);
export default MapEdges;
