import type { Fish } from '../../game/types';
import { FISH_SELL_PRICE } from '../../game/constants';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'コモン', color: 'text-gray-300' },
  uncommon: { label: 'アンコモン', color: 'text-green-400' },
  rare: { label: 'レア', color: 'text-blue-400' },
  legendary: { label: 'レジェンダリー', color: 'text-purple-400' },
  mythical: { label: 'ミシカル', color: 'text-amber-400' },
};

const RARITY_GLOW: Record<string, string> = {
  common: 'glow-common',
  uncommon: 'glow-uncommon',
  rare: 'glow-rare',
  legendary: 'glow-legendary',
  mythical: 'glow-mythical',
};

interface FishCaughtModalProps {
  fish: Fish | null;
  size: number;
  escaped: boolean;
  tairyouCount: number;
  onClose: () => void;
}

export default function FishCaughtModal({ fish, size, escaped, tairyouCount, onClose }: FishCaughtModalProps) {
  if (!fish) return null;

  const rarity = RARITY_LABELS[fish.rarity];
  const points = Math.round(fish.points * size);
  const sellPrice = Math.round((FISH_SELL_PRICE[fish.rarity] ?? 200) * size);
  const sizeLabel = size >= 1.5 ? '巨大！' : size >= 1.2 ? '大きい' : size <= 0.7 ? '小さい' : '普通';
  const glowClass = escaped ? '' : (RARITY_GLOW[fish.rarity] || '');
  const weight = (fish.weight.min + (fish.weight.max - fish.weight.min) * size).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`animate-bounce-in bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 p-8 max-w-sm w-[90%] text-center shadow-2xl ${glowClass}`}>
        {escaped ? (
          <>
            <div className="text-6xl mb-4">💨</div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">逃げられた...</h3>
            <p className="text-white/60 mb-2">{fish.name}に逃げられてしまった</p>
            <p className="text-sm text-white/40 mb-6">{fish.description}</p>
          </>
        ) : (
          <>
            <div className="mb-4 animate-bounce-in flex justify-center" style={{ animationDelay: '0.15s' }}>
              <FishIllustration fishId={fish.id} width={120} height={80} />
            </div>
            <h3 className="text-2xl font-bold mb-1">{fish.name}</h3>
            <p className={`text-sm font-bold mb-3 ${rarity.color}`}>{rarity.label}</p>
            <p className="text-sm text-white/60 mb-2">{fish.description}</p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{fish.habitat}</span>
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{fish.season}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-xs">重量</div>
                <div className="font-bold">{weight}kg</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-xs">サイズ</div>
                <div className="font-bold">{(size * 100).toFixed(0)}%<span className="text-xs ml-0.5">({sizeLabel})</span></div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-xs">ポイント</div>
                <div className="font-bold text-amber-400">{points.toLocaleString()}pt</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-xs">売却</div>
                <div className="font-bold text-emerald-400">¥{sellPrice.toLocaleString()}</div>
              </div>
            </div>

            {size >= 1.5 && (
              <div className="text-amber-400 text-sm mb-2 animate-pulse">
                🌟 巨大魚ボーナス +200pt！
              </div>
            )}
            {tairyouCount > 0 && (
              <div className="text-cyan-300 text-sm mb-4 animate-bounce font-bold">
                🐟 大漁！ +{tairyouCount}匹ボーナス！
              </div>
            )}
          </>
        )}

        <Button onClick={onClose} variant="primary" size="md" className="w-full">
          OK
        </Button>
      </div>
    </div>
  );
}
