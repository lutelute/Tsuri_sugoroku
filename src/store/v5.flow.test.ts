// v5 の4機能（鉄道・町長と条例・復興）がストアを通して働くことを確かめる。
// 純粋なロジックは src/game/railways.test.ts・mayor.test.ts・recovery.test.ts にある。ここはストアへのつなぎ込みだけを見る。
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
import { CITY_DEFAULT_MONTHS, CITY_START_NODE, RECOVERY, drawCityEvent } from '../game/city';
import { RAIL_ECONOMY, railPrice } from '../game/railways';
import { mayorOf } from '../game/mayor';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

const RAIL = 'r_tokyo_yokohama';
const s = () => useGameStore.getState();

function start(seed = 7) {
  setRandomSource(mulberry32(seed));
  s().startGame({
    playerCount: 2,
    playerNames: ['あなた', 'となり'],
    playerUids: [null, null],
    maxTurns: CITY_DEFAULT_MONTHS,
    mode: 'city',
    playerKinds: ['human', 'human'],
  });
}

/** 手番の人を東京から横浜へ動かす（線路があれば出目1で届く） */
function moveToYokohama(dice: number) {
  s().rollDice(dice);
  if (s().turnPhase === 'path_selection') {
    const idx = s().reachableNodes.findIndex(p => p[p.length - 1] === 'yokohama');
    expect(idx).toBeGreaterThanOrEqual(0);
    s().selectPath(idx);
  }
  expect(s().players[s().currentPlayerIndex].currentNode).toBe('yokohama');
}

beforeEach(() => start());
afterEach(() => resetRandomSource());

describe('鉄道（ストア）', () => {
  it('自分の建物がある町の隣に線路を敷ける。工事1回と代金を使う', () => {
    expect(s().players[0].currentNode).toBe(CITY_START_NODE);
    expect(s().cityLayRail(RAIL)).toBe('自分の建物がある町でだけ敷ける');
    expect(s().cityBuild(0, 'res')).toBeNull();
    const money = s().players[0].money;
    expect(s().cityLayRail(RAIL)).toBeNull();
    expect(s().city!.rails).toEqual({ [RAIL]: 0 });
    expect(s().players[0].money).toBe(money - railPrice(RAIL));
    expect(s().cityActionsThisTurn).toBe(2);
    // 工事の回数を使い切ったら敷けない
    expect(s().cityLayRail('r_nagano_tokyo')).toMatch(/工事は/);
  });

  it('線路のある中継マスは歩数を使わずに通り抜け、そこには止まれない', () => {
    s().devCityCheat('rail');
    s().rollDice(1);
    const ends = s().turnPhase === 'path_selection'
      ? s().reachableNodes.map(p => p[p.length - 1])
      : [s().players[0].currentNode];
    expect(ends).toContain('yokohama'); // 線路がなければ出目1では中継マスまで
    for (const id of ends) expect(s().city!.rails?.[id]).toBeUndefined();
  });

  it('他人の線路を通ると運賃を持ち主へ払う。自分の線路はただ', () => {
    s().devCityCheat('rail'); // 席0の線路
    const own = s().players[0].money;
    moveToYokohama(1);
    expect(s().players[0].money).toBe(own);

    useGameStore.setState({ currentPlayerIndex: 1, turnPhase: 'idle' });
    const [a, b] = s().players.map(p => p.money);
    moveToYokohama(1);
    expect(s().players[1].money).toBe(b - RAIL_ECONOMY.fare);
    expect(s().players[0].money).toBe(a + RAIL_ECONOMY.fare);
    expect(s().noticeQueue.concat(s().cityToast ? [{ kind: 'city', title: s().cityToast!.title, body: s().cityToast!.body }] : []).some(n => 'title' in n && n.title.includes('汽車'))).toBe(true);
  });
});

describe('町長と条例（ストア）', () => {
  it('町長は条例を決められる（工事の回数は使わない）。1か月に1回まで、やめた直後にも出せない', () => {
    expect(s().cityEnact('tax')).toBe('条例を決められるのは町長だけ');
    s().devCityCheat('mayor');
    expect(mayorOf(s().city!.towns[CITY_START_NODE])).toBe(0);
    expect(s().cityEnact('tax')).toBeNull();
    expect(s().city!.towns[CITY_START_NODE].ordinance).toMatchObject({ kind: 'tax', by: 0 });
    expect(s().cityActionsThisTurn).toBe(0);
    expect(s().cityEnact('scenery')).toBe('条例は1か月に1回まで');
    expect(s().cityEnact(null)).toBe('条例は1か月に1回まで');
    // 次の月にやめる → 同じ月に別の条例は出せない
    useGameStore.setState({ turn: s().turn + 1 });
    expect(s().cityEnact(null)).toBeNull();
    expect(s().cityEnact('scenery')).toBe('条例は1か月に1回まで');
    // 工事を使い切っていても、条例は決められる
    useGameStore.setState({ turn: s().turn + 1, cityActionsThisTurn: 99 });
    expect(s().cityEnact('scenery')).toBeNull();
  });
});

describe('復興（ストア）', () => {
  it('まちの出来事の災害: 被害の残った町は復興特需になり、全壊には見舞金が出る', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40 && checked < 3; seed++) {
      start(seed);
      s().devCityCheat('mayor'); // 東京を席0の住宅で埋める
      const card = { ...drawCityEvent('bad'), id: 'test_quake', effect: { kind: 'disaster' as const, disaster: 'quake' as const } };
      useGameStore.setState({ currentCityEvent: card, lastCityEventOutcome: null, turnPhase: 'city_event' });
      const before = s().players[0].money;
      s().applyCityEventCard();
      const damages = s().lastCityEventOutcome?.disaster?.damages ?? [];
      if (!damages.length) continue;
      checked++;
      for (const d of damages) expect(s().city!.towns[d.nodeId].recovery).toBe(RECOVERY.months);
      const destroyed = damages.some(d => d.destroyed && d.owner === 0);
      if (destroyed) expect(s().players[0].money).toBeGreaterThan(before);
      else expect(s().players[0].money).toBe(before);
      expect(s().lastCityEventOutcome?.message).toContain('復興特需');
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('最終決算（ストア）', () => {
  /** 最後の月の、最後の人の手番を終える */
  function finishLastTurn(maxTurns: number) {
    useGameStore.setState(st => ({ settings: { ...st.settings, maxTurns }, turn: maxTurns, currentPlayerIndex: st.players.length - 1, turnPhase: 'turn_end' }));
    s().nextPlayer();
  }

  it('最後の月は結果画面へ飛ばず、大決算を最終決算として出す。閉じると結果発表へ', () => {
    finishLastTurn(CITY_DEFAULT_MONTHS);
    expect(s().screen).toBe('game');
    expect(s().turnPhase).toBe('city_yearend');
    expect(s().cityYearEnd?.final).toBe(true);
    expect(s().cityYearEnd?.ranking).toHaveLength(2);
    s().acknowledgeCityYearEnd();
    expect(s().screen).toBe('result');
    expect(s().gameOver).toBe(true);
  });

  it('3月で終わらない局でも最終決算が出る。早送りで閉じても結果発表へ進む', () => {
    finishLastTurn(10); // 1月で終わる局
    expect(s().turnPhase).toBe('city_yearend');
    expect(s().cityYearEnd?.final).toBe(true);
    s().skipMonthEnd();
    expect(s().screen).toBe('result');
  });

  it('途中の年度末は今までどおり次の年度へ進む', () => {
    useGameStore.setState({ turn: 12, currentPlayerIndex: 1, turnPhase: 'turn_end' });
    s().nextPlayer();
    expect(s().turnPhase).toBe('city_yearend');
    expect(s().cityYearEnd?.final).toBeFalsy();
    s().acknowledgeCityYearEnd();
    expect(s().screen).toBe('game');
    expect(s().turnPhase).toBe('idle');
    expect(s().turn).toBe(13);
  });
});
