import { describe, it, expect, afterEach } from 'vitest';
import { rankPaths, describePath, topPaths, pathContextOf, pathAim, ADVICE_TOP } from './pathAdvice';
import type { RankedPath } from './pathAdvice';
import { chooseCpuPath, scorePath, pathScoreParts } from './cpuAI';
import type { PathContext } from './cpuAI';
import { createInitialCityState, build, visitorFees } from './city';
import type { CityState, BuildingKind } from './city';
import { RAIL_ECONOMY } from './railways';
import type { Player, GameState } from './types';
import { createInitialEquipment } from './equipment';
import { NODE_MAP } from '../data/boardNodes';
import { getReachableNodes } from '../utils/pathfinding';
import { toRubySegments } from '../data/furigana';
import { setRandomSource, resetRandomSource } from '../utils/random';

function makePlayer(over: Partial<Player> = {}): Player {
  return {
    id: 0, name: 'たろう', color: '#fff', currentNode: 'tokyo', money: 20000,
    equipment: createInitialEquipment(), caughtFish: [], score: 0, hasFinished: false, finishOrder: null,
    skipNextTurn: false, extraTurn: false, fishBonusMultiplier: 1, fishBonusTurnsLeft: 0, ...over,
  };
}

function place(s: CityState, id: string, i: number, k: BuildingKind, owner = 0): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

function cityCtx(over: Partial<PathContext> = {}): PathContext {
  return {
    paths: [], mode: 'city', player: makePlayer(), playerIndex: 0,
    city: { ...createInitialCityState(), destination: null, destinationReward: 0 },
    turn: 1, maxTurns: 36, goalClaims: [], ...over,
  };
}

function fishingCtx(over: Partial<PathContext> = {}): PathContext {
  return { paths: [], mode: 'fishing', player: makePlayer({ currentNode: 'start' }), playerIndex: 0, city: null, turn: 5, maxTurns: 80, goalClaims: [], ...over };
}

const TOWARD = ['tokyo', 'r_nagano_tokyo', 'nagano'];
const AWAY = ['tokyo', 'r_choshi_tokyo', 'choshi'];

afterEach(() => resetRandomSource());

describe('行き先のおすすめ: まちづくり', () => {
  it('目的地がいちばん上で、理由は「目的地に着く」', () => {
    const city = { ...createInitialCityState(), destination: 'nagano', destinationReward: 5000 };
    const ranked = rankPaths(cityCtx({ city, paths: [AWAY, TOWARD] }));
    expect(ranked[0].index).toBe(1);
    expect(ranked[0].nodeId).toBe('nagano');
    expect(ranked[0].tag.kind).toBe('destination');
    expect(ranked[0].tag.label).toBe('目的地に着く');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('目的地に近づく道は「目的地に近づく」', () => {
    const city = { ...createInitialCityState(), destination: 'osaka', destinationReward: 5000 };
    // お金がなくて建てられないので、理由は近づくことだけ
    const ranked = rankPaths(cityCtx({ city, paths: [AWAY, TOWARD], player: makePlayer({ money: 0 }) }));
    expect(ranked[0].nodeId).toBe('nagano');
    expect(ranked[0].tag.kind).toBe('toward');
    expect(ranked[0].hasReason).toBe(true);
  });

  it('空き地があってお金が足りる町は「建てられる町」、足りなければただの町', () => {
    const rich = describePath(cityCtx({ paths: [AWAY] }), 0);
    expect(rich.tag.kind).toBe('build');
    const poor = describePath(cityCtx({ paths: [AWAY], player: makePlayer({ money: 0 }) }), 0);
    expect(poor.hasReason).toBe(false);
    expect(poor.tag.kind).toBe('town');
    expect(poor.tags).toEqual([]);
  });

  it('他人の店の町には注意の札（買い物代・額つき）が付き、点が下がる', () => {
    const plain = cityCtx({ paths: [AWAY] });
    const withShop = cityCtx({ paths: [AWAY], city: place(plain.city!, 'choshi', 0, 'com', 1) });
    const fee = visitorFees(withShop.city!, 'choshi', 0, 20000).total;
    expect(fee).toBeGreaterThan(0);
    const r = describePath(withShop, 0);
    expect(r.warns).toHaveLength(1);
    expect(r.warns[0]).toMatchObject({ kind: 'fee', amount: fee });
    expect(r.warns[0].label).toBe(`買い物代 ¥${fee.toLocaleString()}`);
    expect(r.score).toBeLessThan(describePath(plain, 0).score);
    // 自分の店なら注意は出ない
    expect(describePath(cityCtx({ paths: [AWAY], city: place(plain.city!, 'choshi', 0, 'com', 0) }), 0).warns).toEqual([]);
  });

  it('他人の線路を通る道には運賃の注意が付く', () => {
    const base = cityCtx({ paths: [AWAY] });
    const rails = { r_choshi_tokyo: 1 };
    const r = describePath({ ...base, city: { ...base.city!, rails } }, 0);
    expect(r.warns.map(w => w.kind)).toContain('fare');
    expect(r.warns.find(w => w.kind === 'fare')?.amount).toBe(RAIL_ECONOMY.fare);
    // 自分の線路なら出ない
    expect(describePath({ ...base, city: { ...base.city!, rails: { r_choshi_tokyo: 0 } } }, 0).warns).toEqual([]);
  });

  it('あと少しで独占の町は「独占まであと N 区画」', () => {
    let city = cityCtx().city!;
    const n = city.towns.choshi.plots.length;
    for (let i = 0; i < n - 1; i++) city = place(city, 'choshi', i, 'res', 0);
    const r = describePath(cityCtx({ paths: [AWAY], city }), 0);
    expect(r.tag.kind).toBe('monopoly');
    expect(r.tag.label).toBe('独占まであと1区画');
    expect(r.tags.map(t => t.kind)).toContain('inspect');
  });

  it('貧乏神がとりついていると、押し付けられる道に札が付く', () => {
    const ctx = cityCtx({ paths: [AWAY, TOWARD], player: makePlayer({ money: 0 }), binboHolder: 0, playerNodes: ['tokyo', 'r_choshi_tokyo'] });
    const ranked = rankPaths(ctx);
    expect(ranked[0].nodeId).toBe('choshi');
    expect(ranked[0].tag.kind).toBe('binbo');
    expect(ranked[1].tags.map(t => t.kind)).not.toContain('binbo');
  });

  it('村のマスは、点を上げる理由がなければ「カードがもらえる村」', () => {
    const village = [...NODE_MAP.values()].find(n => n.type === 'event_random')!;
    const r = describePath(cityCtx({ paths: [['tokyo', village.id]], player: makePlayer({ money: 0 }) }), 0);
    expect(r.tag.kind).toBe('card');
    const bad = [...NODE_MAP.values()].find(n => n.type === 'event_bad')!;
    expect(describePath(cityCtx({ paths: [['tokyo', bad.id]], player: makePlayer({ money: 0 }) }), 0).warns.map(w => w.kind)).toContain('bad');
  });
});

describe('行き先のおすすめ: 釣り旅', () => {
  it('凶のマスより名所が上で、凶には注意の札', () => {
    const ranked = rankPaths(fishingCtx({ paths: [['start', 'x', 'tottori'], ['start', 'y', 'choshi']] }));
    expect(NODE_MAP.get('choshi')?.type).toBe('fishing_special');
    expect(ranked[0].nodeId).toBe('choshi');
    expect(ranked[0].tag.kind).toBe('special');
    const bad = [...NODE_MAP.values()].find(n => n.type === 'event_bad')!;
    const r = describePath(fishingCtx({ paths: [['start', bad.id]] }), 0);
    expect(r.warns.map(w => w.kind)).toEqual(['bad']);
    expect(r.hasReason).toBe(false);
  });

  it('マスの種類ごとの札（釣り場・お祭り・釣具店・温泉・道）', () => {
    const first = (type: string) => [...NODE_MAP.values()].find(n => n.type === type)!.id;
    const kindOf = (type: string) => describePath(fishingCtx({ paths: [['start', first(type)]] }), 0).tag.kind;
    expect(kindOf('fishing')).toBe('fishing');
    expect(kindOf('capital')).toBe('festival');
    expect(kindOf('rest')).toBe('rest');
    expect(kindOf('route')).toBe('road');
    expect(kindOf('shop')).toBe('shop');
    // 道のマスは理由とは言わない（金の輪の2つ目・3つ目にしない）
    expect(describePath(fishingCtx({ paths: [['start', first('route')]] }), 0).hasReason).toBe(false);
  });

  it('終盤はゴールが上、序盤のゴールには「まだ早い」の注意', () => {
    const late = describePath(fishingCtx({ paths: [['naha', 'goal']], turn: 78, player: makePlayer({ currentNode: 'naha' }) }), 0);
    expect(late.tag.kind).toBe('goal');
    expect(late.warns).toEqual([]);
    const early = describePath(fishingCtx({ paths: [['naha', 'goal']], turn: 5, player: makePlayer({ currentNode: 'naha' }) }), 0);
    expect(early.warns.map(w => w.kind)).toEqual(['early_goal']);
  });
});

describe('並べ方', () => {
  it('点は CPU の道選びと同じで、乱数を使わない', () => {
    const city = { ...createInitialCityState(), destination: 'osaka', destinationReward: 5000 };
    const paths = getReachableNodes('tokyo', 4, ['osaka']);
    const ctx = cityCtx({ city, paths });
    setRandomSource(() => {
      throw new Error('rankPaths は乱数を使わない');
    });
    const ranked = rankPaths(ctx);
    expect(ranked).toHaveLength(paths.length);
    for (const r of ranked) {
      expect(r.score).toBe(scorePath(ctx, paths[r.index]));
      expect(r.score).toBe(pathScoreParts(ctx, paths[r.index]).reduce((s, p) => s + p.value, 0));
    }
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    // 2回呼んでも同じ順
    expect(rankPaths(ctx).map(r => r.index)).toEqual(ranked.map(r => r.index));
  });

  it('気まぐれが同じなら、CPU（堅実型）はおすすめのいちばん上を選ぶ', () => {
    setRandomSource(() => 0.5);
    const city = { ...createInitialCityState(), destination: 'osaka', destinationReward: 5000 };
    for (const steps of [2, 3, 5]) {
      const paths = getReachableNodes('tokyo', steps, ['osaka']);
      const ctx = cityCtx({ city, paths, player: makePlayer({ cpuStyle: 'steady' }) });
      const top = rankPaths(ctx)[0];
      const picked = chooseCpuPath(ctx);
      expect(scorePath(ctx, paths[picked])).toBe(top.score);
    }
  });

  it('地図に輪を出すのは上位3つまで。2つ目・3つ目は理由のあるものだけ', () => {
    const mk = (index: number, hasReason: boolean): RankedPath => ({ index, nodeId: `n${index}`, score: 10 - index, tag: { kind: 'road', label: '', short: '' }, tags: [], warns: [], hasReason });
    expect(topPaths([mk(0, false), mk(1, true), mk(2, false), mk(3, true)]).map(r => r.index)).toEqual([0, 1]);
    expect(topPaths([mk(0, true), mk(1, true), mk(2, true), mk(3, true)])).toHaveLength(ADVICE_TOP);
    expect(topPaths([])).toEqual([]);
  });

  it('ストアの状態から道選びの状況を作る（釣り旅は締め切りを最後の巡とみなす）', () => {
    const base = {
      players: [makePlayer(), makePlayer({ id: 1, currentNode: 'choshi' })],
      currentPlayerIndex: 1,
      reachableNodes: [AWAY],
      settings: { playerCount: 2, playerNames: [], playerUids: [], maxTurns: 80 },
      city: null,
      turn: 30,
      cityGoalClaims: [],
      firstFinishTurn: null,
    } satisfies Pick<GameState, 'players' | 'currentPlayerIndex' | 'reachableNodes' | 'settings' | 'city' | 'turn' | 'cityGoalClaims' | 'firstFinishTurn'>;
    const c = pathContextOf(base);
    expect(c).toMatchObject({ mode: 'fishing', playerIndex: 1, turn: 30, maxTurns: 80, binboHolder: null });
    expect(c.player.currentNode).toBe('choshi');
    expect(c.playerNodes).toEqual(['tokyo', 'choshi']);
    // 誰かがゴールしたら、締め切りが最後の巡
    expect(pathContextOf({ ...base, firstFinishTurn: 35 }).maxTurns).toBeLessThan(80);
    // 無制限（0）で誰もゴールしていなければ 0 のまま
    expect(pathContextOf({ ...base, settings: { ...base.settings, maxTurns: 0 } }).maxTurns).toBe(0);
    // まちづくりは月数そのまま
    const city = createInitialCityState();
    expect(pathContextOf({ ...base, city, settings: { ...base.settings, mode: 'city', maxTurns: 36 } })).toMatchObject({ mode: 'city', maxTurns: 36 });
  });
});

describe('札と狙いの文', () => {
  const KANJI = /[㐀-䶿一-鿿々]/;
  const unread = (text: string) => toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => `${s.t}（${text}）`);

  /** いろいろな場面の道を集める（札の種類をできるだけ出す） */
  function samples(): { ctx: PathContext; r: RankedPath }[] {
    const out: { ctx: PathContext; r: RankedPath }[] = [];
    const push = (ctx: PathContext) => ctx.paths.forEach((_, i) => out.push({ ctx, r: describePath(ctx, i) }));
    // まちづくり: 目的地・近づく・建てる・店・線路・独占・貧乏神・復興・空き家・村・ゴール
    let city: CityState = { ...createInitialCityState(), destination: 'nagano', destinationReward: 5000 };
    const n = city.towns.choshi.plots.length;
    for (let i = 0; i < n - 1; i++) city = place(city, 'choshi', i, 'res', 0);
    city = place(city, 'yokohama', 0, 'com', 1);
    city = { ...city, rails: { r_choshi_tokyo: 1 }, towns: { ...city.towns, kamakura: { ...city.towns.kamakura, recovery: 3 } } };
    city = place(city, 'kamakura', 0, 'res', 0);
    city = { ...city, towns: { ...city.towns, kamakura: { ...city.towns.kamakura, plots: city.towns.kamakura.plots.map(p => (p ? { ...p, lowMonths: 2 } : p)) } } };
    for (const steps of [1, 2, 3, 4, 6]) push(cityCtx({ city, paths: getReachableNodes('tokyo', steps, ['nagano']), binboHolder: 0, playerNodes: ['tokyo', 'r_choshi_tokyo'] }));
    push(cityCtx({ city, paths: [['naha', 'goal']], player: makePlayer({ currentNode: 'naha' }) }));
    for (const node of NODE_MAP.values()) {
      if (node.type.startsWith('event')) push(cityCtx({ city, paths: [['tokyo', node.id]], player: makePlayer({ money: 0 }) }));
    }
    // 釣り旅: すべての種類のマス、序盤と終盤
    const seen = new Set<string>();
    for (const node of NODE_MAP.values()) {
      if (seen.has(node.type)) continue;
      seen.add(node.type);
      push(fishingCtx({ paths: [['start', node.id]] }));
      push(fishingCtx({ paths: [['start', node.id]], turn: 78 }));
    }
    return out;
  }

  it('たくさんの種類の札が出る', () => {
    const kinds = new Set(samples().map(s => s.r.tag.kind));
    for (const k of ['destination', 'toward', 'build', 'monopoly', 'binbo', 'special', 'fishing', 'festival', 'shop', 'rest', 'goal', 'road', 'card'] as const) {
      expect(kinds, k).toContain(k);
    }
  });

  it('札・注意・狙いの文の漢字にはすべてふりがなが振られる（道の名前は除く）', () => {
    const texts = new Set<string>();
    for (const { ctx, r } of samples()) {
      // 短い札（short）は地図の中（SVG）に出すだけなので、ふりがなの対象外
      for (const t of [r.tag, ...r.tags]) texts.add(t.label);
      for (const w of r.warns) texts.add(w.label);
      // 狙いの文は、地名がふりがな辞書にある町・釣り場などで確かめる（中継マスの名前「東京〜銚子」は記号つき）
      if (NODE_MAP.get(r.nodeId)?.type !== 'route') texts.add(pathAim(ctx, r));
    }
    expect([...texts].flatMap(unread)).toEqual([]);
  });

  it('どの理由の狙いの文も読める（読みも場面に合っている）', () => {
    const ctx = cityCtx({ city: { ...createInitialCityState(), destination: 'sendai', destinationReward: 5000 }, paths: [AWAY] });
    const base = describePath(ctx, 0);
    const kinds = [
      'destination', 'toward', 'build', 'recovery', 'inspect', 'rescue', 'monopoly', 'binbo', 'village_good', 'special', 'fishing', 'festival',
      'shop', 'start', 'event_good', 'event_random', 'rest', 'goal', 'goal_toward', 'road', 'card', 'town',
    ] as const;
    const aims = kinds.map(kind => pathAim(ctx, { ...base, tag: { kind, label: '独占まであと1区画', short: '' } }));
    expect(aims.flatMap(unread)).toEqual([]);
    expect(new Set(aims).size).toBeGreaterThanOrEqual(kinds.length - 3); // shop/start と road/card/town は同じ文
    const reading = (text: string) => toRubySegments(text).map(s => s.r ?? s.t).join('');
    expect(reading('目的地に着く')).toBe('もくてきちにつく');
    expect(reading('目的地に近づく')).toBe('もくてきちにちかづく');
    expect(reading('建てられる町')).toBe('たてられるまち');
    expect(reading('自分の町を視察')).toBe('じぶんのまちをしさつ');
    expect(reading('カードがもらえる村')).toBe('カードがもらえるむら');
    expect(reading(pathAim(ctx, { ...base, tag: { kind: 'build', label: '', short: '' } }))).toBe('ちょうしにたてにいく');
    expect(reading(pathAim(ctx, { ...base, tag: { kind: 'toward', label: '', short: '' } }))).toBe('もくてきちのせんだいへいそぐ');
  });

  it('狙いの文は行き先の名前つきで短い', () => {
    const city = { ...createInitialCityState(), destination: 'nagano', destinationReward: 5000 };
    const ctx = cityCtx({ city, paths: [AWAY, TOWARD] });
    expect(pathAim(ctx, describePath(ctx, 1))).toBe('目的地の長野に一番乗りだ');
    const far = cityCtx({ city: { ...city, destination: 'osaka' }, paths: [TOWARD], player: makePlayer({ money: 0 }) });
    expect(pathAim(far, describePath(far, 0))).toBe('目的地の大阪へ急ぐ');
    for (const { ctx: c, r } of samples()) expect(pathAim(c, r).length).toBeLessThanOrEqual(24);
  });
});
