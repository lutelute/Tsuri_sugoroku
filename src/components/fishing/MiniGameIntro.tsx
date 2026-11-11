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
        <div className="fg-pop um-intro-band">
          <span className="font-brush text-lg text-kin-300"><Ruby>{info.title}</Ruby></span>
          <span className="text-washi/90 text-sm"><Ruby>{info.short}</Ruby></span>
          {bonusText && <span className="text-xs text-kin-300 ml-1"><Ruby>{bonusText}</Ruby></span>}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ai-950/45 fg-touch" onPointerDown={handleSkip}>
      {/* 和紙の札に、舞台と同じ絵柄の小さな図解（空・波・浮き・竹竿） */}
      <div className="fg-pop um-intro">
        <span className="um-intro-tag">ミニゲーム</span>
        <h3 className="font-brush text-3xl text-sumi"><Ruby>{info.title}</Ruby></h3>
        <div className="um-intro-art">
          <IntroGlyph game={game} />
        </div>
        {info.lines.map(line => (
          <p key={line} className="text-sm text-sumi/85 leading-relaxed"><Ruby>{line}</Ruby></p>
        ))}
        {bonusText && (
          <p className="mt-2 inline-block rounded-full bg-shu-600 px-3 py-0.5 text-xs font-bold text-washi"><Ruby>{bonusText}</Ruby></p>
        )}
        <div className="um-intro-bar">
          <div className="fg-countdown" style={{ animationDuration: `${duration}ms` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-sumi/55"><Ruby>タップで始める</Ruby></p>
      </div>
    </div>
  );
}

/** 説明カードの小さな図解。上が空、波の線の下が水中（舞台と同じ並び） */
function IntroGlyph({ game }: { game: FishingMiniGame }) {
  const sea = (
    <>
      <rect x="0" y="0" width="160" height="30" fill="#cfe0e0" />
      <rect x="0" y="30" width="160" height="54" fill="#2f6c9c" />
      <rect x="0" y="56" width="160" height="28" fill="#1e4f7c" opacity="0.7" />
      <path d="M0 31 C 12 25 22 25 30 30 C 28 31 27 33 28 35 C 44 37 54 31 66 26 C 76 24 84 25 90 30 C 88 31 87 33 88 35 C 104 37 114 31 126 26 C 136 24 144 25 150 30 C 148 31 147 33 148 35 C 154 36 158 35 160 34 L 160 40 L 0 40 Z" fill="#2f6c9c" />
      <path d="M12 27 C 18 24 24 24 30 29 M72 25 C 78 23 84 24 90 29 M132 25 C 138 23 144 24 150 29" fill="none" stroke="#f4f1e4" strokeWidth="2" strokeLinecap="round" />
    </>
  );
  const fish = (x: number, y: number, s = 1, flip = false) => (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C 6 -8 18 -8 24 0 C 18 8 6 8 0 0 Z M 24 0 L 32 -6 V 6 Z" fill="#0a1b30" stroke="#cfe4f2" strokeWidth="0.8" strokeOpacity="0.6" />
      <circle cx="5.5" cy="-1.5" r="1.3" fill="#cfe4f2" />
    </g>
  );
  const bobber = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="-20" x2="0" y2="-9" stroke="#2a2118" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="0" y1="-24" x2="0" y2="-19" stroke="#e34a33" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-9 0 A 9 9 0 0 1 9 0 Z" fill="#e34a33" />
      <path d="M-9 0 A 9 9 0 0 0 9 0 Z" fill="#f4ecd8" />
      <path d="M-9 0 H9" stroke="#e6c266" strokeWidth="1.6" />
      <circle r="9" fill="none" stroke="#1a1510" strokeOpacity="0.5" />
    </g>
  );
  return (
    <svg viewBox="0 0 160 84" className="block w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {sea}
      {game === 'reeling' && (
        <>
          {/* 竹竿がしなり、糸の先に魚。長押しのしるし */}
          <path d="M 150 84 C 146 56 132 26 104 14" fill="none" stroke="#24170b" strokeWidth="5" strokeLinecap="round" />
          <path d="M 150 84 C 146 56 132 26 104 14" fill="none" stroke="#c9963c" strokeWidth="3" strokeLinecap="round" />
          <path d="M 104 14 Q 78 38 58 58" fill="none" stroke="#f4ecd8" strokeWidth="1.4" />
          {fish(28, 60, 1.05)}
          <circle cx="126" cy="60" r="9" fill="#f4ecd8" stroke="#e34a33" strokeWidth="2" />
          <circle cx="126" cy="60" r="14" fill="none" stroke="#e34a33" strokeWidth="1.6" strokeDasharray="3 4" opacity="0.8" />
        </>
      )}
      {game === 'target' && (
        <>
          {fish(58, 58, 1.25)}
          <circle cx="74" cy="58" r="20" fill="none" stroke="#f1d893" strokeWidth="2.2" strokeDasharray="5 4" />
          <path d="M 120 46 l 9 9 M 129 46 l -9 9" stroke="#ef6a52" strokeWidth="2.6" strokeLinecap="round" />
          {fish(132, 70, 0.6, true)}
        </>
      )}
      {game === 'reaction' && (
        <>
          {bobber(52, 32)}
          <path d="M 76 22 h 14 m -5 -5 l 5 5 l -5 5" fill="none" stroke="#2a2118" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          {/* 沈んだ瞬間 */}
          <g opacity="0.55">{bobber(112, 46)}</g>
          <ellipse cx="112" cy="33" rx="18" ry="4" fill="none" stroke="#f4f1e4" strokeWidth="1.6" />
          <path d="M 112 62 v 9 m -5 -4 l 5 5 l 5 -5" fill="none" stroke="#ef6a52" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {game === 'rhythm' && (
        <>
          <rect x="62" y="34" width="36" height="50" fill="#071627" opacity="0.6" />
          <path d="M 62 70 H 98" stroke="#f1d893" strokeWidth="3" />
          {[[80, 44, 0.55], [80, 57, 0.8], [80, 70, 1]].map(([x, y, o]) => (
            <g key={y} opacity={o}>
              <path d={`M ${x - 7} ${y} A 7 7 0 0 1 ${x + 7} ${y} Z`} fill="#e34a33" />
              <path d={`M ${x - 7} ${y} A 7 7 0 0 0 ${x + 7} ${y} Z`} fill="#f4ecd8" />
              <circle cx={x} cy={y} r="7" fill="none" stroke="#1a1510" strokeOpacity="0.5" />
            </g>
          ))}
          <circle cx="80" cy="70" r="13" fill="none" stroke="#f1d893" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}
