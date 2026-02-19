import { create } from 'zustand';
import type {
  GameState, GameScreen, TurnPhase, Player, GameSettings,
  FishingState, CaughtFish, EquipmentType,
} from '../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, REST_MONEY_BONUS, DEFAULT_MAX_TURNS, FISH_SELL_PRICE, BOAT_FISHING_COST, GOAL_MONEY_REWARD } from '../game/constants';
import { calculateReachableNodes } from '../game/movement';
import { NODE_MAP } from '../data/boardNodes';
import { getRandomEventCard } from '../data/eventCards';
import { applyEvent } from '../game/events';
import { selectFish } from '../game/fishing';
import { FISH_DATABASE } from '../data/fishDatabase';
import { loadEncyclopedia, saveEncyclopedia, saveGameState, loadGameState, clearGameState, loadGameStateAsync } from '../utils/storage';
import { createInitialEquipment, createEquipmentItem, applyDurabilityLoss, repairItem, isBroken } from '../game/equipment';
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
  skipShop: () => void;
  applyEventCard: () => void;
  doActionAgain: () => void;
  endTurn: () => void;
  nextPlayer: () => void;
  setTurnPhase: (phase: TurnPhase) => void;
  resetGame: () => void;
  resumeGame: () => void;
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
  nodeActionsThisTurn: 0,
  boatFishingRemaining: 0,
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

  skipShop: () => {
    // ショップ後も action_choice へ
    set({ turnPhase: 'action_choice' });
  },

  applyEventCard: () => {
    const { players, currentPlayerIndex, currentEvent, turn, encyclopedias } = get();
    if (!currentEvent) return;

    const player = players[currentPlayerIndex];
    const result = applyEvent(player, currentEvent, turn);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = result.player;

    // イベントで魚を獲得した場合は図鑑も更新
    const oldFishIds = new Set(player.caughtFish.map(f => f.fishId));
    const newFish = result.player.caughtFish.filter(f => !oldFishIds.has(f.fishId));
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
    const { players, settings } = state;

    const allFinished = players.every(p => p.hasFinished);
    const maxTurnsReached = settings.maxTurns > 0 && state.turn >= settings.maxTurns;

    if (allFinished || maxTurnsReached) {
      const { encyclopedias } = state;
      // 各プレイヤーの図鑑を保存（図鑑は常に保存。装備・所持金は引き継ぎモード時のみ）
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
      return;
    }

    const player = players[state.currentPlayerIndex];
    if (player.fishBonusTurnsLeft > 0) {
      const newPlayers = [...players];
      const newTurns = player.fishBonusTurnsLeft - 1;
      newPlayers[state.currentPlayerIndex] = {
        ...player,
        fishBonusTurnsLeft: newTurns,
        fishBonusMultiplier: newTurns > 0 ? player.fishBonusMultiplier : 1,
      };
      set({ players: newPlayers });
    }

    if (player.extraTurn) {
      const newPlayers = [...players];
      newPlayers[state.currentPlayerIndex] = { ...player, extraTurn: false };
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

  nextPlayer: () => {
    const { players, currentPlayerIndex, turn } = get();
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let newTurn = turn;

    if (nextIndex === 0) {
      newTurn = turn + 1;
    }

    let attempts = 0;
    while (attempts < players.length) {
      const nextPlayer = players[nextIndex];
      if (nextPlayer.hasFinished) {
        nextIndex = (nextIndex + 1) % players.length;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      if (nextPlayer.skipNextTurn) {
        const newPlayers = [...players];
        newPlayers[nextIndex] = { ...nextPlayer, skipNextTurn: false };
        set({ players: newPlayers });
        nextIndex = (nextIndex + 1) % players.length;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      break;
    }

    set({
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

  resetGame: () => set({ ...initialState, encyclopedias: [loadEncyclopedia()] }),

  resumeGame: () => {
    const saved = loadGameState() as GameState | null;
    if (!saved) return;
    // 旧フォーマット互換: encyclopediaフィールドがある場合は変換
    const legacySaved = saved as GameState & { encyclopedia?: Record<string, boolean> };
    const encyclopedias = saved.encyclopedias
      ?? (legacySaved.encyclopedia
        ? saved.players.map(() => legacySaved.encyclopedia!)
        : saved.players.map(() => loadEncyclopedia()));
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
      nodeActionsThisTurn: saved.nodeActionsThisTurn,
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
