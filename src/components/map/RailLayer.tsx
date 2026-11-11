// まちづくり: 地図の鉄道。線路のある中継マスの両側の道に、細い線路（和紙色の帯に墨の線と枕木の刻み）を重ねる。
// 海路は藍の帯に白い点線の航路。持ち主の色は、帯の細い縁と、中継マスの下の小さな駅の札（海路は小さな船）で示す。
// 新しく敷かれた区間は、1回だけ線が伸びる（CSS。地図は重い絵なので常時の動きは付けない）。
// データマップ「鉄道網」では、下の地図を暗くして、線路を持ち主の色で示し、線路でつながった町の数を町ごとに出す。
import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { NODE_MAP } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';
import type { CityState } from '../../game/city';
import type { RailMap } from '../../game/railways';
import { railNeighborMap, routeEnds, routeThemeOf } from '../../game/railways';
import { curvePath } from './edgeGeometry';
import { nodeRadius } from './mapTheme';

interface RailSeg {
  routeId: string;
  owner: number;
  sea: boolean;
  node: BoardNode;
  paths: string[];
  /** 各区間のおよその長さ（線が伸びる動きに使う） */
  lens: number[];
}

function railSegments(rails: RailMap | undefined): RailSeg[] {
  if (!rails) return [];
  const out: RailSeg[] = [];
  for (const [routeId, owner] of Object.entries(rails)) {
    const node = NODE_MAP.get(routeId);
    if (!node) continue;
    const ends = routeEnds(routeId)
      .map(id => NODE_MAP.get(id))
      .filter((n): n is BoardNode => !!n);
    out.push({
      routeId,
      owner,
      sea: routeThemeOf(routeId) === 'sea',
      node,
      paths: ends.map(n => curvePath(node, n)), // curvePath は向きによらず同じ曲線（道の絵と重なる）
      lens: ends.map(n => Math.hypot(n.x - node.x, n.y - node.y) * 1.04),
    });
  }
  return out;
}

const BAND = '#f4ecd8';
const SUMI = '#2a2018';
const SEA_BAND = '#15314f';
const SEA_DOT = '#e6f2ff';

/** 線路（道の上・マスの下に敷く） */
export const RailLines = memo(function RailLines({ rails, colors }: { rails?: RailMap; colors: string[] }) {
  const segs = useMemo(() => railSegments(rails), [rails]);

  // 新しく敷かれた区間だけ、1回線を伸ばす（地図を開いた時点で在る線路は動かさない）
  const ids = segs.map(s => s.routeId);
  const key = ids.join(',');
  const [snap, setSnap] = useState<{ key: string; known: string[]; fresh: Record<string, number>; seq: number }>({ key, known: ids, fresh: {}, seq: 0 });
  if (snap.key !== key) {
    const fresh: Record<string, number> = {};
    for (const id of ids) if (!snap.known.includes(id)) fresh[id] = snap.seq + 1;
    setSnap({ key, known: ids, fresh, seq: snap.seq + 1 });
  }
  // 動きが終わったら印を外す（引いた表示から戻ったときなどに、もう一度動かないように）
  const clearFresh = () => setSnap(s => (Object.keys(s.fresh).length ? { ...s, fresh: {} } : s));

  if (!segs.length) return null;
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {segs.map(s => {
        const color = colors[s.owner] ?? '#fff';
        const fresh = snap.fresh[s.routeId] !== undefined;
        const R = nodeRadius(s.node);
        return (
          <g key={`${s.routeId}-${snap.fresh[s.routeId] ?? 0}`}>
            {s.paths.map((d, i) => {
              const draw = fresh ? 'tw-rail-draw' : undefined;
              const fade = fresh ? ' tw-rail-fade' : '';
              const len = { ['--tw-len' as string]: s.lens[i].toFixed(1) } as CSSProperties;
              // 伸びる動きが終わったら印を外す（帯はどの表示の段階でも出ているので、必ず終わりが届く）
              const onEnd = fresh && i === s.paths.length - 1 ? clearFresh : undefined;
              return s.sea ? (
                <g key={i}>
                  <path d={d} fill="none" stroke={color} strokeWidth={4.6} strokeOpacity={0.9} className={draw} style={len} />
                  <path d={d} fill="none" stroke={SEA_BAND} strokeWidth={3.4} className={draw} style={len} onAnimationEnd={onEnd} />
                  <path d={d} fill="none" stroke={SEA_DOT} strokeWidth={1.5} strokeDasharray="0.1 3.4" strokeLinecap="round" className={fade.trim() || undefined} />
                </g>
              ) : (
                <g key={i}>
                  <path d={d} fill="none" stroke={color} strokeWidth={4.8} strokeOpacity={0.95} className={draw} style={len} />
                  <path d={d} fill="none" stroke={BAND} strokeWidth={3.5} className={draw} style={len} onAnimationEnd={onEnd} />
                  <path d={d} fill="none" stroke={SUMI} strokeWidth={1} className={draw} style={len} />
                  <path d={d} fill="none" stroke={SUMI} strokeWidth={3.3} strokeDasharray="0.8 3" className={`lod-hide-far${fade}`} />
                </g>
              );
            })}
            {/* 持ち主の印: 中継マスの細い輪と、下の小さな駅の札（海路は小さな船） */}
            <circle cx={s.node.x} cy={s.node.y} r={R + 1.7} fill={s.sea ? SEA_BAND : BAND} stroke={color} strokeWidth={1.3} />
            {s.sea ? (
              <g transform={`translate(${s.node.x} ${s.node.y + R + 2.2})`}>
                <path d="M0 0.4V-4.6" stroke={SUMI} strokeWidth={0.5} />
                <path d="M0.3 -4.4Q3 -2.6 2.6 -0.2H0.3Z" fill={BAND} stroke={SUMI} strokeWidth={0.45} strokeLinejoin="round" />
                <path d="M-3.4 0.2H3.6L2.4 2.4H-2.4Z" fill={color} stroke={BAND} strokeWidth={0.55} strokeLinejoin="round" />
              </g>
            ) : (
              <g transform={`translate(${s.node.x} ${s.node.y + R + 1.6})`}>
                <path d="M-4.2 1.2L0 -1.1L4.2 1.2Z" fill={SUMI} stroke={BAND} strokeWidth={0.5} strokeLinejoin="round" />
                <rect x={-3.3} y={1.2} width={6.6} height={2.9} fill={color} stroke={BAND} strokeWidth={0.55} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

/** データマップ「鉄道網」: 持ち主の色の線路と、線路でつながった町の数 */
export const RailNetworkMap = memo(function RailNetworkMap({ city, colors }: { city: CityState; colors: string[] }) {
  const segs = useMemo(() => railSegments(city.rails), [city.rails]);
  const linked = useMemo(() => railNeighborMap(city.rails), [city.rails]);
  return (
    <g aria-hidden="true" className="pointer-events-none tw-dm">
      <rect x={-2400} y={-2400} width={6200} height={6400} className="tw-dm-dim" />
      {segs.map(s => s.paths.map((d, i) => (
        <path key={`c-${s.routeId}-${i}`} d={d} fill="none" stroke="#fbf6e8" strokeOpacity={0.85} strokeWidth={6.4} strokeLinecap="round" />
      )))}
      {segs.map(s => s.paths.map((d, i) => (
        <path key={`${s.routeId}-${i}`} d={d} fill="none" stroke={colors[s.owner] ?? '#fff'} strokeWidth={4.2} strokeLinecap="round" />
      )))}
      {[...linked.entries()].map(([id, towns]) => {
        const n = NODE_MAP.get(id);
        if (!n || !city.towns[id]) return null;
        const count = towns.filter(t => !!city.towns[t]).length;
        if (!count) return null;
        // つながった町が多いほど輪が大きい（大きくなりすぎて隣の町を覆わないよう頭打ちにする）
        const r = 12 + Math.min(count, 6) * 1.5;
        return (
          <g key={id}>
            <circle cx={n.x} cy={n.y} r={r} fill="rgba(251,246,232,0.14)" stroke="#fbf6e8" strokeWidth={1.4} strokeDasharray="3 2" />
            <g transform={`translate(${n.x} ${n.y - r - 5})`}>
              <rect x={-8} y={-5.4} width={16} height={10.8} rx={5.4} fill="#fbf6e8" stroke="#1a130c" strokeWidth={0.7} />
              <text y={0.4} textAnchor="middle" dominantBaseline="central" fontSize="7.6" fontWeight={900} fill="#1a130c">
                +{count}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
});
