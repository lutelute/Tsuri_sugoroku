import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { playArrive } from '../../utils/sound';
import Stamp from './Stamp';
import type { StampTone } from './nodeStyle';
import Ruby from '../shared/Ruby';

interface ArrivalBannerProps {
  name: string;
  glyph: string;
  tone: StampTone;
  label: string;
  /** 駒が着くまでの待ち(ms)。その瞬間に巻物がひらき、判子が押される */
  delayMs: number;
}

/** 到着したマスを巻物＋判子で見せる。 */
export default function ArrivalBanner({ name, glyph, tone, label, delayMs }: ArrivalBannerProps) {
  // 駒が着いた瞬間に柝「カ、カン」（続けて判子の「ポン」が鳴る）
  useEffect(() => {
    const t = window.setTimeout(playArrive, delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none" role="status">
      <div
        className="fx-scroll-open washi-card rounded-md pl-3 pr-5 py-2 flex items-center gap-3 shadow-2xl"
        style={{
          animationDelay: `${delayMs}ms`,
          borderLeft: '6px solid #9a6f24',
          borderRight: '6px solid #9a6f24',
        } as CSSProperties}
      >
        <Stamp tone={tone} size={40} delay={delayMs + 260} tilt={-10}>{glyph}</Stamp>
        <div className="leading-tight">
          <p className="text-[10px] tracking-[0.3em] text-[#7a5a2a] font-mincho"><Ruby>{label}</Ruby></p>
          <p className="font-brush text-2xl text-[#2a2118] whitespace-nowrap">
            <Ruby>{name}</Ruby>
            <span className="font-mincho text-sm text-[#a92e1d] ml-1.5"><Ruby>に到着！</Ruby></span>
          </p>
        </div>
      </div>
    </div>
  );
}
