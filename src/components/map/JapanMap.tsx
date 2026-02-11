import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { BOARD_NODES, NODE_MAP } from '../../data/boardNodes';
import { BOARD_EDGES } from '../../data/boardEdges';
import MapNode from './MapNode';
import MapEdge from './MapEdge';
import PlayerToken from './PlayerToken';

const DEFAULT_VIEWBOX = { x: -5, y: -5, width: 110, height: 120 };
const MIN_WIDTH = 30;
const MAX_WIDTH = 150;
const DRAG_THRESHOLD = 5; // px on screen

interface DragState {
  active: boolean;
  moved: boolean;
  startScreenX: number;
  startScreenY: number;
  startViewX: number;
  startViewY: number;
}

interface PinchState {
  active: boolean;
  startDist: number;
  startWidth: number;
  startCenterX: number;
  startCenterY: number;
}

function getTouchDist(t1: React.Touch, t2: React.Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function JapanMap() {
  const { players, currentPlayerIndex, turnPhase, reachableNodes, selectPath } = useGameStore();
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState>({ active: false, moved: false, startScreenX: 0, startScreenY: 0, startViewX: 0, startViewY: 0 });
  const pinchRef = useRef<PinchState>({ active: false, startDist: 0, startWidth: 0, startCenterX: 0, startCenterY: 0 });
  const suppressClickRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex];
  const reachableEndpoints = new Set(
    reachableNodes.map(path => path[path.length - 1])
  );

  // Screen px -> SVG unit ratio
  const getScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    return viewBox.width / rect.width;
  }, [viewBox.width]);

  const clampViewBox = useCallback((vb: typeof DEFAULT_VIEWBOX) => {
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, vb.width));
    const h = w; // keep aspect ratio 1:1
    // Keep viewBox within wide bounds so south (Okinawa/goal y:90+) is reachable
    const x = Math.max(-30, Math.min(150 - w, vb.x));
    const y = Math.max(-20, Math.min(200 - h, vb.y));
    return { x, y, width: w, height: h };
  }, []);

  // --- Mouse handlers ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startViewX: viewBox.x,
      startViewY: viewBox.y,
    };
  }, [viewBox.x, viewBox.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startScreenX;
    const dy = e.clientY - d.startScreenY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const scale = getScale();
    setViewBox(prev => clampViewBox({
      ...prev,
      x: d.startViewX - dx * scale,
      y: d.startViewY - dy * scale,
    }));
  }, [getScale, clampViewBox]);

  const onMouseUp = useCallback(() => {
    if (dragRef.current.moved) {
      suppressClickRef.current = true;
      requestAnimationFrame(() => { suppressClickRef.current = false; });
    }
    dragRef.current.active = false;
  }, []);

  // --- Touch handlers ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = {
        active: true,
        moved: false,
        startScreenX: t.clientX,
        startScreenY: t.clientY,
        startViewX: viewBox.x,
        startViewY: viewBox.y,
      };
    } else if (e.touches.length === 2) {
      dragRef.current.active = false;
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      pinchRef.current = {
        active: true,
        startDist: dist,
        startWidth: viewBox.width,
        startCenterX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startCenterY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, [viewBox.x, viewBox.y, viewBox.width]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragRef.current.active) {
      const t = e.touches[0];
      const d = dragRef.current;
      const dx = t.clientX - d.startScreenX;
      const dy = t.clientY - d.startScreenY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      e.preventDefault();
      const scale = getScale();
      setViewBox(prev => clampViewBox({
        ...prev,
        x: d.startViewX - dx * scale,
        y: d.startViewY - dy * scale,
      }));
    } else if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const p = pinchRef.current;
      const ratio = p.startDist / dist;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, p.startWidth * ratio));
      setViewBox(prev => {
        const svg = svgRef.current;
        if (!svg) return prev;
        const rect = svg.getBoundingClientRect();
        // Zoom centered on pinch midpoint
        const cx = prev.x + (p.startCenterX - rect.left) / rect.width * prev.width;
        const cy = prev.y + (p.startCenterY - rect.top) / rect.height * prev.height;
        const scale = newWidth / prev.width;
        return clampViewBox({
          x: cx - (cx - prev.x) * scale,
          y: cy - (cy - prev.y) * scale,
          width: newWidth,
          height: newWidth,
        });
      });
    }
  }, [getScale, clampViewBox]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current.active = false;
    if (e.touches.length === 0) {
      if (dragRef.current.moved) {
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 50);
      }
      dragRef.current.active = false;
    }
  }, []);

  // --- Wheel zoom ---
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setViewBox(prev => {
      // Cursor position in SVG coords
      const cx = prev.x + (e.clientX - rect.left) / rect.width * prev.width;
      const cy = prev.y + (e.clientY - rect.top) / rect.height * prev.height;
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, prev.width * zoomFactor));
      const scale = newWidth / prev.width;
      return clampViewBox({
        x: cx - (cx - prev.x) * scale,
        y: cy - (cy - prev.y) * scale,
        width: newWidth,
        height: newWidth,
      });
    });
  }, [clampViewBox]);

  // --- Node click with drag suppression ---
  const handleNodeClick = (nodeId: string) => {
    if (suppressClickRef.current) return;
    if (turnPhase !== 'path_selection') return;
    const pathIndex = reachableNodes.findIndex(
      path => path[path.length - 1] === nodeId
    );
    if (pathIndex >= 0) {
      selectPath(pathIndex);
    }
  };

  const resetView = () => setViewBox(DEFAULT_VIEWBOX);
  const isDefaultView = viewBox.x === DEFAULT_VIEWBOX.x && viewBox.y === DEFAULT_VIEWBOX.y && viewBox.width === DEFAULT_VIEWBOX.width;

  return (
    <div className="flex-1 relative overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        {/* 背景装飾 */}
        <defs>
          <radialGradient id="ocean-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect x={viewBox.x - 20} y={viewBox.y - 20} width={viewBox.width + 40} height={viewBox.height + 40} fill="url(#ocean-glow)" />

        {/* エッジ */}
        {BOARD_EDGES.map((edge, i) => {
          const from = NODE_MAP.get(edge.from);
          const to = NODE_MAP.get(edge.to);
          if (!from || !to) return null;
          return <MapEdge key={i} from={from} to={to} />;
        })}

        {/* ノード */}
        {BOARD_NODES.map(node => (
          <MapNode
            key={node.id}
            node={node}
            isReachable={turnPhase === 'path_selection' && reachableEndpoints.has(node.id)}
            isCurrentPlayer={currentPlayer?.currentNode === node.id}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}

        {/* プレイヤートークン */}
        {players.map((player, i) => (
          <PlayerToken
            key={player.id}
            player={player}
            index={i}
            totalPlayers={players.length}
          />
        ))}
      </svg>

      {/* リセットボタン */}
      {!isDefaultView && (
        <button
          onClick={resetView}
          className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs px-2 py-1 rounded shadow backdrop-blur-sm transition-colors"
          title="地図をリセット"
        >
          ↺ リセット
        </button>
      )}
    </div>
  );
}
