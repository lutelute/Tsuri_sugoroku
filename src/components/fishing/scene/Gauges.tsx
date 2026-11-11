// ミニゲームの計器（和の意匠）: 金箔の縁の筒に組紐の中身。数値の意味はこれまでと同じで、見た目だけを整える。
import type { CSSProperties, ReactNode } from 'react';
import Ruby from '../../shared/Ruby';

/** 糸の張り。caution / danger は境目の割合（金の目盛りを打つ） */
export function TensionGauge({ ratio, color, caution, danger }: { ratio: number; color: string; caution: number; danger: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  return (
    <div className="um-gauge">
      <div className="um-gauge-zone bg-emerald-500/15" style={{ left: 3, width: `calc((100% - 6px) * ${caution})` }} />
      <div className="um-gauge-zone bg-kin-500/20" style={{ left: `calc(3px + (100% - 6px) * ${caution})`, width: `calc((100% - 6px) * ${danger - caution})` }} />
      <div className="um-gauge-zone bg-shu-500/35" style={{ left: `calc(3px + (100% - 6px) * ${danger})`, right: 3, borderRadius: '0 6px 6px 0' }} />
      <div className="um-gauge-fill" style={{ width: `calc((100% - 6px) * ${r})`, '--um-gc': color } as CSSProperties} />
      <i className="um-gauge-tick" style={{ left: `calc(3px + (100% - 6px) * ${caution})` }} />
      <i className="um-gauge-tick" style={{ left: `calc(3px + (100% - 6px) * ${danger})` }} />
    </div>
  );
}

/** 寄せ（0〜1）。中身の先頭を小さな魚が泳いでくる */
export function ProgressGauge({ ratio, smooth = false }: { ratio: number; smooth?: boolean }) {
  const r = Math.max(0, Math.min(1, ratio));
  const tr = smooth ? 'transition-[width,left] duration-300' : '';
  return (
    <div className="um-gauge is-slim">
      <div
        className={`um-gauge-fill ${tr}`}
        style={{ width: `calc((100% - 6px) * ${r})`, backgroundColor: undefined, backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.22) 0 4px, transparent 4px 8px), linear-gradient(90deg, #4a7faf, #e6c266)' }}
      />
      <svg className={`um-gauge-fish ${tr}`} style={{ left: `max(21px, calc(3px + (100% - 6px) * ${r}))` }} viewBox="0 0 24 14" aria-hidden>
        <path d="M23 7 C 18 1.5 9 1.5 5.5 7 C 9 12.5 18 12.5 23 7 Z M 6 7 L 0.8 2.6 V 11.4 Z" />
      </svg>
    </div>
  );
}

/** ゲージの見出し行（左に名前、右に数字） */
export function GaugeLabel({ left, right, alert = false }: { left: string; right: ReactNode; alert?: boolean }) {
  return (
    <div className="um-ink flex justify-between text-xs mb-1">
      <span className={alert ? 'text-shu-400 font-bold' : 'text-washi/85'}><Ruby>{left}</Ruby></span>
      <span className="text-washi/80 tabular-nums">{right}</span>
    </div>
  );
}

/** 太鼓リール（押している間だけ回る） */
export function ReelWheel({ holding }: { holding: boolean }) {
  return (
    <svg className={`um-reel ${holding ? 'is-on' : ''}`} viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="40" r="38" fill="#071627" stroke={holding ? '#f7e7b8' : '#b8862f'} strokeWidth="3" />
      <g className={holding ? 'fg-reel-spin' : ''} style={{ transformOrigin: '40px 40px' }}>
        <circle cx="40" cy="40" r="31" fill="#7a5326" stroke="#3b2511" strokeWidth="2" />
        <circle cx="40" cy="40" r="31" fill="none" stroke="#c99a52" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.6" />
        {[0, 60, 120, 180, 240, 300].map(a => (
          <circle key={a} cx={40 + Math.cos((a * Math.PI) / 180) * 18} cy={40 + Math.sin((a * Math.PI) / 180) * 18} r="5.4" fill="#071627" stroke="#3b2511" strokeWidth="1.2" />
        ))}
        <circle cx="40" cy="40" r="6" fill="#e6c266" stroke="#3b2511" strokeWidth="1.5" />
        <path d="M40 40 L62 18" stroke="#e6c266" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="63" cy="17" r="7" fill="#e34a33" stroke="#3b2511" strokeWidth="1.5" />
        <circle cx="61" cy="15" r="2" fill="#fff" opacity="0.6" />
      </g>
    </svg>
  );
}
