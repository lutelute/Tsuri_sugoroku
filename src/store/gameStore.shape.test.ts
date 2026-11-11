// ストアの「形」を固定するテスト: 状態のキー・アクションの名前と引数の数が、分割や付け足しで黙って消えないようにする。
// 新しい状態・アクションを足したときは、下の一覧にも足すこと（消すときは本当に消してよいか確かめてから）。
// あわせて、保存 → 再開で対局の中身が戻ること（セーブの互換）を確かめる。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storage = vi.hoisted(() => ({ saved: null as unknown }));
vi.mock('../lib/firestore', () => ({
  saveUserEquipment: async () => {},
  saveUserMoney: async () => {},
  saveUserEncyclopedia: async () => {},
  loadUserEncyclopedia: async () => ({}),
}));
vi.mock('../utils/storage', () => ({
  loadEncyclopedia: () => ({}),
  saveEncyclopedia: () => {},
  // 本物と同じく JSON にして持つ（関数は落ちる）
  saveGameState: (s: unknown) => { storage.saved = JSON.parse(JSON.stringify(s)); },
  loadGameState: () => storage.saved,
  clearGameState: () => { storage.saved = null; },
  loadGameStateAsync: async () => storage.saved,
}));

import { useGameStore, MAX_FISHING_PER_TURN, hasSavedGame } from './useGameStore';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

const STATE_KEYS = [
  'boatFishingRemaining', 'capitalDoneThisTurn', 'city', 'cityActionsThisTurn', 'cityBinboEvent', 'cityBinboToast',
  'cityBonusActions', 'cityCards', 'cityGoalClaims', 'cityReport', 'cityTitleHistory', 'cityToast', 'cityYearEnd',
  'currentCityEvent', 'currentEvent', 'currentPlayerIndex', 'encyclopedias', 'firstFinishTurn', 'fishingState', 'gameOver',
  'initialEncyclopedias', 'lastCapitalResult', 'lastCityEventOutcome', 'lastMove', 'nodeActionsThisTurn', 'noticeQueue',
  'pendingDiceCap', 'pendingDiceCount', 'players', 'reachableNodes', 'rouletteResult', 'screen', 'settings', 'turn', 'turnPhase',
];

/** アクション名 / 引数の数（省略できる引数も数える書き方をしているので、引数の増減も分かる） */
const ACTIONS = [
  'acknowledgeBinboEvent/0', 'acknowledgeCapitalResult/0', 'acknowledgeCityEvent/0', 'acknowledgeCityReport/0',
  'acknowledgeCityYearEnd/0', 'announce/2', 'applyCapitalChoice/1', 'applyCityEventCard/0', 'applyEventCard/1',
  'buyCityCard/1', 'buyEquipment/3', 'catchFish/2', 'cityAcquire/1', 'cityBuild/2', 'cityBuySpecialty/0', 'cityEnact/1', 'cityLayRail/1', 'cityRenovate/1',
  'cityUpgrade/1', 'clearUserData/0', 'cpuFish/0', 'cpuFishTown/0', 'degradeEquipment/0', 'devCityCheat/1', 'dismissBinboToast/0',
  'dismissCityToast/0', 'doActionAgain/0', 'endFishing/0', 'endGame/0', 'endTurn/0', 'equipItem/1', 'executeNodeAction/0',
  'failFishing/0', 'mergeEquipment/2', 'nextPlayer/0', 'playCityCard/2', 'repairEquipment/2', 'resetGame/0', 'resumeGame/0',
  'rollDice/1', 'selectPath/1', 'setScreen/1', 'setTurnPhase/1', 'skipMonthEnd/0', 'skipShop/0', 'startBoatFishing/0',
  'startFishing/2', 'startGame/4', 'syncFromCloud/0', 'unequipItem/1', 'updateFishingState/1', 'warpCurrentPlayerTo/1',
];

function shape() {
  const st = useGameStore.getState() as unknown as Record<string, unknown>;
  const keys = Object.keys(st).sort();
  return {
    state: keys.filter(k => typeof st[k] !== 'function'),
    actions: keys.filter(k => typeof st[k] === 'function').map(k => `${k}/${(st[k] as (...a: unknown[]) => unknown).length}`),
  };
}

/** 再開で戻るべき中身（再開時にわざと空にする表示用の値は除く） */
const RESTORED = [
  'screen', 'settings', 'players', 'currentPlayerIndex', 'turn', 'turnPhase', 'rouletteResult', 'reachableNodes', 'gameOver',
  'encyclopedias', 'nodeActionsThisTurn', 'boatFishingRemaining', 'city', 'cityReport', 'cityActionsThisTurn', 'currentCityEvent',
  'capitalDoneThisTurn', 'cityGoalClaims', 'cityYearEnd', 'cityTitleHistory', 'firstFinishTurn', 'cityBonusActions', 'cityCards',
  'pendingDiceCount', 'pendingDiceCap', 'cityBinboEvent',
] as const;

const pick = (keys: readonly string[]) => {
  const st = useGameStore.getState() as unknown as Record<string, unknown>;
  return JSON.parse(JSON.stringify(Object.fromEntries(keys.map(k => [k, st[k]]))));
};

describe('ストアの形（状態のキーとアクション）', () => {
  it('状態のキーが変わっていない', () => {
    expect(shape().state).toEqual(STATE_KEYS);
  });

  it('アクションの名前と引数の数が変わっていない', () => {
    expect(shape().actions).toEqual(ACTIONS);
  });

  it('同じ場所から MAX_FISHING_PER_TURN と hasSavedGame が読める', () => {
    expect(MAX_FISHING_PER_TURN).toBe(3);
    expect(typeof hasSavedGame).toBe('function');
  });
});

describe('保存と再開（セーブの互換）', () => {
  beforeEach(() => {
    storage.saved = null;
    useGameStore.getState().resetGame();
  });

  it('まちづくりを2か月進めて保存し、作り直したストアで再開すると中身が戻る', () => {
    setRandomSource(mulberry32(7));
    useGameStore.getState().startGame({
      playerCount: 2, playerNames: ['あなた', 'CPU'], playerUids: [null, null], maxTurns: 12, mode: 'city', playerKinds: ['human', 'cpu'],
    });
    for (let i = 0; i < 4; i++) {
      useGameStore.getState().setTurnPhase('turn_end');
      useGameStore.getState().endTurn();
      if (useGameStore.getState().turnPhase !== 'idle') useGameStore.getState().setTurnPhase('idle');
    }
    resetRandomSource();
    useGameStore.getState().setTurnPhase('idle');
    useGameStore.getState().nextPlayer(); // 最後の状態を保存させる
    const before = pick(RESTORED);
    expect(before.turn).toBeGreaterThan(2);
    expect(hasSavedGame()).toBe(true);
    const saved = storage.saved;
    useGameStore.getState().resetGame();
    storage.saved = saved;
    useGameStore.getState().resumeGame();
    expect(pick(RESTORED)).toEqual(before);
    expect(useGameStore.getState().noticeQueue).toEqual([]);
    expect(useGameStore.getState().cityToast).toBeNull();
  });

  it('古い形式のセーブ（v4.0 以前: カード・貧乏神・サイコロの個数が無い、図鑑が1つ）からも再開できる', () => {
    useGameStore.getState().startGame({
      playerCount: 2, playerNames: ['A', 'B'], playerUids: [null, null], maxTurns: 12, mode: 'city', playerKinds: ['human', 'human'],
    });
    const full = JSON.parse(JSON.stringify(useGameStore.getState())) as Record<string, unknown>;
    for (const k of ['cityCards', 'pendingDiceCount', 'pendingDiceCap', 'cityBinboEvent', 'cityBinboToast', 'cityBonusActions',
      'cityTitleHistory', 'cityYearEnd', 'cityGoalClaims', 'firstFinishTurn', 'boatFishingRemaining', 'encyclopedias', 'noticeQueue']) delete full[k];
    full.encyclopedia = { aji: true };
    useGameStore.getState().resetGame();
    storage.saved = full;
    useGameStore.getState().resumeGame();
    const st = useGameStore.getState();
    expect(st.screen).toBe('game');
    expect(st.cityCards?.hands).toHaveLength(2);
    expect(st.pendingDiceCount).toBe(1);
    expect(st.pendingDiceCap).toBeNull();
    expect(st.cityBinboEvent).toBeNull();
    expect(st.cityBonusActions).toBe(0);
    expect(st.cityTitleHistory).toEqual([]);
    expect(st.cityGoalClaims).toEqual([]);
    expect(st.firstFinishTurn).toBeNull();
    expect(st.boatFishingRemaining).toBe(0);
    expect(st.encyclopedias).toEqual([{ aji: true }, { aji: true }]);
    expect(st.noticeQueue).toEqual([]);
  });
});
