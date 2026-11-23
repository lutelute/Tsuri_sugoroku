// ゲームストアの初期値と、手番の切り替えで毎回戻す値。
// 新しい状態を足すときは initialState に初期値を足す（あわせて sessionSlice の startGame / resumeGame も）。
import type { GameState, GameSettings, Player, PlayerEquipment } from '../../game/types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES, DEFAULT_MAX_TURNS } from '../../game/constants';
import { NODE_MAP } from '../../data/boardNodes';
import { loadEncyclopedia } from '../../utils/storage';
import { createInitialEquipment } from '../../game/equipment';
import { CITY_INITIAL_MONEY, CITY_START_NODE } from '../../game/city';
import { CPU_STYLES } from '../../game/cpuAI';
import { cpuPersonaFor } from '../../data/cpuPersonas';

export const MAX_FISHING_PER_TURN = 3;

export function createInitialPlayers(
  settings: GameSettings,
  savedEquipments?: (PlayerEquipment | null)[],
  savedMoneys?: (number | null)[],
): Player[] {
  const isCity = settings.mode === 'city';
  let cpuCount = 0;
  return Array.from({ length: settings.playerCount }, (_, i) => {
    const isCpu = settings.playerKinds?.[i] === 'cpu';
    // CPU は 堅実 → 独占 → 目的地 の順。名前は性格ごとの人物（お松・権蔵・早太。同じ性格の2人目は別の名前。data/cpuPersonas.ts）
    const cpuNo = isCpu ? cpuCount++ : -1;
    const cpuStyle = isCpu ? CPU_STYLES[cpuNo % CPU_STYLES.length] : undefined;
    const money = isCity ? CITY_INITIAL_MONEY : savedMoneys?.[i] ?? INITIAL_MONEY;
    return {
    id: i,
    isCpu,
    cpuStyle,
    name: settings.playerNames[i] || (isCpu && cpuStyle ? cpuPersonaFor(cpuStyle, Math.floor(cpuNo / CPU_STYLES.length)).name : PLAYER_DEFAULT_NAMES[i]),
    color: PLAYER_COLORS[i],
    uid: settings.playerUids[i] ?? undefined,
    currentNode: isCity && NODE_MAP.has(CITY_START_NODE) ? CITY_START_NODE : 'start',
    money,
    startMoney: money,
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

export const initialState: GameState = {
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

/** 手番の切り替え時に毎回リセットする値 */
export const TURN_RESET = {
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

export function isCityMode(settings: GameSettings): boolean {
  return settings.mode === 'city';
}
