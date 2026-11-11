// 地図: 今年の舞台（お題係。game/cityQuests.ts）。舞台の地方の陸を金でうっすら染め、地方名を金で縁取り、
// その下に「今年の舞台」と添える。JapanMap の svg の中、MapTerrain のすぐ後（道とマスの下）に置く。
// props は stage だけの memo コンポーネントなので、パン・ズーム・手番の進行では再描画されない（年が替わったときだけ）。
// 文字の大きさはズーム段階（svg の data-lod）ごとに index.css の qs-stage-* で切り替える。
import { memo } from 'react';
import { GEO_PREFECTURES } from '../../data/japanGeo';
import type { GeoRegion } from '../../data/japanGeo';
import type { Region } from '../../game/types';
import { REGION_NAME, REGION_LABEL_POS } from './mapTheme';

interface StageHighlightProps {
  /** 今年の舞台の地方（city.quests.stage） */
  stage: readonly Region[];
}

// 盤の地方（8つ）→ 地形の地方（沖縄は、盤では九州に入っている）
const GEO_OF: Record<Region, GeoRegion[]> = {
  hokkaido: ['hokkaido'], tohoku: ['tohoku'], kanto: ['kanto'], chubu: ['chubu'],
  kinki: ['kinki'], chugoku: ['chugoku'], shikoku: ['shikoku'], kyushu: ['kyushu', 'okinawa'],
};

// 地方ごとに県の形をまとめる（1地方1パス）
const REGION_D: Map<GeoRegion, string> = (() => {
  const parts = new Map<GeoRegion, string[]>();
  for (const p of GEO_PREFECTURES) {
    const arr = parts.get(p.region) ?? [];
    arr.push(p.d);
    parts.set(p.region, arr);
  }
  return new Map([...parts.entries()].map(([region, ds]) => [region, ds.join('')]));
})();

function StageHighlightImpl({ stage }: StageHighlightProps) {
  const regions = stage.flatMap(r => GEO_OF[r] ?? []);
  if (regions.length === 0) return null;
  return (
    // 舞台が替わったら（key）一度だけ金がふわっと差す
    <g key={stage.join('-')} aria-hidden="true" className="qs-stage pointer-events-none select-none">
      {regions.map(r => (
        <path key={r} d={REGION_D.get(r) ?? ''} className="qs-stage-land" />
      ))}
      {regions.map(r => {
        const pos = REGION_LABEL_POS[r];
        // 「今年の舞台」の添え書きは地方ごとに1つ（九州の舞台では、沖縄の名前は金にするだけ）
        const tagged = stage.some(s => GEO_OF[s]?.[0] === r);
        return (
          <g key={r}>
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="lbl-region qs-stage-name" fontFamily='"Shippori Mincho", serif' fontWeight="800">
              {REGION_NAME[r]}
            </text>
            {tagged && (
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="qs-stage-tag" fontFamily='"Shippori Mincho", serif' fontWeight="800">
                今年の舞台
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

const StageHighlight = memo(StageHighlightImpl);
export default StageHighlight;
