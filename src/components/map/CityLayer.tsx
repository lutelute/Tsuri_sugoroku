// まちづくり: 地図上の町の姿（スカイライン・復興特需の木槌）・目的地・データマップ。
import { memo, useMemo } from 'react';
import { NODE_MAP } from '../../data/boardNodes';
import { computeAllStats, getTownInfo, effectiveLandValue, TIER_LABEL, recoveryMonthsLeft, distancesFrom, POWER_RANGE } from '../../game/city';
import type { CityState } from '../../game/city';
import { nodeRadius } from './mapTheme';
import { MiniBuilding, FarTownMark } from './townMarks';
import { miniHeight, MINI_W } from './townMarkSize';
import { placeTowns, defaultPlace } from './townPlacement';
import type { DataMapMode } from './cityMapModes';
import { SpecialtyShapes } from '../city/SpecialtyIcon';
import { HammerShapes } from '../city/RecoveryMark';
import { MayorCrestShape } from '../city/MayorCrest';
import { mayorOf, ordinanceContext, ORDINANCE_INFO } from '../../game/mayor';
import { CITY_SPECIALTIES } from '../../data/citySpecialties';
import { regionalMonopolies, regionOfSpecialty } from '../../game/citySpecialties';

// ===== データマップ（ノードの下に敷く） =====
// 表示中は、下の地図（陸・道・線路）を藍で沈め（tw-dm-dim）、町の印も薄くして（index.css の :has(.tw-dm)）、データの色だけを立たせる。
// 色の物差し（凡例）は DataMapLegend.tsx。色と形を変えたら凡例も揃えること。

/** 数字の札（寄った・中くらいの表示だけ） */
function DataNum({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="7" fontWeight={800} fill="#fbf6e8" stroke="#1a130c" strokeWidth="1.9" className="lod-hide-far" style={{ paintOrder: 'stroke' }}>
      {children}
    </text>
  );
}

/** 電力網: 建物のある町を、いちばん近い発電所と結ぶ（送電の線） */
function powerFeeds(city: CityState): { from: string; to: string }[] {
  const plants = Object.entries(city.towns).filter(([, t]) => t.plots.some(p => p?.kind === 'power')).map(([id]) => id);
  const best = new Map<string, { from: string; d: number }>();
  for (const plant of plants) {
    for (const [id, d] of distancesFrom(plant, POWER_RANGE)) {
      if (id === plant || d > POWER_RANGE) continue;
      const town = city.towns[id];
      if (!town?.plots.some(Boolean)) continue;
      const cur = best.get(id);
      if (!cur || d < cur.d) best.set(id, { from: plant, d });
    }
  }
  return [...best.entries()].map(([to, v]) => ({ from: v.from, to }));
}

export const CityDataLayer = memo(function CityDataLayer({ city, mode }: { city: CityState; mode: DataMapMode }) {
  const stats = useMemo(() => computeAllStats(city), [city]);
  const feeds = useMemo(() => (mode === 'power' ? powerFeeds(city) : []), [city, mode]);
  if (mode === 'none') return null;
  return (
    <g aria-hidden="true" className="pointer-events-none tw-dm">
      <rect x={-2400} y={-2400} width={6200} height={6400} className="tw-dm-dim" />
      {/* 送電の線（発電所 → 建物のある町） */}
      {feeds.map(f => {
        const a = NODE_MAP.get(f.from);
        const b = NODE_MAP.get(f.to);
        if (!a || !b) return null;
        const d = `M${a.x} ${a.y}L${b.x} ${b.y}`;
        return (
          <g key={`${f.from}-${f.to}`}>
            <path d={d} stroke="rgba(10,16,30,0.6)" strokeWidth={3.4} strokeLinecap="round" />
            <path d={d} stroke="#ffd84a" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        );
      })}
      {[...stats.entries()].map(([id, s]) => {
        const n = NODE_MAP.get(id);
        if (!n) return null;
        if (mode === 'pop') {
          if (s.population <= 0) return <circle key={id} cx={n.x} cy={n.y} r={9} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />;
          const r = 10 + Math.sqrt(s.population) * 1.1;
          return (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={r} fill="rgba(90,210,130,0.45)" stroke="rgba(110,225,150,0.95)" strokeWidth="1.5" />
              <DataNum x={n.x} y={n.y - r - 2}>{s.population.toLocaleString()}</DataNum>
            </g>
          );
        }
        if (mode === 'power') {
          const hasPlant = city.towns[id]?.plots.some(p => p?.kind === 'power');
          return (
            <g key={id}>
              {s.powered ? (
                <circle cx={n.x} cy={n.y} r={15} fill="rgba(255,216,74,0.5)" stroke="#ffd84a" strokeWidth="1.5" />
              ) : (
                <circle cx={n.x} cy={n.y} r={12.5} fill="rgba(20,24,40,0.7)" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="2 2" />
              )}
              {hasPlant && (
                <g>
                  <circle cx={n.x} cy={n.y} r={23} fill="none" stroke="#ffd84a" strokeWidth="2.2" strokeDasharray="4 3" />
                  <g transform={`translate(${n.x} ${n.y - 27})`}>
                    <circle r={7.4} fill="#15314f" stroke="#ffd84a" strokeWidth={1.4} />
                    <path d="M1.2 -5L-3 0.8H-0.4L-1.6 5L3 -1H0.4Z" fill="#ffd84a" />
                  </g>
                </g>
              )}
            </g>
          );
        }
        if (mode === 'pollution') {
          if (s.pollution <= 0) return null;
          const r = 10 + s.pollution * 4;
          return (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={r} fill="rgba(150,90,45,0.5)" stroke="rgba(200,125,65,0.95)" strokeWidth="1.5" />
              <DataNum x={n.x} y={n.y - r - 2}>{s.pollution.toFixed(1)}</DataNum>
            </g>
          );
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
              <circle cx={n.x} cy={n.y} r={r} fill={`hsla(${hueL}, 70%, 50%, 0.5)`} stroke={`hsla(${hueL}, 75%, 62%, 1)`} strokeWidth="1.6" />
              <DataNum x={n.x} y={n.y - r - 2}>{`×${ratio.toFixed(2)}`}</DataNum>
            </g>
          );
        }
        // 幸福度: 赤 → 黄 → 緑
        const h = Math.max(0, Math.min(10, s.happiness));
        const hue = h * 12; // 0(赤)〜120(緑)
        return (
          <g key={id}>
            <circle cx={n.x} cy={n.y} r={16} fill={`hsla(${hue}, 70%, 50%, 0.5)`} stroke={`hsla(${hue}, 75%, 62%, 1)`} strokeWidth="2" />
            <DataNum x={n.x} y={n.y - 18}>{h.toFixed(1)}</DataNum>
          </g>
        );
      })}
    </g>
  );
});

// ===== 町の姿（既定はノードの左上。右上は駒のピンが来るので避ける） =====
// 寄った表示・中くらいの表示: 小さな家並み（屋根のある家・店・煙突・塔）。背の高い建物を真ん中に寄せ、
//   区画が多い町は重ねて並べて幅を抑える。足もとの帯が持ち主の色。
//   置き場所は townPlacement.ts が決める（地名・ほかのマス・ほかの家並みにかぶるときは、真上・左・左下へ逃がす）。
//   大きさは置き場所の角を軸に CSS で変える（.tw-town。寄り 1.2 倍・中 1.5 倍）。
// 引いた表示: 持ち主の色で塗った小さな家の印だけ（CSS の .tw-far-only / .lod-hide-far で出し分ける）。
// 町長の家紋は寄った表示だけ（.lod-near）。地図は止まった絵なので、ここは動かさない。
const MAX_TOWN_W = 27;
/** 家並みの左に置く印（発展度の丸・町長の家紋）の幅 */
const BADGE_W = 10.6;
/** 発展度の丸の上に町長の家紋を重ねたときの高さ */
const BADGE_STACK_H = 19.8;

export const CitySkyline = memo(function CitySkyline({ city, colors }: { city: CityState; colors: string[] }) {
  // 町ごとの家並みの並びと大きさ
  const towns = useMemo(() => {
    const list = [];
    for (const [id, town] of Object.entries(city.towns)) {
      const built = town.plots.filter((p): p is NonNullable<typeof p> => !!p);
      const n = NODE_MAP.get(id);
      if (!built.length || !n || !getTownInfo(id)) continue;
      // 背の高い順に、真ん中から左右へ振り分ける（山なりの家並み）
      const byHeight = [...built].sort((x, y) => miniHeight(y.kind, y.level) - miniHeight(x.kind, x.level));
      const order: typeof built = [];
      byHeight.forEach((p, i) => (i % 2 === 0 ? order.push(p) : order.unshift(p)));
      const count = order.length;
      const step = count > 1 ? Math.min(MINI_W + 0.6, (MAX_TOWN_W - MINI_W) / (count - 1)) : 0;
      const empty = town.plots.length - count;
      const housesW = step * (count - 1) + MINI_W;
      const totalW = housesW + (empty > 0 ? Math.min(6, empty * 1.8) + 0.8 : 0);
      const tier = town.tier ?? 0;
      const mayor = mayorOf(town);
      // 家並みの左の印（発展度の丸。町長の家紋はその上に重ねて置く）の幅。置き場所を決めるときの大きさに含める
      const badge = tier > 0 || mayor !== null ? BADGE_W : 0;
      const maxH = miniHeight(byHeight[0].kind, byHeight[0].level);
      // 引いた表示の印: 建物の多い順に3人まで
      const tally = new Map<number, number>();
      for (const p of built) tally.set(p.owner, (tally.get(p.owner) ?? 0) + 1);
      list.push({
        id, n, town, order, count, step, empty, housesW, totalW, tier, badge, mayor,
        w: totalW + 2.4 + badge,
        h: Math.max(maxH + 3, tier > 0 && mayor !== null ? BADGE_STACK_H : 0),
        tally: [...tally.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3),
        mono: tally.size === 1 && count >= (town.base ?? town.plots.length),
      });
    }
    return list;
  }, [city.towns]);
  const places = useMemo(() => placeTowns(towns.map(t => ({ id: t.id, w: t.w, h: t.h }))), [towns]);

  return (
    <g aria-hidden="true" className="pointer-events-none">
      {towns.map(t => {
        const { id, n, town, order, count, step, empty, housesW, totalW, tier } = t;
        const pl = places.get(id) ?? defaultPlace(id);
        if (!pl) return null;
        // 置き場所の角（軸）から見た座標: 箱の左端 → 発展度の丸 → 家並み
        const left = pl.h === -1 ? -t.w : pl.h === 0 ? -t.w / 2 : 0;
        const x0 = left + t.badge + 1.2;
        const base = pl.v === -1 ? -2.6 : t.h - 2.6;
        const shares = t.tally.map(([o, c]) => ({ color: colors[o] ?? '#fff', n: c }));
        return (
          <g key={id}>
            <g className="tw-far-only">
              <FarTownMark x={n.x - nodeRadius(n) - 3} base={n.y - nodeRadius(n) + 2} shares={shares} gold={t.mono} />
            </g>
            <g className="lod-hide-far" transform={`translate(${pl.px.toFixed(1)} ${pl.py.toFixed(1)})`}>
              <g className="tw-town">
                {/* 地面の帯（持ち主の色・空き区画の数） */}
                <rect x={x0 - 1.2} y={base - 0.3} width={totalW + 2.4} height={2.9} rx={1.3} fill="rgba(20,14,8,0.86)" />
                {order.map((p, i) => (
                  <rect key={`o${i}`} x={x0 + i * step + (i === 0 ? 0 : 0.25)} y={base + 0.45} width={(i === count - 1 ? MINI_W : step) - (i === 0 ? 0.25 : 0.5)} height={1.5} rx={0.5} fill={colors[p.owner] ?? '#fff'} />
                ))}
                {empty > 0 && Array.from({ length: Math.min(3, empty) }, (_, i) => (
                  <rect key={`e${i}`} x={x0 + housesW + 0.7 + i * 1.8} y={base + 0.55} width={1.1} height={1.3} rx={0.3} fill="none" stroke="rgba(251,246,232,0.6)" strokeWidth={0.4} />
                ))}
                {tier > 0 && (
                  <g transform={`translate(${x0 - 6} ${base - 3})`}>
                    <circle r={4.2} fill="#c63a26" stroke="#fbf6e8" strokeWidth={0.8} />
                    <text y={1.8} textAnchor="middle" fontSize="5" fontWeight={900} fill="#fff" fontFamily='"Shippori Mincho", serif'>{TIER_LABEL[tier]}</text>
                  </g>
                )}
                {/* 町長の家紋（発展度の丸の上。寄った表示だけ）。条例が効いている町は条例の色の点付き。町長が替わると押し直す */}
                {(() => {
                  const mayor = t.mayor;
                  if (mayor === null) return null;
                  const ord = ordinanceContext(town);
                  return (
                    <g key={`mayor-${mayor}`} className="lod-near" transform={`translate(${x0 - 6} ${base - 3 - (tier > 0 ? 9.6 : 0)})`}>
                      <g className="fx-mark-in">
                        <MayorCrestShape r={4.4} color={colors[mayor] ?? '#fff'} ordinanceColor={ord ? ORDINANCE_INFO[ord.kind].color : undefined} />
                      </g>
                    </g>
                  );
                })()}
                {order.map((p, i) => (
                  <MiniBuilding key={i} kind={p.kind} level={p.level} vacant={p.vacant} x={x0 + i * step} base={base} />
                ))}
              </g>
            </g>
          </g>
        );
      })}
      {/* 復興特需の町に木槌の印（ノードの左下）。建物が全部壊れた町にも出す。引いた表示では隠す */}
      {Object.entries(city.towns).map(([id, town]) => {
        const left = recoveryMonthsLeft(town);
        const n = left > 0 ? NODE_MAP.get(id) : undefined;
        if (!n) return null;
        return (
          <g key={`rec-${id}`} className="lod-hide-far" transform={`translate(${n.x - nodeRadius(n) - 8} ${n.y + 4})`}>
            <circle r={6.6} fill="#fbf6e8" stroke="#b8862f" strokeWidth={1.3} />
            <g transform="translate(-6 -6) scale(0.5)">
              <HammerShapes />
            </g>
            <text x={5.2} y={7.6} fontSize="5.2" fontWeight={900} fill="#a92e1d" stroke="#fbf6e8" strokeWidth={1.4} style={{ paintOrder: 'stroke' }}>
              {left}
            </text>
          </g>
        );
      })}
    </g>
  );
});

// ===== 名産（持ち主のいる名産の町に小さな印。県庁かどうかは問わない） =====
// 寄った表示・中くらいの表示で出し、引いた表示（far）では CSS で隠す（小さすぎて地名の邪魔になるため）。
// 持ち主が替わると key が変わって印を押し直す（fx-mark-in）。地方独占中は金の二重の輪。
export const SpecialtyMarks = memo(function SpecialtyMarks({ owners, colors }: { owners?: Record<string, number>; colors: string[] }) {
  const monopolies = useMemo(() => regionalMonopolies(owners), [owners]);
  if (!owners) return null;
  return (
    <g aria-hidden="true" className="pointer-events-none specialty-mark">
      {Object.entries(owners).map(([nodeId, owner]) => {
        const n = NODE_MAP.get(nodeId);
        const icon = CITY_SPECIALTIES[nodeId]?.icon;
        if (!n || !icon) return null;
        const region = regionOfSpecialty(nodeId);
        const mono = region !== null && monopolies[region] === owner;
        const x = n.x + nodeRadius(n) + 2;
        const y = n.y + 2;
        return (
          <g key={`${nodeId}-${owner}`} transform={`translate(${x} ${y})`}>
            <g className="fx-mark-in">
              {mono && <circle cx={6} cy={6} r={10} fill="none" stroke="#e6c266" strokeWidth={1.6} />}
              <circle cx={6} cy={6} r={7.5} fill="#fbf6e8" stroke={colors[owner] ?? '#fff'} strokeWidth={2} />
              <g transform="translate(0.5 0.5) scale(0.46)">
                <SpecialtyShapes icon={icon} />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

// ===== 目的地 =====
// 目的地が決まった・替わったときに輪が3回だけ脈打ち、あとは静止（地図で常時アニメを回さない。key で差し込み直す）
export const DestinationMarker = memo(function DestinationMarker({ nodeId, reward }: { nodeId: string | null; reward: number }) {
  const n = nodeId ? NODE_MAP.get(nodeId) : null;
  if (!n) return null;
  return (
    <g key={nodeId ?? ''} aria-hidden="true" className="pointer-events-none">
      <circle cx={n.x} cy={n.y} r={16} fill="none" stroke="#ffd84a" strokeWidth="2.4" className="fx-dest-pulse" />
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
