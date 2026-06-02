import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import { getEquipment } from '../../data/equipmentData';
import { findMergePartner } from '../../game/equipment';
import { MERGE_DURABILITY_BONUS, MERGE_MAX_DURABILITY } from '../../game/constants';
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

interface InventoryPanelProps {
  onClose: () => void;
}

export default function InventoryPanel({ onClose }: InventoryPanelProps) {
  const { players, currentPlayerIndex, equipItem, unequipItem, mergeEquipment } = useGameStore();
  const player = players[currentPlayerIndex];
  const [filterType, setFilterType] = useState<EquipmentType | 'all'>('all');
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

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
      <div className="panel-ai relative rounded-2xl p-5 max-w-md w-[90%] my-4 max-h-[85vh] flex flex-col shadow-2xl">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/70 hover:text-washi hover:bg-ai-700/70 transition-all cursor-pointer"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="text-center mb-3">
          <div className="flex items-center justify-center mb-1">
            <Icon name="tacklebox" size={32} className="text-kin-300" />
          </div>
          <h2 className="font-mincho text-lg text-kin-300 ink-underline inline-block"><Ruby>装備インベントリ</Ruby></h2>
          <p className="text-xs text-washi/50 mt-2">
            <Ruby>所持数</Ruby>: <span className="tabular-nums">{inventory.length}</span> | <Ruby>タップで装着/取り外し</Ruby>
          </p>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-kin-500/20 text-kin-300 border border-kin-500/30'
                : 'bg-ai-800/50 text-washi/40 border border-transparent hover:bg-ai-700/60'
            }`}
          >
            <Ruby>全て</Ruby> (<span className="tabular-nums">{inventory.length}</span>)
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                filterType === t
                  ? 'bg-kin-500/20 text-kin-300 border border-kin-500/30'
                  : 'bg-ai-800/50 text-washi/40 border border-transparent hover:bg-ai-700/60'
              }`}
            >
              <Icon name={TYPE_ICONS[t]} size={16} /> (<span className="tabular-nums">{inventory.filter(i => i.type === t).length}</span>)
            </button>
          ))}
        </div>

        {/* 装備リスト */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {sorted.length === 0 && (
            <p className="text-center text-sm text-washi/30 py-8"><Ruby>装備がありません</Ruby></p>
          )}
          {sorted.map(item => {
            const eqData = getEquipment(item.type, item.level);
            const active = isEquipped(item);
            const partner = findMergePartner(inventory, item);
            const isMergeTarget = mergeTarget === item.id;
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                    active
                      ? 'bg-kin-500/15 border-kin-500/40 shadow-md shadow-kin-700/20'
                      : 'bg-ai-800/40 border-ai-700/40 hover:bg-ai-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name={TYPE_ICONS[item.type]} size={22} className={active ? 'text-kin-300' : 'text-ai-200'} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mincho font-bold text-sm text-washi"><Ruby>{eqData?.name || '???'}</Ruby></span>
                          <span className="text-xs text-washi/40 tabular-nums">Lv.{item.level}</span>
                          {active && (
                            <span className="seal text-[10px] px-1.5 py-0.5">
                              <Ruby>装着中</Ruby>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-washi/40 mt-0.5">
                          {TYPE_LABELS[item.type]} | <Ruby>{eqData?.effect || ''}</Ruby>
                        </p>
                      </div>
                    </div>
                    {/* 耐久度バー */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-16 h-1.5 bg-ai-900/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.durability > 50 ? 'bg-emerald-400' :
                            item.durability > 20 ? 'bg-kin-400' : 'bg-shu-400'
                          }`}
                          style={{ width: `${item.durability}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-washi/30 tabular-nums">{item.durability}%</span>
                    </div>
                  </div>
                </button>
                {/* 合体ボタン */}
                {partner && (
                  <div className="px-2">
                    {!isMergeTarget ? (
                      <button
                        onClick={() => setMergeTarget(item.id)}
                        className="w-full text-center py-1.5 rounded-lg text-xs font-medium bg-kin-500/20 text-kin-300 border border-kin-500/30 hover:bg-kin-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Icon name="merge" size={14} /> <Ruby>同じ装備と合体 (→ 最大</Ruby><span className="tabular-nums">{Math.min(MERGE_MAX_DURABILITY, item.durability + partner.durability + MERGE_DURABILITY_BONUS)}</span>%)
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            mergeEquipment(item.id, partner.id);
                            setMergeTarget(null);
                          }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-kin-500/40 text-kin-200 border border-kin-500/50 hover:bg-kin-500/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icon name="merge" size={14} /> <Ruby>合体する</Ruby>
                        </button>
                        <button
                          onClick={() => setMergeTarget(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-washi/40 bg-ai-800/50 border border-ai-700/40 hover:bg-ai-700/60 transition-all cursor-pointer"
                        >
                          <Ruby>やめる</Ruby>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={onClose} variant="secondary" className="w-full mt-3">
          <Ruby>閉じる</Ruby>
        </Button>
      </div>
    </div>
  );
}
