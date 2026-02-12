import type { Equipment, EquipmentType } from '../../game/types';
import Button from '../shared/Button';

const TYPE_ICONS: Record<EquipmentType, string> = {
  rod: '🎣',
  reel: '🔄',
  lure: '🪱',
};

const TYPE_LABELS: Record<EquipmentType, string> = {
  rod: 'ロッド',
  reel: 'リール',
  lure: 'ルアー',
};

interface EquipmentCardProps {
  equipment: Equipment;
  ownedCount: number;
  canAfford: boolean;
  canBuy: boolean;
  onBuy: () => void;
}

export default function EquipmentCard({ equipment, ownedCount, canAfford, canBuy, onBuy }: EquipmentCardProps) {
  return (
    <div className={`rounded-xl p-3 border transition-all ${
      ownedCount > 0
        ? 'bg-green-900/20 border-green-500/30'
        : canBuy
          ? 'bg-amber-900/20 border-amber-500/30'
          : 'bg-white/5 border-white/10 opacity-50'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span>{TYPE_ICONS[equipment.type]}</span>
            <span className="font-bold text-sm">{equipment.name}</span>
            {ownedCount > 0 && (
              <span className="text-xs text-green-400">
                所持 x{ownedCount}
              </span>
            )}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            {TYPE_LABELS[equipment.type]} Lv.{equipment.level}
          </div>
        </div>
        <div className="text-right text-sm">
          {equipment.cost === 0 ? (
            <span className="text-green-400">初期装備</span>
          ) : (
            <span className="text-amber-400">¥{equipment.cost.toLocaleString()}</span>
          )}
        </div>
      </div>

      <p className="text-xs text-white/50 mb-1">{equipment.description}</p>
      <p className="text-xs text-cyan-300/70">{equipment.effect}</p>

      {canBuy && (
        <Button
          onClick={onBuy}
          variant="gold"
          size="sm"
          disabled={!canAfford}
          className="w-full mt-2"
        >
          {canAfford ? '購入する' : 'お金が足りない'}
        </Button>
      )}
    </div>
  );
}
