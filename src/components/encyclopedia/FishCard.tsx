import type { Fish } from '../../game/types';
import FishIllustration from '../shared/FishIllustration';

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-500/30 bg-gray-800/30',
  uncommon: 'border-green-500/30 bg-green-900/20',
  rare: 'border-blue-500/30 bg-blue-900/20',
  legendary: 'border-purple-500/30 bg-purple-900/20',
  mythical: 'border-amber-500/30 bg-amber-900/20',
};

interface FishCardProps {
  fish: Fish;
  caught: boolean;
  onClick: () => void;
}

export default function FishCard({ fish, caught, onClick }: FishCardProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 border text-center transition-all cursor-pointer hover:scale-105 ${
        caught
          ? RARITY_COLORS[fish.rarity]
          : 'border-white/5 bg-white/5'
      }`}
    >
      <div className="mb-1 flex justify-center">
        {caught ? (
          <FishIllustration fishId={fish.id} width={48} height={32} />
        ) : (
          <FishIllustration fishId={fish.id} width={48} height={32} silhouette />
        )}
      </div>
      <div className="text-xs truncate">
        {caught ? fish.name : '???'}
      </div>
    </button>
  );
}
