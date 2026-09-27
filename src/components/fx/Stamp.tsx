import type { AnimationEvent } from 'react';
import Ruby from '../shared/Ruby';
import { playStamp } from '../../utils/sound';

interface StampProps {
  children: string;
  tone?: 'shu' | 'kin' | 'ai' | 'sumi';
  /** 一辺の大きさ(px) */
  size?: number;
  /** 縦書き（4文字なら右列→左列の2列、はんこらしく） */
  vertical?: boolean;
  round?: boolean;
  /** 押すまでの待ち(ms) */
  delay?: number;
  /** 押した角度 */
  tilt?: number;
  className?: string;
  /** 押す音を鳴らさない（伏せた札の飾りなど） */
  silent?: boolean;
}

// 判子を押すアニメ（動きを減らす設定ではフェード）が始まった瞬間に「ポン」
const STAMP_ANIMS = new Set(['seal-stamp', 'fx-fade-in']);

/** 判子をぽんと押す演出。 */
export default function Stamp({ children, tone = 'shu', size = 64, vertical = false, round = false, delay = 0, tilt = -8, className = '', silent = false }: StampProps) {
  const onStart = (e: AnimationEvent<HTMLSpanElement>) => {
    if (!silent && e.target === e.currentTarget && STAMP_ANIMS.has(e.animationName)) playStamp();
  };
  const n = [...children].length;
  const fontSize = vertical
    ? size * (n <= 2 ? 0.4 : 0.34)
    : size * (n === 1 ? 0.62 : n === 2 ? 0.4 : n === 3 ? 0.3 : 0.24);
  return (
    <span
      onAnimationStart={onStart}
      className={`fx-stamp is-${tone} ${vertical ? 'is-vertical' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        borderRadius: round ? '50%' : size * 0.14,
        padding: size * 0.08,
        animationDelay: `${delay}ms`,
        rotate: `${tilt}deg`,
        letterSpacing: vertical ? '0.02em' : 0,
      }}
    >
      {/* 1つの要素に包む（ふりがな ON でも判子の枠内で折り返す） */}
      <span className="block text-center">
        <Ruby>{children}</Ruby>
      </span>
    </span>
  );
}
