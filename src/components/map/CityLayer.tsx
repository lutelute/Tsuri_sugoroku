// まちづくり: 地図上の町の姿（スカイライン）・目的地・データマップ。
import { memo, useMemo } from 'react';
import { NODE_MAP } from '../../data/boardNodes';
import { computeAllStats, BUILDING_INFO, getTownInfo, effectiveLandValue, TIER_LABEL } from '../../game/city';
import type { CityState } from '../../game/city';
import { nodeRadius } from './mapTheme';
import type { DataMapMode } from './cityMapModes';

// ===== データマップ（ノードの下に敷く） =====
export const CityDataLayer = memo(function CityDataLayer({ city, mode }: { city: CityState; mode: DataMapMode }) {
  const stats = useMemo(() => computeAllStats(city), [city]);
  if (mode === 'none') return null;
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {[...stats.entries()].map(([id, s]) => {
        const n = NODE_MAP.get(id);
        if (!n) return null;
        if (mode === 'pop') {
          if (s.population <= 0) return <circle key={id} cx={n.x} cy={n.y} r={9} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="2 2" />;
          const r = 10 + Math.sqrt(s.population) * 1.1;
          return <circle key={id} cx={n.x} cy={n.y} r={r} fill="rgba(80,200,120,0.35)" stroke="rgba(80,200,120,0.9)" strokeWidth="1.2" />;
        }
        if (mode === 'power') {
          const hasPlant = city.towns[id]?.plots.some(p => p?.kind === 'power');
          return (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={16} fill={s.powered ? 'rgba(250,215,80,0.35)' : 'rgba(40,40,60,0.35)'} stroke={s.powered ? 'rgba(250,215,80,0.9)' : 'rgba(255,255,255,0.15)'} strokeWidth="1.2" />
              {hasPlant && <circle cx={n.x} cy={n.y} r={24} fill="none" stroke="#ffd84a" strokeWidth="2" strokeDasharray="4 3" />}
            </g>
          );
        }
        if (mode === 'pollution') {
          if (s.pollution <= 0) return null;
          const r = 10 + s.pollution * 4;
          return <circle key={id} cx={n.x} cy={n.y} r={r} fill="rgba(140,80,40,0.4)" stroke="rgba(170,100,50,0.9)" strokeWidth="1.2" />;
        }
        if (mode === 'land') {
          const town = city.towns[id];
          const base = getTownInfo(id)?.landValue ?? 1;
          const ratio = effectiveLandValue(id, town) / base; // 1.0 が基準
          if (!town?.plots.some(Boolean) && ratio === 1) return null;
          const hueL = Math.max(0, Math.min(120, 60 + (ratio - 1) * 160));
          const r = 12 + Math.max(0, ratio - 0.7) * 14;
          return (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={r} fill={`hsla(${hueL}, 70%, 50%, 0.38)`} stroke={`hsla(${hueL}, 70%, 58%, 0.95)`} strokeWidth="1.2" />
              <text x={n.x} y={n.y - r - 2} textAnchor="middle" fontSize="7" fill="#fbf6e8" stroke="#1a130c" strokeWidth="1.8" style={{ paintOrder: 'stroke' }}>×{ratio.toFixed(2)}</text>
            </g>
          );
        }
        // 幸福度: 赤 → 黄 → 緑
        const h = Math.max(0, Math.min(10, s.happiness));
        const hue = h * 12; // 0(赤)〜120(緑)
        return <circle key={id} cx={n.x} cy={n.y} r={15} fill={`hsla(${hue}, 70%, 50%, 0.4)`} stroke={`hsla(${hue}, 70%, 55%, 0.95)`} strokeWidth="1.2" />;
      })}
    </g>
  );
});

// ===== 町のスカイライン（ノードの左上。右上は駒のピンが来るので避ける） =====
const KIND_ORDER = { power: 0, ind: 1, com: 2, tourism: 3, res: 4, port: 5, park: 6 } as const;

export const CitySkyline = memo(function CitySkyline({ city, colors }: { city: CityState; colors: string[] }) {
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {Object.entries(city.towns).map(([id, town]) => {
        const built = town.plots.filter((p): p is NonNullable<typeof p> => !!p);
        if (!built.length) return null;
        const n = NODE_MAP.get(id);
        const info = getTownInfo(id);
        if (!n || !info) return null;
        built.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.level - a.level);
        const W = 6.2;
        const empty = town.plots.length - built.length;
        const totalW = built.length * W + (empty > 0 ? 5 : 0);
        const x1 = n.x - 2; // 右端（右上の駒のピンを避ける）
        const x0 = x1 - totalW;
        const base = n.y - nodeRadius(n) - 1.5;
        return (
          <g key={id}>
            {/* 地面（区画の埋まり具合も示す） */}
            <rect x={x0 - 1.2} y={base - 0.2} width={totalW + 2.4} height={2.2} rx={1.1} fill="rgba(20,14,8,0.8)" />
            {(town.tier ?? 0) > 0 && (
              <g transform={`translate(${x0 - 6} ${base - 4})`}>
                <circle r={4.2} fill="#c63a26" stroke="#fbf6e8" strokeWidth={0.8} />
                <text y={1.8} textAnchor="middle" fontSize="5" fontWeight={900} fill="#fff" fontFamily='"Shippori Mincho", serif'>{TIER_LABEL[town.tier ?? 0]}</text>
              </g>
            )}
            {built.map((p, i) => {
              const x = x0 + i * W + 0.5;
              const w = W - 1;
              const h = p.kind === 'park' ? 4 : p.kind === 'power' ? 12 : p.kind === 'port' ? 6.5 : 5 + p.level * 5;
              const color = p.vacant ? '#77736b' : BUILDING_INFO[p.kind].color;
              const owner = colors[p.owner] ?? '#fff';
              return (
                <g key={i}>
                  {p.kind === 'park' ? (
                    <circle cx={x + w / 2} cy={base - 3} r={2.9} fill={color} stroke={owner} strokeWidth={1} />
                  ) : p.kind === 'res' ? (
                    <path
                      d={`M${x} ${base} V${base - h + 2.2} L${x + w / 2} ${base - h - 0.8} L${x + w} ${base - h + 2.2} V${base} Z`}
                      fill={color}
                      stroke={owner}
                      strokeWidth={1}
                      strokeLinejoin="round"
                    />
                  ) : (
                    <rect x={x} y={base - h} width={w} height={h} fill={color} stroke={owner} strokeWidth={1} />
                  )}
                  {/* 窓（等級が高いほど多い） */}
                  {(p.kind === 'com' || p.kind === 'res') && p.level >= 2 && (
                    <path d={`M${x + 1.4} ${base - h * 0.55}h${w - 2.8}${p.level >= 3 ? `M${x + 1.4} ${base - h * 0.3}h${w - 2.8}` : ''}`} stroke="rgba(255,250,220,0.85)" strokeWidth={0.9} />
                  )}
                  {p.kind === 'ind' && <rect x={x + w - 1.6} y={base - h - 3.4} width={1.4} height={3.4} fill="#8a7a64" />}
                  {p.kind === 'power' && <path d={`M${x + 3} ${base - 10} l-1.4 3.4 h1.9 l-1.1 3.4`} fill="none" stroke="#3a2a0e" strokeWidth={0.9} />}
                  {p.kind === 'port' && <path d={`M${x + w / 2} ${base - 5.6}v4.2M${x + 1} ${base - 2.4}q${w / 2 - 1} 2 ${w - 2} 0`} fill="none" stroke="#1c140c" strokeWidth={0.8} />}
                </g>
              );
            })}
            {/* 空き区画の数 */}
            {empty > 0 && (
              <text x={x1 - 2.5} y={base - 1.2} textAnchor="middle" fontSize="4.6" fill="rgba(255,255,255,0.75)" fontWeight={700}>
                +{empty}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

// ===== 目的地 =====
export const DestinationMarker = memo(function DestinationMarker({ nodeId, reward }: { nodeId: string | null; reward: number }) {
  const n = nodeId ? NODE_MAP.get(nodeId) : null;
  if (!n) return null;
  return (
    <g aria-hidden="true" className="pointer-events-none">
      <circle cx={n.x} cy={n.y} r={20} fill="none" stroke="#ffd84a" strokeWidth="2.4">
        <animate attributeName="r" values="16;26;16" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <g transform={`translate(${n.x - 16} ${n.y - 44})`}>
        <path d="M2 0 V26" stroke="#3a2a0e" strokeWidth="1.6" />
        <path d="M2 1 H30 L26 7 L30 13 H2 Z" fill="#e34a33" stroke="#7a1f12" strokeWidth="0.9" />
        <text x={15} y={10.2} textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily='"Shippori Mincho", serif'>目的地</text>
      </g>
      <text x={n.x} y={n.y - 47} textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffe9a8" stroke="#1a130c" strokeWidth="2.2" style={{ paintOrder: 'stroke' }}>
        ¥{reward.toLocaleString()}
      </text>
    </g>
  );
});
