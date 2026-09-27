// 釣り場の舞台装置（背景・浮き・水しぶき）。どれも軽いDOM/SVG＋CSSアニメのみ。
import { useId } from 'react';
import type { CSSProperties } from 'react';

/** 釣り場の背景。岸釣りは遠山、船釣りは水平線。 */
export function PondBackdrop({ boat }: { boat: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* 空 */}
      <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-ai-950 via-ai-900 to-ai-700" />
      {/* 月 */}
      <div className="absolute top-[7%] right-[12%] w-10 h-10 rounded-full bg-washi/85 shadow-[0_0_30px_8px_rgba(244,236,216,0.25)]" />
      {boat ? (
        // 水平線と遠くの島影
        <svg className="absolute inset-x-0 top-[22%] w-full h-[9%]" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path d="M0 40 L0 30 Q60 26 120 30 Q150 18 175 30 Q260 28 400 31 L400 40 Z" fill="#0c1f33" opacity="0.9" />
        </svg>
      ) : (
        // 遠山（二重の稜線）
        <svg className="absolute inset-x-0 top-[12%] w-full h-[19%]" viewBox="0 0 400 80" preserveAspectRatio="none">
          <path d="M0 80 L0 48 Q40 20 80 42 Q120 8 170 38 Q210 22 250 44 Q300 12 350 40 Q380 30 400 36 L400 80 Z" fill="#15314f" />
          <path d="M0 80 L0 62 Q60 44 110 60 Q160 46 210 62 Q270 48 320 64 Q360 56 400 60 L400 80 Z" fill="#102a44" />
        </svg>
      )}
      {/* 水面 */}
      <div className="absolute inset-x-0 top-[30%] bottom-0 bg-gradient-to-b from-ai-500 via-ai-700 to-ai-950" />
      <div className="absolute top-[30%] bottom-0 left-0 w-[calc(100%+96px)] fg-waves opacity-80" />
      {/* 水面のきらめき線 */}
      <div className="absolute inset-x-0 top-[30%] h-px bg-kin-300/40" />
    </div>
  );
}

type BobberState = 'idle' | 'sink';

/** 玉浮き（朱と白）。ゆらゆら揺れ、nibbleKey が変わるたびにピクッと動く。state='sink' で沈む。 */
export function Bobber({ state, nibbleKey = 0, size = 30 }: { state: BobberState; nibbleKey?: number; size?: number }) {
  const clipId = useId().replace(/:/g, '');
  const sunk = state === 'sink';
  return (
    <div className={sunk ? '' : 'fg-bob'} style={{ width: size, height: size * 2 }}>
      <div key={sunk ? 'sink' : `n${nibbleKey}`} className={sunk ? 'fg-sink' : nibbleKey > 0 ? 'fg-nibble' : ''}>
        <svg viewBox="0 0 30 60" width={size} height={size * 2} aria-hidden>
          <defs>
            <clipPath id={clipId}><rect x="0" y="0" width="30" height="33" /></clipPath>
          </defs>
          {/* 羽根（トップ） */}
          <line x1="15" y1="2" x2="15" y2="20" stroke="#f1d893" strokeWidth="2" strokeLinecap="round" />
          {/* 玉: 上半分が朱、下半分が白 */}
          <circle cx="15" cy="33" r="11" fill="#f4ecd8" />
          <circle cx="15" cy="33" r="11" fill="#e34a33" clipPath={`url(#${clipId})`} />
          <circle cx="11" cy="28" r="3" fill="#fff" opacity="0.55" />
          <circle cx="15" cy="33" r="11" fill="none" stroke="#1a1510" strokeOpacity="0.35" strokeWidth="1" />
          {/* 水面下の足 */}
          <line x1="15" y1="44" x2="15" y2="58" stroke="#f4ecd8" strokeOpacity="0.35" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

/** 放射状の水しぶき。key を変えて再生する。 */
export function Splash({ count = 9, distance = 54, color }: { count?: number; distance?: number; color?: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (360 / count) * i - 90 + (i % 2 ? 12 : -8);
        const style = {
          '--a': `${a}deg`,
          '--d': `${-(distance * (0.7 + (i % 3) * 0.18))}px`,
          animationDelay: `${(i % 3) * 25}ms`,
          ...(color ? { background: color } : {}),
        } as CSSProperties;
        return <span key={i} className="fg-drop" style={style} />;
      })}
    </div>
  );
}

/** 波紋（key を変えて再生） */
export function Ripple({ size = 90, delay = 0 }: { size?: number; delay?: number }) {
  return <span className="fg-ripple" style={{ width: size, height: size, animationDelay: `${delay}ms` }} aria-hidden />;
}
