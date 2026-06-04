import type { BoardNode, RouteTheme } from '../../game/types';

interface MapEdgeProps {
  from: BoardNode;
  to: BoardNode;
}

// ノードがどの「島」に属するか (誤接続防止)
const OKINAWA_IDS = new Set(['amami', 'tokunoshima', 'naha', 'goal', 'r_amami_tokunoshima', 'r_yakushima_amami', 'r_naha_goal']);
const TANEGASHIMA_IDS = new Set(['tanegashima', 'yakushima', 'r_tanegashima_yakushima', 'r_kagoshima_tanegashima', 'r_kagoshima_yakushima']);
function islandOf(n: BoardNode): string {
  if (OKINAWA_IDS.has(n.id)) return 'okinawa';
  if (TANEGASHIMA_IDS.has(n.id)) return 'tanegashima';
  if (n.region === 'hokkaido') return 'hokkaido';
  if (n.region === 'shikoku') return 'shikoku';
  if (n.region === 'kyushu') return 'kyushu';
  return 'honshu';
}

// 両端が同じ routeTheme なら、テーマに合った色の連続線を描く。
// それ以外（混在/異種）は既定の金色点線（街道）。
// 例外: from と to が異なる島に属する場合は、必ず 'sea'(海路) として描く。
function sharedTheme(from: BoardNode, to: BoardNode): RouteTheme | null {
  // 島跨ぎは強制 sea
  if (islandOf(from) !== islandOf(to)) return 'sea';
  if (from.routeTheme && from.routeTheme === to.routeTheme) return from.routeTheme;
  // 一方が route で他方が capital/fishing 等の固定マスのとき、route 側のテーマで描く
  if (from.type === 'route' && from.routeTheme && to.type !== 'route') return from.routeTheme;
  if (to.type === 'route' && to.routeTheme && from.type !== 'route') return to.routeTheme;
  return null;
}

const THEME_STROKE: Record<RouteTheme, string> = {
  sea: 'rgba(96,160,210,0.55)',     // 海路: 青
  river: 'rgba(120,200,210,0.5)',    // 河川: 水色
  mountain: 'rgba(180,150,90,0.45)', // 峠: 茶
  town: 'rgba(220,200,150,0.5)',     // 街道: ベージュ
};

export default function MapEdge({ from, to }: MapEdgeProps) {
  const theme = sharedTheme(from, to);
  if (theme) {
    const color = THEME_STROKE[theme];
    return (
      <g aria-hidden="true">
        {/* 影 */}
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(6,18,31,0.45)" strokeWidth="4.8" strokeLinecap="round" />
        {theme === 'sea' || theme === 'river' ? (
          // 波打つ連続線（海路/河川） — 実線にやや厚みを出して川/海路らしく
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        ) : theme === 'mountain' ? (
          // 峠: 茶系の長点線（峠道）
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2.1" strokeDasharray="3,3" strokeLinecap="round" />
        ) : (
          // 街道宿: ベージュの実線
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2.1" strokeLinecap="round" />
        )}
      </g>
    );
  }
  // 既定: 金の点線航路
  return (
    <g aria-hidden="true">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(6,18,31,0.45)" strokeWidth="4.8" strokeLinecap="round" />
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(212,168,67,0.5)"
        strokeWidth="2.1"
        strokeDasharray="1.2,6.6"
        strokeLinecap="round"
      />
    </g>
  );
}
