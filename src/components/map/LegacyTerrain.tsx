// ジグザグ盤・島ホップ盤用の地形（座標が地理と一致しないため、ノード凸包による抽象表現を使う）
import { memo } from 'react';
import { LAND_PATHS, LAND_TONES, REGION_FILLS } from './landmass';

function LegacyTerrainImpl() {
  return (
    <g aria-hidden="true" className="pointer-events-none select-none">
      <rect x={-2400} y={-2400} width={6200} height={6400} fill="#123557" />
      {REGION_FILLS.map(r => (
        <g key={`region-${r.id}`}>
          <path d={r.path} fill={r.color} opacity="0.42" />
          <path d={r.path} fill="none" stroke={r.color} strokeWidth="3.2" strokeLinejoin="round" />
        </g>
      ))}
      {LAND_PATHS.map((d, i) => {
        const tone = LAND_TONES[i] ?? 0.3;
        const hue = 38 + tone * 28;
        return <path key={`land-${i}`} d={d} fill="none" stroke={`hsla(${hue}, 35%, 70%, 0.7)`} strokeWidth="2.4" strokeLinejoin="round" />;
      })}
      {REGION_FILLS.map(r => {
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
            stroke="rgba(10,28,46,0.95)"
            strokeWidth={size * 0.2}
            paintOrder="stroke"
          >
            {r.name}
          </text>
        );
      })}
    </g>
  );
}

const LegacyTerrain = memo(LegacyTerrainImpl);
export default LegacyTerrain;
