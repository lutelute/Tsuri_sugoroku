import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import { getEquipment } from '../../data/equipmentData';
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

interface InventoryPanelProps {
  onClose: () => void;
}

export default function InventoryPanel({ onClose }: InventoryPanelProps) {
  const { players, currentPlayerIndex, equipItem, unequipItem } = useGameStore();
  const player = players[currentPlayerIndex];
  const [filterType, setFilterType] = useState<EquipmentType | 'all'>('all');

  const types: EquipmentType[] = ['rod', 'reel', 'lure'];
  const inventory = player.equipment.inventory;
  const equipped = player.equipment.equipped;

  const filtered = filterType === 'all'
    ? inventory
    : inventory.filter(i => i.type === filterType);

  // 種類・レベル順にソート
  const sorted = [...filtered].sort((a, b) => {
    if (a.type !== b.type) return types.indexOf(a.type) - types.indexOf(b.type);
    return b.level - a.level;
  });

  const isEquipped = (item: EquipmentItem) => equipped[item.type] === item.id;

  const handleToggle = (item: EquipmentItem) => {
    if (isEquipped(item)) {
      unequipItem(item.type);
    } else {
      equipItem(item.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 p-5 max-w-md w-[90%] my-4 max-h-[85vh] flex flex-col shadow-2xl">
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold">装備インベントリ</h2>
          <p className="text-xs text-white/50 mt-1">
            所持数: {inventory.length} | タップで装着/取り外し
          </p>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            全て ({inventory.length})
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterType === t ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {TYPE_ICONS[t]} ({inventory.filter(i => i.type === t).length})
            </button>
          ))}
        </div>

        {/* 装備リスト */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {sorted.length === 0 && (
            <p className="text-center text-sm text-white/30 py-8">装備がありません</p>
          )}
          {sorted.map(item => {
            const eqData = getEquipment(item.type, item.level);
            const active = isEquipped(item);
            return (
              <button
                key={item.id}
                onClick={() => handleToggle(item)}
                className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-900/30 border-blue-400/40 shadow-md shadow-blue-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[item.type]}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{eqData?.name || '???'}</span>
                        <span className="text-xs text-white/40">Lv.{item.level}</span>
                        {active && (
                          <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">
                            装着中
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        {TYPE_LABELS[item.type]} | {eqData?.effect || ''}
                      </p>
                    </div>
                  </div>
                  {/* 耐久度バー */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.durability > 50 ? 'bg-green-400' :
                          item.durability > 20 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${item.durability}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30">{item.durability}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={onClose} variant="secondary" className="w-full mt-3">
          閉じる
        </Button>
      </div>
    </div>
  );
}
