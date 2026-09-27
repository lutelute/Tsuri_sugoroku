// 貧乏神の絵（オリジナル）。民話の貧乏神らしく、やせた小さな老人が
// 継ぎはぎだらけのボロの着物に縄の帯をしめ、渋団扇（しぶうちわ）を持っている。
// 大貧乏神は墨紫の着物に破れ笠、人魂（ひとだま）を連れて、にやりと笑う。
//
// <svg> を返すので、HTML の中でも、地図の <svg> の中（x / y で位置を指定）でも使える。
import { memo, useId } from 'react';
import { useReducedMotion } from '../fx/useReducedMotion';

export interface BinboFigureProps {
  /** 高さ(px)。幅はその 5/6 */
  size?: number;
  /** 大貧乏神の姿 */
  great?: boolean;
  /** 団扇をあおぐ・体を揺らす（回数限定。動きを減らす設定では動かない） */
  animated?: boolean;
  /** 地図などの <svg> の中に置くときの位置 */
  x?: number;
  y?: number;
  /** 読み上げ用の名前。省略すると飾り扱い（aria-hidden） */
  title?: string;
  className?: string;
}

const VB_W = 100;
const VB_H = 120;
/** 動かすときの繰り返し回数（常時ループはしない） */
const REPEAT = 6;

const PALETTE = {
  normal: {
    robe: '#8f7f63', robeShade: '#6f604a', sleeve: '#7f7058', seam: '#5a4a36',
    patchA: '#5b7896', patchB: '#b58a45', obi: '#b89a5a', obiLine: '#7f6532',
    fan: '#9a5230', fanRim: '#5e2f17', fanRib: '#d49a68',
  },
  great: {
    robe: '#463a58', robeShade: '#2c2339', sleeve: '#3b3049', seam: '#1c1526',
    patchA: '#6e2c3c', patchB: '#2f4a5e', obi: '#8a2a2a', obiLine: '#4e1414',
    fan: '#3f1f18', fanRim: '#1f0d08', fanRib: '#9a6a4a',
  },
} as const;

/** 渋団扇（切れ込みのある丸い団扇）。中心 cx,cy・半径 r、柄の根元 hx,hy */
function Fan({ cx, cy, r, hx, hy, c, great, detail }: {
  cx: number; cy: number; r: number; hx: number; hy: number;
  c: (typeof PALETTE)[keyof typeof PALETTE]; great: boolean; detail: boolean;
}) {
  const pt = (deg: number, rr = r) => {
    const a = (deg * Math.PI) / 180;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as const;
  };
  // 右上に破れた切れ込み（-70°〜-50° を内側へえぐる）
  const [sx, sy] = pt(-50);
  const [ex, ey] = pt(-70);
  const [nx, ny] = pt(-60, r * 0.62);
  const body = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)} L ${nx.toFixed(2)} ${ny.toFixed(2)} Z`;
  const ribs = [-160, -130, -100, -20, 10, 40, 70, 100, 130];
  return (
    <g>
      <line x1={hx} y1={hy} x2={cx - r * 0.25} y2={cy + r * 0.7} stroke="#c9a86a" strokeWidth={1.9} strokeLinecap="round" />
      <path d={body} fill={c.fan} stroke={c.fanRim} strokeWidth={1.1} strokeLinejoin="round" />
      {detail && ribs.map(deg => {
        const [px, py] = pt(deg, r * 0.9);
        return <line key={deg} x1={cx - r * 0.25} y1={cy + r * 0.7} x2={px} y2={py} stroke={c.fanRib} strokeWidth={0.55} opacity={0.55} />;
      })}
      {great && detail && (
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={r * 1.05} fontWeight="bold"
          fontFamily='"Shippori Mincho", serif' fill="#e6c266" className="select-none">貧</text>
      )}
    </g>
  );
}

/** 人魂（ひとだま）。大貧乏神のお供 */
function Hitodama({ x, y, s, grad, animate }: { x: number; y: number; s: number; grad: string; animate: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g>
        {animate && (
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="2.2s" repeatCount={REPEAT} />
        )}
        <path d="M 0 -6 C 5 -6 6 1 2.5 4 C 1 5.5 -1.5 7 -4 13 C -3 8 -6 4 -5 0 C -4.5 -4 -2.5 -6 0 -6 Z" fill={`url(#${grad})`} opacity={0.9} />
        <circle cx={-0.5} cy={-1.5} r={1.8} fill="#ffffff" opacity={0.8} />
      </g>
    </g>
  );
}

function BinboFigureImpl({ size = 96, great = false, animated = false, x, y, title, className }: BinboFigureProps) {
  const reduced = useReducedMotion();
  const animate = animated && !reduced;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (k: string) => `binbo-${k}-${uid}`;
  const c = great ? PALETTE.great : PALETTE.normal;
  /** 小さく描くときは細かい線を省く（地図の駒の横など） */
  const detail = size >= 40;
  const width = (size * VB_W) / VB_H;

  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={size}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      overflow="visible"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={id('skin')} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={great ? '#e8d8c0' : '#f5e6c8'} />
          <stop offset="100%" stopColor={great ? '#b9a489' : '#d9bf95'} />
        </radialGradient>
        <linearGradient id={id('robe')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.robe} />
          <stop offset="70%" stopColor={c.robe} />
          <stop offset="100%" stopColor={c.robeShade} />
        </linearGradient>
        {great && (
          <>
            <radialGradient id={id('aura')} cx="50%" cy="55%" r="50%">
              <stop offset="0%" stopColor="#6d3a9c" stopOpacity={0.55} />
              <stop offset="60%" stopColor="#3b1f5a" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#1a0f24" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={id('wisp')} cx="45%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#f2fbff" />
              <stop offset="55%" stopColor="#9fd0f5" />
              <stop offset="100%" stopColor="#4d7fc0" />
            </radialGradient>
          </>
        )}
      </defs>

      {/* 大貧乏神の妖気 */}
      {great && <ellipse cx={50} cy={64} rx={50} ry={58} fill={`url(#${id('aura')})`} />}
      {/* 小さく描くとき（地図の暗い海の上など）は淡い後光で輪郭を立たせる */}
      {!great && !detail && <ellipse cx={50} cy={62} rx={38} ry={54} fill="#fbf6e8" opacity={0.22} />}

      {/* 接地影 */}
      <ellipse cx={50} cy={113} rx={21} ry={3.6} fill="rgba(20,12,6,0.3)" />

      <g>
        {animate && (
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.6; 0 0" dur="1.1s" repeatCount={REPEAT} />
        )}

        {/* 足（やせた素足に草履） */}
        <path d="M 45 95 L 44 109" stroke="#d6bd93" strokeWidth={3.2} strokeLinecap="round" />
        <path d="M 55 95 L 56.5 109" stroke="#d6bd93" strokeWidth={3.2} strokeLinecap="round" />
        <ellipse cx={43} cy={110.6} rx={4.4} ry={1.7} fill="#b8995a" stroke="#7a5a2a" strokeWidth={0.5} />
        <ellipse cx={57.5} cy={110.6} rx={4.4} ry={1.7} fill="#b8995a" stroke="#7a5a2a" strokeWidth={0.5} />

        {/* 奥の袖（だらりと下げた腕。裾はぼろぼろ） */}
        <path d="M 39 59 C 32 61 27 64 25.5 68 L 26 86 L 28.5 83 L 30.5 87.5 L 33 83.5 L 35.5 86.5 L 38 82 Z"
          fill={c.sleeve} stroke={c.seam} strokeWidth={0.8} strokeLinejoin="round" />
        {detail && <circle cx={31} cy={87} r={2.3} fill={`url(#${id('skin')})`} stroke="#a88a62" strokeWidth={0.4} />}

        {/* 着物（裾はぎざぎざに破れている） */}
        <path
          d="M 38 57.5 C 34.5 70 33 84 31.5 97 L 35 94.5 L 38 99 L 41.2 95.3 L 44.8 99.6 L 48 95.8 L 51.8 100 L 55 95.8 L 58.8 99.6 L 62 95.3 L 65.2 98.6 L 68.5 96.3 C 67 84 65.5 70 62 57.5 Q 50 53 38 57.5 Z"
          fill={`url(#${id('robe')})`} stroke={c.seam} strokeWidth={0.9} strokeLinejoin="round"
        />
        {/* 継ぎ当て（ちくちく縫い目つき） */}
        <g transform="rotate(8 59 88.5)">
          <rect x={55} y={85} width={8.5} height={7} fill={c.patchA} />
          {detail && <rect x={55.8} y={85.8} width={6.9} height={5.4} fill="none" stroke="#efe4c8" strokeWidth={0.55} strokeDasharray="1.2 1.1" />}
        </g>
        <g transform="rotate(-10 39 67)">
          <rect x={36} y={64} width={6.4} height={6.2} fill={c.patchB} />
          {detail && <rect x={36.7} y={64.7} width={5} height={4.8} fill="none" stroke="#efe4c8" strokeWidth={0.55} strokeDasharray="1.2 1.1" />}
        </g>
        {/* かぎ裂き */}
        {detail && <path d="M 58 67 l 2 2.2 l -1.4 1.8 l 2.2 2.4" fill="none" stroke={c.seam} strokeWidth={0.8} strokeLinecap="round" />}
        {detail && <path d="M 36.5 90 l 1.8 -1.6 l 0.8 2.2 l 1.8 -1.4" fill="none" stroke={c.seam} strokeWidth={0.7} strokeLinecap="round" />}

        {/* 襟（右前: 正面から見て「y」の形） */}
        <path d="M 43.6 55.8 L 50 66.5 L 56.4 55.8" fill="none" stroke="#efe4c8" strokeWidth={2.6} strokeLinejoin="round" />
        <path d="M 56.8 55.6 Q 50.5 66 42.5 79" fill="none" stroke={c.seam} strokeWidth={2} strokeLinecap="round" />

        {/* 縄の帯 */}
        <path d="M 33.8 78.2 Q 50 82 66.4 78.2" fill="none" stroke={c.obi} strokeWidth={3.4} strokeLinecap="round" />
        {detail && [37, 41, 45, 49, 53, 57, 61, 64.5].map(px => (
          <path key={px} d={`M ${px} ${78.2 + 1.6} l 1.6 -3`} stroke={c.obiLine} strokeWidth={0.7} />
        ))}
        <path d="M 40.5 80.5 l -2.2 7.2 M 41.8 80.6 l 1.4 6.4" stroke={c.obi} strokeWidth={1.6} strokeLinecap="round" />

        {/* 手前の腕: 渋団扇を持ち上げる（ぱたぱたとあおぐ） */}
        <path d="M 60.5 58.5 L 70 61.5 L 73 69.5 L 70.6 76 L 68.2 72.4 L 65.6 77 L 63 72.2 Z"
          fill={c.sleeve} stroke={c.seam} strokeWidth={0.8} strokeLinejoin="round" />
        <g>
          {animate && (
            <animateTransform attributeName="transform" type="rotate" values="0 66 62; -16 66 62; 7 66 62; 0 66 62" dur="1.1s" repeatCount={REPEAT} />
          )}
          <Fan cx={great ? 80 : 79} cy={great ? 40 : 42} r={great ? 13 : 11} hx={71} hy={61} c={c} great={great} detail={detail} />
          <circle cx={71} cy={61.2} r={2.7} fill={`url(#${id('skin')})`} stroke="#a88a62" strokeWidth={0.4} />
        </g>

        {/* 頭 */}
        <circle cx={32.6} cy={40.5} r={3.3} fill={`url(#${id('skin')})`} stroke="#a88a62" strokeWidth={0.5} />
        <circle cx={67.4} cy={40.5} r={3.3} fill={`url(#${id('skin')})`} stroke="#a88a62" strokeWidth={0.5} />
        <circle cx={50} cy={38} r={18} fill={`url(#${id('skin')})`} stroke="#a88a62" strokeWidth={0.8} />
        {/* 横の白髪 */}
        <ellipse cx={33.6} cy={35.5} rx={3.4} ry={5.2} fill="#eee6d8" stroke="#c9bda6" strokeWidth={0.4} />
        <ellipse cx={66.4} cy={35.5} rx={3.4} ry={5.2} fill="#eee6d8" stroke="#c9bda6" strokeWidth={0.4} />

        {great ? (
          <>
            {/* 大貧乏神: 破れ笠 */}
            <path d="M 25 27 Q 50 4 75 25.5 Q 50 19.5 25 27 Z" fill="#b8995a" stroke="#6f5226" strokeWidth={0.9} strokeLinejoin="round" />
            {detail && (
              <>
                <path d="M 50 9 L 36 24 M 50 9 L 44 22.5 M 50 9 L 56 22 M 50 9 L 64 23.5" stroke="#8a6d38" strokeWidth={0.55} />
                <path d="M 66 19.5 l 3 1.2 l -1.5 2.8 l 3.5 0.4" fill="none" stroke="#5a3e1a" strokeWidth={0.8} />
              </>
            )}
            {/* つり上がった白眉・光る目・にやり */}
            <path d="M 39.5 32 Q 44 32.8 47.5 35.6" stroke="#b8ab92" strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M 39.5 32 Q 44 32.8 47.5 35.6" stroke="#f4eee2" strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <path d="M 52.5 35.6 Q 56 32.8 60.5 32" stroke="#b8ab92" strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M 52.5 35.6 Q 56 32.8 60.5 32" stroke="#f4eee2" strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <ellipse cx={44} cy={39.6} rx={2.1} ry={1.7} fill="#21180f" />
            <ellipse cx={56} cy={39.6} rx={2.1} ry={1.7} fill="#21180f" />
            <circle cx={44.6} cy={39.1} r={0.7} fill="#ffe27a" />
            <circle cx={56.6} cy={39.1} r={0.7} fill="#ffe27a" />
            <ellipse cx={50} cy={43.4} rx={2.5} ry={2} fill="#c9917a" />
            <path d="M 43.5 47 Q 50 54 56.5 47 Q 50 49.6 43.5 47 Z" fill="#5a2020" stroke="#3a1414" strokeWidth={0.5} />
            {detail && (
              <>
                <rect x={46.8} y={47.9} width={1.7} height={1.6} fill="#fbf6e8" />
                <rect x={51.5} y={47.9} width={1.7} height={1.6} fill="#fbf6e8" />
              </>
            )}
          </>
        ) : (
          <>
            {/* ふつうの貧乏神: てっぺんに3本の毛・下がり眉・眠たげな目・困り笑い */}
            <path d="M 47 21 q -2.4 -5 0.8 -8.4 M 50 20.2 q 0.8 -6 4.4 -7 M 53.2 21 q 3 -3 1.8 -6.2" fill="none" stroke="#3b3024" strokeWidth={0.95} strokeLinecap="round" />
            {detail && <ellipse cx={43.5} cy={27} rx={5} ry={2.4} fill="#ffffff" opacity={0.45} transform="rotate(-22 43.5 27)" />}
            {detail && <path d="M 43.5 28.6 q 6.5 -2 13 0" fill="none" stroke="#b99d74" strokeWidth={0.7} />}
            <path d="M 39 35.6 Q 42 32 47 32.8" stroke="#b8ab92" strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M 39 35.6 Q 42 32 47 32.8" stroke="#f4eee2" strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <path d="M 53 32.8 Q 58 32 61 35.6" stroke="#b8ab92" strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M 53 32.8 Q 58 32 61 35.6" stroke="#f4eee2" strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <path d="M 41.4 38.6 L 46.6 38.6" stroke="#2a2118" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M 53.4 38.6 L 58.6 38.6" stroke="#2a2118" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M 42.6 38.7 A 1.9 1.9 0 0 0 45.4 38.7 Z" fill="#2a2118" />
            <path d="M 54.6 38.7 A 1.9 1.9 0 0 0 57.4 38.7 Z" fill="#2a2118" />
            {detail && <path d="M 42.2 42 q 2 1 4 0 M 53.8 42 q 2 1 4 0" fill="none" stroke="#c4a57a" strokeWidth={0.6} />}
            <ellipse cx={50} cy={43.2} rx={2.5} ry={2} fill="#e3ab86" />
            <path d="M 45.5 48 Q 50 51.6 54.5 48" fill="none" stroke="#6a3a2a" strokeWidth={1} strokeLinecap="round" />
            {detail && <rect x={48.7} y={49} width={1.8} height={1.6} fill="#fbf6e8" stroke="#6a3a2a" strokeWidth={0.35} />}
            {/* 冷や汗 */}
            {detail && <path d="M 64.5 27.5 q 2.2 3.2 0 4.8 q -2.2 -1.6 0 -4.8 Z" fill="#9cc8e8" opacity={0.9} />}
          </>
        )}
        {/* 頬・あごひげ（両方の姿で共通） */}
        <ellipse cx={39.6} cy={45.2} rx={3} ry={1.8} fill="#e8907e" opacity={0.42} />
        <ellipse cx={60.4} cy={45.2} rx={3} ry={1.8} fill="#e8907e" opacity={0.42} />
        <path d="M 48.4 51.6 q 1.4 5 -0.2 8.4 q 2.8 -3 3.4 -8.4 Z" fill="#eee6d8" stroke="#c9bda6" strokeWidth={0.4} />
      </g>

      {/* 大貧乏神のお供の人魂 */}
      {great && (
        <>
          <Hitodama x={15} y={46} s={1.1} grad={id('wisp')} animate={animate} />
          <Hitodama x={88} y={76} s={0.9} grad={id('wisp')} animate={animate} />
        </>
      )}

      {/* ふつうの貧乏神のまわりを飛ぶ蠅（大きく描くときだけ） */}
      {!great && detail && (
        <g opacity={0.8}>
          <path d="M 18 24 q 3 -3 6 0 q 3 3 6 0" fill="none" stroke="#4a3a28" strokeWidth={0.5} strokeDasharray="1 1.2" />
          <ellipse cx={31.5} cy={23.2} rx={1.5} ry={0.9} fill="#c9d6de" opacity={0.8} transform="rotate(-30 31.5 23.2)" />
          <circle cx={32} cy={24.3} r={1.1} fill="#2a2118" />
        </g>
      )}
    </svg>
  );
}

/** 貧乏神の絵。size は高さ(px)。great で大貧乏神 */
const BinboFigure = memo(BinboFigureImpl);
export default BinboFigure;
