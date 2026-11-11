// 釣り場の小道具（浮き・波紋・水しぶき）。どれも軽いDOM/SVG＋CSSアニメのみ。
// 背景の絵（空・遠景・波・水中）は scene/FishingStage.tsx。
import { useId } from 'react';
import type { CSSProperties } from 'react';

type BobberState = 'idle' | 'sink';

/**
 * 玉浮き（朱と白、金の帯）。ゆらゆら揺れ、nibbleKey が変わるたびにピクッと動く。state='sink' で沈む。
 * 大きさは画面に合わせて変わる（size を渡すとその px）。玉の中心が「横 50%・縦 55%」に来る。
 * afloat=false は宙を飛んでいる間（水の縁を描かない）。
 */
export function Bobber({ state, nibbleKey = 0, size, afloat = true }: { state: BobberState; nibbleKey?: number; size?: number; afloat?: boolean }) {
  const clipId = useId().replace(/:/g, '');
  const sunk = state === 'sink';
  const style = size ? ({ '--um-bob': `${size}px` } as CSSProperties) : undefined;
  return (
    <div className="um-bobber" style={style}>
      <div className={sunk ? 'um-bobber-body' : 'um-bobber-body fg-bob'}>
        <div key={sunk ? 'sink' : `n${nibbleKey}`} className={sunk ? 'fg-sink' : nibbleKey > 0 ? 'fg-nibble' : ''}>
          <svg viewBox="0 0 30 60" className="block w-full h-full" aria-hidden>
            <defs>
              <clipPath id={clipId}><rect x="0" y="0" width="30" height="33" /></clipPath>
            </defs>
            {/* 羽根（トップ）: 朱の先・白い帯・墨の軸 */}
            <line x1="15" y1="13" x2="15" y2="23" stroke="#2a2118" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="15" y1="9" x2="15" y2="13" stroke="#f4ecd8" strokeWidth="2.6" />
            <line x1="15" y1="3" x2="15" y2="9" stroke="#e34a33" strokeWidth="2.6" strokeLinecap="round" />
            {/* 水面下の足 */}
            <line x1="15" y1="44" x2="15" y2="58" stroke="#f4ecd8" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />
            {/* 玉: 上半分が朱、下半分が白、合わせ目に金の帯 */}
            <circle cx="15" cy="33" r="11" fill="#f4ecd8" />
            <circle cx="15" cy="33" r="11" fill="#e34a33" clipPath={`url(#${clipId})`} />
            <path d="M4.4 33 H25.6" stroke="#e6c266" strokeWidth="1.8" />
            <ellipse cx="10.8" cy="27.4" rx="3.2" ry="2.1" fill="#fff" opacity="0.6" transform="rotate(-28 10.8 27.4)" />
            <circle cx="15" cy="33" r="11" fill="none" stroke="#1a1510" strokeOpacity="0.55" strokeWidth="1.1" />
          </svg>
        </div>
      </div>
      {/* 浮きの手前を洗う水（沈むとこの下へ隠れる） */}
      {afloat && <span className="um-lap" aria-hidden />}
    </div>
  );
}

/** 放射状の水しぶき。key を変えて再生する。spread を狭めると上向きの扇になる（水面の出来事むき）。 */
export function Splash({ count = 9, distance = 54, color, spread = 360 }: { count?: number; distance?: number; color?: string; spread?: number }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = spread >= 360
          ? (360 / count) * i - 90 + (i % 2 ? 12 : -8)
          : -spread / 2 + (spread / Math.max(1, count - 1)) * i + (i % 2 ? 5 : -4);
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

/** 波紋（key を変えて再生）。flat は横から見た水面の輪（平たい楕円）。 */
export function Ripple({ size = 90, delay = 0, flat = false }: { size?: number; delay?: number; flat?: boolean }) {
  if (flat) {
    return <span className="um-ripple" style={{ width: size, height: size * 0.26, animationDelay: `${delay}ms` }} aria-hidden />;
  }
  return <span className="fg-ripple" style={{ width: size, height: size, animationDelay: `${delay}ms` }} aria-hidden />;
}

/**
 * 水柱（北斎ふうの波の舌が立ち上がって崩れる）。幅 0 の親の中に置くと、その点を水面にして真上へ上がる。
 * key を変えて再生する。
 */
export function SplashCrown({ size = 120, delay = 0, tone = 'foam' }: { size?: number; delay?: number; tone?: 'foam' | 'kin' }) {
  const style = { '--um-s': `${size}px`, animationDelay: `${delay}ms` } as CSSProperties;
  return (
    <svg className={`um-crown ${tone === 'kin' ? 'is-kin' : ''}`} style={style} viewBox="-60 -100 120 108" aria-hidden>
      <ellipse cx="0" cy="2" rx="46" ry="6" className="um-crown-base" />
      <g className="um-crown-water">
        <path d="M -27 2 C -40 -12 -50 -24 -58 -30 C -44 -30 -30 -18 -17 2 Z" />
        <path d="M 27 2 C 40 -12 50 -24 58 -30 C 44 -30 30 -18 17 2 Z" />
        <path d="M -16 2 C -26 -30 -34 -52 -46 -68 C -30 -58 -17 -36 -5 2 Z" />
        <path d="M 16 2 C 26 -30 34 -52 46 -68 C 30 -58 17 -36 5 2 Z" />
        <path d="M -11 2 C -13 -40 -7 -70 0 -94 C 7 -70 13 -40 11 2 Z" />
      </g>
      <g className="um-crown-drops">
        <circle cx="-31" cy="-80" r="3" />
        <circle cx="23" cy="-86" r="2.5" />
        <circle cx="42" cy="-56" r="3" />
        <circle cx="-53" cy="-46" r="2.2" />
        <circle cx="-10" cy="-98" r="2" />
        <circle cx="54" cy="-74" r="1.8" />
      </g>
    </svg>
  );
}
