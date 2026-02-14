import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishRarity } from '../../game/types';
import FishCard from './FishCard';
import FishDetail from './FishDetail';
import Button from '../shared/Button';

const RARITY_ORDER: FishRarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

interface EncyclopediaOverlayProps {
  onClose: () => void;
}

export default function EncyclopediaOverlay({ onClose }: EncyclopediaOverlayProps) {
  const encyclopedias = useGameStore(s => s.encyclopedias);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const [viewingPlayerIndex, setViewingPlayerIndex] = useState(currentPlayerIndex);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);

  const encyclopedia = encyclopedias[viewingPlayerIndex] ?? {};
  const caughtCount = FISH_DATABASE.filter(f => encyclopedia[f.id]).length;
  const totalCount = FISH_DATABASE.length;
  const percent = Math.round((caughtCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📖 図鑑</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">
              {caughtCount}/{totalCount} ({percent}%)
            </span>
            <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
          </div>
        </div>

        {/* プレイヤー切替タブ */}
        {players.length > 1 && (
          <div className="flex gap-1.5 mt-2">
            {players.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewingPlayerIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer
                  ${viewingPlayerIndex === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 魚一覧 */}
      <div className="p-4 space-y-6">
        {RARITY_ORDER.map(rarity => {
          const fishOfRarity = FISH_DATABASE.filter(f => f.rarity === rarity);
          return (
            <div key={rarity}>
              <h3 className="text-sm font-bold text-white/50 mb-2">
                {RARITY_NAMES[rarity]} ({fishOfRarity.filter(f => encyclopedia[f.id]).length}/{fishOfRarity.length})
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {fishOfRarity.map(fish => (
                  <FishCard
                    key={fish.id}
                    fish={fish}
                    caught={!!encyclopedia[fish.id]}
                    onClick={() => setSelectedFish(fish)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 詳細モーダル */}
      {selectedFish && (
        <FishDetail
          fish={selectedFish}
          caught={!!encyclopedia[selectedFish.id]}
          onClose={() => setSelectedFish(null)}
        />
      )}
    </div>
  );
}
