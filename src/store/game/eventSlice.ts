// 釣り旅のイベント札と、県庁の祭り（選んで効果を受ける）。まちづくりでも祭りと移動系の札は使う。
import type { CapitalChoiceEffect, CapitalResult, CaughtFish, Player, TurnPhase } from '../../game/types';
import { GOAL_MONEY_REWARD } from '../../game/constants';
import { getCapitalEvent } from '../../data/capitalEvents';
import { NODE_MAP } from '../../data/boardNodes';
import { applyEvent } from '../../game/events';
import { priceScale } from '../../game/city';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { saveEncyclopedia } from '../../utils/storage';
import { saveUserEncyclopedia } from '../../lib/firestore';
import { createEquipmentItem, getEquipmentLevels } from '../../game/equipment';
import { random } from '../../utils/random';
import { isCityMode } from './initialState';
import { afterMove } from './moveHooks';
import { claimCityGoal } from './cityArrival';
import type { GameSlice } from './types';

export interface EventActions {
  /** fishId: 魚イベントで戦った魚。手に入れた魚と結果の文を返す */
  applyEventCard: (fishId?: string) => { message: string; gained: CaughtFish[] } | null;
  applyCapitalChoice: (choiceId: string) => void;
  acknowledgeCapitalResult: () => void;
}

export const createEventSlice: GameSlice<EventActions> = (set, get) => ({
  applyEventCard: (fishId) => {
    const { players, currentPlayerIndex, currentEvent, turn, encyclopedias } = get();
    if (!currentEvent) return null;

    const player = players[currentPlayerIndex];
    const prevNode = player.currentNode;
    const result = applyEvent(player, currentEvent, turn, fishId);
    let updatedPlayer = result.player;

    // 移動系イベント(move / move_steps)で新しいノードに着いた場合、ゴール到達を処理する
    // （通常移動と異なり executeNodeAction を経由しないため、ここで明示的にゴール判定する）
    let cityGoalClaims = get().cityGoalClaims;
    if (updatedPlayer.currentNode !== prevNode && !updatedPlayer.hasFinished && isCityMode(get().settings)) {
      // まちづくりでは「ゴール＝上がり」ではない（上がると手番が飛ばされ続けてしまう）。着順賞金だけ渡す
      const newNode = NODE_MAP.get(updatedPlayer.currentNode);
      if (newNode?.type === 'goal') {
        const g = claimCityGoal(cityGoalClaims, currentPlayerIndex);
        cityGoalClaims = g.claims;
        updatedPlayer = { ...updatedPlayer, money: updatedPlayer.money + g.reward };
      }
    } else if (updatedPlayer.currentNode !== prevNode && !updatedPlayer.hasFinished) {
      const newNode = NODE_MAP.get(updatedPlayer.currentNode);
      if (newNode?.type === 'goal') {
        const finishedCount = players.filter(p => p.hasFinished).length;
        const reward = GOAL_MONEY_REWARD[finishedCount] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1];
        updatedPlayer = {
          ...updatedPlayer,
          hasFinished: true,
          finishOrder: finishedCount,
          money: updatedPlayer.money + reward,
        };
        if (get().firstFinishTurn == null) set({ firstFinishTurn: turn });
      }
    }

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = updatedPlayer;
    // イベントでの移動も駒が進んで見えるように（瞬間移動させない）
    if (updatedPlayer.currentNode !== prevNode) {
      set({ lastMove: { playerIndex: currentPlayerIndex, path: [prevNode, updatedPlayer.currentNode], seq: (get().lastMove?.seq ?? 0) + 1 } });
      afterMove(set, get, [prevNode, updatedPlayer.currentNode]);
    }

    // イベントで魚を獲得した場合は図鑑も更新
    const oldFishIds = new Set(player.caughtFish.map(f => f.fishId));
    const newFish = updatedPlayer.caughtFish.filter(f => !oldFishIds.has(f.fishId));
    if (newFish.length > 0) {
      const newEncyclopedia = { ...encyclopedias[currentPlayerIndex] };
      for (const f of newFish) {
        newEncyclopedia[f.fishId] = true;
      }
      const newEncyclopedias = [...encyclopedias];
      newEncyclopedias[currentPlayerIndex] = newEncyclopedia;
      set({ players: newPlayers, encyclopedias: newEncyclopedias, cityGoalClaims });
    } else {
      set({ players: newPlayers, cityGoalClaims });
    }
    return { message: result.message, gained: result.gained ?? [] };
  },

  applyCapitalChoice: (choiceId) => {
    const { players, currentPlayerIndex, encyclopedias, turn } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node || !node.capitalEventId) return;
    const event = getCapitalEvent(node.capitalEventId);
    if (!event) return;
    const choice = event.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const effect: CapitalChoiceEffect = choice.effect;
    const newPlayers = [...players];
    const newEncyclopedias = [...encyclopedias];
    const p: Player = { ...player };
    let result: CapitalResult | null = null;

    switch (effect.kind) {
      case 'feast': {
        // まちづくりでは宴の賞金に物価が掛かる（年ごとに上がる）。釣り旅は額のまま
        const bonus = effect.moneyBonus * (isCityMode(get().settings) ? priceScale(turn) : 1);
        p.money += bonus;
        p.equipment = {
          ...p.equipment,
          inventory: p.equipment.inventory.map(it => ({ ...it, durability: 100 })),
        };
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: bonus,
          message: `宴を堪能し、装備も全て新品同様に。所持金 +¥${bonus.toLocaleString()}`,
        };
        break;
      }
      case 'specialty_shop': {
        if (p.money < effect.price) {
          result = {
            choiceId: choice.id,
            choiceLabel: choice.label,
            success: false,
            moneyDelta: 0,
            message: `所持金が足りず、購入できなかった。`,
          };
          break;
        }
        const item = createEquipmentItem(effect.equipmentType, effect.level);
        p.money -= effect.price;
        p.equipment = {
          equipped: { ...p.equipment.equipped, [effect.equipmentType]: item.id },
          inventory: [...p.equipment.inventory, item],
        };
        const typeLabel = effect.equipmentType === 'rod' ? '竿' : effect.equipmentType === 'reel' ? 'リール' : 'ルアー';
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: -effect.price,
          message: `${typeLabel}Lv${effect.level}を入手して装着！ (¥${effect.price.toLocaleString()})`,
        };
        break;
      }
      case 'special_fishing': {
        const fishData = FISH_DATABASE.find(f => f.id === effect.fishId);
        if (!fishData) break;
        // 装備平均レベルと難度から成功率を算出
        const levels = getEquipmentLevels(p.equipment);
        const avgLevel = (levels.rod + levels.reel + levels.lure) / 3;
        const baseChance = 0.55 + (avgLevel / 5) * 0.32;
        const difficultyPenalty = (effect.difficulty - 1) * 0.08;
        const successChance = Math.max(0.15, Math.min(0.92, baseChance - difficultyPenalty));
        const success = random() < successChance;

        if (success) {
          const caught: CaughtFish = { fishId: fishData.id, caughtAt: node.id, turn, size: 1.3, via: 'capital' };
          p.caughtFish = [...p.caughtFish, caught];
          p.money += effect.reward;
          const newEnc = { ...encyclopedias[currentPlayerIndex], [fishData.id]: true };
          newEncyclopedias[currentPlayerIndex] = newEnc;
          if (p.uid) saveUserEncyclopedia(p.uid, newEnc).catch(() => {});
          else if (!p.isCpu) saveEncyclopedia(newEnc);
          result = {
            choiceId: choice.id,
            choiceLabel: choice.label,
            success: true,
            fishId: fishData.id,
            moneyDelta: effect.reward,
            message: `${fishData.name}を見事に釣り上げた！ +¥${effect.reward.toLocaleString()}`,
            successChance,
          };
        } else {
          result = {
            choiceId: choice.id,
            choiceLabel: choice.label,
            success: false,
            moneyDelta: 0,
            message: `${fishData.name}は最後の力で糸を切って消えていった…`,
            successChance,
          };
        }
        break;
      }
      case 'money':
        p.money += effect.amount;
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: effect.amount,
          message: `所持金 +¥${effect.amount.toLocaleString()}`,
        };
        break;
      case 'extra_turn':
        p.extraTurn = true;
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: 0,
          message: `次のラウンドで追加ターンを獲得！`,
        };
        break;
      case 'lore_event': {
        // 将来: 県固有イベントカードに対応
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: 0,
          message: `伝承に耳を傾けた。`,
        };
        break;
      }
    }

    newPlayers[currentPlayerIndex] = p;
    set({ players: newPlayers, encyclopedias: newEncyclopedias, lastCapitalResult: result });
    // turnPhase は capital_event のまま。CapitalEventOverlay側で結果表示→OKで turn_end へ。
  },

  acknowledgeCapitalResult: () => {
    // まちづくりでは祭りの後もまだ建設できるよう、町パネルへ戻る。
    // 釣り旅では、釣具店のある県庁なら祭りの後に店へ寄れる（従来は祭りに隠れて店が使えなかった）
    const st = get();
    const node = NODE_MAP.get(st.players[st.currentPlayerIndex]?.currentNode ?? '');
    const next: TurnPhase = isCityMode(st.settings) ? 'city' : node?.shopTier ? 'shop' : 'turn_end';
    set({ lastCapitalResult: null, turnPhase: next, capitalDoneThisTurn: true });
  },
});
