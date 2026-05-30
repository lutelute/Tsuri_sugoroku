import type { Player, EventCard, CaughtFish, Fish } from './types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { MAX_EQUIPMENT_LEVEL } from './constants';
import { createCaughtFish } from './fishing';
import { buildAdjacencyList } from '../data/boardEdges';
import { computeDistanceToGoal } from '../utils/pathfinding';
import { getEquippedLevel, createEquipmentItem, damageEquipment } from './equipment';
import { random } from '../utils/random';

export interface EventResult {
  player: Player;
  message: string;
}

const GOAL_DISTANCE = computeDistanceToGoal();

// イベントで魚を選ぶプール。limitedNodes（特定ノード限定魚）は現在地に合致する場合のみ含める。
// 該当レアリティに非限定魚が無い場合のみ、限定魚へフォールバックする。
function eventFishPool(rarity: Fish['rarity'], nodeId: string): Fish[] {
  const byRarity = FISH_DATABASE.filter(f => f.rarity === rarity);
  const allowed = byRarity.filter(f => !f.limitedNodes || f.limitedNodes.includes(nodeId));
  return allowed.length > 0 ? allowed : byRarity;
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
      const pool = eventFishPool(effect.rarity, p.currentNode);
      if (pool.length > 0) {
        const fish = pool[Math.floor(random() * pool.length)];
        const caught: CaughtFish = createCaughtFish(fish.id, p.currentNode, turn, p.equipment);
        p.caughtFish = [...p.caughtFish, caught];
        return { player: p, message: `${fish.name}を手に入れた！（${fish.points}pt）` };
      }
      return { player: p, message: '残念、何も起こらなかった...' };
    }

    case 'multi_fish': {
      const pool = eventFishPool(effect.rarity, p.currentNode);
      if (pool.length > 0) {
        const newFish: CaughtFish[] = [];
        for (let i = 0; i < effect.count; i++) {
          const fish = pool[Math.floor(random() * pool.length)];
          newFish.push(createCaughtFish(fish.id, p.currentNode, turn, p.equipment));
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
      // 符号を尊重する: 正=ゴール方向へ前進、負=ゴールから遠ざかる後退。
      const adj = buildAdjacencyList();
      const forward = effect.steps >= 0;
      const count = Math.abs(effect.steps);
      let current = p.currentNode;
      for (let i = 0; i < count; i++) {
        const neighbors = adj.get(current);
        if (!neighbors || neighbors.length === 0) break;
        const curDist = GOAL_DISTANCE.get(current) ?? Infinity;
        // 望む方向（前進ならゴールに近づく / 後退ならゴールから遠ざかる）の隣接を優先
        const directional = neighbors.filter(n => {
          const d = GOAL_DISTANCE.get(n);
          if (d === undefined) return false;
          return forward ? d < curDist : d > curDist;
        });
        const pool = directional.length > 0 ? directional : neighbors;
        current = pool[Math.floor(random() * pool.length)];
      }
      p.currentNode = current;
      return { player: p, message: forward ? `${count}マス進んだ！` : `${count}マス戻った...` };
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
