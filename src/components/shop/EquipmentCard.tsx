import { useState } from 'react';
import type { Equipment, EquipmentType, PlayerEquipment } from '../../game/types';
import Button from '../shared/Button';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { GearTile } from './GearArt';
import GearStats, { LevelPips } from './GearStats';
import { GEAR_COMPARE_LABEL, gearCompare } from './gearStatCalc';

const TYPE_LABELS: Record<EquipmentType, string> = {
  rod: 'ロッド',
  reel: 'リール',
  lure: 'ルアー',
};

// いまつけている道具とくらべた印の色
const COMPARE_CLS = {
  1: 'bg-kin-500/20 text-kin-300 border-kin-500/50',
  0: 'bg-ai-900/40 text-washi/60 border-washi/20',
  [-1]: 'bg-shu-700/20 text-shu-400 border-shu-500/40',
} as const;

interface EquipmentCardProps {
  equipment: Equipment;
  ownedCount: number;
  canAfford: boolean;
  canBuy: boolean;
  onBuy: () => void;
  /** いまの持ち物（能力の棒で「買うとどう変わるか」を見せる） */
  current: PlayerEquipment;
}

export default function EquipmentCard({ equipment, ownedCount, canAfford, canBuy, onBuy, current }: EquipmentCardProps) {
  // 買って所持数が増えたらカードをふわっと光らせる
  const [prevOwned, setPrevOwned] = useState(ownedCount);
  const [flash, setFlash] = useState(0);
  if (ownedCount !== prevOwned) {
    if (ownedCount > prevOwned) setFlash(f => f + 1);
    setPrevOwned(ownedCount);
  }
  const cmp = gearCompare(current, equipment.type, equipment.level);

  return (
    <div className={`panel-ai relative rounded-xl p-3 transition-all ${
      ownedCount > 0
        ? 'border-emerald-500/40'
        : canBuy
          ? 'border-kin-500/40'
          : 'opacity-50'
    }`}>
      {flash > 0 && <span key={flash} className="fx-glow is-gain" aria-hidden="true" />}
      <div className="flex items-start gap-3">
        <GearTile type={equipment.type} level={equipment.level} size={60} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-mincho font-bold text-sm text-washi"><Ruby>{equipment.name}</Ruby></span>
            {ownedCount > 0 && (
              <span key={ownedCount} className="fx-pop">
                <span className="seal text-[10px] rounded-full px-1.5 py-0.5 tabular-nums whitespace-nowrap">
                  <Ruby>所持</Ruby> x{ownedCount}
                </span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-washi/45 tabular-nums whitespace-nowrap">
              <LevelPips level={equipment.level} />
              {TYPE_LABELS[equipment.type]} Lv.{equipment.level}
            </span>
            {equipment.cost === 0 ? (
              <span className="text-emerald-300 text-xs whitespace-nowrap"><Ruby>初期装備</Ruby></span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-kin-300 tabular-nums whitespace-nowrap">
                <Icon name="coin" size={14} className="text-kin-400" />
                ¥{equipment.cost.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-washi/55 mt-1 leading-snug"><Ruby>{equipment.description}</Ruby></p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`text-[10px] leading-none rounded-full border px-2 py-1 whitespace-nowrap ${COMPARE_CLS[cmp]}`}><Ruby>{GEAR_COMPARE_LABEL[cmp]}</Ruby></span>
        <span className="text-[11px] text-ai-200/80"><Ruby>{equipment.effect}</Ruby></span>
      </div>
      <GearStats equipment={current} type={equipment.type} level={equipment.level} className="mt-2" />

      {canBuy && (
        <Button
          onClick={onBuy}
          variant="gold"
          size="sm"
          disabled={!canAfford}
          className="w-full mt-2.5 min-h-[44px]"
        >
          <Ruby>{canAfford ? '購入する' : 'お金が足りない'}</Ruby>
        </Button>
      )}
    </div>
  );
}
