// まちづくり: 手札（花札・かるた風の縦長の札）。札をタップすると持ち上がって説明が出て、「使う」で onUse を呼ぶ。
// その場面で使えない札は薄く表示する（説明は読める）。札の効果の処理はストア側（useCityCard など）が行う。
import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { CARD_CATEGORY_INFO, CARD_INFO, CARD_TIMING_LABEL, MAX_HAND, canUseAt } from '../../game/cityCards';
import type { CardUseTiming, CityCardId } from '../../game/cityCards';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
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

interface CardHandProps {
  hand: CityCardId[];
  timing: CardUseTiming;
  onUse: (index: number) => void;
  disabled?: boolean;
  /** 町の画面の中など、狭い場所向け（小さな札を一列に並べ、説明は下に出す） */
  compact?: boolean;
}

/** 手札。空のときは何も描かない */
export default function CardHand({ hand, timing, onUse, disabled = false, compact = false }: CardHandProps) {
  const [sel, setSel] = useState<number | null>(null);
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

  const detail = selected !== null && (() => {
    const id = hand[selected];
    const info = CARD_INFO[id];
    const usable = !disabled && canUseAt(id, timing);
    const tone = CARD_CATEGORY_INFO[info.category].color;
    return (
      <div
        className={`washi-card fx-rise rounded-xl px-3 py-2.5 text-left ${compact ? 'w-full' : 'w-[min(18rem,calc(100vw-2rem))]'}`}
        role="dialog"
        aria-label={`${info.name}の説明`}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-brush text-2xl leading-none" style={{ color: tone }}><Ruby>{info.name}</Ruby></span>
          <span className="text-[10px] font-mincho text-[#7a5a2a]"><Ruby>{CARD_TIMING_LABEL[info.timing]}</Ruby></span>
        </div>
        <p className="mt-1 text-sm leading-snug text-[#4a3a28]"><Ruby>{info.desc}</Ruby></p>
        {!usable && (
          <p className="mt-1 text-[11px] font-bold text-[#a92e1d]">
            <Ruby>{disabled ? '今は使えない' : `今は使えない（${CARD_TIMING_LABEL[info.timing]}）`}</Ruby>
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Button onClick={() => use(selected)} variant="gold" size="sm" disabled={!usable} className="flex-1">
            <Ruby>使う</Ruby>
          </Button>
          <button
            type="button"
            onClick={() => setSel(null)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#9a6f24]/40 bg-[#2a2118]/5 text-[#2a2118] hover:bg-[#2a2118]/10 active:scale-95 transition cursor-pointer"
          >
            <Ruby>やめる</Ruby>
          </button>
        </div>
      </div>
    );
  })();

  const cards = (
    <div className={`flex items-end justify-center ${compact ? 'gap-1.5' : ''}`} role="list" aria-label={`手札 ${hand.length}枚`}>
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
              isSel ? 'ring-2 ring-kin-300 ring-offset-1 ring-offset-ai-950' : usable && !compact ? 'hover:-translate-y-1' : ''
            }`}
            style={style}
          >
            <CardFace id={id} width={width} dim={!usable} />
            {usable && !isSel && (
              <span className="pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-kin-400 shadow-[0_0_6px_rgba(241,216,147,0.9)]" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );

  const label = (
    <span className="text-[10px] font-mincho tracking-widest text-washi/60">
      <Ruby>手札</Ruby> {hand.length}/{MAX_HAND}
    </span>
  );

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-1.5 w-full' : 'gap-2'}`} onKeyDown={onKey}>
      {!compact && detail}
      {!compact && label}
      {cards}
      {compact && label}
      {compact && detail}
    </div>
  );
}
