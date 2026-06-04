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
  sea: 'rgba(96,170,220,0.75)',      // 海路: 青 (明瞭化)
  river: 'rgba(120,210,220,0.7)',    // 河川: 水色 (明瞭化)
  mountain: 'rgba(190,160,100,0.65)', // 峠: 茶 (明瞭化)
  town: 'rgba(220,200,150,0.7)',     // 街道: ベージュ (明瞭化)
};

// エッジを二次ベジェ曲線として描く (視覚的な交差を緩和)。
// from→to の方向に対して、決定論的な向きに少し膨らませる。
// from.id と to.id の辞書順を比較して、from < to なら左に、from > to なら右にカーブ。
// これで同じ2点間のエッジは常に同じ向きにカーブする。
function curvePath(from: BoardNode, to: BoardNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return `M ${from.x},${from.y} L ${to.x},${to.y}`;
  // 法線
  const px = -dy / len, py = dx / len;
  // 膨らみは長さに応じて (短いエッジは控えめ、長いエッジは大きく)
  const bow = Math.min(len * 0.12, 28);
  // from.id と to.id の辞書順で向きを決定論的に
  const dir = from.id < to.id ? 1 : -1;
  const mx = (from.x + to.x) / 2 + px * bow * dir;
  const my = (from.y + to.y) / 2 + py * bow * dir;
  return `M ${from.x},${from.y} Q ${mx},${my} ${to.x},${to.y}`;
}

export default function MapEdge({ from, to }: MapEdgeProps) {
  const theme = sharedTheme(from, to);
  // 両端が主要マス(capital/fishing_special/start/goal)のエッジは「幹線」として太く
  const isMainBoth =
    (from.type === 'capital' || from.type === 'fishing_special' || from.type === 'start' || from.type === 'goal') &&
    (to.type === 'capital' || to.type === 'fishing_special' || to.type === 'start' || to.type === 'goal');
  const shadowW = isMainBoth ? 7.0 : 5.6;
  const mainW = isMainBoth ? 4.0 : 3.2;
  const dashW = isMainBoth ? 3.6 : 2.8;
  const d = curvePath(from, to);

  if (theme) {
    const color = THEME_STROKE[theme];
    return (
      <g aria-hidden="true">
        {/* 影 */}
        <path d={d} fill="none" stroke="rgba(6,18,31,0.55)" strokeWidth={shadowW} strokeLinecap="round" />
        {theme === 'sea' || theme === 'river' ? (
          <path d={d} fill="none" stroke={color} strokeWidth={mainW} strokeLinecap="round" />
        ) : theme === 'mountain' ? (
          <path d={d} fill="none" stroke={color} strokeWidth={dashW} strokeDasharray="4,3" strokeLinecap="round" />
        ) : (
          <path d={d} fill="none" stroke={color} strokeWidth={dashW} strokeLinecap="round" />
        )}
      </g>
    );
  }
  // 既定: 金の点線航路
  return (
    <g aria-hidden="true">
      <path d={d} fill="none" stroke="rgba(6,18,31,0.55)" strokeWidth="5.6" strokeLinecap="round" />
      <path d={d} fill="none" stroke="rgba(212,168,67,0.6)" strokeWidth="2.6" strokeDasharray="1.6,7.5" strokeLinecap="round" />
    </g>
  );
}
