// テンポの通し確認: 本物のストアと CPU の1手（cpuStep）で1局を最後まで進め、
//  - 流れが止まらない（固まらない・同じ画面を繰り返さない）こと
//  - 1手番の「押す回数」「待ち時間」「全画面の割り込み」とお知らせの溜まり方
// を測る。画面のタイマー（到着の間・ターン終了の間・CPU の間）は tempo.ts の数字で時計を進めて模擬する。
// 席0を「人」とし、判断だけ CPU と同じ考え方を借りる。押す回数は画面の作りから数える。
// TEMPO_REPORT_DIR を渡すと計測結果を tempo.md に書き出す。
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';

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

import { writeFileSync } from 'node:fs';
import { useGameStore, MAX_FISHING_PER_TURN } from './useGameStore';
import { runCpuStep } from '../components/cpu/cpuStep';
import { NODE_MAP } from '../data/boardNodes';
import { isTown, CITY_DEFAULT_MONTHS } from '../game/city';
import { DEFAULT_MAX_TURNS } from '../game/constants';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';
import {
  CPU_STEP_DELAY, ARRIVAL_PAUSE_MS, MOVE_STEP_MS, TURN_END_MS, GOAL_CELEBRATION_MS, AUTO_END_MS, NOTICE_QUEUE_MAX,
  tempoScale, scaled, noticeDurationMs, hasActionChoices,
} from '../game/tempo';
import type { CpuSpeed } from '../game/tempo';
import type { GameMode, TurnPhase } from '../game/types';

// cpuStep は効果音の予約に window.setTimeout を使う
(globalThis as unknown as { window?: unknown }).window ??= globalThis;

const REPORT_DIR = process.env.TEMPO_REPORT_DIR;

/** 人の手番で、画面の演出として必ず待つ時間（考える時間は含めない） */
const HUMAN = {
  diceMs: 150 + 1500 + 950, // 盆が開いて自動で振る + 転がる + 出目を見せる
  diceExtraMs: 300, // 複数個のときの合計を読む間
  fishingMs: 16000, // 釣り1回（キャスト1.5秒 + アタリ待ち~2.6秒 + 合わせ + やり取り~9秒 + 結果）
  eventFlipMs: 520, // 釣り旅のイベント札が自動でめくれるまで
  cityEventFlipMs: 600, // まちの出来事の札がめくれる
  binboIntroMs: 1100, // 貧乏神が企む間
  reportMs: 1700, // 決算の行が刷り上がる
  yearEndMs: 2000, // 番付の数え上げ
};
/** 見積もり: 1回押すごとに読む・考える・押すのにかかる時間 */
const THINK_PER_PRESS_MS = 2000;

interface Bucket { turns: number; presses: number; waitMs: number; interrupts: number; fishing: number }
const emptyBucket = (): Bucket => ({ turns: 0, presses: 0, waitMs: 0, interrupts: 0, fishing: 0 });

interface Notice { t: number; cpuTurn: boolean; kind: 'city' | 'binbo'; title: string }

interface GameResult {
  mode: GameMode;
  rounds: number;
  finished: boolean;
  human: Bucket;
  cpu: Bucket;
  monthEnd: Bucket;
  monthKinds: Record<string, number>;
  notices: Notice[];
  maxQueue: number;
  clockMs: number;
  stuck: string | null;
}

const NODE_TYPE = (id: string) => NODE_MAP.get(id)?.type ?? 'route';

/** 人の手番の行動選択に「ターンを終える」以外の選択肢があるか（GameScreen と同じ判定） */
function hasTurnChoices(): boolean {
  const s = useGameStore.getState();
  const node = NODE_MAP.get(s.players[s.currentPlayerIndex].currentNode);
  const again = (node?.type === 'fishing' || node?.type === 'fishing_special') && s.nodeActionsThisTurn < MAX_FISHING_PER_TURN;
  const isCity = s.settings.mode === 'city';
  return hasActionChoices({ isCity, inTown: isCity && isTown(node), fishingNode: again, fishingLeft: again });
}

/** 席0（人）の判断だけ CPU の考え方を借りる。ストアから見た席0はずっと人のまま */
function asCpu<T>(seat: number, fn: () => T): T {
  const flip = (v: boolean) => useGameStore.setState(st => ({ players: st.players.map((p, i) => (i === seat ? { ...p, isCpu: v } : p)) }));
  flip(true);
  try {
    return fn();
  } finally {
    flip(false);
  }
}

function startFourPlayers(mode: GameMode, seed: number) {
  setRandomSource(mulberry32(seed));
  useGameStore.getState().startGame({
    playerCount: 4,
    playerNames: ['あなた', 'CPU1', 'CPU2', 'CPU3'],
    playerUids: [null, null, null, null],
    maxTurns: mode === 'city' ? CITY_DEFAULT_MONTHS : DEFAULT_MAX_TURNS,
    mode,
    playerKinds: ['cpu', 'cpu', 'cpu', 'cpu'],
  });
  // 席0は人（CPU の性格は判断を借りるときだけ使う）
  useGameStore.setState(st => ({ players: st.players.map((p, i) => (i === 0 ? { ...p, isCpu: false } : p)) }));
}

function runGame(mode: GameMode, seed: number, speed: CpuSpeed = 'normal'): GameResult {
  startFourPlayers(mode, seed);
  const human = emptyBucket();
  const cpu = emptyBucket();
  const monthEnd = emptyBucket();
  const monthKinds: Record<string, number> = {};
  const notices: Notice[] = [];
  let maxQueue = 0;
  let clock = 0;
  let stuck: string | null = null;
  let lastSig = '';
  let sameCount = 0;

  // お知らせは記録したらすぐ閉じる（見せ方は replayQueue で別に再生する）。閉じると順番待ちの次が出る
  const drainNotices = (cpuTurn: boolean) => {
    maxQueue = Math.max(maxQueue, useGameStore.getState().noticeQueue.length);
    for (let guard = 0; guard < 50; guard++) {
      const s = useGameStore.getState();
      if (s.cityToast && s.cityBinboToast) throw new Error('瓦版と貧乏神のお知らせが同時に出ている');
      if (s.cityToast) {
        notices.push({ t: clock, cpuTurn, kind: 'city', title: s.cityToast.title });
        s.dismissCityToast();
      } else if (s.cityBinboToast) {
        notices.push({ t: clock, cpuTurn, kind: 'binbo', title: s.cityBinboToast.reason });
        s.dismissBinboToast();
      } else {
        return;
      }
    }
  };
  const countMonth = (k: string) => { monthKinds[k] = (monthKinds[k] ?? 0) + 1; };

  for (let step = 0; step < 200000; step++) {
    const s = useGameStore.getState();
    if (s.screen !== 'game') break;
    const seat = s.currentPlayerIndex;
    const isHuman = seat === 0;
    const bucket = isHuman ? human : cpu;
    const scale = tempoScale(!isHuman, speed, false);
    const phase: TurnPhase = s.turnPhase;
    const p = s.players[seat];

    // 固まり・同じ画面の繰り返しを検出（状態が何も変わらないまま同じ段階が続く）
    const sig = `${s.turn}|${seat}|${phase}|${p.currentNode}|${p.money}|${s.cityActionsThisTurn}|${s.nodeActionsThisTurn}|${!!s.cityBinboEvent}|${!!s.lastCapitalResult}|${!!s.lastCityEventOutcome}`;
    if (sig === lastSig) {
      if (++sameCount > 40) { stuck = sig; break; }
    } else {
      sameCount = 0;
      lastSig = sig;
    }

    // 月末の全画面（決算・年度末・貧乏神の悪さ）は人が閉じる
    if (phase === 'city_report' || phase === 'city_yearend') {
      countMonth(phase === 'city_report' ? '決算' : '年度末');
      const w = phase === 'city_report' ? HUMAN.reportMs : HUMAN.yearEndMs;
      monthEnd.interrupts++;
      monthEnd.presses++;
      monthEnd.waitMs += w;
      clock += w + THINK_PER_PRESS_MS;
      if (phase === 'city_report') s.acknowledgeCityReport();
      else s.acknowledgeCityYearEnd();
      drainNotices(false);
      continue;
    }
    if (s.cityBinboEvent) {
      countMonth('貧乏神の悪さ');
      monthEnd.interrupts++;
      monthEnd.presses++;
      monthEnd.waitMs += HUMAN.binboIntroMs;
      clock += HUMAN.binboIntroMs + THINK_PER_PRESS_MS;
      s.acknowledgeBinboEvent();
      drainNotices(false);
      continue;
    }

    if (phase === 'node_action') {
      const steps = s.lastMove && s.lastMove.playerIndex === seat ? s.lastMove.path.length - 1 : 0;
      const w = scaled(ARRIVAL_PAUSE_MS, scale) + steps * scaled(MOVE_STEP_MS, scale);
      bucket.waitMs += w;
      clock += w;
      s.executeNodeAction();
      drainNotices(!isHuman);
      continue;
    }
    if (phase === 'turn_end') {
      const goal = NODE_TYPE(p.currentNode) === 'goal' && p.hasFinished;
      const w = goal ? GOAL_CELEBRATION_MS : scaled(TURN_END_MS, scale);
      bucket.waitMs += w;
      bucket.turns++;
      clock += w;
      s.endTurn();
      drainNotices(!isHuman);
      continue;
    }

    if (!isHuman) {
      // CpuDriver と同じ: 行動選択で「もう一度釣る」以外にやることがなければ間を置かずに終える
      const node = NODE_MAP.get(p.currentNode);
      const fishingNode = node?.type === 'fishing' || node?.type === 'fishing_special';
      const choices = hasActionChoices({ isCity: s.settings.mode === 'city', inTown: false, fishingNode, fishingLeft: s.nodeActionsThisTurn < MAX_FISHING_PER_TURN });
      const base = phase === 'action_choice' && !choices ? AUTO_END_MS : CPU_STEP_DELAY[phase] ?? 0;
      const w = scaled(base, scale);
      bucket.waitMs += w;
      clock += w;
      if (phase === 'fishing_choice' && mode === 'fishing') bucket.fishing++;
      runCpuStep();
      drainNotices(true);
      continue;
    }

    // ---- 人の手番: 判断は CPU と同じ、押す回数と演出の待ちを画面の作りから数える ----
    const before = { hand: s.cityCards?.hands[seat]?.length ?? 0, actions: s.cityActionsThisTurn, inv: p.equipment.inventory.length };
    let presses = 0;
    let wait = 0;
    switch (phase) {
      case 'idle':
        presses += 1; // 地図の「サイコロを振る」（盆は開いたら自動で振る）
        break;
      case 'path_selection':
        presses += 1;
        break;
      case 'fishing_choice':
        if (mode === 'fishing') {
          presses += 3; // 通常/船を選ぶ・合わせ・釣果のOK（やり取りのタップは数えない）
          wait += HUMAN.fishingMs;
          human.fishing++;
        } else {
          presses += 1;
        }
        break;
      case 'shop':
      case 'rest':
        presses += 1;
        break;
      case 'event':
        wait += HUMAN.eventFlipMs;
        presses += 2; // 効果を受ける・閉じる
        break;
      case 'capital_event':
      case 'city_event':
        presses += 1;
        if (phase === 'city_event' && !s.lastCityEventOutcome) wait += HUMAN.cityEventFlipMs;
        break;
      case 'action_choice':
        presses += hasTurnChoices() ? 1 : 0; // 選べることが無ければ自動で終える
        break;
      default:
        break;
    }
    asCpu(seat, runCpuStep);
    const s2 = useGameStore.getState();
    const p2 = s2.players[seat];
    if (phase === 'idle') {
      if ((s2.cityCards?.hands[seat]?.length ?? 0) < before.hand) presses += 2; // 手札を開いて使う
      if (s2.turnPhase !== 'idle' && s2.rouletteResult !== null) wait += HUMAN.diceMs + (s2.pendingDiceCount > 1 ? HUMAN.diceExtraMs : 0);
    }
    if (phase === 'city') {
      if (s2.cityActionsThisTurn > before.actions) presses += 2; // 区画を選ぶ・建てる/再開発/買収
      else if ((s2.cityCards?.hands[seat]?.length ?? 0) < before.hand) presses += 2;
      else if (s2.turnPhase !== 'city') {
        presses += 1; // 町を出る（そのまま手番を終える。× で閉じたときだけ行動選択に戻る）
        if (s2.turnPhase === 'action_choice') s2.setTurnPhase('turn_end');
      }
    }
    if (phase === 'shop' && p2.equipment.inventory.length > before.inv) presses += 1;
    human.presses += presses;
    human.waitMs += wait;
    clock += wait + presses * THINK_PER_PRESS_MS;
    drainNotices(false);
  }

  const s = useGameStore.getState();
  resetRandomSource();
  return {
    mode, rounds: Math.min(s.turn, s.settings.maxTurns || s.turn), finished: s.screen === 'result',
    human, cpu, monthEnd, monthKinds, notices, maxQueue, clockMs: clock, stuck,
  };
}

/** 順番待ちで見せたときの再生（同じ見出しが続けば1件につなぐ）。出るまでの待ちと見せる時間 */
function replayQueue(notices: Notice[], speed: CpuSpeed) {
  let free = 0; // 画面上部が空く時刻
  let lastTitle = '';
  let lastEnd = 0;
  let maxLag = 0;
  let lagSum = 0;
  let shownSum = 0;
  let n = 0;
  notices.forEach((x, i) => {
    if (x.kind === 'city' && x.title === lastTitle && x.t <= lastEnd) return;
    const start = Math.max(x.t, free);
    const waiting = notices.slice(i + 1).filter(y => y.t <= start).length;
    const dur = noticeDurationMs(x.kind, waiting, tempoScale(x.cpuTurn, speed, false));
    free = start + dur;
    lastTitle = x.kind === 'city' ? x.title : '';
    lastEnd = free;
    const lag = start - x.t;
    maxLag = Math.max(maxLag, lag);
    lagSum += lag;
    shownSum += dur;
    n++;
  });
  return { shown: n, maxLag, avgLag: n ? lagSum / n : 0, avgShown: n ? shownSum / n : 0 };
}

const NOTICE_CATS: [string, RegExp][] = [
  ['CPUの工事', /：(建設|再開発|修繕|買収)$/],
  ['月の決算', /月の決算$/],
  ['貧乏神の悪さ', /貧乏神の悪さ/],
  ['発展', /発展/],
  ['釣果', /(釣った|逃げられた)/],
  ['道中', /^道中/],
  ['視察', /視察/],
  ['カード', /カード/],
  ['一番乗り', /一番乗り/],
  ['買い物・祭り・名産', /(買い物|：)/],
];

function noticeBreakdown(notices: Notice[], rounds: number): string {
  const c: Record<string, number> = {};
  for (const n of notices) {
    const cat = n.kind === 'binbo' ? '貧乏神がとりつく・移る' : NOTICE_CATS.find(([, re]) => re.test(n.title))?.[0] ?? 'その他';
    c[cat] = (c[cat] ?? 0) + 1;
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${r1(v / Math.max(1, rounds))}`).join(' / ');
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const avg = (n: number, d: number) => (d > 0 ? n / d : 0);

function summarize(label: string, games: GameResult[], speed: CpuSpeed) {
  const sum = (f: (g: GameResult) => number) => games.reduce((a, g) => a + f(g), 0);
  const rounds = sum(g => g.rounds);
  const hTurns = sum(g => g.human.turns);
  const cTurns = sum(g => g.cpu.turns);
  const notices = games.flatMap(g => g.notices);
  const q = games.map(g => replayQueue(g.notices, speed));
  const qShown = q.reduce((a, r) => a + r.shown, 0);
  const maxLag = Math.max(...q.map(r => r.maxLag));
  const avgLag = q.reduce((a, r) => a + r.avgLag * r.shown, 0) / Math.max(1, qShown);
  const avgShown = q.reduce((a, r) => a + r.avgShown * r.shown, 0) / Math.max(1, qShown);
  const kinds: Record<string, number> = {};
  for (const g of games) for (const [k, v] of Object.entries(g.monthKinds)) kinds[k] = (kinds[k] ?? 0) + v;
  const minutes = sum(g => g.clockMs) / games.length / 60000;
  const stats = {
    minutes,
    perRoundSec: sum(g => g.clockMs) / Math.max(1, rounds) / 1000,
    humanPresses: avg(sum(g => g.human.presses), hTurns),
    humanWaitSec: avg(sum(g => g.human.waitMs), hTurns) / 1000,
    cpuWaitSec: avg(sum(g => g.cpu.waitMs), cTurns) / 1000,
    monthInterrupts: avg(sum(g => g.monthEnd.interrupts), rounds),
    noticesPerCpuTurn: avg(notices.filter(n => n.cpuTurn).length, cTurns),
    maxLagSec: maxLag / 1000,
  };
  const lines = [
    `### ${label}（${games.length}局の平均）`,
    `- 1局: ${r1(avg(rounds, games.length))}巡 / 見積もり ${r1(minutes)}分（押すたびに考える時間 ${THINK_PER_PRESS_MS / 1000}秒で計算）`,
    `- 1巡（全員1回ずつ）: ${r1(stats.perRoundSec)}秒`,
    `- 人の1手番: 押す ${r1(stats.humanPresses)}回 / 演出の待ち ${r1(stats.humanWaitSec)}秒${games[0].mode === 'fishing' ? ` / 釣り ${r1(avg(sum(g => g.human.fishing), hTurns))}回` : ''}`,
    `- CPU の1手番: 待ち ${r1(stats.cpuWaitSec)}秒`,
    `- 月末（1巡あたり）: 全画面 ${r2(stats.monthInterrupts)}回 / 待ち ${r1(avg(sum(g => g.monthEnd.waitMs), rounds) / 1000)}秒` +
      (Object.keys(kinds).length ? `（1局あたり ${Object.entries(kinds).map(([k, v]) => `${k} ${r1(v / games.length)}`).join('・')}）` : ''),
    `- お知らせ: 1巡 ${r1(avg(notices.length, rounds))}件（CPU の手番中 ${r1(stats.noticesPerCpuTurn)}件/手番）: ${noticeBreakdown(notices, rounds)}`,
    `- 順番待ち: 出るまでの待ち 平均${r1(avgLag / 1000)}秒・最大${r1(stats.maxLagSec)}秒 / 1件を見せる時間 平均${r1(avgShown / 1000)}秒 / 待ちの最大 ${Math.max(...games.map(g => g.maxQueue))}件`,
  ];
  return { lines, stats };
}

const report: string[] = ['# テンポ計測（tempo.flow.test.ts）'];

describe('テンポ: 1局を最後まで進める（止まらない・繰り返さない）', () => {
  afterAll(() => {
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/tempo.md`, report.join('\n'));
  });

  it('まちづくり（1人+CPU3人・既定の36か月）が結果画面まで進み、月末の全画面が毎月は出ない', () => {
    const games = [11, 12, 13].map(seed => runGame('city', seed));
    for (const g of games) {
      expect(g.stuck).toBeNull();
      expect(g.finished).toBe(true);
      expect(g.rounds).toBe(CITY_DEFAULT_MONTHS);
      expect(g.maxQueue).toBeLessThanOrEqual(NOTICE_QUEUE_MAX);
    }
    const sm = summarize(`まちづくり ${CITY_DEFAULT_MONTHS}か月・1人+CPU3人・CPUふつう`, games, 'normal');
    report.push(...sm.lines);
    // 決算・年度末・貧乏神の悪さを合わせても、全画面は平均で月1回を下回る
    expect(sm.stats.monthInterrupts).toBeLessThan(1);
    // 行動選択の自動終了が効いていれば、人の1手番の押す回数は6回を下回る
    expect(sm.stats.humanPresses).toBeLessThan(6);
  }, 120_000);

  it('まちづくり（CPUはやい）も結果画面まで進む', () => {
    const games = [14, 15].map(seed => runGame('city', seed, 'fast'));
    for (const g of games) {
      expect(g.stuck).toBeNull();
      expect(g.finished).toBe(true);
    }
    const sm = summarize(`まちづくり ${CITY_DEFAULT_MONTHS}か月・1人+CPU3人・CPUはやい`, games, 'fast');
    report.push(...sm.lines);
  }, 120_000);

  it('釣り旅（1人+CPU3人・最大80巡）が結果画面まで進む', () => {
    const games = [21, 22, 23].map(seed => runGame('fishing', seed));
    for (const g of games) {
      expect(g.stuck).toBeNull();
      expect(g.finished).toBe(true);
    }
    const sm = summarize(`釣り旅 最大${DEFAULT_MAX_TURNS}巡・1人+CPU3人・CPUふつう`, games, 'normal');
    report.push(...sm.lines);
  }, 120_000);
});

describe('お知らせの順番待ち（ストア）', () => {
  beforeEach(() => startFourPlayers('city', 1));

  it('出ている間に来たお知らせは上書きせず、閉じると次が出る', () => {
    const st = useGameStore.getState();
    st.announce('一', 'A');
    st.announce('二', 'B');
    st.announce('三', 'C');
    expect(useGameStore.getState().cityToast?.title).toBe('一');
    expect(useGameStore.getState().noticeQueue.map(n => (n.kind === 'city' ? n.title : n.kind))).toEqual(['二', '三']);
    const seq1 = useGameStore.getState().cityToast!.seq;
    useGameStore.getState().dismissCityToast();
    expect(useGameStore.getState().cityToast?.title).toBe('二');
    expect(useGameStore.getState().cityToast!.seq).toBeGreaterThan(seq1); // 通し番号（表示の key が重ならない）
    useGameStore.getState().dismissCityToast();
    useGameStore.getState().dismissCityToast();
    expect(useGameStore.getState().cityToast).toBeNull();
    expect(useGameStore.getState().noticeQueue).toEqual([]);
  });

  it('いま出ている瓦版と同じ見出しの続報は、本文をつないで1件のまま', () => {
    const st = useGameStore.getState();
    st.announce('CPU1：建設', '札幌に住宅を建てた');
    st.announce('CPU1：建設', '札幌に商業を建てた');
    st.announce('CPU1：建設', '札幌に商業を建てた');
    expect(useGameStore.getState().cityToast?.body).toBe('札幌に住宅を建てた／札幌に商業を建てた');
    expect(useGameStore.getState().noticeQueue).toEqual([]);
  });

  it('貧乏神のお知らせは瓦版と同時に出ず、瓦版を閉じてから出る', () => {
    useGameStore.getState().announce('瓦版', '先に出る');
    // すれ違いで貧乏神が移ったときの積み方（順番待ちの後ろに貧乏神のお知らせ）を再現する
    useGameStore.setState(s => ({ noticeQueue: [...s.noticeQueue, { kind: 'binbo', reason: 'pass', playerIndex: 1, fromIndex: 0, great: false }] }));
    expect(useGameStore.getState().cityBinboToast).toBeNull();
    useGameStore.getState().dismissCityToast();
    expect(useGameStore.getState().cityToast).toBeNull();
    expect(useGameStore.getState().cityBinboToast?.playerIndex).toBe(1);
    useGameStore.getState().announce('次の瓦版', '貧乏神の後');
    expect(useGameStore.getState().cityToast).toBeNull();
    useGameStore.getState().dismissBinboToast();
    expect(useGameStore.getState().cityToast?.title).toBe('次の瓦版');
  });

  it('溢れたら古い瓦版から捨て、待ちは上限を超えない', () => {
    const st = useGameStore.getState();
    for (let i = 0; i < 10; i++) st.announce(`見出し${i}`, '本文');
    const q = useGameStore.getState().noticeQueue;
    expect(q.length).toBe(NOTICE_QUEUE_MAX);
    expect(q.map(n => (n.kind === 'city' ? n.title : ''))).toEqual(['見出し6', '見出し7', '見出し8', '見出し9']);
  });

  it('月末をまとめて閉じると、決算を閉じて貧乏神の悪さはお知らせに回る', () => {
    useGameStore.setState({
      turnPhase: 'city_report',
      cityBinboEvent: { playerIndex: 0, kind: 'waste', message: '貧乏神が無駄遣いした', great: false, moneyDelta: -500 },
    });
    useGameStore.getState().skipMonthEnd();
    const s = useGameStore.getState();
    expect(s.turnPhase).toBe('idle');
    expect(s.cityBinboEvent).toBeNull();
    expect(s.cityToast?.title).toContain('貧乏神の悪さ');
    expect(s.cityToast?.body).toBe('貧乏神が無駄遣いした');
  });

  it('年度末の画面からまとめて閉じても次の手番へ進む', () => {
    useGameStore.setState({ turnPhase: 'city_yearend', cityBinboEvent: null });
    useGameStore.getState().skipMonthEnd();
    expect(useGameStore.getState().turnPhase).toBe('idle');
    expect(useGameStore.getState().cityYearEnd).toBeNull();
  });
});
