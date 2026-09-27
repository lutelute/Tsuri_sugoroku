import { create } from 'zustand';
import type {
  GameState, GameScreen, TurnPhase, Player, GameSettings,
  FishingState, CaughtFish, EquipmentType, CapitalChoiceEffect, CapitalResult,
} from '../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, REST_MONEY_BONUS, DEFAULT_MAX_TURNS, FISH_SELL_PRICE, BOAT_FISHING_COST, GOAL_MONEY_REWARD, GOAL_CLOSE_ROUNDS } from '../game/constants';
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
import {
  createInitialCityState, isTown, build as cityBuildFn, upgrade as cityUpgradeFn, acquire as cityAcquireFn,
  renovate as cityRenovateFn, recordInspection, TIER_LABEL, getTownInfo,
  simulateRound, drawCityEvent, applyCityEvent, pickDestination, portFee,
  CITY_INITIAL_MONEY, CITY_START_NODE, CITY_ACTIONS_PER_VISIT, CITY_DEFAULT_MONTHS,
} from '../game/city';
import type { BuildingKind, CityReport } from '../game/city';
import type { YearEndResult } from '../game/cityAwards';
import { random } from '../utils/random';
import { CPU_STYLES, CPU_STYLE_LABEL, cpuCatchChance } from '../game/cpuAI';
import { createCaughtFish } from '../game/fishing';
import { computeYearEnd, isYearEndTurn } from '../game/cityAwards';
import { calendarLabel } from '../game/city';
import { getEquippedItem } from '../game/equipment';

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
  // ===== まちづくり =====
  cityBuild: (plotIndex: number, kind: BuildingKind) => string | null;
  cityUpgrade: (plotIndex: number) => string | null;
  cityAcquire: (plotIndex: number) => string | null;
  cityRenovate: (plotIndex: number) => string | null;
  applyCityEventCard: () => void;
  acknowledgeCityEvent: () => void;
  acknowledgeCityReport: () => void;
  acknowledgeCityYearEnd: () => void;
  dismissCityToast: () => void;
  devCityCheat: (kind: 'money' | 'simulate' | 'quake' | 'kaiju' | 'yearend') => void;
  /** CPU: ミニゲームを遊ばずに確率で1回釣る */
  cpuFish: () => void;
  /** 画面上部のお知らせ（CPU の行動報告など） */
  announce: (title: string, body: string) => void;
}

type GameStore = GameState & GameActions;

function createInitialPlayers(
  settings: GameSettings,
  savedEquipments?: (PlayerEquipment | null)[],
  savedMoneys?: (number | null)[],
): Player[] {
  const isCity = settings.mode === 'city';
  let cpuCount = 0;
  return Array.from({ length: settings.playerCount }, (_, i) => {
    const isCpu = settings.playerKinds?.[i] === 'cpu';
    const cpuStyle = isCpu ? CPU_STYLES[cpuCount++ % CPU_STYLES.length] : undefined;
    return {
    id: i,
    isCpu,
    cpuStyle,
    name: settings.playerNames[i] || (isCpu && cpuStyle ? `CPU・${CPU_STYLE_LABEL[cpuStyle]}` : PLAYER_DEFAULT_NAMES[i]),
    color: PLAYER_COLORS[i],
    uid: settings.playerUids[i] ?? undefined,
    currentNode: isCity && NODE_MAP.has(CITY_START_NODE) ? CITY_START_NODE : 'start',
    money: isCity ? CITY_INITIAL_MONEY : savedMoneys?.[i] ?? INITIAL_MONEY,
    equipment: savedEquipments?.[i] ?? createInitialEquipment(),
    caughtFish: [],
    score: 0,
    hasFinished: false,
    finishOrder: null,
    skipNextTurn: false,
    extraTurn: false,
    fishBonusMultiplier: 1,
    fishBonusTurnsLeft: 0,
    };
  });
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
  lastMove: null,
  city: null,
  cityReport: null,
  cityActionsThisTurn: 0,
  currentCityEvent: null,
  lastCityEventOutcome: null,
  cityToast: null,
  capitalDoneThisTurn: false,
  cityGoalClaims: [],
  cityYearEnd: null,
  cityTitleHistory: [],
  firstFinishTurn: null,
};

/** まちづくり: ゴール賞金（着順）。1人1回だけ */
const CITY_GOAL_REWARDS = [5000, 3000, 2000, 1000];

/** まちづくり: 中継マスの小さな道中イベント（釣り旅のカードの代わり） */
const ROAD_EVENTS: { title: string; body: string; amount: number }[] = [
  { title: '道の駅で名産を売った', body: '旅の途中で仕入れた名産が売れた', amount: 600 },
  { title: '峠の茶屋でひと休み', body: '団子代を払った', amount: -300 },
  { title: '落とし物を届けた', body: '持ち主からお礼をもらった', amount: 500 },
  { title: '通行料', body: '有料道路を通った', amount: -400 },
  { title: '観光客を案内した', body: 'ガイド料をもらった', amount: 800 },
  { title: '渋滞にはまった', body: '燃料代がかさんだ', amount: -500 },
];

/** まちづくり: ゴール到着の処理（着順賞金は1人1回。以後は記念のみ） */
function claimCityGoal(claims: number[], playerIndex: number): { claims: number[]; reward: number; order: number | null } {
  if (claims.includes(playerIndex)) return { claims, reward: 0, order: null };
  const order = claims.length;
  return { claims: [...claims, playerIndex], reward: CITY_GOAL_REWARDS[order] ?? CITY_GOAL_REWARDS[CITY_GOAL_REWARDS.length - 1], order };
}

/** 手番の切り替え時に毎回リセットする値 */
const TURN_RESET = {
  rouletteResult: null,
  reachableNodes: [] as string[][],
  currentEvent: null,
  nodeActionsThisTurn: 0,
  boatFishingRemaining: 0,
  cityActionsThisTurn: 0,
  currentCityEvent: null,
  lastCityEventOutcome: null,
  capitalDoneThisTurn: false,
};

function isCityMode(settings: GameSettings): boolean {
  return settings.mode === 'city';
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),

  startGame: (rawSettings, savedEquipments, savedMoneys, savedEncyclopedias) => {
    // まちづくりは月数（ラウンド）で決着するため無制限は不可
    const settings: GameSettings = rawSettings.mode === 'city'
      ? { ...rawSettings, maxTurns: rawSettings.maxTurns > 0 ? rawSettings.maxTurns : CITY_DEFAULT_MONTHS, carryOver: false }
      : rawSettings;
    const players = createInitialPlayers(settings, savedEquipments, savedMoneys);
    // プレイヤーごとの図鑑を初期化
    const encyclopedias = players.map((p, i) => {
      if (savedEncyclopedias?.[i] != null) return savedEncyclopedias[i]!;
      // ゲストプレイヤーはlocalStorageから読み込み、登録ユーザーは空で開始（Firestoreからロード済みのはず）
      return p.uid || p.isCpu ? {} : loadEncyclopedia();
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
      lastMove: null,
      lastCapitalResult: null,
      city: isCityMode(settings) ? createInitialCityState() : null,
      cityReport: null,
      cityActionsThisTurn: 0,
      currentCityEvent: null,
      lastCityEventOutcome: null,
      cityToast: null,
      capitalDoneThisTurn: false,
      cityGoalClaims: [],
      cityYearEnd: null,
      cityTitleHistory: [],
      firstFinishTurn: null,
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
        lastMove: { playerIndex: currentPlayerIndex, path: paths[0], seq: (get().lastMove?.seq ?? 0) + 1 },
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

    set({
      players: newPlayers,
      turnPhase: 'node_action',
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
      lastMove: { playerIndex: currentPlayerIndex, path, seq: (get().lastMove?.seq ?? 0) + 1 },
    });
  },

  executeNodeAction: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);

    if (!node) {
      set({ turnPhase: 'action_choice' });
      return;
    }

    if (isCityMode(get().settings) && get().city) {
      executeCityNodeAction(node.id);
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
        const r = random();
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
        set({ players: newPlayers, turnPhase: 'turn_end', firstFinishTurn: get().firstFinishTurn ?? get().turn });
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
    // まちづくり: 漁港の町なら水揚げ手数料（持ち主へ売上の3割（CITY_ECONOMY.portFeeRate）。市場が払うので釣り人は損しない）
    const cityState = get().city;
    if (cityState) {
      const fee = portFee(cityState, player.currentNode, totalSellPrice);
      if (fee && fee.fee > 0 && newPlayers[fee.owner]) {
        newPlayers[fee.owner] = { ...newPlayers[fee.owner], money: newPlayers[fee.owner].money + fee.fee };
      }
    }

    // 永続化（uidがあればFirestore、なければlocalStorage）
    if (player.uid) {
      saveUserEncyclopedia(player.uid, newEncyclopedia).catch(() => {});
    } else if (!player.isCpu) {
      // CPU の釣果で人のローカル図鑑を上書きしない
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
        const success = random() < successChance;

        if (success) {
          const caught: CaughtFish = { fishId: fishData.id, caughtAt: node.id, turn, size: 1.3 };
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
        ...TURN_RESET,
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
        if (settings.carryOver !== false && !isCityMode(settings)) {
          saveUserEquipment(p.uid, p.equipment).catch(() => {});
          saveUserMoney(p.uid, p.money).catch(() => {});
        }
      } else if (!p.isCpu) {
        // ゲストプレイヤーはlocalStorageに保存（CPU は保存しない）
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

    // まちづくり: ラウンド（月）が進んだら月末処理（収入・自然成長・季節の災害）
    const city = get().city;
    let cityReport: CityReport | null = null;
    let cityNext = city;
    let yearEnd: YearEndResult | null = null;
    let titleHistory = get().cityTitleHistory;
    if (city && isCityMode(settings) && newTurn > turn) {
      for (let t = turn; t < newTurn; t++) {
        const sim = simulateRound(cityNext!, workingPlayers.length, t, workingPlayers.map(p => p.money));
        sim.incomes.forEach((v, i) => {
          workingPlayers[i].money = Math.max(0, workingPlayers[i].money + v);
        });
        cityNext = sim.state;
        cityReport = sim.report;
        // 3月は年度末の大決算: 番付と称号（称号は賞金/罰金つき）
        if (isYearEndTurn(t)) {
          yearEnd = computeYearEnd(cityNext!, workingPlayers.map(p => p.money), t, CITY_INITIAL_MONEY);
          for (const title of yearEnd.titles) {
            const wp = workingPlayers[title.playerIndex];
            if (wp) wp.money = Math.max(0, wp.money + title.prize);
          }
          titleHistory = [...titleHistory, { year: yearEnd.year, titles: yearEnd.titles }];
        }
      }
    }

    // 釣り旅: 最初のゴールから GOAL_CLOSE_ROUNDS 巡たったら締め切り
    const ff = get().firstFinishTurn;
    if (!isCityMode(settings) && ff != null && newTurn > ff + GOAL_CLOSE_ROUNDS) {
      set({ players: workingPlayers });
      get().endGame();
      return;
    }

    // 最大ターン到達: ラウンドが maxTurns を超えた時点で終了（全員が同数ラウンドをプレイ済み）
    if (settings.maxTurns > 0 && newTurn > settings.maxTurns) {
      set({ players: workingPlayers, city: cityNext, cityReport, cityYearEnd: yearEnd, cityTitleHistory: titleHistory });
      get().endGame();
      return;
    }

    // 月末決算の見せ方: 年度末は大決算、災害や発展/衰退があった月だけ全画面、それ以外は上部のお知らせで流す
    const notable = !!cityReport && (
      cityReport.disasters.length > 0
      || cityReport.players.some(r => r.grown > 0 || r.declined > 0 || (r.vacated ?? 0) > 0)
      || (cityReport.tierChanges ?? []).some(c => c.to > c.from)
    );
    const phase: TurnPhase = yearEnd ? 'city_yearend' : notable ? 'city_report' : 'idle';
    set({
      players: workingPlayers,
      currentPlayerIndex: nextIndex,
      turn: newTurn,
      turnPhase: phase,
      ...TURN_RESET,
      city: cityNext,
      cityReport,
      cityYearEnd: yearEnd,
      cityTitleHistory: titleHistory,
    });
    const ups = (cityReport?.tierChanges ?? []).filter(c => c.to > c.from);
    if (ups.length && (notable || yearEnd)) {
      // 決算画面の見出しにも出るが、地図に戻ったときに分かるよう短く知らせる
      get().announce('町が発展した', ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・'));
    }
    if (cityReport && !notable && !yearEnd) {
      const cal = calendarLabel(cityReport.turn);
      const summary = cityReport.players
        .map((r, i) => `${workingPlayers[i]?.name} ${r.net >= 0 ? '+' : '−'}¥${Math.abs(r.net).toLocaleString()}`)
        .join(' ／ ');
      const upText = ups.length ? ` ／ ${ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・')}` : '';
      get().announce(`${cal.month}月の決算`, summary + upText);
    }

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
      cityActionsThisTurn: 0,
      capitalDoneThisTurn: false,
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
      lastMove: null,
      city: saved.city ?? null,
      cityReport: saved.cityReport ?? null,
      cityActionsThisTurn: saved.cityActionsThisTurn ?? 0,
      currentCityEvent: saved.currentCityEvent ?? null,
      lastCityEventOutcome: null,
      cityToast: null,
      capitalDoneThisTurn: saved.capitalDoneThisTurn ?? false,
      cityGoalClaims: saved.cityGoalClaims ?? [],
      cityYearEnd: saved.cityYearEnd ?? null,
      cityTitleHistory: saved.cityTitleHistory ?? [],
      firstFinishTurn: saved.firstFinishTurn ?? null,
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

  // ===== まちづくり =====

  cityBuild: (plotIndex, kind) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn, turn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityBuildFn(city, player.currentNode, plotIndex, kind, currentPlayerIndex, player.money, turn);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    return null;
  },

  cityUpgrade: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityUpgradeFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    return null;
  },

  cityAcquire: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityAcquireFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    if (r.prevOwner !== undefined && newPlayers[r.prevOwner]) {
      newPlayers[r.prevOwner] = { ...newPlayers[r.prevOwner], money: newPlayers[r.prevOwner].money + r.cost };
    }
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    return null;
  },

  cityRenovate: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityRenovateFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    return null;
  },

  applyCityEventCard: () => {
    const { city, currentCityEvent, players, currentPlayerIndex, turn } = get();
    if (!city || !currentCityEvent) return;
    const player = players[currentPlayerIndex];
    const out = applyCityEvent(city, currentCityEvent, currentPlayerIndex, player.currentNode, turn);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: Math.max(0, player.money + out.moneyDelta) };
    set({ city: out.state, players: newPlayers, lastCityEventOutcome: { message: out.message, moneyDelta: out.moneyDelta, disaster: out.disaster } });
  },

  acknowledgeCityEvent: () => {
    const { players, currentPlayerIndex } = get();
    const node = NODE_MAP.get(players[currentPlayerIndex].currentNode);
    set({ currentCityEvent: null, lastCityEventOutcome: null, turnPhase: isTown(node) ? 'city' : 'action_choice' });
  },

  acknowledgeCityReport: () => {
    set({ turnPhase: 'idle' });
  },

  acknowledgeCityYearEnd: () => {
    set({ turnPhase: 'idle', cityYearEnd: null });
  },

  dismissCityToast: () => set({ cityToast: null }),

  announce: (title, body) => {
    set({ cityToast: { title, body, seq: (get().cityToast?.seq ?? 0) + 1 } });
  },

  cpuFish: () => {
    const { players, currentPlayerIndex, turn } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node || !getEquippedItem(player.equipment, 'rod')) {
      set({ turnPhase: 'action_choice' });
      return;
    }
    const fish = selectFish(node.id, node.region, player.equipment, node.type === 'fishing_special', false);
    const ok = random() < cpuCatchChance(player, fish);
    if (ok) {
      const caught = createCaughtFish(fish.id, node.id, turn, player.equipment);
      get().catchFish(caught);
      const price = Math.round((FISH_SELL_PRICE[fish.rarity] ?? 200) * caught.size);
      get().announce(`${player.name}：${fish.name}を釣った`, `${node.name}で${caught.size >= 1.5 ? '大物の' : ''}${fish.name}（¥${price.toLocaleString()}）`);
    } else {
      get().failFishing();
      get().announce(`${player.name}：逃げられた`, `${node.name}で${fish.name}に糸を切られた`);
    }
    get().degradeEquipment();
    set({ fishingState: null, turnPhase: 'action_choice' });
  },

  devCityCheat: (kind) => {
    const { city, players, currentPlayerIndex, turn } = get();
    if (!city) return;
    if (kind === 'money') {
      const newPlayers = [...players];
      newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], money: newPlayers[currentPlayerIndex].money + 50000 };
      set({ players: newPlayers });
    } else if (kind === 'yearend') {
      const ye = computeYearEnd(city, players.map(p => p.money), turn, CITY_INITIAL_MONEY);
      set({ cityYearEnd: ye, turnPhase: 'city_yearend' });
    } else if (kind === 'simulate') {
      const sim = simulateRound(city, players.length, turn, players.map(p => p.money));
      set({
        city: sim.state,
        cityReport: sim.report,
        players: players.map((p, i) => ({ ...p, money: Math.max(0, p.money + sim.incomes[i]) })),
        turnPhase: 'city_report',
      });
    } else {
      const card = drawCityEvent('bad');
      const forced = { ...card, id: `dev_${kind}`, name: kind === 'quake' ? '大鯰が暴れた' : '大王イカ上陸', description: '（DEV）災害を発生させた', effect: { kind: 'disaster' as const, disaster: kind } };
      set({ currentCityEvent: forced, lastCityEventOutcome: null, turnPhase: 'city_event' });
    }
  },
}));

// ===== まちづくり: マス到着時の処理 =====
function executeCityNodeAction(nodeId: string) {
  const store = useGameStore;
  const st = store.getState();
  const { players, currentPlayerIndex, city } = st;
  if (!city) return;
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(nodeId)!;
  const newPlayers = [...players];
  const p = { ...player };
  let nextCity = city;
  let toast: { title: string; body: string } | null = null;

  // 目的地に一番乗り → 賞金 + 次の目的地
  if (city.destination === nodeId) {
    p.money += city.destinationReward;
    const nd = pickDestination(nodeId, nodeId);
    const nextName = NODE_MAP.get(nd.nodeId)?.name ?? '';
    toast = { title: `目的地「${node.name}」に一番乗り！`, body: `賞金 ¥${city.destinationReward.toLocaleString()} 獲得。次の目的地は「${nextName}」（¥${nd.reward.toLocaleString()}）` };
    nextCity = { ...city, destination: nd.nodeId, destinationReward: nd.reward };
  }

  // 視察: 自分の建物がある町に止まると、次の月末にその町の自分の建物が発展しやすくなる
  const insp = recordInspection(nextCity, nodeId, currentPlayerIndex);
  if (insp.inspected && insp.state !== nextCity) {
    nextCity = insp.state;
    toast = toast ?? { title: `${node.name}を視察`, body: '次の月末、この町のあなたの建物は発展しやすくなる' };
  }

  let phase: TurnPhase = 'action_choice';
  const currentEvent = null;
  let currentCityEvent = null;
  let goalClaims = st.cityGoalClaims;

  switch (node.type) {
    case 'event_good':
    case 'event_bad':
    case 'event_random': {
      // 村マスでは必ず「まちの出来事」（釣り旅のカードは混ぜない）
      const kind = node.type === 'event_good' ? 'good' : node.type === 'event_bad' ? 'bad' : 'random';
      currentCityEvent = drawCityEvent(kind);
      phase = 'city_event';
      break;
    }
    case 'route': {
      // 中継マス: 3割で小さな道中イベント
      if (random() < 0.3) {
        const ev = ROAD_EVENTS[Math.floor(random() * ROAD_EVENTS.length)];
        p.money = Math.max(0, p.money + ev.amount);
        toast = toast ?? { title: `道中: ${ev.title}`, body: `${ev.body}（${ev.amount >= 0 ? '+' : '−'}¥${Math.abs(ev.amount).toLocaleString()}）` };
      }
      break;
    }
    case 'rest':
      p.money += REST_MONEY_BONUS;
      phase = 'city';
      break;
    case 'goal': {
      const g = claimCityGoal(st.cityGoalClaims, currentPlayerIndex);
      goalClaims = g.claims;
      p.money += g.reward;
      toast = toast ?? (g.order !== null
        ? { title: `南の果てに${g.order + 1}番目に到達！`, body: `着順賞金 ¥${g.reward.toLocaleString()}（賞金は1人1回）。まちづくりはまだまだ続く` }
        : { title: '南の果てに再訪', body: 'ゴール賞金はもう受け取り済み。町へ戻って稼ごう' });
      break;
    }
    case 'start':
      phase = 'shop';
      break;
    default:
      phase = isTown(node) ? 'city' : 'action_choice';
  }

  newPlayers[currentPlayerIndex] = p;
  store.setState({
    players: newPlayers,
    city: nextCity,
    turnPhase: phase,
    currentEvent,
    currentCityEvent,
    lastCityEventOutcome: null,
    cityToast: toast ? { ...toast, seq: (st.cityToast?.seq ?? 0) + 1 } : st.cityToast,
    cityGoalClaims: goalClaims,
  });
}

export { MAX_FISHING_PER_TURN };

export function hasSavedGame(): boolean {
  const saved = loadGameState();
  return saved != null;
}
