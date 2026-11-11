import { describe, it, expect, afterEach } from 'vitest';
import {
  QUEST_DEFS, QUEST_ECONOMY, QUEST_GROUPS, QUEST_GROUP_LABEL, QUEST_REGION_NAME, STAGE_PAIRS,
  createQuestCityState, drawQuests, drawStage, forceQuestDone, isQuestCatch, isQuestDrawTurn, isStageNode, openQuestYear,
  questAwardText, questDef, questDoneCount, questLabel, questPrize, questProgress, questRows, questYearOf,
  settleQuests, stageLabel, stageOf, tallyFirst, tallyFish, tallyWork,
} from './cityQuests';
import type { QuestId, QuestItem, QuestState } from './cityQuests';
import { build, createInitialCityState, distancesFrom, pickDestination, priceScale, getTownInfo, CITY_START_NODE } from './city';
import type { CityState } from './city';
import { SPECIALTY_IDS } from './citySpecialties';
import { BOARD_NODES, NODE_MAP } from '../data/boardNodes';
import { toRubySegments } from '../data/furigana';
import { random, setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';
import type { Region } from './types';

afterEach(() => resetRandomSource());

/** 乱数を呼んだ回数を数える */
function countingRandom(seed: number): { calls: () => number } {
  const base = mulberry32(seed);
  let n = 0;
  setRandomSource(() => {
    n++;
    return base();
  });
  return { calls: () => n };
}

function place(state: CityState, nodeId: string, plotIndex: number, kind: Parameters<typeof build>[3], owner = 0, level = 1): CityState {
  const r = build(state, nodeId, plotIndex, kind, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  if (level === 1) return r.state;
  const town = r.state.towns[nodeId];
  const plots = [...town.plots];
  plots[plotIndex] = { ...plots[plotIndex]!, level };
  return { ...r.state, towns: { ...r.state.towns, [nodeId]: { ...town, plots } } };
}

/** お題を決め打ちにした町の状態（乱数に頼らない） */
function withQuests(items: QuestItem[], playerCount = 2, year = 1, stage: Region[] = ['kanto', 'chubu']): CityState {
  const base = createInitialCityState();
  const quests: QuestState = {
    year, stage, items,
    tally: Array.from({ length: playerCount }, () => ({ built: 0, regions: [], firsts: 0, species: [] })),
  };
  return { ...base, quests };
}

const item = (id: QuestId, need: number, done: number[] = []): QuestItem => ({ id, need, done });

describe('お題: 候補の表', () => {
  it('建てる・駆け引き・くらしの3組があり、どの組にも1年目から引けるお題がある', () => {
    expect(QUEST_GROUPS).toEqual(['build', 'rival', 'life']);
    for (const g of QUEST_GROUPS) {
      expect(QUEST_GROUP_LABEL[g]).toBeTruthy();
      expect(QUEST_DEFS.some(d => d.group === g && d.fromYear === 1)).toBe(true);
    }
    expect(new Set(QUEST_DEFS.map(d => d.id)).size).toBe(QUEST_DEFS.length);
  });

  it('数は年ごとに減らない。町長と鉄道は2年目から', () => {
    for (const d of QUEST_DEFS) {
      expect(d.need.length).toBe(4);
      for (let i = 1; i < 4; i++) expect(d.need[i]).toBeGreaterThanOrEqual(d.need[i - 1]);
      expect(d.need[0]).toBeGreaterThanOrEqual(1);
    }
    expect(questDef('mayor').fromYear).toBe(2);
    expect(questDef('rail').fromYear).toBe(2);
  });

  it('お題の文・組の名前・舞台の名前の漢字には、すべてふりがなが振られる', () => {
    const KANJI = /[㐀-䶿一-鿿々]/;
    const texts = [
      ...QUEST_DEFS.flatMap(d => [...d.need.map(n => d.label(n)), d.short]),
      ...Object.values(QUEST_GROUP_LABEL),
      ...STAGE_PAIRS.map(p => stageLabel(p)),
      questAwardText({ playerIndex: 0, id: 'build_count', need: 5, prize: 4500, first: true }),
      // 画面の文（QuestChip・QuestSheet・QuestBurst・QuestNextYear・瓦版の見出し）
      'お題', '舞台', '今年の舞台', '年度', '今年度のお題', '来年度のお題', '来年度の舞台', '賞金', '最初の達成', '達成', '倍', 'お題達成！', '閉じる',
      '目的地は舞台の地方に出やすい',
      `誰でも達成できる。最初に達成した人は賞金${QUEST_ECONOMY.firstMul}倍。お題は4月に新しくなる。`,
      `最初に達成した人は賞金${QUEST_ECONOMY.firstMul}倍`,
    ];
    const missing = texts.flatMap(t => toRubySegments(t).filter(s => !s.r && KANJI.test(s.t)).map(s => `${s.t}（${t}）`));
    expect(missing).toEqual([]);
  });
});

describe('お題: 年度と賞金', () => {
  it('4月（1・13・25・37巡目）に引く。年度は12巡ごと', () => {
    expect([1, 13, 25, 37].every(isQuestDrawTurn)).toBe(true);
    expect([2, 12, 14, 24, 36].some(isQuestDrawTurn)).toBe(false);
    expect([1, 12, 13, 24, 25, 36, 37].map(questYearOf)).toEqual([1, 1, 2, 2, 3, 3, 4]);
  });

  it('賞金は ¥3,000 × 物価。最初に達成した人は1.5倍', () => {
    expect(questPrize(1, false)).toBe(QUEST_ECONOMY.prize * priceScale(1));
    expect(questPrize(1, true)).toBe(QUEST_ECONOMY.prize * priceScale(1) * QUEST_ECONOMY.firstMul);
    expect(questPrize(2, false)).toBe(QUEST_ECONOMY.prize * priceScale(13));
    expect(questPrize(3, true)).toBe(QUEST_ECONOMY.prize * priceScale(25) * QUEST_ECONOMY.firstMul);
    expect(questPrize(3, false)).toBeGreaterThan(questPrize(1, false)); // 年が進むと重くなる
  });
});

describe('今年の舞台', () => {
  it('舞台の組は盤の上で隣り合う地方で、どの組にも目的地の候補（県庁）が2つ以上ある', () => {
    expect(STAGE_PAIRS.length).toBeGreaterThanOrEqual(8);
    const capitals = BOARD_NODES.filter(n => n.type === 'capital');
    for (const pair of STAGE_PAIRS) {
      expect(pair[0]).not.toBe(pair[1]);
      expect(capitals.filter(n => pair.includes(n.region)).length).toBeGreaterThanOrEqual(2);
      expect(stageLabel(pair)).toBe(`${QUEST_REGION_NAME[pair[0]]}・${QUEST_REGION_NAME[pair[1]]}`);
    }
    // 8つの地方がどれかの組に入っている（どの地方も舞台になりうる）
    expect(new Set(STAGE_PAIRS.flat()).size).toBe(8);
  });

  it('1年目の舞台は出発地の地方を含む。乱数は1回', () => {
    const start = NODE_MAP.get(CITY_START_NODE)!.region;
    for (let seed = 1; seed <= 20; seed++) {
      const c = countingRandom(seed);
      expect(drawStage(undefined, start)).toContain(start);
      expect(c.calls()).toBe(1);
    }
  });

  it('次の年の舞台は、去年の舞台と重ならない', () => {
    for (const prev of STAGE_PAIRS) {
      for (let seed = 1; seed <= 10; seed++) {
        setRandomSource(mulberry32(seed));
        const next = drawStage(prev);
        expect(next.some(r => prev.includes(r))).toBe(false);
      }
    }
  });

  it('pickDestination は舞台を省くと今までと同じ結果で、乱数も1回', () => {
    // 今までの選び方: 6マス以上離れた県庁から、乱数1回で選ぶ
    const capitals = BOARD_NODES.filter(n => n.type === 'capital').map(n => n.id);
    const legacyPick = (current: string | null, from: string): string => {
      const dist = distancesFrom(from);
      const pool = capitals.filter(id => id !== current && id !== from && (dist.get(id) ?? 0) >= 6);
      const list = pool.length ? pool : capitals.filter(id => id !== current);
      return list[Math.floor(random() * list.length)];
    };
    for (let seed = 1; seed <= 20; seed++) {
      for (const [current, from] of [[null, 'tokyo'], ['osaka', 'osaka'], ['sapporo', 'naha']] as [string | null, string][]) {
        setRandomSource(mulberry32(seed));
        const expected = legacyPick(current, from);
        setRandomSource(mulberry32(seed));
        expect(pickDestination(current, from, 13).nodeId).toBe(expected);
      }
    }
    const c = countingRandom(3);
    pickDestination(null, 'tokyo');
    expect(c.calls()).toBe(1);
    pickDestination(null, 'tokyo', 1, { regions: [], rate: 1 }); // 空の舞台は無いのと同じ
    expect(c.calls()).toBe(2);
    pickDestination(null, 'tokyo', 1, { regions: ['kinki', 'chugoku'], rate: 0.7 });
    expect(c.calls()).toBe(4);
  });

  it('舞台を渡すと、目的地の約7割が舞台の地方になる（候補が無ければ全国から）', () => {
    setRandomSource(mulberry32(11));
    const stage: Region[] = ['kinki', 'chugoku'];
    const quests = withQuests([], 2, 1, stage).quests;
    let inStage = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const d = pickDestination(null, 'tokyo', 1, stageOf(quests));
      if (isStageNode(quests, d.nodeId)) inStage++;
    }
    // 7割は舞台から、残り3割は全国（その中にも舞台の県庁が混じる）
    expect(inStage / N).toBeGreaterThan(0.68);
    expect(inStage / N).toBeLessThan(0.85);
    // rate 1 なら必ず舞台。舞台の県庁が今いる所だけなら全国から選ぶ
    for (let i = 0; i < 50; i++) expect(isStageNode(quests, pickDestination(null, 'tokyo', 1, { regions: stage, rate: 1 }).nodeId)).toBe(true);
    expect(stageOf(undefined)).toBeUndefined();
  });
});

describe('お題: 引く', () => {
  it('組ごとに1つずつ、乱数3回で引く。1年目に町長と鉄道は出ない', () => {
    const city = createInitialCityState();
    const seen = new Set<QuestId>();
    for (let seed = 1; seed <= 60; seed++) {
      const c = countingRandom(seed);
      const items = drawQuests(city, 4, 1);
      expect(c.calls()).toBe(3);
      expect(items.map(i => questDef(i.id).group)).toEqual(QUEST_GROUPS);
      for (const it of items) {
        seen.add(it.id);
        expect(it.done).toEqual([]);
        expect(it.need).toBe(questDef(it.id).need[0]);
      }
    }
    expect(seen.has('mayor')).toBe(false);
    expect(seen.has('rail')).toBe(false);
    // 1年目に引けるお題は、60回も引けば全部出る
    expect(seen.size).toBe(QUEST_DEFS.filter(d => d.fromYear === 1).length);
  });

  it('2年目からは町長と鉄道も出る。数は年の表のとおり。去年と同じお題は続かない', () => {
    const city = createInitialCityState();
    const seen = new Set<QuestId>();
    for (let seed = 1; seed <= 80; seed++) {
      setRandomSource(mulberry32(seed));
      const prev = drawQuests(city, 4, 1).map(i => i.id);
      const items = drawQuests(city, 4, 2, prev);
      for (const it of items) {
        seen.add(it.id);
        expect(it.need).toBe(questDef(it.id).need[1]);
        expect(prev).not.toContain(it.id);
      }
    }
    expect(seen.has('mayor')).toBe(true);
    expect(seen.has('rail')).toBe(true);
  });

  it('もう届いている人がいるお題は引かない。どれも届いていたら、いちばん多い人より1つ多い数にする', () => {
    // 席0が名産を2つ持っている → 2年目（数2）の「名産」は引かれない
    let city = createInitialCityState();
    city = { ...city, specialties: { [SPECIALTY_IDS[0]]: 0, [SPECIALTY_IDS[1]]: 0 } };
    for (let seed = 1; seed <= 60; seed++) {
      setRandomSource(mulberry32(seed));
      expect(drawQuests(city, 2, 2).map(i => i.id)).not.toContain('specialty');
    }
    // くらしの組: 去年が「釣り」なら残りは「幸福な町」だけ。届いている人がいれば数を上げる
    const town = 'yokohama';
    city = place(place(place(createInitialCityState(), town, 0, 'park', 1), town, 1, 'park', 1), town, 2, 'res', 1);
    setRandomSource(mulberry32(1));
    const life = drawQuests(city, 2, 1, ['fish_species'])[2];
    expect(life.id).toBe('happy_towns');
    const have = questProgress(city, 'happy_towns', 1);
    expect(have).toBeGreaterThanOrEqual(1);
    expect(life.need).toBe(have + 1);
  });

  it('openQuestYear は舞台とお題を引き直し、今年ぶんの数を空に戻す（乱数は4回）', () => {
    setRandomSource(mulberry32(5));
    let city = createQuestCityState(3);
    city = tallyWork(city, 0, 'tokyo', true);
    city = tallyFirst(city, 1);
    const prev = city.quests!;
    const c = countingRandom(9);
    const next = openQuestYear(city, 2, 3);
    expect(c.calls()).toBe(4);
    const q = next.quests!;
    expect(q.year).toBe(2);
    expect(q.stage.some(r => prev.stage.includes(r))).toBe(false);
    expect(q.items.length).toBe(3);
    expect(q.tally).toEqual([0, 1, 2].map(() => ({ built: 0, regions: [], firsts: 0, species: [] })));
    expect(next.towns).toBe(city.towns); // お題のほかは変えない
  });

  it('お題の無い古いセーブでも、次の4月に引ける', () => {
    setRandomSource(mulberry32(2));
    const old = createInitialCityState();
    expect(old.quests).toBeUndefined();
    expect(settleQuests(old, 2)).toEqual({ city: old, awards: [] });
    expect(tallyWork(old, 0, 'tokyo', true)).toBe(old);
    expect(questRows(old, 2)).toEqual([]);
    const next = openQuestYear(old, 3, 2);
    expect(next.quests!.year).toBe(3);
    expect(next.quests!.items.map(i => i.need)).toEqual(next.quests!.items.map(i => questDef(i.id).need[2]));
  });

  it('新しい対局は1年目のお題と舞台つきで始まる（乱数は 舞台1 + 目的地2 + お題3）', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const c = countingRandom(seed);
      const city = createQuestCityState(4);
      expect(c.calls()).toBe(6);
      const q = city.quests!;
      expect(q.year).toBe(1);
      expect(q.stage).toContain(NODE_MAP.get(CITY_START_NODE)!.region);
      expect(q.items.length).toBe(3);
      expect(q.tally.length).toBe(4);
      expect(city.destination).toBeTruthy();
    }
  });
});

describe('お題: 数える', () => {
  it('建てた数と、工事をした地方を数える（同じ地方は1回）', () => {
    let city = withQuests([item('build_count', 5), item('build_regions', 3)]);
    city = tallyWork(city, 0, 'tokyo', true);
    city = tallyWork(city, 0, 'yokohama', true);
    city = tallyWork(city, 0, 'yokohama'); // 再開発・買収などは建てた数に入れない
    city = tallyWork(city, 0, 'osaka');
    expect(questProgress(city, 'build_count', 0)).toBe(2);
    expect(city.quests!.tally[0].regions).toEqual([getTownInfo('tokyo')!.region, getTownInfo('osaka')!.region]);
    expect(questProgress(city, 'build_regions', 0)).toBe(2);
    expect(questProgress(city, 'build_count', 1)).toBe(0);
    // 変わらないときは同じ状態を返す
    expect(tallyWork(city, 0, 'osaka')).toBe(city);
  });

  it('一番乗りの回数を数える', () => {
    let city = withQuests([item('dest_first', 2)]);
    city = tallyFirst(tallyFirst(city, 1), 1);
    expect(questProgress(city, 'dest_first', 1)).toBe(2);
    expect(questProgress(city, 'dest_first', 0)).toBe(0);
  });

  it('釣った種類を数える。祭りの名物釣り・出来事でもらった魚は入れない', () => {
    expect(isQuestCatch({})).toBe(true);
    expect(isQuestCatch({ via: 'tairyou' })).toBe(true);
    expect(isQuestCatch({ via: 'capital' })).toBe(false);
    expect(isQuestCatch({ via: 'event' })).toBe(false);
    let city = withQuests([item('fish_species', 3)]);
    city = tallyFish(city, 0, [{ fishId: 'aji' }, { fishId: 'saba', via: 'tairyou' }, { fishId: 'aji', via: 'tairyou' }]);
    city = tallyFish(city, 0, [{ fishId: 'tai', via: 'capital' }, { fishId: 'maguro', via: 'event' }, { fishId: 'saba' }]);
    expect(city.quests!.tally[0].species).toEqual(['aji', 'saba']);
    expect(questProgress(city, 'fish_species', 0)).toBe(2);
  });

  it('持ち物のお題: 等級3・発展度・名産・独占・町長・線路・幸福な町', () => {
    let city = withQuests([]);
    // 等級3
    city = place(city, 'tokyo', 0, 'res', 0, 3);
    city = place(city, 'tokyo', 1, 'com', 0, 2);
    city = place(city, 'tokyo', 2, 'res', 1, 3);
    expect(questProgress(city, 'level3', 0)).toBe(1);
    expect(questProgress(city, 'level3', 1)).toBe(1);
    // 発展度: 自分の建物がある町だけ足す
    city = { ...city, towns: { ...city.towns, tokyo: { ...city.towns.tokyo, tier: 2 }, osaka: { ...city.towns.osaka, tier: 3 } } };
    expect(questProgress(city, 'tier_sum', 0)).toBe(2);
    city = place(city, 'osaka', 0, 'res', 0);
    expect(questProgress(city, 'tier_sum', 0)).toBe(5);
    // 名産・線路
    city = { ...city, specialties: { [SPECIALTY_IDS[0]]: 0, [SPECIALTY_IDS[1]]: 1, [SPECIALTY_IDS[2]]: 0 }, rails: { r_tokyo_yokohama: 1 } };
    expect(questProgress(city, 'specialty', 0)).toBe(2);
    expect(questProgress(city, 'rail', 1)).toBe(1);
    expect(questProgress(city, 'rail', 0)).toBe(0);
    // 独占と町長: 村（3区画）を席1がすべて持つ
    const village = BOARD_NODES.find(n => getTownInfo(n.id)?.cls === 'village')!.id;
    const plots = city.towns[village].plots.length;
    for (let i = 0; i < plots; i++) city = place(city, village, i, 'res', 1);
    expect(questProgress(city, 'monopoly', 1)).toBe(1);
    expect(questProgress(city, 'mayor', 1)).toBeGreaterThanOrEqual(1);
    expect(questProgress(city, 'monopoly', 0)).toBe(0);
  });

  it('幸福な町: 幸福度7以上の町に建物を持っている数', () => {
    let city = withQuests([item('happy_towns', 1)]);
    city = place(city, 'yokohama', 0, 'res', 0);
    const before = questProgress(city, 'happy_towns', 0);
    city = place(place(city, 'yokohama', 1, 'park', 1), 'yokohama', 2, 'park', 1);
    // 公園2つで幸福度が上がる（発電所が無くても 5 + 6 − 3 = 8）
    expect(questProgress(city, 'happy_towns', 0)).toBe(before + 1);
    expect(questProgress(city, 'happy_towns', 1)).toBe(1);
  });
});

describe('お題: 達成の判定と賞金', () => {
  it('数に届いた人が達成する。最初の人は1.5倍、後の人は等倍。1人1回だけ', () => {
    let city = withQuests([item('build_count', 2), item('dest_first', 1), item('fish_species', 3)]);
    city = tallyWork(city, 0, 'tokyo', true);
    expect(settleQuests(city, 2).awards).toEqual([]);
    expect(settleQuests(city, 2).city).toBe(city);
    city = tallyWork(city, 0, 'tokyo', true);
    const a = settleQuests(city, 2);
    expect(a.awards).toEqual([{ playerIndex: 0, id: 'build_count', need: 2, first: true, prize: questPrize(1, true) }]);
    expect(a.city.quests!.items[0].done).toEqual([0]);
    expect(questDoneCount(a.city.quests, 0)).toBe(1);
    // もう一度判定しても増えない
    expect(settleQuests(a.city, 2).awards).toEqual([]);
    // 後から届いた人は等倍
    let city2 = tallyWork(tallyWork(a.city, 1, 'osaka', true), 1, 'osaka', true);
    const b = settleQuests(city2, 2);
    expect(b.awards).toEqual([{ playerIndex: 1, id: 'build_count', need: 2, first: false, prize: questPrize(1, false) }]);
    expect(b.city.quests!.items[0].done).toEqual([0, 1]);
    city2 = b.city;
    expect(questRows(city2, 2)[0].open).toBe(false);
    expect(questRows(city2, 2)[0].prize).toBe(questPrize(1, false));
    expect(questRows(city2, 2)[1].open).toBe(true);
    expect(questRows(city2, 2)[1].prize).toBe(questPrize(1, true));
  });

  it('同じ判定で何人か届いたら、全員が最初の達成になる', () => {
    let city = withQuests([item('dest_first', 1)], 3);
    city = tallyFirst(tallyFirst(city, 0), 2);
    const r = settleQuests(city, 3);
    expect(r.awards.map(a => [a.playerIndex, a.first])).toEqual([[0, true], [2, true]]);
    expect(r.city.quests!.items[0].done).toEqual([0, 2]);
  });

  it('賞金は年度の物価で決まる。達成した後で持ち物が減っても取り消さない', () => {
    let city = withQuests([item('specialty', 1)], 2, 3);
    city = { ...city, specialties: { [SPECIALTY_IDS[0]]: 1 } };
    const r = settleQuests(city, 2);
    expect(r.awards[0].prize).toBe(questPrize(3, true));
    // 名産を買い取られても達成のまま
    const lost = { ...r.city, specialties: { [SPECIALTY_IDS[0]]: 0 } };
    const again = settleQuests(lost, 2);
    expect(again.city.quests!.items[0].done).toEqual([1, 0]);
    expect(again.awards).toEqual([{ playerIndex: 0, id: 'specialty', need: 1, first: false, prize: questPrize(3, false) }]);
    const rows = questRows(again.city, 2);
    expect(rows[0].progress[1]).toBe(1); // 達成した人の棒は減らない
    expect(rows[0].label).toBe(questLabel({ id: 'specialty', need: 1 }));
  });

  it('お知らせの文に、お題と賞金と「最初の達成」が入る', () => {
    const first = questAwardText({ playerIndex: 0, id: 'build_count', need: 5, prize: 4500, first: true });
    expect(first).toContain('今年、建物を5軒建てる');
    expect(first).toContain('¥4,500');
    expect(first).toContain('最初の達成');
    expect(questAwardText({ playerIndex: 0, id: 'rail', need: 3, prize: 6000, first: false })).not.toContain('最初の達成');
  });

  it('開発用: まだのお題を1つ達成にできる', () => {
    const city = withQuests([item('build_count', 5, [0]), item('dest_first', 1), item('fish_species', 3)]);
    const r = forceQuestDone(city, 0)!;
    expect(r.award).toEqual({ playerIndex: 0, id: 'dest_first', need: 1, first: true, prize: questPrize(1, true) });
    expect(questDoneCount(r.city.quests, 0)).toBe(2);
    const all = forceQuestDone(forceQuestDone(r.city, 0)!.city, 0);
    expect(all).toBeNull();
    expect(forceQuestDone(createInitialCityState(), 0)).toBeNull();
  });
});
