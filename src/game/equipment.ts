import type { PlayerEquipment, EquipmentType } from './types';
import { EQUIPMENT_DATA, getEquipment } from '../data/equipmentData';
import { MAX_EQUIPMENT_LEVEL, SHOP_TIER_MAX_LEVEL } from './constants';

export function canUpgrade(
  equipment: PlayerEquipment,
  type: EquipmentType,
  money: number,
  shopTier: number,
): boolean {
  const currentLevel = equipment[type];
  if (currentLevel >= MAX_EQUIPMENT_LEVEL) return false;

  const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] || 3;
  if (currentLevel + 1 > maxLevel) return false;

  const nextEquip = getEquipment(type, currentLevel + 1);
  if (!nextEquip) return false;

  return money >= nextEquip.cost;
}

export function getUpgradeCost(type: EquipmentType, currentLevel: number): number {
  const next = getEquipment(type, currentLevel + 1);
  return next ? next.cost : Infinity;
}

export function getAvailableUpgrades(
  equipment: PlayerEquipment,
  money: number,
  shopTier: number,
): { type: EquipmentType; nextLevel: number; cost: number; name: string }[] {
  const types: EquipmentType[] = ['rod', 'reel', 'lure'];
  const upgrades: { type: EquipmentType; nextLevel: number; cost: number; name: string }[] = [];

  for (const type of types) {
    const currentLevel = equipment[type];
    const maxLevel = SHOP_TIER_MAX_LEVEL[shopTier] || 3;

    if (currentLevel < MAX_EQUIPMENT_LEVEL && currentLevel + 1 <= maxLevel) {
      const next = getEquipment(type, currentLevel + 1);
      if (next && money >= next.cost) {
        upgrades.push({ type, nextLevel: currentLevel + 1, cost: next.cost, name: next.name });
      }
    }
  }

  return upgrades;
}

export function getEquipmentName(type: EquipmentType, level: number): string {
  const eq = getEquipment(type, level);
  return eq ? eq.name : '不明';
}

export function getAllEquipmentForType(type: EquipmentType) {
  return EQUIPMENT_DATA.filter(e => e.type === type);
}
