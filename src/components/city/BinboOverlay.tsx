// まちづくり: 月末の貧乏神の悪さを見せる寸劇カード。
// 幕が開く → 貧乏神が「なにやら企んでいる」 → 悪さの小道具と判子で結果を見せる。
// 動きを減らす設定では企みの間を飛ばし、最初から結果を出す（アニメも止まる）。
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import ScreenFlash from '../fx/ScreenFlash';
import { useCountUp } from '../fx/useCountUp';
import { useReducedMotion } from '../fx/useReducedMotion';
import { playBad, playCardFlip, playChime, playCoinLoss } from '../../utils/sound';
import BinboFigure from './BinboFigure';
import type { BinboMischiefKind } from '../../game/binbo';

export interface BinboOverlayProps {
  playerName: string;
  playerColor: string;
  kind: BinboMischiefKind;
  message: string;
  great: boolean;
  onClose: () => void;
  /** とりつかれた人のお金の増減（渡すとマイナスのときだけ数え上げて見せる） */
  moneyDelta?: number;
  /** お金を渡された人の色（kind が give のとき、巾着の色に使う） */
  targetColor?: string;
}

/** 企んでいる間（この後に悪さを明かす） */
const INTRO_MS = 1100;

const KIND_STYLE: Record<BinboMischiefKind, { title: string; seal: string; tone: 'shu' | 'kin' | 'ai' | 'sumi'; accent: string }> = {
  waste: { title: '無駄遣い', seal: '散財', tone: 'sumi', accent: '#7a4a1e' },
  sell: { title: '勝手に売却', seal: '売却', tone: 'shu', accent: '#a92e1d' },
  give: { title: '勝手に施し', seal: '施し', tone: 'ai', accent: '#24496e' },
  none: { title: 'ひと休み', seal: '無事', tone: 'kin', accent: '#1f6b3a' },
};

/** 穴あき銭 */
function Coin({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#e6c266" stroke="#9a6f24" strokeWidth={1} />
      <circle r={r * 0.72} fill="none" stroke="#b8862f" strokeWidth={0.5} />
      <rect x={-r * 0.28} y={-r * 0.28} width={r * 0.56} height={r * 0.56} fill="#7a5a2a" />
    </g>
  );
}

/** 動かすときだけ付ける SMIL（1回きり・止まったらその位置で残す） */
function Fly({ on, to, dur = '1.1s', begin = '0s' }: { on: boolean; to: string; dur?: string; begin?: string }) {
  if (!on) return null;
  return (
    <>
      <animateTransform attributeName="transform" type="translate" additive="sum" from="0 0" to={to} dur={dur} begin={begin} fill="freeze" />
      <animate attributeName="opacity" values="1;1;0.35" dur={dur} begin={begin} fill="freeze" />
    </>
  );
}

/** 悪さの小道具（貧乏神の横に置く小さな場面） */
function MischiefProp({ kind, great, animate, targetColor }: { kind: BinboMischiefKind; great: boolean; animate: boolean; targetColor: string }) {
  const n = great ? 2 : 1;
  return (
    <svg width={108} height={126} viewBox="0 0 96 112" aria-hidden="true" overflow="visible" className="fx-fade-in shrink-0 [@media(max-height:520px)]:h-[78px] [@media(max-height:520px)]:w-auto">
      {kind === 'waste' && (
        <>
          {/* 役に立たない壺と、飛んでいくお金 */}
          <path d="M 30 104 C 16 102 14 84 24 76 C 20 72 22 66 30 66 L 42 66 C 50 66 52 72 48 76 C 58 84 56 102 42 104 Z" fill="#6a7f6a" stroke="#34443a" strokeWidth={1.2} />
          <path d="M 22 88 Q 36 94 50 88" fill="none" stroke="#b8c6a8" strokeWidth={1.2} opacity={0.7} />
          <ellipse cx={36} cy={66} rx={9} ry={2.4} fill="#34443a" />
          {Array.from({ length: 3 * n }, (_, i) => (
            <g key={i} transform={`translate(${48 + (i % 3) * 12} ${60 - Math.floor(i / 3) * 14})`}>
              <g>
                <Fly on={animate} to={`${16 + i * 6} ${-44 - i * 8}`} begin={`${i * 0.12}s`} />
                <Coin x={0} y={0} r={great ? 6.5 : 6} />
              </g>
            </g>
          ))}
        </>
      )}
      {kind === 'sell' && (
        <>
          {/* 売りに出された家と「売」の札 */}
          {Array.from({ length: n }, (_, i) => (
            <g key={i} transform={`translate(${i * 30 - (n - 1) * 12} ${i * 6})`}>
              <path d="M 22 104 L 22 72 L 44 56 L 66 72 L 66 104 Z" fill="#e9dcc0" stroke="#5a4a36" strokeWidth={1.2} />
              <path d="M 16 74 L 44 52 L 72 74" fill="none" stroke="#6b4a2a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              <rect x={37} y={86} width={14} height={18} fill="#8a6a44" />
              <rect x={27} y={78} width={8} height={7} fill="#b9d0e0" stroke="#5a4a36" strokeWidth={0.6} />
              <g>
                {animate && (
                  <animateTransform attributeName="transform" type="rotate" values="-14 58 62; 9 58 62; -4 58 62; 0 58 62" dur="1.4s" fill="freeze" />
                )}
                <line x1={58} y1={62} x2={58} y2={68} stroke="#5a4a36" strokeWidth={0.8} />
                <rect x={51} y={68} width={14} height={18} rx={1} fill="#fbf6e8" stroke="#a92e1d" strokeWidth={1.2} />
                <text x={58} y={78} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold" fill="#a92e1d" fontFamily='"Shippori Mincho", serif'>売</text>
              </g>
            </g>
          ))}
        </>
      )}
      {kind === 'give' && (
        <>
          {/* お金がよその人の巾着へ */}
          <path d="M 8 70 Q 44 30 80 70" fill="none" stroke="#9a6f24" strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
          <path d="M 66 78 C 64 96 68 104 80 104 C 92 104 96 96 94 78 Z" fill={targetColor} stroke="#2a2118" strokeWidth={1} />
          <path d="M 64 78 Q 80 72 96 78" fill="none" stroke="#2a2118" strokeWidth={2} strokeLinecap="round" />
          {Array.from({ length: 2 * n }, (_, i) => (
            <g key={i} transform={`translate(${10 + i * 5} ${72 - i * 4})`}>
              <g>
                <Fly on={animate} to={`${66 - i * 5} ${4 + i * 4}`} dur="1.2s" begin={`${i * 0.18}s`} />
                <Coin x={0} y={0} r={6} />
              </g>
            </g>
          ))}
        </>
      )}
      {kind === 'none' && (
        <>
          {/* すやすや */}
          {['Z', 'z', 'z'].map((ch, i) => (
            <text key={i} x={18 + i * 16} y={70 - i * 16} fontSize={20 - i * 4} fontWeight="bold" fill="#24496e" opacity={animate ? 0 : 0.8}
              fontFamily='"Shippori Mincho", serif'>
              {animate && <animate attributeName="opacity" values="0;0.85;0.85" dur="0.9s" begin={`${i * 0.3}s`} fill="freeze" />}
              {ch}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}

function LossAmount({ amount }: { amount: number }) {
  const shown = useCountUp(amount, 900, 0, 200);
  return (
    <p className="fx-pop text-center text-2xl font-bold font-mincho tabular-nums text-[#a92e1d]" style={{ '--d': '200ms' } as CSSProperties}>
      −¥{shown.toLocaleString()}
    </p>
  );
}

export default function BinboOverlay({ playerName, playerColor, kind, message, great, onClose, moneyDelta, targetColor = '#4a7faf' }: BinboOverlayProps) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced);
  const style = KIND_STYLE[kind];
  const who = great ? '大貧乏神' : '貧乏神';
  const harmful = kind !== 'none';

  // 幕が開く音
  useEffect(() => {
    playCardFlip();
  }, []);

  // 企みの間 → 悪さを明かす
  useEffect(() => {
    if (revealed) return;
    const t = window.setTimeout(() => setRevealed(true), INTRO_MS);
    return () => clearTimeout(t);
  }, [revealed]);

  // 明かした瞬間の音（判子の「ポン」は Stamp が鳴らす）
  useEffect(() => {
    if (!revealed) return;
    const timers: number[] = [];
    if (!harmful) {
      playChime();
    } else {
      playBad();
      if (kind === 'waste' || kind === 'give') timers.push(window.setTimeout(playCoinLoss, 420));
      if (great) timers.push(window.setTimeout(playBad, 520));
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [revealed, harmful, kind, great]);

  // キーボード: Esc / Enter で（明かした後なら）閉じる。企み中なら明かす
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault();
      if (revealed) onClose();
      else setRevealed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm ${great ? 'bg-[#140a1f]/75' : 'bg-black/60'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="binbo-overlay-title"
    >
      {revealed && harmful && <ScreenFlash color={great ? '#6d3a9c' : '#5a4a36'} opacity={great ? 0.5 : 0.35} />}

      <div className={`w-[92%] max-w-sm ${revealed && harmful ? 'fx-shake' : ''}`}>
        {/* 横向きのスマホ（高さ 390px 前後）でも OK まで届くよう、はみ出す分はスクロール */}
        <div
          className="washi-card animate-bounce-in rounded-2xl p-4 sm:p-5 text-center relative overflow-x-hidden overflow-y-auto overscroll-contain max-h-[92dvh]"
          style={{ borderTop: `5px solid ${great ? '#5a2d82' : style.accent}` }}
        >
          {/* 見出し */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="h-px w-8" style={{ background: style.accent, opacity: 0.5 }} />
            <span className="text-[11px] tracking-[0.35em] font-mincho" style={{ color: style.accent }}>
              <Ruby>月末</Ruby>・<Ruby>{`${who}の悪さ`}</Ruby>
            </span>
            <span className="h-px w-8" style={{ background: style.accent, opacity: 0.5 }} />
          </div>

          {great && (
            <p className="mx-auto mb-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold tracking-widest text-[#f1d893]"
              style={{ background: 'linear-gradient(90deg, #3b1f5a, #6d3a9c, #3b1f5a)' }}>
              <Ruby>大貧乏神</Ruby>・<Ruby>被害</Ruby>2<Ruby>倍</Ruby>
            </p>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-[#4a3a28] mb-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: playerColor }} />
            <span className="font-bold">{playerName}</span>
            <span><Ruby>{`にとりついた${who}`}</Ruby></span>
          </p>

          {/* 寸劇の舞台 */}
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={revealed}
            aria-label={revealed ? undefined : '悪さを見る'}
            className="relative w-full rounded-xl mb-3 [@media(max-height:520px)]:mb-2 flex items-end justify-center gap-1 pt-3 pb-1 overflow-hidden cursor-pointer disabled:cursor-default"
            style={{
              background: great
                ? 'radial-gradient(120% 90% at 50% 100%, #3b2a52 0%, #20162e 70%)'
                : 'radial-gradient(120% 90% at 50% 100%, #e9dcc0 0%, #d8c6a0 80%)',
              boxShadow: 'inset 0 0 18px rgba(42,33,24,0.35)',
            }}
          >
            <BinboFigure size={150} great={great} animated title={who} className="shrink-0 [@media(max-height:520px)]:h-[92px] [@media(max-height:520px)]:w-auto" />
            {revealed ? (
              <MischiefProp kind={kind} great={great} animate={!reduced} targetColor={targetColor} />
            ) : (
              <span className="mb-16 [@media(max-height:520px)]:mb-8 ml-1 rounded-full bg-[#fbf6e8] px-3 py-1 text-lg font-bold text-[#4a3a28] shadow fx-fade-in" aria-hidden="true">
                ……
              </span>
            )}
          </button>

          {revealed ? (
            <div className="fx-fade-in">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Stamp tone={great && harmful ? 'sumi' : style.tone} size={52} delay={120} tilt={-10}>{style.seal}</Stamp>
                <h3 id="binbo-overlay-title" className="font-brush text-3xl leading-tight text-[#2a2118]"><Ruby>{style.title}</Ruby></h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4a3a28] mb-2 font-mincho font-bold"><Ruby>{message}</Ruby></p>
              {moneyDelta !== undefined && moneyDelta < 0 && harmful && <LossAmount amount={-moneyDelta} />}
              <Button onClick={onClose} variant={harmful ? 'primary' : 'gold'} size="md" className="w-full min-h-11 mt-3">OK</Button>
            </div>
          ) : (
            <div>
              <h3 id="binbo-overlay-title" className="font-brush text-2xl leading-tight text-[#2a2118] mb-1"><Ruby>{`${who}がなにやら企んでいる`}</Ruby>……</h3>
              <p className="text-[11px] text-[#7a5a2a]"><Ruby>舞台を押すとすぐに見られます</Ruby></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
