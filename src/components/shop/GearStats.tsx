// 札の絵係: 道具の能力の棒（いまの道具との差が分かる）と、竹の節の耐久の目盛り。
import type { EquipmentType, PlayerEquipment } from '../../game/types';
import Ruby from '../shared/Ruby';
import { GEAR_STAT_MAX, gearStatRows, durabilityTone } from './gearStatCalc';

const pct = (v: number) => `${Math.max(0, Math.min(100, (v / GEAR_STAT_MAX) * 100))}%`;

interface GearStatsProps {
  equipment: PlayerEquipment;
  type: EquipmentType;
  level: number;
  /** 明るい和紙の上に置くとき（字と棒の地を濃くする） */
  onWashi?: boolean;
  className?: string;
}

/** 能力の棒（合わせ・巻き・糸の強さ・当たり）。金=いまより上がる分、朱の斜線=下がる分 */
export default function GearStats({ equipment, type, level, onWashi = false, className = '' }: GearStatsProps) {
  const rows = gearStatRows(equipment, type, level);
  return (
    <div className={`fd-stats ${onWashi ? 'is-washi' : ''} ${className}`}>
      {rows.map(r => {
        const diff = r.next - r.now;
        const up = diff > 0.001;
        const down = diff < -0.001;
        const base = Math.min(r.now, r.next);
        return (
          <div key={r.ability} className="fd-stat" aria-label={`${r.label} ${r.next.toFixed(1)}${up ? '（上がる）' : down ? '（下がる）' : ''}`}>
            <span className="fd-stat-label"><Ruby>{r.label}</Ruby></span>
            <span className="fd-stat-bar">
              <span className="fd-stat-fill" style={{ width: pct(base) }} />
              {up && <span className="fd-stat-up" style={{ left: pct(base), width: pct(diff) }} />}
              {down && <span className="fd-stat-down" style={{ left: pct(base), width: pct(-diff) }} />}
            </span>
            <span className={`fd-stat-mark ${up ? 'is-up' : down ? 'is-down' : ''}`} aria-hidden="true">
              {(up || down) && (
                <svg viewBox="0 0 10 10" width="10" height="10">
                  <path d={up ? 'M5 1 L9.4 8.6 H0.6Z' : 'M5 9 L0.6 1.4 H9.4Z'} fill="currentColor" />
                </svg>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface DurabilityBambooProps {
  /** 耐久度（0〜100） */
  value: number;
  width?: number;
  onWashi?: boolean;
  className?: string;
}

const TONE_FILL = { good: ['#8fca78', '#4f9d5d'], warn: ['#f1d893', '#d4a843'], bad: ['#ef6a52', '#c63a26'] } as const;

/** 耐久の目盛り（竹の節が5つ。減ると節の色が抜け、少なくなると金→朱に変わる） */
export function DurabilityBamboo({ value, width = 84, onWashi = false, className = '' }: DurabilityBambooProps) {
  const v = Math.max(0, Math.min(100, value));
  const tone = durabilityTone(v);
  const [light, dark] = TONE_FILL[tone];
  const W = 84;
  const seg = W / 5;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="img" aria-label={`耐久 ${Math.round(v)}%`}>
      <svg viewBox={`0 0 ${W} 12`} width={width} height={(width * 12) / W} className="shrink-0">
        {/* 空の竹 */}
        <rect x="0.8" y="1.6" width={W - 1.6} height="8.8" rx="3.4" fill={onWashi ? 'rgba(12,31,51,0.22)' : 'rgba(8,22,38,0.7)'} stroke={onWashi ? 'rgba(12,31,51,0.45)' : 'rgba(127,169,205,0.45)'} strokeWidth="0.9" />
        {/* 残っている分 */}
        <clipPath id={`fd-bamboo-${Math.round(v)}`}><rect x="0" y="0" width={(W * v) / 100} height="12" /></clipPath>
        <g clipPath={`url(#fd-bamboo-${Math.round(v)})`}>
          <rect x="0.8" y="1.6" width={W - 1.6} height="8.8" rx="3.4" fill={dark} />
          <rect x="1.6" y="2.4" width={W - 3.2} height="3" rx="1.5" fill={light} opacity="0.95" />
        </g>
        {/* 節 */}
        {[1, 2, 3, 4].map(i => (
          <g key={i}>
            <rect x={i * seg - 1.3} y="0.6" width="2.6" height="10.8" rx="1.2" fill={onWashi ? '#3a2e1c' : '#0a1a2c'} opacity="0.85" />
            <rect x={i * seg - 0.5} y="1.4" width="1" height="9.2" fill={onWashi ? '#fbf6e8' : '#7fa9cd'} opacity="0.45" />
          </g>
        ))}
      </svg>
      <span className={`text-[10px] tabular-nums leading-none ${tone === 'bad' ? 'text-shu-400 font-bold' : onWashi ? 'text-ai-900/70' : 'text-washi/60'}`}>{Math.round(v)}%</span>
    </span>
  );
}

/** 等級の印（ひし形が5つ。等級の数だけ金色） */
export function LevelPips({ level, onWashi = false }: { level: number; onWashi?: boolean }) {
  return (
    <svg viewBox="0 0 44 9" width="44" height="9" className="shrink-0" role="img" aria-label={`等級 ${level}`}>
      {[0, 1, 2, 3, 4].map(i => (
        <path
          key={i}
          d={`M${4.5 + i * 8.8} 0.6 L${8.3 + i * 8.8} 4.5 L${4.5 + i * 8.8} 8.4 L${0.7 + i * 8.8} 4.5Z`}
          fill={i < level ? '#e6c266' : onWashi ? 'rgba(42,33,24,0.16)' : 'rgba(244,236,216,0.14)'}
          stroke={i < level ? '#9a6f24' : onWashi ? 'rgba(42,33,24,0.3)' : 'rgba(244,236,216,0.3)'}
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}
