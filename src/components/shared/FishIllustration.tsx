import { useId } from 'react';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishAppearance, FishBodyShape, FishFinStyle } from '../../game/types';

const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));

interface FishIllustrationProps {
  fishId: string;
  width?: number;
  height?: number;
  silhouette?: boolean;
  className?: string;
}

// ===== 色ユーティリティ =====
function darken(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - a)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - a)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - a)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
function lighten(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * a));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * a));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * a));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ===== 有機的な魚（標準/細長/丸/平）の構成データ =====
interface FinnedConfig {
  body: string;        // 体のシルエット（頭=左, 尾=右）
  belly: string;       // 腹側のハイライト領域（薄く明るく）
  lateral: string;     // 体側線
  tail: string;        // 尾びれ（二又/扇）
  pedX: number;        // 尾の付け根X（ひれ条の起点）
  tailTips: [number, number][]; // 尾びれ条の先端
  dorsal: { x0: number; y0: number; x1: number; y1: number; peak: number };
  anal: { x0: number; y0: number; x1: number; y1: number; dip: number } | null;
  pelvic: [number, number] | null;
  pectoral: { x: number; y: number };
  operc: string;       // えら蓋の曲線
  mouth: string;       // 口
  eye: { cx: number; cy: number; r: number };
}

const FINNED: Record<'standard' | 'elongated' | 'round' | 'flat', FinnedConfig> = {
  standard: {
    body: 'M 12,41 C 14,30 24,21 40,19 C 58,17 78,21 91,33 C 94,37 94,45 91,48 C 78,60 58,63 40,61 C 24,59 14,52 12,41 Z',
    belly: 'M 16,45 C 24,55 42,58 60,57 C 76,56 86,52 92,46 C 88,55 76,60 60,61 C 42,62 24,59 16,45 Z',
    lateral: 'M 20,40 C 36,38 60,38 88,40',
    tail: 'M 90,34 C 100,30 108,25 117,18 C 113,29 110,36 106,40 C 110,44 113,51 117,62 C 108,55 100,50 90,46 Z',
    pedX: 91,
    tailTips: [[117, 18], [106, 40], [117, 62]],
    dorsal: { x0: 40, y0: 20, x1: 80, y1: 22, peak: 7 },
    anal: { x0: 56, y0: 60, x1: 78, y1: 50, dip: 70 },
    pelvic: [42, 59],
    pectoral: { x: 34, y: 45 },
    operc: 'M 27,23 Q 22,41 27,59',
    mouth: 'M 9,40 Q 12,39 16,41',
    eye: { cx: 24, cy: 35, r: 3 },
  },
  elongated: {
    body: 'M 6,41 C 10,33 24,28 46,27 C 68,26 86,30 97,36 C 100,39 100,44 97,46 C 86,52 68,55 46,54 C 24,53 10,49 6,41 Z',
    belly: 'M 10,44 C 24,50 46,52 70,51 C 84,50 94,48 98,44 C 94,50 82,53 68,54 C 50,55 28,54 10,44 Z',
    lateral: 'M 14,41 C 36,40 64,40 96,41',
    tail: 'M 96,36 C 105,32 111,27 118,20 C 114,31 112,37 108,41 C 112,45 114,51 118,62 C 111,55 105,50 96,46 Z',
    pedX: 97,
    tailTips: [[118, 20], [108, 41], [118, 62]],
    dorsal: { x0: 46, y0: 28, x1: 84, y1: 30, peak: 5 },
    anal: { x0: 60, y0: 53, x1: 84, y1: 46, dip: 60 },
    pelvic: [44, 52],
    pectoral: { x: 30, y: 44 },
    operc: 'M 22,30 Q 18,41 22,52',
    mouth: 'M 3,40 Q 7,39 11,41',
    eye: { cx: 19, cy: 37, r: 2.6 },
  },
  round: {
    body: 'M 16,42 C 18,25 34,15 55,15 C 77,15 90,27 92,41 C 90,56 77,68 55,68 C 34,68 18,59 16,42 Z',
    belly: 'M 20,48 C 28,60 44,66 58,66 C 76,66 88,58 92,46 C 86,60 74,68 58,68 C 40,68 24,62 20,48 Z',
    lateral: 'M 22,42 C 38,40 64,40 90,42',
    tail: 'M 90,37 C 98,32 105,32 111,35 C 107,39 107,43 111,47 C 105,50 98,50 90,45 Z',
    pedX: 91,
    tailTips: [[111, 35], [111, 47]],
    dorsal: { x0: 44, y0: 16, x1: 74, y1: 18, peak: 6 },
    anal: { x0: 50, y0: 67, x1: 76, y1: 56, dip: 76 },
    pelvic: [44, 66],
    pectoral: { x: 36, y: 48 },
    operc: 'M 32,21 Q 26,42 32,62',
    mouth: 'M 13,42 Q 17,41 21,43',
    eye: { cx: 32, cy: 33, r: 3.4 },
  },
  flat: {
    body: 'M 12,46 C 16,31 36,25 60,25 C 84,25 99,35 101,46 C 99,58 84,67 60,67 C 36,67 16,61 12,46 Z',
    belly: 'M 16,52 C 30,62 52,66 70,65 C 86,64 96,58 100,50 C 92,62 76,67 60,67 C 40,67 24,63 16,52 Z',
    lateral: 'M 18,46 C 38,44 70,44 100,46',
    tail: 'M 99,42 C 106,38 112,39 117,42 C 112,45 112,48 117,51 C 112,54 106,55 99,50 Z',
    pedX: 100,
    tailTips: [[117, 42], [117, 51]],
    dorsal: { x0: 24, y0: 28, x1: 92, y1: 32, peak: 4 },
    anal: { x0: 24, y0: 64, x1: 92, y1: 60, dip: 70 },
    pelvic: null,
    pectoral: { x: 40, y: 50 },
    operc: 'M 26,30 Q 22,46 26,62',
    mouth: 'M 9,46 Q 13,45 17,47',
    eye: { cx: 26, cy: 40, r: 3 },
  },
};

// 背びれ（finStyle で高さ・形が変わる膜＋ひれ条＋膜のグラデーション）
function dorsalFin(d: FinnedConfig['dorsal'], style: FishFinStyle, accent: string, stroke: string, finGrad: string) {
  const mx = (d.x0 + d.x1) / 2;
  const mult = style === 'large' ? 2.1 : style === 'long' ? 1.6 : style === 'small' ? 0.55 : 1;
  const peakY = Math.min(d.y0, d.y1) - d.peak * mult;
  if (style === 'spiky') {
    const n = 6;
    let pts = `M ${d.x0},${d.y0} `;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const x = d.x0 + (d.x1 - d.x0) * t;
      pts += `L ${x - 2},${d.y0 + (d.y1 - d.y0) * t - d.peak * 1.7} L ${x},${d.y0 + (d.y1 - d.y0) * t} `;
    }
    pts += `L ${d.x1},${d.y1} Z`;
    return (
      <>
        <path d={pts} fill={finGrad} opacity="0.9" stroke={stroke} strokeWidth="0.45" strokeLinejoin="round" />
        <path d={pts} fill="none" stroke={darken(accent, 0.3)} strokeWidth="0.35" opacity="0.5" />
      </>
    );
  }
  const membrane = `M ${d.x0},${d.y0} Q ${mx},${peakY} ${d.x1},${d.y1} Z`;
  const rays = [0.18, 0.36, 0.54, 0.72].map((t, i) => {
    const bx = d.x0 + (d.x1 - d.x0) * t;
    const by = d.y0 + (d.y1 - d.y0) * t;
    const ty = by - (by - peakY) * 0.85;
    return <line key={i} x1={bx} y1={by} x2={bx} y2={ty} stroke={stroke} strokeWidth="0.45" opacity="0.55" strokeLinecap="round" />;
  });
  return (
    <>
      <path d={membrane} fill={finGrad} opacity="0.8" stroke={stroke} strokeWidth="0.45" strokeLinejoin="round" />
      {rays}
    </>
  );
}

function FinnedFish({
  cfg, bodyFill, stroke, accent, finStyle, scaleFill, patternFill, sheenFill, bellyFill, finGrad,
}: {
  cfg: FinnedConfig; bodyFill: string; stroke: string; accent: string; finStyle: FishFinStyle;
  scaleFill?: string; patternFill?: string; sheenFill: string; bellyFill: string; finGrad: string;
}) {
  const tailRayStroke = darken(accent, 0.2);
  return (
    <>
      {/* 後方のひれ（体の後ろ）— 尾びれは膜＋筋を表現 */}
      <path d={cfg.tail} fill={finGrad} opacity="0.95" stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
      {cfg.tailTips.map((t, i) => (
        <line key={i} x1={cfg.pedX} y1={40} x2={t[0]} y2={t[1]} stroke={tailRayStroke} strokeWidth="0.45" opacity="0.6" strokeLinecap="round" />
      ))}
      {dorsalFin(cfg.dorsal, finStyle, accent, stroke, finGrad)}
      {cfg.anal && (
        <>
          <path d={`M ${cfg.anal.x0},${cfg.anal.y0} Q ${(cfg.anal.x0 + cfg.anal.x1) / 2},${cfg.anal.dip} ${cfg.anal.x1},${cfg.anal.y1} Z`} fill={finGrad} opacity="0.7" stroke={stroke} strokeWidth="0.4" />
          <line x1={(cfg.anal.x0 + cfg.anal.x1) / 2 - 4} y1={cfg.anal.dip - 2} x2={(cfg.anal.x0 + cfg.anal.x1) / 2 + 4} y2={cfg.anal.dip - 2} stroke={stroke} strokeWidth="0.3" opacity="0.4" />
        </>
      )}
      {cfg.pelvic && (
        <path d={`M ${cfg.pelvic[0]},${cfg.pelvic[1]} Q ${cfg.pelvic[0] + 4},${cfg.pelvic[1] + 8} ${cfg.pelvic[0] + 9},${cfg.pelvic[1] + 1} Z`} fill={accent} opacity="0.6" stroke={stroke} strokeWidth="0.35" />
      )}

      {/* 体（メインのグラデーション） */}
      <path d={cfg.body} fill={bodyFill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* 腹側のハイライト */}
      <path d={cfg.belly} fill={bellyFill} opacity="0.9" />

      {/* うろこ / 模様 / 照り（体のシルエットでマスク） */}
      {scaleFill && <path d={cfg.body} fill={scaleFill} />}
      {patternFill && <path d={cfg.body} fill={patternFill} />}

      {/* 体側線 (lateral line) */}
      <path d={cfg.lateral} fill="none" stroke={darken(accent, 0.2)} strokeWidth="0.45" opacity="0.45" strokeLinecap="round" strokeDasharray="0.5 1.4" />

      {/* えら蓋 */}
      <path d={cfg.operc} fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />

      {/* 体上面の照り */}
      <path d={cfg.body} fill={sheenFill} />

      {/* 口 */}
      <path d={cfg.mouth} fill="none" stroke={stroke} strokeWidth="0.85" opacity="0.85" strokeLinecap="round" />

      {/* 胸びれ（体の前） */}
      <path d={`M ${cfg.pectoral.x},${cfg.pectoral.y} Q ${cfg.pectoral.x + 7},${cfg.pectoral.y + 11} ${cfg.pectoral.x + 15},${cfg.pectoral.y + 3} Q ${cfg.pectoral.x + 8},${cfg.pectoral.y + 3} ${cfg.pectoral.x + 3},${cfg.pectoral.y} Z`} fill={finGrad} opacity="0.75" stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      <line x1={cfg.pectoral.x + 2} y1={cfg.pectoral.y + 1} x2={cfg.pectoral.x + 11} y2={cfg.pectoral.y + 7} stroke={stroke} strokeWidth="0.35" opacity="0.5" strokeLinecap="round" />
      <line x1={cfg.pectoral.x + 4} y1={cfg.pectoral.y + 3} x2={cfg.pectoral.x + 13} y2={cfg.pectoral.y + 6} stroke={stroke} strokeWidth="0.3" opacity="0.4" strokeLinecap="round" />

      {/* 目（虹彩＋瞳孔＋ハイライト） */}
      <circle cx={cfg.eye.cx} cy={cfg.eye.cy} r={cfg.eye.r + 0.4} fill={darken(accent, 0.4)} opacity="0.55" />
      <circle cx={cfg.eye.cx} cy={cfg.eye.cy} r={cfg.eye.r} fill="#fffefb" />
      <circle cx={cfg.eye.cx + 0.5} cy={cfg.eye.cy + 0.1} r={cfg.eye.r * 0.7} fill={lighten(accent, 0.2)} opacity="0.55" />
      <circle cx={cfg.eye.cx + 0.7} cy={cfg.eye.cy - 0.3} r={cfg.eye.r * 0.5} fill="#0e0e0e" />
      <circle cx={cfg.eye.cx - 0.4} cy={cfg.eye.cy - 0.9} r={cfg.eye.r * 0.28} fill="#fff" />
      <circle cx={cfg.eye.cx + 1.1} cy={cfg.eye.cy + 0.7} r={cfg.eye.r * 0.16} fill="#fff" opacity="0.8" />
    </>
  );
}

// ===== うなぎ（蛇行する細長い魚） =====
const EEL_BODY = 'M 5,40 C 8,32 16,30 28,31 C 52,33 76,30 99,33 C 110,34 117,37 117,41 C 117,45 110,47 99,48 C 76,50 52,47 28,49 C 16,50 8,48 5,40 Z';
const EEL_BELLY = 'M 8,43 C 22,48 46,47 70,47 C 90,47 106,46 116,42 C 108,46 92,49 70,50 C 46,51 22,51 8,43 Z';
function EelFish({ bodyFill, stroke, accent, sheenFill, scaleFill, patternFill, bellyFill }: { bodyFill: string; stroke: string; accent: string; sheenFill: string; scaleFill?: string; patternFill?: string; bellyFill: string }) {
  return (
    <>
      <path d="M 26,31 C 50,26 76,27 104,32 C 96,33 74,32 50,33 C 38,33 30,33 26,33 Z" fill={accent} opacity="0.55" stroke={stroke} strokeWidth="0.35" />
      <path d="M 26,49 C 50,54 76,53 104,48 C 96,47 74,48 50,47 C 38,47 30,47 26,47 Z" fill={accent} opacity="0.5" stroke={stroke} strokeWidth="0.35" />
      <path d={EEL_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={EEL_BELLY} fill={bellyFill} opacity="0.85" />
      {scaleFill && <path d={EEL_BODY} fill={scaleFill} />}
      {patternFill && <path d={EEL_BODY} fill={patternFill} />}
      <path d="M 18,34 Q 14,40 18,47" fill="none" stroke={stroke} strokeWidth="0.55" opacity="0.4" strokeLinecap="round" />
      <path d="M 18,40 C 50,38 100,42 116,41" fill="none" stroke={darken(accent, 0.2)} strokeWidth="0.4" opacity="0.4" strokeDasharray="0.5 1.4" />
      <path d={EEL_BODY} fill={sheenFill} />
      <path d="M 4,41 Q 8,40 12,41" fill="none" stroke={stroke} strokeWidth="0.85" opacity="0.85" strokeLinecap="round" />
      <circle cx="13" cy="38" r="3" fill={darken(accent, 0.4)} opacity="0.5" />
      <circle cx="13" cy="38" r="2.6" fill="#fffefb" />
      <circle cx="13.6" cy="37.6" r="1.5" fill="#0e0e0e" />
      <circle cx="12.4" cy="37" r="0.75" fill="#fff" />
    </>
  );
}

// ===== イカ (squid) =====
// 横向き構図。頭部が左、外套膜が右に伸びる細長い砲弾型。
// 後部に左右対称の三角ヒレ、頭部から10本の触腕（うち2本は長い触腕）。
const SQUID_SIL = 'M 28,30 Q 46,18 72,22 Q 92,26 108,36 Q 114,40 108,44 Q 92,54 72,58 Q 46,62 28,50 Q 18,40 28,30 Z';

function SquidBody({ bodyFill, stroke, accent, sheenFill, bellyFill, patternFill }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; patternFill?: string;
}) {
  const darkA = darken(accent, 0.25);
  // 腕は左へ伸びる。下から上へやや弧を描く
  const armBases: Array<[number, number, number, number, number]> = [
    // [baseX, baseY, tipX, tipY, control(midOffset)]
    [22, 32, 4, 22, -3],
    [22, 36, 2, 30, -2],
    [22, 39, 1, 38, -1],
    [22, 42, 1, 46, 1],
    [22, 45, 2, 54, 2],
    [22, 48, 4, 60, 3],
    // 長い触腕（先端にspade状膨らみ）
    [22, 34, -3, 14, -4],
    [22, 46, -3, 64, 4],
  ];
  return (
    <>
      {/* 後部の三角ヒレ（左右対称、外套膜の後端付近） */}
      <path d="M 88,24 Q 112,12 116,22 Q 110,28 92,30 Z" fill={darkA} opacity="0.85" stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 88,56 Q 112,68 116,58 Q 110,52 92,50 Z" fill={darkA} opacity="0.85" stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 92,26 Q 104,22 112,18" fill="none" stroke={stroke} strokeWidth="0.35" opacity="0.45" strokeLinecap="round" />
      <path d="M 92,54 Q 104,58 112,62" fill="none" stroke={stroke} strokeWidth="0.35" opacity="0.45" strokeLinecap="round" />

      {/* 触腕 (8本+触腕2本) */}
      {armBases.map(([bx, by, tx, ty, mid], i) => {
        const mx = (bx + tx) / 2;
        const my = (by + ty) / 2 + mid;
        const isLong = i >= 6;
        return (
          <g key={`a${i}`}>
            <path d={`M ${bx},${by} Q ${mx},${my} ${tx},${ty}`} fill="none" stroke={stroke} strokeWidth={isLong ? 1.4 : 1.1} strokeLinecap="round" opacity="0.85" />
            {/* 吸盤ラインの簡易（白っぽい点をいくつか） */}
            <path d={`M ${bx},${by} Q ${mx},${my} ${tx},${ty}`} fill="none" stroke={lighten(accent, 0.4)} strokeWidth={isLong ? 0.5 : 0.45} strokeLinecap="round" opacity="0.55" strokeDasharray="0.3 1.0" />
            {/* 長い触腕の先端はパドル状 */}
            {isLong && <ellipse cx={tx} cy={ty} rx="1.6" ry="2.4" fill={accent} opacity="0.85" stroke={stroke} strokeWidth="0.35" />}
          </g>
        );
      })}

      {/* 外套膜（砲弾型） */}
      <path d={SQUID_SIL} fill={bodyFill} stroke={stroke} strokeWidth="1.55" strokeLinejoin="round" />
      {/* 腹のハイライト */}
      <path d="M 32,48 Q 60,58 88,52 C 76,58 56,60 32,48 Z" fill={bellyFill} opacity="0.75" />
      {/* 模様 */}
      {patternFill && <path d={SQUID_SIL} fill={patternFill} />}
      {/* 体の縦線（イカらしい色素細胞のテクスチャ） */}
      {[40, 56, 72, 88].map((x, i) => (
        <line key={`v${i}`} x1={x} y1={30 + (x - 40) * 0.05} x2={x} y2={50 - (x - 40) * 0.05} stroke={darkA} strokeWidth="0.35" opacity="0.4" strokeDasharray="0.6 1.4" />
      ))}
      {/* 漏斗（funnel） */}
      <path d="M 26,40 Q 22,38 20,40 Q 22,42 26,40 Z" fill={darken(accent, 0.4)} opacity="0.7" stroke={stroke} strokeWidth="0.35" />

      {/* 頭部の輪郭（外套と頭の境目を強調） */}
      <path d="M 28,30 Q 26,40 28,50" fill="none" stroke={stroke} strokeWidth="0.55" opacity="0.55" strokeLinecap="round" />

      {/* 大きな目（イカの特徴。横長楕円＋虹彩＋W字瞳孔） */}
      <ellipse cx="34" cy="40" rx="4.2" ry="3.3" fill={darken(accent, 0.5)} opacity="0.5" />
      <ellipse cx="34" cy="40" rx="3.8" ry="2.9" fill="#fffefb" />
      <ellipse cx="34" cy="40" rx="2.8" ry="2.2" fill={lighten(accent, 0.05)} opacity="0.85" />
      <path d="M 31.5,40 Q 32.8,38.2 34,40 Q 35.2,38.2 36.5,40 Q 35.2,41.8 34,40 Q 32.8,41.8 31.5,40 Z" fill="#0e0e0e" />
      <circle cx="32.6" cy="38.6" r="0.7" fill="#fff" />
      <circle cx="35.6" cy="41.2" r="0.4" fill="#fff" opacity="0.7" />

      {/* 照り */}
      <path d={SQUID_SIL} fill={sheenFill} />
    </>
  );
}

function OctopusBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <path d="M 30,58 Q 22,74 14,75 Q 11,72 18,63 Q 22,57 28,56" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 42,62 Q 38,78 31,79 Q 27,76 34,67 Q 38,61 40,60" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 56,62 Q 57,79 49,81 Q 45,78 50,67 Q 53,61 54,60" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 68,58 Q 73,75 66,77 Q 61,74 66,65 Q 69,58 68,56" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 78,52 Q 87,67 82,71 Q 77,68 78,59 Q 78,53 76,50" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 22,54 Q 11,65 7,62 Q 7,57 14,53 Q 18,49 22,50" fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="50" cy="35" rx="38" ry="27" fill={fill} stroke={stroke} strokeWidth="1.5" />
    </>
  );
}

// ===== カニ (crab) =====
// 横長の甲羅・8本の多関節脚・大きなハサミ2本・柄付きの目。
const CRAB_SHELL = 'M 22,42 Q 28,26 50,24 Q 72,26 78,42 Q 72,56 50,58 Q 28,56 22,42 Z';
function CrabBody({ bodyFill, stroke, accent, sheenFill, bellyFill, patternFill }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; patternFill?: string;
}) {
  const darkA = darken(accent, 0.3);
  const lightA = lighten(accent, 0.2);
  // 8本の脚 (左4 + 右4)。各脚は3つの節（4点ライン）で関節を表現
  const legs: Array<[number, number, number, number, number, number, number, number]> = [
    // 左4本
    [28, 44, 18, 50, 10, 58, 4, 64],
    [30, 49, 19, 56, 11, 64, 5, 70],
    [32, 53, 21, 62, 13, 70, 7, 75],
    [34, 56, 24, 66, 17, 73, 12, 77],
    // 右4本
    [72, 44, 82, 50, 90, 58, 96, 64],
    [70, 49, 81, 56, 89, 64, 95, 70],
    [68, 53, 79, 62, 87, 70, 93, 75],
    [66, 56, 76, 66, 83, 73, 88, 77],
  ];
  return (
    <>
      {/* 脚（影） */}
      {legs.map(([bx, by, kx, ky, kx2, ky2, tx, ty], i) => (
        <g key={`l${i}`}>
          <path d={`M ${bx},${by} L ${kx},${ky} L ${kx2},${ky2} L ${tx},${ty}`} fill="none" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round" />
          <path d={`M ${bx},${by} L ${kx},${ky} L ${kx2},${ky2} L ${tx},${ty}`} fill="none" stroke={accent} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
          <path d={`M ${bx},${by} L ${kx},${ky} L ${kx2},${ky2}`} fill="none" stroke={lightA} strokeWidth="0.5" opacity="0.55" strokeLinejoin="round" strokeLinecap="round" />
          {/* 関節 */}
          <circle cx={kx} cy={ky} r="0.95" fill={darkA} />
          <circle cx={kx2} cy={ky2} r="0.85" fill={darkA} />
        </g>
      ))}

      {/* ハサミ（左） */}
      <g>
        {/* 腕（甲羅から伸びる） */}
        <path d="M 28,40 Q 18,36 10,30 L 13,26 Q 22,30 30,38 Z" fill={accent} stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="14" cy="29" r="1.0" fill={darkA} />
        {/* ハサミ本体 */}
        <path d="M 10,30 Q 4,28 2,22 Q 2,16 6,15 Q 12,16 14,22 Q 14,26 10,30 Z" fill={accent} stroke={stroke} strokeWidth="1.0" strokeLinejoin="round" />
        {/* 上の指（可動指） */}
        <path d="M 5,17 L 0,11 Q -1,9 1,9 L 8,15 Z" fill={accent} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
        {/* 下の指（固定指） */}
        <path d="M 9,21 L 0,21 Q -1,22 1,23 L 11,24 Z" fill={accent} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
        {/* 鋸歯（ハサミの内側） */}
        <path d="M 2,18 L 3,19 L 2,20 L 3,21" fill="none" stroke={stroke} strokeWidth="0.4" opacity="0.6" />
        {/* ハイライト */}
        <ellipse cx="6" cy="19" rx="3" ry="1.2" fill={lightA} opacity="0.55" />
      </g>

      {/* ハサミ（右） */}
      <g>
        <path d="M 72,40 Q 82,36 90,30 L 87,26 Q 78,30 70,38 Z" fill={accent} stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="86" cy="29" r="1.0" fill={darkA} />
        <path d="M 90,30 Q 96,28 98,22 Q 98,16 94,15 Q 88,16 86,22 Q 86,26 90,30 Z" fill={accent} stroke={stroke} strokeWidth="1.0" strokeLinejoin="round" />
        <path d="M 95,17 L 100,11 Q 101,9 99,9 L 92,15 Z" fill={accent} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M 91,21 L 100,21 Q 101,22 99,23 L 89,24 Z" fill={accent} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M 98,18 L 97,19 L 98,20 L 97,21" fill="none" stroke={stroke} strokeWidth="0.4" opacity="0.6" />
        <ellipse cx="94" cy="19" rx="3" ry="1.2" fill={lightA} opacity="0.55" />
      </g>

      {/* 甲羅 */}
      <path d={CRAB_SHELL} fill={bodyFill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      {/* 甲羅の腹側ハイライト */}
      <path d="M 26,50 Q 50,58 74,50 C 62,56 38,56 26,50 Z" fill={bellyFill} opacity="0.65" />
      {/* 模様 */}
      {patternFill && <path d={CRAB_SHELL} fill={patternFill} />}
      {/* 甲羅の縁のトゲ */}
      {[
        [25, 30], [31, 26], [38, 24.5], [50, 24], [62, 24.5], [69, 26], [75, 30],
      ].map(([x, y], i) => (
        <path key={`tk${i}`} d={`M ${x - 1.3},${y + 1.3} L ${x},${y - 2} L ${x + 1.3},${y + 1.3} Z`} fill={accent} stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      ))}
      {/* 甲羅の表面凹凸 (顆粒) */}
      {[[38, 36], [50, 33], [62, 36], [42, 44], [58, 44], [46, 40], [54, 40]].map(([x, y], i) => (
        <circle key={`gr${i}`} cx={x} cy={y} r="0.7" fill={darkA} opacity="0.55" />
      ))}
      {/* H字溝（ケガニ系の甲羅模様） */}
      <path d="M 40,38 L 40,46 M 60,38 L 60,46 M 40,42 L 60,42" fill="none" stroke={darkA} strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
      {/* 甲羅上面の照り */}
      <ellipse cx="50" cy="30" rx="20" ry="3.2" fill={lightA} opacity="0.45" />

      {/* 目柄＋目（甲羅の上から短く伸びる） */}
      <line x1="44" y1="26" x2="44" y2="20" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="56" y1="26" x2="56" y2="20" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="44" cy="18.5" r="1.8" fill={darkA} opacity="0.5" />
      <circle cx="44" cy="18.5" r="1.5" fill="#fffefb" stroke={stroke} strokeWidth="0.35" />
      <circle cx="44.3" cy="18.2" r="0.9" fill="#0e0e0e" />
      <circle cx="43.7" cy="17.8" r="0.32" fill="#fff" />
      <circle cx="56" cy="18.5" r="1.8" fill={darkA} opacity="0.5" />
      <circle cx="56" cy="18.5" r="1.5" fill="#fffefb" stroke={stroke} strokeWidth="0.35" />
      <circle cx="56.3" cy="18.2" r="0.9" fill="#0e0e0e" />
      <circle cx="55.7" cy="17.8" r="0.32" fill="#fff" />

      {/* 口器・触角 */}
      <line x1="48" y1="46" x2="46" y2="50" stroke={stroke} strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
      <line x1="52" y1="46" x2="54" y2="50" stroke={stroke} strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
      <path d="M 47,46 Q 50,48 53,46" fill="none" stroke={stroke} strokeWidth="0.55" opacity="0.7" strokeLinecap="round" />

      {/* 照り */}
      <path d={CRAB_SHELL} fill={sheenFill} />
    </>
  );
}

// ===== ナマズ (catfish) =====
// 平たい広い頭・4本のヒゲ・丸い尾びれ・小さな背びれ・長い尻びれ。
const CATFISH_BODY = 'M 8,40 C 10,30 22,22 38,22 C 60,22 80,28 96,35 C 100,38 100,44 96,47 C 80,54 60,58 38,58 C 22,58 10,50 8,40 Z';
function CatfishBody({ bodyFill, stroke, accent, sheenFill, bellyFill, finGrad, patternFill }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; finGrad: string; patternFill?: string;
}) {
  return (
    <>
      {/* 尾びれ（丸みのある扇形） */}
      <path d="M 96,40 C 106,32 114,30 118,35 C 114,40 114,42 118,47 C 114,52 106,50 96,42 Z" fill={finGrad} opacity="0.92" stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <line x1="96" y1="40" x2="116" y2="34" stroke={darken(accent, 0.2)} strokeWidth="0.35" opacity="0.5" strokeLinecap="round" />
      <line x1="96" y1="40" x2="118" y2="40" stroke={darken(accent, 0.2)} strokeWidth="0.35" opacity="0.45" strokeLinecap="round" />
      <line x1="96" y1="40" x2="116" y2="46" stroke={darken(accent, 0.2)} strokeWidth="0.35" opacity="0.5" strokeLinecap="round" />
      {/* 背びれ（中央上部に小さく） */}
      <path d="M 56,28 Q 64,18 72,28 L 70,32 Q 64,30 58,32 Z" fill={finGrad} opacity="0.85" stroke={stroke} strokeWidth="0.45" strokeLinejoin="round" />
      {/* 脂びれ（小さく後方） */}
      <path d="M 82,30 Q 86,26 90,30 L 89,32 Q 86,31 83,32 Z" fill={finGrad} opacity="0.75" stroke={stroke} strokeWidth="0.35" />
      {/* 尻びれ（長く下に） */}
      <path d="M 55,55 Q 72,62 90,55 L 88,52 Q 72,57 57,52 Z" fill={finGrad} opacity="0.78" stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      {/* 胸びれ */}
      <path d="M 28,50 Q 32,62 44,55 Q 38,48 30,48 Z" fill={finGrad} opacity="0.8" stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      <line x1="30" y1="50" x2="42" y2="56" stroke={stroke} strokeWidth="0.3" opacity="0.4" />
      {/* 体（平たい頭+太い胴） */}
      <path d={CATFISH_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.55" strokeLinejoin="round" />
      {/* 腹ハイライト */}
      <path d="M 12,46 C 32,55 64,57 92,50 C 70,56 36,58 12,46 Z" fill={bellyFill} opacity="0.85" />
      {/* 模様 */}
      {patternFill && <path d={CATFISH_BODY} fill={patternFill} />}
      {/* 体側線 */}
      <path d="M 18,42 C 40,40 70,40 92,42" fill="none" stroke={darken(accent, 0.2)} strokeWidth="0.4" opacity="0.4" strokeDasharray="0.5 1.4" />
      {/* ヒゲ4本（頭からゆるやかに伸びる） */}
      <path d="M 14,34 Q 8,29 4,28" fill="none" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.85" />
      <path d="M 14,37 Q 7,37 2,38" fill="none" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.85" />
      <path d="M 14,43 Q 7,44 2,46" fill="none" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.8" />
      <path d="M 14,46 Q 8,52 4,54" fill="none" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.8" />
      {/* 口（広く一文字） */}
      <path d="M 8,42 Q 14,44 22,42" fill="none" stroke={stroke} strokeWidth="0.95" opacity="0.9" strokeLinecap="round" />
      {/* 目（頭の上のほうに小さく） */}
      <circle cx="22" cy="33" r="2.0" fill={darken(accent, 0.4)} opacity="0.5" />
      <circle cx="22" cy="33" r="1.7" fill="#fffefb" />
      <circle cx="22.4" cy="32.8" r="0.95" fill="#0e0e0e" />
      <circle cx="21.8" cy="32.3" r="0.4" fill="#fff" />
      {/* 照り */}
      <path d={CATFISH_BODY} fill={sheenFill} />
    </>
  );
}

// ===== サメ (shark) =====
// 流線型・三角背びれ・月型尾びれ・鰓スリット5本。
const SHARK_BODY = 'M 4,40 C 8,28 22,20 44,20 C 68,20 88,28 99,40 C 88,52 68,58 44,58 C 22,58 8,50 4,40 Z';
function SharkBody({ bodyFill, stroke, accent, sheenFill, bellyFill, finGrad, patternFill }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; finGrad: string; patternFill?: string;
}) {
  const darkAccent = darken(accent, 0.25);
  return (
    <>
      {/* 尾びれ（典型的な月型 — 上葉が長く、下葉が短い） */}
      <path d="M 96,38 L 117,10 L 112,30 L 117,42 L 100,44 Z" fill={finGrad} stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
      <path d="M 100,44 L 113,54 L 107,44 Z" fill={finGrad} stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <line x1="99" y1="40" x2="115" y2="20" stroke={darkAccent} strokeWidth="0.4" opacity="0.55" strokeLinecap="round" />
      <line x1="99" y1="42" x2="111" y2="50" stroke={darkAccent} strokeWidth="0.35" opacity="0.5" strokeLinecap="round" />
      {/* 大きな三角背びれ */}
      <path d="M 50,22 L 66,4 L 72,24 Z" fill={finGrad} stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
      <line x1="58" y1="22" x2="66" y2="8" stroke={darkAccent} strokeWidth="0.4" opacity="0.5" />
      {/* 第二背びれ（後方の小さい） */}
      <path d="M 84,28 L 92,18 L 96,30 Z" fill={finGrad} stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      {/* 尻びれ */}
      <path d="M 80,52 L 88,62 L 94,52 Z" fill={finGrad} stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      {/* 腹びれ */}
      <path d="M 54,55 L 60,64 L 68,56 Z" fill={finGrad} opacity="0.85" stroke={stroke} strokeWidth="0.4" />
      {/* 胸びれ（大きく後方へ伸びる） */}
      <path d="M 32,46 L 20,64 L 52,54 Z" fill={finGrad} stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
      <line x1="32" y1="46" x2="24" y2="60" stroke={darkAccent} strokeWidth="0.4" opacity="0.5" />
      <line x1="32" y1="46" x2="48" y2="54" stroke={darkAccent} strokeWidth="0.35" opacity="0.4" />
      {/* 体 */}
      <path d={SHARK_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.55" strokeLinejoin="round" />
      {/* 腹の白（カウンターシェード） */}
      <path d="M 8,46 C 30,54 70,56 96,48 C 74,55 30,58 8,46 Z" fill={bellyFill} opacity="0.92" />
      {/* 模様 */}
      {patternFill && <path d={SHARK_BODY} fill={patternFill} />}
      {/* 体側線 */}
      <path d="M 14,40 C 40,38 74,38 96,40" fill="none" stroke={darkAccent} strokeWidth="0.4" opacity="0.45" strokeDasharray="0.6 1.6" />
      {/* 鰓スリット5本 */}
      {[0, 1, 2, 3, 4].map(i => (
        <path key={i} d={`M ${30 + i * 2.6},${34 + i * 0.4} Q ${30 + i * 2.6 + 0.6},${40} ${30 + i * 2.6},${46 - i * 0.4}`} fill="none" stroke={stroke} strokeWidth="0.55" opacity="0.55" strokeLinecap="round" />
      ))}
      {/* 口（半月型） */}
      <path d="M 4,44 Q 12,50 22,46" fill="none" stroke={stroke} strokeWidth="0.95" opacity="0.9" strokeLinecap="round" />
      {/* 歯（ジグザグ） */}
      <path d="M 6,46 L 8,49 L 10,46 L 12,49 L 14,46 L 16,48 L 18,46" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.7" strokeLinejoin="miter" />
      {/* 鼻孔 */}
      <ellipse cx="10" cy="38" rx="0.7" ry="0.4" fill={stroke} opacity="0.6" />
      {/* 目（小さく鋭く） */}
      <circle cx="22" cy="34" r="1.9" fill={darken(accent, 0.5)} opacity="0.5" />
      <circle cx="22" cy="34" r="1.6" fill="#fffefb" />
      <ellipse cx="22.3" cy="33.9" rx="0.55" ry="1.0" fill="#0e0e0e" />
      <circle cx="21.7" cy="33.4" r="0.4" fill="#fff" />
      {/* 照り */}
      <path d={SHARK_BODY} fill={sheenFill} />
    </>
  );
}

// ===== クジラ (whale) =====
// 巨大な丸い胴体・水平方向の尾びれ・潮吹き・お腹白・喉の畝。
const WHALE_BODY = 'M 4,42 C 8,28 22,18 50,18 C 78,18 95,28 98,42 C 95,55 78,62 50,62 C 22,62 8,55 4,42 Z';
function WhaleBody({ bodyFill, stroke, accent, sheenFill, bellyFill, finGrad, patternFill, silhouette }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; finGrad: string; patternFill?: string; silhouette: boolean;
}) {
  const spoutColor = silhouette ? '#aaa' : '#cfe6f5';
  return (
    <>
      {/* 尾びれ（横向きで斜め後ろ、扇型2葉） */}
      <path d="M 95,38 L 116,22 L 113,38 L 118,40 L 113,42 L 116,58 L 95,42 Z" fill={finGrad} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round" />
      <line x1="98" y1="40" x2="115" y2="26" stroke={darken(accent, 0.25)} strokeWidth="0.45" opacity="0.55" strokeLinecap="round" />
      <line x1="98" y1="40" x2="115" y2="54" stroke={darken(accent, 0.25)} strokeWidth="0.45" opacity="0.55" strokeLinecap="round" />
      {/* 体 */}
      <path d={WHALE_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      {/* 腹の白 */}
      <path d="M 10,48 C 28,60 70,62 92,52 C 70,60 28,62 10,48 Z" fill={bellyFill} opacity="0.92" />
      {/* 模様 */}
      {patternFill && <path d={WHALE_BODY} fill={patternFill} />}
      {/* 喉の畝（ヒゲクジラ） */}
      <path d="M 10,50 C 30,58 60,59 80,53" fill="none" stroke={darken(accent, 0.25)} strokeWidth="0.5" opacity="0.45" strokeLinecap="round" />
      <path d="M 10,53 C 28,59 58,60 76,55" fill="none" stroke={darken(accent, 0.25)} strokeWidth="0.45" opacity="0.4" strokeLinecap="round" />
      <path d="M 10,56 C 26,60 54,61 72,57" fill="none" stroke={darken(accent, 0.25)} strokeWidth="0.4" opacity="0.35" strokeLinecap="round" />
      {/* 胸びれ（大きく前下に伸びる） */}
      <path d="M 32,52 Q 26,68 36,70 Q 42,62 38,52 Z" fill={finGrad} opacity="0.9" stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
      <line x1="34" y1="54" x2="34" y2="66" stroke={darken(accent, 0.25)} strokeWidth="0.35" opacity="0.5" />
      {/* 背中の小さな背びれ（ザトウクジラ風） */}
      <path d="M 70,22 Q 74,18 78,24 Q 76,25 72,25 Z" fill={finGrad} opacity="0.85" stroke={stroke} strokeWidth="0.45" strokeLinejoin="round" />
      {/* 潮吹き穴 */}
      <ellipse cx="26" cy="22" rx="2.0" ry="0.9" fill={stroke} opacity="0.75" />
      {/* 潮吹き */}
      <path d="M 26,20 Q 22,12 19,6" fill="none" stroke={spoutColor} strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
      <path d="M 26,20 Q 28,12 30,6" fill="none" stroke={spoutColor} strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
      <path d="M 26,20 Q 26,12 25,4" fill="none" stroke={spoutColor} strokeWidth="1.0" opacity="0.6" strokeLinecap="round" />
      <circle cx="20" cy="6" r="0.7" fill={spoutColor} opacity="0.55" />
      <circle cx="30" cy="6" r="0.7" fill={spoutColor} opacity="0.55" />
      {/* 目 */}
      <circle cx="14" cy="42" r="1.7" fill={darken(accent, 0.5)} opacity="0.5" />
      <circle cx="14" cy="42" r="1.4" fill="#fffefb" />
      <circle cx="14.4" cy="41.6" r="0.8" fill="#0e0e0e" />
      <circle cx="13.7" cy="41.0" r="0.35" fill="#fff" />
      {/* 口（長い一文字） */}
      <path d="M 4,48 Q 16,52 30,48" fill="none" stroke={stroke} strokeWidth="0.95" opacity="0.85" strokeLinecap="round" />
      {/* 照り */}
      <path d={WHALE_BODY} fill={sheenFill} />
    </>
  );
}

// ===== エイ (ray) =====
// 上から見た菱形（マンタ風）・大きな翼・長い尾。
const RAY_BODY = 'M 10,40 Q 22,12 50,18 Q 78,12 90,40 Q 78,68 50,62 Q 22,68 10,40 Z';
function RayBody({ bodyFill, stroke, accent, sheenFill, patternFill }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; patternFill?: string;
}) {
  const darkAccent = darken(accent, 0.25);
  return (
    <>
      {/* 尾（長く後ろに伸びる） */}
      <path d="M 80,40 Q 95,42 110,38 L 113,39 Q 100,44 80,42 Z" fill={bodyFill} stroke={stroke} strokeWidth="0.65" strokeLinejoin="round" />
      <line x1="111" y1="38" x2="117" y2="34" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.85" />
      <line x1="112" y1="40" x2="118" y2="40" stroke={stroke} strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
      {/* 体（菱形） */}
      <path d={RAY_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 翼の縁のディテール（羽のような波） */}
      <path d="M 14,40 Q 20,30 28,33" fill="none" stroke={darkAccent} strokeWidth="0.45" opacity="0.5" strokeLinecap="round" />
      <path d="M 14,40 Q 20,50 28,47" fill="none" stroke={darkAccent} strokeWidth="0.45" opacity="0.5" strokeLinecap="round" />
      <path d="M 86,40 Q 80,30 72,33" fill="none" stroke={darkAccent} strokeWidth="0.45" opacity="0.5" strokeLinecap="round" />
      <path d="M 86,40 Q 80,50 72,47" fill="none" stroke={darkAccent} strokeWidth="0.45" opacity="0.5" strokeLinecap="round" />
      {/* 翼の筋（骨格風） */}
      {[0, 1, 2, 3].map(i => {
        const angle = -0.35 + i * 0.18;
        const x = 50 + Math.cos(angle + Math.PI) * 32;
        const y = 40 + Math.sin(angle) * 18;
        return <line key={`lf${i}`} x1="50" y1="40" x2={x} y2={y} stroke={darkAccent} strokeWidth="0.35" opacity="0.35" strokeLinecap="round" />;
      })}
      {[0, 1, 2, 3].map(i => {
        const angle = -0.35 + i * 0.18;
        const x = 50 + Math.cos(angle) * 32;
        const y = 40 + Math.sin(angle) * 18;
        return <line key={`rf${i}`} x1="50" y1="40" x2={x} y2={y} stroke={darkAccent} strokeWidth="0.35" opacity="0.35" strokeLinecap="round" />;
      })}
      {/* 模様 */}
      {patternFill && <path d={RAY_BODY} fill={patternFill} />}
      {/* 中央の隆起（背骨ライン） */}
      <line x1="22" y1="40" x2="78" y2="40" stroke={darkAccent} strokeWidth="0.5" opacity="0.45" strokeLinecap="round" />
      {/* セファロフィン（マンタの頭の角） */}
      <path d="M 42,20 Q 40,14 36,12" fill="none" stroke={stroke} strokeWidth="1.0" opacity="0.7" strokeLinecap="round" />
      <path d="M 58,20 Q 60,14 64,12" fill="none" stroke={stroke} strokeWidth="1.0" opacity="0.7" strokeLinecap="round" />
      <circle cx="36" cy="12" r="0.8" fill={stroke} opacity="0.6" />
      <circle cx="64" cy="12" r="0.8" fill={stroke} opacity="0.6" />
      {/* 鰓スリット5本（中央寄り） */}
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={44 + i * 3} y1="34" x2={45 + i * 3} y2="42" stroke={stroke} strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      ))}
      {/* 口 */}
      <path d="M 44,28 Q 50,30 56,28" fill="none" stroke={stroke} strokeWidth="0.85" opacity="0.8" strokeLinecap="round" />
      {/* 目（両側上に） */}
      <circle cx="38" cy="24" r="1.6" fill={darken(accent, 0.5)} opacity="0.5" />
      <circle cx="38" cy="24" r="1.3" fill="#fffefb" />
      <circle cx="38.3" cy="23.8" r="0.7" fill="#0e0e0e" />
      <circle cx="62" cy="24" r="1.6" fill={darken(accent, 0.5)} opacity="0.5" />
      <circle cx="62" cy="24" r="1.3" fill="#fffefb" />
      <circle cx="62.3" cy="23.8" r="0.7" fill="#0e0e0e" />
      {/* 照り */}
      <path d={RAY_BODY} fill={sheenFill} />
    </>
  );
}

// ===== ウニ (urchin) =====
// 球体＋放射状の棘。中央口に五歯。
function UrchinBody({ bodyFill, stroke, accent, silhouette }: {
  bodyFill: string; stroke: string; accent: string; silhouette: boolean;
}) {
  const cx = 60, cy = 40, r = 18;
  const spineColor = silhouette ? '#2a2a2a' : darken(accent, 0.15);
  const spineLight = silhouette ? '#3a3a3a' : lighten(accent, 0.2);
  const SPINE_N = 42;
  return (
    <>
      {/* 後ろの長い棘（影） */}
      {Array.from({ length: SPINE_N }).map((_, i) => {
        const a = (i / SPINE_N) * Math.PI * 2;
        const len = 16 + ((i * 7) % 5);
        return (
          <line
            key={`sp${i}`}
            x1={cx + Math.cos(a) * (r - 1)}
            y1={cy + Math.sin(a) * (r - 1)}
            x2={cx + Math.cos(a) * (r + len)}
            y2={cy + Math.sin(a) * (r + len)}
            stroke={spineColor}
            strokeWidth="1.0"
            opacity="0.85"
            strokeLinecap="round"
          />
        );
      })}
      {/* ハイライト用の細い線 */}
      {Array.from({ length: SPINE_N }).map((_, i) => {
        const a = (i / SPINE_N) * Math.PI * 2;
        const len = 14 + ((i * 7) % 5);
        return (
          <line
            key={`spL${i}`}
            x1={cx + Math.cos(a) * (r + 0.5)}
            y1={cy + Math.sin(a) * (r + 0.5)}
            x2={cx + Math.cos(a) * (r + len)}
            y2={cy + Math.sin(a) * (r + len)}
            stroke={spineLight}
            strokeWidth="0.35"
            opacity="0.7"
            strokeLinecap="round"
          />
        );
      })}
      {/* 中央の球体 */}
      <circle cx={cx} cy={cy} r={r} fill={bodyFill} stroke={stroke} strokeWidth="1.4" />
      {/* 細かい突起 */}
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2 + 0.1;
        const x = cx + Math.cos(a) * (r * 0.88);
        const y = cy + Math.sin(a) * (r * 0.88);
        return <circle key={`b${i}`} cx={x} cy={y} r="0.7" fill={darken(accent, 0.3)} opacity="0.75" />;
      })}
      {/* 縦の管足ライン（殻の模様） */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * (r * 0.2);
        const y1 = cy + Math.sin(a) * (r * 0.2);
        const x2 = cx + Math.cos(a) * (r * 0.95);
        const y2 = cy + Math.sin(a) * (r * 0.95);
        return <line key={`gl${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={darken(accent, 0.35)} strokeWidth="0.35" opacity="0.55" strokeDasharray="0.4 0.8" />;
      })}
      {/* 中央の口 */}
      <circle cx={cx} cy={cy} r="3.2" fill="#1a1a1a" opacity="0.75" />
      <circle cx={cx} cy={cy} r="2.4" fill={darken(accent, 0.6)} />
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * 0.5;
        const y1 = cy + Math.sin(a) * 0.5;
        const x2 = cx + Math.cos(a) * 2.2;
        const y2 = cy + Math.sin(a) * 2.2;
        return <line key={`tt${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e8d8b8" strokeWidth="0.5" opacity="0.85" strokeLinecap="round" />;
      })}
      {/* ハイライト */}
      <ellipse cx={cx - 5} cy={cy - 6} rx="5" ry="3" fill="#fff" opacity="0.18" />
    </>
  );
}

// ===== リュウグウノツカイ (oarfish) =====
// 極端に細長い銀色の体・赤い背びれが端から端まで・頭部に赤い触角。
const OARFISH_BODY = 'M 6,40 C 8,38 14,37 24,37 L 108,37 C 113,37 116,38 117,40 C 116,42 113,43 108,43 L 24,43 C 14,43 8,42 6,40 Z';
function OarfishBody({ bodyFill, stroke, accent, sheenFill, bellyFill, silhouette }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; bellyFill: string; silhouette: boolean;
}) {
  const finRed = silhouette ? '#3a3a3a' : '#c84030';
  const finRedDark = silhouette ? '#1a1a1a' : '#8a2010';
  return (
    <>
      {/* 背びれ（端から端まで、波打つ赤いひれ） */}
      <path d="M 6,38 Q 12,30 18,34 Q 24,28 30,32 Q 36,26 42,30 Q 48,26 54,30 Q 60,26 66,30 Q 72,28 78,32 Q 84,28 90,32 Q 96,30 102,34 Q 108,30 116,38 L 116,38 L 6,38 Z" fill={finRed} opacity="0.95" stroke={finRedDark} strokeWidth="0.4" strokeLinejoin="round" />
      {/* ひれ条 */}
      {[14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94, 102, 110].map((x, i) => (
        <line key={`r${i}`} x1={x} y1="38" x2={x} y2={x % 16 < 8 ? 30 : 27} stroke={finRedDark} strokeWidth="0.4" opacity="0.6" strokeLinecap="round" />
      ))}
      {/* 体（極端に細長い銀色） */}
      <path d={OARFISH_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      {/* 腹のハイライト（銀色） */}
      <path d="M 12,41.5 C 30,43 90,43 110,41.5 C 90,43 30,43 12,41.5 Z" fill={bellyFill} opacity="0.85" />
      {/* 銀色の体側模様 */}
      <line x1="22" y1="40" x2="110" y2="40" stroke={darken(accent, 0.2)} strokeWidth="0.35" opacity="0.5" strokeDasharray="0.4 1.4" />
      {/* 暗色の縦の斑紋 */}
      {[28, 44, 60, 76, 92].map((x, i) => (
        <ellipse key={i} cx={x} cy="40" rx="1.4" ry="2.2" fill={darken(accent, 0.35)} opacity="0.45" />
      ))}
      {/* 頭部の赤い触角（背びれが頭から長く伸びる典型的特徴） */}
      <path d="M 14,36 Q 12,24 9,12" fill="none" stroke={finRed} strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
      <path d="M 16,36 Q 16,22 16,10" fill="none" stroke={finRed} strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      <path d="M 18,36 Q 20,22 22,12" fill="none" stroke={finRed} strokeWidth="1.0" strokeLinecap="round" opacity="0.85" />
      {/* 触角の先端の球（典型的なオール状先端） */}
      <ellipse cx="9" cy="12" rx="1.4" ry="2.0" fill={finRed} opacity="0.95" />
      <ellipse cx="16" cy="10" rx="1.2" ry="1.8" fill={finRed} opacity="0.9" />
      <ellipse cx="22" cy="12" rx="1.0" ry="1.5" fill={finRed} opacity="0.85" />
      {/* 尾びれ（赤い、扇形） */}
      <path d="M 113,37 Q 119,32 119,40 Q 119,48 113,43 Z" fill={finRed} opacity="0.95" stroke={finRedDark} strokeWidth="0.4" />
      {/* 腹びれ（垂れ下がる赤いリボン状） */}
      <path d="M 28,43 Q 24,55 26,60 Q 30,55 30,43 Z" fill={finRed} opacity="0.85" stroke={finRedDark} strokeWidth="0.35" />
      <path d="M 32,43 Q 30,60 34,65 Q 38,58 36,43 Z" fill={finRed} opacity="0.8" stroke={finRedDark} strokeWidth="0.35" />
      {/* 口 */}
      <path d="M 4,40 Q 8,41 12,40" fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.8" strokeLinecap="round" />
      {/* 目 */}
      <circle cx="16" cy="40" r="1.6" fill={darken(accent, 0.5)} opacity="0.5" />
      <circle cx="16" cy="40" r="1.4" fill="#fffefb" />
      <circle cx="16.4" cy="39.7" r="0.85" fill="#0e0e0e" />
      <circle cx="15.8" cy="39.4" r="0.35" fill="#fff" />
      {/* 照り */}
      <path d={OARFISH_BODY} fill={sheenFill} />
    </>
  );
}

// ===== 二枚貝（ホタテ/アサリ/タイラギ等） =====
// 中央の蝶番から扇形に広がる上下2枚の貝。少しだけ開き、間に薄く貝肉が覗く。
const BIVALVE_UPPER = 'M 18,42 C 22,18 50,8 60,8 C 70,8 98,18 102,42 C 100,46 84,48 60,48 C 36,48 20,46 18,42 Z';
const BIVALVE_LOWER = 'M 18,42 C 22,66 50,76 60,76 C 70,76 98,66 102,42 C 100,38 84,36 60,36 C 36,36 20,38 18,42 Z';
const BIVALVE_SIL = 'M 18,42 C 22,18 50,8 60,8 C 70,8 98,18 102,42 C 98,66 70,76 60,76 C 50,76 22,66 18,42 Z';

function BivalveShell({ bodyFill, stroke, accent, sheenFill, patternFill, silhouette }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; patternFill?: string; silhouette: boolean;
}) {
  const ribStroke = silhouette ? '#0c0c0c' : darken(accent, 0.32);
  const ribShadow = silhouette ? '#0c0c0c' : darken(accent, 0.55);
  const innerFill = silhouette ? '#1a1a1a' : lighten(accent, 0.3);
  // 放射状の畝（リブ）— 上殻と下殻でそれぞれ描く。影付きで立体感
  const ribsT = [-0.55, -0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42, 0.55];
  const upperRibs = ribsT.map((t, i) => {
    const x = 60 + t * 75;
    const yEnd = 9 + Math.abs(t) * 14;
    return (
      <g key={`ur${i}`}>
        <path d={`M 60,42 Q ${(60 + x) / 2 + t * 5},${(42 + yEnd) / 2 - 8} ${x},${yEnd}`} fill="none" stroke={ribShadow} strokeWidth="1.0" opacity="0.45" strokeLinecap="round" />
        <path d={`M 60,42 Q ${(60 + x) / 2 + t * 5 + 0.6},${(42 + yEnd) / 2 - 8.4} ${x + 0.3},${yEnd - 0.3}`} fill="none" stroke={ribStroke} strokeWidth="0.55" opacity="0.7" strokeLinecap="round" />
      </g>
    );
  });
  const lowerRibs = ribsT.map((t, i) => {
    const x = 60 + t * 75;
    const yEnd = 75 - Math.abs(t) * 14;
    return (
      <g key={`lr${i}`}>
        <path d={`M 60,42 Q ${(60 + x) / 2 + t * 5},${(42 + yEnd) / 2 + 8} ${x},${yEnd}`} fill="none" stroke={ribShadow} strokeWidth="0.95" opacity="0.4" strokeLinecap="round" />
        <path d={`M 60,42 Q ${(60 + x) / 2 + t * 5 + 0.5},${(42 + yEnd) / 2 + 8.4} ${x + 0.3},${yEnd + 0.3}`} fill="none" stroke={ribStroke} strokeWidth="0.5" opacity="0.6" strokeLinecap="round" />
      </g>
    );
  });
  return (
    <>
      {/* 下殻 */}
      <path d={BIVALVE_LOWER} fill={bodyFill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 上殻 */}
      <path d={BIVALVE_UPPER} fill={bodyFill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 模様 */}
      {patternFill && <path d={BIVALVE_SIL} fill={patternFill} />}
      {/* リブ */}
      {upperRibs}
      {lowerRibs}
      {/* 蝶番付近の隙間（薄く貝肉が覗く） */}
      <path d="M 22,42 C 30,40 90,40 98,42 C 90,44 30,44 22,42 Z" fill={innerFill} opacity="0.8" />
      <line x1="22" y1="42" x2="98" y2="42" stroke={stroke} strokeWidth="0.55" opacity="0.7" />
      {/* 蝶番（耳） */}
      <ellipse cx="60" cy="42" rx="3.5" ry="1.2" fill={ribShadow} opacity="0.4" />
      {/* 成長輪（同心円風） */}
      <ellipse cx="60" cy="42" rx="34" ry="6" fill="none" stroke={ribShadow} strokeWidth="0.45" opacity="0.32" />
      <ellipse cx="60" cy="42" rx="24" ry="4" fill="none" stroke={ribShadow} strokeWidth="0.4" opacity="0.25" />
      {/* 照り */}
      <path d={BIVALVE_SIL} fill={sheenFill} />
    </>
  );
}

// ===== 巻貝（サザエ/巻貝類） =====
// 卵形の輪郭の内側に螺旋階段状の段を描き、左下に殻口、上部にとんがりを置く。
const SPIRAL_SIL = 'M 14,50 C 14,28 32,12 56,12 C 82,12 104,28 106,50 C 108,64 96,72 78,72 C 60,72 36,72 22,66 C 14,62 10,58 14,50 Z';

function SpiralShell({ bodyFill, stroke, accent, sheenFill, patternFill, silhouette }: {
  bodyFill: string; stroke: string; accent: string; sheenFill: string; patternFill?: string; silhouette: boolean;
}) {
  const swirlStroke = silhouette ? '#0c0c0c' : darken(accent, 0.5);
  const swirlLight = silhouette ? '#3a3a3a' : lighten(accent, 0.55);
  const apertureFill = silhouette ? '#0a0a0a' : darken(accent, 0.6);
  const spikeFill = silhouette ? '#1a1a1a' : lighten(accent, 0.05);
  return (
    <>
      {/* 外殻 */}
      <path d={SPIRAL_SIL} fill={bodyFill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />

      {/* 巻きの段（外周から殻頂へ向けて層が小さくなる螺旋階段風） — 暗線＋明線で立体感 */}
      {/* 大きい段（最外周） */}
      <path d="M 16,52 C 22,30 42,18 64,18 C 86,18 104,30 104,50" fill="none" stroke={swirlStroke} strokeWidth="1.6" opacity="0.85" strokeLinecap="round" />
      <path d="M 16.5,52.5 C 23,31 43,19 64,19 C 85,19 103,31 103.5,50" fill="none" stroke={swirlLight} strokeWidth="0.7" opacity="0.85" strokeLinecap="round" />
      {/* 中段 */}
      <path d="M 24,56 C 30,34 48,24 68,26 C 86,28 98,40 96,54" fill="none" stroke={swirlStroke} strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
      <path d="M 24.5,56.5 C 31,35 49,25 68,27 C 85,29 97,41 95.5,54" fill="none" stroke={swirlLight} strokeWidth="0.6" opacity="0.75" strokeLinecap="round" />
      {/* 内段 */}
      <path d="M 34,58 C 40,40 54,32 70,34 C 84,36 88,46 84,56" fill="none" stroke={swirlStroke} strokeWidth="1.2" opacity="0.75" strokeLinecap="round" />
      <path d="M 34.5,58.5 C 41,41 55,33 70,35 C 83,37 87,47 83.5,56" fill="none" stroke={swirlLight} strokeWidth="0.55" opacity="0.7" strokeLinecap="round" />
      {/* 最内段 */}
      <path d="M 44,58 C 50,46 60,42 70,44 C 76,46 76,52 72,56" fill="none" stroke={swirlStroke} strokeWidth="1.0" opacity="0.7" strokeLinecap="round" />
      <path d="M 44.5,58.5 C 51,47 61,43 70,45 C 75,47 75,52 71.5,56" fill="none" stroke={swirlLight} strokeWidth="0.45" opacity="0.65" strokeLinecap="round" />
      {/* 殻頂の小さな点 */}
      <circle cx="62" cy="20" r="2.0" fill={swirlStroke} opacity="0.85" />
      <circle cx="61.5" cy="19.5" r="0.9" fill={swirlLight} opacity="0.7" />

      {/* 殻表面の畝（縦方向の細い溝） */}
      {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((t, i) => (
        <path key={`gv${i}`} d={`M ${56 + t * 50},${50 + Math.abs(t) * 8} Q ${56 + t * 46},${30 + Math.abs(t) * 6} ${58 + t * 30},${20 + Math.abs(t) * 4}`} fill="none" stroke={swirlStroke} strokeWidth="0.35" opacity="0.35" strokeLinecap="round" />
      ))}

      {/* 角（サザエの突起、3〜4本） */}
      {[[24, 28], [44, 16], [70, 16], [92, 30]].map(([cx, cy], i) => {
        const tx = cx + (i < 2 ? -2.5 : 2.5);
        const ty = cy - 7.5;
        return (
          <path key={`sp${i}`} d={`M ${cx - 2.5},${cy + 2} L ${tx},${ty} L ${cx + 2.5},${cy + 2} Z`} fill={spikeFill} opacity="0.85" stroke={stroke} strokeWidth="0.55" strokeLinejoin="round" />
        );
      })}

      {/* 開口部（殻口・aperture） — 左下に配置（巻貝のフタが見える位置） */}
      <path d="M 12,54 C 10,62 16,72 30,72 C 42,72 46,66 38,60 C 30,54 20,52 12,54 Z" fill={apertureFill} opacity="0.85" />
      <path d="M 12,54 C 10,62 16,72 30,72 C 42,72 46,66 38,60 C 30,54 20,52 12,54 Z" fill="none" stroke={stroke} strokeWidth="0.85" opacity="0.9" strokeLinejoin="round" />
      <path d="M 16,60 C 20,58 28,58 34,62" fill="none" stroke={swirlLight} strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />

      {/* 模様 */}
      {patternFill && <path d={SPIRAL_SIL} fill={patternFill} />}
      {/* 照り */}
      <path d={SPIRAL_SIL} fill={sheenFill} />
    </>
  );
}

// ===== 模様の def =====
function PatternDefs({ id, appearance }: { id: string; appearance: FishAppearance }) {
  const { pattern, accentColor } = appearance;
  if (!pattern || pattern === 'none') return null;
  if (pattern === 'stripes')
    return (
      <pattern id={`pat-${id}`} width="9" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
        <rect width="9" height="80" fill="transparent" />
        <rect x="2.5" width="3.5" height="80" fill={accentColor} opacity="0.3" />
      </pattern>
    );
  if (pattern === 'spots')
    return (
      <pattern id={`pat-${id}`} width="13" height="13" patternUnits="userSpaceOnUse">
        <rect width="13" height="13" fill="transparent" />
        <circle cx="4" cy="4" r="1.8" fill={accentColor} opacity="0.4" />
        <circle cx="10" cy="10" r="1.3" fill={accentColor} opacity="0.32" />
      </pattern>
    );
  return (
    <linearGradient id={`pat-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
      <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
    </linearGradient>
  );
}

const SCALE_SHAPES: FishBodyShape[] = ['standard', 'elongated', 'round', 'flat'];
const AURA: Partial<Record<Fish['rarity'], string>> = { legendary: '#e6c266', mythical: '#ef6a52' };

export default function FishIllustration({ fishId, width = 120, height = 80, silhouette = false, className = '' }: FishIllustrationProps) {
  const fish = FISH_MAP.get(fishId);
  const uid = useId().replace(/:/g, '');

  if (!fish || !fish.appearance) {
    return <span className={className} style={{ width, height, display: 'inline-block' }} />;
  }

  const a = fish.appearance;
  const shape = a.bodyShape;
  const bodyColor = silhouette ? '#2a2a2a' : a.bodyColor;
  const accent = silhouette ? '#3a3a3a' : a.accentColor;
  const stroke = silhouette ? '#161616' : darken(a.bodyColor, 0.55);
  const aura = silhouette ? undefined : AURA[fish.rarity];
  const bodyFill = silhouette ? bodyColor : `url(#body-${uid})`;
  const sheenFill = silhouette ? 'transparent' : `url(#sheen-${uid})`;
  const bellyFill = silhouette ? 'transparent' : `url(#belly-${uid})`;
  const finGrad = silhouette ? accent : `url(#fin-${uid})`;
  const drawScales = !silhouette && SCALE_SHAPES.includes(shape);
  const scaleFill = drawScales ? `url(#scales-${uid})` : undefined;
  const patternFill = !silhouette && a.pattern && a.pattern !== 'none' ? `url(#pat-${uid})` : undefined;

  const isFinned = shape === 'standard' || shape === 'elongated' || shape === 'round' || shape === 'flat';

  return (
    <svg viewBox="0 0 120 80" width={width} height={height} className={className} role="img" aria-label={fish.name} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* 体本体: 上＝明るく、中央＝基本色、下＝深く。腹に少し青みのある反射感 */}
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(bodyColor, 0.42)} />
          <stop offset="35%" stopColor={lighten(bodyColor, 0.08)} />
          <stop offset="65%" stopColor={bodyColor} />
          <stop offset="100%" stopColor={darken(bodyColor, 0.35)} />
        </linearGradient>
        {/* 腹のハイライト（白〜淡色） */}
        <linearGradient id={`belly-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(bodyColor, 0.7)} stopOpacity="0" />
          <stop offset="60%" stopColor={lighten(bodyColor, 0.85)} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
        </linearGradient>
        {/* 上面の照り */}
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* ひれ用グラデ（透明感のあるアクセント色） */}
        <linearGradient id={`fin-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lighten(accent, 0.2)} stopOpacity="0.95" />
          <stop offset="100%" stopColor={darken(accent, 0.15)} stopOpacity="0.7" />
        </linearGradient>
        {drawScales && (
          <pattern id={`scales-${uid}`} width="5.5" height="4.6" patternUnits="userSpaceOnUse">
            <path d="M 0,4.6 Q 2.75,0.5 5.5,4.6" fill="none" stroke={darken(bodyColor, 0.35)} strokeWidth="0.5" opacity="0.38" />
            <path d="M -2.75,2.3 Q 0,-1.8 2.75,2.3" fill="none" stroke={darken(bodyColor, 0.35)} strokeWidth="0.5" opacity="0.32" />
            <path d="M 2.75,2.3 Q 5.5,-1.8 8.25,2.3" fill="none" stroke={darken(bodyColor, 0.35)} strokeWidth="0.5" opacity="0.32" />
          </pattern>
        )}
        {!silhouette && <PatternDefs id={uid} appearance={a} />}
        {aura && (
          <filter id={`aura-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor={aura} floodOpacity="0.9" />
          </filter>
        )}
      </defs>

      <g filter={aura ? `url(#aura-${uid})` : undefined}>
        {isFinned ? (
          <FinnedFish
            cfg={FINNED[shape as 'standard' | 'elongated' | 'round' | 'flat']}
            bodyFill={bodyFill}
            stroke={stroke}
            accent={accent}
            finStyle={a.finStyle}
            scaleFill={scaleFill}
            patternFill={patternFill}
            sheenFill={sheenFill}
            bellyFill={bellyFill}
            finGrad={finGrad}
          />
        ) : shape === 'eel' ? (
          <EelFish bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} scaleFill={undefined} patternFill={patternFill} />
        ) : shape === 'squid' ? (
          <SquidBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} patternFill={patternFill} />
        ) : shape === 'octopus' ? (
          <>
            <OctopusBody fill={bodyFill} stroke={stroke} />
            {patternFill && <ellipse cx="50" cy="35" rx="38" ry="27" fill={patternFill} />}
            <ellipse cx="50" cy="35" rx="38" ry="27" fill={sheenFill} />
            <circle cx="38" cy="31" r="4" fill="#fff" /><circle cx="39" cy="30.4" r="2.1" fill="#141414" />
            <circle cx="62" cy="31" r="4" fill="#fff" /><circle cx="63" cy="30.4" r="2.1" fill="#141414" />
          </>
        ) : shape === 'shell_bivalve' ? (
          <BivalveShell bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} patternFill={patternFill} silhouette={silhouette} />
        ) : shape === 'shell_spiral' ? (
          <SpiralShell bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} patternFill={patternFill} silhouette={silhouette} />
        ) : shape === 'catfish' ? (
          <CatfishBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} finGrad={finGrad} patternFill={patternFill} />
        ) : shape === 'shark' ? (
          <SharkBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} finGrad={finGrad} patternFill={patternFill} />
        ) : shape === 'whale' ? (
          <WhaleBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} finGrad={finGrad} patternFill={patternFill} silhouette={silhouette} />
        ) : shape === 'ray' ? (
          <RayBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} patternFill={patternFill} />
        ) : shape === 'urchin' ? (
          <UrchinBody bodyFill={bodyFill} stroke={stroke} accent={accent} silhouette={silhouette} />
        ) : shape === 'oarfish' ? (
          <OarfishBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} silhouette={silhouette} />
        ) : (
          <CrabBody bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} bellyFill={bellyFill} patternFill={patternFill} />
        )}
      </g>
    </svg>
  );
}
