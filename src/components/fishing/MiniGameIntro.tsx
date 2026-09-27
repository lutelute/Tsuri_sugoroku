import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { FishingMiniGame } from '../../game/types';
import { MINI_GAME_INFO } from './miniGameMeta';
import Ruby from '../shared/Ruby';

// 同じミニゲームの説明を何回見終えたか（ページ内）。3回目からは短い帯だけにする。
const seenCount: Partial<Record<FishingMiniGame, number>> = {};

const FULL_MS = 2200;
const COMPACT_MS = 950;
const SKIP_AFTER_MS = 450;

interface MiniGameIntroProps {
  game: FishingMiniGame;
  /** 会心の合わせのボーナス表示 */
  bonusText?: string;
  onDone: () => void;
}

/** ミニゲーム開始前の説明カード。タップで早送りできる（誤タップ防止に少し待ってから）。 */
export default function MiniGameIntro({ game, bonusText, onDone }: MiniGameIntroProps) {
  const [compact] = useState(() => (seenCount[game] ?? 0) >= 2);
  const firedRef = useRef(false);
  const shownAtRef = useRef(0);
  const duration = compact ? COMPACT_MS : FULL_MS;
  const info = MINI_GAME_INFO[game];

  const fire = useEffectEvent(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    seenCount[game] = (seenCount[game] ?? 0) + 1;
    onDone();
  });

  useEffect(() => {
    shownAtRef.current = performance.now();
    const t = window.setTimeout(() => fire(), duration);
    return () => clearTimeout(t);
  }, [game, duration]);

  const handleSkip = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (firedRef.current || performance.now() - shownAtRef.current < SKIP_AFTER_MS) return;
    firedRef.current = true;
    seenCount[game] = (seenCount[game] ?? 0) + 1;
    onDone();
  };

  if (compact) {
    return (
      <div className="absolute inset-0 z-20 flex items-start justify-center pt-6 fg-touch" onPointerDown={handleSkip}>
        <div className="fg-pop panel-ai rounded-full px-5 py-2 flex items-center gap-2">
          <span className="font-mincho font-bold text-kin-300"><Ruby>{info.title}</Ruby></span>
          <span className="text-washi/80 text-sm"><Ruby>{info.short}</Ruby></span>
          {bonusText && <span className="text-xs text-kin-300 ml-1"><Ruby>{bonusText}</Ruby></span>}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ai-950/55 fg-touch" onPointerDown={handleSkip}>
      <div className="fg-pop washi-card rounded-2xl px-6 py-5 w-[min(88vw,340px)] text-center relative overflow-hidden">
        <p className="text-[11px] tracking-[0.3em] text-kin-700 font-bold">ミニゲーム</p>
        <h3 className="font-mincho text-2xl font-bold text-sumi mt-1"><Ruby>{info.title}</Ruby></h3>
        <div className="my-3 flex justify-center text-ai-700">
          <IntroGlyph game={game} />
        </div>
        {info.lines.map(line => (
          <p key={line} className="text-sm text-sumi/80 leading-relaxed"><Ruby>{line}</Ruby></p>
        ))}
        {bonusText && (
          <p className="mt-2 text-xs font-bold text-shu-600"><Ruby>{bonusText}</Ruby></p>
        )}
        <div className="mt-4 h-1.5 rounded-full bg-sumi/10 overflow-hidden">
          <div className="h-full bg-shu-500 fg-countdown" style={{ animationDuration: `${duration}ms` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-sumi/45"><Ruby>タップで始める</Ruby></p>
      </div>
    </div>
  );
}

/** 説明カードの小さな図解（線画） */
function IntroGlyph({ game }: { game: FishingMiniGame }) {
  const common = { width: 96, height: 56, viewBox: '0 0 96 56', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (game) {
    case 'reeling':
      return (
        <svg {...common} aria-hidden>
          {/* リールと長押しの指 */}
          <circle cx="30" cy="30" r="14" />
          <circle cx="30" cy="30" r="3" fill="currentColor" />
          <path d="M30 30 L42 20" />
          <circle cx="44" cy="18" r="3" />
          <path d="M60 44 V26 a4 4 0 0 1 8 0 V40" />
          <path d="M68 34 a4 4 0 0 1 8 0 V46 a8 8 0 0 1 -8 8 H64" />
          <path d="M84 14 q4 4 0 8 M88 10 q7 8 0 16" stroke="#e34a33" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common} aria-hidden>
          <path d="M22 28 q14 -12 30 0 q-16 12 -30 0 Z" />
          <path d="M52 28 l8 -6 v12 Z" />
          <circle cx="30" cy="26" r="1.8" fill="currentColor" />
          <circle cx="36" cy="28" r="12" stroke="#e34a33" strokeDasharray="4 3" />
          <path d="M74 20 l6 6 M80 20 l-6 6" stroke="#e34a33" />
        </svg>
      );
    case 'reaction':
      return (
        <svg {...common} aria-hidden>
          <path d="M8 36 q10 -4 20 0 t20 0 t20 0 t20 0" />
          <circle cx="48" cy="30" r="7" fill="#e34a33" stroke="none" />
          <path d="M48 16 V23" />
          <path d="M48 44 v6 M44 47 l4 4 l4 -4" stroke="#e34a33" />
        </svg>
      );
    case 'rhythm':
      return (
        <svg {...common} aria-hidden>
          <path d="M10 44 H86" stroke="#b8862f" strokeWidth="3" />
          <circle cx="30" cy="12" r="5" />
          <circle cx="48" cy="26" r="5" />
          <circle cx="66" cy="42" r="6" fill="#e34a33" stroke="none" />
        </svg>
      );
  }
}
