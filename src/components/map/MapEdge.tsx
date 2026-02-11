import type { BoardNode } from '../../game/types';

interface MapEdgeProps {
  from: BoardNode;
  to: BoardNode;
}

export default function MapEdge({ from, to }: MapEdgeProps) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="0.4"
      strokeDasharray="1,1"
    />
  );
}
