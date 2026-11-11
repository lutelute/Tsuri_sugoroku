// 札の絵係: 札の絵（その1）— お金・道具・魚・天気・移動・休み・サイコロ・神社・くじ。
// どの絵も 320x150 の横長。u はぼかし（ArtDefs）の ID の接頭辞。
import {
  INK, WASHI, WASHI2, WASHI3, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, KIN_DEEP, SHU, SHU_LIGHT, SHU_BRIGHT, SHU_DARK,
  AI, AI_MID, AI_LIGHT, LEAF, LEAF_LIGHT, LEAF_DARK, WOOD, WOOD_LIGHT, WOOD_PALE, STONE, STONE_DARK, SKIN,
  FISH_TONES, TAI_TONE, raysPath, burstPath, spiralPath, wavePath, scatter,
} from './artBase';
import { Bg, Sparkle, Koban, Kasumi, Puff, Sea, Hills, Pine, Chevrons, BigFish, SmallFish, Splash, Drop, Boat, Rocks, Rays } from './artKit';
import { GearShapes } from '../shop/GearArt';
import type { EquipmentType } from '../../game/types';

const AI_PALE_SURFACE = '#cfe9f2';
const RAYS_LOW = raysPath(160, 108, 20, 260, 0.5);
const RAYS_MID = raysPath(160, 78, 20, 260, 0.5);

/** お金が入る: 宝箱からあふれる小判 */
export function SceneCoins({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={RAYS_LOW} />
      <ellipse cx="160" cy="135" rx="96" ry="9" fill={INK} opacity="0.16" />
      <path d="M108 88 C104 42 216 42 212 88Z" fill="#5e3718" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M117 84 C118 54 202 54 203 84" fill="none" stroke={KIN} strokeWidth="4" />
      <path d="M160 53 V66" stroke={KIN} strokeWidth="7" />
      <Koban x={128} y={82} r={-34} s={0.95} />
      <Koban x={146} y={72} r={-12} />
      <Koban x={170} y={70} r={14} />
      <Koban x={190} y={80} r={32} s={0.95} />
      <Koban x={158} y={84} r={4} s={0.9} />
      <rect x="106" y="88" width="108" height="46" rx="5" fill="#7a4a22" stroke={INK} strokeWidth="2" />
      <path d="M108 104 H212 M108 119 H212" stroke="#5e3718" strokeWidth="1.3" />
      <rect x="106" y="88" width="108" height="9" rx="2" fill={KIN} stroke={INK} strokeWidth="1.6" />
      <rect x="121" y="88" width="10" height="46" fill={KIN_DARK} stroke={INK} strokeWidth="1.4" />
      <rect x="189" y="88" width="10" height="46" fill={KIN_DARK} stroke={INK} strokeWidth="1.4" />
      <rect x="149" y="91" width="22" height="22" rx="3" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.6" />
      <circle cx="160" cy="99" r="2.8" fill={INK} />
      <path d="M160 100 l-2.2 8 h4.4Z" fill={INK} />
      <Koban x={76} y={52} r={-28} s={0.85} />
      <Koban x={246} y={46} r={24} s={0.9} />
      <Koban x={262} y={104} r={48} s={0.75} />
      <Koban x={56} y={108} r={-56} s={0.7} />
      <Koban x={222} y={128} r={78} s={0.7} />
      <Sparkle x={52} y={30} />
      <Sparkle x={276} y={26} s={1.2} />
      <Sparkle x={216} y={34} s={0.7} c="#fff" />
      <Sparkle x={104} y={30} s={0.8} c="#fff" />
      <Sparkle x={292} y={76} s={0.7} />
    </g>
  );
}

/** 羽の生えた小判（お金が飛んでいく） */
function WingedKoban({ x, y, r, s = 1 }: { x: number; y: number; r: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g fill={WASHI} stroke={INK} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M-9 -4 C-22 -22 -36 -18 -42 -8 C-36 -10 -32 -8 -30 -4 C-36 -4 -38 0 -38 4 C-28 4 -18 2 -9 4Z" />
        <path d="M9 -4 C22 -22 36 -18 42 -8 C36 -10 32 -8 30 -4 C36 -4 38 0 38 4 C28 4 18 2 9 4Z" />
      </g>
      <Koban x={0} y={0} />
    </g>
  );
}

/** お金を失う: がま口から羽の生えた小判が飛んでいく */
export function SceneWallet({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="storm" />
      <rect x="0" y="0" width="320" height="150" fill={WASHI2} opacity="0.62" />
      <Kasumi x={250} y={112} c={WASHI} o={0.7} />
      <Kasumi x={40} y={18} c={WASHI} o={0.6} s={0.8} />
      <ellipse cx="104" cy="136" rx="62" ry="7" fill={INK} opacity="0.16" />
      <path d="M118 78 Q150 48 180 62 M124 86 Q170 70 214 44 M128 92 Q190 96 252 86" fill="none" stroke={INK} strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="104" cy="88" rx="44" ry="8" fill="#3a1410" stroke={INK} strokeWidth="1.6" />
      <path d="M60 88 C50 114 66 136 104 136 C142 136 158 114 148 88 C134 96 74 96 60 88Z" fill={SHU} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M66 100 C72 124 90 130 104 130" fill="none" stroke={SHU_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {[[86, 108], [104, 118], [122, 108], [96, 124], [114, 126], [104, 102]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={KIN_LIGHT} opacity="0.85" />)}
      <path d="M58 88 Q104 60 150 88" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M58 88 Q104 60 150 88" fill="none" stroke={KIN_DARK} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M62 86 Q104 62 146 86" fill="none" stroke={KIN_LIGHT} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <circle cx="97" cy="69" r="5.6" fill={KIN} stroke={INK} strokeWidth="1.5" />
      <circle cx="111" cy="69" r="5.6" fill={KIN} stroke={INK} strokeWidth="1.5" />
      <path d="M48 62 L38 52 M62 54 L57 42 M40 76 L28 74" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
      <WingedKoban x={190} y={64} r={18} />
      <WingedKoban x={236} y={36} r={30} s={0.85} />
      <WingedKoban x={270} y={86} r={8} s={0.75} />
    </g>
  );
}

/** 桐箱に寝かせた名匠の竿（横向き） */
function GiftRod() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {/* 房 */}
      <path d="M96 100 C92 108 98 112 94 120" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M96 100 C92 108 98 112 94 120" fill="none" stroke={SHU_LIGHT} strokeWidth="2" />
      <path d="M90 118 l4 -4 4 4 -1.4 7 h-5.2Z" fill={SHU} stroke={INK} strokeWidth="1.2" />
      {/* 握り（柄巻き）→ 金具 → 朱漆 → 穂先 */}
      <path d="M72 101 L122 96" stroke={INK} strokeWidth="13" />
      <path d="M122 96 L204 89" stroke={INK} strokeWidth="8" />
      <path d="M204 89 L250 85" stroke={INK} strokeWidth="5" />
      <path d="M72 101 L122 96" stroke="#3a2a5a" strokeWidth="9.4" />
      <path d="M122 96 L204 89" stroke="#8a2016" strokeWidth="4.8" />
      <path d="M204 89 L250 85" stroke="#2a1a14" strokeWidth="2.4" />
      <path d="M121 91.4 L123 100.6 M129 91 L130.6 99.6" stroke={KIN} strokeWidth="3.4" />
      <path d="M71.4 96 L72.6 106" stroke={KIN} strokeWidth="4" />
      {[80, 90, 100, 110].map(x => <path key={x} d={`M${x} ${100.2 - (x - 72) * 0.1 - 4} l4 4 -4 4 -4 -4Z`} fill={KIN_LIGHT} />)}
      {[140, 152, 164, 176, 188].map((x, i) => <circle key={x} cx={x} cy={94.4 - (x - 122) * 0.085 + (i % 2 ? 0.9 : -0.9)} r="1.2" fill={KIN_LIGHT} />)}
      <path d="M134 93.6 C156 91 180 89.4 200 88" fill="none" stroke="#d8705e" strokeWidth="1.1" opacity="0.8" />
      {[[150, 5], [176, 4.4], [200, 3.8], [220, 3.2], [236, 2.6], [248, 2]].map(([x, r]) => {
        const y = 96 - (x - 122) * 0.0855;
        return (
          <g key={x}>
            <path d={`M${x} ${y} v3`} stroke={INK} strokeWidth="1.2" />
            <circle cx={x} cy={y + 3 + r} r={r} fill="none" stroke={INK} strokeWidth="2.6" />
            <circle cx={x} cy={y + 3 + r} r={r} fill="none" stroke={KIN} strokeWidth="1.2" />
          </g>
        );
      })}
    </g>
  );
}

/** 道具が良くなる: 桐箱に入った贈り物 */
export function SceneGift({ u, variant }: { u: string; variant?: string }) {
  const type: EquipmentType = variant === 'reel' ? 'reel' : variant === 'lure' ? 'lure' : 'rod';
  const x0 = type === 'rod' ? 52 : 86;
  const w = 320 - x0 * 2;
  const x1 = x0 + w;
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={RAYS_MID} c={SHU_LIGHT} o={0.16} />
      <Rays d={raysPath(160, 78, 20, 260, 0.5, -81)} o={0.22} />
      <ellipse cx="160" cy="139" rx={w / 2 + 8} ry="7" fill={INK} opacity="0.15" />
      {/* ふた（奥に立てかける） */}
      <path d={`M${x0 + 4} 54 L${x0 + 20} 20 L${x1 - 20} 20 L${x1 - 4} 54Z`} fill="#d9bf88" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${x0 + 24} 30 L${x1 - 24} 30 M${x0 + 18} 42 L${x1 - 18} 42`} stroke="#c2a468" strokeWidth="1.1" />
      <path d="M149 20 H171 V54 H149Z" fill={WASHI} stroke={INK} strokeWidth="1.2" />
      <path d="M155 20 V54 M165 20 V54" stroke={SHU} strokeWidth="2.6" />
      {/* 箱 */}
      <rect x={x0} y="52" width={w} height="84" rx="4" fill={WOOD_PALE} stroke={INK} strokeWidth="2" />
      <path d={`M${x0 + 4} 130 H${x1 - 4}`} stroke="#b89460" strokeWidth="1.2" />
      <rect x={x0 + 10} y="60" width={w - 20} height="64" rx="2" fill="#4d2a66" stroke={INK} strokeWidth="1.5" />
      <path d={`M${x0 + 10} 78 C${x0 + 46} 66 ${x0 + 78} 92 ${x0 + w * 0.56} 78 C${x0 + w * 0.7} 70 ${x1 - 40} 84 ${x1 - 10} 74 V124 H${x0 + 10}Z`} fill="#623a80" />
      <path d={`M${x0 + 20} 114 C${x0 + 50} 106 ${x0 + w * 0.5} 120 ${x0 + w * 0.7} 110 C${x1 - 50} 106 ${x1 - 30} 112 ${x1 - 16} 108`} fill="none" stroke="#8a62a8" strokeWidth="1.4" opacity="0.8" />
      {type === 'rod' ? <GiftRod /> : <g transform="translate(160 92) scale(0.98) translate(-32 -32)"><GearShapes type={type} level={5} /></g>}
      {/* 紅白の水引 */}
      <g transform={`translate(${x1 - 22} 130)`} fill="none" strokeLinecap="round">
        <path d="M0 0 C-16 -18 -26 -4 -12 2 M0 0 C16 -18 26 -4 12 2" stroke={INK} strokeWidth="5.4" />
        <path d="M0 0 C-16 -18 -26 -4 -12 2" stroke={SHU_BRIGHT} strokeWidth="3" />
        <path d="M0 0 C16 -18 26 -4 12 2" stroke={WASHI} strokeWidth="3" />
        <path d="M0 0 L-8 14 M0 0 L8 14" stroke={INK} strokeWidth="5" />
        <path d="M0 0 L-8 14" stroke={WASHI} strokeWidth="2.6" />
        <path d="M0 0 L8 14" stroke={SHU_BRIGHT} strokeWidth="2.6" />
        <circle cx="0" cy="0" r="4" fill={KIN} stroke={INK} strokeWidth="1.3" />
      </g>
      <Sparkle x={x0 - 22} y={34} s={1.1} />
      <Sparkle x={x1 + 22} y={40} s={1.2} />
      <Sparkle x={x1 + 30} y={98} s={0.7} c="#fff" />
      <Sparkle x={x0 - 28} y={104} s={0.75} c="#fff" />
      <Sparkle x={type === 'rod' ? 206 : 60} y={type === 'rod' ? 12 : 70} s={0.6} />
      {type !== 'rod' && <Sparkle x={262} y={70} s={0.6} c="#fff" />}
    </g>
  );
}

/** 竿が折れる */
export function SceneRodBreak({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="storm" />
      <rect x="0" y="0" width="320" height="150" fill={WASHI2} opacity="0.5" />
      <Rocks y={124} />
      <path d={burstPath(158, 70, 11, 46, 22)} fill={KIN_PALE} stroke={SHU} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={burstPath(158, 70, 9, 24, 12, -70)} fill="#fff" />
      {/* 手元側 */}
      <g strokeLinecap="round">
        <path d="M44 124 L150 72" stroke={INK} strokeWidth="9.6" />
        <path d="M44 124 L150 72" stroke="#c9b356" strokeWidth="6.4" />
        <path d="M44 124 L84 104.4" stroke={INK} strokeWidth="13" />
        <path d="M44 124 L84 104.4" stroke="#cfa26a" strokeWidth="9.6" />
        <path d="M54 113 l5 10 M64 108 l5 10 M74 103 l5 10" stroke="#8e6a3c" strokeWidth="1.3" />
        <path d="M104 89 l4 8 M126 78 l4 8" stroke="#6f5d1e" strokeWidth="1.8" />
      </g>
      {/* 折れ口 */}
      <path d="M146 68 L158 70 L150 76 L160 80 L148 82 Z" fill="#e6d48a" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {/* 穂先側（だらりと下がる） */}
      <g strokeLinecap="round">
        <path d="M170 72 L262 112" stroke={INK} strokeWidth="7.6" />
        <path d="M170 72 L262 112" stroke="#d2bf68" strokeWidth="4.6" />
        <path d="M262 112 L294 120" stroke={INK} strokeWidth="5" />
        <path d="M262 112 L294 120" stroke="#dccd80" strokeWidth="2.6" />
        <path d="M200 81 l-3 8 M232 95 l-3 8" stroke="#6f5d1e" strokeWidth="1.6" />
      </g>
      <path d="M166 66 L176 72 L166 76 L176 82 L164 80Z" fill="#e6d48a" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M294 120 C300 100 280 96 286 78 C290 66 304 70 300 80" fill="none" stroke={INK} strokeWidth="1.1" />
      {/* 飛び散るかけら */}
      <g fill="#d8c676" stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
        <path d="M150 38 l8 -4 -2 9Z" /><path d="M186 44 l9 2 -6 6Z" /><path d="M128 50 l-8 -2 5 7Z" /><path d="M176 104 l7 5 -8 2Z" />
      </g>
      <path d="M110 38 L100 26 M214 40 L226 28 M98 62 L84 58" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** リールが波をかぶる */
export function SceneReelSoak({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="storm" />
      <rect x="0" y="0" width="320" height="150" fill={AI_LIGHT} opacity="0.35" />
      {/* 大波（左から巻きこむ） */}
      <path d="M-10 150 L-10 76 C20 24 96 6 142 36 C166 52 164 86 138 90 C150 74 138 56 118 58 C84 62 74 104 112 126 L150 150Z" fill={AI_MID} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-10 96 C16 52 76 34 112 46 C80 46 40 70 26 116 C22 130 26 142 30 150 L-10 150Z" fill={AI} opacity="0.55" />
      <path d="M2 86 C26 48 78 30 116 40 M10 112 C24 74 62 54 96 54" fill="none" stroke={AI_LIGHT} strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
      <g fill={WASHI} stroke={INK} strokeWidth="1.3">
        <circle cx="104" cy="22" r="7" /><circle cx="122" cy="24" r="7.6" /><circle cx="140" cy="33" r="7.4" /><circle cx="153" cy="46" r="7" /><circle cx="159" cy="62" r="6.6" /><circle cx="156" cy="78" r="6" /><circle cx="146" cy="90" r="5.6" />
        <circle cx="86" cy="22" r="6" /><circle cx="70" cy="26" r="5" />
      </g>
      <g fill={WASHI} stroke={INK} strokeWidth="1.1">
        <circle cx="176" cy="38" r="3.4" /><circle cx="188" cy="58" r="2.8" /><circle cx="172" cy="94" r="3" /><circle cx="196" cy="24" r="2.4" />
      </g>
      {/* リール */}
      <g transform="translate(226 78) rotate(16) scale(1.5) translate(-32 -32)"><GearShapes type="reel" level={2} /></g>
      <Drop x={206} y={30} s={1.1} r={-20} /><Drop x={262} y={26} s={0.9} r={18} /><Drop x={288} y={62} s={1} r={40} /><Drop x={184} y={74} s={0.8} r={-50} />
      {/* 足もとの水 */}
      <path d={`${wavePath(118, 8, 34)} L330 150 L-10 150Z`} fill={AI} opacity="0.92" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={wavePath(123, 6, 34)} fill="none" stroke={WASHI} strokeWidth="1.6" opacity="0.8" />
      <path d={wavePath(136, 4, 40, -20)} fill="none" stroke={AI_LIGHT} strokeWidth="1.2" opacity="0.5" />
    </g>
  );
}

/** ルアーが根がかり・糸が切れる */
export function SceneLureLost({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="deep" />
      <path d="M-10 14 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V-4 H-10Z" fill={AI_PALE_SURFACE} opacity="0.7" />
      <g fill="#fff" opacity="0.1">
        <path d="M60 10 L20 150 H70 L90 10Z" /><path d="M170 10 L150 150 H210 L200 10Z" /><path d="M270 10 L290 150 H330 L296 10Z" />
      </g>
      {/* 海藻 */}
      <g fill="none" strokeLinecap="round">
        <path d="M40 150 C30 126 52 112 40 90 C32 74 46 64 42 50" stroke={INK} strokeWidth="9" /><path d="M40 150 C30 126 52 112 40 90 C32 74 46 64 42 50" stroke={LEAF_DARK} strokeWidth="6" />
        <path d="M66 150 C76 130 58 118 68 100" stroke={INK} strokeWidth="8" /><path d="M66 150 C76 130 58 118 68 100" stroke={LEAF} strokeWidth="5" />
        <path d="M286 150 C296 124 274 112 286 88 C292 76 282 68 286 58" stroke={INK} strokeWidth="9" /><path d="M286 150 C296 124 274 112 286 88 C292 76 282 68 286 58" stroke={LEAF_DARK} strokeWidth="6" />
      </g>
      {/* 岩 */}
      <g strokeLinejoin="round">
        <path d="M96 150 C96 122 120 106 150 108 C170 96 206 98 222 118 C246 118 262 132 262 150Z" fill={STONE_DARK} stroke={INK} strokeWidth="2" />
        <path d="M110 136 C114 120 132 114 150 116 M176 108 C192 106 206 112 214 122" fill="none" stroke={STONE} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* 岩にかかったルアー */}
      <g transform="translate(184 96) rotate(38) scale(0.92) translate(-32 -32)"><GearShapes type="lure" level={3} /></g>
      <path d="M160 86 C150 74 158 66 150 58 C146 54 150 48 154 50" fill="none" stroke={WASHI} strokeWidth="1.5" strokeLinecap="round" />
      {/* 切れた糸 */}
      <path d="M96 -4 C104 20 120 30 128 44" fill="none" stroke={WASHI} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M128 44 l6 2 M128 44 l2 7 M128 44 l-4 5" stroke={WASHI} strokeWidth="1.2" strokeLinecap="round" />
      <path d={burstPath(140, 52, 7, 13, 6)} fill={KIN_PALE} stroke={SHU} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 泡 */}
      <g fill="none" stroke={WASHI} strokeWidth="1.3" opacity="0.75">
        <circle cx="214" cy="70" r="4" /><circle cx="224" cy="52" r="3" /><circle cx="218" cy="36" r="2.2" /><circle cx="78" cy="78" r="3" /><circle cx="84" cy="62" r="2" /><circle cx="250" cy="96" r="2.6" />
      </g>
      <SmallFish x={266} y={40} s={0.5} c={AI_LIGHT} flip />
      <SmallFish x={60} y={36} s={0.42} c={AI_LIGHT} />
    </g>
  );
}

/** 魚をもらう: 水しぶきを上げて跳ねる魚（めずらしさで色と後光が変わる） */
export function SceneFish({ u, variant }: { u: string; variant?: string }) {
  const rarity = variant && FISH_TONES[variant] ? variant : 'common';
  const tone = FISH_TONES[rarity];
  const holy = rarity === 'mythical';
  const gold = rarity === 'legendary' || holy;
  return (
    <g>
      <Bg u={u} tone={holy ? 'dusk' : 'day'} />
      {gold && <Rays d={raysPath(160, 64, 22, 260, 0.5)} c={holy ? '#fff' : KIN} o={holy ? 0.3 : 0.32} />}
      {gold && <circle cx="160" cy="62" r="74" fill={`url(#${u}glow)`} />}
      {!gold && <circle cx="262" cy="34" r="17" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />}
      {!gold && <Kasumi x={70} y={22} o={0.85} />}
      {!gold && <Kasumi x={250} y={52} s={0.8} o={0.8} />}
      <Sea u={u} y={108} />
      <Splash x={150} y={110} s={1.05} />
      <BigFish x={162} y={60} rot={-32} s={0.98} tone={tone} />
      {holy && (
        <g>
          <ellipse cx="124" cy="22" rx="20" ry="5.6" fill="none" stroke={INK} strokeWidth="4.6" />
          <ellipse cx="124" cy="22" rx="20" ry="5.6" fill="none" stroke={KIN_LIGHT} strokeWidth="2.6" />
        </g>
      )}
      {rarity !== 'common' && <Sparkle x={228} y={36} s={1.1} c={gold ? '#fff' : KIN_PALE} />}
      {rarity !== 'common' && <Sparkle x={86} y={58} s={0.8} c={gold ? '#fff' : KIN_PALE} />}
      {gold && <Sparkle x={250} y={84} s={0.9} />}
      {gold && <Sparkle x={62} y={26} s={1.2} />}
      {gold && <Sparkle x={282} y={30} s={0.7} c="#fff" />}
    </g>
  );
}

/** 大漁: 大漁旗と、かごにあふれる魚 */
export function SceneTairyo({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="day" />
      <Rays d={raysPath(206, 110, 18, 260, 0.5)} o={0.2} />
      <Sea u={u} y={112} />
      {/* 大漁旗 */}
      <path d="M52 150 V14" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M52 150 V14" stroke={WOOD_LIGHT} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="52" cy="12" r="4.6" fill={KIN} stroke={INK} strokeWidth="1.4" />
      <path d="M56 20 C84 10 110 32 142 20 L142 84 C110 96 84 74 56 84Z" fill={WASHI} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M56 66 C84 56 110 78 142 66 L142 84 C110 96 84 74 56 84Z" fill={AI_MID} />
      <path d="M56 66 C66 62 72 68 80 66 C88 62 94 70 102 70 C110 70 116 66 124 68 C132 70 136 68 142 66" fill="none" stroke={WASHI} strokeWidth="2" />
      <circle cx="98" cy="44" r="17" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.5" />
      <path d={raysPath(98, 44, 12, 34, 0.42)} fill={SHU_BRIGHT} opacity="0.5" />
      <path d="M56 20 C84 10 110 32 142 20 L142 84 C110 96 84 74 56 84Z" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* かごの魚 */}
      <SmallFish x={176} y={88} rot={-62} s={0.95} c="#9fb9cc" />
      <SmallFish x={200} y={78} rot={-96} s={1.05} c="#e86a52" />
      <SmallFish x={226} y={80} rot={-118} s={1} c={KIN_LIGHT} />
      <SmallFish x={250} y={92} rot={-140} s={0.9} c="#7dbb8e" />
      <SmallFish x={212} y={96} rot={-8} s={1} c="#9fb9cc" flip />
      <SmallFish x={186} y={102} rot={14} s={0.85} c={AI_LIGHT} />
      <SmallFish x={238} y={104} rot={-16} s={0.8} c="#e86a52" flip />
      <path d="M158 106 H268 L254 142 H172Z" fill={WOOD_LIGHT} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M161 114 H265 M164 123 H262 M168 132 H258" stroke={WOOD} strokeWidth="1.5" opacity="0.8" />
      <path d="M176 106 L184 142 M194 106 L199 142 M213 106 V142 M232 106 L227 142 M250 106 L242 142" stroke={WOOD} strokeWidth="1.3" opacity="0.7" />
      <rect x="154" y="102" width="118" height="7" rx="3.5" fill={KIN_DARK} stroke={INK} strokeWidth="1.6" />
      <Sparkle x={282} y={62} s={1.1} />
      <Sparkle x={160} y={62} s={0.7} c="#fff" />
      <Sparkle x={292} y={26} s={0.8} c="#fff" />
    </g>
  );
}

/** 釣りの点が増える: 大漁祈願の絵馬 */
export function ScenePower({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={RAYS_MID} c={SHU_LIGHT} o={0.2} />
      <Rays d={raysPath(160, 78, 20, 260, 0.5, -81)} o={0.24} />
      {/* 気合いの炎 */}
      <g strokeLinejoin="round">
        <path d="M62 132 C40 110 52 86 66 74 C64 90 76 92 76 78 C76 62 90 52 90 38 C104 56 98 76 104 88 C108 96 110 116 96 132Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.6" opacity="0.92" />
        <path d="M72 130 C60 114 68 98 78 92 C78 102 86 102 88 92 C96 104 96 120 90 130Z" fill={KIN_LIGHT} />
        <path d="M258 132 C280 110 268 86 254 74 C256 90 244 92 244 78 C244 62 230 52 230 38 C216 56 222 76 216 88 C212 96 210 116 224 132Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.6" opacity="0.92" />
        <path d="M248 130 C260 114 252 98 242 92 C242 102 234 102 232 92 C224 104 224 120 230 130Z" fill={KIN_LIGHT} />
      </g>
      {/* 絵馬 */}
      <path d="M160 26 C150 8 170 8 160 26" fill="none" stroke={INK} strokeWidth="4.6" />
      <path d="M160 26 C150 8 170 8 160 26" fill="none" stroke={SHU_BRIGHT} strokeWidth="2.4" strokeDasharray="5 3" />
      <path d="M108 60 L160 28 L212 60 V128 H108Z" fill={WOOD_PALE} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M114 78 C140 72 180 82 206 76 M114 104 C140 98 180 110 206 102" fill="none" stroke="#c9a868" strokeWidth="1.3" opacity="0.8" />
      <path d="M102 62 L160 26 L218 62" fill="none" stroke={INK} strokeWidth="8.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M102 62 L160 26 L218 62" fill="none" stroke="#7a4a22" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <BigFish x={158} y={94} rot={-8} s={0.62} tone={TAI_TONE} />
      <circle cx="160" cy="42" r="3.4" fill={KIN} stroke={INK} strokeWidth="1.2" />
      <Sparkle x={196} y={72} s={0.9} c="#fff" />
      <Sparkle x={124} y={116} s={0.7} />
      <Sparkle x={36} y={40} s={1} />
      <Sparkle x={288} y={44} s={1.1} />
    </g>
  );
}

const RAIN = scatter(34, 11);

/** 嵐・台風・大雨 */
export function SceneStorm({ u, variant }: { u: string; variant?: string }) {
  const typhoon = variant === 'typhoon';
  const rainOnly = variant === 'rain';
  return (
    <g>
      <Bg u={u} tone="storm" />
      {typhoon ? (
        <g>
          <path d={spiralPath(160, 56, 2.4, 6, 172, 186)} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d={spiralPath(160, 56, 2.4, 6, 172, 186)} fill="none" stroke="#c9d3dc" strokeWidth="9.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={spiralPath(160, 56, 2.4, 6, 172, 186)} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          <circle cx="160" cy="54" r="5" fill="#3b4859" stroke={INK} strokeWidth="1.4" />
        </g>
      ) : (
        <g>
          <Puff x={70} y={30} s={1.5} c="#2c3644" />
          <Puff x={176} y={22} s={1.9} c="#263040" />
          <Puff x={270} y={34} s={1.4} c="#2c3644" />
          <Puff x={120} y={40} s={1.1} c="#3b4859" />
          <Puff x={226} y={44} s={1.05} c="#3b4859" />
        </g>
      )}
      {!typhoon && !rainOnly && (
        <g strokeLinejoin="round">
          <path d="M184 30 L150 76 L172 76 L142 118 L204 62 L180 62 L206 30Z" fill={KIN_PALE} stroke={INK} strokeWidth="1.8" />
          <path d="M92 44 L76 70 L88 70 L74 92 L104 62 L92 62 L104 44Z" fill={KIN_PALE} stroke={INK} strokeWidth="1.5" opacity="0.9" />
        </g>
      )}
      <g stroke="#dbe7f0" strokeLinecap="round" opacity="0.6">
        {RAIN.map((p, i) => {
          const x = p.x * 340 - 6;
          const y = (rainOnly ? 30 : 46) + p.y * 70;
          const len = 9 + p.k * 9;
          return <line key={i} x1={x} y1={y} x2={x - len * 0.42} y2={y + len} strokeWidth={rainOnly ? 2 : 1.4} />;
        })}
      </g>
      <Sea u={u} y={112} rough />
      <Boat x={typhoon ? 236 : 240} y={110} s={0.42} rot={typhoon ? 20 : -16} flag={false} />
      <path d={`${wavePath(128, 9, 36, -28)} L330 150 L-10 150Z`} fill={AI} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={wavePath(133, 7, 36, -28)} fill="none" stroke={WASHI} strokeWidth="1.5" opacity="0.7" />
      <g fill={WASHI} stroke={INK} strokeWidth="1">
        <circle cx="44" cy="106" r="3" /><circle cx="108" cy="102" r="2.6" /><circle cx="170" cy="106" r="3" /><circle cx="292" cy="104" r="2.6" />
      </g>
    </g>
  );
}

const STARS = scatter(16, 5);

/** 空: 日の出・夕焼け・虹・満月 */
export function SceneSky({ u, variant }: { u: string; variant?: string }) {
  if (variant === 'moon') {
    return (
      <g>
        <Bg u={u} tone="night" />
        {STARS.map((p, i) => <circle key={i} cx={p.x * 320} cy={p.y * 80 + 4} r={0.8 + p.k} fill={WASHI} opacity={0.5 + p.k * 0.5} />)}
        <circle cx="160" cy="62" r="78" fill={`url(#${u}glow)`} />
        <circle cx="160" cy="62" r="36" fill={KIN_PALE} stroke={INK} strokeWidth="1.6" />
        <circle cx="148" cy="52" r="8" fill={KIN_LIGHT} opacity="0.7" /><circle cx="172" cy="72" r="6" fill={KIN_LIGHT} opacity="0.6" /><circle cx="168" cy="46" r="3.6" fill={KIN_LIGHT} opacity="0.6" />
        <Kasumi x={70} y={66} c={AI_LIGHT} o={0.45} />
        <Kasumi x={262} y={40} c={AI_LIGHT} o={0.4} s={0.9} />
        <Sea u={u} y={110} />
        <g stroke={KIN_PALE} strokeLinecap="round" opacity="0.85">
          <path d="M140 120 h40" strokeWidth="2.6" /><path d="M132 128 h56" strokeWidth="2.6" /><path d="M144 136 h32" strokeWidth="2.4" /><path d="M136 144 h48" strokeWidth="2.2" />
        </g>
        <SmallFish x={70} y={122} rot={-30} s={0.5} c={AI_LIGHT} />
        <SmallFish x={250} y={128} rot={-24} s={0.56} c={AI_LIGHT} flip />
      </g>
    );
  }
  if (variant === 'rainbow') {
    const bands = [SHU_LIGHT, '#f0a04a', KIN_LIGHT, LEAF_LIGHT, AI_LIGHT, '#8f7cc0'];
    return (
      <g>
        <Bg u={u} tone="day" />
        {bands.map((c, i) => <path key={c} d={`M${52 + i * 9} 122 A${108 - i * 9} ${108 - i * 9} 0 0 1 ${268 - i * 9} 122`} fill="none" stroke={c} strokeWidth="9.6" />)}
        <path d="M47.5 122 A112.5 112.5 0 0 1 272.5 122 M102 122 A58 58 0 0 1 218 122" fill="none" stroke={INK} strokeWidth="1.5" />
        <Sea u={u} y={112} />
        <Puff x={56} y={108} s={1.15} />
        <Puff x={270} y={108} s={1.2} />
        <BigFish x={160} y={92} rot={-24} s={0.5} tone={FISH_TONES.legendary} />
        <Sparkle x={160} y={36} s={1.2} />
        <Sparkle x={104} y={62} s={0.7} c="#fff" />
        <Sparkle x={224} y={58} s={0.8} c="#fff" />
      </g>
    );
  }
  const sunset = variant === 'sunset';
  return (
    <g>
      <Bg u={u} tone={sunset ? 'dusk' : 'day'} />
      <Rays d={raysPath(160, 104, 22, 260, 0.5)} c={sunset ? KIN_PALE : KIN} o={sunset ? 0.3 : 0.3} />
      <circle cx="160" cy={sunset ? 100 : 96} r="40" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.8" />
      <circle cx="160" cy={sunset ? 100 : 96} r="33" fill="none" stroke={SHU_LIGHT} strokeWidth="2" opacity="0.7" />
      <Kasumi x={62} y={38} o={sunset ? 0.55 : 0.9} c={sunset ? KIN_PALE : WASHI} />
      <Kasumi x={254} y={56} s={0.9} o={sunset ? 0.55 : 0.9} c={sunset ? KIN_PALE : WASHI} />
      <g fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M84 70 q7 -8 12 0 q5 -8 12 0" /><path d="M222 38 q6 -7 10 0 q4 -7 10 0" /><path d="M250 80 q5 -6 8 0 q3 -6 8 0" />
      </g>
      <Sea u={u} y={108} />
      <g stroke={sunset ? KIN_PALE : KIN_LIGHT} strokeLinecap="round" opacity="0.9">
        <path d="M134 118 h52" strokeWidth="2.6" /><path d="M124 126 h72" strokeWidth="2.6" /><path d="M140 134 h40" strokeWidth="2.4" /><path d="M130 142 h60" strokeWidth="2.2" />
      </g>
      <Boat x={258} y={112} s={0.3} />
    </g>
  );
}

/** 進む・戻る: 波を切って走る漁船 */
export function SceneTravel({ u, variant }: { u: string; variant?: string }) {
  const back = variant === 'back' || variant === 'fog';
  const fog = variant === 'fog';
  return (
    <g>
      <Bg u={u} tone={back ? 'storm' : 'day'} />
      {back && <rect x="0" y="0" width="320" height="150" fill={WASHI2} opacity={fog ? 0.55 : 0.35} />}
      {!back && <circle cx="56" cy="34" r="17" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />}
      {!back && <Kasumi x={250} y={24} />}
      {!back && <Kasumi x={120} y={46} s={0.8} o={0.8} />}
      <Sea u={u} y={100} rough={back && !fog} />
      {back && !fog && (
        <g fill="none" strokeLinecap="round">
          <path d={spiralPath(238, 122, 2, 4, 40, 30)} stroke={INK} strokeWidth="5" opacity="0.8" />
          <path d={spiralPath(238, 122, 2, 4, 40, 30)} stroke={AI_LIGHT} strokeWidth="2.6" />
        </g>
      )}
      <Boat x={back ? 176 : 148} y={98} s={0.78} flip={back} rot={back ? 7 : -5} />
      {/* へさきのしぶきと、船のあとの白い航跡 */}
      {!back ? (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M200 106 C204 92 216 90 220 100 C226 92 238 96 236 106 C244 104 250 110 246 116 L198 114Z" fill={WASHI} stroke={INK} strokeWidth="1.3" />
          <g fill={WASHI} stroke={INK} strokeWidth="1"><circle cx="228" cy="86" r="2.6" /><circle cx="242" cy="92" r="2" /><circle cx="214" cy="84" r="2" /></g>
          <path d="M100 110 C84 104 66 106 50 114 M92 119 C72 114 50 118 30 126 M70 128 C54 126 38 130 22 136" fill="none" stroke={INK} strokeWidth="5.4" />
          <path d="M100 110 C84 104 66 106 50 114 M92 119 C72 114 50 118 30 126 M70 128 C54 126 38 130 22 136" fill="none" stroke={WASHI} strokeWidth="3" />
        </g>
      ) : (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M126 108 C122 94 110 92 106 102 C100 94 88 98 90 108 C82 106 76 112 80 118 L128 116Z" fill={WASHI} stroke={INK} strokeWidth="1.3" />
          <g fill={WASHI} stroke={INK} strokeWidth="1"><circle cx="98" cy="88" r="2.6" /><circle cx="84" cy="94" r="2" /></g>
        </g>
      )}
      <path d={`${wavePath(124, 6, 36, -22)} L330 150 L-10 150Z`} fill={AI} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" opacity="0.96" />
      <path d={wavePath(129, 5, 36, -22)} fill="none" stroke={WASHI} strokeWidth="1.5" opacity="0.7" />
      {fog && (
        <g>
          <Kasumi x={70} y={52} s={1.6} c={WASHI} o={0.88} />
          <Kasumi x={236} y={30} s={1.5} c={WASHI} o={0.85} />
          <Kasumi x={150} y={96} s={1.9} c={WASHI} o={0.8} />
          <Kasumi x={284} y={88} s={1.3} c={WASHI} o={0.85} />
        </g>
      )}
      {back ? <Chevrons x={74} y={60} dir={-1} c={SHU_LIGHT} s={1.1} /> : <Chevrons x={240} y={62} dir={1} c={KIN_LIGHT} s={1.1} />}
    </g>
  );
}

/** 休み: ふとんで寝こむ */
export function SceneRest() {
  return (
    <g>
      <rect x="0" y="0" width="320" height="150" fill="#e6dcc2" />
      {/* 障子の丸窓と月 */}
      <rect x="0" y="0" width="320" height="86" fill="#d9ccab" />
      <circle cx="246" cy="42" r="30" fill={AI} stroke={INK} strokeWidth="2" />
      <circle cx="254" cy="36" r="11" fill={KIN_PALE} />
      <path d="M216 42 H276 M246 12 V72" stroke={WOOD} strokeWidth="2.4" />
      <circle cx="246" cy="42" r="30" fill="none" stroke={WOOD} strokeWidth="4" />
      <circle cx="246" cy="42" r="32" fill="none" stroke={INK} strokeWidth="1.4" />
      {/* 畳 */}
      <rect x="0" y="86" width="320" height="64" fill="#c8b676" stroke={INK} strokeWidth="1.6" />
      <path d="M0 108 H320 M0 130 H320" stroke="#a8964f" strokeWidth="1.1" opacity="0.7" />
      <path d="M0 86 H320" stroke={AI} strokeWidth="5" />
      <path d="M150 86 L132 150" stroke={AI} strokeWidth="4" opacity="0.8" />
      {/* 立てかけた竿と道具箱 */}
      <path d="M36 92 L52 10" stroke={INK} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M36 92 L52 10" stroke="#c9b356" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="16" y="92" width="36" height="20" rx="3" fill={AI_MID} stroke={INK} strokeWidth="1.6" />
      <path d="M16 100 H52" stroke={INK} strokeWidth="1.2" />
      <rect x="30" y="97" width="8" height="6" fill={KIN} stroke={INK} strokeWidth="1" />
      {/* 敷きぶとん・まくら・顔 */}
      <rect x="66" y="108" width="216" height="26" rx="8" fill={WASHI} stroke={INK} strokeWidth="2" />
      <rect x="70" y="96" width="46" height="20" rx="8" fill={WASHI2} stroke={INK} strokeWidth="1.6" />
      <path d="M74 104 H112" stroke={SHU} strokeWidth="2" opacity="0.6" />
      <circle cx="104" cy="96" r="15" fill={SKIN} stroke={INK} strokeWidth="1.8" />
      <path d="M90 92 C92 80 110 76 118 88 C112 86 100 86 90 92Z" fill={INK} />
      <path d="M96 98 q3 3 6 0 M106 99 q3 3 6 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M100 105 q3 2 6 0" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="97" cy="103" rx="3.4" ry="2" fill={SHU_LIGHT} opacity="0.5" />
      {/* 氷のう */}
      <path d="M94 84 C92 74 104 70 110 78 C114 84 108 90 100 89Z" fill={AI_LIGHT} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M102 74 l2 -6 5 3 -3 5" fill={AI_LIGHT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {/* 掛けぶとん */}
      <path d="M118 104 C150 86 236 88 284 104 V128 C284 132 280 134 276 134 H118Z" fill={AI_MID} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M118 104 C150 86 236 88 284 104 V112 C236 96 150 96 118 112Z" fill={SHU} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {[[148, 116], [176, 110], [204, 118], [232, 110], [260, 118], [162, 126], [218, 126], [246, 124], [190, 124]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 4} l4 4 -4 4 -4 -4Z`} fill={KIN_LIGHT} opacity="0.85" />
      ))}
      {/* ぐうぐう */}
      <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
        <path d="M126 72 h9 l-9 10 h9" strokeWidth="2.2" /><path d="M146 50 h12 l-12 13 h12" strokeWidth="2.6" /><path d="M172 22 h16 l-16 17 h16" strokeWidth="3" />
      </g>
    </g>
  );
}

/** もう一度サイコロ: 追い風に乗るサイコロと、回る矢印 */
export function SceneDice({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={RAYS_MID} o={0.24} />
      {/* 風 */}
      <g fill="none" strokeLinecap="round">
        <path d="M-6 44 C50 30 96 54 130 38 C150 28 146 10 132 14 C122 17 126 30 134 28" stroke={INK} strokeWidth="5.6" />
        <path d="M-6 44 C50 30 96 54 130 38 C150 28 146 10 132 14 C122 17 126 30 134 28" stroke={AI_LIGHT} strokeWidth="3" />
        <path d="M-6 116 C40 104 70 124 100 112 C116 104 112 90 102 93" stroke={INK} strokeWidth="5" />
        <path d="M-6 116 C40 104 70 124 100 112 C116 104 112 90 102 93" stroke={AI_LIGHT} strokeWidth="2.6" />
        <path d="M218 128 C250 118 280 134 326 122" stroke={INK} strokeWidth="5" />
        <path d="M218 128 C250 118 280 134 326 122" stroke={AI_LIGHT} strokeWidth="2.6" />
      </g>
      {/* 回る矢印 */}
      <g fill="none" strokeLinecap="round">
        <path d="M222 62 A62 50 0 1 0 208 116" stroke={INK} strokeWidth="11" />
        <path d="M222 62 A62 50 0 1 0 208 116" stroke={KIN} strokeWidth="6.6" />
      </g>
      <path d="M196 96 L232 110 L204 136Z" fill={KIN} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* サイコロ */}
      <ellipse cx="162" cy="126" rx="44" ry="7" fill={INK} opacity="0.18" />
      <g strokeLinejoin="round" stroke={INK} strokeWidth="2.2">
        <path d="M160 34 L204 56 L160 78 L116 56Z" fill={WASHI} />
        <path d="M116 56 L160 78 V124 L116 102Z" fill={WASHI2} />
        <path d="M204 56 L160 78 V124 L204 102Z" fill={WASHI3} />
      </g>
      <ellipse cx="160" cy="56" rx="13" ry="6.6" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.2" />
      <g fill={INK}>
        <ellipse cx="128" cy="74" rx="4" ry="5" transform="rotate(26 128 74)" /><ellipse cx="148" cy="106" rx="4" ry="5" transform="rotate(26 148 106)" /><ellipse cx="138" cy="90" rx="4" ry="5" transform="rotate(26 138 90)" />
        <ellipse cx="172" cy="84" rx="4" ry="5" transform="rotate(-26 172 84)" /><ellipse cx="192" cy="96" rx="4" ry="5" transform="rotate(-26 192 96)" />
      </g>
      <path d="M120 58 L158 77" stroke="#fff" strokeWidth="1.6" opacity="0.7" />
      <Sparkle x={254} y={34} s={1.2} />
      <Sparkle x={72} y={78} s={0.9} c="#fff" />
      <Sparkle x={282} y={86} s={0.7} c="#fff" />
    </g>
  );
}

/** 神社: 朱の鳥居としめ縄 */
export function SceneShrine({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="day" />
      <Rays d={raysPath(160, 70, 20, 260, 0.5)} o={0.26} />
      <Hills y={92} />
      <Pine x={44} y={126} s={1.25} />
      <Pine x={284} y={130} s={1.4} />
      {/* 石段 */}
      <g fill={WASHI3} stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M112 150 L122 132 H198 L208 150Z" /><path d="M122 132 L128 120 H192 L198 132Z" />
      </g>
      {/* 鳥居 */}
      <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
        <path d="M110 122 L116 46 H126 L124 122Z" fill={SHU_BRIGHT} />
        <path d="M196 122 L194 46 H204 L210 122Z" fill={SHU_BRIGHT} />
        <rect x="106" y="118" width="22" height="8" rx="1.5" fill={INK} />
        <rect x="192" y="118" width="22" height="8" rx="1.5" fill={INK} />
        <rect x="98" y="54" width="124" height="9" fill={SHU_BRIGHT} />
        <path d="M84 30 C120 40 200 40 236 30 L232 44 C200 50 120 50 88 44Z" fill={SHU_BRIGHT} />
        <path d="M82 24 C120 34 200 34 238 24 L236 30 C200 40 120 40 84 30Z" fill={INK} />
        <rect x="152" y="40" width="16" height="16" fill={KIN} />
      </g>
      {/* しめ縄と紙垂 */}
      <path d="M118 70 Q160 88 202 70" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M118 70 Q160 88 202 70" fill="none" stroke={KIN_LIGHT} strokeWidth="4" strokeLinecap="round" />
      <path d="M124 72 l3 3 M134 75 l3 3 M146 78 l3 3 M158 79 l3 3 M170 78 l3 -1 M182 76 l3 -2 M192 73 l3 -2" stroke={KIN_DEEP} strokeWidth="1.3" />
      {[138, 160, 182].map(x => {
        const y = x === 160 ? 82 : 79;
        return (
          <g key={x} fill={WASHI} stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
            <rect x={x - 5} y={y} width="6" height="8" /><rect x={x - 1} y={y + 7} width="6" height="8" /><rect x={x + 3} y={y + 14} width="6" height="8" />
          </g>
        );
      })}
      <Kasumi x={254} y={18} o={0.85} />
      <Kasumi x={62} y={32} s={0.8} o={0.8} />
      <Sparkle x={160} y={14} s={0.9} />
    </g>
  );
}

/** 福引き・宝くじ: 紅白幕とガラポン、当たりの金の玉 */
export function SceneLottery({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={raysPath(118, 124, 18, 260, 0.5)} o={0.24} />
      {/* 紅白幕 */}
      <g stroke={INK} strokeWidth="1.2">
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 32} y="0" width="32" height="26" fill={i % 2 ? WASHI : SHU_BRIGHT} />)}
      </g>
      <path d="M0 26 q16 12 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0" fill="none" stroke={INK} strokeWidth="1.4" />
      <path d="M0 5 H320" stroke={KIN} strokeWidth="3.4" />
      {/* 台と脚 */}
      <rect x="40" y="130" width="240" height="20" fill={SHU} stroke={INK} strokeWidth="1.8" />
      <path d="M40 136 H280" stroke={KIN_LIGHT} strokeWidth="1.4" />
      <g stroke={INK} strokeWidth="2" strokeLinejoin="round" fill={WOOD}>
        <path d="M150 84 L132 130 H144 L162 88Z" /><path d="M190 84 L208 130 H196 L178 88Z" />
      </g>
      {/* ガラポン（八角の箱） */}
      <path d="M152 42 H188 L214 68 V104 L188 130 H152 L126 104 V68Z" fill={WOOD_LIGHT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" transform="translate(0 -4)" />
      <path d="M152 38 L188 126 M188 38 L152 126 M126 64 L214 100 M214 64 L126 100" stroke={WOOD} strokeWidth="1.5" opacity="0.7" />
      <circle cx="170" cy="82" r="22" fill={WOOD_PALE} stroke={INK} strokeWidth="1.6" />
      <circle cx="170" cy="82" r="6" fill={KIN} stroke={INK} strokeWidth="1.5" />
      <path d="M170 82 L212 52" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M170 82 L212 52" stroke={STONE} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="214" cy="50" r="8" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.8" />
      <circle cx="211.6" cy="47.6" r="2.2" fill="#fff" opacity="0.7" />
      {/* 出口と、転がり出る玉 */}
      <path d="M132 104 L116 116 L122 122 L138 110Z" fill={WOOD} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M76 126 H128 L122 132 H82Z" fill={WASHI} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="90" cy="121" r="5.6" fill={WASHI} stroke={INK} strokeWidth="1.4" />
      <circle cx="116" cy="121.6" r="5.2" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />
      <circle cx="104" cy="106" r="20" fill={`url(#${u}glow)`} />
      <circle cx="104" cy="108" r="8" fill={KIN} stroke={INK} strokeWidth="1.8" />
      <circle cx="101.4" cy="105.4" r="2.6" fill="#fff" opacity="0.8" />
      <Sparkle x={86} y={92} s={1} c="#fff" />
      <Sparkle x={124} y={90} s={0.7} />
      {/* 当たりの鐘 */}
      <g transform="translate(262 82) rotate(-18)" strokeLinejoin="round">
        <path d="M0 -30 V-22" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M0 -30 V-22" stroke={WOOD} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M-16 8 C-14 -8 -10 -22 0 -22 C10 -22 14 -8 16 8Z" fill={KIN} stroke={INK} strokeWidth="2" />
        <path d="M-20 8 H20 V13 H-20Z" fill={KIN_DARK} stroke={INK} strokeWidth="1.6" />
        <circle cx="0" cy="17" r="4" fill={KIN_DARK} stroke={INK} strokeWidth="1.4" />
        <path d="M-8 -10 C-6 -16 -3 -18 0 -18" fill="none" stroke="#fff" strokeWidth="1.8" opacity="0.7" strokeLinecap="round" />
      </g>
      <path d="M236 62 q-8 6 -6 16 M290 58 q10 6 8 18 M244 110 q-10 2 -14 -6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}
