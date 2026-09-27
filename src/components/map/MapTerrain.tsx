// 地形レイヤー（静的）。実際の海岸線・県境・地方境・山・湖・海名を描く。
// props を持たない memo コンポーネントなので、パン/ズーム/ゲーム進行で再描画されない。
import { memo } from 'react';
import { GEO_PREFECTURES, GEO_COAST, GEO_PREF_BORDERS, GEO_REGION_BORDERS } from '../../data/japanGeo';
import type { GeoRegion } from '../../data/japanGeo';
import { REGION_LAND, REGION_ACCENT, REGION_NAME, REGION_LABEL_POS, SEA_LABELS, projectLatLon } from './mapTheme';

// 山のグリフ配置 [緯度, 経度, 大きさ, 冠雪]
const MOUNTAINS: [number, number, number, boolean][] = [
  // 北海道
  [43.66, 142.85, 1.25, true], [42.75, 142.72, 1.0, false], [42.42, 143.0, 0.9, false],
  [44.05, 145.1, 0.8, false], [42.83, 140.81, 0.9, true], [43.2, 142.3, 0.8, false],
  // 東北
  [40.66, 140.88, 0.95, false], [39.85, 141.0, 1.0, true], [39.25, 140.78, 0.85, false],
  [38.62, 140.52, 0.85, false], [38.14, 140.45, 0.95, true], [39.1, 140.05, 1.0, true],
  [38.55, 140.03, 0.85, false], [37.6, 140.07, 0.85, false], [37.2, 139.6, 0.85, false],
  [40.2, 140.6, 0.8, false],
  // 関東
  [36.8, 139.38, 0.9, false], [36.56, 139.19, 0.8, false], [36.4, 138.52, 0.95, true],
  // 中部（日本アルプス）
  [36.62, 137.62, 1.25, true], [36.3, 137.65, 1.3, true], [36.05, 137.6, 1.1, true],
  [36.15, 136.77, 1.05, true], [35.8, 137.78, 1.0, false], [35.89, 137.48, 1.0, true],
  [35.5, 138.15, 1.15, true], [35.2, 138.1, 1.0, false], [35.97, 138.37, 0.95, false],
  [36.9, 138.3, 0.9, false], [37.4, 139.2, 0.85, false],
  // 近畿
  [35.25, 135.95, 0.8, false], [34.1, 135.9, 0.95, false], [33.85, 135.55, 0.85, false],
  [35.05, 136.4, 0.8, false], [35.45, 134.7, 0.8, false],
  // 中国
  [35.37, 133.55, 1.0, true], [35.1, 132.8, 0.85, false], [34.9, 132.2, 0.8, false],
  [35.2, 134.2, 0.85, false], [34.55, 131.8, 0.75, false],
  // 四国
  [33.77, 133.12, 1.0, true], [33.85, 134.09, 0.95, false], [33.55, 133.6, 0.85, false],
  [33.2, 132.8, 0.75, false],
  // 九州
  [32.88, 131.1, 1.0, false], [33.08, 131.25, 0.9, false], [31.93, 130.87, 0.95, false],
  [32.4, 131.1, 0.9, false], [32.76, 130.29, 0.8, false], [33.5, 130.9, 0.75, false],
  [30.34, 130.5, 0.95, true],
];

// 琵琶湖（おおまかな輪郭）
const BIWA: [number, number][] = [
  [35.52, 136.1], [35.47, 136.19], [35.37, 136.25], [35.26, 136.23], [35.16, 136.12],
  [35.08, 136.03], [35.02, 135.94], [34.97, 135.9], [35.02, 135.87], [35.1, 135.92],
  [35.2, 135.97], [35.3, 135.99], [35.4, 136.0], [35.47, 136.03],
];

function polyPath(pts: [number, number][]): string {
  return pts
    .map(([lat, lon], i) => {
      const p = projectLatLon(lat, lon);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join('') + 'Z';
}

const BIWA_D = polyPath(BIWA);
const FUJI = projectLatLon(35.36, 138.73);

// 地方ごとに県をまとめる（塗りを地方単位の1パスにして DOM を減らす）
const REGION_D: { region: GeoRegion; d: string }[] = (() => {
  const map = new Map<GeoRegion, string[]>();
  for (const p of GEO_PREFECTURES) {
    const arr = map.get(p.region) ?? [];
    arr.push(p.d);
    map.set(p.region, arr);
  }
  return [...map.entries()].map(([region, ds]) => ({ region, d: ds.join('') }));
})();

function MapTerrainImpl() {
  return (
    <g aria-hidden="true" className="pointer-events-none select-none">
      <defs>
        <radialGradient id="sea-grad" cx="62%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#1d4a73" />
          <stop offset="60%" stopColor="#123557" />
          <stop offset="100%" stopColor="#0a2139" />
        </radialGradient>
        {/* 青海波（ごく淡く） */}
        <pattern id="sea-wave" width="48" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M0 24a24 24 0 0 1 48 0M-24 12a24 24 0 0 1 48 0M24 12a24 24 0 0 1 48 0M8 24a16 16 0 0 1 32 0M16 24a8 8 0 0 1 16 0"
            fill="none"
            stroke="rgba(160,200,235,0.07)"
            strokeWidth="1.2"
          />
        </pattern>
        {/* 山グリフ */}
        <symbol id="mtn" viewBox="-11 -12 22 13" overflow="visible">
          <path d="M-10 0L-4.5 -7.5L-2 -5L3 -11L10 0Z" fill="#9b8a62" stroke="#4d3f2a" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M3 -11L10 0L5 0L4.2 -6Z" fill="#7b6b48" />
        </symbol>
        <symbol id="mtn-snow" viewBox="-11 -12 22 13" overflow="visible">
          <path d="M-10 0L-4.5 -7.5L-2 -5L3 -11L10 0Z" fill="#9b8a62" stroke="#4d3f2a" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M3 -11L10 0L5 0L4.2 -6Z" fill="#7b6b48" />
          <path d="M3 -11L0.9 -7.8L2.6 -8.5L4.2 -7.2L5.4 -8.2Z" fill="#fbf6e8" />
        </symbol>
      </defs>

      {/* 海 */}
      <rect x={-2400} y={-2400} width={6200} height={6400} fill="url(#sea-grad)" />
      <rect x={-2400} y={-2400} width={6200} height={6400} fill="url(#sea-wave)" />

      {/* 大陸棚（沿岸の浅瀬の明るみ） */}
      <path d={GEO_COAST} fill="none" stroke="rgba(120,190,230,0.10)" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" />
      <path d={GEO_COAST} fill="none" stroke="rgba(150,210,240,0.16)" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />

      {/* 陸地（地方ごとの淡い色） */}
      {REGION_D.map(({ region, d }) => (
        <path key={region} d={d} fill={REGION_LAND[region]} />
      ))}

      {/* 県境・地方境 */}
      <path d={GEO_PREF_BORDERS} fill="none" stroke="rgba(90,70,45,0.38)" strokeWidth="0.9" strokeDasharray="3 2" strokeLinejoin="round" />
      <path d={GEO_REGION_BORDERS} fill="none" stroke="rgba(80,55,30,0.55)" strokeWidth="1.8" strokeLinejoin="round" />

      {/* 湖 */}
      <path d={BIWA_D} fill="#3f78a6" stroke="#2a4e70" strokeWidth="0.8" />

      {/* 海岸線（墨の輪郭 + 波打ち際の白） */}
      <path d={GEO_COAST} fill="none" stroke="rgba(245,250,255,0.55)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={GEO_COAST} fill="none" stroke="#3b2f22" strokeWidth="1.1" strokeLinejoin="round" />

      {/* 山 */}
      {MOUNTAINS.map(([lat, lon, s, snow], i) => {
        const p = projectLatLon(lat, lon);
        const w = 22 * s;
        const h = 13 * s;
        return <use key={i} href={snow ? '#mtn-snow' : '#mtn'} x={p.x - w / 2} y={p.y - h * 0.92} width={w} height={h} opacity={0.9} />;
      })}

      {/* 富士山 */}
      <g transform={`translate(${FUJI.x.toFixed(1)} ${FUJI.y.toFixed(1)})`}>
        <path d="M-17 1L-5 -15L5 -15L17 1Z" fill="#5f7da6" stroke="#2c3e5c" strokeWidth="1" strokeLinejoin="round" />
        <path d="M-5 -15L5 -15L8.6 -10.2L5.4 -11.4L2.8 -9L0 -11.2L-2.8 -9L-5.4 -11.4L-8.6 -10.2Z" fill="#fbf6e8" />
      </g>

      {/* 県名（寄ったときだけ） */}
      <g className="lod-near">
        {GEO_PREFECTURES.map(p => (
          <text
            key={p.code}
            x={p.lx}
            y={p.ly}
            textAnchor="middle"
            className="lbl-pref"
            fill="rgba(70,52,30,0.55)"
            fontFamily='"Shippori Mincho", serif'
          >
            {p.name}
          </text>
        ))}
      </g>

      {/* 海の名前 */}
      {SEA_LABELS.map(s => (
        <text
          key={s.name}
          x={s.x}
          y={s.y}
          textAnchor="middle"
          fontSize={s.size}
          fill="rgba(190,220,245,0.32)"
          fontFamily='"Shippori Mincho", serif'
          fontStyle="italic"
          letterSpacing={s.size * 0.35}
        >
          {s.name}
        </text>
      ))}

      {/* 地方名（海上） */}
      {(Object.keys(REGION_LABEL_POS) as GeoRegion[]).map(r => {
        const pos = REGION_LABEL_POS[r];
        return (
          <text
            key={r}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="lbl-region"
            fill="#fbf6e8"
            stroke={REGION_ACCENT[r]}
            fontFamily='"Shippori Mincho", serif'
            fontWeight="800"
            style={{ paintOrder: 'stroke' }}
          >
            {REGION_NAME[r]}
          </text>
        );
      })}
    </g>
  );
}

const MapTerrain = memo(MapTerrainImpl);
export default MapTerrain;
