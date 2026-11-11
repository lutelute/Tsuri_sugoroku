// 札の絵係: 札の絵（その2）— 動物（鳥・猿・熊・イノシシ・イルカ・ウミガメ）と、まちの出来事（大鯰・大王イカ・火事・景気・家・選挙）。
import {
  INK, WASHI, WASHI2, WASHI3, KIN, KIN_LIGHT, KIN_PALE, KIN_DARK, SHU, SHU_LIGHT, SHU_BRIGHT, SHU_DARK,
  AI, AI_DEEP, AI_MID, AI_LIGHT, LEAF, LEAF_LIGHT, LEAF_DARK, WOOD, WOOD_LIGHT, WOOD_PALE, STONE, STONE_DARK,
  raysPath, burstPath, wavePath, scatter,
} from './artBase';
import { Bg, Sparkle, Koban, Kasumi, Puff, Sea, Hills, Pine, Chevrons, SmallFish, Splash, Boat, House, Flame, Rays } from './artKit';
import { GearShapes } from '../shop/GearArt';

const FUR = '#a8713e';
const FUR_DARK = '#7d4f28';
const FACE = '#f0b59a';

/** 鳥: カラス（魚をくわえる・荷物をあさる）／カモメ */
export function SceneBird({ u, variant }: { u: string; variant?: string }) {
  const gull = variant === 'gull';
  const body = gull ? WASHI : '#2a2a34';
  const wing = gull ? '#b9c3cc' : '#1c1c24';
  const beak = gull ? KIN : '#4a4650';
  return (
    <g>
      <Bg u={u} tone="day" />
      <Kasumi x={58} y={24} />
      <Kasumi x={262} y={96} s={0.9} o={0.85} />
      <Kasumi x={236} y={20} s={0.7} o={0.7} />
      {/* 遠くの仲間 */}
      <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 74 q8 -9 14 0 q6 -9 14 0" /><path d="M268 50 q7 -8 12 0 q5 -8 12 0" /><path d="M286 74 q5 -6 9 0 q4 -6 9 0" />
      </g>
      <Sea u={u} y={126} />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 奥の翼 */}
        <path d="M156 62 C150 34 170 10 204 2 C198 18 200 34 192 46 C206 40 216 38 226 40 C214 50 200 62 184 68Z" fill={wing} stroke={INK} strokeWidth="2" />
        {/* 尾 */}
        <path d="M206 78 L246 70 L240 82 L250 92 L212 90Z" fill={wing} stroke={INK} strokeWidth="2" />
        {/* 体と頭 */}
        <path d="M108 72 C108 56 124 50 136 56 C150 52 176 56 196 66 C210 72 216 82 214 90 C196 96 170 98 150 94 C132 92 114 88 108 72Z" fill={body} stroke={INK} strokeWidth="2.2" />
        {gull && <path d="M150 94 C170 98 196 96 214 90 C212 84 206 78 198 74 C184 84 166 90 150 94Z" fill="#dfe5ea" />}
        <circle cx="120" cy="68" r="15" fill={body} stroke={INK} strokeWidth="2.2" />
        <path d="M131 58 C138 56 146 56 152 58 L150 80 C142 84 134 82 130 78Z" fill={body} />
        {!gull && <path d="M124 60 C140 54 170 58 192 68" fill="none" stroke="#5a6a8c" strokeWidth="2" opacity="0.8" />}
        {/* くちばし */}
        <path d="M110 66 L82 72 L108 80Z" fill={beak} stroke={INK} strokeWidth="1.8" />
        <path d="M84 72 L108 73" stroke={INK} strokeWidth="1.1" />
        {gull && <circle cx="92" cy="74" r="2" fill={SHU} />}
        {/* 目 */}
        <circle cx="122" cy="66" r="4" fill={gull ? '#fff' : KIN_PALE} stroke={INK} strokeWidth="1.2" />
        <circle cx="121.4" cy="66" r="1.9" fill={INK} />
        <path d="M116 60 L128 62" stroke={INK} strokeWidth="1.8" />
        {/* 手前の翼 */}
        <path d="M142 70 C120 46 124 16 150 -2 C150 16 158 30 164 40 C172 28 184 20 198 18 C190 34 184 54 176 74Z" fill={wing} stroke={INK} strokeWidth="2.2" />
        <path d="M150 12 C152 30 160 44 168 56 M176 30 C172 42 172 54 172 64" fill="none" stroke={gull ? '#8b96a2' : '#4a4a5c'} strokeWidth="1.4" />
        {gull && <path d="M150 -2 C150 8 152 14 154 20 L144 12Z M198 18 C194 26 191 32 189 38 L186 26Z" fill="#2a2a34" stroke={INK} strokeWidth="1.2" />}
        {/* 足 */}
        <path d="M160 95 l-4 12 M176 95 l2 12" stroke={INK} strokeWidth="4" />
        <path d="M160 95 l-4 12 M176 95 l2 12" stroke={gull ? KIN : '#4a4650'} strokeWidth="2" />
      </g>
      {/* くわえた物 */}
      {variant === 'crow_fish' && <SmallFish x={78} y={90} rot={72} s={0.82} c="#e86a52" />}
      {variant === 'crow' && (
        <g strokeLinejoin="round">
          <path d="M84 76 C70 80 64 98 72 110 C82 116 98 112 100 100 C102 90 94 80 84 76Z" fill={AI_MID} stroke={INK} strokeWidth="1.8" />
          <path d="M80 80 C84 76 90 78 92 82" fill="none" stroke={KIN} strokeWidth="2.4" />
          <Koban x={62} y={124} r={-40} s={0.5} />
          <Koban x={96} y={128} r={30} s={0.45} />
        </g>
      )}
      {gull && <g transform="translate(88 104) rotate(60) scale(0.62) translate(-32 -32)"><GearShapes type="lure" level={2} /></g>}
      <path d="M56 50 L44 40 M70 42 L64 28 M46 64 L32 62" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** 猿: ルアーを持ってにんまり */
export function SceneMonkey({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="day" />
      <Hills y={90} />
      <Pine x={270} y={126} s={1.5} />
      {/* ひっくり返った道具箱 */}
      <g strokeLinejoin="round" transform="translate(72 130) rotate(-14)">
        <rect x="-26" y="-18" width="52" height="20" rx="3" fill={AI_MID} stroke={INK} strokeWidth="1.8" />
        <path d="M-26 -18 L-34 -36 L18 -36 L26 -18Z" fill={AI} stroke={INK} strokeWidth="1.8" />
        <rect x="-5" y="-13" width="10" height="7" fill={KIN} stroke={INK} strokeWidth="1.1" />
      </g>
      <g transform="translate(34 132) rotate(-30) scale(0.42) translate(-32 -32)"><GearShapes type="lure" level={4} /></g>
      <g transform="translate(118 138) rotate(40) scale(0.4) translate(-32 -32)"><GearShapes type="lure" level={3} /></g>
      <ellipse cx="170" cy="140" rx="52" ry="6" fill={INK} opacity="0.2" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* しっぽ */}
        <path d="M198 124 C226 128 236 100 218 96" fill="none" stroke={INK} strokeWidth="9.4" />
        <path d="M198 124 C226 128 236 100 218 96" fill="none" stroke={FUR} strokeWidth="6" />
        {/* 体 */}
        <path d="M138 138 C130 110 144 86 170 86 C196 86 210 110 202 138Z" fill={FUR} stroke={INK} strokeWidth="2.2" />
        <ellipse cx="170" cy="118" rx="18" ry="19" fill="#e2c096" />
        {/* 足 */}
        <ellipse cx="146" cy="138" rx="15" ry="7.6" fill={FACE} stroke={INK} strokeWidth="1.8" />
        <ellipse cx="194" cy="138" rx="15" ry="7.6" fill={FACE} stroke={INK} strokeWidth="1.8" />
        {/* 下ろした腕 */}
        <path d="M146 100 C128 108 126 122 136 128" fill="none" stroke={INK} strokeWidth="13.4" />
        <path d="M146 100 C128 108 126 122 136 128" fill="none" stroke={FUR} strokeWidth="10" />
        <circle cx="138" cy="128" r="6.4" fill={FACE} stroke={INK} strokeWidth="1.6" />
        {/* 上げた腕とルアー */}
        <path d="M192 98 C212 88 220 68 216 50" fill="none" stroke={INK} strokeWidth="13.4" />
        <path d="M192 98 C212 88 220 68 216 50" fill="none" stroke={FUR} strokeWidth="10" />
        <circle cx="216" cy="48" r="7.4" fill={FACE} stroke={INK} strokeWidth="1.6" />
      </g>
      <g transform="translate(232 28) rotate(24) scale(0.66) translate(-32 -32)"><GearShapes type="lure" level={5} /></g>
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 耳・頭・顔 */}
        <circle cx="142" cy="60" r="9" fill={FACE} stroke={INK} strokeWidth="1.8" />
        <circle cx="198" cy="60" r="9" fill={FACE} stroke={INK} strokeWidth="1.8" />
        <circle cx="170" cy="58" r="28" fill={FUR} stroke={INK} strokeWidth="2.2" />
        <path d="M170 44 C160 34 144 42 148 60 C150 76 160 84 170 84 C180 84 190 76 192 60 C196 42 180 34 170 44Z" fill={FACE} stroke={INK} strokeWidth="1.5" />
        <path d="M152 58 q5 -6 10 0 M178 58 q5 -6 10 0" fill="none" stroke={INK} strokeWidth="2.2" />
        <path d="M166 66 h2 M172 66 h2" stroke={INK} strokeWidth="2" />
        <path d="M158 72 Q170 82 182 72" fill="none" stroke={INK} strokeWidth="2" />
        <path d="M160 74 Q170 80 180 74" fill={WASHI} stroke={INK} strokeWidth="1" />
        <ellipse cx="153" cy="68" rx="4.4" ry="2.8" fill={SHU_LIGHT} opacity="0.55" />
        <ellipse cx="187" cy="68" rx="4.4" ry="2.8" fill={SHU_LIGHT} opacity="0.55" />
        <path d="M158 34 C164 28 176 28 182 34" fill="none" stroke={FUR_DARK} strokeWidth="2" />
      </g>
      <Sparkle x={258} y={18} s={0.9} />
      <path d="M100 56 L88 46 M112 44 L106 30 M94 72 L80 70" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** 熊: やぶから立ち上がる */
export function SceneBear({ u }: { u: string }) {
  const fur = '#3b2c24';
  const furLight = '#5a4638';
  const tan = '#c9a57a';
  return (
    <g>
      <Bg u={u} tone="day" />
      <Hills y={84} far="#9ccb80" near={LEAF} />
      <Pine x={40} y={118} s={1.3} />
      <Pine x={290} y={112} s={1.1} />
      {/* 放り出した竿 */}
      <g strokeLinecap="round" transform="rotate(-8 262 60)">
        <path d="M232 96 L292 26" stroke={INK} strokeWidth="6" /><path d="M232 96 L292 26" stroke="#c9b356" strokeWidth="3.2" />
        <path d="M232 96 L246 80" stroke={INK} strokeWidth="9" /><path d="M232 96 L246 80" stroke="#cfa26a" strokeWidth="6" />
      </g>
      <path d="M252 30 L262 20 M238 44 L226 36 M276 76 L290 80" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 体 */}
        <path d="M112 150 C106 104 130 82 160 82 C190 82 214 104 208 150Z" fill={fur} stroke={INK} strokeWidth="2.2" />
        <path d="M136 100 Q160 126 184 100 Q160 114 136 100Z" fill={WASHI} stroke={INK} strokeWidth="1.2" />
        {/* 上げた腕 */}
        <path d="M124 104 C98 92 92 66 100 46" fill="none" stroke={INK} strokeWidth="23" />
        <path d="M124 104 C98 92 92 66 100 46" fill="none" stroke={fur} strokeWidth="19" />
        <path d="M196 104 C222 92 228 66 220 46" fill="none" stroke={INK} strokeWidth="23" />
        <path d="M196 104 C222 92 228 66 220 46" fill="none" stroke={fur} strokeWidth="19" />
        <circle cx="100" cy="42" r="12.4" fill={furLight} stroke={INK} strokeWidth="2" />
        <circle cx="220" cy="42" r="12.4" fill={furLight} stroke={INK} strokeWidth="2" />
        <path d="M92 34 L90 26 M100 31 L100 22 M108 34 L111 26 M212 34 L209 26 M220 31 L220 22 M228 34 L230 26" stroke={WASHI} strokeWidth="2.6" />
        {/* 耳・頭 */}
        <circle cx="136" cy="34" r="11" fill={fur} stroke={INK} strokeWidth="2" /><circle cx="136" cy="35" r="5" fill={tan} />
        <circle cx="184" cy="34" r="11" fill={fur} stroke={INK} strokeWidth="2" /><circle cx="184" cy="35" r="5" fill={tan} />
        <circle cx="160" cy="56" r="30" fill={fur} stroke={INK} strokeWidth="2.2" />
        <path d="M136 46 C142 36 152 32 160 32" fill="none" stroke={furLight} strokeWidth="2.4" />
        {/* 顔 */}
        <ellipse cx="160" cy="68" rx="15" ry="12.4" fill={tan} stroke={INK} strokeWidth="1.5" />
        <ellipse cx="160" cy="61" rx="6" ry="4" fill={INK} />
        <path d="M150 69 Q160 86 170 69Z" fill={SHU_DARK} stroke={INK} strokeWidth="1.5" />
        <path d="M153 70 l2.4 4 2.2 -4 M162.6 70 l2.2 4 2.4 -4" fill={WASHI} stroke={INK} strokeWidth="0.8" />
        <circle cx="147" cy="50" r="4" fill={WASHI} stroke={INK} strokeWidth="1.2" /><circle cx="147.6" cy="50.6" r="2" fill={INK} />
        <circle cx="173" cy="50" r="4" fill={WASHI} stroke={INK} strokeWidth="1.2" /><circle cx="172.4" cy="50.6" r="2" fill={INK} />
        <path d="M139 43 L152 47 M181 43 L168 47" stroke={INK} strokeWidth="2.6" />
      </g>
      {/* 手前のやぶ */}
      <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M-10 150 V132 C0 120 14 122 22 130 C28 116 46 114 54 126 C62 114 82 116 86 130 C96 120 112 124 114 136 C124 128 136 132 138 142 V150Z" fill={LEAF_DARK} />
        <path d="M182 150 V142 C186 130 200 128 206 136 C212 122 230 120 238 132 C246 120 266 122 270 134 C280 124 298 126 302 138 C312 130 326 134 330 142 V150Z" fill={LEAF_DARK} />
        <path d="M96 150 C100 136 116 134 124 142 C132 132 150 132 156 142 C164 134 180 136 186 146 L188 150Z" fill={LEAF} />
      </g>
    </g>
  );
}

/** イノシシ: 土けむりを上げて突進 */
export function SceneBoar({ u }: { u: string }) {
  const hide = '#6e4c34';
  const hideDark = '#4a3222';
  return (
    <g>
      <Bg u={u} tone="day" />
      <Hills y={92} />
      <Pine x={30} y={122} s={1.1} />
      <ellipse cx="172" cy="138" rx="78" ry="7" fill={INK} opacity="0.2" />
      {/* 土けむりと、はやさの線 */}
      <Puff x={54} y={120} s={0.9} c={WASHI2} />
      <Puff x={22} y={102} s={0.6} c={WASHI2} />
      <Puff x={92} y={134} s={0.5} c={WASHI2} />
      <path d="M22 70 H74 M8 84 H58 M30 56 H66" stroke={INK} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* しっぽ */}
        <path d="M100 80 C88 74 86 62 96 60" fill="none" stroke={INK} strokeWidth="5.4" /><path d="M100 80 C88 74 86 62 96 60" fill="none" stroke={hide} strokeWidth="2.6" />
        {/* 奥の脚 */}
        <path d="M130 116 L112 136 M196 118 L212 136" stroke={INK} strokeWidth="11" /><path d="M130 116 L112 136 M196 118 L212 136" stroke={hideDark} strokeWidth="7.4" />
        {/* 体 */}
        <path d="M96 92 C94 66 124 52 160 54 C190 54 214 62 232 76 C250 80 266 92 268 102 C262 114 242 118 222 116 C204 126 150 130 122 122 C104 116 96 106 96 92Z" fill={hide} stroke={INK} strokeWidth="2.4" />
        <path d="M104 96 C104 78 124 64 152 62" fill="none" stroke="#8a6448" strokeWidth="3" opacity="0.8" />
        {/* たてがみ */}
        <path d="M116 62 l4 -10 5 9 5 -11 5 10 6 -11 5 10 6 -10 5 10 6 -9 4 9 6 -7 3 8" fill={hideDark} stroke={INK} strokeWidth="1.6" />
        {/* 手前の脚 */}
        <path d="M148 120 L138 140 M214 114 L232 132" stroke={INK} strokeWidth="12" /><path d="M148 120 L138 140 M214 114 L232 132" stroke={hide} strokeWidth="8.4" />
        <path d="M134 138 h10 M228 131 l8 4 M108 135 h9 M209 135 l8 3" stroke={INK} strokeWidth="5" />
        {/* 耳 */}
        <path d="M214 70 L212 50 L230 66Z" fill={hideDark} stroke={INK} strokeWidth="1.8" />
        {/* 鼻 */}
        <ellipse cx="268" cy="101" rx="6.4" ry="9" fill="#dba392" stroke={INK} strokeWidth="1.8" />
        <path d="M267 97 v2 M267 103 v2" stroke={INK} strokeWidth="2" />
        {/* きば */}
        <path d="M244 112 C246 104 252 100 256 98 C254 106 252 112 248 116Z" fill={WASHI} stroke={INK} strokeWidth="1.4" />
        {/* 目 */}
        <circle cx="238" cy="86" r="3.6" fill={WASHI} stroke={INK} strokeWidth="1.2" /><circle cx="239" cy="86.4" r="1.8" fill={INK} />
        <path d="M229 80 L246 82" stroke={INK} strokeWidth="2.8" />
        <path d="M278 88 l10 -4 M280 102 h11 M277 116 l10 5" stroke={INK} strokeWidth="2.2" opacity="0.7" />
      </g>
      {/* 落とした道具 */}
      <g transform="translate(290 128) rotate(24) scale(0.52) translate(-32 -32)"><GearShapes type="reel" level={3} /></g>
      <path d="M262 52 L272 40 M284 62 L298 56 M246 44 L246 30" stroke={SHU_DARK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** イルカ: 波の上を跳ねて道案内 */
export function SceneDolphin({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="day" />
      <circle cx="54" cy="32" r="17" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />
      <Kasumi x={236} y={20} />
      <Kasumi x={130} y={34} s={0.75} o={0.8} />
      <path d="M40 116 C70 30 190 10 262 96" fill="none" stroke={WASHI} strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" opacity="0.9" />
      <Sea u={u} y={106} />
      <Splash x={62} y={110} s={0.8} />
      <g transform="translate(160 56) rotate(-12)" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-62 14 L-88 -2 C-82 8 -82 18 -92 30 C-80 28 -70 24 -62 20Z" fill="#587fa6" stroke={INK} strokeWidth="2" />
        <path d="M-10 -22 C-6 -42 8 -48 20 -46 C12 -38 14 -28 18 -20Z" fill="#587fa6" stroke={INK} strokeWidth="2" />
        <path d="M-64 16 C-44 -14 -4 -28 34 -18 C50 -14 60 -8 68 -6 C76 -6 82 -4 86 -1 C82 3 76 6 68 6 C56 12 40 16 30 18 C-2 28 -40 28 -64 16Z" fill="#6f95ba" stroke={INK} strokeWidth="2.2" />
        <path d="M-58 16 C-36 26 -2 26 30 18 C42 15 56 11 68 6 C60 4 50 4 42 6 C12 16 -30 20 -58 16Z" fill={WASHI} />
        <path d="M-64 16 C-44 -14 -4 -28 34 -18 C50 -14 60 -8 68 -6 C76 -6 82 -4 86 -1 C82 3 76 6 68 6 C56 12 40 16 30 18 C-2 28 -40 28 -64 16Z" fill="none" stroke={INK} strokeWidth="2.2" />
        <path d="M14 14 C18 28 10 38 0 40 C4 32 2 24 4 16Z" fill="#587fa6" stroke={INK} strokeWidth="1.8" />
        <circle cx="50" cy="-6" r="2.8" fill={INK} /><circle cx="50.8" cy="-6.8" r="0.9" fill="#fff" />
        <path d="M62 3 q8 2 16 -2" fill="none" stroke={INK} strokeWidth="1.6" />
        <path d="M-40 -6 C-20 -18 10 -22 34 -15" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
      </g>
      <Splash x={266} y={112} s={0.62} />
      <SmallFish x={292} y={86} rot={-30} s={0.5} c={KIN_LIGHT} flip />
      <SmallFish x={270} y={66} rot={-40} s={0.42} c="#9fb9cc" flip />
      <Chevrons x={270} y={30} c={KIN_LIGHT} s={0.8} />
      <Sparkle x={110} y={24} s={0.8} c="#fff" />
    </g>
  );
}

/** ウミガメ: 浅い海をゆったり泳ぐ */
export function SceneTurtle({ u }: { u: string }) {
  const shell = '#6b8f4e';
  const skin = '#a7c97d';
  return (
    <g>
      <Bg u={u} tone="shoal" />
      <g fill="#fff" opacity="0.16">
        <path d="M40 0 L0 150 H50 L84 0Z" /><path d="M150 0 L130 150 H196 L190 0Z" /><path d="M250 0 L276 150 H330 L290 0Z" />
      </g>
      <path d="M-10 136 C40 124 90 134 140 130 C200 124 260 136 330 128 V150 H-10Z" fill={WASHI3} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
      <g fill="none" strokeLinecap="round">
        <path d="M30 140 C24 122 40 112 32 96" stroke={INK} strokeWidth="8" /><path d="M30 140 C24 122 40 112 32 96" stroke={SHU_LIGHT} strokeWidth="5" />
        <path d="M288 138 C296 120 280 110 290 92" stroke={INK} strokeWidth="8" /><path d="M288 138 C296 120 280 110 290 92" stroke={LEAF} strokeWidth="5" />
      </g>
      <g transform="translate(160 76) rotate(-8)" strokeLinejoin="round" strokeLinecap="round">
        {/* 後ろびれ */}
        <path d="M-42 12 C-62 14 -72 26 -70 36 C-58 34 -46 28 -36 22Z" fill={skin} stroke={INK} strokeWidth="2" />
        <path d="M-44 -8 C-60 -14 -72 -10 -76 -2 C-64 0 -52 2 -42 2Z" fill={skin} stroke={INK} strokeWidth="2" />
        {/* 前びれ */}
        <path d="M22 -24 C30 -48 54 -60 76 -56 C66 -46 56 -34 44 -18Z" fill={skin} stroke={INK} strokeWidth="2.2" />
        <path d="M24 22 C36 40 34 56 24 66 C18 54 12 40 8 26Z" fill={skin} stroke={INK} strokeWidth="2.2" />
        <path d="M40 -40 l6 4 M52 -48 l5 5 M22 40 l6 -2 M24 52 l5 -3" stroke={LEAF_DARK} strokeWidth="1.6" />
        {/* 頭 */}
        <path d="M42 -12 C58 -18 76 -12 78 0 C76 10 60 14 44 8Z" fill={skin} stroke={INK} strokeWidth="2.2" />
        <circle cx="64" cy="-3" r="3.4" fill={WASHI} stroke={INK} strokeWidth="1.1" /><circle cx="64.6" cy="-3" r="1.7" fill={INK} />
        <path d="M70 5 q4 0 6 -3" fill="none" stroke={INK} strokeWidth="1.4" />
        {/* こうら */}
        <ellipse cx="0" cy="0" rx="50" ry="34" fill={shell} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="0" cy="0" rx="42" ry="27" fill="none" stroke={LEAF_DARK} strokeWidth="1.6" />
        <path d="M-12 -14 L12 -14 L22 0 L12 14 L-12 14 L-22 0Z" fill="#84a964" stroke={LEAF_DARK} strokeWidth="1.8" />
        <path d="M-12 -14 L-18 -25 M12 -14 L18 -25 M22 0 L41 0 M12 14 L18 25 M-12 14 L-18 25 M-22 0 L-41 0" stroke={LEAF_DARK} strokeWidth="1.8" />
        <path d="M-30 -18 C-16 -28 10 -30 28 -22" fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" />
      </g>
      <g fill="none" stroke={WASHI} strokeWidth="1.4" opacity="0.8">
        <circle cx="256" cy="50" r="4" /><circle cx="266" cy="34" r="3" /><circle cx="262" cy="20" r="2.2" /><circle cx="70" cy="60" r="3" /><circle cx="64" cy="44" r="2.2" />
      </g>
      <SmallFish x={70} y={104} s={0.5} c={KIN_LIGHT} flip />
      <SmallFish x={96} y={116} s={0.42} c={KIN_LIGHT} flip />
      <SmallFish x={262} y={104} s={0.46} c={SHU_LIGHT} />
      <Sparkle x={236} y={26} s={0.8} c="#fff" />
    </g>
  );
}

// ===== まちの出来事 =====

/** 地震: 地下で身をよじる大鯰 */
export function SceneNamazu({ u }: { u: string }) {
  const skin = '#46525f';
  const belly = '#d8ccb0';
  return (
    <g>
      <Bg u={u} tone="day" />
      <Kasumi x={250} y={10} s={0.8} o={0.8} />
      {/* 地面と地下 */}
      <rect x="0" y="48" width="320" height="102" fill="#8a6a48" />
      <path d="M0 48 H320" stroke={INK} strokeWidth="2" />
      <rect x="0" y="48" width="320" height="8" fill={LEAF} stroke={INK} strokeWidth="1.5" />
      <path d="M0 78 C40 70 90 86 140 76 C200 66 260 84 320 74 M0 122 C50 114 110 130 170 120 C220 112 270 126 320 118" fill="none" stroke="#6b4e30" strokeWidth="1.6" opacity="0.7" />
      {/* 揺れる家 */}
      <House x={58} y={48} rot={-9} roof={AI} />
      <House x={128} y={48} rot={7} roof={SHU} s={1.1} />
      <House x={206} y={48} rot={-6} roof={AI_MID} />
      <House x={266} y={48} rot={10} roof={AI} s={0.9} />
      <g stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M28 20 q-6 6 0 12 M90 16 q6 6 0 12 M166 18 q-6 6 0 12 M236 14 q6 6 0 12 M298 22 q6 6 0 12" />
      </g>
      {/* 地割れ */}
      <path d="M96 48 L102 66 L92 78 L104 92 M176 48 L170 64 L182 74 L174 88 M240 48 L246 62 L236 72" fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* 大鯰 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M252 104 C268 88 276 74 296 68 C292 82 300 92 310 98 C296 100 286 112 268 122Z" fill={skin} stroke={INK} strokeWidth="2.2" />
        <path d="M30 112 C28 86 66 74 104 82 C144 90 176 116 216 108 C236 104 250 96 262 104 C270 112 266 124 252 130 C214 146 178 132 140 128 C110 124 88 142 60 138 C40 134 30 126 30 112Z" fill={skin} stroke={INK} strokeWidth="2.4" />
        <path d="M36 122 C50 136 80 134 108 124 C140 114 176 128 214 128 C234 128 250 124 260 116 C256 128 236 138 210 138 C180 138 150 126 122 128 C96 130 70 142 50 136 C42 134 38 128 36 122Z" fill={belly} />
        <path d="M30 112 C28 86 66 74 104 82 C144 90 176 116 216 108 C236 104 250 96 262 104 C270 112 266 124 252 130 C214 146 178 132 140 128 C110 124 88 142 60 138 C40 134 30 126 30 112Z" fill="none" stroke={INK} strokeWidth="2.4" />
        <path d="M120 86 C132 76 152 78 160 92Z" fill={skin} stroke={INK} strokeWidth="2" />
        <path d="M30 116 Q52 128 78 118" fill="none" stroke={INK} strokeWidth="2.4" />
        <circle cx="58" cy="98" r="5.4" fill={KIN_PALE} stroke={INK} strokeWidth="1.5" /><circle cx="58.6" cy="98.6" r="2.6" fill={INK} />
        <path d="M48 90 L66 92" stroke={INK} strokeWidth="2.6" />
        {/* ひげ */}
        <path d="M32 108 C18 100 14 86 4 82 M32 118 C18 124 14 138 2 140 M44 122 C40 134 48 144 42 150 M40 104 C36 92 26 88 24 76" fill="none" stroke={INK} strokeWidth="4.4" />
        <path d="M32 108 C18 100 14 86 4 82 M32 118 C18 124 14 138 2 140 M44 122 C40 134 48 144 42 150 M40 104 C36 92 26 88 24 76" fill="none" stroke={skin} strokeWidth="2" />
        <path d="M86 92 C110 90 140 100 160 108" fill="none" stroke="#6f7f8f" strokeWidth="2" opacity="0.8" />
      </g>
      <path d={burstPath(292, 124, 7, 12, 6)} fill={KIN_PALE} stroke={SHU} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}

/** 大王イカ: 港に上がって町をつかむ */
export function SceneSquid({ u }: { u: string }) {
  const skin = '#e27d68';
  const skinDark = '#b8503e';
  const arm = (d: string, w = 10) => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={w + 3.6} />
      <path d={d} stroke={skin} strokeWidth={w} />
      <path d={d} stroke={WASHI} strokeWidth="2" strokeDasharray="0.1 7" opacity="0.85" />
    </g>
  );
  return (
    <g>
      <Bg u={u} tone="dusk" />
      <circle cx="262" cy="30" r="15" fill={KIN_PALE} stroke={INK} strokeWidth="1.3" opacity="0.9" />
      <Kasumi x={70} y={18} c={KIN_PALE} o={0.5} />
      {/* 奥の腕（家をつかむ） */}
      {arm('M196 122 C214 78 252 70 260 92 C266 108 248 112 244 100', 10)}
      {arm('M124 122 C104 82 68 76 62 96 C58 110 74 114 78 104', 10)}
      <House x={252} y={98} rot={18} s={0.8} roof={AI} />
      <Boat x={66} y={100} s={0.36} rot={-24} flag={false} />
      {/* 胴 */}
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M134 44 L104 26 C112 44 118 56 132 64Z" fill={skinDark} stroke={INK} strokeWidth="2" />
        <path d="M186 44 L216 26 C208 44 202 56 188 64Z" fill={skinDark} stroke={INK} strokeWidth="2" />
        <path d="M160 6 C140 24 130 54 130 86 C130 100 136 112 146 120 H174 C184 112 190 100 190 86 C190 54 180 24 160 6Z" fill={skin} stroke={INK} strokeWidth="2.4" />
        <path d="M148 30 C142 46 138 64 138 84" fill="none" stroke="#f3a895" strokeWidth="3" opacity="0.8" />
        {[[168, 40], [176, 62], [164, 72], [178, 84], [150, 56]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={skinDark} opacity="0.7" />)}
        <circle cx="146" cy="100" r="9" fill={WASHI} stroke={INK} strokeWidth="1.8" /><circle cx="147" cy="101" r="4.6" fill={INK} /><circle cx="145" cy="98.6" r="1.6" fill="#fff" />
        <circle cx="174" cy="100" r="9" fill={WASHI} stroke={INK} strokeWidth="1.8" /><circle cx="173" cy="101" r="4.6" fill={INK} /><circle cx="171" cy="98.6" r="1.6" fill="#fff" />
        <path d="M136 90 L154 94 M184 90 L166 94" stroke={INK} strokeWidth="3" />
      </g>
      {/* 手前の腕 */}
      {arm('M150 124 C140 96 112 104 108 124', 9)}
      {arm('M170 124 C180 98 208 104 214 124', 9)}
      {arm('M216 130 C238 110 272 118 288 96 C294 86 286 78 280 84', 8)}
      {arm('M104 130 C82 112 46 122 30 100 C24 90 32 82 38 88', 8)}
      {/* 海と、しぶき */}
      <path d={`${wavePath(122, 8, 32, -20)} L330 150 L-10 150Z`} fill={`url(#${u}sea)`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={wavePath(127, 6, 32, -20)} fill="none" stroke={WASHI} strokeWidth="1.6" opacity="0.75" />
      <path d={wavePath(140, 4, 40, -6)} fill="none" stroke={AI_LIGHT} strokeWidth="1.2" opacity="0.5" />
      <g fill={WASHI} stroke={INK} strokeWidth="1.1">
        <circle cx="96" cy="112" r="3" /><circle cx="224" cy="110" r="3.4" /><circle cx="130" cy="108" r="2.4" /><circle cx="198" cy="106" r="2.6" /><circle cx="20" cy="116" r="2.6" /><circle cx="300" cy="112" r="2.8" />
      </g>
    </g>
  );
}

const EMBERS = scatter(14, 23);

/** 火事: 燃える町家と、半鐘の火の見やぐら */
export function SceneFire({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="night" />
      <circle cx="176" cy="84" r="104" fill={`url(#${u}ember)`} />
      {/* 煙 */}
      <Puff x={206} y={26} s={1.2} c="#56606e" />
      <Puff x={150} y={18} s={0.9} c="#6b7684" />
      <Puff x={250} y={46} s={0.7} c="#6b7684" />
      {/* 火の見やぐらと半鐘 */}
      <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
        <path d="M38 150 L50 34 M82 150 L70 34" stroke={INK} strokeWidth="6" />
        <path d="M38 150 L50 34 M82 150 L70 34" stroke={WOOD} strokeWidth="3" />
        <path d="M42 120 H78 M45 92 H75 M47 64 H73 M43 120 L75 92 M46 92 L73 64" stroke={WOOD} strokeWidth="2.4" />
        <path d="M36 36 L60 18 L84 36Z" fill="#2a2018" strokeWidth="1.8" />
        <path d="M60 36 V44" strokeWidth="1.6" />
        <path d="M51 56 C52 48 56 44 60 44 C64 44 68 48 69 56Z" fill={KIN} strokeWidth="1.6" />
        <path d="M48 56 H72" stroke={INK} strokeWidth="3.4" />
      </g>
      <path d="M40 46 q-7 5 -6 13 M82 44 q8 5 7 14 M32 62 q-9 0 -11 -8" fill="none" stroke={KIN_PALE} strokeWidth="2.2" strokeLinecap="round" />
      {/* 燃える町家 */}
      <Flame x={150} y={84} s={1.5} />
      <Flame x={206} y={80} s={1.9} />
      <Flame x={180} y={70} s={1.3} />
      <g strokeLinejoin="round">
        <rect x="122" y="92" width="116" height="58" fill={WASHI2} stroke={INK} strokeWidth="2" />
        <path d="M108 94 L180 58 L252 94Z" fill={AI_DEEP} stroke={INK} strokeWidth="2" />
        <path d="M124 90 L180 62 L236 90" fill="none" stroke={AI_LIGHT} strokeWidth="1.4" opacity="0.5" />
        <rect x="134" y="104" width="26" height="22" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.6" />
        <rect x="200" y="104" width="26" height="22" fill={KIN_LIGHT} stroke={INK} strokeWidth="1.6" />
        <path d="M147 104 V126 M134 115 H160 M213 104 V126 M200 115 H226" stroke={INK} strokeWidth="1.2" />
        <rect x="168" y="112" width="24" height="38" fill={WOOD} stroke={INK} strokeWidth="1.6" />
      </g>
      <Flame x={147} y={108} s={0.62} />
      <Flame x={214} y={106} s={0.7} />
      <Flame x={236} y={96} s={0.9} />
      <Flame x={124} y={96} s={0.7} />
      {EMBERS.map((p, i) => <circle key={i} cx={110 + p.x * 160} cy={10 + p.y * 70} r={1 + p.k * 1.4} fill={i % 2 ? KIN_LIGHT : SHU_LIGHT} />)}
      {/* 手桶の水 */}
      <g transform="translate(284 128)" strokeLinejoin="round">
        <path d="M-15 -16 H15 L12 6 H-12Z" fill={WOOD_PALE} stroke={INK} strokeWidth="1.8" />
        <path d="M-14 -9 H14 M-12.6 0 H12.6" stroke={KIN_DARK} strokeWidth="1.6" />
        <path d="M-15 -16 C-15 -34 15 -34 15 -16" fill="none" stroke={INK} strokeWidth="3.6" /><path d="M-15 -16 C-15 -34 15 -34 15 -16" fill="none" stroke={WOOD} strokeWidth="1.6" />
        <path d="M-12 -16 C-24 -30 -44 -34 -58 -26 C-44 -24 -30 -18 -20 -6Z" fill={AI_LIGHT} stroke={INK} strokeWidth="1.5" />
      </g>
    </g>
  );
}

/** 商店（のれんの出た店／戸を閉めた店） */
function Shop({ x, w, h, roof, noren, open }: { x: number; w: number; h: number; roof: string; noren: string; open: boolean }) {
  const top = 132 - h;
  return (
    <g strokeLinejoin="round">
      <rect x={x} y={top} width={w} height={h} fill={open ? WASHI : '#c9c2b0'} stroke={INK} strokeWidth="1.8" />
      <path d={`M${x - 7} ${top + 2} L${x + 6} ${top - 16} H${x + w - 6} L${x + w + 7} ${top + 2}Z`} fill={roof} stroke={INK} strokeWidth="1.8" />
      {open ? (
        <g>
          <rect x={x + 6} y={top + 20} width={w - 12} height={h - 20} fill={KIN_LIGHT} opacity="0.6" />
          {[0, 1, 2].map(i => {
            const pw = (w - 12) / 3;
            return <path key={i} d={`M${x + 6 + i * pw} ${top + 8} h${pw - 1.4} v17 q${-(pw - 1.4) / 2} 3 ${-(pw - 1.4)} 0Z`} fill={noren} stroke={INK} strokeWidth="1.2" />;
          })}
          <circle cx={x + w / 2} cy={top + 16} r="4" fill={WASHI} opacity="0.9" />
        </g>
      ) : (
        <g>
          <rect x={x + 6} y={top + 8} width={w - 12} height={h - 8} fill="#8f8a7e" stroke={INK} strokeWidth="1.3" />
          {Array.from({ length: Math.floor((h - 12) / 6) }, (_, i) => <path key={i} d={`M${x + 6} ${top + 14 + i * 6} H${x + w - 6}`} stroke={INK} strokeWidth="0.9" opacity="0.5" />)}
          <rect x={x + w / 2 - 9} y={top + h / 2 - 2} width="18" height="12" fill={WASHI} stroke={INK} strokeWidth="1" transform={`rotate(-6 ${x + w / 2} ${top + h / 2 + 4})`} />
          <path d={`M${x + w / 2 - 5} ${top + h / 2 + 2} h10 M${x + w / 2 - 5} ${top + h / 2 + 6} h7`} stroke={INK} strokeWidth="1" opacity="0.6" />
        </g>
      )}
    </g>
  );
}

/** 景気: にぎわう商店街と上がる矢印（好景気）／戸を閉めた店と下がる矢印（不景気） */
export function SceneMarket({ u, variant }: { u: string; variant?: string }) {
  const boom = variant !== 'recession';
  const line = boom ? 'M20 106 L78 86 L124 96 L182 56 L224 66 L286 18' : 'M20 26 L78 46 L124 36 L182 76 L224 66 L282 110';
  return (
    <g>
      <Bg u={u} tone={boom ? 'gold' : 'storm'} />
      {boom ? <Rays d={raysPath(160, 132, 20, 260, 0.5)} o={0.24} /> : <rect x="0" y="0" width="320" height="150" fill={WASHI2} opacity="0.4" />}
      {!boom && <Kasumi x={84} y={20} c={WASHI} o={0.5} />}
      {/* 地面 */}
      <rect x="0" y="132" width="320" height="18" fill={boom ? WASHI3 : '#9a9488'} stroke={INK} strokeWidth="1.6" />
      <Shop x={24} w={62} h={58} roof={AI} noren={AI_MID} open={boom} />
      <Shop x={100} w={54} h={46} roof={SHU_DARK} noren={SHU} open={boom} />
      <Shop x={168} w={66} h={62} roof={AI_DEEP} noren={LEAF} open={boom} />
      <Shop x={248} w={52} h={48} roof={AI} noren={KIN_DARK} open={boom} />
      {boom ? (
        <g>
          {/* のぼり旗 */}
          <path d="M92 132 V84 M240 132 V80" stroke={INK} strokeWidth="2.4" />
          <path d="M93 86 h12 v30 h-12Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.2" />
          <path d="M241 82 h12 v30 h-12Z" fill={KIN} stroke={INK} strokeWidth="1.2" />
          <Koban x={48} y={30} r={-24} s={0.72} />
          <Koban x={112} y={44} r={18} s={0.6} />
          <Koban x={246} y={52} r={-32} s={0.62} />
          <Sparkle x={78} y={56} s={0.8} c="#fff" />
          <Sparkle x={300} y={50} s={0.9} />
        </g>
      ) : (
        <g>
          {/* くもの巣と落ち葉 */}
          <g fill="none" stroke={WASHI} strokeWidth="1.2" opacity="0.85">
            <path d="M0 0 L46 40 M0 0 L20 48 M0 0 L54 16 M12 20 Q24 22 26 10 M22 38 Q42 38 44 18 M8 36 Q20 36 34 28" />
          </g>
          <g fill={WOOD_LIGHT} stroke={INK} strokeWidth="1" strokeLinejoin="round">
            <path d="M92 124 q8 -8 14 0 q-7 6 -14 0Z" /><path d="M236 140 q8 -8 14 0 q-7 6 -14 0Z" /><path d="M150 138 q7 -7 12 0 q-6 5 -12 0Z" />
          </g>
        </g>
      )}
      {/* 景気の矢印 */}
      <path d={line} fill="none" stroke={INK} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line} fill="none" stroke={boom ? KIN : SHU_LIGHT} strokeWidth="6.4" strokeLinejoin="round" strokeLinecap="round" />
      {boom
        ? <path d="M262 14 L302 4 L296 44Z" fill={KIN} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        : <path d="M300 126 L258 116 L290 90Z" fill={SHU_LIGHT} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />}
    </g>
  );
}

/** 家・公園が建つ／町が育つ */
export function SceneHouse({ u, variant }: { u: string; variant?: string }) {
  const park = variant === 'park';
  const grow = variant === 'grow';
  return (
    <g>
      <Bg u={u} tone="day" />
      <Rays d={raysPath(160, 96, 20, 260, 0.5)} o={0.2} />
      <Kasumi x={56} y={20} />
      <Kasumi x={268} y={34} s={0.8} o={0.85} />
      <Hills y={100} />
      {park ? (
        <g strokeLinejoin="round">
          {/* 木 */}
          <rect x="94" y="88" width="10" height="40" fill={WOOD} stroke={INK} strokeWidth="1.8" />
          <path d="M60 80 C52 60 70 44 86 50 C92 32 120 32 124 52 C142 50 152 70 138 84 C128 96 72 96 60 80Z" fill={LEAF_DARK} stroke={INK} strokeWidth="2" />
          <path d="M74 70 C74 58 86 54 94 58 M104 50 C112 46 122 52 122 60" fill="none" stroke={LEAF_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
          {/* 噴水 */}
          <ellipse cx="200" cy="126" rx="44" ry="9" fill={AI_LIGHT} stroke={INK} strokeWidth="1.8" />
          <path d="M156 126 V132 C156 140 244 140 244 132 V126" fill={STONE} stroke={INK} strokeWidth="1.8" />
          <rect x="195" y="96" width="10" height="28" fill={STONE} stroke={INK} strokeWidth="1.6" />
          <ellipse cx="200" cy="96" rx="16" ry="4.6" fill={STONE_DARK} stroke={INK} strokeWidth="1.6" />
          <path d="M200 92 C200 70 182 72 180 96 M200 92 C200 70 218 72 220 96 M200 92 V66" fill="none" stroke={WASHI} strokeWidth="3" strokeLinecap="round" />
          <path d="M200 92 C200 70 182 72 180 96 M200 92 C200 70 218 72 220 96 M200 92 V66" fill="none" stroke={AI_LIGHT} strokeWidth="1.2" strokeLinecap="round" />
          {/* 腰かけ */}
          <path d="M256 118 H300 M260 118 V132 M296 118 V132 M256 108 H300" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M256 118 H300 M260 118 V132 M296 118 V132 M256 108 H300" stroke={WOOD_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
          <g fill={SHU_LIGHT} stroke={INK} strokeWidth="1">
            <circle cx="32" cy="124" r="3.4" /><circle cx="44" cy="130" r="3" /><circle cx="140" cy="132" r="3.2" />
          </g>
        </g>
      ) : (
        <g>
          {grow && <House x={70} y={128} s={1.25} roof={AI_MID} />}
          {grow && <House x={254} y={128} s={1.35} roof={SHU} />}
          <House x={160} y={132} s={2.5} roof={AI} />
          {/* のし（お祝いの帯と蝶結び） */}
          {!grow && (
            <g>
              <rect x="117" y="96" width="86" height="9" fill={SHU_BRIGHT} stroke={INK} strokeWidth="1.3" />
              <g transform="translate(160 100)" fill="none" strokeLinecap="round">
                <path d="M0 0 C-18 -18 -30 -2 -14 4 M0 0 C18 -18 30 -2 14 4" stroke={INK} strokeWidth="6.4" />
                <path d="M0 0 C-18 -18 -30 -2 -14 4 M0 0 C18 -18 30 -2 14 4" stroke={KIN_LIGHT} strokeWidth="3.4" />
                <circle cx="0" cy="0" r="5" fill={KIN} stroke={INK} strokeWidth="1.4" />
              </g>
            </g>
          )}
          {grow && (
            <g>
              {/* 引っ越しの荷車 */}
              <g transform="translate(86 132)" strokeLinejoin="round">
                <rect x="-74" y="-22" width="40" height="16" fill={WOOD_LIGHT} stroke={INK} strokeWidth="1.6" />
                <rect x="-68" y="-36" width="16" height="14" fill={WASHI} stroke={INK} strokeWidth="1.4" /><rect x="-50" y="-32" width="12" height="10" fill={SHU_LIGHT} stroke={INK} strokeWidth="1.4" />
                <circle cx="-62" cy="-3" r="7" fill={WASHI2} stroke={INK} strokeWidth="1.8" /><circle cx="-44" cy="-3" r="7" fill={WASHI2} stroke={INK} strokeWidth="1.8" />
                <path d="M-34 -14 H-22" stroke={INK} strokeWidth="2.4" />
              </g>
              <Chevrons x={36} y={78} c={KIN_LIGHT} s={0.7} />
              <path d="M160 50 L174 22 L188 50 H180 V66 H168 V50Z" fill={KIN} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" transform="translate(-14 -20)" />
            </g>
          )}
        </g>
      )}
      <Sparkle x={228} y={40} s={1.1} />
      <Sparkle x={92} y={50} s={0.8} c="#fff" />
      <Sparkle x={292} y={84} s={0.7} c="#fff" />
    </g>
  );
}

/** 選挙: 投票箱・拡声器・だるま */
export function SceneElection({ u }: { u: string }) {
  return (
    <g>
      <Bg u={u} tone="gold" />
      <Rays d={raysPath(160, 90, 20, 260, 0.5)} c={AI_LIGHT} o={0.22} />
      <rect x="0" y="126" width="320" height="24" fill={WASHI3} stroke={INK} strokeWidth="1.6" />
      {/* 拡声器 */}
      <g transform="translate(70 76) rotate(-16)" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-30 -8 L22 -30 V30 L-30 8Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="2.2" />
        <ellipse cx="22" cy="0" rx="8" ry="30" fill={WASHI} stroke={INK} strokeWidth="2" />
        <rect x="-42" y="-9" width="13" height="18" rx="3" fill={WASHI2} stroke={INK} strokeWidth="1.8" />
        <path d="M-22 10 L-26 34 H-14 L-12 14" fill={STONE} stroke={INK} strokeWidth="1.8" />
        <path d="M40 -24 q12 24 0 48 M52 -34 q18 34 0 68" fill="none" stroke={INK} strokeWidth="2.4" />
      </g>
      {/* 投票箱 */}
      <g strokeLinejoin="round">
        <path d="M126 70 L144 56 H216 L198 70Z" fill="#3d6a96" stroke={INK} strokeWidth="2" />
        <path d="M198 70 L216 56 V112 L198 128Z" fill={AI} stroke={INK} strokeWidth="2" />
        <rect x="126" y="70" width="72" height="58" fill={AI_MID} stroke={INK} strokeWidth="2.2" />
        <path d="M150 62 H196" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <rect x="148" y="86" width="28" height="26" rx="2" fill={WASHI} stroke={INK} strokeWidth="1.5" />
        <circle cx="162" cy="99" r="8" fill="none" stroke={SHU_BRIGHT} strokeWidth="3" />
        <rect x="184" y="92" width="8" height="12" rx="1.5" fill={KIN} stroke={INK} strokeWidth="1.2" />
      </g>
      {/* 投票用紙 */}
      <g transform="translate(172 36) rotate(14)" strokeLinejoin="round">
        <rect x="-15" y="-20" width="30" height="40" fill={WASHI} stroke={INK} strokeWidth="1.8" />
        <path d="M-8 -11 H8 M-8 -4 H8 M-8 3 H4" stroke={INK} strokeWidth="1.3" opacity="0.6" />
        <circle cx="4" cy="11" r="4.4" fill="none" stroke={SHU_BRIGHT} strokeWidth="2" />
      </g>
      <path d="M150 22 q-8 4 -8 12 M198 20 q8 6 6 14" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      {/* だるま */}
      <g transform="translate(264 96)" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="0" cy="32" rx="30" ry="5" fill={INK} opacity="0.18" />
        <path d="M0 -36 C24 -36 34 -16 34 4 C34 24 20 34 0 34 C-20 34 -34 24 -34 4 C-34 -16 -24 -36 0 -36Z" fill={SHU_BRIGHT} stroke={INK} strokeWidth="2.2" />
        <path d="M0 -24 C14 -24 20 -14 20 -4 C20 8 12 12 0 12 C-12 12 -20 8 -20 -4 C-20 -14 -14 -24 0 -24Z" fill={WASHI} stroke={INK} strokeWidth="1.6" />
        <circle cx="-8" cy="-8" r="5.4" fill="#fff" stroke={INK} strokeWidth="1.4" /><circle cx="-8" cy="-8" r="2.8" fill={INK} />
        <circle cx="8" cy="-8" r="5.4" fill="#fff" stroke={INK} strokeWidth="1.4" />
        <path d="M-16 -17 q8 -5 14 0 M2 -17 q8 -5 14 0" fill="none" stroke={INK} strokeWidth="2.6" />
        <path d="M-6 4 q6 4 12 0" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M-12 20 q12 8 24 0" fill="none" stroke={KIN_LIGHT} strokeWidth="2.6" />
        <path d="M-22 -22 C-16 -28 -8 -30 0 -30" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
      </g>
      <Sparkle x={292} y={36} s={0.9} />
      <Sparkle x={112} y={30} s={0.7} c="#fff" />
    </g>
  );
}
