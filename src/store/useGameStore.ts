import { create } from 'zustand';
import type {
  GameState, GameScreen, TurnPhase, Player, GameSettings,
  FishingState, CaughtFish, EquipmentType, CapitalChoiceEffect, CapitalResult,
} from '../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, REST_MONEY_BONUS, DEFAULT_MAX_TURNS, FISH_SELL_PRICE, BOAT_FISHING_COST, GOAL_MONEY_REWARD } from '../game/constants';
import { fishingLastTurn } from '../game/deadline';
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
  renovate as cityRenovateFn, recordInspection, TIER_LABEL, getTownInfo, startBoom, visitorFees, CITY_ECONOMY, plotValue,
  simulateRound, drawCityEvent, applyCityEvent, pickDestination, portFee,
  CITY_INITIAL_MONEY, CITY_START_NODE, CITY_ACTIONS_PER_VISIT, CITY_DEFAULT_MONTHS,
} from '../game/city';
import type { BuildingKind, CityReport, CityState } from '../game/city';
import type { YearEndResult } from '../game/cityAwards';
import { random } from '../utils/random';
import { CPU_STYLES, CPU_STYLE_LABEL, cpuCatchChance } from '../game/cpuAI';
import { createCaughtFish } from '../game/fishing';
import { computeYearEnd, isYearEndTurn } from '../game/cityAwards';
import {
  createCardState, drawCard, addCard, buyCard, playCard, diceCap, tickSlow, consumeLandGrab, landGrabPrice,
  pickWarpDestination, emptyPlotIndex, suggestFreeBuildKind, freeBuild, protectInsured,
  CARD_DROP_VILLAGE, CARD_DROP_ROUTE, CARD_INFO,
} from '../game/cityCards';
import type { CityCardId, CardState } from '../game/cityCards';
import { attachOnDestination, transferOnMove, tickMonth, binboMischief, isGreat, becameGreat } from '../game/binbo';
import { buySpecialty } from '../game/citySpecialties';
import type { CityDisasterReport } from '../game/city';
import { calendarLabel } from '../game/city';
import { getEquippedItem } from '../game/equipment';
import { pushNotice, isNotableMonth, showBinboFullScreen } from '../game/tempo';
import type { Notice } from '../game/tempo';

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
  /** fishId: 魚イベントで戦った魚。手に入れた魚と結果の文を返す */
  applyEventCard: (fishId?: string) => { message: string; gained: CaughtFish[] } | null;
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
  /** まちづくり: 手札のカードを使う（牛歩は target に相手の番号） */
  playCityCard: (index: number, target?: number) => string | null;
  /** まちづくり: カード売り場で買う */
  buyCityCard: (id: CityCardId) => string | null;
  /** まちづくり: 今いる町の名産を買う（他人のものは買収）。県庁と、名物で知られる町に名産がある */
  cityBuySpecialty: () => string | null;
  dismissBinboToast: () => void;
  acknowledgeBinboEvent: () => void;
  applyCityEventCard: () => void;
  acknowledgeCityEvent: () => void;
  acknowledgeCityReport: () => void;
  acknowledgeCityYearEnd: () => void;
  dismissCityToast: () => void;
  /** 月末の全画面（決算・年度末・貧乏神の悪さ）をまとめて閉じる。貧乏神の悪さは上部のお知らせに回す */
  skipMonthEnd: () => void;
  devCityCheat: (kind: 'money' | 'simulate' | 'quake' | 'kaiju' | 'yearend' | 'cards' | 'binbo' | 'binboAct' | 'dest') => void;
  /** CPU: ミニゲームを遊ばずに確率で1回釣る */
  cpuFish: () => void;
  /** 画面上部のお知らせ（CPU の行動報告など） */
  announce: (title: string, body: string) => void;
}

/** お知らせ（瓦版・貧乏神）の順番待ち。見せている1件は cityToast / cityBinboToast */
interface NoticeState {
  noticeQueue: Notice[];
}

type GameStore = GameState & NoticeState & GameActions;

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
  cityBonusActions: 0,
  cityCards: null,
  pendingDiceCount: 1,
  pendingDiceCap: null,
  cityBinboToast: null,
  cityBinboEvent: null,
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

/** まちづくり: 災害の前後で保険を効かせる（保険に入っている人の壊れた建物を元に戻す） */
function applyInsurance(
  before: CityState, after: CityState, disasters: CityDisasterReport[], cards: CardState | null,
): { city: CityState; disasters: CityDisasterReport[]; cards: CardState | null; protectedPlayers: number[] } {
  if (!cards || !disasters.length) return { city: after, disasters, cards, protectedPlayers: [] };
  let city = after;
  let cs = cards;
  const out: CityDisasterReport[] = [];
  const saved: number[] = [];
  for (const d of disasters) {
    const r = protectInsured(before, city, d, cs);
    city = r.city;
    cs = r.cs;
    out.push(r.report);
    saved.push(...r.protectedPlayers);
  }
  return { city, disasters: out, cards: cs, protectedPlayers: [...new Set(saved)] };
}

/** お知らせの通し番号（表示の key と演出のやり直しに使う。閉じても戻さない） */
let noticeSeq = 0;

/** お知らせ1件を「見せている」状態にする差分 */
function showNotice(n: Notice): Partial<GameStore> {
  noticeSeq++;
  if (n.kind === 'city') return { cityToast: { title: n.title, body: n.body, seq: noticeSeq } };
  return { cityBinboToast: { reason: n.reason, playerIndex: n.playerIndex, fromIndex: n.fromIndex, great: n.great, seq: noticeSeq } };
}

/** お知らせを出す。何も出ていなければすぐ出し、出ていれば順番待ちに積む（重ねて出さない・上書きしない） */
function queueNotice(n: Notice) {
  const st = useGameStore.getState();
  if (!st.cityToast && !st.cityBinboToast && st.noticeQueue.length === 0) {
    useGameStore.setState(showNotice(n));
  } else if (n.kind === 'city' && st.cityToast?.title === n.title && st.noticeQueue.length === 0) {
    // いま見せている瓦版と同じ見出し（CPU が同じ町で続けて建てた等）は、本文をつないで見せ続ける
    if (!st.cityToast.body.split('／').includes(n.body)) useGameStore.setState({ cityToast: { ...st.cityToast, body: `${st.cityToast.body}／${n.body}` } });
  } else {
    useGameStore.setState({ noticeQueue: pushNotice(st.noticeQueue, n) });
  }
}

/** 見せていたお知らせを閉じ（cleared）、何も出ていなければ順番待ちの先頭を出す */
function nextNotice(st: GameStore, cleared: Partial<GameStore>): Partial<GameStore> {
  const after = { ...st, ...cleared };
  if (after.cityToast || after.cityBinboToast) return cleared;
  const [head, ...rest] = st.noticeQueue;
  return head ? { ...cleared, ...showNotice(head), noticeQueue: rest } : cleared;
}

/** 貧乏神の月末の悪さを上部のお知らせで流すときの文面 */
function binboNotice(ev: NonNullable<GameState['cityBinboEvent']>, players: Player[], important = false): Notice {
  return { kind: 'city', title: `${ev.great ? '大貧乏神' : '貧乏神'}の悪さ（${players[ev.playerIndex]?.name ?? ''}）`, body: ev.message, important };
}

/** まちづくり: 移動経路が決まったら、貧乏神が他の駒へ移るかを判定する */
function binboAfterMove(path: string[]) {
  const st = useGameStore.getState();
  const city = st.city;
  if (!city?.binbo || city.binbo.playerIndex === null || st.settings.mode !== 'city') return;
  const r = transferOnMove(city.binbo, st.currentPlayerIndex, path, st.players.map(p => p.currentNode));
  if (r.to === null) return;
  useGameStore.setState({ city: { ...city, binbo: r.binbo } });
  queueNotice({ kind: 'binbo', reason: 'pass', playerIndex: r.to, fromIndex: st.currentPlayerIndex, great: isGreat(r.binbo) });
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
  cityBonusActions: 0,
  pendingDiceCount: 1,
  pendingDiceCap: null as number | null,
};

function isCityMode(settings: GameSettings): boolean {
  return settings.mode === 'city';
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  noticeQueue: [],

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
      cityBonusActions: 0,
      cityCards: isCityMode(settings) ? createCardState(players.length) : null,
      pendingDiceCount: 1,
      pendingDiceCap: null,
      cityBinboToast: null,
      cityBinboEvent: null,
      noticeQueue: [],
    });
  },

  rollDice: (result) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    // まちづくり: 目的地は通過中でも止まれる
    const city = get().city;
    const stops = isCityMode(get().settings) && city?.destination ? [city.destination] : [];
    const paths = calculateReachableNodes(player.currentNode, result, stops);

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
      binboAfterMove(paths[0]);
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
    binboAfterMove(path);
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
        ? { ...get().fishingState!, phase: 'result', escaped: false, tairyouCount: bonusFish?.length ?? 0, tairyouFishIds: (bonusFish ?? []).map(f => f.fishId) }
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
      binboAfterMove([prevNode, updatedPlayer.currentNode]);
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
      const cards = get().cityCards ? tickSlow(get().cityCards!, idx) : null;
      set({
        players: newPlayers,
        turnPhase: 'idle',
        ...TURN_RESET,
        cityCards: cards,
        pendingDiceCap: cards ? diceCap(cards, idx) : null,
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
    // カード: 手番を終えた人の牛歩を1つ減らす
    let cards = get().cityCards ? tickSlow(get().cityCards!, currentPlayerIndex) : null;
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
    let binboEvent: GameState['cityBinboEvent'] = null;
    let binboBecame = false;
    if (city && isCityMode(settings) && newTurn > turn) {
      for (let t = turn; t < newTurn; t++) {
        const before = cityNext!;
        const sim = simulateRound(before, workingPlayers.length, t, workingPlayers.map(p => p.money));
        sim.incomes.forEach((v, i) => {
          workingPlayers[i].money = Math.max(0, workingPlayers[i].money + v);
        });
        // 保険: 季節の災害で壊れた建物を守る
        const ins = applyInsurance(before, sim.state, sim.report.disasters, cards);
        cards = ins.cards;
        cityNext = ins.city;
        cityReport = { ...sim.report, disasters: ins.disasters };
        if (ins.protectedPlayers.length) {
          cityReport = { ...cityReport, headlines: [...cityReport.headlines, `保険で守られた: ${ins.protectedPlayers.map(i => workingPlayers[i]?.name).join('・')}`] };
        }
        // 貧乏神: 月を数え（12か月で大貧乏神）、とりついた人に悪さをする
        const prevB = cityNext?.binbo;
        if (cityNext && prevB && prevB.playerIndex !== null) {
          const b = tickMonth(prevB);
          const who = b.playerIndex!;
          const mm = binboMischief(b, { ...cityNext, binbo: b }, who, workingPlayers.map(p => p.money), workingPlayers.map(p => p.name));
          mm.moneyDeltas.forEach((d, i) => {
            if (workingPlayers[i]) workingPlayers[i].money = Math.max(0, workingPlayers[i].money + d);
          });
          cityNext = { ...mm.city, binbo: b };
          const became = becameGreat(prevB, b);
          if (mm.kind !== 'none' || became) {
            // 月が2つ以上進んでも、見せる悪さ（最後の月）が化けた月のものかで寸劇にするかを決める
            binboBecame = became;
            binboEvent = { playerIndex: who, kind: mm.kind, message: became ? `貧乏神が大貧乏神に化けた！ ${mm.message}` : mm.message, great: isGreat(b), moneyDelta: mm.moneyDeltas[who] ?? 0, giveTo: mm.giveTo };
          }
        }
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

    // 釣り旅: 最初のゴールから GOAL_CLOSE_ROUNDS 巡たったら締め切り（MIN_CLOSE_TURN 巡目より前には来ない）
    const ff = get().firstFinishTurn;
    if (!isCityMode(settings) && ff != null && newTurn > fishingLastTurn(ff, settings.maxTurns)) {
      set({ players: workingPlayers });
      get().endGame();
      return;
    }

    // 最大ターン到達: ラウンドが maxTurns を超えた時点で終了（全員が同数ラウンドをプレイ済み）
    if (settings.maxTurns > 0 && newTurn > settings.maxTurns) {
      set({ players: workingPlayers, city: cityNext, cityReport, cityYearEnd: yearEnd, cityTitleHistory: titleHistory, cityCards: cards });
      get().endGame();
      return;
    }

    // 月末決算の見せ方: 年度末は大決算、災害で壊れた建物がある月と人の建物が衰退・空き家になった月だけ全画面、
    // それ以外（成長・発展度の上昇だけ）は上部のお知らせで流す（tempo.ts の isNotableMonth）
    const humans = workingPlayers.map((p, i) => (p.isCpu ? -1 : i)).filter(i => i >= 0);
    const notable = isNotableMonth(cityReport, humans);
    // 貧乏神の悪さ: 人がとりつかれた月・大貧乏神に化けた月は寸劇、CPU の普通の月はお知らせで流す
    const binboFull = !!binboEvent && showBinboFullScreen(!!workingPlayers[binboEvent.playerIndex]?.isCpu, binboBecame, humans.length > 0);
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
      cityCards: cards,
      pendingDiceCap: cards ? diceCap(cards, nextIndex) : null,
      cityBinboEvent: binboFull ? binboEvent : get().cityBinboEvent,
    });
    const ups = (cityReport?.tierChanges ?? []).filter(c => c.to > c.from);
    if (ups.length && (notable || yearEnd)) {
      // 決算画面の見出しにも出るが、地図に戻ったときに分かるよう短く知らせる
      get().announce('町が発展した', ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・'));
    }
    // 全画面の決算を出さない月（年度末の3月は大決算が決算の代わり）は、月の決算を上部のお知らせで流す。
    // 成長（▲）・衰退（▼）・空き家と災害もここで分かるようにする
    if (cityReport && (!notable || yearEnd)) {
      const cal = calendarLabel(cityReport.turn);
      const summary = cityReport.players
        .map((r, i) => `${workingPlayers[i]?.name} ${r.net >= 0 ? '+' : '−'}¥${Math.abs(r.net).toLocaleString()}${r.grown > 0 ? ` ▲${r.grown}` : ''}${r.declined > 0 ? ` ▼${r.declined}` : ''}${(r.vacated ?? 0) > 0 ? ` 空${r.vacated}` : ''}`)
        .join(' ／ ');
      const upText = ups.length && !yearEnd ? ` ／ ${ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・')}` : '';
      const disasterText = cityReport.disasters.length
        ? ` ／ ${cityReport.disasters.map(d => `${d.title}（${d.damages.length ? `${d.damages.length}軒に被害` : '被害なし'}）`).join('・')}`
        : '';
      get().announce(`${cal.month}月の決算`, summary + upText + disasterText);
    }
    if (binboEvent && !binboFull) queueNotice(binboNotice(binboEvent, workingPlayers));

    saveGameState(get());
  },

  setTurnPhase: (phase) => set({ turnPhase: phase }),

  resetGame: () => set({ ...initialState, noticeQueue: [], encyclopedias: [loadEncyclopedia()], initialEncyclopedias: [] }),

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
      cityBonusActions: 0,
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
      cityBonusActions: saved.cityBonusActions ?? 0,
      cityCards: saved.cityCards ?? (saved.city ? createCardState(saved.players.length) : null),
      pendingDiceCount: saved.pendingDiceCount ?? 1,
      pendingDiceCap: saved.pendingDiceCap ?? null,
      cityBinboToast: null,
      cityBinboEvent: saved.cityBinboEvent ?? null,
      noticeQueue: [],
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
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
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
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
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
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    // 地上げ: 有効なら買収価格が価値の1.1倍になる
    let cards = get().cityCards;
    const town = city.towns[player.currentNode];
    const plot = town?.plots[plotIndex];
    let price: number | null = null;
    if (cards && plot && plot.owner !== currentPlayerIndex) {
      const lg = consumeLandGrab(cards, currentPlayerIndex);
      if (lg.used) {
        price = landGrabPrice(plotValue(plot, player.currentNode, town));
        if (player.money < price) return 'お金が足りない';
        cards = lg.cs;
      }
    }
    const r = cityAcquireFn(city, player.currentNode, plotIndex, currentPlayerIndex, price !== null ? Infinity : player.money);
    if (!r.ok) return r.reason;
    const cost = price ?? r.cost;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - cost };
    if (r.prevOwner !== undefined && newPlayers[r.prevOwner]) {
      newPlayers[r.prevOwner] = { ...newPlayers[r.prevOwner], money: newPlayers[r.prevOwner].money + cost };
    }
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1, cityCards: cards });
    return null;
  },

  cityRenovate: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityRenovateFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    return null;
  },

  playCityCard: (index, target) => {
    const st = get();
    const cards = st.cityCards;
    if (!cards || !st.city) return 'まちづくりモードではない';
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const timing = st.turnPhase === 'idle' ? 'before_roll' : st.turnPhase === 'city' ? 'in_town' : null;
    if (!timing) return '今はカードを使えない';
    const r = playCard(cards, pi, index, target, {
      timing,
      hasEmptyPlot: emptyPlotIndex(st.city, player.currentNode) >= 0,
      pendingDice: st.pendingDiceCount,
    });
    if ('error' in r) return r.error;
    const e = r.effect;
    const name = CARD_INFO[r.card].name;
    switch (e.kind) {
      case 'dice':
        set({ cityCards: r.cs, pendingDiceCount: e.count });
        break;
      case 'warp': {
        const dest = pickWarpDestination(player.currentNode);
        const newPlayers = [...st.players];
        newPlayers[pi] = { ...player, currentNode: dest };
        set({
          cityCards: r.cs,
          players: newPlayers,
          turnPhase: 'node_action',
          lastMove: { playerIndex: pi, path: [player.currentNode, dest], seq: (st.lastMove?.seq ?? 0) + 1 },
        });
        binboAfterMove([player.currentNode, dest]);
        break;
      }
      case 'slow':
      case 'land_grab':
      case 'insurance':
        set({ cityCards: r.cs });
        break;
      case 'build_bonus':
        set({ cityCards: r.cs, cityBonusActions: st.cityBonusActions + e.extra });
        break;
      case 'free_build': {
        const idx = emptyPlotIndex(st.city, player.currentNode);
        const kind = idx >= 0 ? suggestFreeBuildKind(st.city, player.currentNode, idx) : null;
        if (idx < 0 || !kind) return '空き区画がない';
        const b = freeBuild(st.city, player.currentNode, idx, kind, pi, st.turn);
        if (!b.ok) return b.reason;
        set({ cityCards: r.cs, city: b.state });
        break;
      }
    }
    get().announce(`${player.name}：${name}`, r.message);
    return null;
  },

  buyCityCard: (id) => {
    const st = get();
    if (!st.cityCards) return 'まちづくりモードではない';
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = buyCard(st.cityCards, pi, id, player.money);
    if ('error' in r) return r.error;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    set({ cityCards: r.cs, players: newPlayers });
    return null;
  },

  cityBuySpecialty: () => {
    const st = get();
    if (!st.city) return 'まちづくりモードではない';
    if (st.cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + st.cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + st.cityBonusActions}回まで`;
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = buySpecialty(st.city.specialties, player.currentNode, pi, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    if (r.prevOwner !== undefined && newPlayers[r.prevOwner]) {
      newPlayers[r.prevOwner] = { ...newPlayers[r.prevOwner], money: newPlayers[r.prevOwner].money + r.cost };
    }
    set({ city: { ...st.city, specialties: { ...r.owners } }, players: newPlayers, cityActionsThisTurn: st.cityActionsThisTurn + 1 });
    get().announce(r.monopolyFormed ? `${player.name}：地方独占！` : `${player.name}：名産を手に入れた`, r.message);
    return null;
  },

  dismissBinboToast: () => set(st => nextNotice(st, { cityBinboToast: null })),
  acknowledgeBinboEvent: () => set({ cityBinboEvent: null }),

  applyCityEventCard: () => {
    const { city, currentCityEvent, players, currentPlayerIndex, turn } = get();
    if (!city || !currentCityEvent) return;
    const player = players[currentPlayerIndex];
    const out = applyCityEvent(city, currentCityEvent, currentPlayerIndex, player.currentNode, turn);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: Math.max(0, player.money + out.moneyDelta) };
    // 保険: まちの出来事の災害で壊れた建物を守る
    const ins = applyInsurance(city, out.state, out.disaster ? [out.disaster] : [], get().cityCards);
    const saved = ins.protectedPlayers.map(i => players[i]?.name).filter(Boolean);
    const message = saved.length ? `${out.message}（保険で守られた: ${saved.join('・')}）` : out.message;
    set({
      city: ins.city,
      players: newPlayers,
      cityCards: ins.cards,
      lastCityEventOutcome: { message, moneyDelta: out.moneyDelta, disaster: ins.disasters[0] ?? out.disaster },
    });
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

  dismissCityToast: () => set(st => nextNotice(st, { cityToast: null })),

  skipMonthEnd: () => {
    const st = get();
    const ev = st.cityBinboEvent;
    const phase = st.turnPhase;
    set({
      cityBinboEvent: null,
      ...(phase === 'city_report' || phase === 'city_yearend' ? { turnPhase: 'idle' as TurnPhase } : {}),
      ...(phase === 'city_yearend' ? { cityYearEnd: null } : {}),
    });
    if (ev) queueNotice(binboNotice(ev, st.players, true));
  },

  announce: (title, body) => queueNotice({ kind: 'city', title, body }),

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
    } else if (kind === 'cards') {
      let cs = get().cityCards;
      if (!cs) return;
      for (const id of ['kyuko', 'gyuho', 'kojiken', 'hoken'] as CityCardId[]) cs = addCard(cs, currentPlayerIndex, id).cs;
      set({ cityCards: cs });
    } else if (kind === 'binbo') {
      set({ city: { ...city, binbo: { playerIndex: currentPlayerIndex, months: 11 } } });
    } else if (kind === 'binboAct') {
      // 月末を待たずに、とりついている人へ悪さをさせる（確かめ用。とりついていなければ手番の人につける）
      const b = city.binbo && city.binbo.playerIndex !== null ? city.binbo : { playerIndex: currentPlayerIndex, months: 0 };
      const who = b.playerIndex!;
      const mm = binboMischief(b, { ...city, binbo: b }, who, players.map(p => p.money), players.map(p => p.name));
      set({
        city: { ...mm.city, binbo: b },
        players: players.map((p, i) => ({ ...p, money: Math.max(0, p.money + (mm.moneyDeltas[i] ?? 0)) })),
        cityBinboEvent: { playerIndex: who, kind: mm.kind, message: mm.message, great: isGreat(b), moneyDelta: mm.moneyDeltas[who] ?? 0, giveTo: mm.giveTo },
      });
    } else if (kind === 'dest') {
      if (city.destination) get().warpCurrentPlayerTo(city.destination);
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
  // この到着で起きたことは全部お知らせの順番待ちに積む（人の手番のものは溢れても捨てない）
  const notices: Notice[] = [];
  // 見出しには誰の話かを付ける（CPU の手番や、何人かで遊ぶときに取り違えないように）
  const say = (title: string, body: string) => notices.push({ kind: 'city', title: `${player.name}：${title}`, body, important: !player.isCpu });

  // 目的地に一番乗り → 賞金 + 次の目的地
  let bonusActions = st.cityBonusActions;
  if (city.destination === nodeId) {
    p.money += city.destinationReward;
    const nd = pickDestination(nodeId, nodeId, st.turn);
    const nextName = NODE_MAP.get(nd.nodeId)?.name ?? '';
    say(`目的地「${node.name}」に一番乗り！`, `賞金 ¥${city.destinationReward.toLocaleString()} 獲得。この町に特需が起き、工事が1回多くできる。次の目的地は「${nextName}」（¥${nd.reward.toLocaleString()}）`);
    nextCity = startBoom({ ...city, destination: nd.nodeId, destinationReward: nd.reward }, nodeId);
    bonusActions += CITY_ECONOMY.destinationBonusActions;
    // 貧乏神: 目的地から一番遠い人にとりつく（1人プレイでは出ない）
    const prevB = nextCity.binbo;
    const nb = attachOnDestination(prevB, currentPlayerIndex, players.map(pl => pl.currentNode), nodeId, players.length, players.map(pl => pl.money));
    nextCity = { ...nextCity, binbo: nb };
    if (nb.playerIndex !== null && nb.playerIndex !== (prevB?.playerIndex ?? null)) {
      notices.push({ kind: 'binbo', reason: 'destination', playerIndex: nb.playerIndex, great: isGreat(nb) });
    }
  }

  // 客としての買い物代: 他人の商業地・観光名所に払う（持ち主の収入になる）
  const fees = visitorFees(nextCity, nodeId, currentPlayerIndex, p.money);
  if (fees.total > 0) {
    p.money = Math.max(0, p.money - fees.total);
    for (const pay of fees.payments) {
      if (newPlayers[pay.owner] && pay.owner !== currentPlayerIndex) {
        newPlayers[pay.owner] = { ...newPlayers[pay.owner], money: newPlayers[pay.owner].money + pay.amount };
      }
    }
    const who = fees.payments.map(x => players[x.owner]?.name).filter(Boolean).join('・');
    say(`${node.name}で買い物`, `¥${fees.total.toLocaleString()} を${who}の店へ（他人の商業地・観光名所がある町）`);
  }

  // 視察: 自分の建物がある町に止まると、次の月末にその町の自分の建物が発展しやすくなる
  const insp = recordInspection(nextCity, nodeId, currentPlayerIndex);
  if (insp.inspected && insp.state !== nextCity) {
    nextCity = insp.state;
    say(`${node.name}を視察`, `次の月末、この町の${player.name}の建物は発展しやすくなる`);
  }

  let phase: TurnPhase = 'action_choice';
  const currentEvent = null;
  let currentCityEvent = null;
  let goalClaims = st.cityGoalClaims;
  let cards = st.cityCards;
  let cardDrawn = false;

  switch (node.type) {
    case 'event_good':
    case 'event_bad':
    case 'event_random': {
      // 村マスでは必ず「まちの出来事」（釣り旅のカードは混ぜない）
      const kind = node.type === 'event_good' ? 'good' : node.type === 'event_bad' ? 'bad' : 'random';
      currentCityEvent = drawCityEvent(kind);
      phase = 'city_event';
      if (cards && random() < CARD_DROP_VILLAGE) cardDrawn = true;
      break;
    }
    case 'route': {
      // 中継マス: 3割で小さな道中イベント
      if (cards && random() < CARD_DROP_ROUTE) cardDrawn = true;
      if (random() < 0.3) {
        const ev = ROAD_EVENTS[Math.floor(random() * ROAD_EVENTS.length)];
        p.money = Math.max(0, p.money + ev.amount);
        say(`道中: ${ev.title}`, `${ev.body}（${ev.amount >= 0 ? '+' : '−'}¥${Math.abs(ev.amount).toLocaleString()}）`);
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
      if (g.order !== null) say(`南の果てに${g.order + 1}番目に到達！`, `着順賞金 ¥${g.reward.toLocaleString()}（賞金は1人1回）。まちづくりはまだまだ続く`);
      else say('南の果てに再訪', 'ゴール賞金はもう受け取り済み。町へ戻って稼ごう');
      break;
    }
    case 'start':
      phase = 'shop';
      break;
    default:
      phase = isTown(node) ? 'city' : 'action_choice';
  }

  // カードを1枚引く（村マスの半分・中継マスの一部）
  if (cards && cardDrawn) {
    const card = drawCard();
    const added = addCard(cards, currentPlayerIndex, card);
    cards = added.cs;
    const extra = added.discarded ? `（手札がいっぱいなので「${CARD_INFO[added.discarded].name}」を捨てた）` : '';
    say(`カード「${CARD_INFO[card].name}」を手に入れた`, `${CARD_INFO[card].desc}${extra}`);
  }

  newPlayers[currentPlayerIndex] = p;
  store.setState({
    cityCards: cards,
    players: newPlayers,
    city: nextCity,
    turnPhase: phase,
    currentEvent,
    currentCityEvent,
    lastCityEventOutcome: null,
    cityGoalClaims: goalClaims,
    cityBonusActions: bonusActions,
  });
  notices.forEach(queueNotice);
}

export { MAX_FISHING_PER_TURN };

export function hasSavedGame(): boolean {
  const saved = loadGameState();
  return saved != null;
}
