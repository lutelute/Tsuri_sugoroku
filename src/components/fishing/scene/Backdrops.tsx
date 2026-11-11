// 釣り場の遠景（浮世絵ふうの平たい色面の重ね）。
// 座標は 1200×240、下の辺（y=240）が水平線。色は舞台の CSS 変数（um-h1〜3 = 近・中・遠）で、空の時刻に合わせて変わる。
// 幅の狭い画面では中央の 650 ほどが見えるので、見せたい名所は x=300〜900 に置く。
import { memo, useId } from 'react';
import type { ReactNode } from 'react';
import type { StageBase, StageLandmark } from './sceneSpec';

/** 松（幹と、横に流れる葉の雲） */
function Pine({ x, y, s = 1, tone = 1 }: { x: number; y: number; s?: number; tone?: 1 | 2 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 2 C -3 -12 5 -20 1 -36" className={`um-h${tone}s`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M1 -22 C 8 -24 12 -28 16 -27" className={`um-h${tone}s`} strokeWidth="2" strokeLinecap="round" />
      <g className={`um-h${tone}`}>
        <ellipse cx="0" cy="-39" rx="17" ry="5.5" />
        <ellipse cx="15" cy="-29" rx="13" ry="4.5" />
        <ellipse cx="-12" cy="-27" rx="12" ry="4.2" />
      </g>
    </g>
  );
}

/** 杉（三角の木） */
function Cedar({ x, y, s = 1, tone = 1 }: { x: number; y: number; s?: number; tone?: 1 | 2 }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 2 L-7 2 L-3 -9 L-6 -9 L0 -28 L6 -9 L3 -9 L7 2 Z" className={`um-h${tone}`} />;
}

/** 椰子 */
function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 2 C 2 -16 -2 -30 6 -46" className="um-h1s" strokeWidth="3.4" strokeLinecap="round" />
      <g className="um-h1s" strokeWidth="3" strokeLinecap="round">
        <path d="M6 -46 C -4 -56 -16 -54 -24 -46" />
        <path d="M6 -46 C 0 -60 -8 -66 -18 -64" />
        <path d="M6 -46 C 10 -60 20 -66 30 -62" />
        <path d="M6 -46 C 18 -54 30 -52 36 -42" />
        <path d="M6 -46 C 14 -44 22 -38 24 -30" />
      </g>
    </g>
  );
}

/** 帆かけ舟（遠くの小さな白帆） */
function Sail({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 240) scale(${s})`}>
      <path d="M-9 -2 L9 -2 L6 2 L-6 2 Z" className="um-h1" />
      <path d="M-1 -3 L-1 -24 L10 -5 Z" className="um-snow" />
      <path d="M-3 -4 L-3 -18 L-9 -5 Z" className="um-snow" opacity="0.8" />
    </g>
  );
}

/** 飛ぶ鳥（への字） */
function Birds({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="um-h1s" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
      <path d="M0 0 q5 -6 9 0 q4 -6 9 0" />
      <path d="M26 -12 q4 -5 7 0 q3 -5 7 0" />
      <path d="M-22 -8 q4 -5 7 0 q3 -5 7 0" />
    </g>
  );
}

function base(kind: StageBase, mist: string): ReactNode {
  switch (kind) {
    case 'coast':
      return (
        <>
          {/* 遠い島かげ */}
          <path className="um-h3" d="M 470 240 C 500 220 550 206 596 210 C 640 198 686 196 726 208 C 766 216 798 230 826 240 Z" />
          <path className="um-h3" d="M 880 240 C 914 226 958 218 1004 222 C 1048 226 1084 234 1112 240 Z" />
          <rect x="0" y="176" width="1200" height="64" fill={`url(#${mist})`} />
          {/* 左から張り出す岬 */}
          <path className="um-h2" d="M 0 240 L 0 150 C 60 146 110 138 152 140 C 200 130 252 116 306 124 C 366 132 408 166 458 194 C 490 212 524 230 554 240 Z" />
          <Pine x={290} y={124} s={0.9} tone={2} />
          <Pine x={354} y={146} s={0.7} tone={2} />
          <Pine x={96} y={142} s={0.8} tone={2} />
          {/* 手前の磯と松 */}
          <path className="um-h1" d="M 0 240 L 0 198 C 60 190 110 186 150 188 C 196 178 242 182 288 198 C 328 212 360 228 386 240 Z" />
          <Pine x={204} y={184} s={1.2} />
          <Pine x={262} y={192} s={0.9} />
          <Pine x={60} y={192} s={1} />
          {/* 右の岩と一本松 */}
          <path className="um-h1" d="M 854 240 C 860 216 880 198 904 200 C 930 196 948 218 956 240 Z" />
          <Pine x={902} y={200} s={1} />
          <path className="um-h2" d="M 1010 240 C 1050 226 1110 220 1200 222 L 1200 240 Z" />
          <Sail x={660} s={1.1} />
          <Sail x={724} s={0.8} />
        </>
      );
    case 'open':
      return (
        <>
          {/* 沖: 水平線の雲と、かすかな島 */}
          <path className="um-cloud" d="M 180 240 C 186 222 210 216 228 222 C 238 204 270 198 290 210 C 304 192 344 190 360 208 C 384 200 406 212 410 226 C 430 226 444 232 448 240 Z" />
          <path className="um-cloud" d="M 700 240 C 708 224 730 220 746 226 C 756 206 792 198 812 212 C 828 190 876 186 896 208 C 922 198 950 210 954 226 C 980 224 1000 232 1006 240 Z" />
          <path className="um-h3" d="M 470 240 C 492 230 526 226 560 230 C 588 232 606 236 620 240 Z" />
          <Birds x={560} y={150} />
          <Sail x={930} s={0.9} />
        </>
      );
    case 'north':
      return (
        <>
          {/* 雪をかぶった山なみ */}
          <path className="um-h3" d="M 0 240 L 0 176 L 80 150 L 150 150 L 210 104 L 254 132 L 326 64 L 386 118 L 450 82 L 518 140 L 580 112 L 656 170 L 730 150 L 810 196 L 910 240 Z" />
          <g className="um-snow">
            <path d="M 326 64 L 354 90 L 342 86 L 332 100 L 322 86 L 310 96 L 300 88 Z" />
            <path d="M 450 82 L 474 104 L 462 100 L 452 112 L 442 100 L 432 106 L 426 98 Z" />
            <path d="M 210 104 L 228 116 L 218 114 L 210 124 L 202 114 L 192 120 Z" />
            <path d="M 580 112 L 600 128 L 590 126 L 582 136 L 574 126 L 564 130 Z" />
          </g>
          <path className="um-h3" d="M 800 240 L 860 200 L 900 212 L 960 172 L 1020 204 L 1080 184 L 1140 212 L 1200 196 L 1200 240 Z" />
          <g className="um-snow">
            <path d="M 960 172 L 980 186 L 970 184 L 962 194 L 954 184 L 944 188 Z" />
          </g>
          <rect x="0" y="170" width="1200" height="70" fill={`url(#${mist})`} />
          {/* 針葉樹の岸 */}
          <path className="um-h2" d="M 0 240 L 0 200 C 90 192 190 196 290 212 C 360 224 420 234 470 240 Z" />
          {[40, 84, 130, 178, 226, 276, 326, 374].map((x, i) => <Cedar key={x} x={x} y={200 + i * 3} s={1.2 - i * 0.06} tone={2} />)}
          <path className="um-h1" d="M 800 240 C 840 222 900 212 970 214 C 1060 216 1140 222 1200 226 L 1200 240 Z" />
          {[856, 898, 940, 984, 1030, 1076, 1124, 1170].map((x, i) => <Cedar key={x} x={x} y={220 - Math.abs(i - 2) * 1.4} s={1.2 - (i % 3) * 0.12} />)}
          {/* 流氷 */}
          <g className="um-snow" opacity="0.9">
            <path d="M 520 240 L 528 232 L 560 230 L 580 236 L 584 240 Z" />
            <path d="M 640 240 L 650 234 L 690 233 L 700 240 Z" />
            <path d="M 740 240 L 746 235 L 772 234 L 780 240 Z" />
          </g>
        </>
      );
    case 'south':
      return (
        <>
          {/* 入道雲 */}
          <path className="um-cloud" d="M 560 240 C 556 214 580 198 604 204 C 600 172 636 150 668 162 C 676 130 728 116 760 140 C 786 118 840 126 850 162 C 886 156 912 182 904 208 C 932 212 946 226 948 240 Z" />
          <path className="um-h3" d="M 0 240 L 0 214 C 60 204 130 204 200 214 C 240 220 270 232 290 240 Z" />
          <rect x="0" y="190" width="1200" height="50" fill={`url(#${mist})`} />
          {/* 椰子の島 */}
          <path className="um-h2" d="M 236 240 C 276 218 336 206 396 212 C 440 216 474 228 498 240 Z" />
          <Palm x={318} y={212} s={1.3} />
          <Palm x={376} y={210} s={1} flip />
          <Palm x={436} y={220} s={0.85} />
          <path className="um-h1" d="M 836 240 C 866 222 916 212 966 214 C 1016 216 1056 228 1086 240 Z" />
          <Palm x={912} y={216} s={1.2} flip />
          <Palm x={978} y={214} s={1.4} />
          <path className="um-h2" d="M 1110 240 C 1140 230 1170 226 1200 226 L 1200 240 Z" />
          <Birds x={520} y={120} />
        </>
      );
    case 'valley':
      return (
        <>
          {/* 奥の峰と滝 */}
          <path className="um-h3" d="M 420 240 L 536 116 C 568 88 612 82 644 102 C 672 122 706 160 770 240 Z" />
          <path className="um-snow" opacity="0.9" d="M 596 132 C 594 170 592 204 588 240 L 618 240 C 614 204 612 170 610 132 Z" />
          <rect x="0" y="150" width="1200" height="90" fill={`url(#${mist})`} />
          {/* 両岸の山 */}
          <path className="um-h2" d="M 0 240 L 0 30 C 90 40 190 70 290 120 C 380 164 460 212 520 240 Z" />
          <path className="um-h2" d="M 1200 240 L 1200 44 C 1110 52 1010 84 910 132 C 820 176 740 216 690 240 Z" />
          {[[60, 44], [130, 62], [200, 84], [258, 106], [310, 130], [358, 154], [404, 178], [446, 200]].map(([x, y], i) => <Cedar key={x} x={x} y={y} s={1.6 - i * 0.1} tone={2} />)}
          {[[1140, 58], [1070, 76], [1004, 98], [948, 120], [896, 142], [848, 164], [802, 186], [760, 206]].map(([x, y], i) => <Cedar key={x} x={x} y={y} s={1.6 - i * 0.1} tone={2} />)}
          <rect x="0" y="196" width="1200" height="44" fill={`url(#${mist})`} opacity="0.6" />
          {/* 手前の岸と松 */}
          <path className="um-h1" d="M 0 240 L 0 140 C 80 146 180 172 280 206 C 330 224 370 236 396 240 Z" />
          <path className="um-h1" d="M 1200 240 L 1200 150 C 1130 156 1040 178 950 208 C 900 226 866 236 840 240 Z" />
          <Pine x={120} y={158} s={1.6} />
          <Pine x={232} y={190} s={1.3} />
          <Pine x={322} y={218} s={1} />
          <Pine x={1090} y={166} s={1.6} />
          <Pine x={980} y={194} s={1.3} />
          <Pine x={884} y={220} s={1} />
          {/* 川の中の岩 */}
          <path className="um-h1" d="M 532 240 C 538 230 556 226 570 230 C 578 234 582 238 584 240 Z" />
          <path className="um-h1" d="M 644 240 C 648 234 660 232 670 235 C 674 237 676 239 677 240 Z" />
        </>
      );
    case 'lake':
      return (
        <>
          {/* なだらかな対岸 */}
          <path className="um-h3" d="M 0 240 L 0 170 C 90 150 190 150 290 172 C 380 190 460 176 560 162 C 680 146 800 160 900 182 C 1000 200 1100 186 1200 174 L 1200 240 Z" />
          <rect x="0" y="176" width="1200" height="64" fill={`url(#${mist})`} />
          <path className="um-h2" d="M 0 240 L 0 208 C 80 198 180 204 280 222 C 330 231 370 237 400 240 Z" />
          <path className="um-h2" d="M 1200 240 L 1200 204 C 1130 198 1040 206 950 224 C 910 232 880 238 860 240 Z" />
          {/* 松と鳥居の小島 */}
          <path className="um-h1" d="M 520 240 C 536 230 572 226 620 226 C 668 226 704 230 720 240 Z" />
          <Pine x={556} y={230} s={1} />
          <Pine x={596} y={227} s={1.25} />
          <Pine x={684} y={230} s={0.95} />
          <g className="um-shu">
            <path d="M 630 208 Q 646 203 662 208 L 661 212 Q 646 208 631 212 Z" />
            <rect x="635" y="211" width="3.4" height="18" />
            <rect x="653.6" y="211" width="3.4" height="18" />
            <rect x="633" y="216" width="26" height="2.6" />
          </g>
          {/* 岸の葦 */}
          <g className="um-h1s" strokeWidth="2.2" strokeLinecap="round">
            {[26, 44, 60, 82, 104, 246, 262, 284, 300, 322, 880, 902, 918, 940, 1110, 1132, 1150, 1172].map((x, i) => (
              <path key={x} d={`M ${x} 240 C ${x - 2} ${222 - (i % 3) * 6} ${x + 4} ${208 - (i % 3) * 6} ${x + 8 - (i % 2) * 14} ${196 - (i % 3) * 7}`} />
            ))}
          </g>
        </>
      );
  }
}

function landmark(kind: StageLandmark, small: boolean, ids: { fuji: string }): ReactNode {
  switch (kind) {
    case 'none':
      return null;
    case 'fuji': {
      // 沖から見る富士は小さく（船釣り）
      const tf = small ? 'translate(430 124) scale(0.5)' : undefined;
      return (
        <g transform={tf}>
          <path fill={`url(#${ids.fuji})`} d="M 286 240 C 420 228 520 192 604 120 C 644 84 668 58 690 44 L 700 40 L 712 46 L 726 40 L 742 46 L 756 44 C 780 60 808 90 850 126 C 934 196 1044 230 1170 240 Z" />
          <path className="um-snow" d="M 690 44 L 700 40 L 712 46 L 726 40 L 742 46 L 756 44 C 772 56 790 74 808 92 L 792 84 L 780 100 L 764 82 L 750 102 L 734 84 L 720 104 L 704 86 L 690 100 L 676 86 L 660 98 L 646 88 C 664 70 678 54 690 44 Z" />
        </g>
      );
    }
    case 'volcano':
      return (
        <>
          <g className="um-cloud" opacity="0.85">
            <circle cx="606" cy="72" r="20" />
            <circle cx="634" cy="50" r="26" />
            <circle cx="676" cy="34" r="30" />
            <circle cx="724" cy="30" r="25" />
            <circle cx="764" cy="38" r="19" />
            <circle cx="796" cy="48" r="13" />
          </g>
          <path fill={`url(#${ids.fuji})`} d="M 236 240 C 340 222 420 172 484 122 L 522 98 L 560 106 L 596 92 L 656 100 L 700 126 C 780 182 884 226 1010 240 Z" />
          <path className="um-h1" opacity="0.35" d="M 522 98 L 560 106 L 596 92 L 656 100 L 700 126 C 660 120 630 124 600 116 C 570 124 540 112 522 98 Z" />
        </>
      );
    case 'torii':
      return (
        <>
          <path className="um-h2" d="M 300 240 C 360 200 440 150 520 132 C 580 118 640 110 700 122 C 780 138 860 186 940 240 Z" />
          <Pine x={470} y={150} s={0.8} tone={2} />
          <Pine x={770} y={150} s={0.8} tone={2} />
          <g>
            <path className="um-shu-dark" d="M 562 176 Q 620 164 678 176 L 677 181 Q 620 170 563 181 Z" />
            <path className="um-shu" d="M 556 166 Q 620 152 684 166 L 682 176 Q 620 163 558 176 Z" />
            <path className="um-shu" d="M 584 180 L 594 180 L 596 240 L 580 240 Z" />
            <path className="um-shu" d="M 646 180 L 656 180 L 660 240 L 644 240 Z" />
            <rect className="um-shu" x="572" y="194" width="96" height="8" />
            <rect className="um-shu-dark" x="615" y="181" width="10" height="13" />
            <rect className="um-shu-dark" x="572" y="200" width="96" height="2" />
          </g>
        </>
      );
    case 'meoto':
      return (
        <>
          {/* 夫婦岩としめ縄 */}
          <path className="um-h1" d="M 520 240 C 522 206 538 176 562 168 C 586 162 604 184 610 212 C 613 226 614 234 614 240 Z" />
          <path className="um-h1" d="M 668 240 C 670 222 680 208 694 206 C 708 206 716 220 718 240 Z" />
          <path d="M 574 170 C 610 196 660 208 694 206" fill="none" stroke="#e6c266" strokeWidth="3.4" strokeLinecap="round" />
          <g stroke="#f4ecd8" strokeWidth="2" strokeLinecap="round">
            <path d="M 606 188 v10" /><path d="M 630 198 v10" /><path d="M 656 204 v10" />
          </g>
          <g className="um-shu">
            <path d="M 552 158 Q 562 154 572 158 L 571 161 Q 562 158 553 161 Z" />
            <rect x="555" y="160" width="2.4" height="10" /><rect x="566.6" y="160" width="2.4" height="10" />
          </g>
        </>
      );
    case 'lighthouse':
      return (
        <>
          <path className="um-h1" d="M 820 240 C 870 212 940 198 1020 200 C 1096 202 1160 216 1200 226 L 1200 240 Z" />
          <path className="um-snow" d="M 884 200 L 890 138 L 906 138 L 912 200 Z" />
          <rect className="um-h1" x="887" y="126" width="22" height="13" rx="2" />
          <path className="um-shu" d="M 884 126 L 898 114 L 912 126 Z" />
          <rect className="um-kinfill" x="892" y="129" width="12" height="7" />
          <path className="um-h1" opacity="0.35" d="M 900 138 L 906 138 L 912 200 L 902 200 Z" />
        </>
      );
    case 'bridge':
      return (
        <g>
          {/* 五連の太鼓橋 */}
          {[412, 532, 652, 772].map(x => <path key={x} className="um-h1" d={`M ${x - 9} 240 L ${x - 7} 212 L ${x + 7} 212 L ${x + 9} 240 Z`} />)}
          <g fill="none" stroke="#7a5326" strokeWidth="7" strokeLinecap="round">
            <path d="M 292 224 Q 352 196 412 212" /><path d="M 412 212 Q 472 176 532 212" /><path d="M 532 212 Q 592 172 652 212" /><path d="M 652 212 Q 712 176 772 212" /><path d="M 772 212 Q 832 196 892 224" />
          </g>
          <g fill="none" stroke="#c99a52" strokeWidth="2" strokeLinecap="round">
            <path d="M 292 218 Q 352 190 412 206" /><path d="M 412 206 Q 472 170 532 206" /><path d="M 532 206 Q 592 166 652 206" /><path d="M 652 206 Q 712 170 772 206" /><path d="M 772 206 Q 832 190 892 218" />
          </g>
        </g>
      );
  }
}

interface BackdropProps {
  base: StageBase;
  landmark: StageLandmark;
}

/** 遠景の一枚絵 */
function Backdrop({ base: baseKind, landmark: landmarkKind }: BackdropProps) {
  const uid = useId().replace(/:/g, '');
  const mist = `um-mist-${uid}`;
  const fuji = `um-fuji-${uid}`;
  // 山の名所は土台の奥に、海の名所は手前に置く
  const behind = landmarkKind === 'fuji' || landmarkKind === 'volcano';
  const mark = landmark(landmarkKind, baseKind === 'open', { fuji });
  return (
    <svg className="um-far" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id={mist} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="um-stop-mist" stopOpacity="0" />
          <stop offset="1" className="um-stop-mist" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={fuji} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="um-stop-h2" />
          <stop offset="0.55" className="um-stop-h3" />
          <stop offset="1" className="um-stop-mist" />
        </linearGradient>
      </defs>
      {behind && mark}
      {base(baseKind, mist)}
      {!behind && mark}
    </svg>
  );
}

export default memo(Backdrop);
