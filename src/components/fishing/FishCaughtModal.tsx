import type { Fish } from '../../game/types';
import { FISH_SELL_PRICE } from '../../game/constants';
import Button from '../shared/Button';
import FishIllustration from '../shared/FishIllustration';
import Ruby from '../shared/Ruby';

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
  isNew?: boolean;
  onClose: () => void;
}

export default function FishCaughtModal({ fish, size, escaped, tairyouCount, isNew, onClose }: FishCaughtModalProps) {
  if (!fish) return null;

  const rarity = RARITY_LABELS[fish.rarity];
  const points = Math.round(fish.points * size);
  const sellPrice = Math.round((FISH_SELL_PRICE[fish.rarity] ?? 200) * size);
  const sizeLabel = size >= 1.5 ? '巨大！' : size >= 1.2 ? '大きい' : size <= 0.7 ? '小さい' : '普通';
  const glowClass = escaped ? '' : (RARITY_GLOW[fish.rarity] || '');
  const weight = (fish.weight.min + (fish.weight.max - fish.weight.min) * size).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ai-950/70 backdrop-blur-sm">
      <div className={`panel-ai animate-bounce-in rounded-2xl p-8 max-w-sm w-[90%] text-center ${glowClass}`}>
        {escaped ? (
          <>
            <div className="text-6xl mb-4">💨</div>
            <h3 className="font-mincho text-2xl font-bold text-shu-400 mb-2"><Ruby>逃げられた…</Ruby></h3>
            <p className="text-washi/65 mb-2"><Ruby>{fish.name}</Ruby><Ruby>に逃げられてしまった</Ruby></p>
            <p className="text-sm text-washi/45 mb-6"><Ruby>{fish.description}</Ruby></p>
          </>
        ) : (
          <>
            {/* 和紙のメダルに魚を載せる（浮世絵の一枚絵） */}
            <div className="relative mb-4 flex justify-center">
              <div className="washi-card rounded-2xl px-3 py-2 animate-bounce-in" style={{ animationDelay: '0.15s' }}>
                <FishIllustration fishId={fish.id} width={140} height={94} />
              </div>
              {isNew && (
                <span className="seal animate-seal-stamp absolute -top-2 -right-1 w-11 h-11 rounded-md font-mincho text-[11px] font-bold" style={{ animationDelay: '0.4s' }}>
                  初物
                </span>
              )}
            </div>
            <h3 className="font-mincho text-2xl font-bold mb-1 text-washi"><Ruby>{fish.name}</Ruby></h3>
            <p className={`text-sm font-bold mb-3 ${rarity.color}`}>{rarity.label}</p>
            <p className="text-sm text-washi/65 mb-3"><Ruby>{fish.description}</Ruby></p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              <span className="text-xs bg-ai-500/30 text-ai-200 px-2 py-0.5 rounded-full border border-ai-300/20"><Ruby>{fish.habitat}</Ruby></span>
              <span className="text-xs bg-kin-500/20 text-kin-300 px-2 py-0.5 rounded-full border border-kin-500/25"><Ruby>{fish.season}</Ruby></span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
              <div className="bg-ai-950/45 rounded-lg p-2 border border-kin-500/12">
                <div className="text-washi/45 text-xs"><Ruby>重量</Ruby></div>
                <div className="font-bold text-washi">{weight}kg</div>
              </div>
              <div className="bg-ai-950/45 rounded-lg p-2 border border-kin-500/12">
                <div className="text-washi/45 text-xs">サイズ</div>
                <div className="font-bold text-washi">{(size * 100).toFixed(0)}%<span className="text-xs ml-0.5">(<Ruby>{sizeLabel}</Ruby>)</span></div>
              </div>
              <div className="bg-ai-950/45 rounded-lg p-2 border border-kin-500/12">
                <div className="text-washi/45 text-xs">ポイント</div>
                <div className="font-bold text-kin-300">{points.toLocaleString()}pt</div>
              </div>
              <div className="bg-ai-950/45 rounded-lg p-2 border border-kin-500/12">
                <div className="text-washi/45 text-xs"><Ruby>売却</Ruby></div>
                <div className="font-bold text-emerald-300">¥{sellPrice.toLocaleString()}</div>
              </div>
            </div>

            {size >= 1.5 && (
              <div className="text-kin-300 text-sm mb-2 animate-pulse">
                🌟 <Ruby>巨大魚</Ruby>ボーナス +200pt！
              </div>
            )}
            {tairyouCount > 0 && (
              <div className="text-shu-400 text-sm mb-4 animate-bounce font-bold">
                🐟 <Ruby>大漁</Ruby>！ +{tairyouCount}<Ruby>匹</Ruby>ボーナス！
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
