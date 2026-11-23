// 途中でやめる・途中から仲間を増やす・途中でアカウントにつなぐ を、本物のストアで確かめる。
//  - 釣り旅: 数巡まわしてから仲間を増やし、別の人をアカウントにつなぎ、ここで終わる → 保存の中身（図鑑・お金・道具）
//  - まちづくり: 途中で仲間を増やしても、月末の処理と最後まで固まらずに進む
//  - セーブしてやめる → 再開で、増えた仲間・つないだアカウントが戻る
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fs = vi.hoisted(() => ({
  saved: null as unknown,
  calls: [] as { fn: string; uid: string; value: unknown }[],
  accountMoney: 10000 as number | null,
}));
vi.mock('../lib/firestore', () => ({
  saveUserEquipment: async (uid: string, value: unknown) => { fs.calls.push({ fn: 'equipment', uid, value }); },
  saveUserMoney: async (uid: string, value: unknown) => { fs.calls.push({ fn: 'money', uid, value }); },
  saveUserEncyclopedia: async (uid: string, value: unknown) => { fs.calls.push({ fn: 'encyclopedia', uid, value }); },
  loadUserEncyclopedia: async () => ({}),
  loadUserMoney: async () => fs.accountMoney,
}));
vi.mock('../utils/storage', () => ({
  loadEncyclopedia: () => ({}),
  saveEncyclopedia: () => {},
  saveGameState: (s: unknown) => { fs.saved = JSON.parse(JSON.stringify(s)); },
  loadGameState: () => fs.saved,
  clearGameState: () => { fs.saved = null; },
  loadGameStateAsync: async () => fs.saved,
}));

import { useGameStore } from './useGameStore';
import { runCpuStep } from '../components/cpu/cpuStep';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';
import { INITIAL_MONEY } from '../game/constants';
import type { GameMode, GameState } from '../game/types';

// cpuStep は効果音の予約に window.setTimeout を使う
(globalThis as unknown as { window?: unknown }).window ??= globalThis;

const flush = () => new Promise(r => setTimeout(r, 0));

/** 全員 CPU の対局を始める（途中から入る人も CPU の判断で進める） */
function start(mode: GameMode, count: number, maxTurns: number) {
  setRandomSource(mulberry32(7));
  useGameStore.getState().startGame({
    playerCount: count,
    playerNames: Array.from({ length: count }, (_, i) => `CPU${i + 1}`),
    playerUids: Array.from({ length: count }, () => null),
    maxTurns,
    mode,
    playerKinds: Array.from({ length: count }, () => 'cpu' as const),
  });
}

/** 画面のタイマーの代わりに段階を進める。until が true になるか対局が終わるまで */
function drive(until: (s: GameState) => boolean, limit = 60000): void {
  for (let step = 0; step < limit; step++) {
    const s = useGameStore.getState();
    if (s.screen !== 'game' || until(s)) return;
    if (s.cityToast) { s.dismissCityToast(); continue; }
    if (s.cityBinboToast) { s.dismissBinboToast(); continue; }
    if (s.cityBinboEvent) { s.acknowledgeBinboEvent(); continue; }
    switch (s.turnPhase) {
      case 'city_report': s.acknowledgeCityReport(); break;
      case 'city_yearend': s.acknowledgeCityYearEnd(); break;
      case 'node_action': s.executeNodeAction(); break;
      case 'turn_end': s.endTurn(); break;
      default: runCpuStep();
    }
  }
  throw new Error(`進まない: ${useGameStore.getState().turn}巡目 ${useGameStore.getState().turnPhase}`);
}

/** 途中から入った人（人の席）を、テストの間だけ CPU の判断で動かす */
function letCpuPlay(index: number) {
  useGameStore.setState(st => ({ players: st.players.map((p, i) => (i === index ? { ...p, isCpu: true, cpuStyle: 'steady' } : p)) }));
}

beforeEach(() => {
  fs.saved = null;
  fs.calls = [];
  fs.accountMoney = 10000;
  resetRandomSource();
  useGameStore.getState().resetGame();
});

describe('釣り旅: 途中から仲間を増やし、途中でつなぎ、ここで終わる', () => {
  it('増えた人は手番の最後に入り、つないだ人は図鑑とお金の増えた分だけ保存される（道具は保存しない）', async () => {
    start('fishing', 2, 50);
    drive(s => s.turn >= 4 && s.turnPhase === 'idle');

    // 2人目（人の席にしておく）が釣った魚とお金を用意する
    useGameStore.setState(st => ({
      players: st.players.map((p, i) => (i === 1
        ? { ...p, isCpu: false, money: 7500, caughtFish: [...p.caughtFish, { fishId: 'test-fish', caughtAt: p.currentNode, turn: st.turn, size: 1 }] }
        : p)),
    }));

    // 仲間を増やす → 3人目として最後に入る
    expect(useGameStore.getState().addLatePlayer('はなこ')).toBe(true);
    let s = useGameStore.getState();
    expect(s.players).toHaveLength(3);
    expect(s.players[2]).toMatchObject({ name: 'はなこ', currentNode: 'start', joinedTurn: s.turn, money: INITIAL_MONEY });
    expect(s.settings.playerCount).toBe(3);
    expect(s.encyclopedias).toHaveLength(3);
    // 保存にも入っている
    expect((fs.saved as GameState).players).toHaveLength(3);

    // 2人目をアカウントにつなぐ（入れ替えはしないので、同じアカウントは2つの席につなげない）
    expect(useGameStore.getState().linkPlayerAccount(1, { uid: 'u-taro', displayName: 'taro' }, { 'old-fish': true })).toBe(true);
    expect(useGameStore.getState().linkPlayerAccount(2, { uid: 'u-taro', displayName: 'taro' }, {})).toBe(false);
    expect(useGameStore.getState().linkPlayerAccount(1, { uid: 'u-other', displayName: 'x' }, {})).toBe(false);
    s = useGameStore.getState();
    expect(s.players[1]).toMatchObject({ uid: 'u-taro', name: 'taro', lateLink: true });
    expect(s.encyclopedias[1]['test-fish']).toBe(true);
    expect(s.encyclopedias[1]['old-fish']).toBe(true);

    // 増えた人も番が回ってくる（いまの巡の最後の人の次）
    letCpuPlay(1);
    letCpuPlay(2);
    const turnAtJoin = s.turn;
    drive(st => st.currentPlayerIndex === 2);
    expect(useGameStore.getState().turn).toBe(turnAtJoin);
    drive(st => st.turn >= turnAtJoin + 2 && st.turnPhase === 'idle');
    // テストで CPU にした席を人に戻す（保存の判定に関わらないが、元の姿で終える）
    useGameStore.setState(st => ({ players: st.players.map((p, i) => (i > 0 ? { ...p, isCpu: false } : p)) }));

    // ここで終わる（順位を決める）
    const before = useGameStore.getState().players[1];
    useGameStore.getState().endGame();
    await flush();
    await flush();
    expect(useGameStore.getState().screen).toBe('result');
    const taro = fs.calls.filter(c => c.uid === 'u-taro');
    expect(taro.some(c => c.fn === 'encyclopedia')).toBe(true);
    expect(taro.some(c => c.fn === 'equipment')).toBe(false);
    const money = taro.find(c => c.fn === 'money');
    expect(money?.value).toBe(10000 + Math.max(0, before.money - (before.startMoney ?? INITIAL_MONEY)));
  });
});

describe('セーブしてやめる → つづきから', () => {
  it('行動の前ならいまの姿で、釣りの最中なら番のはじめから続き、増えた仲間とつないだアカウントは戻る', () => {
    start('fishing', 2, 50);
    // 始めてすぐでも保存がある
    expect(fs.saved).not.toBeNull();
    drive(s => s.turn >= 3 && s.turnPhase === 'idle');
    const startOfTurn = useGameStore.getState();

    // 釣りの最中（保存し直せない段階）に仲間を増やしてやめる
    useGameStore.setState({ turnPhase: 'fishing' });
    useGameStore.getState().addLatePlayer('じろう');
    useGameStore.getState().saveAndQuit();
    expect(useGameStore.getState().screen).toBe('title');
    const saved = fs.saved as GameState;
    expect(saved.turnPhase).toBe('idle');
    expect(saved.turn).toBe(startOfTurn.turn);
    expect(saved.players.map(p => p.name)).toEqual([...startOfTurn.players.map(p => p.name), 'じろう']);

    useGameStore.getState().resumeGame();
    const r = useGameStore.getState();
    expect(r.screen).toBe('game');
    expect(r.players).toHaveLength(3);
    expect(r.settings.playerCount).toBe(3);
    expect(r.encyclopedias).toHaveLength(3);

    // 行動の前（idle）なら、いまの姿をそのまま保存する
    useGameStore.getState().linkPlayerAccount(2, { uid: 'u-jiro', displayName: 'jiro' }, {});
    useGameStore.getState().saveAndQuit();
    useGameStore.getState().resumeGame();
    expect(useGameStore.getState().players[2]).toMatchObject({ uid: 'u-jiro', name: 'jiro', lateLink: true });
  });
});

describe('まちづくり: 途中から仲間を増やしても最後まで進む', () => {
  it('手札の枠が増え、月末の処理も結果まで固まらない', () => {
    start('city', 2, 6);
    drive(s => s.turn >= 3 && s.turnPhase === 'idle');
    expect(useGameStore.getState().addLatePlayer('さぶろう')).toBe(true);
    const s = useGameStore.getState();
    expect(s.cityCards!.hands).toHaveLength(3);
    letCpuPlay(2);
    drive(() => false);
    const end = useGameStore.getState();
    expect(end.screen).toBe('result');
    expect(end.players).toHaveLength(3);
    // 増えた人の資産の記録も月末ごとに付いている
    const last = end.city!.history[end.city!.history.length - 1];
    expect(last.assets).toHaveLength(3);
  });
});
