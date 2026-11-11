// 魚市場と仕掛けがストアを通して働くことを確かめる（釣り係）。
// 純粋なロジックは src/game/fishMarket.test.ts・fishing.test.ts にある。ここはストアへのつなぎ込みだけを見る。
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../lib/firestore', () => ({
  saveUserEquipment: async () => {},
  saveUserMoney: async () => {},
  saveUserEncyclopedia: async () => {},
  loadUserEncyclopedia: async () => ({}),
}));
vi.mock('../utils/storage', () => ({
  loadEncyclopedia: () => ({}),
  saveEncyclopedia: () => {},
  saveGameState: () => {},
  loadGameState: () => null,
  clearGameState: () => {},
  loadGameStateAsync: async () => null,
}));

import { useGameStore, MAX_FISHING_PER_TURN } from './useGameStore';
import { runCpuStep } from '../components/cpu/cpuStep';
import { CITY_DEFAULT_MONTHS, CITY_ECONOMY, priceScale } from '../game/city';
import type { Plot } from '../game/city';
import { FISH_MARKET, fishPriceMul, fishSalePrice } from '../game/fishMarket';
import { BOAT_FISHING_COST, DEFAULT_MAX_TURNS } from '../game/constants';
import { createEquipmentItem, getEquippedItem } from '../game/equipment';
import { FISH_DATABASE } from '../data/fishDatabase';
import type { CaughtFish, FishRarity, GameMode, PlayerEquipment } from '../game/types';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

// cpuStep は効果音の予約に window.setTimeout を使う
(globalThis as unknown as { window?: unknown }).window ??= globalThis;

const TOWN = 'otaru'; // 釣り場の町
const s = () => useGameStore.getState();
const me = () => s().players[s().currentPlayerIndex];

function start(mode: GameMode, kinds: ('human' | 'cpu')[] = ['human', 'human'], seed = 5) {
  setRandomSource(mulberry32(seed));
  s().startGame({
    playerCount: kinds.length,
    playerNames: kinds.map((k, i) => (k === 'cpu' ? `CPU${i}` : `人${i}`)),
    playerUids: kinds.map(() => null),
    maxTurns: mode === 'city' ? CITY_DEFAULT_MONTHS : DEFAULT_MAX_TURNS,
    mode,
    playerKinds: kinds,
  });
  // 全員を釣り場の町に置く
  useGameStore.setState(st => ({ players: st.players.map(p => ({ ...p, currentNode: TOWN })), turnPhase: 'action_choice' }));
}

function gear(level: number): PlayerEquipment {
  const rod = createEquipmentItem('rod', level);
  const reel = createEquipmentItem('reel', level);
  const lure = createEquipmentItem('lure', level);
  return { equipped: { rod: rod.id, reel: reel.id, lure: lure.id }, inventory: [rod, reel, lure] };
}

function giveGear(level: number) {
  useGameStore.setState(st => ({ players: st.players.map((p, i) => (i === st.currentPlayerIndex ? { ...p, equipment: gear(level) } : p)) }));
}

function setPlots(nodeId: string, plots: Plot[]) {
  useGameStore.setState(st => {
    const town = st.city!.towns[nodeId];
    return { city: { ...st.city!, towns: { ...st.city!.towns, [nodeId]: { ...town, plots: town.plots.map((_, i) => plots[i] ?? null) } } } };
  });
}

const fishOf = (rarity: FishRarity) => FISH_DATABASE.find(f => f.rarity === rarity && f.regions.includes('hokkaido') && !f.limitedNodes)!;
const caught = (rarity: FishRarity, size = 1): CaughtFish => ({ fishId: fishOf(rarity).id, caughtAt: TOWN, turn: s().turn, size });
const durabilities = () => me().equipment.inventory.map(i => i.durability);

afterEach(() => resetRandomSource());

describe('魚市場（ストア・まちづくり）', () => {
  it('売値は賑わい×漁場×物価。釣果の画面に出す売値（sale）も同じ額', () => {
    start('city');
    setPlots(TOWN, [{ kind: 'com', level: 2, owner: 1, builtTurn: 1 }]);
    useGameStore.setState({ turn: 13 }); // 2年目（物価2倍）
    const mul = fishPriceMul(s().city!, TOWN, 13);
    expect(mul).toBeCloseTo(1.3 * priceScale(13), 5);
    s().startFishing(false);
    const before = me().money;
    s().catchFish(caught('common', 1.2), [caught('uncommon', 1)]);
    const main = fishSalePrice('common', 1.2, mul);
    const total = main + fishSalePrice('uncommon', 1, mul);
    expect(me().money - before).toBe(total);
    expect(s().fishingState?.sale).toEqual({ total, main, mul, boom: false });
  });

  it('漁港があれば、持ち主に水揚げ手数料（倍率の掛かった売値の割合）が入る', () => {
    start('city');
    setPlots(TOWN, [{ kind: 'port', level: 1, owner: 1, builtTurn: 1 }]);
    const mul = fishPriceMul(s().city!, TOWN, 1);
    expect(mul).toBeCloseTo(1.5, 5);
    const ownerBefore = s().players[1].money;
    s().startFishing(false);
    s().catchFish(caught('common'));
    const sale = fishSalePrice('common', 1, mul);
    expect(s().players[1].money - ownerBefore).toBe(Math.round(sale * CITY_ECONOMY.portFeeRate));
  });

  it('まちづくりでは道具が傷まない（釣れても逃げられても）', () => {
    start('city');
    const before = durabilities();
    s().startFishing(false);
    s().catchFish(caught('common'));
    s().endFishing();
    s().startFishing(false);
    s().failFishing();
    s().endFishing();
    expect(durabilities()).toEqual(before);
    expect(s().turnPhase).toBe('action_choice');
  });

  it('1手番に釣れるのは3回まで（町の画面から入り直しても増えない）', () => {
    start('city');
    for (let k = 0; k < MAX_FISHING_PER_TURN; k++) {
      s().startFishing(false);
      expect(s().turnPhase).toBe('fishing');
      s().failFishing();
      s().endFishing();
    }
    expect(s().nodeActionsThisTurn).toBe(MAX_FISHING_PER_TURN);
    s().startFishing(false);
    expect(s().turnPhase).toBe('action_choice');
    expect(s().fishingState).toBeNull();
  });

  it('大物（レア以上）を釣ると、その町に3か月の特需。コモンでは起きない', () => {
    start('city');
    s().startFishing(false);
    s().catchFish(caught('common'));
    expect(s().city!.booms ?? []).toEqual([]);
    expect(s().fishingState?.sale?.boom).toBe(false);
    s().endFishing();
    s().startFishing(false);
    s().catchFish(caught('rare'));
    expect(s().city!.booms).toEqual([{ nodeId: TOWN, monthsLeft: FISH_MARKET.boomMonths }]);
    expect(s().fishingState?.sale?.boom).toBe(true);
  });

  it('公害のひどい町ではコモンしか掛からない', () => {
    start('city');
    setPlots(TOWN, [{ kind: 'ind', level: 2, owner: 1, builtTurn: 1 }]);
    giveGear(5);
    for (let k = 0; k < 40; k++) {
      useGameStore.setState({ nodeActionsThisTurn: 0 });
      s().startFishing(false);
      expect(s().fishingState?.targetFish?.rarity).toBe('common');
    }
  });

  it('船釣りの代金は物価で上がる', () => {
    start('city');
    useGameStore.setState(st => ({ turn: 13, players: st.players.map(p => ({ ...p, money: 50000 })) }));
    s().startBoatFishing();
    expect(me().money).toBe(50000 - BOAT_FISHING_COST * priceScale(13));
    expect(s().boatFishingRemaining).toBe(2);
  });

  it('7月の釣り大会: 釣った売値が数えられ、月末に1位へ賞金が入り、お知らせが出る', () => {
    start('city');
    useGameStore.setState({ turn: 4 }); // 7月
    s().startFishing(false);
    s().catchFish(caught('uncommon', 1.5));
    s().endFishing();
    const total = fishSalePrice('uncommon', 1.5, fishPriceMul(s().city!, TOWN, 4));
    expect(s().city!.derby).toEqual({ year: 1, totals: [total, 0] });
    // 2人とも手番を終えて月末へ
    const money0 = s().players[0].money;
    s().setTurnPhase('turn_end');
    s().endTurn();
    s().setTurnPhase('turn_end');
    s().endTurn();
    expect(s().turn).toBe(5);
    expect(s().city!.derby).toBeUndefined();
    expect(s().cityReport?.headlines.some(h => h.startsWith('釣り大会: 人0が優勝'))).toBe(true);
    // 賞金は月の収入とは別に入っている（建物が無いので月収は0）
    expect(s().players[0].money - money0).toBe(FISH_MARKET.derbyPrize * priceScale(4));
    const titles = [s().cityToast?.title, ...s().noticeQueue.map(n => (n.kind === 'city' ? n.title : ''))];
    expect(titles).toContain('釣り大会');
  });

  it('7月でなければ釣り大会には数えない', () => {
    start('city');
    s().startFishing(false);
    s().catchFish(caught('uncommon'));
    expect(s().city!.derby).toBeUndefined();
  });
});

describe('CPU も釣る（ストア・まちづくり）', () => {
  it('釣り場の町で決まった回数だけ釣り、お知らせは1件。道具は傷まない', () => {
    start('city', ['cpu', 'human']);
    const before = durabilities();
    s().cpuFishTown();
    expect(s().nodeActionsThisTurn).toBe(FISH_MARKET.cpuCastsPerVisit);
    expect(s().turnPhase).toBe('action_choice');
    expect(s().fishingState).toBeNull();
    expect(durabilities()).toEqual(before);
    expect(s().cityToast?.title).toMatch(/^CPU0：(魚を釣った|逃げられた)$/);
    expect(s().noticeQueue).toEqual([]);
    // 同じ訪問でもう一度呼んでも釣らない
    s().cpuFishTown();
    expect(s().nodeActionsThisTurn).toBe(FISH_MARKET.cpuCastsPerVisit);
  });

  it('CPU の1手: 行動選択で釣り、次の1手で手番を終える（固まらない）', () => {
    start('city', ['cpu', 'human']);
    const money = me().money;
    runCpuStep();
    expect(s().nodeActionsThisTurn).toBe(FISH_MARKET.cpuCastsPerVisit);
    expect(s().turnPhase).toBe('action_choice');
    expect(me().money).toBeGreaterThanOrEqual(money);
    runCpuStep();
    expect(s().turnPhase).toBe('turn_end');
  });

  it('釣り場でない町・竿が無いときは釣らずに手番を終える', () => {
    start('city', ['cpu', 'human']);
    useGameStore.setState(st => ({ players: st.players.map(p => ({ ...p, currentNode: 'tokyo' })) }));
    runCpuStep();
    expect(s().turnPhase).toBe('turn_end');
    expect(s().nodeActionsThisTurn).toBe(0);
    start('city', ['cpu', 'human']);
    useGameStore.setState(st => ({ players: st.players.map(p => ({ ...p, equipment: { ...p.equipment, equipped: { ...p.equipment.equipped, rod: null } } })) }));
    runCpuStep();
    expect(s().turnPhase).toBe('turn_end');
  });
});

describe('仕掛け（ストア）', () => {
  it('大物ねらいは2回ぶんの枠を使う。竿 Lv1 では「ふつう」に戻る', () => {
    start('fishing');
    s().startFishing(false, 'oomono');
    expect(s().fishingState?.rig).toBe('futsu');
    s().failFishing();
    expect(s().nodeActionsThisTurn).toBe(1);
    s().endFishing();
    giveGear(2);
    s().startFishing(false, 'oomono');
    expect(s().fishingState?.rig).toBe('oomono');
    s().catchFish(caught('rare'));
    expect(s().nodeActionsThisTurn).toBe(3);
    s().endFishing();
    // 残りの枠が無いので、もう始められない
    s().startFishing(false, 'kazu');
    expect(s().fishingState).toBeNull();
  });

  it('残りが1回ぶんのとき、大物ねらいは選べず「ふつう」になる', () => {
    start('fishing');
    giveGear(3);
    useGameStore.setState({ nodeActionsThisTurn: 2 });
    s().startFishing(false, 'oomono');
    expect(s().fishingState?.rig).toBe('futsu');
  });

  it('数ねらいはコモンとアンコモンだけ。仕掛けを省くと「ふつう」', () => {
    start('fishing');
    giveGear(5);
    for (let k = 0; k < 40; k++) {
      useGameStore.setState({ nodeActionsThisTurn: 0 });
      s().startFishing(false, 'kazu');
      expect(['common', 'uncommon']).toContain(s().fishingState?.targetFish?.rarity);
      expect(s().fishingState?.rig).toBe('kazu');
    }
    useGameStore.setState({ nodeActionsThisTurn: 0 });
    s().startFishing(false);
    expect(s().fishingState?.rig).toBe('futsu');
    // 船釣りは仕掛けを選べない
    useGameStore.setState({ nodeActionsThisTurn: 0 });
    s().startFishing(true, 'kazu');
    expect(s().fishingState?.rig).toBe('futsu');
  });

  it('釣り旅では道具が傷む。大物ねらいで逃がすと傷みが倍', () => {
    start('fishing');
    giveGear(2);
    const d0 = getEquippedItem(me().equipment, 'rod')!.durability;
    s().startFishing(false);
    s().failFishing();
    s().endFishing();
    const d1 = getEquippedItem(me().equipment, 'rod')!.durability;
    const loss = d0 - d1;
    expect(loss).toBeGreaterThan(0);
    s().startFishing(false, 'oomono');
    s().failFishing();
    s().endFishing();
    const d2 = getEquippedItem(me().equipment, 'rod')!.durability;
    expect(d1 - d2).toBe(loss * 2);
    // 釣り上げたときは大物ねらいでも1回ぶん
    useGameStore.setState({ nodeActionsThisTurn: 0 });
    s().startFishing(false, 'oomono');
    s().catchFish(caught('rare'));
    s().endFishing();
    expect(d2 - getEquippedItem(me().equipment, 'rod')!.durability).toBe(loss);
  });

  it('釣り旅の売値はこれまで通り（基本の売値 × 大きさ）で、町おこしも釣り大会も起きない', () => {
    start('fishing');
    useGameStore.setState({ turn: 4 });
    const before = me().money;
    s().startFishing(false);
    s().catchFish(caught('rare', 1.3));
    expect(me().money - before).toBe(Math.round(700 * 1.3));
    expect(s().fishingState?.sale).toEqual({ total: Math.round(700 * 1.3), main: Math.round(700 * 1.3), mul: 1, boom: false });
    expect(s().city).toBeNull();
  });
});
