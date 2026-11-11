// 魚市場の帯: 釣り場の町で、町の状態のすぐ下に出す。「釣りをする / 1匹 約¥520 / 漁場：豊か / あと3回」。
// 押すと釣り方を選ぶ画面へ（onFish）。釣り場でない町・まちづくり以外では何も出さない。
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { getEquippedItem } from '../../game/equipment';
import { computeAllStats } from '../../game/city';
import { expectedTownFishPrice, fishPriceParts, isFishingSpot, priceBreakdownText } from '../../game/fishMarket';
import type { Fishery, FisheryLevel } from '../../game/fishMarket';
import RigGlyph from '../fishing/RigGlyph';
import Ruby from '../shared/Ruby';
import DerbyLine from './DerbyLine';

const FISHERY_TONE: Record<FisheryLevel, string> = {
  rich: 'bg-emerald-700/35 border-emerald-400/50 text-emerald-100',
  normal: 'bg-ai-950/50 border-kin-500/30 text-washi/80',
  rough: 'bg-kin-500/25 border-kin-400/60 text-kin-100',
  ruined: 'bg-shu-600/35 border-shu-400/60 text-shu-100',
};

/** 漁場の札（豊か・ふつう・荒れ・ひどく荒れ） */
export function FisheryChip({ fishery, className = '' }: { fishery: Fishery; className?: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[11px] font-mincho font-bold leading-none whitespace-nowrap ${FISHERY_TONE[fishery.level]} ${className}`} title={fishery.note}>
      <Ruby>{fishery.label}</Ruby>
    </span>
  );
}

interface TownFishBandProps {
  /** いまいる町（釣り場でなければ何も出さない） */
  nodeId: string;
  /** 釣り方を選ぶ画面へ進む（町の画面なら setTurnPhase('fishing_choice')） */
  onFish: () => void;
  className?: string;
}

export default function TownFishBand({ nodeId, onFish, className = '' }: TownFishBandProps) {
  const { city, player, turn, nodeActionsThisTurn } = useGameStore(
    useShallow(s => ({
      city: s.city,
      player: s.players[s.currentPlayerIndex],
      turn: s.turn,
      nodeActionsThisTurn: s.nodeActionsThisTurn,
    })),
  );
  const stats = useMemo(() => (city ? computeAllStats(city).get(nodeId) : undefined), [city, nodeId]);
  if (!city || !player || !isFishingSpot(nodeId)) return null;

  const parts = fishPriceParts(city, nodeId, turn, stats);
  const price = expectedTownFishPrice(city, nodeId, turn, player.equipment, stats);
  const hasRod = !!getEquippedItem(player.equipment, 'rod');
  const left = Math.max(0, MAX_FISHING_PER_TURN - nodeActionsThisTurn);
  const canFish = hasRod && left > 0;
  const detail = [priceBreakdownText(parts), parts.fishery.note].filter(Boolean).join(' ／ ');

  return (
    <section className={`tk-fishband rounded-xl border border-ai-300/45 overflow-hidden ${className}`} aria-label="魚市場">
      <button
        type="button"
        onClick={() => canFish && onFish()}
        disabled={!canFish}
        data-guide="town-fish"
        className={`w-full min-h-14 flex items-center gap-3 px-3 py-2 text-left transition ${canFish ? 'cursor-pointer hover:bg-ai-400/15 active:bg-ai-400/25' : 'opacity-60 cursor-not-allowed'}`}
      >
        <span className="shrink-0 w-11 h-11 rounded-full bg-ai-500/60 border border-kin-500/40 flex items-center justify-center">
          <RigGlyph rig="futsu" size={30} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mincho font-bold text-washi leading-tight">
            <Ruby>{!hasRod ? '竿がない（釣具店で買おう）' : left > 0 ? '釣りをする' : 'この手番はもう釣った'}</Ruby>
          </span>
          <span className="mt-0.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-washi/85">
            {price > 0 && (
              <span><Ruby>1匹</Ruby> <Ruby>約</Ruby><span className="text-emerald-300 font-bold tabular-nums text-sm">¥{price.toLocaleString()}</span></span>
            )}
            <span className="inline-flex items-center gap-1"><Ruby>漁場</Ruby><FisheryChip fishery={parts.fishery} /></span>
          </span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1 text-xs text-kin-300" aria-label={`あと${left}回`}>
          {/* 数字と「回」は1つの文にまとめる（別々だと「回」にふりがなが付かない） */}
          <span className="whitespace-nowrap font-bold tabular-nums"><Ruby>{`あと${left}回`}</Ruby></span>
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: MAX_FISHING_PER_TURN }, (_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full border ${i < left ? 'bg-kin-400 border-kin-300' : 'bg-ai-950/70 border-kin-500/30'}`} />
            ))}
          </span>
        </span>
      </button>
      <div className="tk-fishband-foot px-3 space-y-1">
        {detail && <p className="text-[10px] text-washi/55 leading-snug"><Ruby>{detail}</Ruby></p>}
        <DerbyLine />
      </div>
    </section>
  );
}
