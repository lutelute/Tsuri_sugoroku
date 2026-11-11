// 札の絵係: 絵の部品（空・海・雲・小判・魚・船・家 など）。札の絵・祭りの絵で使い回す。
// どれも SVG の <g> を返すだけの小さな部品。色は artBase.ts。
import {
  INK, WASHI, WASHI2, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, SHU, SHU_LIGHT, AI, AI_MID, AI_LIGHT,
  LEAF, LEAF_LIGHT, LEAF_DARK, WOOD, ART_W, ART_H, wavePath, waveArea,
} from './artBase';
import type { FishTone } from './artBase';

/** 絵で使うぼかし（グラデーション）の定義。u は絵ごとに違う接頭辞 */
export function ArtDefs({ u }: { u: string }) {
  return (
    <defs>
      <linearGradient id={`${u}day`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b9d9ea" />
        <stop offset="0.72" stopColor="#f6efd9" />
      </linearGradient>
      <radialGradient id={`${u}gold`} cx="0.5" cy="0.7" r="0.75">
        <stop offset="0" stopColor="#fff9e2" />
        <stop offset="1" stopColor="#eed9a2" />
      </radialGradient>
      <linearGradient id={`${u}dusk`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a4a78" />
        <stop offset="0.45" stopColor="#ee8a52" />
        <stop offset="0.8" stopColor="#f8cf78" />
      </linearGradient>
      <linearGradient id={`${u}storm`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b4859" />
        <stop offset="1" stopColor="#7b8a99" />
      </linearGradient>
      <linearGradient id={`${u}night`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0c1f33" />
        <stop offset="1" stopColor="#2e5e8c" />
      </linearGradient>
      <linearGradient id={`${u}sea`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a86b8" />
        <stop offset="1" stopColor="#173a5c" />
      </linearGradient>
      <linearGradient id={`${u}deep`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4d97bd" />
        <stop offset="1" stopColor="#0c2a45" />
      </linearGradient>
      <linearGradient id={`${u}shoal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a6dfd8" />
        <stop offset="1" stopColor="#2e7fa8" />
      </linearGradient>
      <radialGradient id={`${u}glow`}>
        <stop offset="0" stopColor="#fff6cf" stopOpacity="0.95" />
        <stop offset="0.55" stopColor="#f7e7b8" stopOpacity="0.45" />
        <stop offset="1" stopColor="#f7e7b8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}ember`}>
        <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ef6a52" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** 絵の地（空の色） */
export function Bg({ u, tone }: { u: string; tone: 'day' | 'gold' | 'dusk' | 'storm' | 'night' | 'deep' | 'shoal' }) {
  return <rect x="0" y="0" width={ART_W} height={ART_H} fill={`url(#${u}${tone})`} />;
}

/** きらめき（四つ角の星） */
export function Sparkle({ x, y, s = 1, c = KIN_PALE }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" fill={c} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />;
}

/** 小判 */
export function Koban({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="11" ry="16" fill={KIN} stroke={INK} strokeWidth="1.6" />
      <ellipse cx="0" cy="0" rx="7.6" ry="12.4" fill="none" stroke={KIN_DARK} strokeWidth="1" />
      <path d="M-4.6 -6h9.2M-5.4 -2h10.8M-5.4 2h10.8M-4.6 6h9.2" stroke={KIN_DARK} strokeWidth="1" opacity="0.85" />
      <ellipse cx="-3.4" cy="-8" rx="2.6" ry="4.4" fill="#fff" opacity="0.4" />
    </g>
  );
}

/** 霞（和の雲。横に長い帯を重ねる） */
export function Kasumi({ x, y, s = 1, c = WASHI, o = 0.9 }: { x: number; y: number; s?: number; c?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c} opacity={o}>
      <rect x="-30" y="0" width="54" height="9" rx="4.5" />
      <rect x="-14" y="7" width="66" height="9" rx="4.5" />
      <rect x="-40" y="14" width="48" height="8" rx="4" />
    </g>
  );
}

/** もくもくした雲 */
export function Puff({ x, y, s = 1, c = WASHI, stroke = INK }: { x: number; y: number; s?: number; c?: string; stroke?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-34 10 C-44 10 -46 -4 -34 -6 C-34 -18 -16 -22 -10 -12 C-4 -24 18 -22 20 -8 C34 -10 40 6 28 10Z"
      fill={c}
      stroke={stroke}
      strokeWidth={1.6 / s}
      strokeLinejoin="round"
    />
  );
}

/** 海（波の線が3段） */
export function Sea({ u, y = 104, rough = false }: { u: string; y?: number; rough?: boolean }) {
  const amp = rough ? 10 : 5;
  return (
    <g>
      <path d={waveArea(y, amp, rough ? 30 : 26)} fill={`url(#${u}sea)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={wavePath(y + 4, amp * 0.8, rough ? 30 : 26)} fill="none" stroke={WASHI} strokeWidth="1.6" opacity="0.8" />
      <path d={wavePath(y + 17, 4, 34, -24)} fill="none" stroke={AI_LIGHT} strokeWidth="1.3" opacity="0.6" />
      <path d={wavePath(y + 30, 4, 40, -6)} fill="none" stroke={AI_LIGHT} strokeWidth="1.2" opacity="0.42" />
      <path d={wavePath(y + 42, 3, 46, -30)} fill="none" stroke={AI_LIGHT} strokeWidth="1.1" opacity="0.3" />
    </g>
  );
}

/** 丘（奥と手前の2枚） */
export function Hills({ y = 96, far = LEAF_LIGHT, near = LEAF }: { y?: number; far?: string; near?: string }) {
  return (
    <g>
      <path d={`M-10 ${ART_H} L-10 ${y + 8} C40 ${y - 18} 92 ${y - 12} 134 ${y + 6} C176 ${y - 16} 236 ${y - 22} 276 ${y} C296 ${y - 8} 312 ${y - 6} 330 ${y + 2} L330 ${ART_H}Z`} fill={far} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M-10 ${ART_H} L-10 ${y + 30} C50 ${y + 14} 110 ${y + 20} 170 ${y + 30} C230 ${y + 18} 290 ${y + 18} 330 ${y + 28} L330 ${ART_H}Z`} fill={near} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

/** 松 */
export function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-2 0 C-4 -16 4 -26 0 -44 C6 -30 8 -18 5 0Z" fill={WOOD} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <g fill={LEAF_DARK} stroke={INK} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M-26 -30 C-26 -40 -12 -44 -2 -40 C8 -46 24 -40 22 -30Z" />
        <path d="M-16 -44 C-16 -54 -4 -58 4 -54 C14 -58 22 -52 20 -44Z" />
        <path d="M-6 -22 C-6 -30 8 -34 16 -30 C26 -32 32 -26 30 -20Z" />
      </g>
    </g>
  );
}

/** 進む向きの山形（3つ並ぶ）。dir=1 で右向き */
export function Chevrons({ x, y, dir = 1, c = KIN, s = 1 }: { x: number; y: number; dir?: 1 | -1; c?: string; s?: number }) {
  const d = [0, 1, 2].map(i => `M${i * 15} -11 l11 11 -11 11`).join(' ');
  return (
    <g transform={`translate(${x} ${y}) scale(${dir * s} ${s})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth="8.4" />
      <path d={d} stroke={c} strokeWidth="5" />
    </g>
  );
}

/** 大きな魚（鯉のような形。頭が左）。中心が原点、長さ約130 */
export function BigFish({ x, y, rot = 0, s = 1, flip = false, tone }: { x: number; y: number; rot?: number; s?: number; flip?: boolean; tone: FishTone }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M50 -4 L74 -24 C70 -10 70 6 76 22 L50 6Z" fill={tone.fin} stroke={INK} strokeWidth="2" />
      <path d="M56 -4 L68 -14 M57 1 L70 1 M56 6 L69 14" stroke={INK} strokeWidth="0.9" opacity="0.5" />
      <path d="M-16 -22 C-6 -40 18 -38 28 -16Z" fill={tone.fin} stroke={INK} strokeWidth="2" />
      <path d="M-8 -26 L-2 -20 M2 -32 L6 -19 M12 -32 L14 -18 M21 -26 L21 -17" stroke={INK} strokeWidth="0.9" opacity="0.5" />
      <path d="M-54 2 C-46 -18 -12 -27 22 -17 C36 -13 46 -7 52 -3 C54 0 54 4 52 6 C40 15 20 23 -6 23 C-30 23 -48 15 -54 2Z" fill={tone.body} stroke={INK} strokeWidth="2.2" />
      <path d="M-50 8 C-34 21 12 23 50 6 C36 16 16 23 -6 23 C-28 23 -44 17 -50 8Z" fill={tone.belly ?? '#fff'} opacity="0.55" />
      {[[-12, -8], [0, -9], [12, -8], [24, -6], [-6, 0], [6, 0], [18, 1], [30, 1], [-12, 8], [0, 9], [12, 9], [24, 7]].map(([sx, sy], i) => (
        <path key={i} d={`M${sx} ${sy - 4} q5 4 0 8`} fill="none" stroke={INK} strokeWidth="1" opacity="0.38" />
      ))}
      <path d="M-26 -14 Q-19 2 -26 16" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.75" />
      <path d="M-22 6 C-18 20 -4 22 2 12Z" fill={tone.fin} stroke={INK} strokeWidth="1.6" />
      <circle cx="-39" cy="-3" r="4.6" fill="#fff" stroke={INK} strokeWidth="1.3" />
      <circle cx="-39.6" cy="-3" r="2.2" fill={INK} />
      <path d="M-54 3 q5 2.6 8 0" fill="none" stroke={INK} strokeWidth="1.4" />
      <path d="M-40 -14 C-28 -20 -8 -22 10 -19" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.5" />
    </g>
  );
}

/** 小さな魚（頭が左）。長さ約56 */
export function SmallFish({ x, y, rot = 0, s = 1, flip = false, c = AI_LIGHT }: { x: number; y: number; rot?: number; s?: number; flip?: boolean; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round">
      <path d="M-28 0 C-20 -12 6 -13 18 -3 L30 -11 L27 0 L30 11 L18 3 C6 13 -20 12 -28 0Z" fill={c} stroke={INK} strokeWidth="1.6" />
      <path d="M-24 3 C-12 11 6 10 18 3 C6 13 -20 12 -24 3Z" fill="#fff" opacity="0.6" />
      <path d="M-12 -8 q-3 8 0 16" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" />
      <circle cx="-19" cy="-2" r="2.6" fill="#fff" stroke={INK} strokeWidth="0.9" />
      <circle cx="-19.3" cy="-2" r="1.2" fill={INK} />
    </g>
  );
}

/** 水しぶき（魚が跳ねた所） */
export function Splash({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <ellipse cx="0" cy="6" rx="46" ry="7" fill="none" stroke={WASHI} strokeWidth="1.6" opacity="0.8" />
      <ellipse cx="0" cy="6" rx="28" ry="4" fill="none" stroke={WASHI} strokeWidth="1.4" opacity="0.9" />
      <g fill={WASHI} stroke={INK} strokeWidth="1.3">
        <path d="M-6 4 C-10 -14 -4 -26 0 -34 C4 -26 10 -14 6 4Z" />
        <path d="M-12 4 C-26 -6 -30 -18 -30 -26 C-22 -20 -14 -10 -6 4Z" />
        <path d="M12 4 C26 -6 30 -18 30 -26 C22 -20 14 -10 6 4Z" />
        <path d="M-18 6 C-36 2 -44 -6 -48 -12 C-38 -10 -26 -4 -14 4Z" />
        <path d="M18 6 C36 2 44 -6 48 -12 C38 -10 26 -4 14 4Z" />
      </g>
      <g fill={WASHI} stroke={INK} strokeWidth="1">
        <circle cx="-40" cy="-24" r="3" /><circle cx="42" cy="-22" r="3.4" /><circle cx="-16" cy="-38" r="2.4" /><circle cx="20" cy="-40" r="2.8" /><circle cx="54" cy="-4" r="2.2" /><circle cx="-56" cy="-2" r="2.4" />
      </g>
    </g>
  );
}

/** しずく */
export function Drop({ x, y, s = 1, c = AI_LIGHT, r = 0 }: { x: number; y: number; s?: number; c?: string; r?: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0 -8 C4 -2 6 2 6 5 A6 6 0 0 1 -6 5 C-6 2 -4 -2 0 -8Z" fill={c} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />;
}

/** 漁船（へさきが右）。原点は船べりの真ん中 */
export function Boat({ x, y, s = 1, flip = false, rot = 0, flag = true }: { x: number; y: number; s?: number; flip?: boolean; rot?: number; flag?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 2 V-48" stroke={INK} strokeWidth="5" />
      <path d="M8 2 V-48" stroke={WOOD} strokeWidth="2.6" />
      {flag && (
        <g>
          <path d="M10 -48 C22 -52 30 -42 44 -46 L44 -26 C30 -22 22 -32 10 -28Z" fill={WASHI} stroke={INK} strokeWidth="1.6" />
          <circle cx="27" cy="-37" r="6.4" fill={SHU} />
          <path d="M10 -31 C22 -35 30 -25 44 -29 L44 -26 C30 -22 22 -32 10 -28Z" fill={AI_MID} />
        </g>
      )}
      <rect x="-36" y="-26" width="34" height="28" rx="2" fill={WASHI2} stroke={INK} strokeWidth="1.8" />
      <rect x="-30" y="-20" width="11" height="10" rx="1" fill={AI_LIGHT} stroke={INK} strokeWidth="1.2" />
      <rect x="-15" y="-20" width="9" height="10" rx="1" fill={AI_LIGHT} stroke={INK} strokeWidth="1.2" />
      <rect x="-40" y="-31" width="42" height="6" rx="1.5" fill={AI} stroke={INK} strokeWidth="1.5" />
      <path d="M-60 2 L46 2 L68 -9 C64 12 52 24 34 24 L-40 24 C-52 24 -59 13 -60 2Z" fill={WASHI} stroke={INK} strokeWidth="2.2" />
      <path d="M-60 2 L46 2 L68 -9 C67 -3 65 3 62 8 L-58 8 C-59 6 -60 4 -60 2Z" fill={SHU} stroke={INK} strokeWidth="1.6" />
      <path d="M-50 15 H44" stroke={AI_MID} strokeWidth="2" opacity="0.7" />
      <circle cx="-22" cy="13" r="3.4" fill="none" stroke={INK} strokeWidth="1.3" />
    </g>
  );
}

/** 小さな家（瓦屋根）。原点は土台の真ん中 */
export function House({ x, y, s = 1, rot = 0, roof = AI, wall = WASHI, door = true }: { x: number; y: number; s?: number; rot?: number; roof?: string; wall?: string; door?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} strokeLinejoin="round">
      <rect x="-17" y="-20" width="34" height="20" fill={wall} stroke={INK} strokeWidth="1.6" />
      <path d="M-24 -19 L0 -38 L24 -19Z" fill={roof} stroke={INK} strokeWidth="1.6" />
      <path d="M-14 -24 L0 -35 L14 -24" fill="none" stroke={WASHI} strokeWidth="1" opacity="0.4" />
      {door && <rect x="-4.5" y="-12" width="9" height="12" fill={WOOD} stroke={INK} strokeWidth="1.2" />}
      <rect x="-13.5" y="-14" width="6.5" height="6.5" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
      <rect x="7" y="-14" width="6.5" height="6.5" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
    </g>
  );
}

/** 炎（朱の外炎と金の内炎） */
export function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <path d="M0 0 C-16 0 -20 -14 -12 -24 C-10 -16 -6 -16 -6 -22 C-6 -32 2 -38 2 -46 C10 -38 8 -30 12 -26 C14 -30 14 -34 12 -38 C22 -28 22 -10 14 -4 C10 0 6 0 0 0Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.6" />
      <path d="M1 -2 C-8 -2 -10 -10 -5 -16 C-4 -11 -1 -12 0 -18 C6 -12 5 -8 8 -8 C10 -4 6 -2 1 -2Z" fill={KIN_LIGHT} />
    </g>
  );
}

/** 岩場（下に並ぶ岩） */
export function Rocks({ y = 122 }: { y?: number }) {
  return (
    <g strokeLinejoin="round">
      <path d={`M-10 ${ART_H} L-10 ${y + 4} L24 ${y - 12} L60 ${y + 2} L92 ${y - 14} L138 ${y + 6} L186 ${y - 8} L226 ${y + 8} L268 ${y - 10} L330 ${y + 6} L330 ${ART_H}Z`} fill="#6a6258" stroke={INK} strokeWidth="1.8" />
      <path d={`M24 ${y - 12} L34 ${y + 6} L60 ${y + 2}Z M92 ${y - 14} L104 ${y + 4} L138 ${y + 6}Z M186 ${y - 8} L196 ${y + 8} L226 ${y + 8}Z M268 ${y - 10} L282 ${y + 6} L318 ${y + 5}Z`} fill="#8b8276" />
    </g>
  );
}

/** 絵の外枠まで届く、後光の束 */
export function Rays({ d, c = KIN, o = 0.28 }: { d: string; c?: string; o?: number }) {
  return <path d={d} fill={c} opacity={o} />;
}
