// まちづくり: 手札を出してカードを使う帯。牛歩のときは相手を選ばせる（下からのシート）。
// サイコロを振る前（GameScreen）と、町パネルの中（CityOverlay）で使う。札を切ると画面の中ほどで「発動」の演出。
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import type { CityCardId } from '../../game/cityCards';
import CardHand, { CardFace } from './CardHand';
import CardPlayBurst from './CardPlayBurst';
import BottomSheet from '../fx/BottomSheet';
import Ruby from '../shared/Ruby';

export default function CardPlayBar({ timing, compact = false }: { timing: 'before_roll' | 'in_town'; compact?: boolean }) {
  const { cards, players, currentPlayerIndex, playCityCard } = useGameStore(
    useShallow(s => ({ cards: s.cityCards, players: s.players, currentPlayerIndex: s.currentPlayerIndex, playCityCard: s.playCityCard })),
  );
  const [picking, setPicking] = useState<number | null>(null); // 牛歩の札の index
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: CityCardId; seq: number } | null>(null);
  const hand = cards?.hands[currentPlayerIndex] ?? [];
  const burstEl = burst && <CardPlayBurst key={burst.seq} id={burst.id} onDone={() => setBurst(null)} />;
  if (!cards || hand.length === 0) return burstEl || null;

  const played = (id: CityCardId) => setBurst(b => ({ id, seq: (b?.seq ?? 0) + 1 }));

  const onUse = (index: number) => {
    setError(null);
    const id = hand[index];
    if (id === 'gyuho') {
      setPicking(index);
      return;
    }
    const err = playCityCard(index);
    if (err) setError(err);
    else played(id);
  };

  const pickTarget = (target: number) => {
    if (picking === null) return;
    const id = hand[picking];
    const err = playCityCard(picking, target);
    setPicking(null);
    if (err) setError(err);
    else played(id);
  };

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <CardHand hand={hand} timing={timing} onUse={onUse} compact={compact} />
      {picking !== null && (
        <BottomSheet label="牛歩をかける相手を選ぶ" onClose={() => setPicking(null)}>
          <div className="flex items-center gap-3 mb-3">
            <CardFace id="gyuho" width={44} />
            <div className="text-left">
              <p className="font-brush text-2xl leading-none text-[#2a2118]"><Ruby>牛歩</Ruby></p>
              <p className="text-xs text-[#4a3a28] mt-1"><Ruby>だれの足を遅くする？（出目が2までになる）</Ruby></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p, i) => (i === currentPlayerIndex ? null : (
              <button
                key={p.id}
                type="button"
                onClick={() => pickTarget(i)}
                className="min-h-11 flex items-center gap-2 rounded-xl border-2 bg-[#fffaf0] px-3 text-left font-mincho font-bold text-[#2a2118] cursor-pointer hover:bg-white active:scale-95 transition"
                style={{ borderColor: p.color }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            )))}
          </div>
          <button
            type="button"
            onClick={() => setPicking(null)}
            className="mt-2 w-full min-h-11 rounded-xl border border-[#9a6f24]/40 bg-[#2a2118]/5 text-sm text-[#2a2118] font-mincho cursor-pointer hover:bg-[#2a2118]/10"
          >
            <Ruby>やめる</Ruby>
          </button>
        </BottomSheet>
      )}
      {error && (
        <p className="fx-pop text-xs text-shu-200 bg-ai-950/85 border border-shu-500/45 rounded-full px-3 py-1" role="alert">
          <Ruby>{error}</Ruby>
        </p>
      )}
      {burstEl}
    </div>
  );
}
