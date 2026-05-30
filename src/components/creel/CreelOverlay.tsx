import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { NODE_MAP } from '../../data/boardNodes';
import type { FishRarity, CaughtFish } from '../../game/types';
import FishIllustration from '../shared/FishIllustration';
import Icon from '../shared/Icon';

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
  common: 'text-washi/70 bg-ai-700/50 border border-ai-600/40',
  uncommon: 'text-emerald-300 bg-emerald-900/40 border border-emerald-500/30',
  rare: 'text-ai-200 bg-ai-800/60 border border-ai-400/40',
  legendary: 'text-kin-300 bg-kin-500/20 border border-kin-500/30',
  mythical: 'text-shu-400 bg-shu-500/20 border border-shu-500/30',
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
    <div className="fixed inset-0 z-50 bg-ai-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 panel-ai backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10 rounded-none border-x-0 border-t-0">
        <div>
          <h2 className="text-lg font-mincho text-kin-300 ink-underline flex items-center gap-2">
            <Icon name="creel" size={22} className="text-kin-300" />
            釣果バッグ
          </h2>
          <span className="text-sm text-washi/60 tabular-nums">
            {caughtFish.length}匹 / {totalPoints}pt
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-ai-800/60 border border-kin-500/30 text-washi hover:bg-ai-700/60 transition-colors"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
        {RARITY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-mincho transition cursor-pointer border ${
              filter === key
                ? 'bg-kin-500/20 text-kin-300 border-kin-500/30'
                : 'bg-ai-800/40 text-washi/50 border-ai-600/30 hover:bg-ai-700/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="px-4 pt-2 pb-1 flex gap-2 text-xs text-washi/50 font-mincho">
        <span>並び替え:</span>
        {([['turn', '釣った順'], ['points', 'ポイント順'], ['size', 'サイズ順']] as const).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`transition cursor-pointer ${
              sortMode === mode ? 'text-kin-300 font-bold' : 'hover:text-washi/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Fish list */}
      <div className="p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-washi/40 font-mincho">
            <Icon name="rod" size={56} className="text-washi/30 mx-auto mb-4" />
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
                className="panel-ai p-3 flex items-start gap-3"
              >
                <div className="shrink-0 washi-card rounded-md p-1 flex items-center justify-center">
                  <FishIllustration fishId={caught.fishId} width={48} height={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mincho font-bold text-sm text-washi">{fish.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mincho ${RARITY_COLORS[fish.rarity]}`}>
                      {RARITY_NAMES[fish.rarity]}
                    </span>
                    {(caught.bonusMultiplier ?? 1) > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-shu-500/20 text-shu-400 border border-shu-500/30 font-mincho tabular-nums">
                        x{caught.bonusMultiplier}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-washi/50 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="tabular-nums">サイズ {sizePercent}%</span>
                    <span className="text-kin-300 font-medium tabular-nums">{pts}pt</span>
                    <span>📍{locationNode?.name ?? caught.caughtAt}</span>
                    <span className="tabular-nums">Turn {caught.turn}</span>
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
