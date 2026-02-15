import type { Player, EventCard, CaughtFish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { MAX_EQUIPMENT_LEVEL } from './constants';
import { createCaughtFish } from './fishing';
import { buildAdjacencyList } from '../data/boardEdges';
import { getEquippedLevel, createEquipmentItem, damageEquipment } from './equipment';

export interface EventResult {
  player: Player;
  message: string;
}

export function applyEvent(player: Player, event: EventCard, turn: number): EventResult {
  const p = { ...player };
  const effect = event.effect;

  switch (effect.kind) {
    case 'money':
      p.money = Math.max(0, p.money + effect.amount);
      return {
        player: p,
        message: effect.amount > 0
          ? `¥${effect.amount.toLocaleString()}を獲得！`
          : `¥${Math.abs(effect.amount).toLocaleString()}を失った...`,
      };

    case 'skip_turn':
      p.skipNextTurn = true;
      return { player: p, message: '次のターンは休み...' };

    case 'extra_turn':
      p.extraTurn = true;
      return { player: p, message: 'もう一度プレイできる！' };

    case 'free_upgrade': {
      const currentLevel = getEquippedLevel(p.equipment, effect.equipmentType);
      if (currentLevel < MAX_EQUIPMENT_LEVEL) {
        const newItem = createEquipmentItem(effect.equipmentType, currentLevel + 1);
        const newInventory = [...p.equipment.inventory, newItem];
        p.equipment = {
          equipped: { ...p.equipment.equipped, [effect.equipmentType]: newItem.id },
          inventory: newInventory,
        };
        return { player: p, message: `${getEquipmentTypeName(effect.equipmentType)}がアップグレードした！` };
      }
      p.money += 1000;
      return { player: p, message: '装備はすでに最大レベルだ！代わりに¥1,000をもらった！' };
    }

    case 'fish_bonus':
      p.fishBonusMultiplier = effect.multiplier;
      p.fishBonusTurnsLeft = effect.duration;
      return { player: p, message: `${effect.duration}ターンの間、釣りポイント${effect.multiplier}倍！` };

    case 'steal_fish': {
      if (p.caughtFish.length > 0) {
        const newFish = [...p.caughtFish];
        newFish.pop();
        p.caughtFish = newFish;
        return { player: p, message: '最後に釣った魚を失った...' };
      }
      return { player: p, message: '盗まれる魚がなかった！セーフ！' };
    }

    case 'random_fish': {
      const pool = FISH_DATABASE.filter(f => f.rarity === effect.rarity);
      if (pool.length > 0) {
        const fish = pool[Math.floor(Math.random() * pool.length)];
        const caught: CaughtFish = createCaughtFish(fish.id, p.currentNode, turn);
        p.caughtFish = [...p.caughtFish, caught];
        return { player: p, message: `${fish.name}を手に入れた！（${fish.points}pt）` };
      }
      return { player: p, message: '残念、何も起こらなかった...' };
    }

    case 'multi_fish': {
      const pool = FISH_DATABASE.filter(f => f.rarity === effect.rarity);
      if (pool.length > 0) {
        const newFish: CaughtFish[] = [];
        for (let i = 0; i < effect.count; i++) {
          const fish = pool[Math.floor(Math.random() * pool.length)];
          newFish.push(createCaughtFish(fish.id, p.currentNode, turn));
        }
        p.caughtFish = [...p.caughtFish, ...newFish];
        return { player: p, message: `大漁！${effect.count}匹の魚を手に入れた！` };
      }
      return { player: p, message: '残念、何も起こらなかった...' };
    }

    case 'move':
      p.currentNode = effect.nodeId;
      return { player: p, message: `${effect.nodeId}に移動した！` };

    case 'move_steps': {
      const adj = buildAdjacencyList();
      let current = p.currentNode;
      for (let i = 0; i < Math.abs(effect.steps); i++) {
        const neighbors = adj.get(current);
        if (!neighbors || neighbors.length === 0) break;
        current = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
      p.currentNode = current;
      return { player: p, message: `${Math.abs(effect.steps)}マス移動した！` };
    }

    case 'equipment_damage': {
      const { equipment: newEquipment, broken } = damageEquipment(p.equipment, effect.equipmentType, effect.amount);
      p.equipment = newEquipment;
      const typeName = getEquipmentTypeName(effect.equipmentType);
      if (broken) {
        return { player: p, message: `${typeName}が壊れてしまった！修理が必要だ...` };
      }
      return { player: p, message: `${typeName}の耐久度が大きく下がった！` };
    }

    default:
      return { player: p, message: 'イベント発生！' };
  }
}

function getEquipmentTypeName(type: string): string {
  switch (type) {
    case 'rod': return 'ロッド';
    case 'reel': return 'リール';
    case 'lure': return 'ルアー';
    default: return '装備';
  }
}
