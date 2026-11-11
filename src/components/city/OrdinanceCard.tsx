// 条例の絵と札。町長の欄（MayorSection）と、遊び方の画面で使う。
import type { OrdinanceKind } from '../../game/mayor';
import { ORDINANCE_INFO } from '../../game/mayor';
import Ruby from '../shared/Ruby';

/** 条例ごとの小さな絵（24×24） */
export function OrdinanceIcon({ kind, size = 22, className = '' }: { kind: OrdinanceKind; size?: number; className?: string }) {
  const c = ORDINANCE_INFO[kind].color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx={12} cy={12} r={11.2} fill="#fbf6e8" stroke={c} strokeWidth={1.4} />
      {kind === 'factory' && (
        <>
          {/* のこぎり屋根の工場と煙突 */}
          <path d="M5 18 V11 L8.5 13 V11 L12 13 V11 L15.5 13 V9 H18 V18 Z" fill={c} />
          <path d="M16 8 q1.5 -2 3 -1.2 q1.4 -2 3 -0.6" fill="none" stroke="#8a7a64" strokeWidth={1} strokeLinecap="round" />
          <rect x={7} y={15} width={2} height={1.8} fill="#fbf6e8" />
          <rect x={11} y={15} width={2} height={1.8} fill="#fbf6e8" />
        </>
      )}
      {kind === 'childcare' && (
        <>
          {/* 親子（大きい人と小さい人が手をつなぐ） */}
          <circle cx={9} cy={7.5} r={2.3} fill={c} />
          <path d="M6.2 18.5 V13 q0 -2.8 2.8 -2.8 q2.8 0 2.8 2.8 V18.5 Z" fill={c} />
          <circle cx={16} cy={11} r={1.8} fill={c} />
          <path d="M13.8 18.5 V15.4 q0 -2 2.2 -2 q2.2 0 2.2 2 V18.5 Z" fill={c} />
          <path d="M11.8 14.4 L14 15.2" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
        </>
      )}
      {kind === 'tourism' && (
        <>
          {/* 鳥居 */}
          <path d="M4.5 7 Q12 5 19.5 7 L19 8.8 Q12 7.2 5 8.8 Z" fill={c} />
          <rect x={6} y={10} width={12} height={1.5} fill={c} />
          <rect x={7.3} y={8.2} width={1.8} height={10.5} fill={c} />
          <rect x={14.9} y={8.2} width={1.8} height={10.5} fill={c} />
          <rect x={11.2} y={8} width={1.6} height={2.2} fill={c} />
        </>
      )}
      {kind === 'scenery' && (
        <>
          {/* 山と松 */}
          <path d="M3.5 18 L10 8.5 L13.5 13 L15.5 10.5 L20.5 18 Z" fill="#9fc3b4" />
          <path d="M10 8.5 L8.2 11.2 L11.8 11.2 Z" fill="#fbf6e8" />
          <rect x={15.6} y={13.5} width={1.3} height={5} fill="#6b4a2a" />
          <ellipse cx={16.2} cy={12.6} rx={3.6} ry={1.6} fill={c} />
          <ellipse cx={16.2} cy={10.6} rx={2.6} ry={1.3} fill={c} />
        </>
      )}
      {kind === 'tax' && (
        <>
          {/* 千両箱 */}
          <path d="M5 10 Q12 5.5 19 10 Z" fill={c} />
          <rect x={5} y={10} width={14} height={8} rx={0.8} fill={c} />
          <path d="M5 13 H19" stroke="#e6c266" strokeWidth={1.1} />
          <rect x={10.6} y={11.8} width={2.8} height={2.6} rx={0.4} fill="#e6c266" />
        </>
      )}
    </svg>
  );
}

interface OrdinanceCardProps {
  kind: OrdinanceKind;
  /** 今効いているか（町長がいないとお休み） */
  active: boolean;
  /** 決めた人の名前・色 */
  byName?: string;
  byColor?: string;
}

/** 町に出ている条例の札 */
export default function OrdinanceCard({ kind, active, byName, byColor }: OrdinanceCardProps) {
  const info = ORDINANCE_INFO[kind];
  return (
    <div
      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 washi-card ${active ? '' : 'opacity-70 grayscale-[0.5]'}`}
      style={{ borderLeft: `5px solid ${info.color}` }}
      data-guide="ordinance-card"
    >
      <OrdinanceIcon kind={kind} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] tracking-[0.2em] text-[#7a5a2a]"><Ruby>条例</Ruby></span>
          <span className="font-mincho font-bold text-[#2a2118]"><Ruby>{info.name}</Ruby></span>
          {!active && <span className="text-[10px] px-1.5 rounded bg-[#6b5a44] text-[#fbf6e8]"><Ruby>お休み中</Ruby></span>}
        </p>
        <p className="text-[11px] text-[#4a3a28] leading-snug"><Ruby>{info.effect}</Ruby></p>
        <p className="text-[10px] text-[#6b5a44] leading-snug">
          <Ruby>町長の負担</Ruby>：<Ruby>{info.burden}</Ruby>
          {byName && (
            <>
              {' '}・<span className="font-bold" style={{ color: byColor }}>{byName}</span><Ruby>が決めた</Ruby>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
