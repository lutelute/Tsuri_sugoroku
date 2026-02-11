import { create } from 'zustand';
import type {
  GameState, GameScreen, TurnPhase, Player, GameSettings,
  FishingState, CaughtFish, EquipmentType,
} from '../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, REST_MONEY_BONUS, DEFAULT_MAX_TURNS } from '../game/constants';
import { calculateReachableNodes } from '../game/movement';
import { NODE_MAP } from '../data/boardNodes';
import { getRandomEventCard } from '../data/eventCards';
import { applyEvent } from '../game/events';
import { selectFish } from '../game/fishing';
import { loadEncyclopedia, saveEncyclopedia, saveGameState, loadGameState, clearGameState } from '../utils/storage';

const MAX_FISHING_PER_TURN = 3;

interface GameActions {
  setScreen: (screen: GameScreen) => void;
  startGame: (settings: GameSettings) => void;
  rollDice: (result: number) => void;
  selectPath: (pathIndex: number) => void;
  executeNodeAction: () => void;
  startFishing: () => void;
  updateFishingState: (state: Partial<FishingState>) => void;
  catchFish: (caught: CaughtFish) => void;
  failFishing: () => void;
  endFishing: () => void;
  buyEquipment: (type: EquipmentType, cost: number) => void;
  skipShop: () => void;
  applyEventCard: () => void;
  doActionAgain: () => void;
  endTurn: () => void;
  nextPlayer: () => void;
  setTurnPhase: (phase: TurnPhase) => void;
  resetGame: () => void;
  resumeGame: () => void;
}

type GameStore = GameState & GameActions;

function createInitialPlayers(settings: GameSettings): Player[] {
  return Array.from({ length: settings.playerCount }, (_, i) => ({
    id: i,
    name: settings.playerNames[i] || PLAYER_DEFAULT_NAMES[i],
    color: PLAYER_COLORS[i],
    currentNode: 'start',
    money: INITIAL_MONEY,
    equipment: { rod: 1, reel: 1, lure: 1 },
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
  settings: { playerCount: 1, playerNames: [PLAYER_DEFAULT_NAMES[0]], maxTurns: DEFAULT_MAX_TURNS },
  players: [],
  currentPlayerIndex: 0,
  turn: 1,
  turnPhase: 'idle',
  rouletteResult: null,
  reachableNodes: [],
  fishingState: null,
  currentEvent: null,
  gameOver: false,
  encyclopedia: loadEncyclopedia(),
  nodeActionsThisTurn: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),

  startGame: (settings) => {
    const players = createInitialPlayers(settings);
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
      nodeActionsThisTurn: 0,
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

    set({ players: newPlayers, turnPhase: 'node_action', nodeActionsThisTurn: 0 });
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
        set({ turnPhase: 'fishing' });
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
      case 'goal': {
        const finishedCount = players.filter(p => p.hasFinished).length;
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...player,
          hasFinished: true,
          finishOrder: finishedCount,
        };
        set({ players: newPlayers, turnPhase: 'turn_end' });
        break;
      }
      default:
        set({ turnPhase: 'action_choice' });
    }
  },

  startFishing: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node) return;

    const fish = selectFish(
      node.id,
      node.region,
      player.equipment,
      node.type === 'fishing_special',
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
      },
    });
  },

  updateFishingState: (partial) => {
    const { fishingState } = get();
    if (!fishingState) return;
    set({ fishingState: { ...fishingState, ...partial } });
  },

  catchFish: (caught) => {
    const { players, currentPlayerIndex, encyclopedia, nodeActionsThisTurn } = get();
    const player = players[currentPlayerIndex];
    const caughtWithBonus = { ...caught, bonusMultiplier: player.fishBonusMultiplier };
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      caughtFish: [...player.caughtFish, caughtWithBonus],
    };

    const newEncyclopedia = { ...encyclopedia, [caught.fishId]: true };
    saveEncyclopedia(newEncyclopedia);

    set({
      players: newPlayers,
      encyclopedia: newEncyclopedia,
      nodeActionsThisTurn: nodeActionsThisTurn + 1,
      fishingState: get().fishingState
        ? { ...get().fishingState!, phase: 'result', escaped: false }
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
    // 釣り後は action_choice へ（もう1回釣るか選べる）
    set({ fishingState: null, turnPhase: 'action_choice' });
  },

  buyEquipment: (type, cost) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...player,
      money: player.money - cost,
      equipment: { ...player.equipment, [type]: player.equipment[type] + 1 },
    };
    set({ players: newPlayers });
  },

  skipShop: () => {
    // ショップ後も action_choice へ
    set({ turnPhase: 'action_choice' });
  },

  applyEventCard: () => {
    const { players, currentPlayerIndex, currentEvent, turn } = get();
    if (!currentEvent) return;

    const player = players[currentPlayerIndex];
    const result = applyEvent(player, currentEvent, turn);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = result.player;

    set({ players: newPlayers });
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
        set({ turnPhase: 'fishing' });
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
    });

    saveGameState(get());
  },

  setTurnPhase: (phase) => set({ turnPhase: phase }),

  resetGame: () => set({ ...initialState, encyclopedia: loadEncyclopedia() }),

  resumeGame: () => {
    const saved = loadGameState() as GameState | null;
    if (!saved) return;
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
      encyclopedia: loadEncyclopedia(),
      nodeActionsThisTurn: saved.nodeActionsThisTurn,
    });
  },
}));

export { MAX_FISHING_PER_TURN };

export function hasSavedGame(): boolean {
  const saved = loadGameState();
  return saved != null;
}
