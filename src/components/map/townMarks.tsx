// 地図の上の町の姿に使う、ごく小さな建物の絵（地図の座標で幅 4.4・高さ 11 まで）。
// 街並みの絵（components/city/TownScene.tsx）と同じ見立て: 住宅は緑の屋根の家、商業は藍の屋根の店と百貨店、
// 工業はのこぎり屋根と煙突、観光は鳥居と塔、公園は木、発電所は鉄塔、漁港は舟。
// 地図は止まった絵なので、ここは動かさない（アニメなし）。
import type { ReactNode } from 'react';
import type { BuildingKind } from '../../game/city';
import { MINI_W } from './townMarkSize';

const INK = '#1c140c';
const WASHI = '#f4ecd8';
const GRAY = '#8a857b';
const GRAY_D = '#6a655c';
const O = { stroke: INK, strokeWidth: 0.45, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** 小さな建物の絵。x は左端、base は地面 */
export function MiniBuilding({ kind, level, vacant = false, x, base }: { kind: BuildingKind; level: number; vacant?: boolean; x: number; base: number }) {
  const lv = Math.max(1, Math.min(3, Math.round(level)));
  const c = (hex: string, dark = false) => (vacant ? (dark ? GRAY_D : GRAY) : hex);
  const w = MINI_W;
  const cx = x + w / 2;
  switch (kind) {
    case 'res': {
      const h = [2.6, 4.2, 6][lv - 1];
      const rh = [2.2, 2.4, 3][lv - 1];
      return (
        <g>
          <rect x={x + 0.3} y={base - h} width={w - 0.6} height={h} fill={c(WASHI)} {...O} />
          {lv === 3 && <rect x={x + 0.3} y={base - 1.7} width={w - 0.6} height={1.7} fill={c('#3d4652', true)} {...O} />}
          {lv >= 2 && <path d={`M${x + 1.1} ${base - h + 1.4}h${w - 2.2}`} stroke={c('#e0a93a', true)} strokeWidth={0.9} />}
          <path d={`M${x - 0.5} ${base - h}L${cx} ${base - h - rh}L${x + w + 0.5} ${base - h}Z`} fill={c('#4f9d5d', true)} {...O} />
        </g>
      );
    }
    case 'com': {
      if (lv === 1) {
        return (
          <g>
            <rect x={x + 0.5} y={base - 2.2} width={w - 1} height={2.2} fill={c('#9a7648')} {...O} />
            <path d={`M${x - 0.3} ${base - 2.2}L${cx} ${base - 3.8}L${x + w + 0.3} ${base - 2.2}Z`} fill={c('#3a78b8', true)} {...O} />
          </g>
        );
      }
      if (lv === 2) {
        return (
          <g>
            <rect x={x + 0.3} y={base - 4.4} width={w - 0.6} height={4.4} fill={c(WASHI)} {...O} />
            <path d={`M${x + 0.7} ${base - 1.9}h${w - 1.4}`} stroke={c('#c63a26', true)} strokeWidth={1.1} />
            <path d={`M${x - 0.5} ${base - 4.4}L${cx} ${base - 6.8}L${x + w + 0.5} ${base - 4.4}Z`} fill={c('#3a78b8', true)} {...O} />
          </g>
        );
      }
      return (
        <g>
          <rect x={x + 0.3} y={base - 8.4} width={w - 0.6} height={8.4} fill={c('#e6d9bb')} {...O} />
          <path d={`M${x + 1.3} ${base - 6.9}v1.2M${cx} ${base - 6.9}v1.2M${x + w - 1.3} ${base - 6.9}v1.2M${x + 1.3} ${base - 4.5}v1.2M${cx} ${base - 4.5}v1.2M${x + w - 1.3} ${base - 4.5}v1.2`} stroke={c('#3a78b8', true)} strokeWidth={0.8} strokeLinecap="butt" />
          <rect x={x - 0.1} y={base - 9.2} width={w + 0.2} height={1} fill={c('#234f80', true)} {...O} />
          <path d={`M${cx - 1.1} ${base - 9.2}L${cx} ${base - 10.6}L${cx + 1.1} ${base - 9.2}Z`} fill={c('#3a78b8', true)} {...O} />
          <path d={`M${x + 0.3} ${base - 2}h${w - 0.6}`} stroke={c('#3a78b8', true)} strokeWidth={0.8} />
        </g>
      );
    }
    case 'ind': {
      const ch = [5.2, 7.8, 10.6][lv - 1];
      return (
        <g>
          <rect x={x + w - 1.5} y={base - ch} width={1.2} height={ch} fill={c(lv === 3 ? WASHI : '#a4553b')} {...O} />
          {lv === 3 && <path d={`M${x + w - 1.5} ${base - ch + 1.1}h1.2M${x + w - 1.5} ${base - ch + 4}h1.2`} stroke={c('#c63a26', true)} strokeWidth={1.2} strokeLinecap="butt" />}
          <path d={`M${x} ${base}V${base - 3.6}L${x + 1.6} ${base - 2.4}V${base - 3.6}L${x + 3.2} ${base - 2.4}V${base}Z`} fill={c('#cfa23c')} {...O} />
          {lv === 3 && <rect x={x + 0.2} y={base - 6.4} width={1} height={3.4} fill={c('#8f8878', true)} {...O} />}
        </g>
      );
    }
    case 'park':
      return (
        <g>
          <path d={`M${cx} ${base}V${base - 2.6}`} stroke={c('#6b4b2a', true)} strokeWidth={0.9} />
          <circle cx={cx} cy={base - 3.6} r={2.2} fill={c('#7cc36b')} {...O} />
        </g>
      );
    case 'power':
      return (
        <g>
          <path d={`M${x + 0.6} ${base}L${cx} ${base - 9.2}L${x + w - 0.6} ${base}M${x + 1.4} ${base - 3.4}h${w - 2.8}M${x + 0.1} ${base - 6.4}h${w - 0.2}`} fill="none" stroke={c('#3f4a55', true)} strokeWidth={0.75} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={cx} cy={base - 9.4} r={1.6} fill={c('#e0c341')} {...O} />
        </g>
      );
    case 'port':
      return (
        <g>
          <path d={`M${cx} ${base - 1.8}V${base - 6.6}`} stroke={INK} strokeWidth={0.5} />
          <path d={`M${cx} ${base - 6.6}h2.2l-0.5 0.9 0.5 0.9h-2.2Z`} fill={c('#4fb0c6')} {...O} strokeWidth={0.35} />
          <path d={`M${x - 0.2} ${base - 2.2}Q${cx} ${base - 0.8} ${x + w + 0.2} ${base - 2.4}L${x + w - 0.9} ${base}H${x + 0.9}Z`} fill={c(WASHI)} {...O} />
          <path d={`M${x + 0.6} ${base - 0.9}h${w - 1.2}`} stroke={c('#4fb0c6', true)} strokeWidth={0.7} />
        </g>
      );
    case 'tourism': {
      if (lv === 1) {
        return (
          <path
            d={`M${x + 0.9} ${base}V${base - 4}M${x + w - 0.9} ${base}V${base - 4}M${x + 0.3} ${base - 2.8}h${w - 0.6}M${x - 0.3} ${base - 4.2}h${w + 0.6}`}
            fill="none"
            stroke={c('#c63a26', true)}
            strokeWidth={0.95}
            strokeLinecap="round"
          />
        );
      }
      const tiers = lv === 2 ? 2 : 3;
      const parts: ReactNode[] = [];
      let y = base;
      let half = 1.5;
      for (let i = 0; i < tiers; i++) {
        parts.push(<rect key={`b${i}`} x={cx - half} y={y - 1.7} width={half * 2} height={1.7} fill={c('#c63a26')} {...O} />);
        y -= 1.7;
        const last = i === tiers - 1;
        parts.push(<path key={`r${i}`} d={`M${cx - half - 1.4} ${y}L${cx - (last ? 0 : half - 0.5)} ${y - (last ? 2.2 : 1.2)}H${cx + (last ? 0 : half - 0.5)}L${cx + half + 1.4} ${y}Z`} fill={c('#d0628a', true)} {...O} />);
        y -= last ? 2.2 : 1.2;
        half -= 0.3;
      }
      parts.push(<path key="f" d={`M${cx} ${y}v-1.6`} stroke={c('#d4a843', true)} strokeWidth={0.6} strokeLinecap="round" />);
      return <g>{parts}</g>;
    }
  }
}

/** 引いた表示の印: 持ち主の色で塗った小さな家（建物の多い順に3人まで、割合で縞にする） */
export function FarTownMark({ x, base, shares, gold }: { x: number; base: number; shares: { color: string; n: number }[]; gold: boolean }) {
  const w = 11;
  const h = 5.6;
  const total = shares.reduce((s, v) => s + v.n, 0) || 1;
  // 縞の左端（割合で幅を分ける）
  const offs: number[] = [];
  let acc = 0;
  for (const v of shares) {
    offs.push(acc);
    acc += (v.n / total) * w;
  }
  const stripes = shares.map((v, i) => <rect key={i} x={x - w / 2 + offs[i]} y={base - h} width={(v.n / total) * w} height={h} fill={v.color} />);
  const roof = `M${x - w / 2 - 1.6} ${base - h}L${x} ${base - h - 5.6}L${x + w / 2 + 1.6} ${base - h}Z`;
  return (
    <g>
      <path d={`${roof}M${x - w / 2} ${base - h}h${w}v${h}h${-w}Z`} fill={WASHI} stroke={gold ? '#e6c266' : WASHI} strokeWidth={gold ? 3.2 : 2.4} strokeLinejoin="round" />
      {stripes}
      <path d={roof} fill={shares[0]?.color ?? WASHI} />
      <path d={`${roof}M${x - w / 2} ${base - h}h${w}v${h}h${-w}Z`} fill="none" stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
    </g>
  );
}
