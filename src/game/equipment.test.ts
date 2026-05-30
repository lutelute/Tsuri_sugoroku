import { describe, it, expect } from 'vitest';
import type { PlayerEquipment, EquipmentItem } from './types';
import {
  createInitialEquipment, createEquipmentItem, calculateDurabilityLoss,
  applyDurabilityLoss, isBroken, damageEquipment, repairItem,
  calculateRepairCost, mergeEquipmentItems, getEquippedLevel, getEquipmentLevels,
} from './equipment';

describe('createInitialEquipment', () => {
  it('竿・リール・ルアーが全てLv1・耐久100で装着済み', () => {
    const eq = createInitialEquipment();
    expect(eq.inventory).toHaveLength(3);
    expect(eq.inventory.every(i => i.level === 1 && i.durability === 100)).toBe(true);
    expect(eq.equipped.rod).not.toBeNull();
    expect(eq.equipped.reel).not.toBeNull();
    expect(eq.equipped.lure).not.toBeNull();
    expect(getEquipmentLevels(eq)).toEqual({ rod: 1, reel: 1, lure: 1 });
  });
});

describe('calculateDurabilityLoss', () => {
  it('レベルが高いほど消耗が少ない（最低1）', () => {
    const lv1 = createEquipmentItem('rod', 1);
    const lv5 = createEquipmentItem('rod', 5);
    expect(calculateDurabilityLoss(lv1)).toBe(8);
    expect(calculateDurabilityLoss(lv5)).toBe(4);
    expect(calculateDurabilityLoss(lv1)).toBeGreaterThan(calculateDurabilityLoss(lv5));
  });
});

describe('applyDurabilityLoss', () => {
  it('装着中の装備だけ消耗する', () => {
    const eq = createInitialEquipment();
    const after = applyDurabilityLoss(eq);
    expect(after.inventory.every(i => i.durability < 100)).toBe(true);
  });

  it('耐久0になった装備は自動的に外れる', () => {
    const rod = createEquipmentItem('rod', 1);
    rod.durability = 5; // 次の消耗(8)で壊れる
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: null, lure: null }, inventory: [rod] };
    const after = applyDurabilityLoss(eq);
    expect(after.inventory[0].durability).toBe(0);
    expect(after.equipped.rod).toBeNull();
  });
});

describe('isBroken', () => {
  it('耐久0以下で壊れた判定', () => {
    expect(isBroken({ id: 'x', type: 'rod', level: 1, durability: 0 })).toBe(true);
    expect(isBroken({ id: 'x', type: 'rod', level: 1, durability: 1 })).toBe(false);
  });
});

describe('damageEquipment', () => {
  it('装着中の装備にダメージを与え、0以下で壊れて外れる', () => {
    const eq = createInitialEquipment();
    const { equipment, broken } = damageEquipment(eq, 'rod', 100);
    expect(broken).toBe(true);
    expect(equipment.equipped.rod).toBeNull();
  });

  it('装着していない種類へのダメージは無効', () => {
    const eq: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [] };
    const { broken } = damageEquipment(eq, 'rod', 50);
    expect(broken).toBe(false);
  });
});

describe('repairItem / calculateRepairCost', () => {
  it('修理で耐久が100に戻る', () => {
    const rod = createEquipmentItem('rod', 1);
    rod.durability = 30;
    const eq: PlayerEquipment = { equipped: { rod: rod.id, reel: null, lure: null }, inventory: [rod] };
    const after = repairItem(eq, rod.id);
    expect(after.inventory[0].durability).toBe(100);
  });

  it('修理コストは不足耐久に比例', () => {
    const rod = createEquipmentItem('rod', 1);
    rod.durability = 30;
    expect(calculateRepairCost(rod)).toBe(Math.ceil(70 * 15));
  });
});

describe('mergeEquipmentItems', () => {
  function twoRods(d1: number, d2: number): { eq: PlayerEquipment; a: EquipmentItem; b: EquipmentItem } {
    const a = createEquipmentItem('rod', 2);
    const b = createEquipmentItem('rod', 2);
    a.durability = d1;
    b.durability = d2;
    const eq: PlayerEquipment = { equipped: { rod: b.id, reel: null, lure: null }, inventory: [a, b] };
    return { eq, a, b };
  }

  it('合体後の耐久は両入力を下回らない（新品同士でも劣化しない）', () => {
    const { eq, a, b } = twoRods(100, 100);
    const after = mergeEquipmentItems(eq, a.id, b.id);
    expect(after.inventory).toHaveLength(1);
    const merged = after.inventory[0];
    expect(merged.durability).toBeGreaterThanOrEqual(100);
    expect(merged.durability).toBeLessThanOrEqual(100); // 上限100
  });

  it('摩耗品同士はボーナス込みで合算（上限100）', () => {
    const { eq, a, b } = twoRods(20, 20);
    const after = mergeEquipmentItems(eq, a.id, b.id);
    expect(after.inventory[0].durability).toBe(55); // 20+20+15
  });

  it('合計が100を超える場合は100に丸められ、入力以上を保証', () => {
    const { eq, a, b } = twoRods(90, 30);
    const after = mergeEquipmentItems(eq, a.id, b.id);
    expect(after.inventory[0].durability).toBe(100);
    expect(after.inventory[0].durability).toBeGreaterThanOrEqual(90);
  });

  it('装着中アイテムが消える側でも合体先へ装着が移行する', () => {
    const { eq, a, b } = twoRods(50, 50); // bが装着中
    const after = mergeEquipmentItems(eq, a.id, b.id); // bを削除しaへ統合
    expect(after.equipped.rod).toBe(a.id);
    expect(after.inventory.find(i => i.id === b.id)).toBeUndefined();
  });

  it('種類・レベルが違うと合体しない', () => {
    const a = createEquipmentItem('rod', 2);
    const b = createEquipmentItem('rod', 3);
    const eq: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [a, b] };
    const after = mergeEquipmentItems(eq, a.id, b.id);
    expect(after.inventory).toHaveLength(2); // 変化なし
  });
});

describe('getEquippedLevel', () => {
  it('未装着なら0', () => {
    const eq: PlayerEquipment = { equipped: { rod: null, reel: null, lure: null }, inventory: [] };
    expect(getEquippedLevel(eq, 'rod')).toBe(0);
  });
});
