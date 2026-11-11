// お題と今年の舞台（game/cityQuests.ts）がストアを通して働くことを確かめる。
// 数え方・判定・賞金の中身は src/game/cityQuests.test.ts にある。ここはストアへのつなぎ込みだけを見る。
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
import { runMonthEnd, planMonthEndDisplay } from './game/monthEnd';
import { CITY_DEFAULT_MONTHS, CITY_START_NODE, buildCost, createInitialCityState } from '../game/city';
import { questPrize, questLabel, isStageNode } from '../game/cityQuests';
import type { QuestId, QuestItem } from '../game/cityQuests';
import { SPECIALTY_IDS } from '../game/citySpecialties';
import { NODE_MAP } from '../data/boardNodes';
import { FISH_DATABASE } from '../data/fishDatabase';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

const s = () => useGameStore.getState();
const item = (id: QuestId, need: number, done: number[] = []): QuestItem => ({ id, need, done });

function start(kinds: ('human' | 'cpu')[] = ['human', 'human'], seed = 7) {
  setRandomSource(mulberry32(seed));
  s().startGame({
    playerCount: kinds.length,
    playerNames: kinds.map((k, i) => (k === 'cpu' ? `シーピーユー${i}` : i === 0 ? 'あなた' : 'となり')),
    playerUids: kinds.map(() => null),
    maxTurns: CITY_DEFAULT_MONTHS,
    mode: 'city',
    playerKinds: kinds,
  });
}

/** お題を決め打ちにする（乱数に頼らない） */
function setQuests(items: QuestItem[]) {
  const city = s().city!;
  useGameStore.setState({ city: { ...city, quests: { ...city.quests!, items } } });
}

/** 上部に出ている・順番待ちの瓦版の見出し */
function noticeTitles(): string[] {
  const st = s();
  return [...(st.cityToast ? [st.cityToast.title] : []), ...st.noticeQueue.flatMap(n => (n.kind === 'city' ? [n.title] : []))];
}

beforeEach(() => start());
afterEach(() => resetRandomSource());

describe('お題（ストア）: 対局の始まり', () => {
  it('新しい対局は、1年目のお題3つと今年の舞台つきで始まる。舞台は出発地の地方を含む', () => {
    const q = s().city!.quests!;
    expect(q.year).toBe(1);
    expect(q.items.length).toBe(3);
    expect(q.items.every(i => i.done.length === 0)).toBe(true);
    expect(q.tally.length).toBe(2);
    expect(isStageNode(q, CITY_START_NODE)).toBe(true);
    expect(s().city!.destination).toBeTruthy();
  });

  it('釣り旅にはお題が無い', () => {
    s().startGame({ playerCount: 1, playerNames: ['あなた'], playerUids: [null], maxTurns: 30 });
    expect(s().city).toBeNull();
  });
});

describe('お題（ストア）: 手番の中で数えて、その場で達成', () => {
  it('建てた瞬間に達成: 賞金（最初は1.5倍）が入り、「達成」の判子の合図が出る（同じ中身の瓦版は重ねない）', () => {
    setQuests([item('build_count', 2), item('dest_first', 9), item('fish_species', 9)]);
    expect(s().cityBuild(0, 'res')).toBeNull();
    expect(s().city!.quests!.tally[0].built).toBe(1);
    expect(s().city!.quests!.last).toBeUndefined();
    const money = s().players[0].money;
    const cost = buildCost('res', CITY_START_NODE, s().city!.towns[CITY_START_NODE]);
    expect(s().cityBuild(1, 'res')).toBeNull();
    const q = s().city!.quests!;
    expect(q.items[0].done).toEqual([0]);
    // 2軒目の建設費を引いたうえで、賞金が足されている
    expect(s().players[0].money).toBe(money - cost + questPrize(1, true));
    expect(q.last).toEqual({ seq: 1, awards: [{ playerIndex: 0, id: 'build_count', need: 2, first: true, prize: questPrize(1, true) }] });
    expect(noticeTitles().some(t => t.includes('お題達成'))).toBe(false);
  });

  it('賞金はちょうど1回だけ入る（後から建てても増えない）', () => {
    setQuests([item('build_count', 1), item('dest_first', 9), item('fish_species', 9)]);
    const before = s().players[0].money;
    const cost = buildCost('park', CITY_START_NODE, s().city!.towns[CITY_START_NODE]);
    expect(s().cityBuild(0, 'park')).toBeNull();
    expect(s().players[0].money).toBe(before - cost + questPrize(1, true));
    expect(s().cityBuild(1, 'park')).toBeNull();
    // 2軒目は建設費だけ減る（賞金は入らない）
    expect(s().players[0].money).toBe(before - cost * 2 + questPrize(1, true));
    expect(s().city!.quests!.last!.seq).toBe(1);
  });

  it('再開発・名産の買い物も「工事をした地方」に数える（建てた数には入れない）', () => {
    setQuests([item('build_regions', 9), item('specialty', 9), item('fish_species', 9)]);
    useGameStore.setState(st => ({ players: st.players.map(p => ({ ...p, money: 500000 })) }));
    expect(s().cityBuySpecialty()).toBeNull();
    const t = s().city!.quests!.tally[0];
    expect(t.built).toBe(0);
    expect(t.regions).toEqual([NODE_MAP.get(CITY_START_NODE)!.region]);
  });

  it('目的地の一番乗りを数え、次の目的地は今年の舞台に寄せて選ぶ', () => {
    setQuests([item('build_count', 9), item('dest_first', 1), item('fish_species', 9)]);
    const money = s().players[0].money;
    const reward = s().city!.destinationReward;
    s().devCityCheat('dest');
    s().executeNodeAction();
    const q = s().city!.quests!;
    expect(q.tally[0].firsts).toBe(1);
    expect(q.items[1].done).toEqual([0]);
    expect(s().players[0].money).toBe(money + reward + questPrize(1, true)); // 目的地の賞金と、お題の賞金
    expect(noticeTitles().some(t => t.includes('一番乗り'))).toBe(true);
    expect(q.last!.awards.map(a => a.id)).toEqual(['dest_first']);
    // 舞台に寄せる（7割）: 種を変えて何度か一番乗りすると、舞台の県庁が半分より多く選ばれる
    let inStage = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      start(['human', 'human'], 100 + i);
      s().devCityCheat('dest');
      s().executeNodeAction();
      if (isStageNode(s().city!.quests, s().city!.destination!)) inStage++;
    }
    expect(inStage / N).toBeGreaterThan(0.5);
  });

  it('釣った魚の種類を数える。数に届けばその場で達成', () => {
    setQuests([item('build_count', 9), item('dest_first', 9), item('fish_species', 2)]);
    const [a, b] = FISH_DATABASE;
    s().catchFish({ fishId: a.id, caughtAt: CITY_START_NODE, turn: 1, size: 1 });
    s().catchFish({ fishId: a.id, caughtAt: CITY_START_NODE, turn: 1, size: 1 }); // 同じ種類は1つ
    expect(s().city!.quests!.tally[0].species).toEqual([a.id]);
    expect(s().city!.quests!.items[2].done).toEqual([]);
    s().catchFish({ fishId: a.id, caughtAt: CITY_START_NODE, turn: 1, size: 1 }, [{ fishId: b.id, caughtAt: CITY_START_NODE, turn: 1, size: 1, via: 'tairyou' }]);
    expect(s().city!.quests!.tally[0].species).toEqual([a.id, b.id]);
    expect(s().city!.quests!.items[2].done).toEqual([0]);
    expect(s().city!.quests!.last!.awards[0].id).toBe('fish_species');
  });

  it('CPU は達成したら受け取るだけ（賞金と瓦版。判子の合図は出さない）。瓦版にお題と賞金が出る', () => {
    start(['cpu', 'human']);
    setQuests([item('build_count', 1), item('dest_first', 9), item('fish_species', 9)]);
    const money = s().players[0].money;
    const cost = buildCost('park', CITY_START_NODE, s().city!.towns[CITY_START_NODE]);
    expect(s().cityBuild(0, 'park')).toBeNull();
    expect(s().city!.quests!.items[0].done).toEqual([0]);
    expect(s().city!.quests!.last).toBeUndefined();
    expect(s().players[0].money).toBe(money - cost + questPrize(1, true));
    expect(noticeTitles()).toContain(`${s().players[0].name}：お題達成！`);
    const bodies = [s().cityToast?.body ?? '', ...s().noticeQueue.flatMap(n => (n.kind === 'city' ? [n.body] : []))].join('／');
    expect(bodies).toContain(questLabel({ id: 'build_count', need: 1 }));
    expect(bodies).toContain(`¥${questPrize(1, true).toLocaleString()}`);
  });

  it('DevPanel の「お題を1つ達成」: 賞金と判子の合図が出る', () => {
    const money = s().players[0].money;
    s().devCityCheat('quest');
    const q = s().city!.quests!;
    expect(q.items[0].done).toEqual([0]);
    expect(q.last!.seq).toBe(1);
    expect(s().players[0].money).toBe(money + questPrize(1, true));
    s().devCityCheat('quest');
    s().devCityCheat('quest');
    s().devCityCheat('quest'); // 4つ目は無い（何も起きない）
    expect(s().city!.quests!.last!.seq).toBe(3);
    expect(s().players[0].money).toBe(money + questPrize(1, true) * 3);
  });
});

describe('お題（ストア）: 月末', () => {
  const players = () => s().players;

  it('手番の外で数に届いたお題（発展度・幸福度・町長の交代など）は月末に判定し、決算の見出しとお知らせに出す', () => {
    setQuests([item('specialty', 1), item('dest_first', 9), item('fish_species', 9)]);
    // 手番の中の判定を通らずに持ち物が変わった状態にする（月末の成長や悪さで数に届いたのと同じ）
    const city = { ...s().city!, specialties: { [SPECIALTY_IDS[0]]: 0 } };
    const m = runMonthEnd({ city, cards: s().cityCards, players: players(), fromTurn: 1, toTurn: 2, titleHistory: [] });
    expect(m.report!.questDone).toEqual([{ playerIndex: 0, id: 'specialty', need: 1, first: true, prize: questPrize(1, true) }]);
    expect(m.report!.headlines.some(h => h.startsWith('お題達成: あなた'))).toBe(true);
    expect(m.city.quests!.items[0].done).toEqual([0]);
    // 月の収支（名産の収入）のほかに、賞金が入っている。決算の収入には賞金を含めない
    const net = m.report!.players[0].net;
    expect(m.players[0].money).toBe(Math.max(0, players()[0].money + net) + questPrize(1, true));
    expect(m.players[1].money).toBe(Math.max(0, players()[1].money + m.report!.players[1].net));
    const display = planMonthEndDisplay(m.report, m.yearEnd, m.binboEvent, m.binboBecame, m.players);
    expect(display.notices.some(n => n.kind === 'city' && n.title === 'あなた：お題達成！')).toBe(true);
  });

  it('3月の月末に、来年度のお題と舞台を引き直す（年度末の大決算で見せる）。今年ぶんの数は空に戻る', () => {
    expect(s().cityBuild(0, 'park')).toBeNull();
    const before = s().city!.quests!;
    expect(before.tally[0].built).toBe(1);
    const m11 = runMonthEnd({ city: s().city!, cards: s().cityCards, players: players(), fromTurn: 11, toTurn: 12, titleHistory: [] });
    expect(m11.city.quests!.year).toBe(1); // 2月の月末は引かない
    const m = runMonthEnd({ city: s().city!, cards: s().cityCards, players: players(), fromTurn: 12, toTurn: 13, titleHistory: [] });
    expect(m.yearEnd?.year).toBe(1);
    const q = m.city.quests!;
    expect(q.year).toBe(2);
    expect(q.stage.some(r => before.stage.includes(r))).toBe(false);
    expect(q.items.every(i => i.done.length === 0)).toBe(true);
    expect(q.tally.every(t => t.built === 0 && t.firsts === 0 && t.regions.length === 0 && t.species.length === 0)).toBe(true);
  });

  it('対局の最後の月は引き直さない（最終決算に来年度のお題は出ない）', () => {
    const m = runMonthEnd({ city: s().city!, cards: s().cityCards, players: players(), fromTurn: 36, toTurn: 37, titleHistory: [], finalTurn: 36 });
    expect(m.yearEnd?.final).toBe(true);
    expect(m.city.quests!.year).toBe(1);
  });

  it('お題の無い古いセーブは、次の4月に引く。それまでは何も起きない', () => {
    const old = createInitialCityState();
    useGameStore.setState({ city: old });
    expect(s().cityBuild(0, 'park')).toBeNull(); // お題が無くても工事はできる
    expect(s().city!.quests).toBeUndefined();
    const m5 = runMonthEnd({ city: s().city!, cards: s().cityCards, players: players(), fromTurn: 17, toTurn: 18, titleHistory: [] });
    expect(m5.city.quests).toBeUndefined();
    const m = runMonthEnd({ city: s().city!, cards: s().cityCards, players: players(), fromTurn: 24, toTurn: 25, titleHistory: [] });
    expect(m.city.quests!.year).toBe(3);
    expect(m.city.quests!.items.length).toBe(3);
  });

  it('手番を回して年度をまたぐと、ストアのお題が2年目になる', () => {
    useGameStore.setState({ turn: 12, currentPlayerIndex: 1, turnPhase: 'turn_end' });
    s().nextPlayer();
    expect(s().turn).toBe(13);
    expect(s().turnPhase).toBe('city_yearend');
    expect(s().cityYearEnd?.year).toBe(1);
    expect(s().city!.quests!.year).toBe(2); // 大決算の画面で「来年度のお題」として見せる
  });
});
