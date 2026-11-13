import type { Fish } from '../../game/types';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';
import HoloFoil from '../fx/HoloFoil';

const RARITY_COLORS: Record<string, string> = {
  common: 'border-washi/15 bg-ai-800/40',
  uncommon: 'border-emerald-500/30 bg-emerald-900/20',
  rare: 'border-ai-400/40 bg-ai-700/30',
  legendary: 'border-kin-500/40 bg-kin-500/10',
  mythical: 'border-shu-500/40 bg-shu-500/15',
};

// まだの魚の影絵の大きさ（魚の大きさの区分ごと）
const SHADOW_SCALE: Record<string, number> = { small: 0.66, medium: 0.82, large: 0.94, huge: 1 };

interface FishCardProps {
  fish: Fish;
  caught: boolean;
  isNew?: boolean;
  onClick: () => void;
}

/** 図鑑の1枚。釣った魚は色つきの絵と名前（2行まで）、まだの魚は障子に映る本物の形の影絵。 */
export default function FishCard({ fish, caught, isNew, onClick }: FishCardProps) {
  // 影絵は魚の大きさの区分で大きさを変える（小魚は小さく、大物は札いっぱい）
  const k = caught ? 1 : SHADOW_SCALE[fish.appearance?.size ?? 'medium'] ?? 0.82;
  const foilTier = caught && (fish.rarity === 'mythical' || fish.rarity === 'legendary') ? fish.rarity : null;
  const content = <>
    <div className="fd-fishcard-stage">
      <FishIllustration fishId={fish.id} width={Math.round(72 * k)} height={Math.round(48 * k)} silhouette={!caught} className="fd-fishcard-art" />
    </div>
    <div className={`fd-fishcard-name font-mincho ${caught ? 'text-washi' : 'text-washi/40'}`}>
      {caught ? <Ruby>{fish.name}</Ruby> : '???'}
    </div>
  </>;
  return (
    <button
      onClick={onClick}
      data-fish-card={caught ? 'caught' : 'shadow'}
      className={`fd-fishcard relative rounded-lg border text-center cursor-pointer ${
        caught ? RARITY_COLORS[fish.rarity] : 'is-shadow'
      }`}
    >
      {caught && isNew && (
        <span className="seal absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 leading-none font-bold z-10">
          NEW
        </span>
      )}
      {foilTier
        ? <HoloFoil tier={foilTier} className="hf-card px-1.5 pt-2 pb-1.5">{content}</HoloFoil>
        : <div className="px-1.5 pt-2 pb-1.5">{content}</div>}
    </button>
  );
}
