// まちづくり: 手札（花札・かるた風の縦長の札）。札をタップすると画面の下からシートが出て、説明と「使う」を見せる。
// （町パネルの中やスマホの横向きでも「使う」が画面外に出ないように、説明は下からのシートにまとめた）
// その場面で使えない札は薄く表示する（説明は読める）。札の効果の処理はストア側（playCityCard）が行う。
import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { CARD_CATEGORY_INFO, CARD_INFO, CARD_TIMING_LABEL, MAX_HAND, canUseAt } from '../../game/cityCards';
import type { CardUseTiming, CityCardId } from '../../game/cityCards';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import BottomSheet from '../fx/BottomSheet';
import { playCardFlip } from '../../utils/sound';

/** 札の表（和紙地に色帯・大きな一文字・札名）。売り場でも使う */
export function CardFace({ id, width = 64, dim = false }: { id: CityCardId; width?: number; dim?: boolean }) {
  const info = CARD_INFO[id];
  const tone = CARD_CATEGORY_INFO[info.category];
  const height = Math.round(width * 1.5);
  const small = width < 56;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[7px] select-none transition-[filter,opacity] duration-200 ${dim ? 'opacity-45 grayscale-[45%]' : ''}`}
      style={{
        width,
        height,
        background: 'radial-gradient(120% 110% at 20% 0%, #fdf9ee 0%, #f3ead3 55%, #e4d4ae 100%)',
        border: `2px solid ${tone.color}`,
        boxShadow: '0 6px 14px -6px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.6)',
      }}
      aria-hidden="true"
    >
      {/* 内枠 */}
      <div className="absolute inset-[3px] rounded-[4px] border" style={{ borderColor: `${tone.color}55` }} />
      {/* 上の色帯（札の種類） */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center font-mincho text-washi tracking-[0.2em]"
        style={{ height: '19%', background: tone.color, fontSize: small ? 8 : 10 }}
      >
        {tone.label}
      </div>
      {/* 日の丸のような薄い円と、大きな一文字 */}
      <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: '21%', bottom: '25%' }}>
        <span className="absolute rounded-full" style={{ width: width * 0.62, height: width * 0.62, background: `${tone.color}1f` }} />
        <span className="relative font-brush leading-none" style={{ color: tone.color, fontSize: width * 0.55 }}>{info.glyph}</span>
      </div>
      {/* 札名 */}
      <div
        className="absolute inset-x-0 bottom-[6%] text-center font-mincho font-bold leading-none text-[#2a2118] whitespace-nowrap"
        style={{ fontSize: small ? (info.name.length > 3 ? 8 : 9) : info.name.length > 3 ? 10 : 11 }}
      >
        {info.name}
      </div>
      {/* 非売品の印 */}
      {info.price === null && (
        <span
          className="seal absolute rounded-[3px] font-mincho leading-none"
          style={{ top: '22%', right: '7%', width: small ? 12 : 15, height: small ? 12 : 15, fontSize: small ? 7 : 9 }}
        >
          稀
        </span>
      )}
    </div>
  );
}

/** 札の小さな印（ボタンや下の欄に添える） */
export function CardIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect x="4.5" y="1.5" width="8" height="12" rx="1.4" fill="#e4d4ae" stroke="#9a6f24" strokeWidth="1" transform="rotate(12 8.5 7.5)" />
      <rect x="3" y="2.5" width="8" height="12" rx="1.4" fill="#fbf6e8" stroke="#c63a26" strokeWidth="1.2" />
      <rect x="3" y="2.5" width="8" height="2.6" fill="#c63a26" />
      <circle cx="7" cy="9.4" r="2" fill="#c63a26" opacity="0.85" />
    </svg>
  );
}

interface CardHandProps {
  hand: CityCardId[];
  timing: CardUseTiming;
  onUse: (index: number) => void;
  disabled?: boolean;
  /** 町の画面の中など、狭い場所向け（小さな札を一列に並べる） */
  compact?: boolean;
}

/** 手札。空のときは何も描かない */
export default function CardHand({ hand, timing, onUse, disabled = false, compact = false }: CardHandProps) {
  const [sel, setSel] = useState<number | null>(null);
  // 新しく配られた札だけ舞い込ませる（減ったときは何もしない）
  const [prevLen, setPrevLen] = useState(hand.length);
  const [dealFrom, setDealFrom] = useState(hand.length);
  if (hand.length !== prevLen) {
    setDealFrom(hand.length > prevLen ? prevLen : hand.length);
    setPrevLen(hand.length);
  }
  if (hand.length === 0) return null;

  const selected = sel !== null && sel < hand.length ? sel : null;
  const width = compact ? 44 : 60;
  const mid = (hand.length - 1) / 2;

  const use = (index: number) => {
    if (disabled || !canUseAt(hand[index], timing)) return;
    playCardFlip();
    setSel(null);
    onUse(index);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') setSel(null);
  };

  const sheet = selected !== null && (() => {
    const id = hand[selected];
    const info = CARD_INFO[id];
    const usable = !disabled && canUseAt(id, timing);
    const tone = CARD_CATEGORY_INFO[info.category].color;
    return (
      <BottomSheet label={`${info.name}の説明`} onClose={() => setSel(null)}>
        <div className="flex gap-3 items-start">
          <span className="fx-deal shrink-0" style={{ animationDuration: '0.35s' }}>
            <CardFace id={id} width={64} dim={!usable} />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-brush text-2xl leading-none" style={{ color: tone }}><Ruby>{info.name}</Ruby></span>
              <span className="text-[11px] font-mincho text-[#7a5a2a]"><Ruby>{CARD_TIMING_LABEL[info.timing]}</Ruby></span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#4a3a28]"><Ruby>{info.desc}</Ruby></p>
            {!usable && (
              <p className="mt-1 text-xs font-bold text-[#a92e1d]">
                <Ruby>{disabled ? '今は使えない' : `今は使えない（${CARD_TIMING_LABEL[info.timing]}）`}</Ruby>
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => use(selected)} variant="gold" size="md" disabled={!usable} className="flex-1 min-h-11 font-mincho tracking-widest">
            <Ruby>使う</Ruby>
          </Button>
          <button
            type="button"
            onClick={() => setSel(null)}
            className="min-h-11 px-4 text-sm rounded-xl border border-[#9a6f24]/40 bg-[#2a2118]/5 text-[#2a2118] hover:bg-[#2a2118]/10 active:scale-95 transition cursor-pointer font-mincho"
          >
            <Ruby>やめる</Ruby>
          </button>
        </div>
      </BottomSheet>
    );
  })();

  const cards = (
    <div data-guide="hand" className={`flex items-end justify-center ${compact ? 'gap-1.5' : ''}`} role="list" aria-label={`手札 ${hand.length}枚`}>
      {hand.map((id, i) => {
        const info = CARD_INFO[id];
        const usable = !disabled && canUseAt(id, timing);
        const isSel = selected === i;
        // 扇のように少し開いて並べる（compact は一列）
        const off = i - mid;
        const style: CSSProperties = compact
          ? { transform: isSel ? 'translateY(-6px)' : undefined }
          : {
              transform: `translateY(${isSel ? -16 : Math.abs(off) * 5}px) rotate(${isSel ? 0 : off * 6}deg)`,
              margin: '0 -3px',
              zIndex: isSel ? 10 : 1,
            };
        return (
          <button
            key={`${i}-${id}`}
            type="button"
            role="listitem"
            onClick={() => setSel(isSel ? null : i)}
            aria-pressed={isSel}
            aria-label={`${info.name}：${info.desc}${usable ? '' : '（今は使えない）'}`}
            title={info.name}
            className={`relative rounded-[8px] cursor-pointer transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-300 ${
              isSel ? 'ring-2 ring-kin-300 ring-offset-1 ring-offset-ai-950' : usable ? 'hover:-translate-y-1' : ''
            }`}
            style={style}
          >
            <span className={i >= dealFrom ? 'fx-deal' : 'block'} style={i >= dealFrom ? ({ animationDelay: `${(i - dealFrom) * 90}ms` } as CSSProperties) : undefined}>
              <CardFace id={id} width={width} dim={!usable} />
            </span>
            {usable && !isSel && (
              <span className="pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-kin-400 shadow-[0_0_6px_rgba(241,216,147,0.9)]" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-1 w-full' : 'gap-2'}`} onKeyDown={onKey}>
      {cards}
      <span className="text-[10px] font-mincho tracking-widest text-washi/60">
        <Ruby>手札</Ruby> {hand.length}/{MAX_HAND}・<Ruby>札を押すと説明</Ruby>
      </span>
      {sheet}
    </div>
  );
}
