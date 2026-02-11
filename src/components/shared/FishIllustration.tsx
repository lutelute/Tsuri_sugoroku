import { FISH_DATABASE } from '../../data/fishDatabase';
import type { FishAppearance, FishBodyShape, FishFinStyle } from '../../game/types';

const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));

interface FishIllustrationProps {
  fishId: string;
  width?: number;
  height?: number;
  silhouette?: boolean;
  className?: string;
}

// --- Body shape paths ---

function StandardBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      {/* Tail */}
      <path d="M 95,40 L 115,22 L 115,58 Z" fill={fill} stroke={stroke} strokeWidth="1" />
      {/* Body */}
      <path
        d="M 15,40 Q 25,12 55,14 Q 85,12 100,40 Q 85,68 55,66 Q 25,68 15,40 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </>
  );
}

function ElongatedBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <path d="M 100,40 L 116,28 L 116,52 Z" fill={fill} stroke={stroke} strokeWidth="1" />
      <path
        d="M 8,40 Q 15,24 40,22 L 95,28 Q 105,40 95,52 L 40,58 Q 15,56 8,40 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </>
  );
}

function FlatBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <path d="M 95,46 L 115,36 L 115,56 Z" fill={fill} stroke={stroke} strokeWidth="1" />
      <ellipse cx="55" cy="46" rx="44" ry="22" fill={fill} stroke={stroke} strokeWidth="1.5" />
    </>
  );
}

function RoundBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <path d="M 90,40 L 112,28 L 112,52 Z" fill={fill} stroke={stroke} strokeWidth="1" />
      <ellipse cx="52" cy="40" rx="35" ry="30" fill={fill} stroke={stroke} strokeWidth="1.5" />
    </>
  );
}

function EelBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <path
      d="M 5,40 Q 10,30 20,30 L 95,30 Q 115,30 115,40 Q 115,50 95,50 L 20,50 Q 10,50 5,40 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
    />
  );
}

function SquidBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      {/* Tentacles */}
      <path d="M 8,32 Q 2,28 6,24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 10,36 Q 3,34 4,30" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 10,44 Q 3,46 4,50" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 8,48 Q 2,52 6,56" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 12,40 Q 4,40 2,40" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      {/* Mantle */}
      <path
        d="M 12,28 Q 20,18 50,18 Q 80,18 90,28 L 100,40 L 90,52 Q 80,62 50,62 Q 20,62 12,52 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      {/* Fins */}
      <path d="M 78,20 Q 95,10 100,18 Q 92,22 82,24" fill={fill} stroke={stroke} strokeWidth="1" />
      <path d="M 78,60 Q 95,70 100,62 Q 92,58 82,56" fill={fill} stroke={stroke} strokeWidth="1" />
    </>
  );
}

function OctopusBody({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      {/* Tentacles */}
      <path d="M 30,58 Q 22,72 15,74 Q 12,72 18,64 Q 22,58 28,56" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M 42,62 Q 38,76 32,78 Q 28,76 34,68 Q 38,62 40,60" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M 56,62 Q 56,78 50,80 Q 46,78 50,68 Q 52,62 54,60" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M 68,58 Q 72,74 66,76 Q 62,74 66,66 Q 68,58 68,56" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M 78,52 Q 86,66 82,70 Q 78,68 78,60 Q 78,54 76,50" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <path d="M 22,54 Q 12,64 8,62 Q 8,58 14,54 Q 18,50 22,50" fill={fill} stroke={stroke} strokeWidth="1.2" />
      {/* Head */}
      <ellipse cx="50" cy="36" rx="38" ry="26" fill={fill} stroke={stroke} strokeWidth="1.5" />
    </>
  );
}

// --- Fins ---

function renderFins(shape: FishBodyShape, style: FishFinStyle, color: string) {
  if (shape === 'squid' || shape === 'octopus' || shape === 'eel') return null;

  const bodyTop = shape === 'flat' ? 24 : shape === 'round' ? 10 : 14;
  const bodyBottom = shape === 'flat' ? 68 : shape === 'round' ? 70 : 66;

  switch (style) {
    case 'large':
      return (
        <>
          <path d={`M 40,${bodyTop} Q 50,${bodyTop - 18} 60,${bodyTop}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.7" />
          <path d={`M 45,${bodyBottom} Q 52,${bodyBottom + 10} 58,${bodyBottom}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.7" />
        </>
      );
    case 'spiky':
      return (
        <>
          <path d={`M 35,${bodyTop} L 40,${bodyTop - 14} L 45,${bodyTop} L 50,${bodyTop - 12} L 55,${bodyTop} L 60,${bodyTop - 10} L 65,${bodyTop}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.7" />
          <path d={`M 50,${bodyBottom} Q 55,${bodyBottom + 8} 60,${bodyBottom}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.5" />
        </>
      );
    case 'long':
      return (
        <>
          <path d={`M 25,${bodyTop} Q 35,${bodyTop - 22} 45,${bodyTop - 20} Q 60,${bodyTop - 18} 75,${bodyTop}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.6" />
          <path d={`M 45,${bodyBottom} Q 52,${bodyBottom + 8} 60,${bodyBottom}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.5" />
        </>
      );
    case 'small':
      return (
        <>
          <path d={`M 48,${bodyTop} Q 52,${bodyTop - 8} 56,${bodyTop}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.6" />
          <path d={`M 50,${bodyBottom} Q 53,${bodyBottom + 5} 56,${bodyBottom}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.5" />
        </>
      );
    case 'normal':
    default:
      return (
        <>
          <path d={`M 40,${bodyTop} Q 48,${bodyTop - 12} 56,${bodyTop}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.7" />
          <path d={`M 48,${bodyBottom} Q 53,${bodyBottom + 7} 58,${bodyBottom}`} fill={color} stroke={color} strokeWidth="0.5" opacity="0.5" />
        </>
      );
  }
}

// --- Pattern overlays ---

function PatternDefs({ id, appearance }: { id: string; appearance: FishAppearance }) {
  const { pattern, accentColor } = appearance;

  if (!pattern || pattern === 'none') return null;

  switch (pattern) {
    case 'stripes':
      return (
        <defs>
          <pattern id={`pat-${id}`} width="8" height="80" patternUnits="userSpaceOnUse">
            <rect width="8" height="80" fill="transparent" />
            <rect x="2" width="4" height="80" fill={accentColor} opacity="0.3" />
          </pattern>
        </defs>
      );
    case 'spots':
      return (
        <defs>
          <pattern id={`pat-${id}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="transparent" />
            <circle cx="4" cy="4" r="2" fill={accentColor} opacity="0.4" />
            <circle cx="11" cy="11" r="1.5" fill={accentColor} opacity="0.3" />
          </pattern>
        </defs>
      );
    case 'gradient':
      return (
        <defs>
          <linearGradient id={`pat-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      );
    default:
      return null;
  }
}

function PatternOverlay({ id, appearance }: { id: string; appearance: FishAppearance }) {
  const { pattern, bodyShape } = appearance;
  if (!pattern || pattern === 'none') return null;

  const fillRef = pattern === 'gradient' ? `url(#pat-${id})` : `url(#pat-${id})`;

  // Use a covering rect clipped by body for simplicity
  if (bodyShape === 'octopus') {
    return <ellipse cx="50" cy="36" rx="38" ry="26" fill={fillRef} />;
  }
  if (bodyShape === 'squid') {
    return (
      <path
        d="M 12,28 Q 20,18 50,18 Q 80,18 90,28 L 100,40 L 90,52 Q 80,62 50,62 Q 20,62 12,52 Z"
        fill={fillRef}
      />
    );
  }
  if (bodyShape === 'eel') {
    return (
      <path
        d="M 5,40 Q 10,30 20,30 L 95,30 Q 115,30 115,40 Q 115,50 95,50 L 20,50 Q 10,50 5,40 Z"
        fill={fillRef}
      />
    );
  }
  if (bodyShape === 'flat') {
    return <ellipse cx="55" cy="46" rx="44" ry="22" fill={fillRef} />;
  }
  if (bodyShape === 'round') {
    return <ellipse cx="52" cy="40" rx="35" ry="30" fill={fillRef} />;
  }
  if (bodyShape === 'elongated') {
    return (
      <path
        d="M 8,40 Q 15,24 40,22 L 95,28 Q 105,40 95,52 L 40,58 Q 15,56 8,40 Z"
        fill={fillRef}
      />
    );
  }
  // standard
  return (
    <path
      d="M 15,40 Q 25,12 55,14 Q 85,12 100,40 Q 85,68 55,66 Q 25,68 15,40 Z"
      fill={fillRef}
    />
  );
}

// --- Eye position per shape ---

function getEyePosition(shape: FishBodyShape): { cx: number; cy: number; r: number } {
  switch (shape) {
    case 'octopus': return { cx: 38, cy: 32, r: 4 };
    case 'squid': return { cx: 30, cy: 36, r: 3.5 };
    case 'eel': return { cx: 16, cy: 38, r: 3 };
    case 'flat': return { cx: 30, cy: 40, r: 3.5 };
    case 'round': return { cx: 35, cy: 32, r: 4 };
    case 'elongated': return { cx: 22, cy: 36, r: 3 };
    case 'standard':
    default: return { cx: 30, cy: 34, r: 3.5 };
  }
}

// --- Pectoral fin (side fin) ---

function PectoralFin({ shape, color }: { shape: FishBodyShape; color: string }) {
  if (shape === 'squid' || shape === 'octopus' || shape === 'eel') return null;

  const baseX = shape === 'round' ? 38 : shape === 'flat' ? 35 : 35;
  const baseY = shape === 'flat' ? 48 : 44;

  return (
    <path
      d={`M ${baseX},${baseY} Q ${baseX + 8},${baseY + 10} ${baseX + 16},${baseY + 4}`}
      fill={color}
      opacity="0.5"
      stroke={color}
      strokeWidth="0.5"
    />
  );
}

// --- Second eye for octopus ---

function SecondEye({ shape }: { shape: FishBodyShape }) {
  if (shape !== 'octopus') return null;
  return (
    <>
      <circle cx={62} cy={32} r={4} fill="white" />
      <circle cx={63} cy={31} r={2} fill="#111" />
    </>
  );
}

// --- Main component ---

export default function FishIllustration({ fishId, width = 120, height = 80, silhouette = false, className = '' }: FishIllustrationProps) {
  const fish = FISH_MAP.get(fishId);
  if (!fish || !fish.appearance) {
    return <span className={className} style={{ width, height, display: 'inline-block' }} />;
  }

  const { appearance } = fish;
  const bodyColor = silhouette ? '#333' : appearance.bodyColor;
  const accentColor = silhouette ? '#444' : appearance.accentColor;
  const strokeColor = silhouette ? '#222' : darken(appearance.bodyColor, 0.3);

  const eye = getEyePosition(appearance.bodyShape);

  const BodyComponent = {
    standard: StandardBody,
    elongated: ElongatedBody,
    flat: FlatBody,
    round: RoundBody,
    eel: EelBody,
    squid: SquidBody,
    octopus: OctopusBody,
  }[appearance.bodyShape];

  return (
    <svg
      viewBox="0 0 120 80"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {!silhouette && <PatternDefs id={fishId} appearance={appearance} />}

      {/* Fins behind body */}
      {renderFins(appearance.bodyShape, appearance.finStyle, silhouette ? '#444' : accentColor)}

      {/* Body */}
      <BodyComponent fill={bodyColor} stroke={strokeColor} />

      {/* Pattern overlay */}
      {!silhouette && <PatternOverlay id={fishId} appearance={appearance} />}

      {/* Pectoral fin */}
      <PectoralFin shape={appearance.bodyShape} color={silhouette ? '#444' : accentColor} />

      {/* Eye */}
      {!silhouette && (
        <>
          <circle cx={eye.cx} cy={eye.cy} r={eye.r} fill="white" />
          <circle cx={eye.cx + 0.8} cy={eye.cy - 0.5} r={eye.r * 0.55} fill="#111" />
          <SecondEye shape={appearance.bodyShape} />
        </>
      )}
    </svg>
  );
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
