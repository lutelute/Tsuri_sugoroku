import type { Fish } from '../../game/types';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'コモン', color: 'text-gray-300' },
  uncommon: { label: 'アンコモン', color: 'text-green-400' },
  rare: { label: 'レア', color: 'text-blue-400' },
  legendary: { label: 'レジェンダリー', color: 'text-purple-400' },
  mythical: { label: 'ミシカル', color: 'text-amber-400' },
};

interface FishDetailProps {
  fish: Fish;
  caught: boolean;
  onClose: () => void;
}

export default function FishDetail({ fish, caught, onClose }: FishDetailProps) {
  const rarity = RARITY_LABELS[fish.rarity];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 max-w-xs w-[85%]" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <FishIllustration fishId={fish.id} width={80} height={56} silhouette={!caught} />
          </div>
          <h3 className="text-xl font-bold">{caught ? fish.name : '???'}</h3>
          <p className={`text-sm font-bold ${rarity.color}`}>{rarity.label}</p>
        </div>

        {caught ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-white/60">{fish.description}</p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{fish.habitat}</span>
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{fish.season}</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                {'★'.repeat(fish.difficulty)}{'☆'.repeat(5 - fish.difficulty)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-white/40 text-xs">ポイント</div>
                <div className="font-bold text-amber-400">{fish.points}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-white/40 text-xs">重量</div>
                <div className="font-bold">{fish.weight.min}~{fish.weight.max}kg</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-white/40 text-xs">必要装備</div>
                <div className="font-bold">Lv.{fish.minEquipmentLevel}</div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2">
              地域: {fish.regions.join(', ')}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/40 text-center">まだ釣っていません</p>
        )}

        <Button onClick={onClose} variant="secondary" size="sm" className="w-full mt-4">
          閉じる
        </Button>
      </div>
    </div>
  );
}
