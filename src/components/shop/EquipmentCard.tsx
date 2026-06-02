import type { Equipment, EquipmentType } from '../../game/types';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import Ruby from '../shared/Ruby';

const TYPE_ICONS: Record<EquipmentType, IconName> = {
  rod: 'rod',
  reel: 'reel',
  lure: 'lure',
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
    <div className={`panel-ai rounded-xl p-3 transition-all ${
      ownedCount > 0
        ? 'border-emerald-500/40'
        : canBuy
          ? 'border-kin-500/40'
          : 'opacity-50'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Icon name={TYPE_ICONS[equipment.type]} size={18} className="text-kin-300 shrink-0" />
            <span className="font-mincho font-bold text-sm text-washi"><Ruby>{equipment.name}</Ruby></span>
            {ownedCount > 0 && (
              <span className="seal text-[10px] rounded-full px-1.5 py-0.5 tabular-nums">
                <Ruby>所持</Ruby> x{ownedCount}
              </span>
            )}
          </div>
          <div className="text-xs text-washi/40 mt-0.5 tabular-nums">
            {TYPE_LABELS[equipment.type]} Lv.{equipment.level}
          </div>
        </div>
        <div className="text-right text-sm">
          {equipment.cost === 0 ? (
            <span className="text-emerald-300"><Ruby>初期装備</Ruby></span>
          ) : (
            <span className="inline-flex items-center gap-1 text-kin-300 tabular-nums">
              <Icon name="coin" size={14} className="text-kin-400" />
              ¥{equipment.cost.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-washi/50 mb-1"><Ruby>{equipment.description}</Ruby></p>
      <p className="text-xs text-ai-200/80"><Ruby>{equipment.effect}</Ruby></p>

      {canBuy && (
        <Button
          onClick={onBuy}
          variant="gold"
          size="sm"
          disabled={!canAfford}
          className="w-full mt-2"
        >
          <Ruby>{canAfford ? '購入する' : 'お金が足りない'}</Ruby>
        </Button>
      )}
    </div>
  );
}
