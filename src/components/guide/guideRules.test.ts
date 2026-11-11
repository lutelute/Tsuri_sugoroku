import { describe, it, expect } from 'vitest';
import { GUIDES, buildGuideContext, guideById, pickGuide, stillValid, targetOf } from './guideRules';
import type { GuideContext } from './guideRules';
import type { GameState, Player } from '../../game/types';
import { build, createInitialCityState } from '../../game/city';
import { createQuestCityState } from '../../game/cityQuests';
import { traitIdsOf } from '../../game/cityTraits';
import { isFishingSpot } from '../../game/fishMarket';
import { BOARD_NODES } from '../../data/boardNodes';
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
    expect(pick(ctx({ phase: 'path_selection' }), ['path', 'path-best'])).toBeNull();
  });

  it('指す要素が画面になければ次の候補へ', () => {
    const c = ctx({ mode: 'city', phase: 'city', inTown: true, hasSpecialtyHere: true });
    expect(pick(c)).toBe('city-build'); // 区画を選んだ後なら建てる物の案内
    // 見込みの行（action-preview）は、建物のある区画を選んだときだけ画面にある
    expect(pick(c, [], t => t !== 'build-options' && t !== 'action-preview')).toBe('city-town');
    expect(pick(c, [], t => t !== 'build-options' && t !== 'action-preview' && t !== 'plot-empty')).toBe('city-specialty');
    expect(pick(c, [], () => false)).toBeNull();
  });

  it('同じ段階では案内を1つまで（操作の結果として現れる案内は続けてよい）', () => {
    const c = ctx({ mode: 'city', phase: 'city', phaseKey: '2:0:city', inTown: true, hasSpecialtyHere: true });
    const noSelect = (t: string) => t !== 'build-options' && t !== 'action-preview';
    expect(pick(c, ['city-town'], noSelect, '2:0:city')).toBeNull();
    expect(pick(c, ['city-town'], ALL, '2:0:city')).toBe('city-build');
    expect(pick(c, ['city-town'], noSelect, '1:0:city')).toBe('city-specialty');
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
    expect(pick(ctx({ mode: 'city', phase: 'city', handSize: 2 }), ['city-build', 'city-preview', 'city-town'])).toBe('city-hand');
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

describe('pickGuide: v6 で足した案内', () => {
  it('釣り方を選ぶ画面: 仕掛け → 釣り場の札 → 雑魚は手早く（訪れるたびに1つずつ）', () => {
    const c = ctx({ phase: 'fishing_choice', phaseKey: '1:0:fishing_choice' });
    expect(pick(c)).toBe('fish-choice');
    expect(pick(c, ['fish-choice'])).toBe('fish-spot');
    expect(pick(c, ['fish-choice', 'fish-spot'])).toBe('fish-quick');
    expect(pick(c, ['fish-choice', 'fish-spot', 'fish-quick'])).toBeNull();
    // 同じ訪問の中では続けて出さない
    expect(pick(c, ['fish-choice'], ALL, '1:0:fishing_choice')).toBeNull();
    expect(pick({ ...c, mode: 'city' })).toBe('fish-choice');
  });

  it('釣果の売値の内訳は、まちづくりで釣り上げた後だけ（釣りの最中は出さない）', () => {
    expect(pick(ctx({ mode: 'city', phase: 'fishing' }))).toBeNull();
    expect(pick(ctx({ mode: 'city', phase: 'fishing', fishSaleShown: true }))).toBe('fish-sale');
    expect(pick(ctx({ mode: 'fishing', phase: 'fishing', fishSaleShown: true }))).toBeNull();
  });

  it('町の画面: 魚市場・町の特色・鉄道は、その町にあるときだけ（独占の案内より先）', () => {
    const base = ctx({ mode: 'city', phase: 'city', inTown: true, myPlotsHere: 2 });
    const noBuild = (t: string) => t !== 'build-options' && t !== 'action-preview' && t !== 'plot-empty';
    expect(pick(base, [], noBuild)).toBe('city-monopoly');
    expect(pick({ ...base, fishTownHere: true }, [], noBuild)).toBe('city-fish');
    expect(pick({ ...base, traitsHere: true }, [], noBuild)).toBe('city-traits');
    expect(pick({ ...base, railHere: true }, [], noBuild)).toBe('city-rail');
    expect(pick({ ...base, fishTownHere: true, traitsHere: true, railHere: true }, ['city-fish'], noBuild)).toBe('city-traits');
    // 帯や札が画面に無ければ出さない
    expect(pick({ ...base, railHere: true }, [], t => noBuild(t) && t !== 'rail-build')).toBe('city-monopoly');
  });

  it('お題は目的地の次に案内する。古いセーブ（お題なし）では出さない', () => {
    const c = ctx({ mode: 'city', turn: 3, hasDestination: true, hasMonthReport: true, hasQuests: true });
    expect(pick(c, ['roll'])).toBe('city-destination');
    expect(pick(c, ['roll', 'city-destination'])).toBe('city-quest');
    expect(pick({ ...c, hasQuests: false }, ['roll', 'city-destination'])).toBe('city-monthend');
    expect(guideById('city-quest')!.target).toBe('quest');
  });

  it('7月は釣り大会を案内する', () => {
    const c = ctx({ mode: 'city', turn: 4, derbyNow: true });
    expect(pick(c, ['roll'])).toBe('city-derby');
    expect(pick({ ...c, derbyNow: false }, ['roll'])).toBe('city-season');
    expect(guideById('city-derby')!.text(c).title).toMatch(/^\d+月は釣り大会$/);
  });

  it('大決算: 番付の次に来年度のお題。最終決算では文が替わり、来年度のお題は出さない', () => {
    const c = ctx({ mode: 'city', phase: 'city_yearend', phaseKey: '13:0:city_yearend', humanTurn: false });
    expect(pick(c)).toBe('city-yearend');
    // 番付の案内を閉じた直後でも、続けて出す（chain）
    expect(pick(c, ['city-yearend'], ALL, '13:0:city_yearend')).toBe('city-quest-next');
    const g = guideById('city-yearend')!;
    expect(g.text(c).title).toBe('年度末の大決算');
    const fin = { ...c, finalYearEnd: true };
    expect(g.text(fin).title).toBe('最終決算');
    expect(g.text(fin).body).toContain('結果発表');
    expect(pick(fin, ['city-yearend'], ALL, '13:0:city_yearend')).toBeNull();
  });

  it('分かれ道: 行き先の案内の次に、続けて金のボタンを案内する（おすすめを切っているときは出さない）', () => {
    const c = ctx({ phase: 'path_selection', phaseKey: '2:0:path_selection' });
    expect(pick(c)).toBe('path');
    expect(pick(c, ['path'], ALL, '2:0:path_selection')).toBe('path-best');
    expect(pick(c, ['path'], t => t !== 'path-best', '2:0:path_selection')).toBeNull();
    expect(pick({ ...c, mode: 'city' }, ['path'])).toBe('path-best');
  });

  it('町の画面: 足りないものは空き地の案内の次。再開発・買収の見込みは、その行が出たら続けて案内する', () => {
    const c = ctx({ mode: 'city', phase: 'city', phaseKey: '3:0:city', inTown: true, needsHere: true, hasSpecialtyHere: true });
    const noBuild = (t: string) => t !== 'build-options' && t !== 'plot-empty' && t !== 'action-preview';
    expect(pick(c, [], noBuild)).toBe('city-needs');
    expect(pick({ ...c, needsHere: false }, [], noBuild)).toBe('city-specialty');
    // 建物のある区画を選んで見込みの行が出たら、同じ訪問の中でも出す
    expect(pick(c, ['city-needs'], t => t !== 'build-options' && t !== 'plot-empty', '3:0:city')).toBe('city-preview');
  });

  it('空き地の案内は、街並みの絵の空き地を指す', () => {
    const g = guideById('city-town')!;
    expect(g.target).toBe('plot-empty');
    expect(g.text(ctx({ mode: 'city' })).body).toContain('絵の中の空き地');
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
    fishingState: null,
    cityYearEnd: null,
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
  it('まちづくり: お題・町の特色・釣り場・釣り大会・最終決算・線路', () => {
    const settings = { playerCount: 2, playerNames: ['あ', 'い'], playerUids: [null, null], maxTurns: 36, mode: 'city' as const };
    const traitTown = BOARD_NODES.find(n => traitIdsOf(n.id).length > 0)!.id;
    const fishTown = BOARD_NODES.find(n => isFishingSpot(n.id))!.id;
    const plain = buildGuideContext(state({ settings, city: createInitialCityState() }), 3);
    expect(plain.hasQuests).toBe(false);
    expect(plain.derbyNow).toBe(false);
    expect(plain.finalYearEnd).toBe(false);
    expect(plain.fishSaleShown).toBe(false);
    expect(plain.railHere).toBe(false);

    const city = createQuestCityState(2);
    expect(buildGuideContext(state({ settings, city }), 3).hasQuests).toBe(true);
    expect(buildGuideContext(state({ settings, city, turn: 4 }), 3).derbyNow).toBe(true);
    expect(buildGuideContext(state({ settings, city, players: [player({ currentNode: traitTown })] }), 3).traitsHere).toBe(true);
    expect(buildGuideContext(state({ settings, city, players: [player({ currentNode: fishTown })] }), 3).fishTownHere).toBe(true);
    // 釣り旅では、魚市場も町の特色も案内しない
    expect(buildGuideContext(state({ players: [player({ currentNode: fishTown })] }), 3).fishTownHere).toBe(false);
    expect(buildGuideContext(state({ players: [player({ currentNode: traitTown })] }), 3).traitsHere).toBe(false);

    const ye = { year: 3, ranking: [], titles: [], final: true };
    expect(buildGuideContext(state({ settings, city, turnPhase: 'city_yearend', cityYearEnd: ye }), 3).finalYearEnd).toBe(true);
    expect(buildGuideContext(state({ settings, city, turnPhase: 'city_yearend', cityYearEnd: { ...ye, final: undefined } }), 3).finalYearEnd).toBe(false);

    // 釣果の画面（売値の内訳が出ているとき）
    const fs = { phase: 'result', sale: { total: 500, main: 500, mul: 1 } } as GameState['fishingState'];
    expect(buildGuideContext(state({ settings, city, turnPhase: 'fishing', fishingState: fs }), 3).fishSaleShown).toBe(true);
    expect(buildGuideContext(state({ settings, city, turnPhase: 'fishing', fishingState: { ...fs!, phase: 'reeling' } }), 3).fishSaleShown).toBe(false);

    // 線路: 町の画面で、自分の建物があり、お金が足りるときだけ
    const built = build(city, 'tokyo', 0, 'res', 0, 1e9, 1);
    if (!built.ok) throw new Error(built.reason);
    const rich = [player({ currentNode: 'tokyo', money: 100000 }), player({ id: 1, name: 'い', isCpu: true })];
    expect(buildGuideContext(state({ settings, city: built.state, players: rich, turnPhase: 'city' }), 3).railHere).toBe(true);
    expect(buildGuideContext(state({ settings, city: built.state, players: rich, turnPhase: 'idle' }), 3).railHere).toBe(false);
    expect(buildGuideContext(state({ settings, city, players: rich, turnPhase: 'city' }), 3).railHere).toBe(false);
    expect(buildGuideContext(state({ settings, city: built.state, players: [player({ currentNode: 'tokyo', money: 0 })], turnPhase: 'city' }), 3).railHere).toBe(false);

    // 足りないもの: 発電所の無い町は電気が足りない（町の画面にいるときだけ調べる）
    expect(buildGuideContext(state({ settings, city, players: rich, turnPhase: 'city' }), 3).needsHere).toBe(true);
    expect(buildGuideContext(state({ settings, city, players: rich, turnPhase: 'idle' }), 3).needsHere).toBe(false);
  });
});
