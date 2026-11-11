// 札の絵係: 県庁の祭りの飾り絵（見出しの後ろに出す、夜祭りの横長の一枚絵。360x130）と、
// 選択肢の札に添える小さな絵（宴・名物釣り・言い伝え・お金・もう一度）。
// どの絵柄を出すかは festivalArtPick.ts が決める。固有の企業名やキャラクターは描かない。
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { FestivalKind } from './festivalArtPick';
import type { CapitalChoiceEffect } from '../../game/types';
import {
  INK, WASHI, WASHI2, WASHI3, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, SHU, SHU_LIGHT, SHU_BRIGHT, SHU_DARK,
  AI, AI_DEEP, AI_MID, AI_LIGHT, LEAF, LEAF_LIGHT, LEAF_DARK, WOOD, WOOD_LIGHT, STONE, STONE_DARK, SKIN,
  wavePath, scatter,
} from '../event/artBase';
import { Boat, Koban, SmallFish, Sparkle, Puff, Flame } from '../event/artKit';

const W = 360;
const H = 130;
const DARKWOOD = '#2a2018';
const GLOWSKIN = '#ffe9c4';

const STARS = scatter(26, 3);
const SNOW = scatter(40, 17);

function Defs({ u }: { u: string }) {
  return (
    <defs>
      <linearGradient id={`${u}night`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#081626" />
        <stop offset="1" stopColor="#1f4468" />
      </linearGradient>
      <linearGradient id={`${u}dusk`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a2a5a" />
        <stop offset="0.5" stopColor="#b5536a" />
        <stop offset="0.85" stopColor="#f2a65e" />
      </linearGradient>
      <radialGradient id={`${u}lamp`}>
        <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}ember`}>
        <stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ef6a52" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Sky({ u, dusk = false, stars = true }: { u: string; dusk?: boolean; stars?: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${u}${dusk ? 'dusk' : 'night'})`} />
      {stars && STARS.map((p, i) => <circle key={i} cx={p.x * W} cy={p.y * 56 + 3} r={0.6 + p.k * 0.9} fill={WASHI} opacity={0.35 + p.k * 0.5} />)}
    </g>
  );
}

/** 明かりのにじみ */
function Lamp({ u, x, y, r, ember = false }: { u: string; x: number; y: number; r: number; ember?: boolean }) {
  return <circle cx={x} cy={y} r={r} fill={`url(#${u}${ember ? 'ember' : 'lamp'})`} />;
}

/** 提灯（原点は上の口） */
function Chochin({ x, y, s = 1, c = SHU_BRIGHT }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4.5" y="0" width="9" height="3" rx="1" fill={INK} />
      <ellipse cx="0" cy="12" rx="8" ry="9.6" fill={c} stroke={INK} strokeWidth="1.2" />
      <path d="M-7 8 H7 M-8 12 H8 M-7 16 H7" stroke={INK} strokeWidth="0.6" opacity="0.45" />
      <ellipse cx="-2.6" cy="9" rx="2.2" ry="4" fill="#fff" opacity="0.35" />
      <rect x="-4.5" y="21" width="9" height="3" rx="1" fill={INK} />
    </g>
  );
}

/** 祭りの人（はっぴ姿。原点は足もと） */
function Hito({ x, y, s = 1, coat = AI_MID, up = false, flip = false, band = WASHI, rot = 0 }: { x: number; y: number; s?: number; coat?: string; up?: boolean; flip?: boolean; band?: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-4 -14 L-6 0 M4 -14 L7 0" stroke={INK} strokeWidth="5" />
      <path d="M-4 -14 L-6 0 M4 -14 L7 0" stroke={WASHI} strokeWidth="2.6" />
      {up ? (
        <g>
          <path d="M-7 -28 L-13 -42 M7 -28 L13 -42" stroke={INK} strokeWidth="5.4" />
          <path d="M-7 -28 L-13 -42 M7 -28 L13 -42" stroke={coat} strokeWidth="3" />
          <circle cx="-13" cy="-43" r="2.4" fill={SKIN} stroke={INK} strokeWidth="0.9" /><circle cx="13" cy="-43" r="2.4" fill={SKIN} stroke={INK} strokeWidth="0.9" />
        </g>
      ) : (
        <g>
          <path d="M-7 -28 L-14 -18 M7 -28 L15 -34" stroke={INK} strokeWidth="5.4" />
          <path d="M-7 -28 L-14 -18 M7 -28 L15 -34" stroke={coat} strokeWidth="3" />
          <circle cx="15.6" cy="-35" r="2.4" fill={SKIN} stroke={INK} strokeWidth="0.9" />
        </g>
      )}
      <path d="M-8 -31 H8 L10 -12 H-10Z" fill={coat} stroke={INK} strokeWidth="1.5" />
      <path d="M-1 -31 L0 -12 M1 -31 L0 -12" stroke={WASHI} strokeWidth="1" opacity="0.8" />
      <path d="M-9.4 -19 H9.4" stroke={INK} strokeWidth="2.6" />
      <circle cx="0" cy="-37" r="6.2" fill={SKIN} stroke={INK} strokeWidth="1.4" />
      <path d="M-6 -39.4 H6" stroke={band} strokeWidth="2.4" />
      <path d="M-6 -40.6 C-4 -45 4 -45 6 -40.6" fill={INK} />
    </g>
  );
}

function Burst({ x, y, r, c, n = 16 }: { x: number; y: number; r: number; c: string; n?: number }) {
  const rays = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2);
  return (
    <g strokeLinecap="round">
      <circle cx={x} cy={y} r={r * 1.5} fill={c} opacity="0.1" />
      {rays.map((a, i) => (
        <g key={i}>
          <line x1={x + Math.cos(a) * r * 0.28} y1={y + Math.sin(a) * r * 0.28} x2={x + Math.cos(a) * r} y2={y + Math.sin(a) * r} stroke={c} strokeWidth="2" />
          <circle cx={x + Math.cos(a) * r * 1.16} cy={y + Math.sin(a) * r * 1.16} r="1.7" fill={c} />
          <circle cx={x + Math.cos(a + 0.2) * r * 0.62} cy={y + Math.sin(a + 0.2) * r * 0.62} r="1.1" fill="#fff" opacity="0.8" />
        </g>
      ))}
      <circle cx={x} cy={y} r="3" fill="#fff" />
    </g>
  );
}

function Water({ y = 100, c = AI_DEEP }: { y?: number; c?: string }) {
  return (
    <g>
      <path d={`${wavePath(y, 4, 30, -10, 370)} L370 ${H} L-10 ${H}Z`} fill={c} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={wavePath(y + 4, 3, 30, -10, 370)} fill="none" stroke={AI_LIGHT} strokeWidth="1.3" opacity="0.55" />
      <path d={wavePath(y + 15, 3, 38, -26, 370)} fill="none" stroke={AI_LIGHT} strokeWidth="1.1" opacity="0.35" />
      <path d={wavePath(y + 25, 3, 44, -6, 370)} fill="none" stroke={AI_LIGHT} strokeWidth="1" opacity="0.25" />
    </g>
  );
}

// ===== 絵柄 =====

function Snow({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={250} y={84} r={74} />
      <path d="M-10 130 V102 C60 94 120 100 180 96 C240 92 300 98 370 94 V130Z" fill="#edf4f8" stroke={INK} strokeWidth="1.5" />
      <path d="M0 116 C80 108 200 118 360 108" fill="none" stroke="#b9cfdd" strokeWidth="1.4" />
      {/* 雪の城 */}
      <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round" fill="#f7fafc">
        <path d="M200 98 V72 H216 V58 H232 V44 H264 V58 H280 V72 H296 V98Z" />
        <path d="M194 74 L206 66 H290 L302 74Z" fill="#cfe0ec" />
        <path d="M210 60 L222 52 H274 L286 60Z" fill="#cfe0ec" />
        <path d="M226 46 L248 28 L270 46Z" fill="#cfe0ec" />
        <path d="M240 98 V84 a8 8 0 0 1 16 0 V98Z" fill={KIN_LIGHT} />
        <rect x="222" y="62" width="7" height="7" fill={KIN_LIGHT} /><rect x="267" y="62" width="7" height="7" fill={KIN_LIGHT} /><rect x="244" y="50" width="8" height="6" fill={KIN_LIGHT} />
        <rect x="208" y="80" width="7" height="8" fill={AI_LIGHT} /><rect x="281" y="80" width="7" height="8" fill={AI_LIGHT} />
      </g>
      {/* 雪だるま */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M92 82 L70 66 M74 69 l-1 -8 M130 82 L152 64 M148 67 l8 -1" stroke={INK} strokeWidth="3.4" /><path d="M92 82 L70 66 M74 69 l-1 -8 M130 82 L152 64 M148 67 l8 -1" stroke={WOOD} strokeWidth="1.6" />
        <circle cx="111" cy="90" r="23" fill="#fff" stroke={INK} strokeWidth="1.8" />
        <circle cx="111" cy="57" r="16" fill="#fff" stroke={INK} strokeWidth="1.8" />
        <path d="M95 66 C104 72 118 72 127 66 L130 72 C124 78 118 78 116 78 L118 92 L108 90 L109 78 C102 78 96 74 93 71Z" fill={AI_MID} stroke={INK} strokeWidth="1.5" />
        <path d="M98 46 L102 28 H120 L124 46Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.6" />
        <path d="M94 46 H128" stroke={INK} strokeWidth="3.4" />
        <circle cx="105" cy="55" r="2.2" fill={INK} /><circle cx="117" cy="55" r="2.2" fill={INK} />
        <path d="M111 59 l13 3 -13 3Z" fill="#f0a04a" stroke={INK} strokeWidth="1.1" />
        <path d="M104 65 q7 5 14 0" fill="none" stroke={INK} strokeWidth="1.5" />
        <circle cx="111" cy="86" r="2.4" fill={INK} /><circle cx="111" cy="98" r="2.4" fill={INK} />
        <path d="M96 84 C98 76 104 72 110 71" fill="none" stroke="#cfe0ec" strokeWidth="2.4" />
      </g>
      {/* 雪あかり */}
      {[26, 58, 166, 322, 346].map(x => (
        <g key={x}>
          <Lamp u={u} x={x} y={108} r={17} />
          <path d={`M${x - 9} 114 a9 10 0 0 1 18 0Z`} fill="#fff" stroke={INK} strokeWidth="1.2" />
          <path d={`M${x - 4} 114 a4 5 0 0 1 8 0Z`} fill={KIN_LIGHT} />
        </g>
      ))}
      {SNOW.map((p, i) => <circle key={i} cx={p.x * W} cy={p.y * 96} r={0.9 + p.k * 1.3} fill="#fff" opacity={0.6 + p.k * 0.4} />)}
    </g>
  );
}

function Crane({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} dusk stars={false} />
      <circle cx="268" cy="86" r="36" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.6" />
      <circle cx="268" cy="86" r="29" fill="none" stroke={SHU_LIGHT} strokeWidth="2" opacity="0.7" />
      <path d="M-10 96 V80 C40 66 90 70 140 82 C190 72 250 76 370 84 V96Z" fill="#4a3358" />
      <path d="M-10 130 V94 H370 V130Z" fill="#4b5a3a" stroke={INK} strokeWidth="1.4" />
      <path d="M-10 108 C60 98 110 118 180 108 C230 100 270 116 370 104 V118 C280 128 220 112 170 120 C110 128 50 112 -10 122Z" fill="#8fb5cf" stroke={INK} strokeWidth="1.2" opacity="0.9" />
      {/* 葦 */}
      <g stroke={KIN_DARK} strokeWidth="1.6" strokeLinecap="round" fill="none">
        {[10, 22, 34, 46, 300, 314, 328, 342, 354].map((x, i) => <path key={x} d={`M${x} 130 q${i % 2 ? 4 : -4} -16 ${i % 2 ? -2 : 3} -${26 + (i % 3) * 5}`} />)}
        {[16, 40, 308, 336].map(x => <path key={`h${x}`} d={`M${x} 100 q2 -6 5 -8`} stroke={WASHI3} strokeWidth="3" />)}
      </g>
      {/* 舞う丹頂 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M108 94 L104 122 M122 94 L128 122" stroke={INK} strokeWidth="2.6" />
        <path d="M100 122 h8 M124 122 h8" stroke={INK} strokeWidth="2.2" />
        <path d="M96 80 C84 78 78 90 84 98 C94 96 100 92 104 86Z" fill={INK} />
        <path d="M110 76 C92 52 96 34 110 20 C112 40 120 56 128 70Z" fill={WASHI} stroke={INK} strokeWidth="1.7" />
        <path d="M110 20 C108 28 108 34 110 40 L102 32Z" fill={INK} />
        <ellipse cx="116" cy="82" rx="21" ry="12.4" fill={WASHI} stroke={INK} strokeWidth="1.8" transform="rotate(-10 116 82)" />
        <path d="M124 74 C134 50 152 40 168 38 C158 52 150 64 138 78Z" fill={WASHI} stroke={INK} strokeWidth="1.7" />
        <path d="M168 38 C162 42 158 46 154 52 L152 42Z" fill={INK} />
        <path d="M134 76 C148 68 148 52 142 42" fill="none" stroke={INK} strokeWidth="5.6" />
        <circle cx="141" cy="40" r="5.4" fill={WASHI} stroke={INK} strokeWidth="1.5" />
        <circle cx="140" cy="36.4" r="2.8" fill={SHU_BRIGHT} />
        <path d="M145.6 39 L160 42 L145.6 44Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.1" />
        <circle cx="143" cy="40" r="1" fill={INK} />
      </g>
      {/* 飛ぶ丹頂 */}
      <g transform="translate(206 36) scale(0.72)" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-30 6 L-54 12" stroke={INK} strokeWidth="2.4" />
        <path d="M-8 -2 C-18 -28 -6 -40 6 -46 C4 -30 10 -14 14 -4Z" fill={WASHI} stroke={INK} strokeWidth="1.8" />
        <ellipse cx="0" cy="2" rx="24" ry="9" fill={WASHI} stroke={INK} strokeWidth="1.8" />
        <path d="M-24 2 C-34 0 -40 6 -36 12 C-30 10 -26 8 -22 6Z" fill={INK} />
        <path d="M-4 4 C-10 24 4 38 18 42 C14 28 16 14 14 6Z" fill={WASHI} stroke={INK} strokeWidth="1.8" />
        <path d="M18 42 C16 36 15 32 15 26 L22 34Z" fill={INK} />
        <path d="M20 0 C34 -6 44 -6 52 -4" fill="none" stroke={INK} strokeWidth="5" />
        <circle cx="54" cy="-4" r="4.6" fill={WASHI} stroke={INK} strokeWidth="1.4" /><circle cx="54" cy="-7" r="2.2" fill={SHU_BRIGHT} />
        <path d="M58 -5 L70 -3 L58 -1Z" fill={KIN_DARK} stroke={INK} strokeWidth="1" />
      </g>
    </g>
  );
}

function Nebuta({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={62} r={128} />
      <rect x="0" y="118" width={W} height="12" fill="#12283f" />
      {/* 台車 */}
      <circle cx="104" cy="118" r="9" fill={DARKWOOD} stroke={INK} strokeWidth="1.6" /><circle cx="256" cy="118" r="9" fill={DARKWOOD} stroke={INK} strokeWidth="1.6" />
      <rect x="66" y="98" width="228" height="16" fill={WOOD} stroke={INK} strokeWidth="1.8" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={70 + i * 15.7} y="101" width="15.7" height="10" fill={i % 2 ? WASHI : SHU_BRIGHT} stroke={INK} strokeWidth="0.8" />)}
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 衣 */}
        <path d="M84 98 C90 72 126 60 180 60 C234 60 270 72 276 98Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="2" />
        <path d="M96 98 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 M204 98 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0" fill="none" stroke={AI_MID} strokeWidth="3" />
        <path d="M150 62 L180 98 L210 62" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.6" />
        <path d="M166 70 L180 88 L194 70" fill="none" stroke={SHU_DARK} strokeWidth="2" />
        {/* 刀を振り上げた腕 */}
        <path d="M252 20 L332 0" stroke={INK} strokeWidth="7.4" /><path d="M252 20 L332 0" stroke="#eef3f6" strokeWidth="4" />
        <path d="M224 72 C246 60 262 44 258 26 L240 24 C240 40 228 52 212 58Z" fill={AI_MID} stroke={INK} strokeWidth="2" />
        <path d="M226 58 C238 52 246 42 246 30" fill="none" stroke={KIN_LIGHT} strokeWidth="2" />
        <circle cx="250" cy="22" r="10" fill={GLOWSKIN} stroke={INK} strokeWidth="1.8" />
        <path d="M258 12 l8 14" stroke={INK} strokeWidth="5" /><path d="M258 12 l8 14" stroke={KIN} strokeWidth="2.4" />
        {/* 突き出した腕 */}
        <path d="M138 70 C118 64 102 62 92 66 L88 50 C104 44 126 48 146 56Z" fill={AI_MID} stroke={INK} strokeWidth="2" />
        <circle cx="86" cy="58" r="10.4" fill={GLOWSKIN} stroke={INK} strokeWidth="1.8" />
        <path d="M80 54 h10 M80 59 h10" stroke={INK} strokeWidth="1.2" opacity="0.6" />
        {/* 髪と顔 */}
        <path d="M142 40 C138 8 164 -4 182 -4 C204 -4 226 10 220 40 C222 54 214 64 206 66 L156 66 C148 62 142 52 142 40Z" fill={INK} />
        <path d="M150 38 C150 18 164 10 182 10 C200 10 214 18 214 38 C214 58 200 70 182 70 C164 70 150 58 150 38Z" fill={GLOWSKIN} stroke={INK} strokeWidth="2" />
        <path d="M156 30 L176 37 M208 30 L188 37" stroke={INK} strokeWidth="4.6" />
        <ellipse cx="167" cy="42" rx="6.4" ry="4.6" fill="#fff" stroke={INK} strokeWidth="1.4" /><circle cx="169.4" cy="42.6" r="2.6" fill={INK} />
        <ellipse cx="197" cy="42" rx="6.4" ry="4.6" fill="#fff" stroke={INK} strokeWidth="1.4" /><circle cx="194.6" cy="42.6" r="2.6" fill={INK} />
        <path d="M155 48 C158 58 168 60 172 53 M209 48 C206 58 196 60 192 53 M176 20 C180 26 184 26 188 20" fill="none" stroke={SHU_BRIGHT} strokeWidth="2.8" />
        <path d="M182 40 v9 q-3 3 -6 1" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M168 62 Q182 54 196 62" fill="none" stroke={INK} strokeWidth="3" />
        <path d="M172 63 Q182 58 192 63" fill="none" stroke={SHU_DARK} strokeWidth="1.6" />
      </g>
      <Hito x={30} y={124} s={0.9} coat={WASHI} up band={SHU_BRIGHT} />
      <Hito x={332} y={124} s={0.9} coat={WASHI} up flip band={SHU_BRIGHT} />
      <circle cx="30" cy="84" r="5" fill={SHU_LIGHT} stroke={INK} strokeWidth="1" /><circle cx="332" cy="84" r="5" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
    </g>
  );
}

function Pennants({ from, to, n }: { from: [number, number]; to: [number, number]; n: number }) {
  const colors = [SHU_BRIGHT, KIN_LIGHT, WASHI, AI_LIGHT, LEAF_LIGHT];
  const [x1, y1] = from;
  const [x2, y2] = to;
  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={INK} strokeWidth="1.2" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        return <path key={i} d={`M${x - 5} ${y - 1} h10 l-5 12Z`} fill={colors[i % colors.length]} stroke={INK} strokeWidth="1" strokeLinejoin="round" />;
      })}
    </g>
  );
}

function Tairyobune({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} dusk stars={false} />
      <Lamp u={u} x={300} y={46} r={60} />
      <circle cx="300" cy="46" r="17" fill={KIN_PALE} stroke={INK} strokeWidth="1.3" />
      <g fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 30 q7 -8 12 0 q5 -8 12 0" /><path d="M84 52 q5 -6 9 0 q4 -6 9 0" /><path d="M252 22 q5 -6 9 0 q4 -6 9 0" />
      </g>
      <Water y={96} c={AI} />
      {/* 船と、帆柱から張った旗 */}
      <Boat x={196} y={96} s={0.92} flag={false} />
      <Pennants from={[203.4, 52]} to={[260, 86]} n={5} />
      <circle cx="203.4" cy="50" r="3.4" fill={KIN} stroke={INK} strokeWidth="1.2" />
      {/* ともに立てた大漁旗 */}
      <path d="M96 100 V18 M134 100 V30" stroke={INK} strokeWidth="3.6" />
      <path d="M96 100 V18 M134 100 V30" stroke={WOOD_LIGHT} strokeWidth="1.7" />
      <g strokeLinejoin="round" stroke={INK} strokeWidth="1.5">
        <path d="M44 20 C62 13 76 27 96 20 V58 C76 65 62 51 44 58Z" fill={WASHI} />
        <path d="M44 46 C62 39 76 53 96 46 V58 C76 65 62 51 44 58Z" fill={AI_MID} />
        <circle cx="70" cy="36" r="10" fill={SHU_BRIGHT} />
        <path d="M134 32 C148 26 158 38 172 32 V60 C158 66 148 54 134 60Z" fill={SHU_BRIGHT} />
        <circle cx="153" cy="46" r="8" fill={KIN_LIGHT} />
        <path d="M134 52 C148 46 158 58 172 52 V60 C158 66 148 54 134 60Z" fill={AI} />
      </g>
      <path d={`${wavePath(112, 5, 34, -24, 370)} L370 130 L-10 130Z`} fill={AI_DEEP} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={wavePath(116, 4, 34, -24, 370)} fill="none" stroke={WASHI} strokeWidth="1.4" opacity="0.6" />
      <SmallFish x={44} y={104} rot={-36} s={0.5} c="#e86a52" />
      <SmallFish x={318} y={104} rot={-140} s={0.46} c="#9fb9cc" />
    </g>
  );
}

const TANZAKU = [SHU_LIGHT, KIN_LIGHT, AI_LIGHT, LEAF_LIGHT, '#c9a8e0', WASHI];

function Fukinagashi({ x, c, len = 62 }: { x: number; c: string; len?: number }) {
  const strips = [SHU_LIGHT, WASHI, KIN_LIGHT, c, WASHI, LEAF_LIGHT, SHU_LIGHT];
  return (
    <g strokeLinejoin="round">
      <path d={`M${x} 0 V16`} stroke={INK} strokeWidth="1.2" />
      {strips.map((sc, i) => {
        const sx = x - 15 + i * 5;
        return <path key={i} d={`M${sx} 40 q${i % 2 ? 3 : -3} ${len / 2} 0 ${len} h4.4 q${i % 2 ? 3 : -3} -${len / 2} 0 -${len}Z`} fill={sc} stroke={INK} strokeWidth="0.8" />;
      })}
      <path d={`M${x - 17} 38 h34 v5 h-34Z`} fill={KIN} stroke={INK} strokeWidth="1.1" />
      <circle cx={x} cy="27" r="13" fill={c} stroke={INK} strokeWidth="1.6" />
      {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 7} cy={27 + Math.sin((a * Math.PI) / 180) * 7} r="3.4" fill={WASHI} opacity="0.75" />)}
      <circle cx={x} cy="27" r="3.4" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.8" />
    </g>
  );
}

function Tanabata({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <path d="M-10 70 C80 10 200 60 370 -6 V24 C210 86 90 44 -10 104Z" fill={WASHI} opacity="0.1" />
      {STARS.map((p, i) => <circle key={i} cx={p.x * W} cy={84 - p.x * 70 + p.y * 30} r={0.7 + p.k} fill="#fff" opacity={0.5 + p.k * 0.4} />)}
      {/* 笹竹 */}
      <g fill="none" strokeLinecap="round">
        <path d="M-6 130 C20 80 50 30 110 -6" stroke={INK} strokeWidth="6" /><path d="M-6 130 C20 80 50 30 110 -6" stroke={LEAF_DARK} strokeWidth="3.4" />
        <path d="M366 130 C344 84 316 36 262 -6" stroke={INK} strokeWidth="6" /><path d="M366 130 C344 84 316 36 262 -6" stroke={LEAF_DARK} strokeWidth="3.4" />
        <path d="M22 80 C40 76 56 78 70 86 M52 36 C66 38 78 46 86 58 M338 80 C322 74 306 76 292 86 M312 36 C298 38 288 46 280 56" stroke={LEAF_DARK} strokeWidth="1.6" />
      </g>
      <g fill={LEAF} stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
        {[[70, 86, 30], [56, 78, -10], [86, 58, 50], [74, 44, 10], [40, 60, -40], [96, 12, 20], [292, 86, 150], [306, 78, 190], [280, 56, 130], [290, 44, 170], [322, 60, 220], [268, 12, 160], [14, 104, -30], [348, 106, 210]].map(([x, y, r], i) => (
          <path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 0 C6 -5 16 -5 24 0 C16 4 6 4 0 0Z" />
        ))}
      </g>
      {/* 短冊 */}
      {[[36, 66], [64, 90], [84, 60], [300, 90], [324, 64], [278, 58], [20, 108], [344, 110]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y - 8} V${y}`} stroke={INK} strokeWidth="0.8" />
          <rect x={x - 4} y={y} width="8" height="22" fill={TANZAKU[i % TANZAKU.length]} stroke={INK} strokeWidth="0.9" transform={`rotate(${i % 2 ? 6 : -6} ${x} ${y})`} />
        </g>
      ))}
      <Fukinagashi x={132} c={SHU_BRIGHT} />
      <Fukinagashi x={180} c={AI_LIGHT} len={70} />
      <Fukinagashi x={228} c={KIN} />
      <Sparkle x={150} y={10} s={0.7} c="#fff" />
      <Sparkle x={250} y={14} s={0.6} c={KIN_PALE} />
    </g>
  );
}

function Mikoshi({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={56} r={120} />
      <rect x="0" y="120" width={W} height="10" fill="#12283f" />
      <path d="M0 10 Q90 26 180 10 Q270 26 360 10" fill="none" stroke={INK} strokeWidth="1.2" />
      {[30, 76, 122, 238, 284, 330].map((x, i) => <Chochin key={x} x={x} y={i < 3 ? 13 + (i === 1 ? 5 : 2) : 13 + (i === 4 ? 5 : 2)} s={0.82} />)}
      {/* 奥のかつぎ手 */}
      {[92, 128, 232, 268].map((x, i) => <Hito key={x} x={x} y={122} s={0.92} coat={i % 2 ? AI : AI_MID} up flip={i > 1} />)}
      {/* かつぎ棒 */}
      <rect x="52" y="80" width="256" height="7" rx="2" fill={WOOD_LIGHT} stroke={INK} strokeWidth="1.6" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 台と胴 */}
        <rect x="136" y="66" width="88" height="16" fill={DARKWOOD} stroke={INK} strokeWidth="1.8" />
        {[146, 160, 174, 186, 200, 214].map(x => <circle key={x} cx={x} cy="74" r="2.2" fill={KIN} />)}
        <rect x="148" y="38" width="64" height="28" fill={KIN} stroke={INK} strokeWidth="1.8" />
        <rect x="168" y="42" width="24" height="24" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.4" />
        <path d="M180 42 V66" stroke={INK} strokeWidth="1.2" />
        <circle cx="176" cy="55" r="1.6" fill={KIN_LIGHT} /><circle cx="184" cy="55" r="1.6" fill={KIN_LIGHT} />
        <path d="M152 44 v18 M158 44 v18 M202 44 v18 M208 44 v18" stroke={KIN_DARK} strokeWidth="1.4" />
        {/* 屋根 */}
        <path d="M120 42 C146 38 164 24 180 8 C196 24 214 38 240 42 L234 48 H126Z" fill={DARKWOOD} stroke={INK} strokeWidth="2" />
        <path d="M126 44 C150 40 166 28 180 14 C194 28 210 40 234 44" fill="none" stroke={KIN} strokeWidth="2" />
        <path d="M120 42 C112 40 110 32 116 30 M240 42 C248 40 250 32 244 30" fill="none" stroke={KIN} strokeWidth="3" />
        {/* 鳳凰 */}
        <path d="M170 8 C174 -2 186 -2 190 6 L202 0 L194 10 C190 14 174 14 170 8Z" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.4" />
        <path d="M170 8 L160 4 M190 4 C196 -6 204 -8 210 -6" fill="none" stroke={KIN_LIGHT} strokeWidth="2.2" />
        {/* 紫の綱と房 */}
        <path d="M124 46 C130 58 134 62 138 66 M236 46 C230 58 226 62 222 66" fill="none" stroke="#8a5fb0" strokeWidth="3" />
        <path d="M120 46 v12 M240 46 v12" stroke={SHU_BRIGHT} strokeWidth="4" />
        <circle cx="120" cy="45" r="3" fill={KIN} stroke={INK} strokeWidth="1" /><circle cx="240" cy="45" r="3" fill={KIN} stroke={INK} strokeWidth="1" />
      </g>
      {/* 手前のかつぎ手 */}
      {[64, 108, 252, 296].map((x, i) => <Hito key={x} x={x} y={128} s={1.02} coat={i % 2 ? SHU : AI_MID} up flip={i > 1} band={i % 2 ? WASHI : KIN_LIGHT} />)}
    </g>
  );
}

function Hanabi({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Burst x={92} y={42} r={32} c={KIN_LIGHT} n={18} />
      <Burst x={198} y={30} r={24} c={SHU_LIGHT} n={14} />
      <Burst x={288} y={48} r={30} c="#9fe0d0" n={16} />
      <Burst x={148} y={68} r={13} c="#c9a8e0" n={10} />
      <path d="M240 96 C244 80 240 70 244 60" fill="none" stroke={KIN_PALE} strokeWidth="1.4" strokeDasharray="1 5" strokeLinecap="round" />
      {/* 対岸の町並み */}
      <path d="M-10 98 V88 H20 V82 H48 V90 H80 V84 H104 V78 H126 V88 H160 V84 H196 V90 H230 V80 H258 V88 H292 V82 H320 V90 H370 V98Z" fill="#0a1a2c" />
      {[[26, 86], [36, 86], [88, 88], [110, 82], [118, 86], [170, 88], [236, 84], [246, 88], [300, 86], [308, 86]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill={KIN_LIGHT} />)}
      <Water y={98} />
      <g opacity="0.6" strokeLinecap="round" strokeWidth="2">
        <path d="M80 106 h24 M74 113 h36 M84 120 h18 M78 126 h28" stroke={KIN_LIGHT} />
        <path d="M278 106 h20 M270 113 h34 M280 120 h16 M274 126 h26" stroke="#9fe0d0" />
        <path d="M20 108 h16 M14 116 h26 M326 110 h18 M320 118 h28" stroke={SHU_LIGHT} />
      </g>
      {/* 屋形船 */}
      <g strokeLinejoin="round">
        <Lamp u={u} x={180} y={104} r={46} />
        <path d="M112 110 H250 L262 104 C258 118 248 122 236 122 H130 C120 122 114 116 112 110Z" fill={WOOD} stroke={INK} strokeWidth="1.8" />
        <rect x="134" y="94" width="96" height="16" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.4" />
        <path d="M150 94 V110 M166 94 V110 M182 94 V110 M198 94 V110 M214 94 V110" stroke={INK} strokeWidth="1" />
        <path d="M126 96 L138 86 H226 L238 96Z" fill={DARKWOOD} stroke={INK} strokeWidth="1.6" />
        {[142, 162, 182, 202, 222].map(x => <circle key={x} cx={x} cy="99" r="3.2" fill={SHU_BRIGHT} stroke={INK} strokeWidth="0.9" />)}
      </g>
    </g>
  );
}

function Cormorant({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="0" cy="4" rx="14" ry="3" fill="none" stroke={AI_LIGHT} strokeWidth="1" opacity="0.7" />
      <path d="M-10 2 C-8 -6 4 -8 10 -2 L12 2Z" fill="#1c1c24" stroke={INK} strokeWidth="1.2" />
      <path d="M8 -2 C12 -10 10 -16 14 -20" fill="none" stroke="#1c1c24" strokeWidth="4.4" />
      <circle cx="14.6" cy="-21" r="3.4" fill="#1c1c24" />
      <path d="M17 -22 L25 -20 L17 -19Z" fill={KIN} stroke={INK} strokeWidth="0.8" />
      <circle cx="15.4" cy="-21.6" r="0.9" fill={WASHI} />
    </g>
  );
}

function Ukai({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <circle cx="50" cy="26" r="13" fill={KIN_PALE} stroke={INK} strokeWidth="1.2" />
      <path d="M-10 92 V64 C30 40 76 34 112 52 C150 38 200 50 240 66 C290 58 330 66 370 74 V92Z" fill="#0f2740" />
      <g strokeLinejoin="round" stroke={INK} strokeWidth="1.1">
        <rect x="94" y="30" width="20" height="14" fill={WASHI2} /><path d="M88 32 L104 20 L120 32Z" fill={DARKWOOD} /><path d="M90 44 h28 l4 8 h-36Z" fill={STONE_DARK} />
      </g>
      <Water y={88} />
      <Lamp u={u} x={292} y={56} r={70} ember />
      {/* 舟 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M46 92 C100 104 214 104 290 86 L284 98 C214 114 104 114 54 104Z" fill={WOOD} stroke={INK} strokeWidth="1.8" />
        <path d="M58 99 C106 108 212 108 280 94" fill="none" stroke={WOOD_LIGHT} strokeWidth="1.6" />
        {/* かがり火 */}
        <path d="M262 92 L296 60" stroke={INK} strokeWidth="4" /><path d="M262 92 L296 60" stroke={STONE} strokeWidth="1.8" />
        <path d="M286 62 H306 L302 74 H290Z" fill={INK} />
        <Flame x={296} y={64} s={0.8} />
        {/* 鵜匠 */}
        <path d="M214 96 L210 78 H230 L234 96Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.5" />
        <path d="M214 80 v14 M219 80 v15 M224 80 v15 M229 80 v14" stroke={INK} strokeWidth="0.8" opacity="0.6" />
        <path d="M212 62 H228 L230 80 H210Z" fill={AI} stroke={INK} strokeWidth="1.5" />
        <circle cx="220" cy="55" r="6.4" fill={SKIN} stroke={INK} strokeWidth="1.3" />
        <path d="M213 53 C214 44 226 44 227 53Z" fill={INK} />
        <path d="M226 66 L246 74" stroke={INK} strokeWidth="5" /><path d="M226 66 L246 74" stroke={AI} strokeWidth="2.6" />
        <circle cx="247" cy="74.6" r="2.6" fill={SKIN} stroke={INK} strokeWidth="0.9" />
        {/* ともの船頭 */}
        <path d="M80 100 L84 78 H98 L100 100Z" fill={AI_MID} stroke={INK} strokeWidth="1.4" />
        <circle cx="91" cy="71" r="5.6" fill={SKIN} stroke={INK} strokeWidth="1.2" />
        <path d="M82 68 L91 60 L100 68Z" fill={WASHI3} stroke={INK} strokeWidth="1.1" />
        <path d="M100 84 L64 122" stroke={INK} strokeWidth="3" /><path d="M100 84 L64 122" stroke={WOOD_LIGHT} strokeWidth="1.3" />
      </g>
      <path d="M247 75 L314 100 M247 75 L336 112 M247 75 L290 116" stroke={WASHI} strokeWidth="0.9" opacity="0.8" />
      <Cormorant x={308} y={104} />
      <Cormorant x={336} y={116} flip />
      <Cormorant x={282} y={120} />
      {[[306, 40], [316, 30], [284, 34], [324, 46], [298, 22]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill={KIN_LIGHT} />)}
    </g>
  );
}

function Tourou({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={240} y={60} r={56} />
      <path d="M-10 130 V96 C60 90 120 98 180 92 C250 86 300 96 370 90 V130Z" fill="#edf4f8" stroke={INK} strokeWidth="1.5" />
      <ellipse cx="206" cy="114" rx="96" ry="14" fill={AI_MID} stroke={INK} strokeWidth="1.5" />
      <path d="M150 112 q14 -4 28 0 M214 118 q16 -4 32 0 M180 108 q10 -3 20 0" fill="none" stroke={WASHI} strokeWidth="1.2" opacity="0.6" />
      <path d="M226 106 h26 M222 112 h34 M230 118 h20" stroke={KIN_PALE} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      {/* 太鼓橋 */}
      <path d="M118 98 Q160 70 202 98" fill="none" stroke={INK} strokeWidth="7" /><path d="M118 98 Q160 70 202 98" fill="none" stroke={STONE} strokeWidth="4" />
      {/* 雪吊りの松 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M70 98 C66 80 74 66 70 44" fill="none" stroke={INK} strokeWidth="7" /><path d="M70 98 C66 80 74 66 70 44" fill="none" stroke={WOOD} strokeWidth="4" />
        <g fill={LEAF_DARK} stroke={INK} strokeWidth="1.3">
          <path d="M30 78 C30 66 48 62 60 67 C74 60 100 66 98 78Z" /><path d="M42 58 C42 48 58 44 68 49 C80 44 96 50 94 58Z" /><path d="M52 40 C52 32 64 28 72 33 C80 29 90 34 88 40Z" />
        </g>
        <g fill="#fff" stroke={INK} strokeWidth="0.9">
          <path d="M34 72 C38 66 48 63 60 67 C72 61 92 64 96 72 C84 68 74 70 62 72 C52 70 42 70 34 72Z" /><path d="M45 53 C50 48 58 45 68 49 C78 45 90 48 92 54 C82 51 74 52 68 54 C60 52 52 52 45 53Z" /><path d="M55 36 C58 32 64 29 72 33 C78 30 86 32 87 37 C80 35 76 36 72 37 C66 35 60 35 55 36Z" />
        </g>
        <path d="M70 100 V2" stroke={INK} strokeWidth="3.4" /><path d="M70 100 V2" stroke={WOOD_LIGHT} strokeWidth="1.6" />
        {[14, 28, 42, 56, 84, 98, 112, 126].map(x => <path key={x} d={`M70 4 L${x} 96`} stroke={KIN_PALE} strokeWidth="0.9" opacity="0.85" />)}
        <path d="M66 6 h8 l-2 6 h-4Z" fill={KIN_DARK} stroke={INK} strokeWidth="0.9" />
      </g>
      {/* 二本足の灯籠 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M226 112 L234 74 M254 98 L246 74" stroke={INK} strokeWidth="7" /><path d="M226 112 L234 74 M254 98 L246 74" stroke={STONE} strokeWidth="4" />
        <rect x="246" y="96" width="18" height="8" rx="2" fill={STONE_DARK} stroke={INK} strokeWidth="1.3" />
        <rect x="228" y="58" width="24" height="16" rx="2" fill={STONE} stroke={INK} strokeWidth="1.5" />
        <rect x="234" y="61" width="12" height="10" fill={KIN_LIGHT} stroke={INK} strokeWidth="1" />
        <path d="M218 58 L240 40 L262 58Z" fill={STONE_DARK} stroke={INK} strokeWidth="1.5" />
        <path d="M222 55 L240 41 L258 55 C246 50 234 50 222 55Z" fill="#fff" stroke={INK} strokeWidth="0.9" />
        <circle cx="240" cy="37" r="3.4" fill={STONE_DARK} stroke={INK} strokeWidth="1.2" />
      </g>
      {SNOW.map((p, i) => <circle key={i} cx={p.x * W} cy={p.y * 92} r={0.9 + p.k * 1.2} fill="#fff" opacity={0.55 + p.k * 0.4} />)}
    </g>
  );
}

function Yagura({ u }: { u: string }) {
  const lines: [number, number][] = [[-6, 44], [-6, 92], [366, 44], [366, 92]];
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={54} r={130} />
      <rect x="0" y="120" width={W} height="10" fill="#12283f" />
      {lines.map(([x, y], li) => (
        <g key={li}>
          <path d={`M180 18 L${x} ${y}`} stroke={INK} strokeWidth="1.1" />
          {[0.3, 0.46, 0.62, 0.78, 0.94].map((t, i) => <Chochin key={i} x={180 + (x - 180) * t} y={18 + (y - 18) * t} s={0.7} c={(i + li) % 2 ? SHU_BRIGHT : KIN_LIGHT} />)}
        </g>
      ))}
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* やぐら */}
        <path d="M144 122 L152 70 M216 122 L208 70 M162 122 L166 70 M198 122 L194 70" stroke={INK} strokeWidth="5.4" />
        <path d="M144 122 L152 70 M216 122 L208 70 M162 122 L166 70 M198 122 L194 70" stroke={WOOD} strokeWidth="3" />
        <path d="M148 100 H212 M146 112 L214 92 M214 112 L146 92" stroke={WOOD} strokeWidth="2" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={146 + i * 8.5} y="66" width="8.5" height="16" fill={i % 2 ? WASHI : SHU_BRIGHT} stroke={INK} strokeWidth="0.8" />)}
        <rect x="138" y="60" width="84" height="7" rx="1.5" fill={WOOD_LIGHT} stroke={INK} strokeWidth="1.6" />
        <path d="M146 60 V26 M214 60 V26" stroke={INK} strokeWidth="4" /><path d="M146 60 V26 M214 60 V26" stroke={WOOD} strokeWidth="2" />
        <path d="M134 28 L180 6 L226 28 L220 32 H140Z" fill={SHU_DARK} stroke={INK} strokeWidth="1.8" />
        <path d="M140 29 L180 10 L220 29" fill="none" stroke={KIN} strokeWidth="1.8" />
        {/* 太鼓とばち */}
        <path d="M164 38 C172 34 188 34 196 38 V56 C188 60 172 60 164 56Z" fill="#8a2a1c" stroke={INK} strokeWidth="1.8" />
        <ellipse cx="164" cy="47" rx="4.6" ry="9.4" fill={WASHI} stroke={INK} strokeWidth="1.5" />
        <ellipse cx="196" cy="47" rx="4.6" ry="9.4" fill={WASHI2} stroke={INK} strokeWidth="1.5" />
        {[170, 176, 182, 188].map(x => <circle key={x} cx={x} cy="37.6" r="1.1" fill={KIN} />)}
        <path d="M150 34 L162 44 M152 52 L161 49" stroke={INK} strokeWidth="3.4" /><path d="M150 34 L162 44 M152 52 L161 49" stroke={WOOD_LIGHT} strokeWidth="1.5" />
        <path d="M144 40 q-5 4 -3 10 M206 36 q6 5 4 12" fill="none" stroke={KIN_PALE} strokeWidth="1.6" />
      </g>
      {/* 踊る人 */}
      <Hito x={40} y={126} coat={WASHI} band={SHU_BRIGHT} />
      <Hito x={78} y={124} s={0.92} coat="#f0a8b0" up />
      <Hito x={116} y={126} coat={AI_LIGHT} />
      <Hito x={246} y={126} coat={KIN_LIGHT} flip />
      <Hito x={284} y={124} s={0.92} coat={WASHI} up flip band={SHU_BRIGHT} />
      <Hito x={322} y={126} coat="#f0a8b0" flip />
    </g>
  );
}

function Komagata({ u, x }: { u: string; x: number }) {
  return (
    <g>
      <Lamp u={u} x={x} y={62} r={54} />
      <path d={`M${x} 14 V104`} stroke={INK} strokeWidth="3" /><path d={`M${x} 14 V104`} stroke={WOOD} strokeWidth="1.4" />
      {[0, 1, 2, 3].map(r => Array.from({ length: r + 1 }, (_, i) => {
        const cx = x + (i - r / 2) * 15;
        const cy = 30 + r * 19;
        return (
          <g key={`${r}-${i}`}>
            <ellipse cx={cx} cy={cy} rx="6.4" ry="8.4" fill={GLOWSKIN} stroke={INK} strokeWidth="1.1" />
            <path d={`M${cx - 3} ${cy - 3} h6 M${cx - 3.6} ${cy + 1} h7.2`} stroke={SHU_BRIGHT} strokeWidth="1.6" />
            <path d={`M${cx - 3} ${cy - 8.4} h6 M${cx - 3} ${cy + 8.4} h6`} stroke={INK} strokeWidth="1.6" />
          </g>
        );
      }))}
    </g>
  );
}

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={WOOD} stroke={INK} strokeWidth="2" />
      <circle cx={x} cy={y} r={r - 4} fill="none" stroke={DARKWOOD} strokeWidth="1.4" />
      {[0, 45, 90, 135].map(a => <path key={a} d={`M${x - Math.cos((a * Math.PI) / 180) * (r - 2)} ${y - Math.sin((a * Math.PI) / 180) * (r - 2)} L${x + Math.cos((a * Math.PI) / 180) * (r - 2)} ${y + Math.sin((a * Math.PI) / 180) * (r - 2)}`} stroke={DARKWOOD} strokeWidth="2" />)}
      <circle cx={x} cy={y} r="3.6" fill={KIN} stroke={INK} strokeWidth="1.1" />
    </g>
  );
}

function Yamahoko({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={60} r={110} />
      <rect x="0" y="122" width={W} height="8" fill="#12283f" />
      <Komagata u={u} x={62} />
      <Komagata u={u} x={298} />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 真木 */}
        <path d="M180 26 V-4" stroke={INK} strokeWidth="4.4" /><path d="M180 26 V-4" stroke={WOOD_LIGHT} strokeWidth="2" />
        <path d="M170 10 H190 M173 16 H187" stroke={KIN} strokeWidth="2.6" />
        <path d="M172 2 C176 -4 184 -4 188 2 C184 6 176 6 172 2Z" fill={LEAF} stroke={INK} strokeWidth="1" />
        {/* 屋根 */}
        <path d="M114 46 C142 42 162 32 180 22 C198 32 218 42 246 46 L240 53 H120Z" fill={DARKWOOD} stroke={INK} strokeWidth="2" />
        <path d="M120 48 C146 44 164 35 180 26 C196 35 214 44 240 48" fill="none" stroke={KIN} strokeWidth="2" />
        <path d="M172 34 L180 28 L188 34 V44 H172Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.2" />
        {/* 舞台と囃子方 */}
        <rect x="128" y="53" width="104" height="18" fill="#3a2c20" stroke={INK} strokeWidth="1.4" />
        {[142, 160, 180, 200, 218].map(x => <circle key={x} cx={x} cy="62" r="4.6" fill={SKIN} stroke={INK} strokeWidth="1" />)}
        <path d="M124 70 H236 V76 H124Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.4" />
        {/* 胴掛けの織物 */}
        <rect x="126" y="76" width="108" height="26" fill={SHU} stroke={INK} strokeWidth="1.8" />
        <rect x="130" y="79" width="100" height="20" fill="none" stroke={KIN_LIGHT} strokeWidth="1.6" />
        {[146, 164, 180, 196, 214].map((x, i) => <path key={x} d={`M${x} 82 l7 7 -7 7 -7 -7Z`} fill={i % 2 ? AI_MID : KIN_LIGHT} stroke={INK} strokeWidth="0.8" />)}
        <path d="M126 102 H234 V108 H126Z" fill={AI} stroke={INK} strokeWidth="1.3" />
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${130 + i * 7.6} 108 v5`} stroke={KIN_LIGHT} strokeWidth="1.6" />)}
        {/* 引き綱と引き手 */}
        <path d="M126 104 C100 112 80 110 44 114" fill="none" stroke={KIN_PALE} strokeWidth="1.8" />
      </g>
      <Wheel x={146} y={110} r={15} />
      <Wheel x={214} y={110} r={15} />
      <Hito x={36} y={128} s={0.86} coat={WASHI} flip />
      <Hito x={68} y={128} s={0.86} coat={WASHI} flip />
      <Hito x={98} y={128} s={0.86} coat={WASHI} flip />
      <Hito x={266} y={128} s={0.86} coat={AI_MID} up />
      <Hito x={316} y={128} s={0.86} coat={WASHI} up flip />
    </g>
  );
}

function ToriiShape() {
  return (
    <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
      <rect x="132" y="62" width="7" height="42" fill={SHU} /><rect x="221" y="62" width="7" height="42" fill={SHU} />
      <rect x="170" y="62" width="6" height="42" fill={SHU_DARK} /><rect x="184" y="62" width="6" height="42" fill={SHU_DARK} />
      <path d="M132 70 H156 M204 70 H228" stroke={SHU_BRIGHT} strokeWidth="5" />
      <path d="M148 104 L154 34 H166 L164 104Z" fill={SHU_BRIGHT} />
      <path d="M196 104 L194 34 H206 L212 104Z" fill={SHU_BRIGHT} />
      <rect x="128" y="46" width="104" height="9" fill={SHU_BRIGHT} />
      <path d="M116 20 C150 30 210 30 244 20 L241 34 C210 41 150 41 119 34Z" fill={SHU_BRIGHT} />
      <path d="M114 13 C150 23 210 23 246 13 L244 20 C210 30 150 30 116 20Z" fill={INK} />
      <rect x="171" y="33" width="18" height="14" fill={KIN} />
    </g>
  );
}

function Torii({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} dusk />
      <Lamp u={u} x={296} y={36} r={54} />
      <circle cx="296" cy="36" r="15" fill={KIN_PALE} stroke={INK} strokeWidth="1.2" />
      <path d="M-10 98 V62 C36 36 92 30 132 54 C164 42 204 48 236 68 C276 62 324 70 370 80 V98Z" fill="#2c2850" />
      <path d="M-10 98 V80 C40 68 90 74 130 84 C180 76 240 80 370 88 V98Z" fill="#1c1c40" />
      <rect x="-10" y="96" width="380" height="34" fill="#2e5e8c" />
      <g opacity="0.3" transform="translate(0 208) scale(1 -1)"><ToriiShape /></g>
      <path d={wavePath(100, 3, 30, -10, 370)} fill="none" stroke={WASHI} strokeWidth="1.3" opacity="0.6" />
      <path d={wavePath(111, 3, 38, -26, 370)} fill="none" stroke={AI_LIGHT} strokeWidth="1.2" opacity="0.5" />
      <path d={wavePath(121, 3, 44, -6, 370)} fill="none" stroke={AI_LIGHT} strokeWidth="1.1" opacity="0.4" />
      <path d="M282 104 h28 M276 111 h40 M286 118 h22" stroke={KIN_PALE} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <ToriiShape />
      {/* 灯籠舟 */}
      <g strokeLinejoin="round">
        <Lamp u={u} x={56} y={104} r={24} />
        <path d="M34 110 H80 L74 118 H40Z" fill={WOOD} stroke={INK} strokeWidth="1.4" />
        <rect x="50" y="96" width="14" height="14" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.1" />
        <path d="M46 97 L57 90 L68 97Z" fill={DARKWOOD} stroke={INK} strokeWidth="1.1" />
      </g>
    </g>
  );
}

function FuguLantern({ u, x, y, s = 1 }: { u: string; x: number; y: number; s?: number }) {
  return (
    <g>
      <Lamp u={u} x={x} y={y} r={46 * s} />
      <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 -44 V-26" stroke={INK} strokeWidth="1.2" />
        <path d="M24 -4 L44 -16 C40 -6 40 6 44 16 L24 6Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.6" />
        <path d="M-4 -26 C2 -36 12 -36 16 -27Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="27" fill="#fff5dc" stroke={INK} strokeWidth="2" />
        <path d="M-26 -6 C-22 -22 -10 -27 0 -27 C12 -27 24 -20 26.6 -4 C12 -10 -10 -10 -26 -6Z" fill="#d6a45a" />
        {[[-10, -17], [2, -19], [13, -14], [-18, -10]].map(([sx, sy]) => <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r="2.6" fill="#8a5a2a" />)}
        <circle cx="0" cy="0" r="27" fill="none" stroke={INK} strokeWidth="2" />
        {[200, 225, 250, 275, 300, 325, 350, 15, 40].map(a => {
          const r0 = 22;
          const ax = Math.cos((a * Math.PI) / 180);
          const ay = -Math.sin((a * Math.PI) / 180);
          return <path key={a} d={`M${ax * r0} ${ay * r0} l${ax * 4} ${ay * 4}`} stroke="#b89a6a" strokeWidth="1.3" />;
        })}
        <path d="M6 4 C12 12 22 12 26 6" fill="none" stroke={KIN_DARK} strokeWidth="3.4" />
        <circle cx="-13" cy="-3" r="6" fill="#fff" stroke={INK} strokeWidth="1.3" /><circle cx="-14" cy="-2.4" r="3" fill={INK} /><circle cx="-15" cy="-4" r="1" fill="#fff" />
        <ellipse cx="-26" cy="5" rx="4" ry="4.6" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.3" />
        <ellipse cx="-27" cy="5" rx="1.4" ry="2" fill={SHU_DARK} />
        <path d="M0 27 v6" stroke={INK} strokeWidth="1.2" /><path d="M-3 33 h6 l-1 9 h-4Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1" />
      </g>
    </g>
  );
}

function Fugu({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      {/* 海峡の橋 */}
      <g stroke="#4a7faf" fill="none" opacity="0.75">
        <path d="M-10 78 Q44 50 96 48 Q180 100 264 48 Q316 50 370 78" strokeWidth="1.6" />
        <path d="M-10 90 H370" strokeWidth="3" />
        {[20, 44, 68, 124, 152, 180, 208, 236, 292, 316, 340].map(x => <path key={x} d={`M${x} 90 V${x < 96 ? 78 - (x / 96) * 28 : x > 264 ? 50 + ((x - 264) / 106) * 28 : 48 + (1 - Math.abs(x - 180) / 84) * 26}`} strokeWidth="0.8" />)}
        <path d="M96 100 V40 M264 100 V40" strokeWidth="5" />
      </g>
      <Water y={100} />
      <path d="M-10 10 Q180 34 370 10" fill="none" stroke={INK} strokeWidth="1.3" />
      <FuguLantern u={u} x={74} y={62} s={0.86} />
      <FuguLantern u={u} x={180} y={70} />
      <FuguLantern u={u} x={288} y={62} s={0.86} />
    </g>
  );
}

function Dancer({ x, y, c, flip = false, s = 1 }: { x: number; y: number; c: string; flip?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-5 0 h-7 M5 0 h7" stroke={INK} strokeWidth="3.4" />
      <path d="M-10 -34 L-8 0 H8 L10 -34Z" fill={c} stroke={INK} strokeWidth="1.5" />
      <path d="M-8.4 -8 L-8 0 H8 L8.4 -8Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1" />
      <path d="M-9 -58 L-20 -84 M9 -58 L16 -86" stroke={INK} strokeWidth="6.4" /><path d="M-9 -58 L-20 -84 M9 -58 L16 -86" stroke={c} strokeWidth="3.8" />
      <circle cx="-20.6" cy="-86" r="2.6" fill={SKIN} stroke={INK} strokeWidth="0.9" /><circle cx="16.6" cy="-88" r="2.6" fill={SKIN} stroke={INK} strokeWidth="0.9" />
      <path d="M-11 -62 H11 L10 -34 H-10Z" fill={c} stroke={INK} strokeWidth="1.5" />
      <rect x="-10.6" y="-46" width="21.2" height="9" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.1" />
      <path d="M-2 -62 L0 -47 L2 -62" fill={WASHI} stroke={INK} strokeWidth="0.8" />
      <circle cx="0" cy="-67" r="5.4" fill={SKIN} stroke={INK} strokeWidth="1.2" />
      <path d="M-14 -68 C-10 -82 10 -82 14 -68 C6 -72 -6 -72 -14 -68Z" fill={KIN_PALE} stroke={INK} strokeWidth="1.4" />
      <path d="M-6 -73 L0 -78 L6 -73" fill="none" stroke={KIN_DARK} strokeWidth="1" />
      <path d="M-4 -63 h8" stroke={SHU_BRIGHT} strokeWidth="1.3" />
    </g>
  );
}

function Odori({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={84} r={150} />
      <rect x="0" y="122" width={W} height="8" fill="#12283f" />
      <path d="M-10 6 Q180 26 370 6" fill="none" stroke={INK} strokeWidth="1.2" />
      {[20, 66, 112, 158, 202, 248, 294, 340].map((x, i) => <Chochin key={x} x={x} y={8 + Math.sin((x / 360) * Math.PI) * 9} s={0.8} c={i % 2 ? KIN_LIGHT : SHU_BRIGHT} />)}
      <Dancer x={64} y={124} c="#f4b6bd" s={0.92} />
      <Dancer x={122} y={126} c={WASHI} flip />
      <Dancer x={180} y={124} c="#f4b6bd" s={0.92} />
      <Dancer x={238} y={126} c={WASHI} flip />
      <Hito x={292} y={126} s={1.05} coat={AI_MID} up rot={-8} band={KIN_LIGHT} />
      <Hito x={334} y={126} s={1.05} coat={AI} rot={8} flip band={KIN_LIGHT} />
      <Hito x={22} y={126} s={1.05} coat={AI} up rot={8} band={KIN_LIGHT} />
    </g>
  );
}

function Yu({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <circle cx="318" cy="26" r="12" fill={KIN_PALE} stroke={INK} strokeWidth="1.2" />
      <Lamp u={u} x={180} y={86} r={130} />
      <rect x="0" y="118" width={W} height="12" fill="#12283f" />
      <g fill="none" stroke={WASHI} strokeLinecap="round" opacity="0.28">
        <path d="M60 100 C50 86 70 78 60 64 C50 50 70 42 60 28" strokeWidth="7" /><path d="M300 104 C290 90 310 82 300 68 C290 54 310 46 300 36" strokeWidth="7" /><path d="M96 60 C88 50 104 44 96 32" strokeWidth="5" />
      </g>
      <g strokeLinejoin="round" stroke={INK}>
        {/* 一階 */}
        <rect x="84" y="82" width="192" height="38" fill={WASHI2} strokeWidth="1.8" />
        {[94, 114, 134, 206, 226, 246].map(x => <rect key={x} x={x} y="90" width="16" height="18" fill={KIN_LIGHT} strokeWidth="1.1" />)}
        {[102, 122, 142, 214, 234, 254].map(x => <path key={x} d={`M${x} 90 V108`} strokeWidth="0.8" />)}
        <rect x="160" y="88" width="40" height="32" fill={KIN_LIGHT} strokeWidth="1.3" />
        <path d="M160 88 H173 V104 q-6.5 3 -13 0Z M173.6 88 H186.4 V105 q-6.4 3 -12.8 0Z M187 88 H200 V104 q-6.5 3 -13 0Z" fill={SHU} strokeWidth="1.1" />
        <path d="M68 84 L92 66 H268 L292 84 L286 88 H74Z" fill={DARKWOOD} strokeWidth="1.8" />
        {/* 二階 */}
        <rect x="112" y="50" width="136" height="18" fill={WASHI2} strokeWidth="1.6" />
        {[120, 140, 160, 184, 204, 224].map(x => <rect key={x} x={x} y="54" width="14" height="11" fill={KIN_LIGHT} strokeWidth="1" />)}
        <path d="M98 52 L120 36 H240 L262 52 L256 56 H104Z" fill={DARKWOOD} strokeWidth="1.8" />
        {/* 太鼓楼 */}
        <rect x="163" y="16" width="34" height="22" fill={WOOD} strokeWidth="1.6" />
        <rect x="169" y="20" width="22" height="14" fill={SHU_BRIGHT} strokeWidth="1.1" />
        <path d="M180 20 V34 M169 27 H191" strokeWidth="0.9" />
        <path d="M152 18 L180 2 L208 18 L203 22 H157Z" fill={DARKWOOD} strokeWidth="1.6" />
      </g>
      <path d="M74 86 H286 M104 54 H256 M157 20 H203" stroke={KIN_DARK} strokeWidth="1.4" />
      {/* 屋根の白鷺 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M176 2 C178 -6 186 -6 188 0 L196 -2 L190 4 C186 6 178 6 176 2Z" fill="#fff" stroke={INK} strokeWidth="1.1" />
      </g>
      <Chochin x={150} y={90} s={0.8} /><Chochin x={210} y={90} s={0.8} />
      <Hito x={40} y={126} s={0.9} coat={WASHI} band={AI_LIGHT} />
      <Hito x={326} y={126} s={0.9} coat="#f0a8b0" flip band={WASHI} />
    </g>
  );
}

function Yamakasa({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={52} r={120} />
      <rect x="0" y="122" width={W} height="8" fill="#12283f" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 飾りの山 */}
        <path d="M134 90 L142 62 H218 L226 90Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.8" />
        <path d="M142 86 q9 -12 18 0 q9 -12 18 0 q9 -12 18 0 q9 -12 18 0" fill="none" stroke={AI_LIGHT} strokeWidth="2.6" />
        <path d="M146 62 L154 38 H206 L214 62Z" fill={KIN} stroke={INK} strokeWidth="1.8" />
        <path d="M160 60 V50 H170 V44 H190 V50 H200 V60Z" fill={WASHI} stroke={INK} strokeWidth="1.1" />
        <path d="M156 52 L165 46 H195 L204 52Z M166 46 L180 38 L194 46Z" fill={DARKWOOD} stroke={INK} strokeWidth="1" />
        <path d="M156 38 L164 14 H196 L204 38Z" fill={AI_MID} stroke={INK} strokeWidth="1.8" />
        <circle cx="180" cy="27" r="8" fill={GLOWSKIN} stroke={INK} strokeWidth="1.4" />
        <path d="M171 24 C172 14 188 14 189 24Z" fill={SHU_DARK} stroke={INK} strokeWidth="1.1" />
        <path d="M172 18 L164 8 M188 18 L196 8" stroke={KIN_LIGHT} strokeWidth="2.6" />
        <path d="M176 27 h2 M182 27 h2" stroke={INK} strokeWidth="1.6" />
        <circle cx="180" cy="6" r="7" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.4" />
        <path d="M180 -4 V16 M170 6 H190" stroke={KIN_LIGHT} strokeWidth="1.4" />
        {/* のぼり */}
        <path d="M128 90 V30 M232 90 V30" stroke={INK} strokeWidth="2.4" />
        <path d="M112 32 h16 v34 h-16Z" fill={WASHI} stroke={INK} strokeWidth="1.2" /><path d="M232 32 h16 v34 h-16Z" fill={WASHI} stroke={INK} strokeWidth="1.2" />
        <path d="M116 38 h8 M116 46 h8 M116 54 h8 M236 38 h8 M236 46 h8 M236 54 h8" stroke={SHU_BRIGHT} strokeWidth="2.4" />
        {/* 台とかき棒 */}
        <rect x="130" y="88" width="100" height="10" fill={DARKWOOD} stroke={INK} strokeWidth="1.6" />
        <rect x="46" y="94" width="268" height="6" rx="2" fill={WOOD_LIGHT} stroke={INK} strokeWidth="1.5" />
        <path d="M150 98 V116 M210 98 V116 M180 98 V116" stroke={INK} strokeWidth="4.4" /><path d="M150 98 V116 M210 98 V116 M180 98 V116" stroke={WOOD} strokeWidth="2.2" />
      </g>
      {[60, 92, 124, 236, 268, 300].map((x, i) => <Hito key={x} x={x} y={128} s={0.98} coat={WASHI} up rot={i < 3 ? 10 : 10} band={i % 2 ? SHU_BRIGHT : AI_LIGHT} />)}
      {/* 勢い水 */}
      <g fill={AI_LIGHT} stroke={INK} strokeWidth="0.9">
        <circle cx="26" cy="74" r="3" /><circle cx="38" cy="60" r="2.4" /><circle cx="18" cy="56" r="2" /><circle cx="44" cy="80" r="2.2" /><circle cx="30" cy="92" r="2.6" /><circle cx="10" cy="84" r="2" />
      </g>
      <path d="M2 116 h22 l-3 12 h-16Z" fill={WOOD_LIGHT} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  );
}

const RYU_BODY = 'M40 96 C58 50 92 50 112 82 C132 114 164 114 184 82 C200 56 232 50 262 66';

function Ryu({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} />
      <Lamp u={u} x={180} y={70} r={130} />
      <rect x="0" y="122" width={W} height="8" fill="#12283f" />
      <path d="M-10 4 Q180 22 370 4" fill="none" stroke={INK} strokeWidth="1.2" />
      {[36, 100, 164, 228, 292].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={24 + (i % 2) * 4} r="11" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.4" />
          <path d={`M${x - 10} ${21 + (i % 2) * 4} h20 M${x - 10} ${27 + (i % 2) * 4} h20`} stroke={KIN_LIGHT} strokeWidth="1.4" />
          <path d={`M${x} ${35 + (i % 2) * 4} v8`} stroke={KIN_LIGHT} strokeWidth="2.4" />
          <rect x={x - 4} y={10 + (i % 2) * 4} width="8" height="3.4" fill={KIN_DARK} stroke={INK} strokeWidth="0.8" />
        </g>
      ))}
      {/* 持ち手と棒 */}
      {[[58, 78], [112, 84], [150, 104], [198, 70], [246, 62]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y} L${x + 4} 96`} stroke={INK} strokeWidth="3.4" /><path d={`M${x} ${y} L${x + 4} 96`} stroke={WOOD_LIGHT} strokeWidth="1.5" />
          <Hito x={x + 6} y={128} s={0.84} coat={i % 2 ? WASHI : KIN_LIGHT} up band={SHU_BRIGHT} />
        </g>
      ))}
      <g strokeLinejoin="round" strokeLinecap="round" fill="none">
        {/* 尾の炎 */}
        <path d="M40 96 C28 100 22 112 26 122 C30 114 36 112 40 114 C36 106 38 100 44 98Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />
        {/* 胴 */}
        <path d={RYU_BODY} stroke={INK} strokeWidth="19" />
        <path d={RYU_BODY} stroke={LEAF} strokeWidth="15" />
        <path d={RYU_BODY} stroke={LEAF_DARK} strokeWidth="15" strokeDasharray="2 10" opacity="0.55" />
        <path d={RYU_BODY} stroke={KIN_LIGHT} strokeWidth="3.4" strokeDasharray="1 7" transform="translate(0 4)" />
      </g>
      {/* 背びれ */}
      <g fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
        {[[54, 64, -30], [74, 52, 0], [96, 56, 34], [122, 90, 50], [148, 100, 0], [174, 90, -44], [196, 62, -32], [222, 50, -8], [246, 52, 14]].map(([x, y, r], i) => (
          <path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M-6 0 L0 -12 L6 0Z" />
        ))}
      </g>
      {/* 頭 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M258 50 C250 40 250 28 258 20 C258 30 264 36 272 40Z M246 62 C234 58 228 48 230 38 C236 46 244 50 252 52Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />
        <path d="M272 44 L262 20 M268 30 l-9 0 M282 42 L280 20 M281 30 l8 -4" stroke={INK} strokeWidth="4.4" /><path d="M272 44 L262 20 M268 30 l-9 0 M282 42 L280 20 M281 30 l8 -4" stroke={KIN_LIGHT} strokeWidth="2" />
        <path d="M282 78 L318 86 L306 72Z" fill={LEAF} stroke={INK} strokeWidth="1.8" />
        <path d="M288 74 L312 80 L304 72Z" fill={SHU_DARK} />
        <path d="M252 66 C254 48 272 38 294 44 L320 40 L312 54 C320 60 318 70 308 74 L282 80 C266 82 252 78 252 66Z" fill={LEAF} stroke={INK} strokeWidth="2" />
        <path d="M296 72 l3 6 3 -7 M306 70 l2 5 3 -6" fill={WASHI} stroke={INK} strokeWidth="0.8" />
        <circle cx="290" cy="54" r="5" fill="#fff" stroke={INK} strokeWidth="1.3" /><circle cx="291.4" cy="54.6" r="2.4" fill={INK} />
        <path d="M282 46 L298 50" stroke={INK} strokeWidth="2.6" />
        <circle cx="314" cy="46" r="1.6" fill={INK} />
        <path d="M318 48 C330 46 334 56 344 52 M316 56 C328 62 330 72 342 72" fill="none" stroke={KIN_LIGHT} strokeWidth="2" />
        <path d="M262 62 C268 56 276 54 284 56" fill="none" stroke={LEAF_LIGHT} strokeWidth="2" />
      </g>
      {/* 玉 */}
      <path d="M336 34 L340 96" stroke={INK} strokeWidth="3.4" /><path d="M336 34 L340 96" stroke={WOOD_LIGHT} strokeWidth="1.5" />
      <Lamp u={u} x={336} y={26} r={26} />
      <circle cx="336" cy="26" r="10" fill={KIN} stroke={INK} strokeWidth="1.6" />
      <path d="M330 26 C332 20 340 20 342 26 C340 30 334 30 334 26" fill="none" stroke={SHU_BRIGHT} strokeWidth="1.6" />
      <Hito x={344} y={128} s={0.84} coat={SHU} up band={WASHI} />
    </g>
  );
}

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 0 C-4 -20 4 -36 0 -54" fill="none" stroke={INK} strokeWidth="6.4" /><path d="M0 0 C-4 -20 4 -36 0 -54" fill="none" stroke="#3a2c20" strokeWidth="3.6" />
      <g fill="#1f3a2c" stroke={INK} strokeWidth="1.1">
        <path d="M0 -54 C-14 -66 -30 -62 -38 -50 C-26 -56 -12 -54 0 -50Z" /><path d="M0 -54 C14 -66 30 -62 38 -50 C26 -56 12 -54 0 -50Z" />
        <path d="M0 -54 C-8 -70 -22 -76 -34 -72 C-22 -70 -10 -62 -2 -52Z" /><path d="M0 -54 C8 -70 22 -76 34 -72 C22 -70 10 -62 2 -52Z" /><path d="M-3 -54 C-4 -68 0 -78 4 -82 C4 -70 4 -62 3 -54Z" />
      </g>
    </g>
  );
}

function Volcano({ u, sea }: { u: string; sea: boolean }) {
  return (
    <g>
      <Sky u={u} dusk stars={false} />
      <Puff x={206} y={30} s={1.5} c="#8f8799" />
      <Puff x={252} y={16} s={1.2} c="#a59dae" />
      <Puff x={170} y={44} s={0.9} c="#7c7488" />
      <Puff x={300} y={24} s={0.9} c="#b5adbd" />
      <Lamp u={u} x={176} y={56} r={46} ember />
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M20 106 C80 98 126 74 156 58 L166 54 H188 L200 60 C236 76 284 98 344 106Z" fill="#3a2f52" stroke={INK} strokeWidth="1.8" />
        <path d="M156 58 L166 54 H188 L200 60 C190 62 184 58 178 62 C172 58 164 62 156 58Z" fill={SHU_LIGHT} />
        <path d="M170 60 L164 76 L170 86 M184 60 L192 78 M178 62 V72" fill="none" stroke={SHU_LIGHT} strokeWidth="2.4" />
        <path d="M60 104 C100 96 130 84 150 70 M300 104 C262 98 232 86 212 72" fill="none" stroke="#5a4c78" strokeWidth="1.8" />
        <path d="M166 54 H188" stroke={KIN_LIGHT} strokeWidth="3" />
      </g>
      {sea ? (
        <g>
          <Water y={102} c={AI} />
          <Boat x={250} y={106} s={0.36} />
          <Palm x={44} y={130} s={1.25} />
          <Palm x={84} y={132} s={0.9} />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <path d="M-10 130 V102 C60 96 120 104 180 100 C250 96 300 104 370 98 V130Z" fill="#46583a" stroke={INK} strokeWidth="1.5" />
          {/* 城 */}
          <g stroke={INK} strokeWidth="1.3">
            <path d="M262 112 L270 96 H322 L330 112Z" fill={STONE_DARK} />
            <rect x="276" y="80" width="40" height="16" fill={WASHI2} /><path d="M268 82 L280 72 H312 L324 82Z" fill={DARKWOOD} />
            <rect x="284" y="62" width="24" height="12" fill={WASHI2} /><path d="M278 64 L296 50 L314 64Z" fill={DARKWOOD} />
            <rect x="282" y="86" width="5" height="6" fill={DARKWOOD} /><rect x="294" y="86" width="5" height="6" fill={DARKWOOD} /><rect x="306" y="86" width="5" height="6" fill={DARKWOOD} />
          </g>
          {/* すすき */}
          <g fill="none" stroke={KIN_PALE} strokeWidth="1.6" strokeLinecap="round">
            {[14, 30, 46, 62, 78, 96, 118, 140, 216, 236].map((x, i) => <path key={x} d={`M${x} 130 q${i % 2 ? 6 : -4} -18 ${i % 2 ? 12 : -10} -${24 + (i % 3) * 5}`} />)}
          </g>
        </g>
      )}
    </g>
  );
}

function ShisaShape({ x, flip = false, open }: { x: number; flip?: boolean; open: boolean }) {
  const clay = '#dd8250';
  const clayDark = '#b55a30';
  return (
    <g transform={`translate(${x} 80) scale(${flip ? -1 : 1} 1)`} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-20 -8 C-32 -12 -34 -28 -24 -32 C-26 -24 -22 -20 -16 -18Z" fill={clayDark} stroke={INK} strokeWidth="1.5" />
      <path d="M-20 0 C-24 -18 -14 -30 0 -30 C10 -30 16 -22 16 -12 L20 0Z" fill={clay} stroke={INK} strokeWidth="1.8" />
      <path d="M6 0 V-14 M14 0 V-12" stroke={INK} strokeWidth="1.4" />
      {[[-8, -42], [-4, -52], [6, -56], [16, -54], [-10, -32], [22, -46]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6.4" fill={clayDark} stroke={INK} strokeWidth="1.4" />)}
      <circle cx="8" cy="-38" r="15" fill={clay} stroke={INK} strokeWidth="1.8" />
      <circle cx="3" cy="-42" r="4.2" fill="#fff" stroke={INK} strokeWidth="1.2" /><circle cx="4" cy="-41.6" r="2" fill={INK} />
      <circle cx="15" cy="-42" r="4.2" fill="#fff" stroke={INK} strokeWidth="1.2" /><circle cx="16" cy="-41.6" r="2" fill={INK} />
      <path d="M-2 -48 L7 -45 M20 -48 L12 -45" stroke={INK} strokeWidth="2.4" />
      <ellipse cx="10" cy="-36" rx="3.4" ry="2.4" fill={INK} />
      {open
        ? <g><path d="M0 -32 Q10 -20 21 -32Z" fill={SHU_DARK} stroke={INK} strokeWidth="1.5" /><path d="M3 -31.6 l2 4 2 -4 M13 -31.6 l2 4 2 -4" fill="#fff" stroke={INK} strokeWidth="0.7" /></g>
        : <path d="M0 -31 Q10 -24 21 -31 M4 -29.4 v3 M16 -29.4 v3" fill="none" stroke={INK} strokeWidth="1.8" />}
    </g>
  );
}

function Hibiscus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <path d="M-14 8 C-22 2 -22 -10 -12 -12 M14 8 C22 14 30 8 28 0" fill={LEAF} stroke={INK} strokeWidth="1.2" />
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-9" rx="7" ry="10" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.2" transform={`rotate(${a})`} />)}
      <circle cx="0" cy="0" r="3.4" fill={SHU_DARK} />
      <path d="M0 0 L8 -12" stroke={KIN_LIGHT} strokeWidth="2.2" strokeLinecap="round" /><circle cx="8.6" cy="-13" r="2.4" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.8" />
    </g>
  );
}

function Shisa({ u }: { u: string }) {
  return (
    <g>
      <Sky u={u} dusk stars={false} />
      <Lamp u={u} x={180} y={40} r={64} />
      <circle cx="180" cy="40" r="19" fill={KIN_PALE} stroke={INK} strokeWidth="1.3" />
      <path d="M-10 86 H370 V70 C300 62 240 68 180 66 C120 64 60 60 -10 68Z" fill={AI_MID} stroke={INK} strokeWidth="1.3" />
      <path d="M150 72 h60 M138 78 h84" stroke={KIN_PALE} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      {/* 赤瓦の屋根 */}
      <g strokeLinejoin="round">
        <path d="M-20 136 L44 84 H316 L380 136Z" fill="#c8583a" stroke={INK} strokeWidth="2" />
        {Array.from({ length: 13 }, (_, i) => {
          const t = i / 12;
          return <path key={i} d={`M${44 + t * 272} 84 L${-20 + t * 400} 136`} stroke={WASHI} strokeWidth="3.4" opacity="0.8" />;
        })}
        <path d="M30 96 H330 M12 110 H348 M-6 124 H366" stroke="#8e3420" strokeWidth="1.4" opacity="0.7" />
        <rect x="40" y="78" width="280" height="9" rx="2" fill={WASHI} stroke={INK} strokeWidth="1.6" />
      </g>
      <ShisaShape x={112} open />
      <ShisaShape x={248} flip open={false} />
      <Hibiscus x={26} y={102} s={1.15} />
      <Hibiscus x={338} y={100} s={1.05} />
      <Hibiscus x={182} y={110} s={0.8} />
      <Palm x={328} y={84} s={0.92} />
      <Palm x={30} y={86} s={0.8} />
    </g>
  );
}

function scene(kind: FestivalKind, u: string): ReactNode {
  switch (kind) {
    case 'snow': return <Snow u={u} />;
    case 'crane': return <Crane u={u} />;
    case 'nebuta': return <Nebuta u={u} />;
    case 'tairyobune': return <Tairyobune u={u} />;
    case 'tanabata': return <Tanabata u={u} />;
    case 'mikoshi': return <Mikoshi u={u} />;
    case 'hanabi': return <Hanabi u={u} />;
    case 'ukai': return <Ukai u={u} />;
    case 'tourou': return <Tourou u={u} />;
    case 'yagura': return <Yagura u={u} />;
    case 'yamahoko': return <Yamahoko u={u} />;
    case 'torii': return <Torii u={u} />;
    case 'fugu': return <Fugu u={u} />;
    case 'odori': return <Odori u={u} />;
    case 'yu': return <Yu u={u} />;
    case 'yamakasa': return <Yamakasa u={u} />;
    case 'ryu': return <Ryu u={u} />;
    case 'volcano': return <Volcano u={u} sea={false} />;
    case 'sakurajima': return <Volcano u={u} sea />;
    case 'shisa': return <Shisa u={u} />;
  }
}

interface FestivalArtProps {
  kind: FestivalKind;
  className?: string;
}

/** 祭りの飾り絵（横長の一枚絵） */
export default function FestivalArt({ kind, className = '' }: FestivalArtProps) {
  const u = `fa${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`block w-full h-full ${className}`} aria-hidden="true">
      <Defs u={u} />
      {scene(kind, u)}
    </svg>
  );
}

// ===== 選択肢の札の小さな絵 =====

function choiceShapes(kind: CapitalChoiceEffect['kind']): ReactNode {
  switch (kind) {
    case 'feast':
      // お膳: ご飯・汁・焼き魚と徳利
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M20 16 q-3 -4 0 -8 M27 18 q-3 -4 0 -8" fill="none" stroke={WASHI3} strokeWidth="1.6" />
          <path d="M45 30 C42 25 43 19 46.6 17 V11 h6 V17 C56 19 57 25 54 30Z" fill={WASHI} stroke={INK} strokeWidth="1.4" />
          <path d="M43.6 23 C47 25 52 25 55.6 23" fill="none" stroke={AI_MID} strokeWidth="2" />
          <path d="M5 34 H59 L55 46 H9Z" fill={SHU_DARK} stroke={INK} strokeWidth="1.6" />
          <path d="M5 34 H59" stroke={KIN_LIGHT} strokeWidth="1.4" />
          <path d="M13 46 v9 M51 46 v9" stroke={INK} strokeWidth="4" /><path d="M13 46 v9 M51 46 v9" stroke={SHU_DARK} strokeWidth="2" />
          <path d="M9 26 H29 C29 33 25 36 19 36 C13 36 9 33 9 26Z" fill={WASHI} stroke={INK} strokeWidth="1.4" />
          <path d="M10 26 C12 18 26 18 28 26Z" fill="#fff" stroke={INK} strokeWidth="1.3" />
          <path d="M11 30 H27" stroke={AI_LIGHT} strokeWidth="1.2" />
          <ellipse cx="38" cy="33" rx="12" ry="3.6" fill={WASHI2} stroke={INK} strokeWidth="1.2" />
          <path d="M29 31 C33 26 42 26 46 30 L50 27 L49 31.6 L50 35 L46 33 C42 36 33 36 29 31Z" fill="#c98a4a" stroke={INK} strokeWidth="1.2" />
          <circle cx="33" cy="30.4" r="0.9" fill={INK} />
        </g>
      );
    case 'special_fishing':
      // しなる竿と跳ねる魚
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M6 58 C14 30 30 12 56 8" fill="none" stroke={INK} strokeWidth="5" /><path d="M6 58 C14 30 30 12 56 8" fill="none" stroke={KIN} strokeWidth="2.6" />
          <path d="M6 58 L12 44" stroke={INK} strokeWidth="7.4" /><path d="M6 58 L12 44" stroke={SHU} strokeWidth="4.6" />
          <path d="M56 8 C56 20 50 26 46 34" fill="none" stroke={INK} strokeWidth="1" />
          <SmallFish x={40} y={42} rot={-52} s={0.62} c="#e86a52" />
          <path d="M22 58 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0" fill="none" stroke={AI_LIGHT} strokeWidth="2.4" />
          <circle cx="54" cy="46" r="2" fill={AI_LIGHT} stroke={INK} strokeWidth="0.8" /><circle cx="26" cy="46" r="1.8" fill={AI_LIGHT} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    case 'lore_event':
    case 'extra_turn':
      // 言い伝えの巻物（追加の手番は、巻物にサイコロを添える）
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 18 H50 V48 H12Z" fill={WASHI} stroke={INK} strokeWidth="1.5" />
          <path d="M18 26 H44 M18 32 H44 M18 38 H36" stroke={INK} strokeWidth="1.3" opacity="0.5" />
          <rect x="6" y="13" width="9" height="40" rx="4.5" fill={KIN_DARK} stroke={INK} strokeWidth="1.5" />
          <rect x="48" y="13" width="9" height="40" rx="4.5" fill={KIN_DARK} stroke={INK} strokeWidth="1.5" />
          <path d="M10.5 10 V56 M52.5 10 V56" stroke={INK} strokeWidth="3" /><path d="M10.5 10 V56 M52.5 10 V56" stroke={SHU_BRIGHT} strokeWidth="1.3" />
          {kind === 'extra_turn' ? (
            <g>
              <rect x="34" y="34" width="20" height="20" rx="4" fill={WASHI} stroke={INK} strokeWidth="1.6" transform="rotate(-12 44 44)" />
              <circle cx="44" cy="44" r="3.6" fill={SHU_BRIGHT} />
            </g>
          ) : (
            <path d="M40 40 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6Z" fill={KIN_LIGHT} stroke={INK} strokeWidth="0.8" />
          )}
        </g>
      );
    case 'money':
      return (
        <g>
          <Koban x={20} y={34} r={-24} s={1.05} />
          <Koban x={44} y={34} r={24} s={1.05} />
          <Koban x={32} y={30} s={1.2} />
          <Sparkle x={52} y={12} s={0.6} />
        </g>
      );
    case 'specialty_shop':
      return null;
  }
}

/** 選択肢の札に添える小さな絵（宴・名物釣り・言い伝え・お金・もう一度）。特産品は道具の絵を使う */
export function ChoiceArt({ kind, size = 52 }: { kind: CapitalChoiceEffect['kind']; size?: number }) {
  return (
    <span className="fd-gear is-lv1" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size - 6} height={size - 6}>{choiceShapes(kind)}</svg>
    </span>
  );
}
