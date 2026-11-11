import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { BOARD_NODES, NODE_MAP } from '../../data/boardNodes';
import MapNode from './MapNode';
import MapEdges from './MapEdge';
import { curvePath } from './edgeGeometry';
import MapTerrain from './MapTerrain';
import PlayerToken from './PlayerToken';
import { useDisplayedBinbo } from './useDisplayedBinbo';
import NodeInfoOverlay from './NodeInfoOverlay';
import { REGION_ACCENT, REGION_LAND, REGION_NAME, MAP_BOUNDS } from './mapTheme';
import type { GeoRegion } from '../../data/japanGeo';
import { useMapCamera } from './useMapCamera';
import { LABEL_LAYOUT } from './labelLayout';
import { CityDataLayer, CitySkyline, DestinationMarker, SpecialtyMarks } from './CityLayer';
import { RailLines, RailNetworkMap } from './RailLayer';
import StageHighlight from './StageHighlight';
import { countedSteps } from '../../game/railways';
import { DATA_MAP_ORDER } from './cityMapModes';
import DataMapLegend from './DataMapLegend';
import type { DataMapMode } from './cityMapModes';
import type { Bounds } from './useMapCamera';
import Ruby from '../shared/Ruby';
import GuideMapLayer from './GuideMapLayer';
import { PathAdvicePanel, PathAdviceRings } from './PathAdvice';
import { usePathAdvice } from './usePathAdvice';

const PAN_BOUNDS: Bounds = { ...MAP_BOUNDS };

// ===== ノードレイヤー =====
const NodesLayer = memo(function NodesLayer({ reachableSteps, currentNode }: { reachableSteps: Map<string, number>; currentNode: string | undefined }) {
  // 到達可能ノードを最後に描いて最前面へ
  const ordered = reachableSteps.size
    ? [...BOARD_NODES].sort((a, b) => Number(reachableSteps.has(a.id)) - Number(reachableSteps.has(b.id)))
    : BOARD_NODES;
  return (
    <g>
      {ordered.map(node => (
        <MapNode
          key={node.id}
          node={node}
          isReachable={reachableSteps.has(node.id)}
          isCurrentPlayer={currentNode === node.id}
          steps={reachableSteps.get(node.id)}
          dimmed={reachableSteps.size > 0 && !reachableSteps.has(node.id) && currentNode !== node.id}
        />
      ))}
    </g>
  );
});

// ===== 地名ラベル（重なり回避配置 + CSS の LOD でズームに応じて出し分け） =====
const LabelsLayer = memo(function LabelsLayer({ reachable }: { reachable: Set<string> }) {
  return (
    <g aria-hidden="true" className="pointer-events-none select-none">
      {BOARD_NODES.map(node => {
        if (node.type === 'route') return null;
        const L = LABEL_LAYOUT.get(node.id);
        if (!L) return null;
        const isMajor = node.type === 'capital' || node.type === 'start' || node.type === 'goal';
        const isReach = reachable.has(node.id);
        const cls = `lbl ${isMajor ? 'lbl-cap' : 'lbl-node'}${L.farVisible || isReach ? '' : ' lod-hide-far'}${reachable.size > 0 && !isReach ? ' tw-lbl-dim' : ''}`;
        return (
          <text
            key={node.id}
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="central"
            className={cls}
            fill={isReach ? '#ffe9a8' : isMajor ? '#ffe6a0' : '#fbf6e8'}
            fontFamily='"Shippori Mincho", serif'
            fontWeight={isMajor || isReach ? 800 : 700}
            stroke="#1a130c"
            strokeLinejoin="round"
            style={{
              paintOrder: 'stroke',
              ['--nx' as string]: `${L.near[0]}px`,
              ['--ny' as string]: `${L.near[1]}px`,
              ['--mx' as string]: `${L.mid[0]}px`,
              ['--my' as string]: `${L.mid[1]}px`,
              ['--fx' as string]: `${L.far[0]}px`,
              ['--fy' as string]: `${L.far[1]}px`,
            }}
          >
            {node.name}
          </text>
        );
      })}
    </g>
  );
});

// ===== 到達可能ルート（エッジと同じ曲線で金色に強調） =====
// 分かれ道のあいだは、陸と道を藍で少し沈め、選べるマスまでの道だけを金で浮かせる。
// 金の道を流れる光は出たときの数回だけ（CSS の tw-fork-flow。地図は重い絵なので常時ループにしない）。
const ReachableRoutes = memo(function ReachableRoutes({ paths }: { paths: string[][] }) {
  // 同じ区間は1回だけ描く（行き先が多いと、手前の区間が何本も重なるため）
  const segs = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; d: string }[] = [];
    for (const path of paths) {
      for (let i = 1; i < path.length; i++) {
        const key = `${path[i - 1]}>${path[i]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = NODE_MAP.get(path[i - 1]);
        const b = NODE_MAP.get(path[i]);
        if (a && b) out.push({ key, d: curvePath(a, b) }); // 進む向きに描く（曲線の形は向きによらず同じ）
      }
    }
    return out;
  }, [paths]);
  return (
    <g aria-hidden="true" className="pointer-events-none">
      <rect x={-2400} y={-2400} width={6200} height={6400} className="tw-fork-dim" />
      {segs.map(s => <path key={`c${s.key}`} d={s.d} fill="none" stroke="rgba(20,14,6,0.72)" strokeWidth="6.8" strokeLinecap="round" />)}
      {segs.map(s => <path key={`g${s.key}`} d={s.d} fill="none" stroke="#f7d774" strokeWidth="3.8" strokeLinecap="round" />)}
      {segs.map(s => <path key={`f${s.key}`} d={s.d} fill="none" className="tw-fork-flow" />)}
    </g>
  );
});

function boundsOf(ids: string[], pad = 0): Bounds | null {
  const pts = ids.map(id => NODE_MAP.get(id)).filter((n): n is NonNullable<typeof n> => !!n);
  if (!pts.length) return null;
  return {
    minX: Math.min(...pts.map(p => p.x)) - pad,
    minY: Math.min(...pts.map(p => p.y)) - pad,
    maxX: Math.max(...pts.map(p => p.x)) + pad,
    maxY: Math.max(...pts.map(p => p.y)) + pad,
  };
}

function JapanMapImpl() {
  const { players, currentPlayerIndex, turnPhase, reachableNodes, selectPath, lastMove, city } = useGameStore(
    useShallow(s => ({
      players: s.players,
      currentPlayerIndex: s.currentPlayerIndex,
      turnPhase: s.turnPhase,
      reachableNodes: s.reachableNodes,
      selectPath: s.selectPath,
      lastMove: s.lastMove,
      city: s.city,
    })),
  );
  // 貧乏神の人形は、動いた駒が移り先のマスに着いてから付け替える（ストアより少し遅れる見た目だけの値）
  const shownBinbo = useDisplayedBinbo(city?.binbo, players, lastMove);
  const [dataMap, setDataMap] = useState<DataMapMode>('none');
  const playerColors = useMemo(() => players.map(p => p.color), [players]);
  const [infoNodeId, setInfoNodeId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentPlayer = players[currentPlayerIndex];
  const isPathSelection = turnPhase === 'path_selection';

  const reachableSteps = useMemo(() => {
    const m = new Map<string, number>();
    if (!isPathSelection) return m;
    // 線路の上は歩数に数えない（出目と同じ数が出るように）
    for (const path of reachableNodes) m.set(path[path.length - 1], countedSteps(path, city?.rails));
    return m;
  }, [reachableNodes, isPathSelection, city?.rails]);
  const reachableSet = useMemo(() => new Set(reachableSteps.keys()), [reachableSteps]);
  // 行き先のおすすめ（損得係）: 人の手番の分かれ道で、おすすめ順と理由（設定で切れる）
  const advice = usePathAdvice();

  // タップ: パス選択中なら移動、そうでなければマス情報
  const onTap = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return;
      const st = useGameStore.getState();
      if (st.turnPhase === 'path_selection') {
        const idx = st.reachableNodes.findIndex(p => p[p.length - 1] === nodeId);
        if (idx >= 0) {
          st.selectPath(idx);
          return;
        }
      }
      setInfoNodeId(nodeId);
    },
    [],
  );

  const camera = useMapCamera(svgRef, { panBounds: PAN_BOUNDS, onTap });
  const { flyTo, fitBounds, followWidth, isVisible, getCamera, setInteracted } = camera;

  // 初期表示: 日本全体 → 現在のプレイヤーへ寄る
  useEffect(() => {
    fitBounds(MAP_BOUNDS, { pad: 0, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 手番が変わったら、その人の駒へカメラを寄せる
  const curNodeId = currentPlayer?.currentNode;
  useEffect(() => {
    if (!curNodeId) return;
    const n = NODE_MAP.get(curNodeId);
    if (!n) return;
    const t = window.setTimeout(() => {
      const w = Math.min(getCamera().w, followWidth());
      flyTo({ cx: n.x, cy: n.y, w }, 700);
    }, 250);
    return () => clearTimeout(t);
    // 手番交代時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex]);

  // 移動したら追従（見えていなければ）
  useEffect(() => {
    if (!lastMove) return;
    const dest = lastMove.path[lastMove.path.length - 1];
    const b = boundsOf(lastMove.path, 40);
    const n = NODE_MAP.get(dest);
    if (!b || !n) return;
    if (!isVisible(n.x, n.y, 0.12)) {
      flyTo({ cx: n.x, cy: n.y }, Math.min(900, 200 + lastMove.path.length * 120));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove?.seq]);

  // パス選択: 候補がすべて収まるように
  useEffect(() => {
    if (!isPathSelection || !curNodeId) return;
    const ends = reachableNodes.map(p => p[p.length - 1]);
    const b = boundsOf([curNodeId, ...ends], 50);
    // 下の「おすすめ」のボタンと一覧の入口に候補が隠れないよう、下側に余白を足す
    if (b) fitBounds({ ...b, maxY: b.maxY + (b.maxY - b.minY) * 0.2 }, { pad: 20, minW: Math.min(followWidth(), 520) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPathSelection, reachableNodes]);

  const focusCurrent = () => {
    const n = curNodeId ? NODE_MAP.get(curNodeId) : null;
    if (n) flyTo({ cx: n.x, cy: n.y, w: followWidth() }, 500);
  };
  const showAll = () => {
    fitBounds(MAP_BOUNDS, { pad: 0, duration: 500 });
    setInteracted(false);
  };

  // 同じマスにいる駒の並び
  const stackInfo = useMemo(() => {
    const byNode = new Map<string, number[]>();
    players.forEach((p, i) => {
      const arr = byNode.get(p.currentNode) ?? [];
      arr.push(i);
      byNode.set(p.currentNode, arr);
    });
    return players.map((p, i) => {
      const arr = byNode.get(p.currentNode) ?? [i];
      return { stackIndex: arr.indexOf(i), stackSize: arr.length };
    });
  }, [players]);

  const infoNode = infoNodeId ? NODE_MAP.get(infoNodeId) ?? null : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a2139]">
      <svg
        ref={svgRef}
        className="map-svg w-full h-full touch-none select-none"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="日本全国のすごろくマップ"
        data-lod="far"
      >
        <MapTerrain />
        {/* お題: 今年の舞台の地方を金で示す（道とマスの下） */}
        {city?.quests && <StageHighlight stage={city.quests.stage} />}
        <MapEdges />
        {/* 鉄道: 線路は道の上・マスの下。データマップ「鉄道網」では持ち主の色と、つながった町の数 */}
        {city && <RailLines rails={city.rails} colors={playerColors} />}
        {city && dataMap !== 'rail' && <CityDataLayer city={city} mode={dataMap} />}
        {city && dataMap === 'rail' && <RailNetworkMap city={city} colors={playerColors} />}
        {isPathSelection && <ReachableRoutes paths={reachableNodes} />}
        {/* 案内役: 分かれ道に流れる光・目的地への矢印（地図の座標で描くのでカメラに追従する） */}
        <GuideMapLayer layer="under" />
        <NodesLayer reachableSteps={reachableSteps} currentNode={curNodeId} />
        {city && <CitySkyline city={city} colors={playerColors} />}
        {city && <SpecialtyMarks owners={city.specialties} colors={playerColors} />}
        <LabelsLayer reachable={reachableSet} />
        {city && <DestinationMarker nodeId={city.destination} reward={city.destinationReward} />}
        {/* 行き先のおすすめ: 上位3つに金の輪と理由の札（マスと地名の上・駒の下） */}
        {advice && <PathAdviceRings ranked={advice} />}
        {players.map((player, i) => (
          <PlayerToken
            key={player.id}
            player={player}
            index={i}
            totalPlayers={players.length}
            isCurrent={i === currentPlayerIndex}
            move={lastMove}
            stackIndex={stackInfo[i].stackIndex}
            stackSize={stackInfo[i].stackSize}
            binbo={city && shownBinbo.holder === i ? (shownBinbo.great ? 'great' : 'normal') : null}
          />
        ))}
        <GuideMapLayer layer="over" />
      </svg>

      {/* 地図操作ボタン */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5">
        <MapButton onClick={() => setShowLegend(v => !v)} label="地方の色" active={showLegend}>
          {showLegend ? '×' : '凡'}
        </MapButton>
        {showLegend && (
          <div className="bg-ai-900/90 backdrop-blur-sm border border-kin-500/30 rounded-md shadow-lg py-1.5 pl-1.5 pr-2 space-y-0.5">
            {(Object.keys(REGION_NAME) as GeoRegion[]).map(r => (
              <div key={r} className="flex items-center gap-1.5 text-[10px] text-washi/90 leading-tight">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: REGION_LAND[r], boxShadow: `inset 0 0 0 1.5px ${REGION_ACCENT[r]}` }} />
                <span className="font-mincho whitespace-nowrap"><Ruby>{REGION_NAME[r]}</Ruby></span>
              </div>
            ))}
          </div>
        )}
        {city && (
          <div className="flex items-center gap-1.5">
            {/* データマップの名前の札と、色の物差し（凡例） */}
            {dataMap !== 'none' && <DataMapLegend mode={dataMap} players={players} />}
            <MapButton
              onClick={() => setDataMap(m => DATA_MAP_ORDER[(DATA_MAP_ORDER.indexOf(m) + 1) % DATA_MAP_ORDER.length])}
              label="データマップ切替（人口/電力網/公害/幸福度/地価/鉄道網）"
              active={dataMap !== 'none'}
            >
              図
            </MapButton>
          </div>
        )}
        {city?.destination && (
          <MapButton
            onClick={() => {
              const n = NODE_MAP.get(city.destination!);
              if (n) flyTo({ cx: n.x, cy: n.y, w: followWidth() }, 600);
            }}
            label="目的地を見る"
          >
            目
          </MapButton>
        )}
        <MapButton onClick={focusCurrent} label="現在地へ">◎</MapButton>
        <MapButton onClick={showAll} label="日本全体を表示">全</MapButton>
        <MapButton onClick={() => camera.zoomBy(0.7)} label="拡大">＋</MapButton>
        <MapButton onClick={() => camera.zoomBy(1.4)} label="縮小">－</MapButton>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 text-[8.5px] text-washi/35 pointer-events-none select-none whitespace-nowrap">
        地図: 地球地図日本（国土地理院）を加工
      </div>

      {/* パス選択の代替操作: 行き先一覧（折りたたみ。地図のマスを直接タップしてもよい） */}
      {isPathSelection && reachableNodes.length > 0 && (
        <PathAdvicePanel paths={reachableNodes} steps={reachableSteps} ranked={advice} onSelect={selectPath} />
      )}

      {infoNode && <NodeInfoOverlay node={infoNode} onClose={() => setInfoNodeId(null)} />}
    </div>
  );
}

// 分かれ道の一覧（行き先のおすすめつき）は PathAdvice.tsx の PathAdvicePanel。

function MapButton({ onClick, label, children, active }: { onClick: () => void; label: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-full shadow backdrop-blur-sm border text-[13px] font-mincho font-bold flex items-center justify-center transition cursor-pointer ${
        active ? 'bg-kin-500/80 text-ai-950 border-kin-300' : 'bg-ai-900/75 hover:bg-ai-700/85 border-kin-500/35 text-washi/90'
      }`}
    >
      {children}
    </button>
  );
}

const JapanMap = memo(JapanMapImpl);
export default JapanMap;
