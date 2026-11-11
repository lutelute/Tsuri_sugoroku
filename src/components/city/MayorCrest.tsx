// 町長の家紋（オリジナル）: 丸の中に三つの屋根。持ち主の色で染める。
// 地図の <svg> の中では MayorCrestShape（中心 0,0 の <g>）を、HTML では MayorCrest（<svg>）を使う。
import { memo } from 'react';

interface ShapeProps {
  /** 外側の丸の半径（SVG の単位） */
  r: number;
  color: string;
  /** 条例が出ている町は右下に条例の色の小さな点を付ける */
  ordinanceColor?: string;
  /** 町長がいない（空席）ときは点線の丸だけ */
  vacant?: boolean;
}

/** 家紋の形（中心 0,0）。地図の町の印にも、画面の見出しにも使う */
export function MayorCrestShape({ r, color, ordinanceColor, vacant = false }: ShapeProps) {
  if (vacant) {
    return <circle r={r} fill="rgba(251,246,232,0.08)" stroke="rgba(251,246,232,0.55)" strokeWidth={r * 0.14} strokeDasharray={`${r * 0.35} ${r * 0.28}`} />;
  }
  // 三つの屋根（上に1つ、下に2つ）。屋根は 半径 r の丸に収まる大きさ
  const roof = (cx: number, cy: number, s: number) =>
    `M ${cx - s} ${cy + s * 0.55} L ${cx} ${cy - s * 0.6} L ${cx + s} ${cy + s * 0.55} Z`;
  const s = r * 0.36;
  return (
    <g>
      <circle r={r} fill={color} stroke="#fbf6e8" strokeWidth={r * 0.12} />
      <circle r={r * 0.78} fill="none" stroke="#fbf6e8" strokeWidth={r * 0.07} opacity={0.85} />
      <path d={roof(0, -r * 0.3, s)} fill="#fbf6e8" />
      <path d={roof(-r * 0.34, r * 0.27, s)} fill="#fbf6e8" />
      <path d={roof(r * 0.34, r * 0.27, s)} fill="#fbf6e8" />
      {ordinanceColor && (
        <circle cx={r * 0.78} cy={r * 0.78} r={r * 0.34} fill={ordinanceColor} stroke="#fbf6e8" strokeWidth={r * 0.1} />
      )}
    </g>
  );
}

interface CrestProps {
  size?: number;
  color: string;
  ordinanceColor?: string;
  vacant?: boolean;
  title?: string;
  className?: string;
}

/** HTML 用の家紋（<svg>） */
function MayorCrestImpl({ size = 24, color, ordinanceColor, vacant, title, className }: CrestProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      overflow="visible"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <MayorCrestShape r={10.5} color={color} ordinanceColor={ordinanceColor} vacant={vacant} />
    </svg>
  );
}

const MayorCrest = memo(MayorCrestImpl);
export default MayorCrest;
