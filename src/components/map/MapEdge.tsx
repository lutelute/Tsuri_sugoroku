import type { BoardNode } from '../../game/types';

interface MapEdgeProps {
  from: BoardNode;
  to: BoardNode;
}

export default function MapEdge({ from, to }: MapEdgeProps) {
  return (
    <g aria-hidden="true">
      {/* 海路の影 */}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(6,18,31,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      {/* 金の点線航路 */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="rgba(212,168,67,0.5)"
        strokeWidth="0.7"
        strokeDasharray="0.4,2.2"
        strokeLinecap="round"
      />
    </g>
  );
}
