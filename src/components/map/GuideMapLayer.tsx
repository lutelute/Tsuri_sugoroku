// 地図の上の案内（案内役）。GuideLayer がいま出している案内に合わせて、地図の座標で描く。
// 地図のカメラは viewBox を直接書き換える作りなので、ここは地図の座標で描くだけで位置が合う（カメラの動きで再描画しない）。
// ズーム段階は svg の data-lod を CSS（index.css の gd-map-*）で見て、線の太さ・輪の大きさを変える。
// タップは素通し（pointer-events: none）で、マスの選択を邪魔しない。
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { useGuideStore } from '../../store/useGuideStore';
import { guideById } from '../guide/guideRules';
import type { GuideMapCue } from '../guide/guideRules';
import { BOARD_NODES, NODE_MAP } from '../../data/boardNodes';
import { curvePath } from './edgeGeometry';

interface Pt {
  x: number;
  y: number;
}

const GOAL_NODE = BOARD_NODES.find(n => n.type === 'goal');

/** 2マスの間の道を、進む向き（a→b）で描く「Q 制御点 終点」。地図の街道と同じ曲線にそろえる */
function segmentTo(a: { id: string; x: number; y: number }, b: { id: string; x: number; y: number }): string {
  const d = a.id < b.id ? curvePath(a, b) : curvePath(b, a);
  const m = d.match(/Q\s*([-\d.]+),([-\d.]+)/);
  return m ? `Q ${m[1]},${m[2]} ${b.x},${b.y}` : `L ${b.x},${b.y}`;
}

/** 駒の位置（PlayerToken と同じずらし方。ピンの丸い頭のあたり） */
function tokenPoint(nodeId: string, stackIndex: number, stackSize: number): Pt | null {
  const n = NODE_MAP.get(nodeId);
  if (!n) return null;
  const offset = stackSize > 1 ? (stackIndex - (stackSize - 1) / 2) * 13 : 0;
  return { x: n.x + 12 + offset, y: n.y - 25 };
}

/** 脈打つ輪（ズームしても画面上の大きさがほぼ変わらない） */
function Ring({ at, r = 17, tone = 'kin' }: { at: Pt; r?: number; tone?: 'kin' | 'shu' | 'sumi' }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className="gd-map-s">
        <circle r={r} className={`gd-map-ring is-${tone}`} />
        <circle r={r} className={`gd-map-ring is-${tone} gd-map-pulse`} />
      </g>
    </g>
  );
}

/** 駒から目的地（ゴール）の方向へ流れる線と矢じり */
function Arrow({ from, to, tone }: { from: Pt; to: Pt; tone: 'kin' | 'shu' }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 40) return null;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(len - 20, 70);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g>
      <line x1={from.x + ux * 14} y1={from.y + uy * 14} x2={to.x} y2={to.y} className={`gd-map-flow is-${tone}`} />
      <g transform={`translate(${(from.x + ux * head).toFixed(1)} ${(from.y + uy * head).toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <g className="gd-map-s">
          <path d="M -10,-9 L 7,0 L -10,9 L -5.5,0 Z" className={`gd-map-head is-${tone}`} />
        </g>
      </g>
    </g>
  );
}

const Cues = memo(function Cues({ cues, layer }: { cues: GuideMapCue[]; layer: 'under' | 'over' }) {
  const { isCity, phase, reachable, nodes, current, destination, binbo } = useGameStore(
    useShallow(s => ({
      isCity: s.settings.mode === 'city',
      phase: s.turnPhase,
      reachable: s.reachableNodes,
      nodes: s.players.map(p => p.currentNode).join('|'),
      current: s.currentPlayerIndex,
      destination: s.city?.destination ?? null,
      binbo: s.city?.binbo?.playerIndex ?? null,
    })),
  );
  const nodeIds = nodes.split('|');
  const tokenOf = (i: number): Pt | null => {
    const id = nodeIds[i];
    if (!id) return null;
    const same = nodeIds.map((n, j) => (n === id ? j : -1)).filter(j => j >= 0);
    return tokenPoint(id, same.indexOf(i), same.length);
  };
  const me = tokenOf(current);
  const has = (c: GuideMapCue) => cues.includes(c);

  if (layer === 'under') {
    const destNode = destination ? NODE_MAP.get(destination) : undefined;
    return (
      <g className="gd-map" aria-hidden="true">
        {/* 分かれ道: 各候補の道を、今いるマスから行き先へ光が流れる */}
        {has('path') && phase === 'path_selection' && reachable.map((path, i) => {
          const first = NODE_MAP.get(path[0]);
          if (!first || path.length < 2) return null;
          let d = `M ${first.x},${first.y}`;
          for (let k = 1; k < path.length; k++) {
            const a = NODE_MAP.get(path[k - 1]);
            const b = NODE_MAP.get(path[k]);
            if (a && b) d += ` ${segmentTo(a, b)}`;
          }
          return <path key={i} d={d} className="gd-map-flow is-kin is-path" />;
        })}
        {has('destination') && isCity && me && destNode && <Arrow from={me} to={destNode} tone="shu" />}
        {has('goal') && !isCity && me && GOAL_NODE && nodeIds[current] !== GOAL_NODE.id && <Arrow from={me} to={GOAL_NODE} tone="kin" />}
      </g>
    );
  }

  const ends = has('path') && phase === 'path_selection'
    ? reachable.map(p => NODE_MAP.get(p[p.length - 1])).filter((n): n is NonNullable<typeof n> => !!n)
    : [];
  const destNode = has('destination') && isCity && destination ? NODE_MAP.get(destination) : undefined;
  const binboAt = has('binbo') && binbo !== null ? tokenOf(binbo) : null;
  return (
    <g className="gd-map" aria-hidden="true">
      {ends.map(n => <Ring key={n.id} at={n} r={15} />)}
      {destNode && <Ring at={destNode} r={16} tone="shu" />}
      {has('token') && me && <Ring at={me} />}
      {binboAt && <Ring at={{ x: binboAt.x, y: binboAt.y - 14 }} r={24} tone="sumi" />}
    </g>
  );
});

/** JapanMap の <svg> の中に置く。under は道・矢印（マスの下）、over は輪（駒の上） */
export default function GuideMapLayer({ layer }: { layer: 'under' | 'over' }) {
  const cues = useGuideStore(s => guideById(s.activeId)?.map);
  if (!cues?.length) return null;
  return <Cues cues={cues} layer={layer} />;
}
