// まちづくり: 手札を出してカードを使う帯。牛歩のときは相手を選ばせる。
// サイコロを振る前（GameScreen）と、町パネルの中（CityOverlay）で使う。
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import CardHand from './CardHand';
import Ruby from '../shared/Ruby';

export default function CardPlayBar({ timing, compact = false }: { timing: 'before_roll' | 'in_town'; compact?: boolean }) {
  const { cards, players, currentPlayerIndex, playCityCard } = useGameStore(
    useShallow(s => ({ cards: s.cityCards, players: s.players, currentPlayerIndex: s.currentPlayerIndex, playCityCard: s.playCityCard })),
  );
  const [picking, setPicking] = useState<number | null>(null); // 牛歩の札の index
  const [error, setError] = useState<string | null>(null);
  const hand = cards?.hands[currentPlayerIndex] ?? [];
  if (!cards || hand.length === 0) return null;

  const onUse = (index: number) => {
    setError(null);
    if (hand[index] === 'gyuho') {
      setPicking(index);
      return;
    }
    const err = playCityCard(index);
    if (err) setError(err);
  };

  const pickTarget = (target: number) => {
    if (picking === null) return;
    const err = playCityCard(picking, target);
    setPicking(null);
    if (err) setError(err);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <CardHand hand={hand} timing={timing} onUse={onUse} compact={compact} />
      {picking !== null && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-ai-900/90 border border-kin-500/35 rounded-xl px-2.5 py-1.5 shadow-lg">
          <span className="text-xs text-washi/80 font-mincho"><Ruby>牛歩をかける相手</Ruby>：</span>
          {players.map((p, i) => (i === currentPlayerIndex ? null : (
            <button
              key={p.id}
              onClick={() => pickTarget(i)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer hover:brightness-125"
              style={{ borderColor: p.color, color: p.color }}
            >
              {p.name}
            </button>
          )))}
          <button onClick={() => setPicking(null)} className="text-xs text-washi/60 px-2 py-1 cursor-pointer"><Ruby>やめる</Ruby></button>
        </div>
      )}
      {error && <p className="text-[11px] text-shu-300 bg-ai-950/70 rounded px-2 py-0.5"><Ruby>{error}</Ruby></p>}
    </div>
  );
}
