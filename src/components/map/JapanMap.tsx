import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { BOARD_NODES, NODE_MAP } from '../../data/boardNodes';
import { BOARD_EDGES } from '../../data/boardEdges';
import MapNode from './MapNode';
import MapEdge from './MapEdge';
import PlayerToken from './PlayerToken';
import NodeInfoOverlay from './NodeInfoOverlay';
import { LAND_PATHS, ISLANDS, REGION_LABELS, LAND_TONES, REGION_FILLS } from './landmass';
import Ruby from '../shared/Ruby';

// v3.2.5: 経度緯度に基づく地理座標化。
// 座標範囲: x ~ 84..1213, y ~ -79..1512 (稚内が緯度45.4で y=-79)。
const DEFAULT_VIEWBOX = { x: -80, y: -150, width: 1400, height: 1730 };
const MIN_WIDTH = 400;
const MAX_WIDTH = 2200;
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
  const [infoNodeId, setInfoNodeId] = useState<string | null>(null);
  const infoNode = infoNodeId ? NODE_MAP.get(infoNodeId) ?? null : null;

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState>({ active: false, moved: false, startScreenX: 0, startScreenY: 0, startViewX: 0, startViewY: 0 });
  const pinchRef = useRef<PinchState>({ active: false, startDist: 0, startWidth: 0, startCenterX: 0, startCenterY: 0 });
  const suppressClickRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex];
  const reachableEndpoints = new Set(
    reachableNodes.map(path => path[path.length - 1])
  );

  // パス選択中は到達可能ノードを最後に描画して最前面に出す（密集箇所での誤タップ・重なり防止）
  const orderedNodes = turnPhase === 'path_selection'
    ? [...BOARD_NODES].sort(
        (a, b) => Number(reachableEndpoints.has(a.id)) - Number(reachableEndpoints.has(b.id)),
      )
    : BOARD_NODES;

  // 各到達可能ノードの歩数（path.length - 1）を計算
  const reachableSteps = new Map<string, number>();
  for (const path of reachableNodes) {
    const endpoint = path[path.length - 1];
    reachableSteps.set(endpoint, path.length - 1);
  }

  // Screen px -> SVG unit ratio
  const getScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    return viewBox.width / rect.width;
  }, [viewBox.width]);

  const clampViewBox = useCallback((vb: typeof DEFAULT_VIEWBOX) => {
    // 無限キャンバス: パン(x,y)は完全に自由。ズームのみ MIN/MAX_WIDTH で制限する。
    // 「Reset View」ボタンで DEFAULT_VIEWBOX に戻る運用。
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, vb.width));
    const h = w * 1.22;
    return { x: vb.x, y: vb.y, width: w, height: h };
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
  // path_selection時は到達可能ノードで移動、それ以外はそのマスの属性表示
  const handleNodeClick = (nodeId: string) => {
    if (suppressClickRef.current) return;
    if (turnPhase === 'path_selection') {
      const pathIndex = reachableNodes.findIndex(
        path => path[path.length - 1] === nodeId
      );
      if (pathIndex >= 0) {
        selectPath(pathIndex);
        return;
      }
      // 到達不能なマスをタップしたときは属性表示にフォールバック
    }
    setInfoNodeId(nodeId);
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
        role="img"
        aria-label="日本全国の釣りすごろくマップ"
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
            <stop offset="0%" stopColor="rgba(74,127,175,0.18)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* 陸地（和紙・砂浜色） */}
          <linearGradient id="land-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9dcc0" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#c2a978" stopOpacity="0.12" />
          </linearGradient>
          <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4.2" stdDeviation="4.8" floodColor="#06121f" floodOpacity="0.55" />
          </filter>
        </defs>
        <rect x={viewBox.x - 60} y={viewBox.y - 60} width={viewBox.width + 120} height={viewBox.height + 120} fill="url(#ocean-glow)" />

        {/* === レイヤー1: 8地方の連想色塗り分け (明確に見えるレベル) === */}
        <g aria-hidden="true" className="pointer-events-none">
          {REGION_FILLS.map(r => (
            <g key={`region-${r.id}`}>
              {/* 地方の塗り (連想色) */}
              <path d={r.path} fill={r.color} opacity="0.42" />
              {/* 地方の境界線 (連想色を明確に) */}
              <path d={r.path} fill="none" stroke={r.color} strokeWidth="3.2" opacity="1" strokeLinejoin="round" />
              {/* 内側のハイライト (奥行き) */}
              <path d={r.path} fill="none" stroke="rgba(251,246,232,0.22)" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
          ))}
        </g>

        {/* === レイヤー2: 6島の輪郭線 (海岸線を強調、エリア分離を明確に) === */}
        <g aria-hidden="true" className="pointer-events-none">
          {LAND_PATHS.map((d, i) => {
            const tone = LAND_TONES[i] ?? 0.3;
            const hue = 38 + tone * 28;
            return (
              <g key={`land-${i}`}>
                {/* 縁取り (海岸線 — 連続線で太め) */}
                <path d={d} fill="none" stroke={`hsla(${hue}, 35%, 70%, 0.7)`} strokeWidth="2.4" strokeLinejoin="round" />
                {/* 内側のハイライト */}
                <path d={d} fill="none" stroke="rgba(251,246,232,0.2)" strokeWidth="0.8" strokeLinejoin="round" />
              </g>
            );
          })}
          {ISLANDS.map((is, i) => (
            <ellipse key={`isle-${i}`} cx={is.cx} cy={is.cy} rx={is.rx} ry={is.ry} fill="rgba(241,216,147,0.10)" stroke="rgba(241,216,147,0.4)" strokeWidth="1.2" />
          ))}
        </g>

        {/* === レイヤー3: 地方名 (フル表記、海上配置) === */}
        <g aria-hidden="true" className="pointer-events-none select-none">
          {REGION_FILLS.map(r => {
            // 文字数で size を可変 (2文字=大、3-4文字=中、5+=小)
            const len = r.name.length;
            const size = len <= 2 ? 44 : len <= 4 ? 32 : 24;
            return (
              <text
                key={`label-${r.id}`}
                x={r.labelX}
                y={r.labelY + size * 0.32}
                textAnchor="middle"
                fontSize={size}
                fill="#fbf6e8"
                opacity="0.78"
                fontFamily='"Shippori Mincho", serif'
                fontWeight="800"
                letterSpacing={len <= 2 ? 4 : 2}
                stroke="rgba(10,28,46,0.95)"
                strokeWidth={size * 0.20}
                paintOrder="stroke"
              >
                {r.name}
              </text>
            );
          })}
        </g>

        {/* エッジ（海路） */}
        {BOARD_EDGES.map((edge, i) => {
          const from = NODE_MAP.get(edge.from);
          const to = NODE_MAP.get(edge.to);
          if (!from || !to) return null;
          return <MapEdge key={i} from={from} to={to} />;
        })}

        {/* 到達可能ルート（金の航路を強調） */}
        {turnPhase === 'path_selection' && reachableNodes.map((path, pi) => (
          <g key={`route-${pi}`} aria-hidden="true" className="pointer-events-none">
            {path.slice(1).map((nid, si) => {
              const a = NODE_MAP.get(path[si]);
              const b = NODE_MAP.get(nid);
              if (!a || !b) return null;
              return <line key={si} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f1d893" strokeWidth="3" strokeLinecap="round" opacity="0.9" />;
            })}
          </g>
        ))}

        {/* ノード（パス選択中は到達可能ノードを最前面に） */}
        {orderedNodes.map(node => (
          <MapNode
            key={node.id}
            node={node}
            isReachable={turnPhase === 'path_selection' && reachableEndpoints.has(node.id)}
            isCurrentPlayer={currentPlayer?.currentNode === node.id}
            steps={turnPhase === 'path_selection' ? reachableSteps.get(node.id) : undefined}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}

        {/* 地名ラベル専用レイヤー（全ノードの円の上に描画し、隣接ノードに隠れないようにする。
            暗い縁取り(paint-order)で、陸地・円・海路のどこに重なっても可読性を確保） */}
        <g aria-hidden="true" className="pointer-events-none select-none">
          {orderedNodes.map(node => {
            const reachable = turnPhase === 'path_selection' && reachableEndpoints.has(node.id);
            const isCapital = node.type === 'capital';
            const isRoute = node.type === 'route';
            // route ノードは地名ラベルを出さない（密度を上げないため）
            if (isRoute) return null;
            const special = node.type === 'start' || node.type === 'goal' || isCapital;
            const r = isCapital ? 9.5 : special ? 8.5 : 6;
            return (
              <text
                key={`label-${node.id}`}
                x={node.x}
                y={node.y + r + 8}
                textAnchor="middle"
                fontSize={isCapital ? '10' : '7.5'}
                fill={isCapital ? '#ffd97a' : reachable ? '#f1d893' : '#e9dcc0'}
                opacity={reachable ? 1 : isCapital ? 0.95 : 0.72}
                fontFamily='"Shippori Mincho", serif'
                fontWeight={isCapital || reachable ? 'bold' : 'normal'}
                stroke="#0a1c2e"
                strokeWidth={isCapital ? '2.4' : '1.8'}
                strokeLinejoin="round"
                style={{ paintOrder: 'stroke' }}
              >
                {node.name}
              </text>
            );
          })}
        </g>

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

      {/* 方位コンパス（装飾） */}
      <div className="absolute left-2 top-2 w-11 h-11 opacity-70 pointer-events-none select-none" aria-hidden="true">
        <svg viewBox="0 0 44 44" className="w-full h-full">
          <circle cx="22" cy="22" r="20" fill="rgba(16,42,68,0.45)" stroke="rgba(212,168,67,0.45)" strokeWidth="1" />
          <circle cx="22" cy="22" r="14" fill="none" stroke="rgba(212,168,67,0.2)" strokeWidth="0.6" />
          {/* 方位の星 */}
          <path d="M22,5 L25,20 L22,22 L19,20 Z" fill="#e34a33" />
          <path d="M22,39 L19,24 L22,22 L25,24 Z" fill="rgba(241,216,147,0.85)" />
          <path d="M5,22 L20,19 L22,22 L20,25 Z" fill="rgba(241,216,147,0.6)" />
          <path d="M39,22 L24,25 L22,22 L24,19 Z" fill="rgba(241,216,147,0.6)" />
          <text x="22" y="11.5" textAnchor="middle" fontSize="6" fill="#f1d893" fontWeight="bold" fontFamily="serif">北</text>
        </svg>
      </div>

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

      {/* パス選択の代替操作: 行き先ボタン群（モバイルの小さなノードを押せない場合や
          キーボード/スクリーンリーダー利用者のための大きなタップ領域） */}
      {turnPhase === 'path_selection' && reachableNodes.length > 0 && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-1.5 justify-center max-w-[95%] px-2"
          role="group"
          aria-label="移動先を選択"
        >
          {reachableNodes.map((path, i) => {
            const dest = path[path.length - 1];
            const n = NODE_MAP.get(dest);
            if (!n) return null;
            return (
              <button
                key={dest}
                onClick={() => selectPath(i)}
                className="bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm transition-colors cursor-pointer"
              >
                <Ruby>{n.name}</Ruby> <span className="opacity-70">({path.length - 1}マス)</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ノード属性表示モーダル（サイコロ振らない時 or 到達不能マスをタップしたとき） */}
      {infoNode && <NodeInfoOverlay node={infoNode} onClose={() => setInfoNodeId(null)} />}
    </div>
  );
}
