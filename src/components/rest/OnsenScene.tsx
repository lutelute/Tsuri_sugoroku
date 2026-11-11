// 札の絵係: 露天風呂の一枚絵（月・山・のれん・岩風呂・桶・お盆の徳利）。360x170。
// 湯気だけを絵の上に重ねた別の要素にして、ごくゆっくり動かす（transform と opacity だけ。動きを減らす設定では止まる）。
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { INK, WASHI, WASHI2, WASHI3, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, SHU, SHU_DARK, AI, AI_LIGHT, LEAF_DARK, WOOD, WOOD_PALE, STONE, STONE_DARK, scatter } from '../event/artBase';

const STARS = scatter(18, 7);

/** 岩（丸みのある石）。原点は底の真ん中 */
function Rock({ x, y, w, h, c = STONE }: { x: number; y: number; w: number; h: number; c?: string }) {
  const a = w / 2;
  return (
    <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
      <path d={`M${-a} 0 C${-a - 3} ${-h * 0.6} ${-a * 0.5} ${-h} ${-a * 0.1} ${-h} C${a * 0.6} ${-h * 1.05} ${a + 2} ${-h * 0.55} ${a} 0Z`} fill={c} stroke={INK} strokeWidth="1.5" />
      <path d={`M${-a * 0.55} ${-h * 0.72} C${-a * 0.2} ${-h * 0.92} ${a * 0.2} ${-h * 0.92} ${a * 0.45} ${-h * 0.74}`} fill="none" stroke={WASHI} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
    </g>
  );
}

/** 立ちのぼる湯気の形（1本）。幅 24・高さ 70 の箱に描く */
const WISP = 'M12 68 C2 58 22 50 12 38 C2 26 22 18 12 4';

/** 露天風呂の絵の中身（ほかの SVG に入れるときは <svg viewBox="0 0 360 170"> で包む）。u は ID の接頭辞 */
export function OnsenShapes({ u, steam = true }: { u: string; steam?: boolean }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1a2c" />
          <stop offset="0.7" stopColor="#24496e" />
        </linearGradient>
        <radialGradient id={`${u}halo`}>
          <stop offset="0" stopColor="#fff6cf" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#f7e7b8" stopOpacity="0.32" />
          <stop offset="1" stopColor="#f7e7b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bd8d6" />
          <stop offset="1" stopColor="#3f86a8" />
        </linearGradient>
        <radialGradient id={`${u}lamp`}>
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 夜空と月 */}
      <rect x="0" y="0" width="360" height="170" fill={`url(#${u}sky)`} />
      {STARS.map((p, i) => <circle key={i} cx={p.x * 360} cy={p.y * 62 + 4} r={0.7 + p.k * 0.9} fill={WASHI} opacity={0.45 + p.k * 0.5} />)}
      <circle cx="284" cy="36" r="50" fill={`url(#${u}halo)`} />
      <circle cx="284" cy="36" r="19" fill={KIN_PALE} stroke={INK} strokeWidth="1.2" />
      <circle cx="278" cy="31" r="4" fill={KIN_LIGHT} opacity="0.7" />
      <circle cx="291" cy="42" r="3" fill={KIN_LIGHT} opacity="0.6" />
      <g fill={AI_LIGHT} opacity="0.32">
        <rect x="226" y="40" width="74" height="7" rx="3.5" />
        <rect x="252" y="46" width="86" height="7" rx="3.5" />
        <rect x="120" y="22" width="62" height="6" rx="3" />
        <rect x="142" y="27" width="50" height="6" rx="3" />
      </g>

      {/* 遠くの山と、手前の尾根 */}
      <path d="M0 112 L0 82 C30 64 56 60 84 72 C108 46 142 40 170 66 C196 52 226 56 254 76 C284 62 322 64 360 80 L360 112Z" fill="#1d3f63" />
      <path d="M40 66 C56 60 70 62 84 72 M118 56 C132 44 150 46 166 62 M196 56 C214 54 232 62 250 74" fill="none" stroke={AI_LIGHT} strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />
      <path d="M0 116 L0 96 C40 84 82 88 122 98 C172 86 222 88 262 100 C300 90 332 92 360 98 L360 116Z" fill="#132c47" />

      {/* 湯屋: 屋根・柱・のれん */}
      <rect x="27" y="66" width="68" height="46" fill={KIN_LIGHT} opacity="0.55" />
      <circle cx="61" cy="104" r="34" fill={`url(#${u}lamp)`} />
      <path d="M6 62 L61 38 L116 62 L110 66 L12 66Z" fill="#2a2018" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 64.5 H110" stroke={KIN_DARK} strokeWidth="1.6" />
      <rect x="19" y="64" width="7" height="52" fill={WOOD} stroke={INK} strokeWidth="1.4" />
      <rect x="96" y="64" width="7" height="52" fill={WOOD} stroke={INK} strokeWidth="1.4" />
      <rect x="15" y="64" width="92" height="5" fill="#4a3320" stroke={INK} strokeWidth="1.3" />
      <g stroke={INK} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M27 69 H48.6 V95 C41 97.5 34 97.5 27 95Z" fill={SHU} />
        <path d="M50.2 69 H71.8 V96 C64 98.5 57 98.5 50.2 96Z" fill={SHU} />
        <path d="M73.4 69 H95 V95 C88 97.5 81 97.5 73.4 95Z" fill={SHU} />
      </g>
      <text x="61" y="90.5" textAnchor="middle" fontSize="19" fill={WASHI} fontFamily='"Yuji Syuku", "Shippori Mincho", serif'>ゆ</text>
      <path d="M31 73 V91 M77.5 73 V91" stroke={SHU_DARK} strokeWidth="1" opacity="0.6" />

      {/* 石灯籠と松 */}
      <g transform="translate(322 118)" strokeLinejoin="round">
        <circle cx="0" cy="-30" r="24" fill={`url(#${u}lamp)`} />
        <rect x="-4" y="-22" width="8" height="22" fill={STONE} stroke={INK} strokeWidth="1.3" />
        <rect x="-9" y="-36" width="18" height="14" rx="1.5" fill={STONE} stroke={INK} strokeWidth="1.3" />
        <rect x="-5" y="-33" width="10" height="8" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
        <path d="M-15 -36 L0 -47 L15 -36Z" fill={STONE_DARK} stroke={INK} strokeWidth="1.3" />
        <circle cx="0" cy="-49" r="2.6" fill={STONE_DARK} stroke={INK} strokeWidth="1.1" />
      </g>
      <g fill={LEAF_DARK} stroke={INK} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M368 6 C352 22 344 44 348 70" fill="none" stroke={WOOD} strokeWidth="5" strokeLinecap="round" />
        <path d="M306 66 C306 56 322 52 332 57 C342 51 360 56 358 66Z" />
        <path d="M322 50 C322 41 336 37 344 42 C354 37 366 42 364 50Z" />
        <path d="M300 84 C300 76 312 72 320 76 C330 72 340 78 338 84Z" />
      </g>

      {/* 岩風呂: 奥の岩 → 湯 → 手前の岩 */}
      <Rock x={120} y={112} w={34} h={18} c={STONE_DARK} />
      <Rock x={156} y={108} w={40} h={20} />
      <Rock x={198} y={108} w={36} h={16} c={STONE_DARK} />
      <Rock x={238} y={110} w={42} h={20} />
      <Rock x={280} y={114} w={30} h={15} c={STONE_DARK} />
      <ellipse cx="190" cy="134" rx="152" ry="30" fill={`url(#${u}water)`} stroke={INK} strokeWidth="1.6" />
      <g fill="none" stroke={WASHI} strokeLinecap="round" opacity="0.6">
        <path d="M96 126 q16 -5 32 0" strokeWidth="1.4" />
        <path d="M150 140 q20 -6 40 0" strokeWidth="1.4" />
        <path d="M232 150 q18 -5 36 0" strokeWidth="1.3" />
        <path d="M110 148 q12 -4 24 0" strokeWidth="1.2" />
      </g>
      <g fill="none" stroke={KIN_PALE} strokeLinecap="round" opacity="0.75">
        <path d="M270 122 h20" strokeWidth="2" />
        <path d="M264 128 h30" strokeWidth="2.2" />
        <path d="M272 134 h18" strokeWidth="2" />
        <path d="M268 140 h24" strokeWidth="1.8" />
      </g>
      {/* お盆に徳利とおちょこ */}
      <g transform="translate(200 132)" strokeLinejoin="round">
        <ellipse cx="0" cy="3" rx="20" ry="5.6" fill={WOOD} stroke={INK} strokeWidth="1.4" />
        <ellipse cx="0" cy="1.6" rx="17" ry="4.2" fill="#8a6338" />
        <path d="M-9 1 C-12 -3 -11 -8 -7.6 -10 V-15 h5.2 V-10 C1 -8 2 -3 -1 1Z" fill={WASHI} stroke={INK} strokeWidth="1.2" />
        <path d="M-10.4 -4 C-7 -2.6 -3 -2.6 0.4 -4" fill="none" stroke={AI} strokeWidth="1.6" />
        <path d="M5 -3 h8 l-1.6 4 h-4.8Z" fill={WASHI} stroke={INK} strokeWidth="1.1" />
      </g>
      <Rock x={46} y={156} w={62} h={26} />
      <Rock x={104} y={166} w={50} h={18} c={STONE_DARK} />
      <Rock x={250} y={170} w={56} h={16} c={STONE_DARK} />
      <Rock x={306} y={164} w={64} h={28} />
      <Rock x={352} y={172} w={40} h={20} c={STONE_DARK} />
      {/* 桶と手ぬぐい */}
      <g transform="translate(48 132)" strokeLinejoin="round">
        <path d="M-15 -17 H15 L12 0 H-12Z" fill={WOOD_PALE} stroke={INK} strokeWidth="1.5" />
        <ellipse cx="0" cy="-17" rx="15" ry="3.6" fill="#b89460" stroke={INK} strokeWidth="1.3" />
        <path d="M-14.2 -12 H14.2 M-12.8 -4.5 H12.8" stroke={KIN_DARK} strokeWidth="1.5" />
        <path d="M2 -19 C8 -23 16 -21 18 -16 L15 -6 C12 -9 9 -10 6 -9Z" fill={WASHI} stroke={INK} strokeWidth="1.2" />
        <path d="M9 -17.5 L12.5 -9 M12.5 -18 L15.5 -11" stroke={AI_LIGHT} strokeWidth="1.2" />
      </g>
      {/* 岩に立てかけた竿と笠 */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M338 148 L352 70" stroke={INK} strokeWidth="3.6" />
        <path d="M338 148 L352 70" stroke={KIN} strokeWidth="1.8" />
        <path d="M282 142 L304 126 L326 142 C312 147 296 147 282 142Z" fill={WASHI3} stroke={INK} strokeWidth="1.4" />
        <path d="M304 126 L298 144 M304 126 L311 144 M304 126 L290 143 M304 126 L319 143" stroke={KIN_DARK} strokeWidth="0.8" opacity="0.8" />
      </g>

      {/* 動かない薄い湯気（湯気の動きが止まっていても湯気が見える） */}
      {steam && (
        <g fill="none" stroke={WASHI2} strokeLinecap="round" opacity="0.26">
          <path d="M132 124 C122 112 142 104 132 92 C122 80 142 72 132 58" strokeWidth="6" />
          <path d="M188 120 C178 108 198 100 188 88 C178 76 198 68 188 52" strokeWidth="7" />
          <path d="M244 124 C234 112 254 104 244 92 C234 80 254 72 244 60" strokeWidth="6" />
        </g>
      )}
    </g>
  );
}

/** 動く湯気の置き場所（絵の幅・高さに対する割合） */
const WISPS: { left: number; top: number; w: number; d: number; t: number }[] = [
  { left: 27, top: 30, w: 6.2, d: 0, t: 9 },
  { left: 40, top: 22, w: 7, d: 2.6, t: 11 },
  { left: 52, top: 30, w: 6, d: 5.2, t: 10 },
  { left: 63, top: 24, w: 6.6, d: 1.4, t: 12 },
  { left: 74, top: 34, w: 5.6, d: 6.8, t: 9.5 },
];

interface OnsenSceneProps {
  className?: string;
}

/** 露天風呂の一枚絵（湯気がゆっくり立ちのぼる） */
export default function OnsenScene({ className = '' }: OnsenSceneProps) {
  const u = `on${useId().replace(/:/g, '')}`;
  return (
    <div className={`fd-onsen ${className}`} aria-hidden="true">
      <svg viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
        <OnsenShapes u={u} />
      </svg>
      {WISPS.map((w, i) => (
        <svg
          key={i}
          viewBox="0 0 24 72"
          className="fd-steam"
          style={{ left: `${w.left}%`, top: `${w.top}%`, width: `${w.w}%`, '--d': `${w.d}s`, '--t': `${w.t}s` } as CSSProperties}
        >
          <path d={WISP} fill="none" stroke={WASHI} strokeWidth="6" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}
