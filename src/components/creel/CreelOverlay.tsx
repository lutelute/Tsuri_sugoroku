import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { NODE_MAP } from '../../data/boardNodes';
import type { FishRarity, CaughtFish } from '../../game/types';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';

type SortMode = 'turn' | 'points' | 'size';
type FilterRarity = 'all' | FishRarity;

const RARITY_FILTERS: { key: FilterRarity; label: string }[] = [
  { key: 'all', label: '全て' },
  { key: 'common', label: 'コモン' },
  { key: 'uncommon', label: 'アンコモン' },
  { key: 'rare', label: 'レア' },
  { key: 'legendary', label: 'レジェンダリー' },
  { key: 'mythical', label: 'ミシカル' },
];

const RARITY_COLORS: Record<FishRarity, string> = {
  common: 'text-gray-300 bg-gray-700/50',
  uncommon: 'text-green-400 bg-green-900/50',
  rare: 'text-blue-400 bg-blue-900/50',
  legendary: 'text-purple-400 bg-purple-900/50',
  mythical: 'text-amber-400 bg-amber-900/50',
};

const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));

function calculatePoints(caught: CaughtFish): number {
  const fish = FISH_MAP.get(caught.fishId);
  if (!fish) return 0;
  return Math.round(fish.points * caught.size * (caught.bonusMultiplier ?? 1));
}

interface CreelOverlayProps {
  onClose: () => void;
}

export default function CreelOverlay({ onClose }: CreelOverlayProps) {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const player = players[currentPlayerIndex];

  const [filter, setFilter] = useState<FilterRarity>('all');
  const [sortMode, setSortMode] = useState<SortMode>('turn');

  const caughtFish = player?.caughtFish ?? [];

  const totalPoints = useMemo(
    () => caughtFish.reduce((sum, c) => sum + calculatePoints(c), 0),
    [caughtFish],
  );

  const filtered = useMemo(() => {
    let list = [...caughtFish];

    if (filter !== 'all') {
      list = list.filter(c => {
        const fish = FISH_MAP.get(c.fishId);
        return fish?.rarity === filter;
      });
    }

    switch (sortMode) {
      case 'points':
        list.sort((a, b) => calculatePoints(b) - calculatePoints(a));
        break;
      case 'size':
        list.sort((a, b) => b.size - a.size);
        break;
      case 'turn':
      default:
        list.sort((a, b) => a.turn - b.turn);
        break;
    }

    return list;
  }, [caughtFish, filter, sortMode]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10">
        <div>
          <h2 className="text-lg font-bold">🎒 釣果バッグ</h2>
          <span className="text-sm text-white/60">
            {caughtFish.length}匹 / {totalPoints}pt
          </span>
        </div>
        <Button onClick={onClose} variant="secondary" size="sm">閉じる</Button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
        {RARITY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              filter === key
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="px-4 pt-2 pb-1 flex gap-2 text-xs text-white/50">
        <span>並び替え:</span>
        {([['turn', '釣った順'], ['points', 'ポイント順'], ['size', 'サイズ順']] as const).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`transition cursor-pointer ${
              sortMode === mode ? 'text-white font-bold' : 'hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Fish list */}
      <div className="p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <div className="text-5xl mb-4">🎣</div>
            <p>まだ魚を釣っていません</p>
          </div>
        ) : (
          filtered.map((caught, idx) => {
            const fish = FISH_MAP.get(caught.fishId);
            if (!fish) return null;
            const locationNode = NODE_MAP.get(caught.caughtAt);
            const pts = calculatePoints(caught);
            const sizePercent = Math.round(caught.size * 100);

            return (
              <div
                key={`${caught.fishId}-${caught.turn}-${idx}`}
                className="bg-white/5 rounded-lg p-3 flex items-start gap-3"
              >
                <div className="shrink-0">
                  <FishIllustration fishId={caught.fishId} width={48} height={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{fish.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RARITY_COLORS[fish.rarity]}`}>
                      {RARITY_NAMES[fish.rarity]}
                    </span>
                    {(caught.bonusMultiplier ?? 1) > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-600/50 text-amber-200 font-medium">
                        x{caught.bonusMultiplier}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>サイズ {sizePercent}%</span>
                    <span className="text-amber-300 font-medium">{pts}pt</span>
                    <span>📍{locationNode?.name ?? caught.caughtAt}</span>
                    <span>Turn {caught.turn}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
