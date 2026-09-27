import { useEffect } from 'react';
import Confetti from './Confetti';
import { playChime, playGood } from '../../utils/sound';
import ScreenFlash from './ScreenFlash';
import Stamp from './Stamp';
import Ruby from '../shared/Ruby';

interface CityToastCardProps {
  title: string;
  body: string;
  seq: number;
  onDismiss: () => void;
}

/** まちづくりのお知らせ（瓦版風）。目的地一番乗りは金箔と判子で祝う。 */
export default function CityToastCard({ title, body, seq, onDismiss }: CityToastCardProps) {
  const first = title.includes('一番乗り');
  const arrived = title.includes('到達');
  useEffect(() => {
    if (first) playGood();
    else playChime();
  }, [first]);
  return (
    <>
      {first && <Confetti variant="kin" mode="burst" count={46} seed={seq} originY="18%" />}
      {first && <ScreenFlash color="#fff1c4" opacity={0.35} />}
      <button
        onClick={onDismiss}
        className="fixed top-14 left-1/2 z-50 w-[92%] max-w-md washi-card rounded-xl pl-3 pr-4 py-3 text-left shadow-2xl animate-slide-in-down cursor-pointer flex items-center gap-3"
        style={{ borderTop: '4px solid #a92e1d' }}
        role="status"
      >
        <Stamp tone={first ? 'shu' : arrived ? 'kin' : 'ai'} size={first ? 58 : 46} vertical={first} delay={220} tilt={-9}>
          {first ? '一番乗り' : arrived ? '到着' : '報'}
        </Stamp>
        <span className="min-w-0">
          <span className="block text-[10px] tracking-[0.3em] text-[#7a5a2a] font-mincho"><Ruby>瓦版</Ruby></span>
          <span className="block font-mincho font-bold text-[#a92e1d] leading-snug"><Ruby>{title}</Ruby></span>
          <span className="block text-xs text-[#4a3a28] mt-0.5 leading-relaxed"><Ruby>{body}</Ruby></span>
        </span>
      </button>
    </>
  );
}
