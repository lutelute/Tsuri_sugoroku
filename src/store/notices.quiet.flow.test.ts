// お知らせの整理（損得係）がストアを通して働くことを確かめる:
//  視察の瓦版は初回だけ / 買い物代の瓦版は ¥500×物価 から / 同じ文は「×2」/ CPU のひとこと（目的地を取られた・災害に遭った）
// 出す・出さないの判定そのものは src/game/tempo.test.ts、せりふは src/data/cpuPersonas.test.ts にある。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { useGameStore } from './useGameStore';
import { CITY_DEFAULT_MONTHS, CITY_EVENT_CARDS, visitorFees, priceScale } from '../game/city';
import type { BuildingKind } from '../game/city';
import { FEE_NOTICE_MIN } from '../game/tempo';
import { CPU_LINES } from '../data/cpuPersonas';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

const s = () => useGameStore.getState();

function start(kinds: ('human' | 'cpu')[] = ['human', 'human'], seed = 7) {
  setRandomSource(mulberry32(seed));
  s().startGame({
    playerCount: kinds.length,
    playerNames: kinds.map((k, i) => (k === 'cpu' ? '' : `人${i}`)),
    playerUids: kinds.map(() => null),
    maxTurns: CITY_DEFAULT_MONTHS,
    mode: 'city',
    playerKinds: kinds,
  });
  // 目的地はどのテストでも通らない所に置く（一番乗りのお知らせが混ざらないように）
  useGameStore.setState(st => ({ city: st.city && { ...st.city, destination: 'naha', destinationReward: 3000 } }));
}

/** その席の人として町に建てる（お金は足す。お知らせは片づける） */
function buildAt(pi: number, nodeId: string, plots: number[], kinds: BuildingKind[]) {
  useGameStore.setState(st => ({
    currentPlayerIndex: pi,
    players: st.players.map((p, i) => (i === pi ? { ...p, currentNode: nodeId, money: 80000 } : p)),
  }));
  plots.forEach((plot, k) => {
    useGameStore.setState({ cityActionsThisTurn: 0, turnPhase: 'city' });
    expect(s().cityBuild(plot, kinds[k % kinds.length])).toBeNull();
  });
  useGameStore.setState({ cityToast: null, cityBinboToast: null, noticeQueue: [], cityActionsThisTurn: 0 });
}

/** その席の人がマスに着く（到着の処理を1回）。出た瓦版（見せている1件 + 順番待ち）を返す */
function arrive(pi: number, nodeId: string) {
  useGameStore.setState(st => ({
    currentPlayerIndex: pi,
    turnPhase: 'node_action',
    cityToast: null,
    cityBinboToast: null,
    noticeQueue: [],
    players: st.players.map((p, i) => (i === pi ? { ...p, currentNode: nodeId } : p)),
  }));
  s().executeNodeAction();
  const shown = s().cityToast ? [{ title: s().cityToast!.title, body: s().cityToast!.body }] : [];
  const waiting = s().noticeQueue.flatMap(n => (n.kind === 'city' ? [{ title: n.title, body: n.body }] : []));
  return [...shown, ...waiting];
}

/** 月が替わったことにする（今月の視察の記録を消す） */
function nextMonth() {
  useGameStore.setState(st => ({ city: st.city && { ...st.city, inspections: [] } }));
}

afterEach(() => resetRandomSource());

describe('視察の瓦版は初回だけ', () => {
  beforeEach(() => start());

  it('その人の最初の視察では瓦版が出て、2回目からは出ない（視察そのものは記録される）', () => {
    buildAt(0, 'choshi', [0], ['res']);
    const first = arrive(0, 'choshi');
    expect(first.map(n => n.title)).toContain('人0：銚子を視察');
    expect(first.find(n => n.title.includes('視察'))!.body).toContain('視察済み');
    expect(s().city!.inspectNoticed).toEqual([0]);

    nextMonth();
    const second = arrive(0, 'choshi');
    expect(second.filter(n => n.title.includes('視察'))).toEqual([]);
    expect(s().city!.inspections).toEqual([{ nodeId: 'choshi', playerIndex: 0 }]); // 発展しやすくなる効き目はそのまま
    expect(s().turnPhase).toBe('city');
  });

  it('別の町でも2回目は出ない。ほかの人は、その人の初回に出る', () => {
    buildAt(0, 'choshi', [0], ['res']);
    buildAt(0, 'yokohama', [0], ['res']);
    buildAt(1, 'nagano', [0], ['res']);
    expect(arrive(0, 'choshi').some(n => n.title.includes('視察'))).toBe(true);
    expect(arrive(0, 'yokohama').some(n => n.title.includes('視察'))).toBe(false);
    expect(arrive(1, 'nagano').map(n => n.title)).toContain('人1：長野を視察');
    expect(s().city!.inspectNoticed).toEqual([0, 1]);
  });
});

describe('買い物代の瓦版は ¥500×物価 から', () => {
  beforeEach(() => start());

  it('小さな買い物は瓦版を出さずに払う', () => {
    buildAt(1, 'yokohama', [0], ['com']);
    const fee = visitorFees(s().city!, 'yokohama', 0, s().players[0].money, s().turn).total;
    expect(fee).toBeGreaterThan(0);
    expect(fee).toBeLessThan(FEE_NOTICE_MIN * priceScale(s().turn));
    const before = s().players.map(p => p.money);
    const notices = arrive(0, 'yokohama');
    expect(notices.filter(n => n.title.includes('買い物'))).toEqual([]);
    // お金は今までどおり動く
    expect(s().players[0].money).toBe(before[0] - fee);
    expect(s().players[1].money).toBe(before[1] + fee);
  });

  it('大きな買い物は瓦版が出る', () => {
    buildAt(1, 'yokohama', [0, 1, 2], ['com', 'tourism', 'com']);
    const fee = visitorFees(s().city!, 'yokohama', 0, s().players[0].money, s().turn).total;
    expect(fee).toBeGreaterThanOrEqual(FEE_NOTICE_MIN * priceScale(s().turn));
    const notices = arrive(0, 'yokohama');
    const n = notices.find(x => x.title === '人0：横浜で買い物');
    expect(n?.body).toContain(`¥${fee.toLocaleString()}`);
  });
});

describe('同じ文の瓦版は並べずにまとめる', () => {
  beforeEach(() => start());

  it('CPU が同じ物を続けて建てたお知らせは「×2」。せりふは最初の1つだけ', () => {
    const line = CPU_LINES.steady.build[0];
    s().announce('お松：建設', `「${line}」福島に住宅地を建てた`);
    s().announce('お松：建設', '福島に住宅地を建てた');
    expect(s().cityToast?.body).toBe(`「${line}」福島に住宅地を建てた ×2`);
    s().announce('お松：建設', '福島に商業地を建てた');
    expect(s().cityToast?.body).toBe(`「${line}」福島に住宅地を建てた ×2／福島に商業地を建てた`);
    expect(s().noticeQueue).toEqual([]);
  });
});

describe('CPU のひとこと（お知らせは増やさず、今ある文の頭に足す）', () => {
  it('人が目的地に一番乗りすると、取られた CPU のうち目的地にいちばん近かった人がひとこと言う', () => {
    start(['human', 'cpu', 'cpu']);
    // 権蔵（席2）を目的地の隣に、お松（席1）は東京のまま
    useGameStore.setState(st => ({
      city: st.city && { ...st.city, destination: 'choshi' },
      players: st.players.map((p, i) => (i === 2 ? { ...p, currentNode: 'r_choshi_tokyo' } : p)),
    }));
    const notices = arrive(0, 'choshi');
    const n = notices.find(x => x.title.includes('一番乗り'))!;
    expect(notices.filter(x => x.title.includes('一番乗り'))).toHaveLength(1);
    const said = CPU_LINES.monopoly.destination_lost.map(l => `権蔵「${l}」`);
    expect(said.some(q => n.body.startsWith(q))).toBe(true);
    expect(n.body).toContain('賞金');
  });

  it('CPU が一番乗りしたときは、その人のひとことだけ', () => {
    start(['human', 'cpu', 'cpu']);
    useGameStore.setState(st => ({ city: st.city && { ...st.city, destination: 'choshi' } }));
    const n = arrive(1, 'choshi').find(x => x.title.includes('一番乗り'))!;
    expect(CPU_LINES.steady.destination.some(l => n.body.startsWith(`「${l}」賞金`))).toBe(true);
    expect(n.body).not.toContain('権蔵「');
  });

  it('人だけの対局では何も足さない', () => {
    start(['human', 'human']);
    useGameStore.setState(st => ({ city: st.city && { ...st.city, destination: 'choshi' } }));
    const n = arrive(0, 'choshi').find(x => x.title.includes('一番乗り'))!;
    expect(n.body.startsWith('賞金')).toBe(true);
  });

  it('まちの出来事の火事で CPU の建物が焼けると、結果の文の頭にひとことが付く', () => {
    start(['human', 'cpu']);
    buildAt(1, 'choshi', [0], ['res']);
    const fire = CITY_EVENT_CARDS.find(c => c.id === 'c_fire')!;
    useGameStore.setState({ currentPlayerIndex: 1, currentCityEvent: fire, lastCityEventOutcome: null, turnPhase: 'city_event' });
    s().applyCityEventCard();
    const out = s().lastCityEventOutcome!;
    expect(out.disaster?.damages).toHaveLength(1);
    expect(CPU_LINES.steady.disaster.some(l => out.message.startsWith(`お松「${l}」`))).toBe(true);
    expect(out.message).toContain('被害');
  });

  it('人の建物だけが焼けたときは何も足さない', () => {
    start(['human', 'cpu']);
    buildAt(0, 'choshi', [0], ['res']);
    const fire = CITY_EVENT_CARDS.find(c => c.id === 'c_fire')!;
    useGameStore.setState({ currentPlayerIndex: 0, currentCityEvent: fire, lastCityEventOutcome: null, turnPhase: 'city_event' });
    s().applyCityEventCard();
    expect(s().lastCityEventOutcome!.message).not.toContain('「');
  });
});
