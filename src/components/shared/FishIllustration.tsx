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

// 背びれ（finStyle で高さ・形が変わる膜＋ひれ条）
function dorsalFin(d: FinnedConfig['dorsal'], style: FishFinStyle, accent: string, stroke: string) {
  const mx = (d.x0 + d.x1) / 2;
  const mult = style === 'large' ? 2.1 : style === 'long' ? 1.6 : style === 'small' ? 0.55 : 1;
  const peakY = Math.min(d.y0, d.y1) - d.peak * mult;
  if (style === 'spiky') {
    const n = 5;
    let pts = `M ${d.x0},${d.y0} `;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const x = d.x0 + (d.x1 - d.x0) * t;
      pts += `L ${x - 2},${d.y0 + (d.y1 - d.y0) * t - d.peak * 1.6} L ${x},${d.y0 + (d.y1 - d.y0) * t} `;
    }
    pts += `L ${d.x1},${d.y1} Z`;
    return <path d={pts} fill={accent} opacity="0.85" stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />;
  }
  const membrane = `M ${d.x0},${d.y0} Q ${mx},${peakY} ${d.x1},${d.y1} Z`;
  const rays = [0.25, 0.5, 0.75].map((t, i) => {
    const bx = d.x0 + (d.x1 - d.x0) * t;
    const by = d.y0 + (d.y1 - d.y0) * t;
    const ty = by - (by - peakY) * 0.8;
    return <line key={i} x1={bx} y1={by} x2={bx} y2={ty} stroke={stroke} strokeWidth="0.35" opacity="0.4" />;
  });
  return (
    <>
      <path d={membrane} fill={accent} opacity="0.7" stroke={stroke} strokeWidth="0.4" strokeLinejoin="round" />
      {rays}
    </>
  );
}

function FinnedFish({
  cfg, bodyFill, stroke, accent, finStyle, scaleFill, patternFill, sheenFill,
}: {
  cfg: FinnedConfig; bodyFill: string; stroke: string; accent: string; finStyle: FishFinStyle;
  scaleFill?: string; patternFill?: string; sheenFill: string;
}) {
  const finC = darken(accent, 0.05);
  return (
    <>
      {/* 後方のひれ（体の後ろ） */}
      <path d={cfg.tail} fill={finC} opacity="0.92" stroke={stroke} strokeWidth="0.45" strokeLinejoin="round" />
      {cfg.tailTips.map((t, i) => (
        <line key={i} x1={cfg.pedX} y1={40} x2={t[0]} y2={t[1]} stroke={stroke} strokeWidth="0.35" opacity="0.4" />
      ))}
      {dorsalFin(cfg.dorsal, finStyle, accent, stroke)}
      {cfg.anal && (
        <path d={`M ${cfg.anal.x0},${cfg.anal.y0} Q ${(cfg.anal.x0 + cfg.anal.x1) / 2},${cfg.anal.dip} ${cfg.anal.x1},${cfg.anal.y1} Z`} fill={accent} opacity="0.6" stroke={stroke} strokeWidth="0.35" />
      )}
      {cfg.pelvic && (
        <path d={`M ${cfg.pelvic[0]},${cfg.pelvic[1]} Q ${cfg.pelvic[0] + 4},${cfg.pelvic[1] + 8} ${cfg.pelvic[0] + 9},${cfg.pelvic[1] + 1} Z`} fill={accent} opacity="0.55" stroke={stroke} strokeWidth="0.3" />
      )}

      {/* 体 */}
      <path d={cfg.body} fill={bodyFill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />

      {/* うろこ / 模様 / 照り（体でクリップ） */}
      {scaleFill && <path d={cfg.body} fill={scaleFill} />}
      {patternFill && <path d={cfg.body} fill={patternFill} />}

      {/* えら蓋 */}
      <path d={cfg.operc} fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />

      <path d={cfg.body} fill={sheenFill} />

      {/* 口 */}
      <path d={cfg.mouth} fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.75" strokeLinecap="round" />

      {/* 胸びれ（体の前） */}
      <path d={`M ${cfg.pectoral.x},${cfg.pectoral.y} Q ${cfg.pectoral.x + 7},${cfg.pectoral.y + 11} ${cfg.pectoral.x + 15},${cfg.pectoral.y + 3} Q ${cfg.pectoral.x + 8},${cfg.pectoral.y + 3} ${cfg.pectoral.x + 3},${cfg.pectoral.y} Z`} fill={accent} opacity="0.6" stroke={stroke} strokeWidth="0.35" strokeLinejoin="round" />
      <line x1={cfg.pectoral.x + 2} y1={cfg.pectoral.y + 1} x2={cfg.pectoral.x + 11} y2={cfg.pectoral.y + 7} stroke={stroke} strokeWidth="0.3" opacity="0.35" />

      {/* 目 */}
      <circle cx={cfg.eye.cx} cy={cfg.eye.cy} r={cfg.eye.r} fill="#fff" />
      <circle cx={cfg.eye.cx + 0.7} cy={cfg.eye.cy - 0.4} r={cfg.eye.r * 0.55} fill="#141414" />
      <circle cx={cfg.eye.cx - 0.5} cy={cfg.eye.cy - 1} r={cfg.eye.r * 0.26} fill="#fff" opacity="0.95" />
    </>
  );
}

// ===== うなぎ（蛇行する細長い魚） =====
const EEL_BODY = 'M 5,40 C 8,32 16,30 28,31 C 52,33 76,30 99,33 C 110,34 117,37 117,41 C 117,45 110,47 99,48 C 76,50 52,47 28,49 C 16,50 8,48 5,40 Z';
function EelFish({ bodyFill, stroke, accent, sheenFill, scaleFill, patternFill }: { bodyFill: string; stroke: string; accent: string; sheenFill: string; scaleFill?: string; patternFill?: string }) {
  return (
    <>
      {/* 背びれ・尻びれ（体に沿った連続ひれ） */}
      <path d="M 26,31 C 50,26 76,27 104,32 C 96,33 74,32 50,33 C 38,33 30,33 26,33 Z" fill={accent} opacity="0.5" stroke={stroke} strokeWidth="0.3" />
      <path d="M 26,49 C 50,54 76,53 104,48 C 96,47 74,48 50,47 C 38,47 30,47 26,47 Z" fill={accent} opacity="0.45" stroke={stroke} strokeWidth="0.3" />
      <path d={EEL_BODY} fill={bodyFill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      {scaleFill && <path d={EEL_BODY} fill={scaleFill} />}
      {patternFill && <path d={EEL_BODY} fill={patternFill} />}
      <path d="M 18,34 Q 14,40 18,47" fill="none" stroke={stroke} strokeWidth="0.55" opacity="0.4" strokeLinecap="round" />
      <path d={EEL_BODY} fill={sheenFill} />
      <path d="M 4,41 Q 8,40 12,41" fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.7" strokeLinecap="round" />
      <circle cx="13" cy="38" r="2.6" fill="#fff" />
      <circle cx="13.6" cy="37.6" r="1.4" fill="#141414" />
      <circle cx="12.4" cy="37" r="0.7" fill="#fff" opacity="0.95" />
    </>
  );
}

// ===== 頭足類・甲殻類（既存を踏襲しつつ陰影は本体グラデで） =====
function SquidBody({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <>
      <path d="M 8,32 Q 2,28 6,24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 10,36 Q 3,34 4,30" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 10,44 Q 3,46 4,50" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 8,48 Q 2,52 6,56" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 12,40 Q 4,40 2,40" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 80,22 Q 98,12 102,20 Q 94,24 84,25" fill={accent} opacity="0.7" stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 80,58 Q 98,68 102,60 Q 94,56 84,55" fill={accent} opacity="0.7" stroke={stroke} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 12,28 Q 22,18 50,18 Q 80,18 92,30 L 100,40 L 92,50 Q 80,62 50,62 Q 22,62 12,52 Z" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </>
  );
}
const SQUID_SIL = 'M 12,28 Q 22,18 50,18 Q 80,18 92,30 L 100,40 L 92,50 Q 80,62 50,62 Q 22,62 12,52 Z';

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

function CrabBody({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <>
      <path d="M 28,48 Q 16,58 10,62 Q 7,60 12,55" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 34,52 Q 22,64 16,68 Q 13,66 18,61" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 72,48 Q 84,58 90,62 Q 93,60 88,55" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 66,52 Q 78,64 84,68 Q 87,66 82,61" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 40,54 Q 30,68 26,72" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 60,54 Q 70,68 74,72" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 22,38 Q 8,30 5,22 Q 4,16 10,18 Q 9,23 14,26 Q 10,28 12,32 Z" fill={accent} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 78,38 Q 92,30 95,22 Q 96,16 90,18 Q 91,23 86,26 Q 90,28 88,32 Z" fill={accent} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 22,42 Q 28,28 50,27 Q 72,28 78,42 Q 72,54 50,54 Q 28,54 22,42 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
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
        <rect x="2.5" width="3.5" height="80" fill={accentColor} opacity="0.28" />
      </pattern>
    );
  if (pattern === 'spots')
    return (
      <pattern id={`pat-${id}`} width="13" height="13" patternUnits="userSpaceOnUse">
        <rect width="13" height="13" fill="transparent" />
        <circle cx="4" cy="4" r="1.8" fill={accentColor} opacity="0.38" />
        <circle cx="10" cy="10" r="1.3" fill={accentColor} opacity="0.3" />
      </pattern>
    );
  return (
    <linearGradient id={`pat-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
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
  const stroke = silhouette ? '#161616' : darken(a.bodyColor, 0.5);
  const aura = silhouette ? undefined : AURA[fish.rarity];
  const bodyFill = silhouette ? bodyColor : `url(#body-${uid})`;
  const sheenFill = silhouette ? 'transparent' : `url(#sheen-${uid})`;
  const drawScales = !silhouette && SCALE_SHAPES.includes(shape);
  const scaleFill = drawScales ? `url(#scales-${uid})` : undefined;
  const patternFill = !silhouette && a.pattern && a.pattern !== 'none' ? `url(#pat-${uid})` : undefined;

  const isFinned = shape === 'standard' || shape === 'elongated' || shape === 'round' || shape === 'flat';

  return (
    <svg viewBox="0 0 120 80" width={width} height={height} className={className} role="img" aria-label={fish.name} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(bodyColor, 0.34)} />
          <stop offset="45%" stopColor={bodyColor} />
          <stop offset="100%" stopColor={darken(bodyColor, 0.28)} />
        </linearGradient>
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {drawScales && (
          <pattern id={`scales-${uid}`} width="6.5" height="5.5" patternUnits="userSpaceOnUse">
            <path d="M 0,5.5 Q 3.25,1 6.5,5.5" fill="none" stroke={darken(bodyColor, 0.32)} strokeWidth="0.55" opacity="0.32" />
          </pattern>
        )}
        {!silhouette && <PatternDefs id={uid} appearance={a} />}
        {aura && (
          <filter id={`aura-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={aura} floodOpacity="0.85" />
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
          />
        ) : shape === 'eel' ? (
          <EelFish bodyFill={bodyFill} stroke={stroke} accent={accent} sheenFill={sheenFill} scaleFill={undefined} patternFill={patternFill} />
        ) : shape === 'squid' ? (
          <>
            <SquidBody fill={bodyFill} stroke={stroke} accent={accent} />
            {patternFill && <path d={SQUID_SIL} fill={patternFill} />}
            <path d={SQUID_SIL} fill={sheenFill} />
            <circle cx="30" cy="36" r="3.5" fill="#fff" />
            <circle cx="30.8" cy="35.6" r="1.9" fill="#141414" />
            <circle cx="29.4" cy="35" r="0.9" fill="#fff" opacity="0.9" />
          </>
        ) : shape === 'octopus' ? (
          <>
            <OctopusBody fill={bodyFill} stroke={stroke} />
            {patternFill && <ellipse cx="50" cy="35" rx="38" ry="27" fill={patternFill} />}
            <ellipse cx="50" cy="35" rx="38" ry="27" fill={sheenFill} />
            <circle cx="38" cy="31" r="4" fill="#fff" /><circle cx="39" cy="30.4" r="2.1" fill="#141414" />
            <circle cx="62" cy="31" r="4" fill="#fff" /><circle cx="63" cy="30.4" r="2.1" fill="#141414" />
          </>
        ) : (
          <>
            <CrabBody fill={bodyFill} stroke={stroke} accent={accent} />
            {patternFill && <path d="M 22,42 Q 28,28 50,27 Q 72,28 78,42 Q 72,54 50,54 Q 28,54 22,42 Z" fill={patternFill} />}
            <path d="M 22,42 Q 28,28 50,27 Q 72,28 78,42 Q 72,54 50,54 Q 28,54 22,42 Z" fill={sheenFill} />
            <circle cx="40" cy="34" r="2.6" fill="#fff" /><circle cx="40.7" cy="33.6" r="1.4" fill="#141414" />
            <circle cx="60" cy="34" r="2.6" fill="#fff" /><circle cx="60.7" cy="33.6" r="1.4" fill="#141414" />
          </>
        )}
      </g>
    </svg>
  );
}
