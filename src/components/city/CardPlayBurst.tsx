// まちづくり: 札を切った瞬間の演出。画面の中ほどで札が浮き上がって光り、「発動」の判子が押されて消える。
// 操作は妨げない（pointer-events なし）。body へポータルで描くので、町パネルの中から出しても画面の中央に出る。
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CityCardId } from '../../game/cityCards';
import { CardFace } from './CardHand';
import Stamp from '../fx/Stamp';

/** 演出を出しておく時間（CSS の fx-card-play と揃える） */
const BURST_MS = 1000;

export default function CardPlayBurst({ id, onDone }: { id: CityCardId; onDone: () => void }) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  // アニメの終わりではなくタイマーで片付ける（動きを減らす設定でも確実に消える）
  useEffect(() => {
    const t = window.setTimeout(() => doneRef.current(), BURST_MS);
    return () => clearTimeout(t);
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center" aria-hidden="true">
      <div className="fx-card-play relative">
        <div className="fx-ring" />
        <CardFace id={id} width={84} />
        <span className="absolute -right-5 -bottom-3">
          <Stamp tone="shu" size={44} delay={180} tilt={-12}>発動</Stamp>
        </span>
      </div>
    </div>,
    document.body,
  );
}
