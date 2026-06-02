import type { Fish } from '../../game/types';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';

const RARITY_COLORS: Record<string, string> = {
  common: 'border-washi/15 bg-ai-800/40',
  uncommon: 'border-emerald-500/30 bg-emerald-900/20',
  rare: 'border-ai-400/40 bg-ai-700/30',
  legendary: 'border-kin-500/40 bg-kin-500/10',
  mythical: 'border-shu-500/40 bg-shu-500/15',
};

interface FishCardProps {
  fish: Fish;
  caught: boolean;
  isNew?: boolean;
  onClick: () => void;
}

export default function FishCard({ fish, caught, isNew, onClick }: FishCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg p-2 border text-center transition-all cursor-pointer hover:scale-105 ${
        caught
          ? RARITY_COLORS[fish.rarity]
          : 'border-washi/5 bg-ai-900/40'
      }`}
    >
      {caught && isNew && (
        <span className="seal absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 leading-none font-bold z-10">
          NEW
        </span>
      )}
      <div className="mb-1 flex justify-center">
        {caught ? (
          <FishIllustration fishId={fish.id} width={48} height={32} />
        ) : (
          <FishIllustration fishId={fish.id} width={48} height={32} silhouette />
        )}
      </div>
      <div className={`text-xs truncate font-mincho ${caught ? 'text-washi' : 'text-washi/40'}`}>
        {caught ? <Ruby>{fish.name}</Ruby> : '???'}
      </div>
    </button>
  );
}
