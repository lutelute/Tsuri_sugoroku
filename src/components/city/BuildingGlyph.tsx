// 建物の種類を表す小さな SVG 絵（UI 用）。24x24 viewBox。
import type { BuildingKind } from '../../game/city';
import { BUILDING_INFO } from '../../game/city';

export function BuildingShapes({ kind, level = 1 }: { kind: BuildingKind; level?: number }) {
  const c = BUILDING_INFO[kind].color;
  switch (kind) {
    case 'res':
      // 家（等級で棟が増える）
      return (
        <g>
          <path d="M3 13 8 8.5 13 13v7H3Z" fill={c} stroke="#1c140c" strokeWidth="1" strokeLinejoin="round" />
          <rect x="6.5" y="15.5" width="3" height="4.5" fill="#1c140c" opacity="0.55" />
          {level >= 2 && <path d="M12 12.5 16.5 8.5 21 12.5V20h-9Z" fill={c} stroke="#1c140c" strokeWidth="1" strokeLinejoin="round" opacity="0.9" />}
          {level >= 3 && <rect x="9" y="3" width="6" height="8" fill="#e9dcc0" stroke="#1c140c" strokeWidth="1" />}
        </g>
      );
    case 'com':
      // 店（のれん） / ビル
      return (
        <g>
          <rect x="4" y={level >= 3 ? 4 : level >= 2 ? 8 : 11} width="16" height={level >= 3 ? 16 : level >= 2 ? 12 : 9} fill={c} stroke="#1c140c" strokeWidth="1" />
          <path d="M3.5 11h17l-1.5 3h-14Z" fill="#fbf6e8" stroke="#1c140c" strokeWidth="0.8" />
          <path d="M6 11v3M9.5 11v3M13 11v3M16.5 11v3" stroke={c} strokeWidth="1.4" />
          {level >= 2 && <path d="M7 6.5h2M11 6.5h2M15 6.5h2" stroke="#fbf6e8" strokeWidth="1.2" opacity="0.8" />}
        </g>
      );
    case 'ind':
      // 工場（煙突）
      return (
        <g>
          <path d="M3 20V12l5 3v-3l5 3v-3l5 3V20Z" fill={c} stroke="#1c140c" strokeWidth="1" strokeLinejoin="round" />
          <rect x="17" y={level >= 2 ? 4 : 7} width="3" height={level >= 2 ? 11 : 8} fill="#8a7a64" stroke="#1c140c" strokeWidth="0.9" />
          <circle cx="19.5" cy={level >= 2 ? 2.8 : 5.6} r="1.4" fill="#cfc6b8" opacity="0.8" />
          {level >= 3 && <rect x="1.5" y="9" width="3" height="11" fill="#8a7a64" stroke="#1c140c" strokeWidth="0.9" />}
        </g>
      );
    case 'park':
      return (
        <g>
          <circle cx="9" cy="10" r="5" fill={c} stroke="#1c140c" strokeWidth="1" />
          <circle cx="15.5" cy="12" r="4" fill="#5fae55" stroke="#1c140c" strokeWidth="1" />
          <path d="M9 15v5M15.5 16v4" stroke="#6b4b2a" strokeWidth="1.6" />
          <path d="M3 20h18" stroke="#1c140c" strokeWidth="1" />
        </g>
      );
    case 'power':
      // 発電所（冷却塔 + 稲妻）
      return (
        <g>
          <path d="M5 20c1.5-4 1.5-8 0-12h8c-1.5 4-1.5 8 0 12Z" fill="#cfc6b8" stroke="#1c140c" strokeWidth="1" />
          <path d="M16.5 4 13.5 12h3l-2 8 6-10h-3.2l2-6Z" fill={c} stroke="#1c140c" strokeWidth="0.9" strokeLinejoin="round" />
        </g>
      );
    case 'port':
      // 漁港（錨）
      return (
        <g>
          <path d="M12 4v14M8 7.5h8" stroke="#1c140c" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 4v14M8 7.5h8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 13c0 4 3 6 7 6s7-2 7-6" fill="none" stroke="#1c140c" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M5 13c0 4 3 6 7 6s7-2 7-6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="3.5" r="1.8" fill={c} stroke="#1c140c" strokeWidth="0.9" />
        </g>
      );
    case 'tourism':
      // 観光名所（五重塔）
      return (
        <g>
          <path d="M12 2v3" stroke="#1c140c" strokeWidth="1.2" />
          <path d="M6 7h12l-2 2H8ZM5.5 11.5h13l-2 2h-9ZM5 16h14l-2 2H7Z" fill={c} stroke="#1c140c" strokeWidth="0.9" strokeLinejoin="round" />
          <rect x="9" y="9" width="6" height="2.5" fill="#e9dcc0" stroke="#1c140c" strokeWidth="0.7" />
          <rect x="9" y="13.5" width="6" height="2.5" fill="#e9dcc0" stroke="#1c140c" strokeWidth="0.7" />
          <rect x="9.5" y="18" width="5" height="2.5" fill="#e9dcc0" stroke="#1c140c" strokeWidth="0.7" />
          {level >= 2 && <circle cx="12" cy="4.5" r="1.3" fill="#f1d893" />}
        </g>
      );
  }
}

export default function BuildingGlyph({ kind, level = 1, size = 28, className = '' }: { kind: BuildingKind; level?: number; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <BuildingShapes kind={kind} level={level} />
    </svg>
  );
}
