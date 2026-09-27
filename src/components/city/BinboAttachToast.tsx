// まちづくり: 貧乏神がとりついた・移ったときの短いお知らせ（数秒で自動で消える。押しても消える）。
import { useEffect, useRef } from 'react';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import { playBad, playCardFlip } from '../../utils/sound';
import BinboFigure from './BinboFigure';

export interface BinboAttachToastProps {
  /** とりつかれた人 */
  playerName: string;
  playerColor: string;
  great: boolean;
  /** destination: 目的地の一番乗りでとりついた / pass: すれ違いで移った */
  reason: 'destination' | 'pass';
  /** 移る前にとりつかれていた人（pass のとき） */
  fromName?: string;
  /** 同じ内容が続いたときに演出をやり直すための番号 */
  seq?: number;
  /** 自動で消えるまで(ms) */
  durationMs?: number;
  onDone: () => void;
}

export default function BinboAttachToast({ playerName, playerColor, great, reason, fromName, seq = 0, durationMs = 2800, onDone }: BinboAttachToastProps) {
  // 親が毎回新しい関数を渡しても、タイマーを張り直さない
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (reason === 'destination') playBad();
    else playCardFlip();
    const t = window.setTimeout(() => doneRef.current(), durationMs);
    return () => clearTimeout(t);
  }, [reason, durationMs, seq]);

  const who = great ? '大貧乏神' : '貧乏神';
  const title = reason === 'destination' ? `${who}がとりついた！` : `${who}が移った！`;
  const body = reason === 'destination'
    ? '目的地からいちばん遠かったので、ねらわれてしまった'
    : fromName ? `${fromName}がすれ違いざまに押し付けた` : 'すれ違いざまに移ってきた';

  return (
    <button
      type="button"
      onClick={() => doneRef.current()}
      role="status"
      className="fixed top-28 left-1/2 z-50 w-[92%] max-w-sm washi-card rounded-xl pl-2 pr-4 py-2 text-left shadow-2xl animate-slide-in-down cursor-pointer flex items-center gap-2"
      style={{ borderTop: `4px solid ${great ? '#5a2d82' : '#5a4a36'}` }}
    >
      <span
        className="shrink-0 rounded-lg"
        style={{ background: great ? 'radial-gradient(circle at 50% 70%, #3b2a52, #20162e)' : 'radial-gradient(circle at 50% 70%, #e9dcc0, #d8c6a0)' }}
      >
        <BinboFigure size={64} great={great} animated />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] text-[#4a3a28]">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: playerColor }} />
          <span className="font-bold truncate">{playerName}</span>
        </span>
        <span className="block font-mincho font-bold leading-snug" style={{ color: great ? '#5a2d82' : '#a92e1d' }}><Ruby>{title}</Ruby></span>
        <span className="block text-xs text-[#4a3a28] mt-0.5 leading-relaxed"><Ruby>{body}</Ruby></span>
      </span>
      <Stamp tone={reason === 'destination' ? 'sumi' : 'ai'} size={40} delay={260} tilt={-9}>{reason === 'destination' ? '凶' : '移'}</Stamp>
    </button>
  );
}
