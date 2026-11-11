// タイトルの主役の一枚絵: 朝日・遠くの日本列島の影・浮世絵の大波・はねる鯛。
//
// - 画面の縦横比がいろいろ（スマホ縦〜PC 横）なので、1枚の SVG を引き伸ばさず、層ごとに別の要素を重ねて
//   CSS で置く（置き場所と大きさは index.css の「晴れ舞台係」。--hr-hz = 水平線の高さ、--hr-s = 絵の倍率）。
// - 動くのは波3枚（別々の速さで横に流れる）・大波のゆれ・鯛のはね・朝日の昇り（1回）だけ。
//   どれも要素まるごとの transform / opacity を CSS アニメで動かす（SVG の中身は止まった絵。SMIL は使わない）。
// - 動きを減らす設定では、CSS の側ですべて止める（鯛ははねた頂点の絵で止まる）。
import { memo } from 'react';
import { JAPAN_SILHOUETTE, JAPAN_SILHOUETTE_BOX } from './japanSilhouette';

const INK = '#0a1a2c';
const FOAM = '#f4ecd8';

/** 波1つぶん（幅240）の上の縁。x をずらし、高さを k 倍にして並べる */
function crestEdge(dx: number, k: number): { top: string; foam: string; fingers: string; dots: [number, number, number][]; stripes: string } {
  const base = 96;
  const Y = (y: number) => (base - (base - y) * k).toFixed(1);
  const X = (x: number) => (x + dx).toFixed(1);
  const P = (x: number, y: number) => `${X(x)},${Y(y)}`;
  return {
    // うねり → 波頭 → 巻きこむ先 → 波のうろ → 次の谷
    top:
      `C${P(28, 96)} ${P(52, 84)} ${P(74, 62)}C${P(92, 44)} ${P(118, 28)} ${P(146, 30)}` +
      `C${P(170, 32)} ${P(186, 48)} ${P(184, 66)}C${P(183, 74)} ${P(176, 79)} ${P(169, 76)}` +
      `C${P(174, 66)} ${P(168, 54)} ${P(154, 52)}C${P(138, 50)} ${P(126, 62)} ${P(128, 78)}` +
      `C${P(130, 92)} ${P(160, 100)} ${P(196, 98)}C${P(214, 97)} ${P(228, 96)} ${P(240, 96)}`,
    // 波頭の白い縁
    foam:
      `M${P(60, 76)}C${P(84, 52)} ${P(116, 28)} ${P(146, 30)}C${P(170, 32)} ${P(186, 48)} ${P(184, 66)}` +
      `C${P(183, 74)} ${P(176, 79)} ${P(169, 76)}`,
    // 波頭の下にのびる白い指
    fingers: `M${P(138, 36)}q7,7 2,15M${P(152, 37)}q8,6 4,15M${P(166, 43)}q7,7 3,15M${P(176, 53)}q5,7 0,13`,
    dots: [
      [194, 50, 3], [203, 62, 2.2], [192, 84, 2], [180, 91, 1.5], [206, 44, 1.4],
    ].map(([x, y, r]) => [x + dx, base - (base - y) * k, r] as [number, number, number]),
    // うねりの筋
    stripes: `M${P(14, 106)}C${P(48, 106)} ${P(78, 94)} ${P(102, 72)}M${P(34, 120)}C${P(72, 120)} ${P(102, 106)} ${P(122, 88)}`,
  };
}

/** 横につながる波の帯（1タイル = 波2つ）を data URI の SVG にする */
function waveTile(top: string, bottom: string, opts: { fade?: boolean; stripe?: string } = {}): string {
  const a = crestEdge(0, 1);
  const b = crestEdge(240, 0.78);
  const id = `g${top.replace('#', '')}`;
  const dots = [...a.dots, ...b.dots].map(([x, y, r]) => `<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${r}'/>`).join('');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 170' preserveAspectRatio='none'>` +
    `<defs><linearGradient id='${id}' x1='0' y1='0' x2='0' y2='1'>` +
    `<stop offset='0.12' stop-color='${top}'/><stop offset='0.62' stop-color='${bottom}'/>` +
    `<stop offset='1' stop-color='${bottom}' stop-opacity='${opts.fade ? 0 : 1}'/></linearGradient></defs>` +
    `<path d='M0,96${a.top}${b.top}L480,170L0,170Z' fill='url(#${id})'/>` +
    `<path d='${a.stripes}${b.stripes}' fill='none' stroke='${opts.stripe ?? '#7fa9cd'}' stroke-opacity='0.5' stroke-width='2.4' stroke-linecap='round'/>` +
    `<path d='M0,96${a.top}${b.top}' fill='none' stroke='${INK}' stroke-opacity='0.55' stroke-width='1.6'/>` +
    `<path d='${a.foam}${b.foam}' fill='none' stroke='${INK}' stroke-opacity='0.7' stroke-width='8.4' stroke-linecap='round'/>` +
    `<path d='${a.foam}${b.foam}' fill='none' stroke='${FOAM}' stroke-width='5.6' stroke-linecap='round'/>` +
    `<path d='${a.fingers}${b.fingers}' fill='none' stroke='${FOAM}' stroke-width='3.2' stroke-linecap='round'/>` +
    `<g fill='${FOAM}'>${dots}</g>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const TILE_BACK = waveTile('#4a7faf', '#24496e', { stripe: '#a9c8e2' });
const TILE_MID = waveTile('#2e5e8c', '#15314f');
const TILE_FRONT = waveTile('#24496e', '#1b3a5b', { fade: true });

/** 大波の上の縁に並ぶ泡（円を重ねて、ぎざぎざの波頭にする） */
const GREAT_FOAM: [number, number, number][] = [
  [26, 128, 8], [38, 106, 9], [52, 86, 10], [68, 68, 11], [86, 54, 11.5], [106, 43, 12], [128, 36, 12.5], [150, 33, 12.5],
  [172, 35, 12.5], [194, 42, 12], [214, 54, 11.5], [231, 70, 10.5], [244, 88, 9.5], [252, 107, 8.5], [255, 126, 7.5], [251, 143, 6.5],
];
/** 波頭から垂れる泡のつめ */
const GREAT_CLAWS: [number, number, number][] = [
  [243, 156, 5.4], [233, 150, 4.4], [238, 166, 3.4], [224, 141, 3.8], [228, 158, 2.6], [213, 132, 3.2], [247, 170, 2.2],
];
/** 飛びちるしぶき */
const GREAT_SPRAY: [number, number, number][] = [
  [272, 96, 2.6], [283, 118, 2.1], [268, 140, 1.9], [292, 104, 1.6], [264, 172, 1.7], [279, 152, 1.3], [234, 22, 2.1],
  [254, 34, 1.7], [208, 16, 1.5], [296, 136, 1.2], [182, 12, 1.3], [300, 82, 1.4], [276, 70, 1.8],
];

/** 大波の上の縁（墨の線を引くところ）と、体（下は海にとけこませるので、すそを下の角まで流す） */
const GREAT_EDGE =
  'M0,150C20,96 70,40 140,34C196,30 240,56 256,104C262,124 258,142 246,150' +
  'C250,128 236,104 212,98C176,90 150,112 148,148C146,196 190,236 262,246';
const GREAT_BODY = `M0,420L${GREAT_EDGE.slice(1)}C300,252 316,300 320,420Z`;

function GreatWave() {
  return (
    <svg className="hr-great" viewBox="0 0 320 420" aria-hidden="true">
      <defs>
        <linearGradient id="hr-great-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.08" stopColor="#3a6a94" />
          <stop offset="0.34" stopColor="#24496e" />
          <stop offset="0.66" stopColor="#15314f" />
          <stop offset="1" stopColor="#15314f" stopOpacity="0" />
        </linearGradient>
        <clipPath id="hr-great-c"><path d={GREAT_BODY} /></clipPath>
      </defs>
      <path d={GREAT_BODY} fill="url(#hr-great-g)" />
      <path d={GREAT_EDGE} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeOpacity="0.8" />
      {/* うねりの筋（波の面に沿って） */}
      <g clipPath="url(#hr-great-c)" fill="none" strokeLinecap="round">
        <path d="M18,290C22,210 62,124 132,82" stroke="#7fa9cd" strokeOpacity="0.55" strokeWidth="3.4" />
        <path d="M50,292C52,226 84,150 142,112" stroke="#7fa9cd" strokeOpacity="0.5" strokeWidth="3" />
        <path d="M84,294C84,244 100,188 138,150" stroke="#7fa9cd" strokeOpacity="0.45" strokeWidth="2.6" />
        <path d="M120,296C118,260 124,222 148,190" stroke="#7fa9cd" strokeOpacity="0.4" strokeWidth="2.2" />
        {/* 波の内がわの影 */}
        <path d="M212,98C176,90 150,112 148,148C146,196 190,236 262,246" stroke={INK} strokeOpacity="0.35" strokeWidth="9" />
      </g>
      {/* 波頭の泡 */}
      <g fill={FOAM} stroke={INK} strokeWidth="1.5">
        {GREAT_FOAM.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
        {GREAT_CLAWS.map(([x, y, r], i) => <circle key={`c${i}`} cx={x} cy={y} r={r} />)}
      </g>
      {/* 泡のつなぎ目を消して、ひとかたまりの白い波頭に見せる */}
      <path
        d="M30,124C48,88 84,52 140,42C194,38 234,62 248,104C252,120 252,134 248,144"
        fill="none" stroke={FOAM} strokeWidth="13" strokeLinecap="round"
      />
      <g fill={FOAM}>
        {GREAT_SPRAY.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      </g>
    </svg>
  );
}

/** はねる鯛（右向き）。体の赤・金のうろこ・青い星は真鯛の姿 */
function Tai() {
  return (
    <svg className="hr-tai" viewBox="0 0 200 130" aria-hidden="true">
      <defs>
        <linearGradient id="hr-tai-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c63a26" />
          <stop offset="0.45" stopColor="#e34a33" />
          <stop offset="0.8" stopColor="#f29a80" />
          <stop offset="1" stopColor="#fbe3d2" />
        </linearGradient>
        <linearGradient id="hr-tai-fin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef6a52" />
          <stop offset="1" stopColor="#a92e1d" />
        </linearGradient>
        <pattern id="hr-tai-scale" width="13" height="11" patternUnits="userSpaceOnUse" patternTransform="translate(2 3)">
          <path d="M0,0q6.5,9 13,0M-6.5,5.5q6.5,9 13,0M6.5,5.5q6.5,9 13,0" fill="none" stroke="#fbf0c8" strokeOpacity="0.55" strokeWidth="1.1" />
        </pattern>
        <clipPath id="hr-tai-c">
          <path d="M22,70C40,40 80,22 124,26C152,28 176,44 184,66C186,74 180,82 172,86C150,104 104,110 70,98C50,92 34,84 22,70Z" />
        </clipPath>
      </defs>
      {/* 尾びれ（二またで、はねて反っている） */}
      <path d="M32,70C20,58 12,44 2,30C8,50 9,60 7,70C9,80 9,94 3,110C13,96 22,84 32,72Z" fill="url(#hr-tai-fin)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M26,66 9,42M26,74 9,98M22,70H8" fill="none" stroke="#fbe3d2" strokeOpacity="0.55" strokeWidth="1" />
      {/* 背びれ（とげ） */}
      <path d="M54,44 61,23 70,37 79,16 89,30 99,11 109,26 119,14 128,28 137,21 143,32C120,25 88,28 54,44Z" fill="url(#hr-tai-fin)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {/* 腹びれ・しりびれ */}
      <path d="M104,104 94,121 118,107Z" fill="url(#hr-tai-fin)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M70,98 57,113 84,103Z" fill="url(#hr-tai-fin)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* 体 */}
      <path d="M22,70C40,40 80,22 124,26C152,28 176,44 184,66C186,74 180,82 172,86C150,104 104,110 70,98C50,92 34,84 22,70Z" fill="url(#hr-tai-g)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <g clipPath="url(#hr-tai-c)">
        <rect x="20" y="20" width="118" height="92" fill="url(#hr-tai-scale)" />
        {/* 背のつや */}
        <path d="M40,52C70,32 110,28 150,36" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="5" strokeLinecap="round" />
        {/* 真鯛の青い星 */}
        <g fill="#7fd0e8" opacity="0.9">
          <circle cx="66" cy="50" r="1.7" /><circle cx="82" cy="42" r="1.6" /><circle cx="98" cy="46" r="1.7" />
          <circle cx="112" cy="38" r="1.5" /><circle cx="76" cy="60" r="1.4" /><circle cx="124" cy="46" r="1.5" /><circle cx="94" cy="58" r="1.3" />
        </g>
      </g>
      {/* えら・胸びれ */}
      <path d="M144,36C134,54 136,80 148,94" fill="none" stroke="#8a2416" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M126,72C116,86 102,94 88,92C96,82 108,74 126,69Z" fill="#f7b79f" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M122,74 96,90M118,71 104,82" fill="none" stroke="#c63a26" strokeOpacity="0.6" strokeWidth="0.9" />
      {/* 目・口 */}
      <circle cx="161" cy="56" r="7.6" fill="#fbf6e8" stroke={INK} strokeWidth="1.5" />
      <circle cx="162.6" cy="56.6" r="4" fill={INK} />
      <circle cx="164" cy="55" r="1.3" fill="#fff" />
      <path d="M185,69C179,74 172,74 167,71" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TitleHeroImpl() {
  return (
    <div className="hr-hero" aria-hidden="true">
      <div className="hr-sky">
        <div className="hr-rays" />
        <svg className="hr-japan" viewBox={JAPAN_SILHOUETTE_BOX} preserveAspectRatio="xMidYMax meet">
          <path d={JAPAN_SILHOUETTE} />
        </svg>
        <div className="hr-sun" />
      </div>
      {/* 波の帯: 外の枠（画面の幅で切る）の中で、1タイルぶん長い帯を横に流す。横にはみ出さない */}
      <div className="hr-wave hr-wave-back"><div className="hr-wave-run" style={{ backgroundImage: TILE_BACK }} /></div>
      <div className="hr-tai-clip">
        <div className="hr-tai-wrap">
          <Tai />
          <div className="hr-splash is-a"><i /><i /><i /><i /><i /></div>
          <div className="hr-splash is-b"><i /><i /><i /><i /><i /></div>
        </div>
      </div>
      <div className="hr-wave hr-wave-mid"><div className="hr-wave-run" style={{ backgroundImage: TILE_MID }} /></div>
      <GreatWave />
      <div className="hr-wave hr-wave-front"><div className="hr-wave-run" style={{ backgroundImage: TILE_FRONT }} /></div>
    </div>
  );
}

const TitleHero = memo(TitleHeroImpl);
export default TitleHero;
