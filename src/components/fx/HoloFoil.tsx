import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';
import Ruby from '../shared/Ruby';

// 図鑑全体で監視を共用。スクロールのたびに React を再描画しない。
let observer: IntersectionObserver | undefined;
const surfaces = new Set<HTMLElement>();

function observeSurface(element: HTMLElement) {
  // 未対応の環境では静止した箔のままにする。
  if (typeof IntersectionObserver === 'undefined') return () => {};
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (surfaces.has(entry.target as HTMLElement)) {
        (entry.target as HTMLElement).dataset.hfVisible = String(entry.isIntersecting);
      }
    }
  });
  surfaces.add(element);
  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    surfaces.delete(element);
    delete element.dataset.hfVisible;
    if (surfaces.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

// 固定上限。再描画でも位置・位相を変えず、図鑑の札ごとの乱数生成を避ける。
const STARS = Array.from({ length: 18 }, (_, i) => ({
  left: `${7 + (i * 37) % 87}%`,
  top: `${6 + (i * 29) % 85}%`,
  '--hf-size': `${i % 3 === 0 ? 15 : 9}px`,
  '--hf-duration': `${3.2 + (i % 5) * 0.43}s`,
  '--hf-delay': `${-i * 0.61}s`,
} as CSSProperties));
const SAND = Array.from({ length: 14 }, (_, i) => ({
  left: `${5 + (i * 31) % 90}%`,
  top: `${9 + (i * 43) % 82}%`,
  '--hf-size': `${2 + i % 3}px`,
  '--hf-duration': `${4.8 + (i % 4) * 0.7}s`,
  '--hf-delay': `${-i * 0.73}s`,
} as CSSProperties));

interface HoloFoilProps {
  tier: 'mythical' | 'legendary';
  children: ReactNode;
  className?: string;
  /** 釣果の台紙だけ、一度返って光る。 */
  reveal?: boolean;
  onReveal?: () => void;
}

/** 和紙の上を斜めに流れる螺鈿の箔。装飾は操作や読み上げを妨げない。 */
export default function HoloFoil({ tier, children, className = '', reveal = false, onReveal }: HoloFoilProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || !ref.current) return;
    return observeSurface(ref.current);
  }, [reducedMotion]);

  return (
    <div ref={ref} className={`hf-surface hf-${tier} ${reveal ? 'hf-reveal' : ''} ${className}`} data-hf-reduced={reducedMotion}
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'hf-turn' && !reducedMotion) onReveal?.();
      }}
    >
      {children}
      <span className="hf-foil" aria-hidden="true">
        {tier === 'mythical' && <span className="hf-rays hf-motion" />}
        <span className="hf-sheen hf-motion" />
        {tier === 'mythical' && <span className="hf-sheen hf-sheen-cross hf-motion" />}
        {tier === 'mythical' && STARS.map((style, i) => (
          <i key={`star-${i}`} className={`hf-star hf-motion ${i % 2 ? 'hf-star-cross' : ''}`} style={style} />
        ))}
        {SAND.slice(0, tier === 'mythical' ? 14 : 6).map((style, i) => (
          <i key={`sand-${i}`} className="hf-sand hf-motion" style={style} />
        ))}
        <span className="hf-rim hf-motion" />
        {tier === 'mythical' && <span className="hf-seal font-brush"><Ruby>幻</Ruby><i className="hf-seal-glint hf-motion" /></span>}
      </span>
      {reveal && tier === 'mythical' && <span className="hf-burst hf-motion" aria-hidden="true" />}
    </div>
  );
}
