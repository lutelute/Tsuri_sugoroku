import { create } from 'zustand';
import type {
  GameState, GameScreen, TurnPhase, Player, GameSettings,
  FishingState, CaughtFish, EquipmentType, CapitalChoiceEffect, CapitalResult,
} from '../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, REST_MONEY_BONUS, DEFAULT_MAX_TURNS, FISH_SELL_PRICE, BOAT_FISHING_COST, GOAL_MONEY_REWARD } from '../game/constants';
import { getCapitalEvent } from '../data/capitalEvents';
import { calculateReachableNodes } from '../game/movement';
import { NODE_MAP } from '../data/boardNodes';
import { getRandomEventCard } from '../data/eventCards';
import { applyEvent } from '../game/events';
import { selectFish } from '../game/fishing';
import { FISH_DATABASE } from '../data/fishDatabase';
import { loadEncyclopedia, saveEncyclopedia, saveGameState, loadGameState, clearGameState, loadGameStateAsync } from '../utils/storage';
import { createInitialEquipment, createEquipmentItem, applyDurabilityLoss, repairItem, isBroken, mergeEquipmentItems, getEquipmentLevels } from '../game/equipment';
import { saveUserEquipment, saveUserMoney, saveUserEncyclopedia, loadUserEncyclopedia } from '../lib/firestore';
import type { PlayerEquipment } from '../game/types';

const MAX_FISHING_PER_TURN = 3;

interface GameActions {
  setScreen: (screen: GameScreen) => void;
  startGame: (settings: GameSettings, savedEquipments?: (PlayerEquipment | null)[], savedMoneys?: (number | null)[], savedEncyclopedias?: (Record<string, boolean> | null)[]) => void;
  rollDice: (result: number) => void;
  selectPath: (pathIndex: number) => void;
  executeNodeAction: () => void;
  startFishing: (boatFishing?: boolean) => void;
  startBoatFishing: () => void;
  updateFishingState: (state: Partial<FishingState>) => void;
  catchFish: (caught: CaughtFish, bonusFish?: CaughtFish[]) => void;
  failFishing: () => void;
  endFishing: () => void;
  buyEquipment: (type: EquipmentType, level: number, cost: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (type: EquipmentType) => void;
  degradeEquipment: () => void;
  repairEquipment: (itemId: string, cost: number) => void;
  mergeEquipment: (itemId1: string, itemId2: string) => void;
  skipShop: () => void;
  applyEventCard: () => void;
  applyCapitalChoice: (choiceId: string) => void;
  acknowledgeCapitalResult: () => void;
  doActionAgain: () => void;
  endTurn: () => void;
  endGame: () => void;
  nextPlayer: () => void;
  setTurnPhase: (phase: TurnPhase) => void;
  resetGame: () => void;
  resumeGame: () => void;
  warpCurrentPlayerTo: (nodeId: string) => void;
  syncFromCloud: () => Promise<void>;
  clearUserData: () => void;
}

type GameStore = GameState & GameActions;

function createInitialPlayers(
  settings: GameSettings,
  savedEquipments?: (PlayerEquipment | null)[],
  savedMoneys?: (number | null)[],
): Player[] {
  return Array.from({ length: settings.playerCount }, (_, i) => ({
    id: i,
    name: settings.playerNames[i] || PLAYER_DEFAULT_NAMES[i],
    color: PLAYER_COLORS[i],
    uid: settings.playerUids[i] ?? undefined,
    currentNode: 'start',
    money: savedMoneys?.[i] ?? INITIAL_MONEY,
    equipment: savedEquipments?.[i] ?? createInitialEquipment(),
    caughtFish: [],
    score: 0,
    hasFinished: false,
    finishOrder: null,
    skipNextTurn: false,
    extraTurn: false,
    fishBonusMultiplier: 1,
    fishBonusTurnsLeft: 0,
  }));
}

const initialState: GameState = {
  screen: 'title',
  settings: { playerCount: 1, playerNames: [PLAYER_DEFAULT_NAMES[0]], playerUids: [null], maxTurns: DEFAULT_MAX_TURNS },
  players: [],
  currentPlayerIndex: 0,
  turn: 1,
  turnPhase: 'idle',
  rouletteResult: null,
  reachableNodes: [],
  fishingState: null,
  currentEvent: null,
  gameOver: false,
  encyclopedias: [loadEncyclopedia()],
  initialEncyclopedias: [],
  nodeActionsThisTurn: 0,
  boatFishingRemaining: 0,
  lastCapitalResult: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),

  startGame: (settings, savedEquipments, savedMoneys, savedEncyclopedias) => {
    const players = createInitialPlayers(settings, savedEquipments, savedMoneys);
    // プレイヤーごとの図鑑を初期化
    const encyclopedias = players.map((p, i) => {
      if (savedEncyclopedias?.[i] != null) return savedEncyclopedias[i]!;
      // ゲストプレイヤーはlocalStorageから読み込み、登録ユーザーは空で開始（Firestoreからロード済みのはず）
      return p.uid ? {} : loadEncyclopedia();
    });
    // ゲーム開始時の図鑑をスナップショット（NEW判定用）
    const initialEncyclopedias = encyclopedias.map(enc => ({ ...enc }));
    set({
      screen: 'game',
      settings,
      players,
      currentPlayerIndex: 0,
      turn: 1,
      turnPhase: 'idle',
      rouletteResult: null,
      reachableNodes: [],
      fishingState: null,
      currentEvent: null,
      gameOver: false,
      encyclopedias,
      initialEncyclopedias,
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
    });
  },

  rollDice: (result) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const paths = calculateReachableNodes(player.currentNode, result);

    if (paths.length === 0) {
      set({ rouletteResult: result, turnPhase: 'action_choice', reachableNodes: [] });
    } else if (paths.length === 1) {
      const destination = paths[0][paths[0].length - 1];
      const newPlayers = [...players];
      newPlayers[currentPlayerIndex] = { ...player, currentNode: destination };
      set({
        rouletteResult: result,
        reachableNodes: paths,
        players: newPlayers,
        turnPhase: 'node_action',
        nodeActionsThisTurn: 0,
        boatFishingRemaining: 0,
      });
    } else {
      set({
        rouletteResult: result,
        reachableNodes: paths,
        turnPhase: 'path_selection',
      });
    }
  },

  selectPath: (pathIndex) => {
    const { players, currentPlayerIndex, reachableNodes } = get();
    const path = reachableNodes[pathIndex];
    if (!path) return;

    const destination = path[path.length - 1];
    const player = players[currentPlayerIndex];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, currentNode: destination };

    set({ players: newPlayers, turnPhase: 'node_action', nodeActionsThisTurn: 0, boatFishingRemaining: 0 });
  },

  executeNodeAction: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);

    if (!node) {
      set({ turnPhase: 'action_choice' });
      return;
    }

    switch (node.type) {
      case 'fishing':
      case 'fishing_special':
        set({ turnPhase: 'fishing_choice' });
        break;
      case 'shop':
        set({ turnPhase: 'shop' });
        break;
      case 'event_good': {
        const event = getRandomEventCard('good');
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'event_bad': {
        const event = getRandomEventCard('bad');
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'event_random': {
        const event = getRandomEventCard();
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'rest': {
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...player,
          money: player.money + REST_MONEY_BONUS,
        };
        set({ players: newPlayers, turnPhase: 'rest' });
        break;
      }
      case 'route': {
        // 街道中継マス: 50%でランダム小イベント、50%は素通り。稀にレア魚遭遇。
        const r = Math.random();
        if (r < 0.5) {
          const event = getRandomEventCard();
          set({ currentEvent: event, turnPhase: 'event' });
        } else {
          set({ turnPhase: 'action_choice' });
        }
        break;
      }
      case 'capital': {
        // 県メインイベント: 固有イベントを表示
        if (node.capitalEventId && getCapitalEvent(node.capitalEventId)) {
          set({ turnPhase: 'capital_event' });
        } else {
          // フォールバック: ショップ扱い
          set({ turnPhase: 'shop' });
        }
        break;
      }
      case 'start': {
        // スタート地点でもショップが利用可能
        set({ turnPhase: 'shop' });
        break;
      }
      case 'goal': {
        const finishedCount = players.filter(p => p.hasFinished).length;
        const reward = GOAL_MONEY_REWARD[finishedCount] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1];
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...player,
          hasFinished: true,
          finishOrder: finishedCount,
          money: player.money + reward,
        };
        set({ players: newPlayers, turnPhase: 'turn_end' });
        break;
      }
      default:
        set({ turnPhase: 'action_choice' });
    }
  },

  startFishing: (boatFishing) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node) return;

    const fish = selectFish(
      node.id,
      node.region,
      player.equipment,
      node.type === 'fishing_special',
      boatFishing,
    );

    set({
      fishingState: {
        phase: 'cast',
        miniGame: 'reeling',
        targetFish: fish,
        biteTimer: 0,
        hasBite: false,
        strikeSuccess: false,
        reelingProgress: 0,
        tension: 0,
        caughtSize: 1,
        escaped: false,
        boatFishing: !!boatFishing,
        tairyouCount: 0,
      },
      turnPhase: 'fishing',
    });
  },

  startBoatFishing: () => {
    const { players, currentPlayerIndex, boatFishingRemaining } = get();
    const player = players[currentPlayerIndex];

    if (boatFishingRemaining > 0) {
      // 既に船釣り中（無料で続行）
      set({ boatFishingRemaining: boatFishingRemaining - 1 });
      get().startFishing(true);
      return;
    }

    // 初回: お金を差し引き、残り2回をセット
    if (player.money < BOAT_FISHING_COST) return;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - BOAT_FISHING_COST };
    set({ players: newPlayers, boatFishingRemaining: 2 });
    get().startFishing(true);
  },

  updateFishingState: (partial) => {
    const { fishingState } = get();
    if (!fishingState) return;
    set({ fishingState: { ...fishingState, ...partial } });
  },

  catchFish: (caught, bonusFish) => {
    const { players, currentPlayerIndex, encyclopedias, nodeActionsThisTurn } = get();
    const player = players[currentPlayerIndex];

    // メイン + ボーナス魚を全てまとめる
    const allCaught = [caught, ...(bonusFish ?? [])];
    const allWithBonus = allCaught.map(c => ({ ...c, bonusMultiplier: player.fishBonusMultiplier }));

    // 売却金合計 & 図鑑更新（現在のプレイヤーのみ）
    let totalSellPrice = 0;
    const newEncyclopedia = { ...encyclopedias[currentPlayerIndex] };
    for (const c of allCaught) {
      const fishData = FISH_DATABASE.find(f => f.id === c.fishId);
      totalSellPrice += fishData ? Math.round((FISH_SELL_PRICE[fishData.rarity] ?? 200) * c.size) : 200;
      newEncyclopedia[c.fishId] = true;
    }

    const newEncyclopedias = [...encyclopedias];
    newEncyclopedias[currentPlayerIndex] = newEncyclopedia;

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      caughtFish: [...player.caughtFish, ...allWithBonus],
      money: player.money + totalSellPrice,
    };

    // 永続化（uidがあればFirestore、なければlocalStorage）
    if (player.uid) {
      saveUserEncyclopedia(player.uid, newEncyclopedia).catch(() => {});
    } else {
      saveEncyclopedia(newEncyclopedia);
    }

    set({
      players: newPlayers,
      encyclopedias: newEncyclopedias,
      nodeActionsThisTurn: nodeActionsThisTurn + 1,
      fishingState: get().fishingState
        ? { ...get().fishingState!, phase: 'result', escaped: false, tairyouCount: bonusFish?.length ?? 0 }
        : null,
    });
  },

  failFishing: () => {
    const { nodeActionsThisTurn } = get();
    set({
      nodeActionsThisTurn: nodeActionsThisTurn + 1,
      fishingState: get().fishingState
        ? { ...get().fishingState!, phase: 'result', escaped: true }
        : null,
    });
  },

  endFishing: () => {
    // 釣り後に装備消耗を適用
    get().degradeEquipment();
    // 釣り後は action_choice へ（もう1回釣るか選べる）
    set({ fishingState: null, turnPhase: 'action_choice' });
  },

  buyEquipment: (type, level, cost) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newItem = createEquipmentItem(type, level);
    const newInventory = [...player.equipment.inventory, newItem];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      money: player.money - cost,
      equipment: {
        equipped: { ...player.equipment.equipped, [type]: newItem.id },
        inventory: newInventory,
      },
    };
    set({ players: newPlayers });
  },

  equipItem: (itemId) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const item = player.equipment.inventory.find(i => i.id === itemId);
    if (!item) return;
    if (isBroken(item)) return; // 壊れた装備は装着不可
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      equipment: {
        ...player.equipment,
        equipped: { ...player.equipment.equipped, [item.type]: itemId },
      },
    };
    set({ players: newPlayers });
  },

  unequipItem: (type) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      equipment: {
        ...player.equipment,
        equipped: { ...player.equipment.equipped, [type]: null },
      },
    };
    set({ players: newPlayers });
  },

  degradeEquipment: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newEquipment = applyDurabilityLoss(player.equipment);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, equipment: newEquipment };
    set({ players: newPlayers });
  },

  repairEquipment: (itemId, cost) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    if (player.money < cost) return;
    const newEquipment = repairItem(player.equipment, itemId);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      money: player.money - cost,
      equipment: newEquipment,
    };
    set({ players: newPlayers });
  },

  mergeEquipment: (itemId1, itemId2) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newEquipment = mergeEquipmentItems(player.equipment, itemId1, itemId2);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, equipment: newEquipment };
    set({ players: newPlayers });
  },

  skipShop: () => {
    // ショップ後も action_choice へ
    set({ turnPhase: 'action_choice' });
  },

  applyEventCard: () => {
    const { players, currentPlayerIndex, currentEvent, turn, encyclopedias } = get();
    if (!currentEvent) return;

    const player = players[currentPlayerIndex];
    const prevNode = player.currentNode;
    const result = applyEvent(player, currentEvent, turn);
    let updatedPlayer = result.player;

    // 移動系イベント(move / move_steps)で新しいノードに着いた場合、ゴール到達を処理する
    // （通常移動と異なり executeNodeAction を経由しないため、ここで明示的にゴール判定する）
    if (updatedPlayer.currentNode !== prevNode && !updatedPlayer.hasFinished) {
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
      }
    }

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = updatedPlayer;

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
      set({ players: newPlayers, encyclopedias: newEncyclopedias });
    } else {
      set({ players: newPlayers });
    }
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
        p.money += effect.moneyBonus;
        p.equipment = {
          ...p.equipment,
          inventory: p.equipment.inventory.map(it => ({ ...it, durability: 100 })),
        };
        result = {
          choiceId: choice.id,
          choiceLabel: choice.label,
          success: true,
          moneyDelta: effect.moneyBonus,
          message: `宴を堪能し、装備も全て新品同様に。所持金 +¥${effect.moneyBonus.toLocaleString()}`,
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
        const success = Math.random() < successChance;

        if (success) {
          const caught: CaughtFish = { fishId: fishData.id, caughtAt: node.id, turn, size: 1.3 };
          p.caughtFish = [...p.caughtFish, caught];
          p.money += effect.reward;
          const newEnc = { ...encyclopedias[currentPlayerIndex], [fishData.id]: true };
          newEncyclopedias[currentPlayerIndex] = newEnc;
          if (p.uid) saveUserEncyclopedia(p.uid, newEnc).catch(() => {});
          else saveEncyclopedia(newEnc);
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
    set({ lastCapitalResult: null, turnPhase: 'turn_end' });
  },

  doActionAgain: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node) return;

    // ノードタイプに応じて再アクション
    switch (node.type) {
      case 'fishing':
      case 'fishing_special':
        set({ turnPhase: 'fishing_choice' });
        break;
      case 'shop':
        set({ turnPhase: 'shop' });
        break;
      default:
        set({ turnPhase: 'turn_end' });
    }
  },

  endTurn: () => {
    const state = get();
    const { players } = state;
    const idx = state.currentPlayerIndex;

    // 全員ゴール → 即終了
    if (players.every(p => p.hasFinished)) {
      get().endGame();
      return;
    }

    const player = players[idx];

    // 釣りポイントボーナスのターン減算（このプレイヤーのターン終了時に1減らす）
    if (player.fishBonusTurnsLeft > 0) {
      const newPlayers = [...players];
      const newTurns = player.fishBonusTurnsLeft - 1;
      newPlayers[idx] = {
        ...player,
        fishBonusTurnsLeft: newTurns,
        fishBonusMultiplier: newTurns > 0 ? player.fishBonusMultiplier : 1,
      };
      set({ players: newPlayers });
    }

    // 追加ターン: 同じプレイヤーがもう一度（ターン番号は進めない）
    const refreshed = get().players[idx];
    if (refreshed.extraTurn) {
      const newPlayers = [...get().players];
      newPlayers[idx] = { ...refreshed, extraTurn: false };
      set({
        players: newPlayers,
        turnPhase: 'idle',
        rouletteResult: null,
        reachableNodes: [],
        currentEvent: null,
        nodeActionsThisTurn: 0,
        boatFishingRemaining: 0,
      });
      saveGameState(get());
      return;
    }

    get().nextPlayer();
  },

  // ゲーム終了処理（永続化 + 結果画面へ）。endTurn と nextPlayer の双方から呼ばれる。
  endGame: () => {
    const { players, settings, encyclopedias } = get();
    // 図鑑は常に保存。装備・所持金は引き継ぎモード時のみ。
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.uid) {
        saveUserEncyclopedia(p.uid, encyclopedias[i]).catch(() => {});
        if (settings.carryOver !== false) {
          saveUserEquipment(p.uid, p.equipment).catch(() => {});
          saveUserMoney(p.uid, p.money).catch(() => {});
        }
      } else {
        // ゲストプレイヤーはlocalStorageに保存
        saveEncyclopedia(encyclopedias[i]);
      }
    }
    set({ gameOver: true, screen: 'result', turnPhase: 'idle' });
    clearGameState();
  },

  nextPlayer: () => {
    const { players, currentPlayerIndex, turn, settings } = get();
    const len = players.length;
    // ループ内で逐次 set せず、走査用の作業コピーを1つ作り、最後に一度だけ反映する。
    // （複数プレイヤーが同時に skipNextTurn の場合に解除が巻き戻るバグを防ぐ）
    const workingPlayers = players.map(p => ({ ...p }));

    let nextIndex = (currentPlayerIndex + 1) % len;
    let newTurn = nextIndex === 0 ? turn + 1 : turn;

    let attempts = 0;
    while (attempts < len) {
      const cand = workingPlayers[nextIndex];
      if (cand.hasFinished) {
        nextIndex = (nextIndex + 1) % len;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      if (cand.skipNextTurn) {
        cand.skipNextTurn = false; // 作業コピーに対して解除（最後にまとめて反映）
        nextIndex = (nextIndex + 1) % len;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      break;
    }

    // 最大ターン到達: ラウンドが maxTurns を超えた時点で終了（全員が同数ラウンドをプレイ済み）
    if (settings.maxTurns > 0 && newTurn > settings.maxTurns) {
      set({ players: workingPlayers });
      get().endGame();
      return;
    }

    set({
      players: workingPlayers,
      currentPlayerIndex: nextIndex,
      turn: newTurn,
      turnPhase: 'idle',
      rouletteResult: null,
      reachableNodes: [],
      currentEvent: null,
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
    });

    saveGameState(get());
  },

  setTurnPhase: (phase) => set({ turnPhase: phase }),

  resetGame: () => set({ ...initialState, encyclopedias: [loadEncyclopedia()], initialEncyclopedias: [] }),

  warpCurrentPlayerTo: (nodeId) => {
    // 開発用: 現在のプレイヤーを任意のノードへ瞬間移動。アクション選択フェーズへ進める。
    const { players, currentPlayerIndex } = get();
    if (!NODE_MAP.has(nodeId)) return;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], currentNode: nodeId };
    set({
      players: newPlayers,
      turnPhase: 'node_action',
      rouletteResult: null,
      reachableNodes: [],
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
    });
  },

  resumeGame: () => {
    const saved = loadGameState() as GameState | null;
    if (!saved) return;
    // 旧フォーマット互換: encyclopediaフィールドがある場合は変換
    const legacySaved = saved as GameState & { encyclopedia?: Record<string, boolean> };
    const encyclopedias = saved.encyclopedias
      ?? (legacySaved.encyclopedia
        ? saved.players.map(() => legacySaved.encyclopedia!)
        : saved.players.map(() => loadEncyclopedia()));
    // 再開時は現在の図鑑を初期スナップショットとする（NEW表示は新ゲームのみ）
    const initialEncyclopedias = encyclopedias.map(enc => ({ ...enc }));
    set({
      screen: 'game',
      settings: saved.settings,
      players: saved.players,
      currentPlayerIndex: saved.currentPlayerIndex,
      turn: saved.turn,
      turnPhase: saved.turnPhase,
      rouletteResult: saved.rouletteResult,
      reachableNodes: saved.reachableNodes,
      fishingState: null,
      currentEvent: null,
      gameOver: saved.gameOver,
      encyclopedias,
      initialEncyclopedias,
      nodeActionsThisTurn: saved.nodeActionsThisTurn,
      boatFishingRemaining: saved.boatFishingRemaining ?? 0,
    });
  },

  syncFromCloud: async () => {
    const savedGame = await loadGameStateAsync();
    // ゲーム中の場合、各プレイヤーのUIDに基づいてFirestoreから図鑑を同期
    const { encyclopedias, players } = get();
    const newEncyclopedias = [...encyclopedias];
    for (let i = 0; i < players.length; i++) {
      const uid = players[i]?.uid;
      if (uid) {
        try {
          const remote = await loadUserEncyclopedia(uid);
          if (remote) newEncyclopedias[i] = remote;
        } catch {
          // Firestore失敗時は既存データを維持
        }
      }
    }
    set({ encyclopedias: newEncyclopedias });
    if (savedGame) {
      saveGameState(savedGame);
    }
  },

  clearUserData: () => {
    set({ encyclopedias: [{}], players: [], gameOver: false });
    clearGameState();
  },
}));

export { MAX_FISHING_PER_TURN };

export function hasSavedGame(): boolean {
  const saved = loadGameState();
  return saved != null;
}
