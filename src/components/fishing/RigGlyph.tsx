// 仕掛けの小さな絵。釣り方を選ぶ画面と、町の魚市場の帯で使う。
import type { FishingRig } from '../../game/types';

/** 仕掛けの絵（数ねらい=小魚3匹 / ふつう=浮きと魚 / 大物ねらい=大きな魚） */
export default function RigGlyph({ rig, size = 34 }: { rig: FishingRig; size?: number }) {
  const fish = (x: number, y: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0c2.2-2.7 6-3.5 9-1.5l3-2.3v7.6l-3-2.3c-3 2-6.8 1.2-9-1.5z" fill="currentColor" />
      <circle cx="2.8" cy="-0.7" r="0.75" fill="var(--color-ai-950)" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className={`shrink-0 ${rig === 'kazu' ? 'text-ai-200' : rig === 'oomono' ? 'text-kin-300' : 'text-washi'}`}>
      {rig === 'kazu' && [fish(3, 8, 0.95, 0), fish(14, 15, 0.95, 1), fish(5, 23, 0.95, 2)]}
      {rig === 'futsu' && (
        <>
          <path d="M22 2v9" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <ellipse cx="22" cy="13" rx="2.6" ry="3.4" fill="var(--color-shu-500)" />
          <path d="M19.4 13h5.2" stroke="var(--color-washi)" strokeWidth="1.1" />
          {fish(3, 21, 1.5, 0)}
        </>
      )}
      {rig === 'oomono' && (
        <>
          <path d="M3 5h8M17 4h9M6 27h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
          {fish(2, 16, 2.15, 0)}
        </>
      )}
    </svg>
  );
}
