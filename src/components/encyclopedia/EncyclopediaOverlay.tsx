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
  const encyclopedia = useGameStore(s => s.encyclopedia);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);

  const caughtCount = FISH_DATABASE.filter(f => encyclopedia[f.id]).length;
  const totalCount = FISH_DATABASE.length;
  const percent = Math.round((caughtCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold">📖 図鑑</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">
            {caughtCount}/{totalCount} ({percent}%)
          </span>
          <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
        </div>
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
