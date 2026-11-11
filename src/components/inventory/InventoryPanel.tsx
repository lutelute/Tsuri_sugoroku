import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { EquipmentType, EquipmentItem } from '../../game/types';
import { getEquipment } from '../../data/equipmentData';
import { findMergePartner } from '../../game/equipment';
import { MERGE_DURABILITY_BONUS, MERGE_MAX_DURABILITY } from '../../game/constants';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import GearArt, { GearTile } from '../shop/GearArt';
import GearStats, { DurabilityBamboo, LevelPips } from '../shop/GearStats';
import { GEAR_TEXT } from '../shop/gearStatCalc';
import { getEquippedItem, isBroken } from '../../game/equipment';

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
      <div className="panel-ai relative rounded-2xl p-4 sm:p-5 max-w-md md:max-w-2xl w-[92%] my-4 max-h-[88vh] flex flex-col shadow-2xl">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-2 right-2 flex items-center justify-center w-11 h-11 rounded-full bg-ai-800/60 border border-kin-500/30 text-washi/70 hover:text-washi hover:bg-ai-700/70 transition-all cursor-pointer"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="text-center mb-3">
          <h2 className="font-mincho text-lg text-kin-300 ink-underline inline-flex items-center gap-2">
            <Icon name="tacklebox" size={24} className="text-kin-300" />
            <Ruby>装備インベントリ</Ruby>
          </h2>
          <p className="text-xs text-washi/50 mt-2">
            <Ruby>所持数</Ruby>: <span className="tabular-nums">{inventory.length}</span> | <Ruby>タップで装着/取り外し</Ruby>
          </p>
        </div>

        {/* いまつけている3つの道具と、合わせた力 */}
        <div className="washi-card rounded-xl p-2.5 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-ai-900/65 font-mincho whitespace-nowrap mr-auto"><Ruby>{GEAR_TEXT.nowPower}</Ruby></p>
            {types.map(t => {
              const item = getEquippedItem(player.equipment, t);
              return item
                ? <GearTile key={t} type={t} level={item.level} size={42} broken={isBroken(item)} />
                : <span key={t} className="w-[42px] h-[42px] rounded-[0.6rem] border-2 border-dashed border-ai-900/30" aria-hidden="true" />;
            })}
          </div>
          <GearStats equipment={player.equipment} type="rod" level={getEquippedItem(player.equipment, 'rod')?.level ?? 0} onWashi className="mt-2" />
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
              className={`flex-1 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                filterType === t
                  ? 'bg-kin-500/20 text-kin-300 border border-kin-500/30'
                  : 'bg-ai-800/50 text-washi/40 border border-transparent hover:bg-ai-700/60'
              }`}
            >
              <span className={filterType === t ? '' : 'opacity-60'}><GearArt type={t} level={2} size={24} /></span> (<span className="tabular-nums">{inventory.filter(i => i.type === t).length}</span>)
            </button>
          ))}
        </div>

        {/* 装備リスト */}
        <div className="flex-1 overflow-y-auto min-h-0 grid gap-2 content-start md:grid-cols-2">
          {sorted.length === 0 && (
            <p className="text-center text-sm text-washi/30 py-8 md:col-span-2"><Ruby>装備がありません</Ruby></p>
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
                  <div className="flex items-start gap-3">
                    <GearTile type={item.type} level={item.level} size={54} active={active} broken={isBroken(item)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="font-mincho font-bold text-sm text-washi"><Ruby>{eqData?.name || '???'}</Ruby></span>
                        {active && (
                          <span className="seal text-[10px] px-1.5 py-0.5">
                            <Ruby>装着中</Ruby>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-washi/45 tabular-nums whitespace-nowrap">
                        <LevelPips level={item.level} />
                        {TYPE_LABELS[item.type]} Lv.{item.level}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] text-washi/45"><Ruby>{GEAR_TEXT.durability}</Ruby></span>
                        <DurabilityBamboo value={item.durability} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-washi/45 mt-2"><Ruby>{eqData?.effect || ''}</Ruby></p>
                  {/* つけていない道具は、持ちかえたときの差を棒で見せる */}
                  {!active && <GearStats equipment={player.equipment} type={item.type} level={item.level} className="mt-1.5" />}
                </button>
                {/* 合体ボタン */}
                {partner && (
                  <div className="px-2">
                    {!isMergeTarget ? (
                      <button
                        onClick={() => setMergeTarget(item.id)}
                        className="w-full text-center min-h-[44px] rounded-lg text-xs font-medium bg-kin-500/20 text-kin-300 border border-kin-500/30 hover:bg-kin-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                          className="flex-1 min-h-[44px] rounded-lg text-xs font-bold bg-kin-500/40 text-kin-200 border border-kin-500/50 hover:bg-kin-500/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icon name="merge" size={14} /> <Ruby>合体する</Ruby>
                        </button>
                        <button
                          onClick={() => setMergeTarget(null)}
                          className="px-3 min-h-[44px] rounded-lg text-xs text-washi/40 bg-ai-800/50 border border-ai-700/40 hover:bg-ai-700/60 transition-all cursor-pointer"
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

        <Button onClick={onClose} variant="secondary" className="w-full mt-3 min-h-[44px]">
          <Ruby>閉じる</Ruby>
        </Button>
      </div>
    </div>
  );
}
