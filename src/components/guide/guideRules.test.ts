import { describe, it, expect } from 'vitest';
import { GUIDES, buildGuideContext, guideById, pickGuide, stillValid, targetOf } from './guideRules';
import type { GuideContext } from './guideRules';
import type { GameState, Player } from '../../game/types';
import { createInitialCityState } from '../../game/city';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** src 以下の .tsx に書かれた data-guide の値（"x" と三項演算子の 'x' の両方） */
function dataGuideValues(): Set<string> {
  const root = join(__dirname, '../..');
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.tsx')) {
        for (const m of readFileSync(p, 'utf8').matchAll(/data-guide=(?:"([a-z-]+)"|\{[^}]*'([a-z-]+)'[^}]*\})/g)) out.add(m[1] ?? m[2]);
      }
    }
  };
  walk(root);
  return out;
}

function ctx(over: Partial<GuideContext> = {}): GuideContext {
  return {
    onGame: true,
    mode: 'fishing',
    phase: 'idle',
    humanTurn: true,
    anyHuman: true,
    anyCpu: false,
    phaseKey: '1:0:idle',
    turn: 1,
    playerIndex: 0,
    nodeType: 'start',
    inTown: false,
    canFishAgain: false,
    maxFishing: 3,
    caughtCount: 0,
    handSize: 0,
    hasDestination: false,
    binboHolder: null,
    binboHolderName: '',
    toastTitle: null,
    binboEventShown: false,
    capitalResultShown: false,
    firstFinishTurn: null,
    hasMonthReport: false,
    myPlotsHere: 0,
    monopolyHere: null,
    hasSpecialtyHere: false,
    ...over,
  };
}

const ALL = () => true;
const pick = (c: GuideContext, seen: string[] = [], hasTarget: (t: string) => boolean = ALL, lastPhaseKey: string | null = null) =>
  pickGuide(c, { seen: new Set(seen), hasTarget, lastPhaseKey })?.id ?? null;

describe('案内の一覧', () => {
  it('id は重ならず、文章と指す先がある', () => {
    const ids = GUIDES.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GUIDES) {
      for (const mode of ['fishing', 'city'] as const) {
        const c = ctx({ mode, binboHolder: 1, binboHolderName: 'たろう' });
        const t = g.text(c);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.body.length).toBeGreaterThan(0);
        expect(t.body.length).toBeLessThanOrEqual(60); // 吹き出しは短く
        expect(targetOf(g, c)).toMatch(/^[a-z-]+$/);
      }
    }
  });
});

describe('指し示す要素', () => {
  it('どの案内の指す先にも、画面側に data-guide 属性がある', () => {
    const values = dataGuideValues();
    const targets = new Set<string>();
    for (const g of GUIDES) {
      for (const phase of ['idle', 'city', 'action_choice', 'city_report'] as const) targets.add(targetOf(g, ctx({ phase })));
    }
    const missing = [...targets].filter(t => !values.has(t));
    expect(missing).toEqual([]);
  });
});

describe('pickGuide', () => {
  it('最初の手番ではサイコロの案内', () => {
    expect(pick(ctx())).toBe('roll');
    expect(pick(ctx({ mode: 'city' }))).toBe('roll');
  });

  it('CPU の手番では出さない', () => {
    expect(pick(ctx({ humanTurn: false }))).toBeNull();
    expect(pick(ctx({ humanTurn: false, phase: 'path_selection' }))).toBeNull();
  });

  it('決算の画面は人が閉じるので、CPU の手番でも人がいれば出す', () => {
    expect(pick(ctx({ mode: 'city', phase: 'city_report', humanTurn: false }))).toBe('city-report');
    expect(pick(ctx({ mode: 'city', phase: 'city_yearend', humanTurn: false }))).toBe('city-yearend');
    expect(pick(ctx({ mode: 'city', phase: 'city_report', humanTurn: false, anyHuman: false }))).toBeNull();
  });

  it('見た案内は二度出さない', () => {
    expect(pick(ctx(), ['roll'])).toBeNull();
    expect(pick(ctx({ phase: 'path_selection' }), ['path'])).toBeNull();
  });

  it('指す要素が画面になければ次の候補へ', () => {
    const c = ctx({ mode: 'city', phase: 'city', inTown: true, hasSpecialtyHere: true });
    expect(pick(c)).toBe('city-build'); // 区画を選んだ後なら建てる物の案内
    expect(pick(c, [], t => t !== 'build-options')).toBe('city-town');
    expect(pick(c, [], t => t !== 'build-options' && t !== 'plot-empty')).toBe('city-specialty');
    expect(pick(c, [], () => false)).toBeNull();
  });

  it('同じ段階では案内を1つまで（操作の結果として現れる案内は続けてよい）', () => {
    const c = ctx({ mode: 'city', phase: 'city', phaseKey: '2:0:city', inTown: true, hasSpecialtyHere: true });
    expect(pick(c, ['city-town'], t => t !== 'build-options', '2:0:city')).toBeNull();
    expect(pick(c, ['city-town'], ALL, '2:0:city')).toBe('city-build');
    expect(pick(c, ['city-town'], t => t !== 'build-options', '1:0:city')).toBe('city-specialty');
  });

  it('モードに合わない案内は出さない', () => {
    const fishAgain = ctx({ phase: 'action_choice', canFishAgain: true });
    expect(pick(fishAgain)).toBe('fish-again');
    expect(pick({ ...fishAgain, mode: 'city', canFishAgain: false })).toBe('turn-end');
    expect(pick(ctx({ mode: 'fishing', phase: 'city_event' }))).toBeNull();
  });

  it('分かれ道・釣り・店・祭り・札・温泉', () => {
    expect(pick(ctx({ phase: 'path_selection' }))).toBe('path');
    expect(pick(ctx({ phase: 'fishing_choice' }))).toBe('fish-choice');
    expect(pick(ctx({ phase: 'shop' }))).toBe('shop');
    expect(pick(ctx({ phase: 'capital_event' }))).toBe('festival');
    expect(pick(ctx({ phase: 'capital_event', capitalResultShown: true }))).toBeNull();
    expect(pick(ctx({ phase: 'event' }))).toBe('event');
    expect(pick(ctx({ phase: 'rest' }))).toBe('rest');
    // 釣りのミニゲーム中は、時間を競うので案内を出さない
    expect(pick(ctx({ phase: 'fishing' }))).toBeNull();
  });

  it('まちづくりの手番の頭: サイコロ → 貧乏神 → 目的地 → 決算 → 季節', () => {
    const c = ctx({ mode: 'city', turn: 2, hasDestination: true, binboHolder: 1, binboHolderName: 'CPU', hasMonthReport: true });
    expect(pick(c)).toBe('roll');
    expect(pick(c, ['roll'])).toBe('city-binbo');
    expect(pick(c, ['roll', 'city-binbo'])).toBe('city-destination');
    expect(pick(c, ['roll', 'city-binbo', 'city-destination'])).toBe('city-monthend');
    expect(pick(c, ['roll', 'city-binbo', 'city-destination', 'city-report'])).toBe('city-season');
  });

  it('CPU がいる対局だけ、速さのボタンを案内する', () => {
    const c = ctx({ turn: 2, caughtCount: 0 });
    expect(pick(c, ['roll'])).toBeNull();
    expect(pick({ ...c, anyCpu: true }, ['roll'])).toBe('cpu-speed');
  });

  it('手札が来たら手札の案内（振る前・町の中）', () => {
    expect(pick(ctx({ mode: 'city', handSize: 1 }), ['roll'])).toBe('city-hand');
    expect(pick(ctx({ mode: 'city', phase: 'city', handSize: 2 }), ['city-build', 'city-town'])).toBe('city-hand');
  });

  it('目的地に一番乗りした直後の案内', () => {
    const c = ctx({ mode: 'city', phase: 'city', toastTitle: '目的地「仙台」に一番乗り！', hasDestination: true });
    const g = pickGuide(c, { seen: new Set(), hasTarget: ALL });
    expect(g?.id).toBe('city-dest-first');
    expect(targetOf(g!, c)).toBe('actions-left');
    // お知らせが消えても、町にいる間は出し続ける
    expect(stillValid(g!, { ...c, toastTitle: null })).toBe(true);
    expect(stillValid(g!, { ...c, toastTitle: null, phase: 'turn_end' })).toBe(false);
  });

  it('貧乏神の悪さの画面が出ている間は案内しない', () => {
    expect(pick(ctx({ mode: 'city', binboEventShown: true }))).toBeNull();
  });

  it('貧乏神の案内の文章は、とりつかれた人で変わる', () => {
    const g = guideById('city-binbo')!;
    expect(g.text(ctx({ mode: 'city', binboHolder: 0, playerIndex: 0 })).title).toBe('貧乏神がとりついた');
    expect(g.text(ctx({ mode: 'city', binboHolder: 1, binboHolderName: 'はなこ' })).title).toContain('はなこ');
  });

  it('独占の案内は、自分の建物が2つ以上あり独占前の町だけ', () => {
    const base = ctx({ mode: 'city', phase: 'city', inTown: true });
    const only = (t: string) => t === 'plots';
    expect(pick({ ...base, myPlotsHere: 1 }, [], only)).toBeNull();
    expect(pick({ ...base, myPlotsHere: 2 }, [], only)).toBe('city-monopoly');
    expect(pick({ ...base, myPlotsHere: 3, monopolyHere: 0 }, [], only)).toBeNull();
  });
});

describe('stillValid', () => {
  it('段階が変わったら閉じる', () => {
    const roll = guideById('roll')!;
    expect(stillValid(roll, ctx())).toBe(true);
    expect(stillValid(roll, ctx({ phase: 'roulette' }))).toBe(false);
    expect(stillValid(roll, ctx({ humanTurn: false }))).toBe(false);
    expect(stillValid(roll, ctx({ onGame: false }))).toBe(false);
  });
});

describe('buildGuideContext', () => {
  const player = (over: Partial<Player> = {}): Player => ({
    id: 0, name: 'あ', color: '#fff', currentNode: 'start', money: 0,
    equipment: { equipped: { rod: null, reel: null, lure: null }, inventory: [] },
    caughtFish: [], score: 0, hasFinished: false, finishOrder: null, skipNextTurn: false, extraTurn: false,
    fishBonusMultiplier: 1, fishBonusTurnsLeft: 0, ...over,
  });
  const state = (over: Partial<GameState> = {}) => ({
    screen: 'game' as const,
    settings: { playerCount: 2, playerNames: ['あ', 'い'], playerUids: [null, null], maxTurns: 0 },
    turnPhase: 'idle' as const,
    players: [player(), player({ id: 1, name: 'い', isCpu: true })],
    currentPlayerIndex: 0,
    turn: 1,
    nodeActionsThisTurn: 0,
    cityCards: null,
    city: null,
    cityToast: null,
    cityBinboEvent: null,
    lastCapitalResult: null,
    firstFinishTurn: null,
    cityReport: null,
    ...over,
  });

  it('手番の人・CPU・段階の区切り', () => {
    const c = buildGuideContext(state(), 3);
    expect(c.onGame).toBe(true);
    expect(c.mode).toBe('fishing');
    expect(c.humanTurn).toBe(true);
    expect(c.anyHuman).toBe(true);
    expect(c.phaseKey).toBe('1:0:idle');
    expect(buildGuideContext(state({ currentPlayerIndex: 1 }), 3).humanTurn).toBe(false);
    expect(buildGuideContext(state({ screen: 'title' }), 3).onGame).toBe(false);
  });

  it('同じ釣りマスでもう一度釣れるか', () => {
    const onFishing = state({ players: [player({ currentNode: 'wakkanai' })], nodeActionsThisTurn: 1 });
    const node = buildGuideContext(onFishing, 3);
    // 稚内が釣りマスでない盤でも落ちないこと（釣りマスなら true）
    expect(typeof node.canFishAgain).toBe('boolean');
    expect(buildGuideContext({ ...onFishing, nodeActionsThisTurn: 3 }, 3).canFishAgain).toBe(false);
    expect(buildGuideContext({ ...onFishing, nodeActionsThisTurn: 0 }, 3).canFishAgain).toBe(false);
  });

  it('まちづくり: 目的地・貧乏神・決算', () => {
    const city = createInitialCityState();
    const s = state({
      settings: { playerCount: 2, playerNames: ['あ', 'い'], playerUids: [null, null], maxTurns: 36, mode: 'city' },
      city: { ...city, binbo: { playerIndex: 1, months: 0 } },
      turn: 2,
      cityReport: { turn: 1 } as GameState['cityReport'],
    });
    const c = buildGuideContext(s, 3);
    expect(c.mode).toBe('city');
    expect(c.hasDestination).toBe(!!city.destination);
    expect(c.binboHolder).toBe(1);
    expect(c.binboHolderName).toBe('い');
    expect(c.hasMonthReport).toBe(true);
  });
});
