import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { hash01 } from './prng';
import { useReducedMotion } from './useReducedMotion';

export type ConfettiVariant = 'kin' | 'festive' | 'sakura';

const PALETTES: Record<ConfettiVariant, string[]> = {
  // 金箔: 濃淡の金をグラデで
  kin: [
    'linear-gradient(135deg, #fbf0c8, #d4a843 60%, #9a6f24)',
    'linear-gradient(135deg, #f7e7b8, #e6c266 55%, #b8862f)',
    'linear-gradient(135deg, #fff7dc, #f1d893 50%, #d4a843)',
    '#e6c266',
  ],
  // 祝い: 朱・金・藍・若竹・生成り・桜の和紙片
  festive: ['#e34a33', '#f1d893', '#4a7faf', '#2f9e6e', '#f4ecd8', '#e89bb0', '#d4a843'],
  // 桜の花びら
  sakura: ['#f7c6d0', '#f2a7b8', '#fbe3e8', '#e98aa2'],
};

interface ConfettiProps {
  count?: number;
  variant?: ConfettiVariant;
  /** rain: 上から舞い落ちる / burst: 中心から弾けて落ちる */
  mode?: 'rain' | 'burst';
  /** 見た目のばらつきの種（毎回違う散り方にしたいときに変える） */
  seed?: number;
  /** burst の起点の高さ（CSS の top 値） */
  originY?: string;
}

/** 紙吹雪・金箔の舞い（一過性。動きを減らす設定では何も出さない）。 */
export default function Confetti({ count = 44, variant = 'festive', mode = 'rain', seed = 1, originY = '45%' }: ConfettiProps) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => {
    const colors = PALETTES[variant];
    return Array.from({ length: count }, (_, i) => {
      const r = (k: number) => hash01(seed, i, k);
      const petal = variant === 'sakura';
      const leaf = variant === 'kin';
      const w = petal ? 8 + r(1) * 6 : leaf ? 6 + r(1) * 7 : 5 + r(1) * 4;
      const h = petal ? w * 0.8 : leaf ? w * (0.8 + r(2) * 0.4) : 9 + r(2) * 6;
      const angle = r(3) * Math.PI * 2;
      const dist = 90 + r(4) * 170;
      const style: Record<string, string> = {
        '--x': `${(r(5) * 100).toFixed(2)}%`,
        '--w': `${w.toFixed(1)}px`,
        '--h': `${h.toFixed(1)}px`,
        '--c': colors[Math.floor(r(6) * colors.length)],
        '--r': petal ? '70% 0 70% 0' : leaf ? '1px' : '1.5px',
        '--dx': `${((r(7) - 0.5) * 160).toFixed(0)}px`,
        '--rot': `${((r(8) - 0.5) * 900).toFixed(0)}deg`,
        '--flip': `${(360 + r(9) * 720).toFixed(0)}deg`,
        '--dur': `${(mode === 'burst' ? 1.7 + r(10) * 1.0 : 2.3 + r(10) * 1.4).toFixed(2)}s`,
        '--delay': `${(mode === 'burst' ? r(11) * 0.12 : r(11) * 0.7).toFixed(2)}s`,
        '--bx': `${(Math.cos(angle) * dist).toFixed(0)}px`,
        '--by': `${(Math.sin(angle) * dist * 0.8 - 60).toFixed(0)}px`,
      };
      return style as CSSProperties;
    });
  }, [count, variant, mode, seed]);

  if (reduced) return null;
  return (
    <div
      className={`fx-confetti ${mode === 'burst' ? 'is-burst' : ''}`}
      aria-hidden="true"
      style={{ '--oy': originY } as CSSProperties}
    >
      {pieces.map((s, i) => (
        <i key={i} style={s} />
      ))}
    </div>
  );
}
