import type { Fish } from '../../game/types';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';
import Icon from '../shared/Icon';

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'コモン', color: 'text-washi/70' },
  uncommon: { label: 'アンコモン', color: 'text-emerald-300' },
  rare: { label: 'レア', color: 'text-ai-300' },
  legendary: { label: 'レジェンダリー', color: 'text-kin-300' },
  mythical: { label: 'ミシカル', color: 'text-shu-400' },
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
      <div className="panel-ai relative rounded-2xl p-6 max-w-xs w-[85%]" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/70 hover:text-washi transition"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="washi-card rounded-2xl px-5 py-3">
              <FishIllustration fishId={fish.id} width={80} height={56} silhouette={!caught} />
            </div>
          </div>
          <h3 className="text-xl font-mincho font-bold text-kin-300">{caught ? fish.name : '???'}</h3>
          <p className={`text-sm font-bold ${rarity.color}`}>{rarity.label}</p>
        </div>

        {caught ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-washi/70">{fish.description}</p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              <span className="text-xs bg-ai-500/20 text-ai-200 border border-ai-500/30 px-2 py-0.5 rounded-full">{fish.habitat}</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">{fish.season}</span>
              <span className="text-xs bg-kin-500/20 text-kin-300 border border-kin-500/30 px-2 py-0.5 rounded-full">
                {'★'.repeat(fish.difficulty)}{'☆'.repeat(5 - fish.difficulty)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs">ポイント</div>
                <div className="font-bold text-shu-500 tabular-nums">{fish.points}</div>
              </div>
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs">重量</div>
                <div className="font-bold text-ai-900 tabular-nums">{fish.weight.min}~{fish.weight.max}kg</div>
              </div>
              <div className="washi-card rounded-lg p-2 text-center">
                <div className="text-ai-900/60 text-xs">必要装備</div>
                <div className="font-bold text-ai-900 tabular-nums">Lv.{fish.minEquipmentLevel}</div>
              </div>
            </div>
            <div className="text-xs text-washi/50 mt-2">
              地域: {fish.regions.join(', ')}
            </div>

            {fish.wikiUrl && (
              <a
                href={fish.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 mt-3 text-center text-sm text-ai-300 hover:text-ai-200 underline transition"
              >
                <Icon name="book" size={16} />
                詳しく見る（Wikipedia）
              </a>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-washi/50 text-center">まだ釣っていません</p>
        )}

        <Button onClick={onClose} variant="secondary" size="sm" className="w-full mt-4">
          閉じる
        </Button>
      </div>
    </div>
  );
}
