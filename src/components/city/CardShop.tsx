// まちづくり: カード売り場（大都市・商都）。売り物の札を並べ、買うと onBuy を呼ぶ。
// 手札がいっぱい（4枚）のときは買えない（大事な札をうっかり捨てないため）。支払いと手札への追加はストアが行う。
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CARD_CATEGORY_INFO, CARD_INFO, CARD_TIMING_LABEL, MAX_HAND, SHOP_CARDS } from '../../game/cityCards';
import type { CityCardId } from '../../game/cityCards';
import { CardFace } from './CardHand';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import Stamp from '../fx/Stamp';
import { playCoinLoss } from '../../utils/sound';

interface CardShopProps {
  money: number;
  handSize: number;
  onBuy: (id: CityCardId) => void;
  onClose: () => void;
}

export default function CardShop({ money, handSize, onBuy, onClose }: CardShopProps) {
  const full = handSize >= MAX_HAND;
  // 買えたとき（手札が増えたとき）だけ「毎度」の判子
  const [prevHand, setPrevHand] = useState(handSize);
  const [thanks, setThanks] = useState(0);
  if (handSize !== prevHand) {
    if (handSize > prevHand) setThanks(t => t + 1);
    setPrevHand(handSize);
  }
  const buy = (id: CityCardId) => {
    playCoinLoss();
    onBuy(id);
  };

  // 町パネル（backdrop-filter で fixed の基準が変わる）の中から開くので、body へ描いて画面全体に出す
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="washi-card animate-bounce-in relative rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-shop-title"
      >
        {/* 暖簾風の見出し */}
        {thanks > 0 && (
          <span key={thanks} className="absolute right-3 top-14 z-10 pointer-events-none">
            <Stamp tone="shu" size={52} vertical tilt={12}>毎度</Stamp>
          </span>
        )}
        <div className="relative px-4 sm:px-5 pt-3 pb-2.5 border-b border-[#9a6f24]/30 bg-gradient-to-b from-ai-700 to-ai-800 text-washi">
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <div>
              <p className="text-[10px] tracking-[0.4em] text-kin-300/85 font-mincho"><Ruby>一発逆転のカード</Ruby></p>
              <h2 id="card-shop-title" className="font-brush text-3xl leading-tight kinpaku"><Ruby>カード売り場</Ruby></h2>
            </div>
            <div className="text-right text-xs font-mincho leading-relaxed">
              <div><Ruby>所持金</Ruby> <span className="font-bold tabular-nums text-kin-300 text-sm">¥{money.toLocaleString()}</span></div>
              <div className={full ? 'text-shu-400 font-bold' : 'text-washi/75'}><Ruby>手札</Ruby> <span className="tabular-nums">{handSize}/{MAX_HAND}</span></div>
            </div>
          </div>
        </div>

        {full && (
          <p className="mx-4 mt-3 rounded-lg bg-[#a92e1d]/10 border border-[#a92e1d]/30 px-3 py-1.5 text-xs font-bold text-[#a92e1d] text-center">
            <Ruby>{`手札がいっぱい（${MAX_HAND}枚まで）。カードを使ってからまた来よう`}</Ruby>
          </p>
        )}

        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 space-y-2">
          {SHOP_CARDS.map((id, i) => {
            const info = CARD_INFO[id];
            const price = info.price ?? 0;
            const short = money < price;
            const reason = full ? '手札がいっぱい' : short ? 'お金が足りない' : null;
            return (
              <li
                key={id}
                className="fx-rise flex items-center gap-3 rounded-xl bg-[#2a2118]/5 border border-[#9a6f24]/25 px-2.5 py-2"
                style={{ '--d': `${i * 50}ms` } as CSSProperties}
              >
                <CardFace id={id} width={42} dim={!!reason} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mincho font-bold text-base" style={{ color: CARD_CATEGORY_INFO[info.category].color }}><Ruby>{info.name}</Ruby></span>
                    <span className="text-[10px] text-[#7a5a2a] font-mincho truncate"><Ruby>{CARD_TIMING_LABEL[info.timing]}</Ruby></span>
                  </div>
                  <p className="text-xs leading-snug text-[#4a3a28]"><Ruby>{info.desc}</Ruby></p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${short ? 'text-[#a92e1d]' : 'text-[#2a2118]'}`}>¥{price.toLocaleString()}</span>
                  <Button onClick={() => buy(id)} variant="gold" size="sm" disabled={!!reason} className="min-w-[4.5rem] min-h-10">
                    <Ruby>買う</Ruby>
                  </Button>
                  {reason && <span className="text-[9px] text-[#a92e1d]"><Ruby>{reason}</Ruby></span>}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 px-4 pb-3 pt-2 border-t border-[#9a6f24]/20">
          <p className="text-[10px] text-[#7a5a2a] text-center mb-1.5"><Ruby>特急と誘致は売っていない。村のマスで引けるかも</Ruby></p>
          <Button onClick={onClose} variant="primary" size="md" className="w-full"><Ruby>店を出る</Ruby></Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
