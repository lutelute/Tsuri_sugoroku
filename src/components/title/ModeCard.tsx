// 遊び方の絵の札（タイトルでは「あそぶ」、設定画面では遊び方の切り替え）。
import type { CSSProperties } from 'react';
import Ruby from '../shared/Ruby';
import Icon from '../shared/Icon';
import Stamp from '../fx/Stamp';
import ModeArt from './ModeArt';
import type { ModeArtKind } from './ModeArt';

interface ModeCardProps {
  mode: ModeArtKind;
  title: string;
  desc: string;
  onClick: () => void;
  ariaLabel: string;
  /** タイトル用: 「あそぶ」の金の札を出す */
  cta?: boolean;
  /** 設定画面用: 選んでいる札（金の縁と印）。undefined なら切り替えの札ではない */
  selected?: boolean;
  /** 「新」の判子 */
  isNew?: boolean;
  /** 入場の遅れ(ms) */
  delay?: number;
  /** 小さめ（設定画面） */
  compact?: boolean;
}

export default function ModeCard({ mode, title, desc, onClick, ariaLabel, cta = false, selected, isNew = false, delay = 0, compact = false }: ModeCardProps) {
  const toggle = selected !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={toggle ? selected : undefined}
      className={`hr-mode fx-mode-card ${toggle ? (selected ? 'is-selected' : 'is-idle') : 'fx-rise'} ${compact ? 'is-compact' : ''}`}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      {isNew && (
        <span className="absolute -top-2.5 -right-2 z-10">
          <Stamp tone="shu" size={compact ? 26 : 32} delay={delay + 700} tilt={12} silent>新</Stamp>
        </span>
      )}
      {toggle && selected && (
        <span className="hr-mode-check" aria-hidden="true"><Icon name="check" size={15} /></span>
      )}
      {/* 選び直すたびに絵の動きをはじめから流す（選んでいない札は、でき上がりの絵のまま） */}
      <span className="hr-mode-art" key={toggle ? String(selected) : 'art'}>
        <ModeArt mode={mode} />
      </span>
      <span className="hr-mode-body">
        <span className="hr-mode-title font-brush"><Ruby>{title}</Ruby></span>
        <span className="hr-mode-desc"><Ruby>{desc}</Ruby></span>
        {cta && (
          <span className="hr-mode-cta font-mincho">
            <Ruby>あそぶ</Ruby> ›
          </span>
        )}
      </span>
    </button>
  );
}
