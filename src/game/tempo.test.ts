import { describe, it, expect } from 'vitest';
import {
  pushNotice, noticeDurationMs, isNotableMonth, showBinboFullScreen, hasActionChoices, tempoScale, scaled,
  NOTICE_QUEUE_MAX, TOAST_MS, TOAST_BUSY_MS, TOAST_MIN_MS, BINBO_TOAST_MS, CPU_SKIP_SCALE, CPU_SPEED_SCALE,
} from './tempo';
import type { Notice } from './tempo';

const city = (title: string, body = '本文', important = false): Notice => ({ kind: 'city', title, body, important });
const binbo: Notice = { kind: 'binbo', reason: 'pass', playerIndex: 1, great: false };

describe('tempo: 速さの倍率', () => {
  it('人の手番は常に等倍、CPU は設定の倍率、早送り中はさらに速い', () => {
    expect(tempoScale(false, 'fast', true)).toBe(1);
    expect(tempoScale(true, 'slow', false)).toBe(CPU_SPEED_SCALE.slow);
    expect(tempoScale(true, 'normal', false)).toBe(CPU_SPEED_SCALE.normal);
    expect(tempoScale(true, 'slow', true)).toBe(CPU_SKIP_SCALE);
    expect(CPU_SPEED_SCALE.slow).toBeGreaterThan(CPU_SPEED_SCALE.normal);
    expect(CPU_SPEED_SCALE.normal).toBeGreaterThan(CPU_SPEED_SCALE.fast);
    expect(CPU_SPEED_SCALE.fast).toBeGreaterThan(CPU_SKIP_SCALE);
  });

  it('倍率を掛けても 0 にはならない', () => {
    expect(scaled(1000, 0.5)).toBe(500);
    expect(scaled(10, 0.01)).toBeGreaterThan(0);
  });
});

describe('tempo: お知らせの順番待ち', () => {
  it('後ろに積む', () => {
    expect(pushNotice([city('一')], city('二')).map(n => (n.kind === 'city' ? n.title : ''))).toEqual(['一', '二']);
  });

  it('同じ見出しが続くときは本文をつなぎ、まったく同じものは重ねない', () => {
    const q = pushNotice(pushNotice([city('CPU：建設', 'A')], city('CPU：建設', 'B')), city('CPU：建設', 'B'));
    expect(q).toHaveLength(1);
    expect(q[0].kind === 'city' && q[0].body).toBe('A／B');
  });

  it('溢れたら古い瓦版から捨て、貧乏神と大事な瓦版は残す', () => {
    let q: Notice[] = [binbo, city('大事', '人の手番', true)];
    for (let i = 0; i < 6; i++) q = pushNotice(q, city(`CPU${i}`));
    expect(q).toHaveLength(NOTICE_QUEUE_MAX);
    expect(q[0]).toEqual(binbo);
    expect(q[1].kind === 'city' && q[1].title).toBe('大事');
    expect(q.slice(2).map(n => (n.kind === 'city' ? n.title : ''))).toEqual(['CPU4', 'CPU5']);
  });

  it('捨ててよいものが無ければ上限を超えても捨てない（貧乏神・大事なお知らせは必ず出す）', () => {
    let q: Notice[] = [];
    for (let i = 0; i < NOTICE_QUEUE_MAX + 2; i++) q = pushNotice(q, { ...binbo, playerIndex: i });
    expect(q).toHaveLength(NOTICE_QUEUE_MAX + 2);
  });

  it('見せる時間: 待ちがあれば短く、CPU の速さで縮むが下限は守る', () => {
    expect(noticeDurationMs('city', 0, 1)).toBe(TOAST_MS);
    expect(noticeDurationMs('city', 2, 1)).toBe(TOAST_BUSY_MS);
    expect(noticeDurationMs('binbo', 0, 1)).toBe(BINBO_TOAST_MS);
    expect(noticeDurationMs('city', 0, 0.01)).toBe(TOAST_MIN_MS);
    expect(noticeDurationMs('city', 0, 0.5)).toBeLessThan(TOAST_MS);
  });
});

describe('tempo: 月末の割り込み', () => {
  const quiet = { disasters: [], players: [{ declined: 0, vacated: 0 }, { declined: 0, vacated: 0 }] };

  it('何も起きない月・成長だけの月は全画面にしない', () => {
    expect(isNotableMonth(null, [0])).toBe(false);
    expect(isNotableMonth(quiet, [0])).toBe(false);
    expect(isNotableMonth({ ...quiet, disasters: [{ damages: [] }] }, [0])).toBe(false); // 被害のなかった災害
  });

  it('災害で壊れた建物がある月は、誰の建物でも全画面', () => {
    expect(isNotableMonth({ ...quiet, disasters: [{ damages: [{}] }] }, [0])).toBe(true);
  });

  it('衰退・空き家は人の席のものだけ全画面（CPU だけの対局なら全員を見る）', () => {
    const cpuDeclined = { disasters: [], players: [{ declined: 0, vacated: 0 }, { declined: 1, vacated: 0 }] };
    const humanVacated = { disasters: [], players: [{ declined: 0, vacated: 1 }, { declined: 0, vacated: 0 }] };
    expect(isNotableMonth(cpuDeclined, [0])).toBe(false);
    expect(isNotableMonth(humanVacated, [0])).toBe(true);
    expect(isNotableMonth(cpuDeclined, [])).toBe(true);
    expect(isNotableMonth(cpuDeclined, [0, 1])).toBe(true);
  });

  it('貧乏神の寸劇は人がとりつかれた月・大貧乏神に化けた月・CPU だけの対局で見せる', () => {
    expect(showBinboFullScreen(false, false, true)).toBe(true);
    expect(showBinboFullScreen(true, true, true)).toBe(true);
    expect(showBinboFullScreen(true, false, false)).toBe(true);
    expect(showBinboFullScreen(true, false, true)).toBe(false);
  });
});

describe('tempo: 行動選択の自動終了', () => {
  it('まちづくりは町にいるときだけ選べる（町の画面を開き直せる）', () => {
    expect(hasActionChoices({ isCity: true, inTown: true, fishingNode: false, fishingLeft: false })).toBe(true);
    expect(hasActionChoices({ isCity: true, inTown: false, fishingNode: false, fishingLeft: false })).toBe(false);
  });

  it('釣り旅は釣り場でまだ釣れるときだけ選べる（店・イベント・休憩所・中継マスの後は自動で終える）', () => {
    expect(hasActionChoices({ isCity: false, inTown: false, fishingNode: true, fishingLeft: true })).toBe(true);
    expect(hasActionChoices({ isCity: false, inTown: false, fishingNode: true, fishingLeft: false })).toBe(false);
    expect(hasActionChoices({ isCity: false, inTown: false, fishingNode: false, fishingLeft: true })).toBe(false);
  });
});
