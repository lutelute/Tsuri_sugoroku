import { describe, it, expect, afterEach } from 'vitest';
import {
  CARD_IDS, CARD_INFO, MAX_HAND, SHOP_CARDS, SLOW_CAP, SLOW_TURNS,
  createCardState, drawCard, addCard, removeCard, buyCard, canUseAt, hasCardShop,
  playCard, useCardEffect, diceCap, isSlowed, tickSlow, consumeInsurance, consumeLandGrab, hasInsurance, hasLandGrab,
  landGrabPrice, pickWarpDestination, emptyPlotIndex, suggestFreeBuildKind, freeBuild, protectInsured,
  clampDiceCount, rollDiceFaces, chooseCpuCard,
} from './cityCards';
import type { CardState, CityCardId } from './cityCards';
import { createInitialCityState, build, applyDisaster, acquireCost, plotValue, getTownInfo, TOWN_IDS } from './city';
import type { CityState, BuildingKind } from './city';
import { setRandomSource, resetRandomSource, mulberry32, randomInt } from '../utils/random';

afterEach(() => resetRandomSource());

function withHand(n: number, pi: number, cards: CityCardId[]): CardState {
  let cs = createCardState(n);
  for (const c of cards) cs = addCard(cs, pi, c).cs;
  return cs;
}

function place(s: CityState, id: string, i: number, k: BuildingKind, owner: number, level = 1): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  if (level === 1) return r.state;
  const plots = [...r.state.towns[id].plots];
  plots[i] = { ...plots[i]!, level };
  return { ...r.state, towns: { ...r.state.towns, [id]: { ...r.state.towns[id], plots } } };
}

function ok(r: ReturnType<typeof playCard>) {
  if ('error' in r) throw new Error(r.error);
  return r;
}

describe('カードの表', () => {
  it('8種類あり、特急と誘致は売っていない', () => {
    expect(CARD_IDS).toHaveLength(8);
    expect(CARD_INFO.tokkyu.price).toBeNull();
    expect(CARD_INFO.yuchi.price).toBeNull();
    expect(SHOP_CARDS).not.toContain('tokkyu');
    expect(SHOP_CARDS).not.toContain('yuchi');
    expect(SHOP_CARDS).toHaveLength(6);
    // 安い順
    const prices = SHOP_CARDS.map(id => CARD_INFO[id].price!);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('使える場面: 地上げはどちらでも、工事券・誘致は町の中だけ', () => {
    expect(canUseAt('jiage', 'before_roll')).toBe(true);
    expect(canUseAt('jiage', 'in_town')).toBe(true);
    expect(canUseAt('kojiken', 'before_roll')).toBe(false);
    expect(canUseAt('yuchi', 'in_town')).toBe(true);
    expect(canUseAt('kyuko', 'in_town')).toBe(false);
    expect(canUseAt('hoken', 'before_roll')).toBe(true);
  });

  it('カード売り場は大都市と商都だけ', () => {
    expect(hasCardShop('tokyo')).toBe(getTownInfo('tokyo')?.cls === 'metro');
    const shops = TOWN_IDS.filter(hasCardShop);
    expect(shops.length).toBeGreaterThan(0);
    for (const id of shops) expect(['metro', 'market']).toContain(getTownInfo(id)?.cls);
    expect(hasCardShop('no_such_node')).toBe(false);
  });
});

describe('引く・手札', () => {
  it('rngValue の端でも表の中のカードを返す', () => {
    expect(drawCard(0)).toBe('kyuko');
    expect(drawCard(0.9999999)).toBe('yuchi');
    expect(CARD_IDS).toContain(drawCard(1));
    expect(CARD_IDS).toContain(drawCard(-5));
    expect(CARD_IDS).toContain(drawCard(Number.NaN));
  });

  it('非売品（特急・誘致）は急行より出にくい', () => {
    setRandomSource(mulberry32(7));
    const n: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const c = drawCard();
      n[c] = (n[c] ?? 0) + 1;
    }
    expect(n.tokkyu).toBeLessThan(n.kyuko / 2);
    expect(n.yuchi).toBeLessThan(n.kyuko / 2);
    for (const id of CARD_IDS) expect(n[id]).toBeGreaterThan(0);
  });

  it('手札は4枚まで。5枚目で一番古い札を捨てる', () => {
    let cs = createCardState(2);
    const cards: CityCardId[] = ['kyuko', 'hoken', 'gyuho', 'jiage'];
    for (const c of cards) {
      const r = addCard(cs, 0, c);
      expect(r.discarded).toBeUndefined();
      cs = r.cs;
    }
    expect(cs.hands[0]).toEqual(cards);
    const r = addCard(cs, 0, 'tokkyu');
    expect(r.discarded).toBe('kyuko');
    expect(r.cs.hands[0]).toEqual(['hoken', 'gyuho', 'jiage', 'tokkyu']);
    expect(r.cs.hands[0]).toHaveLength(MAX_HAND);
    // 他の人の手札と元の状態は変わらない
    expect(r.cs.hands[1]).toEqual([]);
    expect(cs.hands[0]).toEqual(cards);
  });

  it('removeCard は指定の1枚だけを除く（範囲外はそのまま）', () => {
    const cs = withHand(2, 1, ['kyuko', 'hoken', 'kyuko']);
    expect(removeCard(cs, 1, 1).hands[1]).toEqual(['kyuko', 'kyuko']);
    expect(removeCard(cs, 1, 9)).toBe(cs);
    expect(removeCard(cs, 5, 0)).toBe(cs);
  });

  it('buyCard: 売値を払って手札に加える。非売品・満杯・お金不足は買えない', () => {
    const cs = createCardState(2);
    const r = buyCard(cs, 0, 'kyuko', 2000);
    expect('error' in r).toBe(false);
    if (!('error' in r)) {
      expect(r.cost).toBe(1500);
      expect(r.cs.hands[0]).toEqual(['kyuko']);
    }
    expect(buyCard(cs, 0, 'tokkyu', 99999)).toEqual({ error: expect.stringContaining('売っていない') });
    expect(buyCard(cs, 0, 'kyuko', 1000)).toEqual({ error: 'お金が足りない' });
    const full = withHand(2, 0, ['hoken', 'hoken', 'hoken', 'hoken']);
    expect(buyCard(full, 0, 'buttobi', 99999)).toEqual({ error: expect.stringContaining('手札がいっぱい') });
  });
});

describe('カードを使う', () => {
  it('useCardEffect は playCard の別名', () => {
    expect(useCardEffect).toBe(playCard);
  });

  it('急行・特急: サイコロの個数を返し、札が手札から消える', () => {
    const cs = withHand(2, 0, ['kyuko', 'tokkyu']);
    const a = ok(playCard(cs, 0, 0));
    expect(a.effect).toEqual({ kind: 'dice', count: 2 });
    expect(a.card).toBe('kyuko');
    expect(a.cs.hands[0]).toEqual(['tokkyu']);
    const b = ok(playCard(a.cs, 0, 0));
    expect(b.effect).toEqual({ kind: 'dice', count: 3 });
    expect(b.cs.hands[0]).toEqual([]);
  });

  it('急行の後に急行は重ねられない（特急なら上乗せできる）', () => {
    const cs = withHand(2, 0, ['kyuko', 'tokkyu']);
    expect(playCard(cs, 0, 0, undefined, { pendingDice: 2 })).toEqual({ error: expect.stringContaining('サイコロ2個') });
    expect(ok(playCard(cs, 0, 1, undefined, { pendingDice: 2 })).effect).toEqual({ kind: 'dice', count: 3 });
  });

  it('場面違いは弾き、札は減らない', () => {
    const cs = withHand(2, 0, ['kojiken', 'kyuko']);
    expect(playCard(cs, 0, 0, undefined, { timing: 'before_roll' })).toEqual({ error: expect.stringContaining('町の画面') });
    expect(playCard(cs, 0, 1, undefined, { timing: 'in_town' })).toEqual({ error: expect.stringContaining('サイコロを振る前') });
    expect(cs.hands[0]).toHaveLength(2);
    expect(ok(playCard(cs, 0, 0, undefined, { timing: 'in_town' })).effect).toEqual({ kind: 'build_bonus', extra: 2 });
  });

  it('手札に無い番号はエラー', () => {
    expect(playCard(createCardState(2), 0, 0)).toEqual({ error: 'そのカードは手札にない' });
    expect(playCard(createCardState(2), 7, 0)).toEqual({ error: 'そのカードは手札にない' });
  });

  it('ぶっとび: warp を返す。行き先は今いる町以外の町', () => {
    expect(ok(playCard(withHand(1, 0, ['buttobi']), 0, 0)).effect).toEqual({ kind: 'warp' });
    for (const v of [0, 0.3, 0.9999]) {
      const to = pickWarpDestination('tokyo', v);
      expect(to).not.toBe('tokyo');
      expect(TOWN_IDS).toContain(to);
    }
    setRandomSource(mulberry32(3));
    for (let i = 0; i < 50; i++) expect(pickWarpDestination('osaka')).not.toBe('osaka');
  });

  it('牛歩: 相手が必要（自分は不可）。相手の出目の上限が2になり、2ターンで解ける', () => {
    const cs = withHand(3, 0, ['gyuho']);
    expect(playCard(cs, 0, 0)).toEqual({ error: expect.stringContaining('相手') });
    expect(playCard(cs, 0, 0, 0)).toEqual({ error: expect.stringContaining('相手') });
    expect(playCard(cs, 0, 0, 5)).toEqual({ error: 'その相手はいない' });

    const r = ok(playCard(cs, 0, 0, 2));
    expect(r.effect).toEqual({ kind: 'slow', target: 2 });
    let s = r.cs;
    expect(diceCap(s, 2)).toBe(SLOW_CAP);
    expect(diceCap(s, 1)).toBeNull();
    expect(diceCap(s, 0)).toBeNull();
    // 他の人のターン終わりでは減らない
    s = tickSlow(s, 1);
    expect(isSlowed(s, 2)).toBe(true);
    for (let t = 0; t < SLOW_TURNS - 1; t++) s = tickSlow(s, 2);
    expect(isSlowed(s, 2)).toBe(true);
    s = tickSlow(s, 2);
    expect(isSlowed(s, 2)).toBe(false);
    expect(s.slow).toEqual([]);
  });

  it('牛歩を重ねると残りが2ターンに戻る（増えはしない）', () => {
    let cs = withHand(2, 0, ['gyuho', 'gyuho']);
    cs = ok(playCard(cs, 0, 0, 1)).cs;
    cs = tickSlow(cs, 1);
    expect(cs.slow).toEqual([{ playerIndex: 1, turnsLeft: 1 }]);
    cs = ok(playCard(cs, 0, 0, 1)).cs;
    expect(cs.slow).toEqual([{ playerIndex: 1, turnsLeft: SLOW_TURNS }]);
  });

  it('牛歩中は急行・特急を使えない', () => {
    let cs = withHand(2, 1, ['gyuho']);
    cs = ok(playCard(cs, 1, 0, 0)).cs;
    cs = addCard(cs, 0, 'kyuko').cs;
    expect(playCard(cs, 0, 0)).toEqual({ error: expect.stringContaining('牛歩中') });
  });

  it('地上げ: 1回分が有効になり、買収で消費。値段は1.5倍でなく1.1倍', () => {
    const cs = withHand(2, 0, ['jiage', 'jiage']);
    const r = ok(playCard(cs, 0, 0, undefined, { timing: 'in_town' }));
    expect(r.effect).toEqual({ kind: 'land_grab' });
    expect(hasLandGrab(r.cs, 0)).toBe(true);
    expect(playCard(r.cs, 0, 0)).toEqual({ error: expect.stringContaining('地上げ') });
    const c = consumeLandGrab(r.cs, 0);
    expect(c.used).toBe(true);
    expect(hasLandGrab(c.cs, 0)).toBe(false);
    expect(consumeLandGrab(c.cs, 0).used).toBe(false);

    const s = place(createInitialCityState(), 'tokyo', 0, 'res', 1, 2);
    const plot = s.towns.tokyo.plots[0]!;
    const v = plotValue(plot, 'tokyo', s.towns.tokyo);
    expect(landGrabPrice(v)).toBe(Math.round((v * 1.1) / 100) * 100);
    expect(landGrabPrice(v)).toBeLessThan(acquireCost(plot, 'tokyo', s.towns.tokyo));
  });

  it('保険: 入るのは1回分まで。consumeInsurance で外れる', () => {
    const cs = withHand(2, 1, ['hoken', 'hoken']);
    const r = ok(playCard(cs, 1, 0));
    expect(r.effect).toEqual({ kind: 'insurance' });
    expect(hasInsurance(r.cs, 1)).toBe(true);
    expect(playCard(r.cs, 1, 0)).toEqual({ error: expect.stringContaining('保険') });
    const c = consumeInsurance(r.cs, 1);
    expect(c.used).toBe(true);
    expect(hasInsurance(c.cs, 1)).toBe(false);
    expect(consumeInsurance(c.cs, 1).used).toBe(false);
  });

  it('誘致: 空き区画が無ければ弾く。ただで等級1が建つ', () => {
    const cs = withHand(2, 0, ['yuchi']);
    expect(playCard(cs, 0, 0, undefined, { hasEmptyPlot: false })).toEqual({ error: expect.stringContaining('空き区画') });
    expect(ok(playCard(cs, 0, 0, undefined, { hasEmptyPlot: true, timing: 'in_town' })).effect).toEqual({ kind: 'free_build' });

    const s = createInitialCityState();
    const idx = emptyPlotIndex(s, 'tokyo');
    expect(idx).toBe(0);
    const kind = suggestFreeBuildKind(s, 'tokyo', idx);
    expect(kind).not.toBeNull();
    const b = freeBuild(s, 'tokyo', idx, kind!, 0, 3);
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.cost).toBe(0);
      expect(b.state.towns.tokyo.plots[idx]).toMatchObject({ kind, level: 1, owner: 0, builtTurn: 3 });
      expect(b.message).toContain('誘致');
    }
    expect(emptyPlotIndex(s, 'no_such_town')).toBe(-1);
  });

  it('町が満杯なら空き区画は -1、誘致の建物も選べない', () => {
    let s = createInitialCityState();
    const n = s.towns.tokyo.plots.length;
    for (let i = 0; i < n; i++) s = place(s, 'tokyo', i, 'res', 0);
    expect(emptyPlotIndex(s, 'tokyo')).toBe(-1);
    expect(suggestFreeBuildKind(s, 'tokyo', 0)).toBeNull();
  });
});

describe('保険で災害を防ぐ', () => {
  function setup() {
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 0, 3);
    s = place(s, 'tokyo', 1, 'com', 1, 3);
    s = place(s, 'yokohama', 0, 'res', 0, 2);
    return s;
  }

  it('保険に入っている人の建物だけ元に戻り、その人の保険を消費する', () => {
    const before = setup();
    setRandomSource(() => 0); // 必ず当たる
    const { state: after, report } = applyDisaster(before, 'quake', { region: 'kanto' });
    expect(report.damages.some(d => d.owner === 0)).toBe(true);
    expect(report.damages.some(d => d.owner === 1)).toBe(true);

    const cs: CardState = { ...createCardState(3), insured: [0, 2] };
    const r = protectInsured(before, after, report, cs);
    expect(r.protectedPlayers).toEqual([0]);
    expect(r.city.towns.tokyo.plots[0]).toEqual(before.towns.tokyo.plots[0]);
    expect(r.city.towns.yokohama.plots[0]).toEqual(before.towns.yokohama.plots[0]);
    // 保険の無い人はそのまま壊れる
    expect(r.city.towns.tokyo.plots[1]).toEqual(after.towns.tokyo.plots[1]);
    expect(r.report.damages.every(d => d.owner !== 0)).toBe(true);
    expect(r.report.damages.length).toBeGreaterThan(0);
    // 被害の無かった人（2）の保険は残る
    expect(r.cs.insured).toEqual([2]);
  });

  it('発展度など町の情報を落とさない', () => {
    let before = setup();
    before = { ...before, towns: { ...before.towns, tokyo: { ...before.towns.tokyo, tier: 1, land: 1.1, base: before.towns.tokyo.plots.length } } };
    setRandomSource(() => 0);
    const { state: after, report } = applyDisaster(before, 'quake', { region: 'kanto' });
    const r = protectInsured(before, after, report, { ...createCardState(2), insured: [0] });
    expect(r.city.towns.tokyo.tier).toBe(1);
    expect(r.city.towns.tokyo.land).toBe(1.1);
  });

  it('誰も保険に入っていなければ何も変えない', () => {
    const before = setup();
    setRandomSource(() => 0);
    const { state: after, report } = applyDisaster(before, 'quake', { region: 'kanto' });
    const cs = createCardState(2);
    const r = protectInsured(before, after, report, cs);
    expect(r.city).toBe(after);
    expect(r.report).toBe(report);
    expect(r.cs).toBe(cs);
    expect(r.protectedPlayers).toEqual([]);
  });
});

describe('サイコロ', () => {
  it('個数は1〜3に収める', () => {
    expect(clampDiceCount(undefined)).toBe(1);
    expect(clampDiceCount(null)).toBe(1);
    expect(clampDiceCount(0)).toBe(1);
    expect(clampDiceCount(2)).toBe(2);
    expect(clampDiceCount(3.7)).toBe(3);
    expect(clampDiceCount(9)).toBe(3);
    expect(clampDiceCount(Number.NaN)).toBe(1);
  });

  it('1個・上限なしは randomInt(1,6) を1回呼ぶのと同じ出目', () => {
    setRandomSource(mulberry32(11));
    const expected = Array.from({ length: 20 }, () => randomInt(1, 6));
    setRandomSource(mulberry32(11));
    const got = Array.from({ length: 20 }, () => rollDiceFaces(1)[0]);
    expect(got).toEqual(expected);
  });

  it('複数個は個数ぶんの出目。牛歩の上限は1個ずつに効く', () => {
    setRandomSource(mulberry32(5));
    for (let i = 0; i < 200; i++) {
      const three = rollDiceFaces(3);
      expect(three).toHaveLength(3);
      for (const v of three) expect(v).toBeGreaterThanOrEqual(1);
      for (const v of three) expect(v).toBeLessThanOrEqual(6);
      const slow = rollDiceFaces(1, SLOW_CAP);
      expect(slow[0]).toBeGreaterThanOrEqual(1);
      expect(slow[0]).toBeLessThanOrEqual(SLOW_CAP);
    }
    // 上限0以下や NaN は無視
    expect(rollDiceFaces(1, 0)[0]).toBeLessThanOrEqual(6);
    expect(rollDiceFaces(1, Number.NaN)[0]).toBeLessThanOrEqual(6);
  });
});

describe('CPU の判断', () => {
  const base = { distToDestination: 10, money: 5000, isInTown: false, opponents: [{ index: 1, distToDestination: 20 }] };

  it('手札が無ければ使わない', () => {
    expect(chooseCpuCard(createCardState(2), 0, base)).toBeNull();
  });

  it('目的地が遠ければ急行、もっと遠ければ特急', () => {
    expect(chooseCpuCard(withHand(2, 0, ['hoken']), 0, { ...base })).toEqual({ index: 0 });
    expect(chooseCpuCard(withHand(2, 0, ['kyuko']), 0, { ...base, distToDestination: 4 })).toBeNull();
    expect(chooseCpuCard(withHand(2, 0, ['kyuko']), 0, base)).toEqual({ index: 0 });
    expect(chooseCpuCard(withHand(2, 0, ['kyuko', 'tokkyu']), 0, { ...base, distToDestination: 16 })).toEqual({ index: 1 });
    // すでにサイコロが増えていれば重ねない
    expect(chooseCpuCard(withHand(2, 0, ['kyuko']), 0, { ...base, pendingDice: 2 })).toBeNull();
  });

  it('自分より目的地に近い相手に牛歩', () => {
    const cs = withHand(3, 0, ['gyuho']);
    const ctx = { ...base, opponents: [{ index: 1, distToDestination: 15 }, { index: 2, distToDestination: 5 }] };
    expect(chooseCpuCard(cs, 0, ctx)).toEqual({ index: 0, target: 2 });
    // すでに牛歩中の相手には重ねない
    const slowed: CardState = { ...cs, slow: [{ playerIndex: 2, turnsLeft: 1 }] };
    expect(chooseCpuCard(slowed, 0, { ...ctx, opponents: [{ index: 2, distToDestination: 5 }] })).toBeNull();
  });

  it('牛歩中は急行を使わない', () => {
    const cs: CardState = { ...withHand(2, 0, ['kyuko']), slow: [{ playerIndex: 0, turnsLeft: 2 }] };
    expect(chooseCpuCard(cs, 0, base)).toBeNull();
  });

  it('町の中: 誘致 → 地上げ（買いたい物があれば）→ 工事券（お金があれば）', () => {
    const town = { ...base, isInTown: true };
    expect(chooseCpuCard(withHand(2, 0, ['kyuko', 'yuchi']), 0, town)).toEqual({ index: 1 });
    expect(chooseCpuCard(withHand(2, 0, ['yuchi']), 0, { ...town, hasEmptyPlot: false })).toBeNull();
    expect(chooseCpuCard(withHand(2, 0, ['jiage']), 0, { ...town, wantsAcquire: true })).toEqual({ index: 0 });
    expect(chooseCpuCard(withHand(2, 0, ['jiage']), 0, town)).toBeNull();
    expect(chooseCpuCard(withHand(2, 0, ['kojiken']), 0, town)).toEqual({ index: 0 });
    expect(chooseCpuCard(withHand(2, 0, ['kojiken']), 0, { ...town, money: 1000 })).toBeNull();
    // 町の中では移動カードを使わない
    expect(chooseCpuCard(withHand(2, 0, ['kyuko', 'buttobi']), 0, { ...town, distToDestination: 30 })).toBeNull();
  });

  it('CPU が選んだカードは playCard で使える', () => {
    setRandomSource(mulberry32(21));
    for (let trial = 0; trial < 200; trial++) {
      const hand = Array.from({ length: 1 + (trial % 4) }, () => drawCard());
      const cs = withHand(3, 0, hand);
      const isInTown = trial % 2 === 0;
      const ctx = {
        distToDestination: trial % 30,
        money: (trial * 997) % 15000,
        isInTown,
        opponents: [{ index: 1, distToDestination: (trial * 7) % 25 }, { index: 2, distToDestination: (trial * 3) % 25 }],
      };
      const pick = chooseCpuCard(cs, 0, ctx);
      if (!pick) continue;
      const r = playCard(cs, 0, pick.index, pick.target, { timing: isInTown ? 'in_town' : 'before_roll' });
      expect('error' in r ? r.error : null).toBeNull();
    }
  });
});
