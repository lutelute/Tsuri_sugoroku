import type { PlayerEquipment, EquipmentType, EquipmentItem } from './types';
import { EQUIPMENT_DATA, getEquipment } from '../data/equipmentData';
import { MAX_EQUIPMENT_LEVEL, SHOP_TIER_MAX_LEVEL, DURABILITY_LOSS_BASE, DURABILITY_LOSS_PER_LEVEL, DURABILITY_BROKEN_THRESHOLD, REPAIR_COST_PER_POINT } from './constants';

// インベントリから装着中のアイテムのレベルを取得（未装着なら0）
export function getEquippedLevel(equipment: PlayerEquipment, type: EquipmentType): number {
  const itemId = equipment.equipped[type];
  if (!itemId) return 0;
  const item = equipment.inventory.find(i => i.id === itemId);
  return item ? item.level : 0;
}

// fishing.tsなどが使う { rod: number, reel: number, lure: number } 形式のレベルマップ
export function getEquipmentLevels(equipment: PlayerEquipment): { rod: number; reel: number; lure: number } {
  return {
    rod: getEquippedLevel(equipment, 'rod'),
    reel: getEquippedLevel(equipment, 'reel'),
    lure: getEquippedLevel(equipment, 'lure'),
  };
}

// 装着中の装備アイテムを取得
export function getEquippedItem(equipment: PlayerEquipment, type: EquipmentType): EquipmentItem | undefined {
  const itemId = equipment.equipped[type];
  if (!itemId) return undefined;
  return equipment.inventory.find(i => i.id === itemId);
}

let _idCounter = 0;
export function generateEquipmentId(): string {
  return `eq_${Date.now()}_${++_idCounter}`;
}

export function createEquipmentItem(type: EquipmentType, level: number): EquipmentItem {
  return {
    id: generateEquipmentId(),
    type,
    level,
    durability: 100,
  };
}

// 初期装備セットを作成（Lv1の竿・リール・ルアー、全て装着済み）
export function createInitialEquipment(): PlayerEquipment {
  const rod = createEquipmentItem('rod', 1);
  const reel = createEquipmentItem('reel', 1);
  const lure = createEquipmentItem('lure', 1);
  return {
    equipped: { rod: rod.id, reel: reel.id, lure: lure.id },
    inventory: [rod, reel, lure],
  };
}

export function canUpgrade(
  equipment: PlayerEquipment,
  type: EquipmentType,
  money: number,
  shopTier: number,
): boolean {
  const currentLevel = getEquippedLevel(equipment, type);
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
    const currentLevel = getEquippedLevel(equipment, type);
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

// 装備が壊れているかどうか
export function isBroken(item: EquipmentItem): boolean {
  return item.durability <= DURABILITY_BROKEN_THRESHOLD;
}

// 釣り1回分の耐久度消耗量を計算
export function calculateDurabilityLoss(item: EquipmentItem): number {
  const loss = DURABILITY_LOSS_BASE + DURABILITY_LOSS_PER_LEVEL * (item.level - 1);
  return Math.max(1, loss);
}

// 装備の修理コストを計算
export function calculateRepairCost(item: EquipmentItem): number {
  const missingDurability = 100 - item.durability;
  return Math.ceil(missingDurability * REPAIR_COST_PER_POINT);
}

// 装着中の装備に耐久度消耗を適用し、壊れた装備を自動解除する
export function applyDurabilityLoss(equipment: PlayerEquipment): PlayerEquipment {
  const types: EquipmentType[] = ['rod', 'reel', 'lure'];
  let newInventory = equipment.inventory.map(item => {
    // 装着中の装備のみ消耗
    if (equipment.equipped[item.type] === item.id) {
      const loss = calculateDurabilityLoss(item);
      return { ...item, durability: Math.max(0, item.durability - loss) };
    }
    return item;
  });

  // 壊れた装備を自動解除
  const newEquipped = { ...equipment.equipped };
  for (const type of types) {
    const equippedId = newEquipped[type];
    if (equippedId) {
      const item = newInventory.find(i => i.id === equippedId);
      if (item && isBroken(item)) {
        newEquipped[type] = null;
      }
    }
  }

  return { equipped: newEquipped, inventory: newInventory };
}

// 特定の装備にダメージを与える（イベント用）
export function damageEquipment(equipment: PlayerEquipment, type: EquipmentType, amount: number): { equipment: PlayerEquipment; broken: boolean } {
  const equippedId = equipment.equipped[type];
  if (!equippedId) return { equipment, broken: false };

  let broken = false;
  const newInventory = equipment.inventory.map(item => {
    if (item.id === equippedId) {
      const newDurability = Math.max(0, item.durability - amount);
      if (newDurability <= DURABILITY_BROKEN_THRESHOLD) broken = true;
      return { ...item, durability: newDurability };
    }
    return item;
  });

  const newEquipped = { ...equipment.equipped };
  if (broken) {
    newEquipped[type] = null;
  }

  return { equipment: { equipped: newEquipped, inventory: newInventory }, broken };
}

// 装備を修理する
export function repairItem(equipment: PlayerEquipment, itemId: string): PlayerEquipment {
  const newInventory = equipment.inventory.map(item => {
    if (item.id === itemId) {
      return { ...item, durability: 100 };
    }
    return item;
  });
  return { ...equipment, inventory: newInventory };
}
