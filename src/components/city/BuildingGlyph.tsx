// 建物の種類を表す小さな SVG 絵（UI 用）。24x24 viewBox。
// 街並みの絵（TownScene）と同じ建物の絵（townArt/buildings.tsx）を、細部を省いて縮めて使う。
// 等級で絵が変わる（住宅: 長屋 → 町家 → 蔵造り、商業: 屋台 → 商店 → 百貨店、工業: 工房 → 工場 → 大工場）。
import type { CSSProperties } from 'react';
import type { BuildingKind } from '../../game/city';
import { BuildingArt } from './townArt/buildings';
import { PLAIN_CTX, artBox } from './townArt/art';

/** 24×24 の枠に収めた建物の絵。SVG の中に置く（地面は下端）。暗い面でも輪郭が沈まないよう、和紙色の縁を敷く */
export function BuildingShapes({ kind, level = 1 }: { kind: BuildingKind; level?: number }) {
  const box = artBox(kind, level);
  const s = Math.min(21.6 / box.w, 21 / box.h);
  const ctx = { ...PLAIN_CTX, icon: true, sw: 1.15 / s };
  return (
    <g transform={`translate(12 22.6) scale(${s})`}>
      <g className="tw-halo" style={{ '--tw-halo': `${2.2 / s}px` } as CSSProperties}>
        <BuildingArt kind={kind} level={level} ctx={ctx} />
      </g>
      <BuildingArt kind={kind} level={level} ctx={ctx} />
    </g>
  );
}

export default function BuildingGlyph({ kind, level = 1, size = 28, className = '' }: { kind: BuildingKind; level?: number; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <BuildingShapes kind={kind} level={level} />
    </svg>
  );
}
