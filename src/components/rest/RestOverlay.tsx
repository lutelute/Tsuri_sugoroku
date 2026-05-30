import { useGameStore } from '../../store/useGameStore';
import { calculateRepairCost, isBroken } from '../../game/equipment';
import { getEquipment } from '../../data/equipmentData';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import type { IconName } from '../shared/Icon';

const TYPE_ICONS: Record<EquipmentType, IconName> = {
  rod: 'rod',
  reel: 'reel',
  lure: 'lure',
};

interface RestOverlayProps {
  nodeName: string;
  onClose: () => void;
}

export default function RestOverlay({ nodeName, onClose }: RestOverlayProps) {
  const { players, currentPlayerIndex, repairEquipment } = useGameStore();
  const player = players[currentPlayerIndex];

  const damagedItems = player.equipment.inventory.filter(item => item.durability < 100);

  const handleRepair = (item: EquipmentItem) => {
    const cost = calculateRepairCost(item);
    if (player.money >= cost) {
      repairEquipment(item.id, cost);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="panel-ai relative rounded-2xl p-6 max-w-sm w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/70 hover:text-washi transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">♨️</div>
          <h3 className="font-mincho text-kin-300 text-xl font-bold mb-1 ink-underline inline-block">{nodeName}で休憩</h3>
          <p className="text-washi/60 text-sm mt-2">ゆっくり湯に浸かって体力回復! ¥500を獲得した!</p>
          <p className="text-sm text-kin-300 mt-1 inline-flex items-center gap-1">
            <Icon name="coin" size={14} className="text-kin-400" />
            所持金: ¥<span className="tabular-nums">{player.money.toLocaleString()}</span>
          </p>
        </div>

        {/* 修理セクション */}
        {damagedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-kin-500/20">
            <h4 className="font-mincho text-kin-300 text-sm font-bold text-center mb-3 inline-flex items-center justify-center gap-1.5 w-full">
              <Icon name="repair" size={16} className="text-shu-400" />
              装備修理
            </h4>
            <div className="space-y-2">
              {damagedItems.map(item => {
                const eqData = getEquipment(item.type, item.level);
                const cost = calculateRepairCost(item);
                const canAfford = player.money >= cost;
                const broken = isBroken(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3 border ${
                      broken
                        ? 'bg-shu-500/15 border-shu-500/30'
                        : 'washi-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name={TYPE_ICONS[item.type]} size={20} className={broken ? 'text-shu-400' : 'text-ai-700'} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mincho text-sm font-bold">{eqData?.name || '???'}</span>
                            {broken && (
                              <span className="seal text-[10px] px-1.5 py-0.5">
                                故障
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-16 h-1.5 bg-ai-900/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.durability > 50 ? 'bg-emerald-400' :
                                  item.durability > 20 ? 'bg-kin-400' : 'bg-shu-400'
                                }`}
                                style={{ width: `${item.durability}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-ai-700/60 tabular-nums">{item.durability}%</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRepair(item)}
                        variant="gold"
                        size="sm"
                        disabled={!canAfford}
                      >
                        {canAfford ? <span className="tabular-nums">¥{cost.toLocaleString()}</span> : '金欠'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {damagedItems.length === 0 && (
          <p className="text-center text-xs text-washi/30 mt-3">
            修理が必要な装備はありません
          </p>
        )}

        <Button onClick={onClose} variant="primary" className="w-full mt-4">
          OK
        </Button>
      </div>
    </div>
  );
}
