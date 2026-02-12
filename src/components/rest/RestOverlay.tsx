import { useGameStore } from '../../store/useGameStore';
import { calculateRepairCost, isBroken } from '../../game/equipment';
import { getEquipment } from '../../data/equipmentData';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import Button from '../shared/Button';

const TYPE_ICONS: Record<EquipmentType, string> = {
  rod: '🎣',
  reel: '🔄',
  lure: '🪱',
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
      <div className="bg-gradient-to-b from-teal-900/80 to-teal-950/80 rounded-2xl border border-teal-500/20 p-6 max-w-sm w-[90%] my-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">🏖️</div>
          <h3 className="text-xl font-bold mb-1">{nodeName}で休憩</h3>
          <p className="text-white/60 text-sm">ゆっくり休んで体力回復! ¥500を獲得した!</p>
          <p className="text-sm text-amber-400 mt-1">所持金: ¥{player.money.toLocaleString()}</p>
        </div>

        {/* 修理セクション */}
        {damagedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-teal-500/20">
            <h4 className="text-sm font-bold text-center mb-3">装備修理</h4>
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
                        ? 'bg-red-900/20 border-red-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{TYPE_ICONS[item.type]}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold">{eqData?.name || '???'}</span>
                            {broken && (
                              <span className="text-[10px] bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full">
                                故障
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.durability > 50 ? 'bg-green-400' :
                                  item.durability > 20 ? 'bg-amber-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${item.durability}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/40">{item.durability}%</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRepair(item)}
                        variant="gold"
                        size="sm"
                        disabled={!canAfford}
                      >
                        {canAfford ? `¥${cost.toLocaleString()}` : '金欠'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {damagedItems.length === 0 && (
          <p className="text-center text-xs text-white/30 mt-3">
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
