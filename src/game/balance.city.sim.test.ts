// まちづくりモードのヘッドレス・バランスシミュレーション。
// city.ts の純粋関数（build / upgrade / acquire / simulateRound / applyCityEvent …）をそのまま使い、
// 36か月（36巡）の4人戦を「建て方の方針が違う戦略」同士で回して、経済の偏りを測る。
//
// ■ 仮定
//  - 移動: 到達可能マスのうち「自分の方針で工事できる町・祭りのある県庁所在地・目的地・釣り場」を好んで選ぶ。
//  - 町に止まったら方針に従って最大2回工事する（予備費¥500を残す）。県庁所在地では祭りの「宴」で賞金を受け取る。
//  - 自分の建物がある町に止まったら視察する（recordInspection）。自分の空き家は、需要が戻っていれば修理する（工事1回分）。
//    住宅偏重・独占は、自分の住宅に空き家の警告（lowMonths>0）が出た町では商業・公園・工業を混ぜる。
//  - 釣り場の町では3回釣る（成功率は balance.fishing.sim と同じ近似）。売上の2割が漁港の持ち主に入る。
//  - 村マスは必ず「まちの出来事」、中継マスは3割で小さな道中イベント、ゴール賞金は1人1回の着順制（ストアと同じ）。
//  - 第2弾（ストアと同じ順番）: 目的地は通過中でも止まれる。一番乗りで賞金（年ごとに上がる）・特需・追加工事・貧乏神。
//    止まった町で他人の商業・観光に買い物代を払う。県庁で名産を買う（工事1回）。カードは cityCards.chooseCpuCard の素朴な判断で使い、
//    大都市・商都の売り場で工事券か保険を買う。月末は季節の倍率込みの収入 → 保険 → 貧乏神の悪さ → 3月は年度末の称号。
//    物価（priceScale）: 目的地の賞金・貧乏神の上限と渡す額・称号・道中イベント・宴・カードの値段・買い物代に年ごとの倍率が掛かる。
//    お題と今年の舞台（cityQuests.ts）: 工事・一番乗り・釣果のたびに数え（tallyWork / tallyFirst / tallyFish）、その場と月末に
//    settleQuests で賞金。目的地は今年の舞台に寄せる（stageOf）。4月に openQuestYear で引き直す。ボットはお題を狙っては動かない。
//    魚市場（fishMarket.ts）: 魚の売値 = 基本 × 賑わい × 漁場 × 物価。大物で町おこし（特需3か月）、7月は釣り大会。
//    まちづくりでは道具は傷まない。本物の CPU は工事の後に2回だけ釣る（cpuCatchChance。大漁なし）。
//    貧乏神にとりつかれたボットは、他の駒のいるマスを通る経路を好んで押し付ける。
//  - 戦略:
//      res     住宅偏重（住宅需要のある町に住宅を建てて育てる。幸福度が低ければ公園）
//      indpow  商工業+発電所（電気の来ていない町に発電所 → 商業/工業）
//      tour    観光（観光名所＋公園、建てられない町では住宅）
//      mono    独占狙い（4区画以下の町を1人で埋め、他人の建物・名産を買収して独占する。大きな町では需要に沿って建てる）
//      demand  需要追従（RCI需要が一番高いものを建てる分散型。港町では漁港も建てる）
//      fisher  釣り専念（建てずに釣りと祭りだけ）
//  - v5（災害からの復興・町の特色・町長と条例・鉄道）: 進め方はストアと同じ順番。
//      移動     線路のある中継マスは歩数を使わずに通り抜ける（getReachableNodes の passThrough）。他人の線路は1区間ごとに運賃。
//      条例     どの戦略も、町長になっている町では本物の CPU と同じ判断（mayorAI.chooseOrdinance）で条例を決める。
//               条例は工事の回数を使わない（1か月に1回まで）。町に入ったら工事を選ぶ前にまず出す（cpuStep と同じ）。
//      線路     建てる物がないとき、本物の CPU と同じ見込み（cpuAI.railCandidates）がプラスなら敷く（工事1回）。
//      月末     simulateRound（維持費・町税・条例の負担を含む）→ 保険 → settleDisasters（復興特需・見舞金）→ 貧乏神 → 年度末。
//      出来事   まちの出来事の災害も 保険 → settleDisasters。
//    追加の戦略（必勝法・死に手になっていないかを測る）:
//      rail    鉄道王（需要追従で建てつつ、自分の建物がある町に来るたび払えるだけ線路を敷く）
//      mayor   町長狙い（区画の半分より多くを取りに行き、あと1軒なら買収する。届かない町では需要追従）
//      cpuS / cpuM / cpuR  本物の CPU（堅実 / 独占 / 目的地）。道選び chooseCpuPath・工事 chooseCityAction・名産 shouldBuySpecialty をそのまま使う
//
// 計測結果を見たいときは BALANCE_REPORT_DIR=/path npx vitest run src/game/balance.city.sim.test.ts
// 定数の比較は BALANCE_SWEEP（下の「パラメータ掃引」）。例:
//   BALANCE_SWEEP='[{},{"rail":{"fare":200}},{"ord":{"sceneryHappiness":1}},{"rec":{"aidRate":0}},{"railCpu":{"linkMine":4000}}]'
//   BALANCE_SWEEP_GROUPS=field,rail,mayor,cpu,human（測る組。既定は field。human は人を模したボット1人 対 CPU 3人）
//   BALANCE_SWEEP_SEEDS=3  BALANCE_SWEEP_BASE=100  BALANCE_SWEEP_SOLO=1（1人プレイも測る）
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { BuildingKind, CityState, CityDisasterReport, TownClass } from './city';
import {
  createInitialCityState, getTownInfo, canBuild, build, upgrade, acquire, renovate, recordInspection, upgradeCost, acquireCost, renovateCost,
  computeAllStats, plotIncome, poweredTownsWithBuildings, monopolyOwner, simulateRound, drawCityEvent, applyCityEvent,
  pickDestination, portFee, playerPropertyValue, isUpgradable, isTown, distancesFrom, startBoom, visitorFees, seasonOf, seasonalIncomeMul, plotValue,
  BUILDING_INFO, CITY_ECONOMY, CITY_INITIAL_MONEY, CITY_START_NODE, CITY_ACTIONS_PER_VISIT, CITY_DEFAULT_MONTHS, MAX_BUILDING_LEVEL,
  baseBuildCost, recoveryMonthsLeft, RECOVERY, priceScale, occupancyRate,
} from './city';
import { settleDisasters } from './recovery';
import type { OrdinanceKind } from './mayor';
import { mayorOf, mayorStanding, enactOrdinance, ordinanceContext, ordinancePlotIncome, ORDINANCE_ECONOMY, ORDINANCE_KINDS } from './mayor';
import { chooseOrdinance, CPU_MAYOR } from './mayorAI';
import {
  RAIL_ECONOMY, RAIL_CPU, layRail, railFares, railPassSet, railDistancesFrom, railOptions, routeEnds, playerRailValue,
} from './railways';
import type { CpuStyle } from './cpuAI';
import { chooseCityAction, chooseCpuPath, shouldBuySpecialty, railCandidates, playerMonthlyIncome, cpuCatchChance } from './cpuAI';
import {
  createQuestCityState, tallyWork, tallyFirst, tallyFish, settleQuests, openQuestYear, stageOf, isQuestDrawTurn, questYearOf,
  QUEST_DEFS, QUEST_ECONOMY, questProgress,
} from './cityQuests';
import type { QuestId } from './cityQuests';
import { fishPriceParts, fishSalePrice, isBoomCatch, recordDerby, settleDerby, cpuTownCasts, FISH_MARKET } from './fishMarket';
import { TOWN_TRAITS } from '../data/cityTraits';
import type { TownTraitId } from '../data/cityTraits';
import {
  buySpecialty, isSpecialtyNode, specialtyIncome, isSpecialtyMonopolized, regionalMonopolies, regionOfSpecialty,
  regionSpecialtyIds, ownerOf, playerSpecialtyValue, specialtyBuyCost, SPECIALTY_ECONOMY,
} from './citySpecialties';
import type { CardState, CardEffect } from './cityCards';
import {
  createCardState, drawCard, addCard, buyCard, playCard, diceCap, tickSlow, consumeLandGrab, landGrabPrice,
  pickWarpDestination, emptyPlotIndex, suggestFreeBuildKind, freeBuild, protectInsured, chooseCpuCard, rollDiceFaces,
  hasCardShop, CARD_DROP_VILLAGE, CARD_DROP_ROUTE,
} from './cityCards';
import { attachOnDestination, transferOnMove, tickMonth, binboMischief, BINBO } from './binbo';
import { computeYearEnd, isYearEndTurn } from './cityAwards';
import type { Player, PlayerEquipment, FishRarity } from './types';
import { selectFish, createCaughtFish, checkTairyou, getEffectiveLevel, getStrikeGreenZone } from './fishing';
import { createInitialEquipment, applyDurabilityLoss, getEquippedItem, isBroken } from './equipment';
import { REST_MONEY_BONUS } from './constants';
import { NODE_MAP } from '../data/boardNodes';
import { getCapitalEvent, CAPITAL_EVENTS } from '../data/capitalEvents';
import { FISH_DATABASE } from '../data/fishDatabase';
import { getReachableNodes } from '../utils/pathfinding';
import { setRandomSource, resetRandomSource, mulberry32, random } from '../utils/random';

export type Strategy = 'res' | 'indpow' | 'tour' | 'mono' | 'demand' | 'fisher' | 'rail' | 'mayor' | 'cpuS' | 'cpuM' | 'cpuR';
/** 本物の CPU の判断関数で動かす戦略と、その性格 */
const CPU_STYLE_OF: Partial<Record<Strategy, CpuStyle>> = { cpuS: 'steady', cpuM: 'monopoly', cpuR: 'racer' };
/** シミュレーション独自の戦略が railCandidates を借りるときの性格（予備費と近道の重みが決まる） */
const styleOf = (s: Strategy): CpuStyle => CPU_STYLE_OF[s] ?? (s === 'mono' ? 'monopoly' : 'steady');
/** 計測用: 線路・条例・復興をシミュレーションで使うか（切って比べるための掃引用。ふだんは全部入り） */
const FEATURES = { rails: true, ordinances: true, recovery: true, quests: true, fishMarket: true };
/**
 * シミュレーション独自の戦略が目的地へ寄っていく強さ（endpointScore）。1歩近づくごとの点。
 * scaleWithReward: 賞金の額に比例して強くなる（物価で賞金が上がると、人は目的地を目指すようになるはず）。
 * false にすると物価の前と同じ（いつも 0.15。届く範囲に来たときしか目的地に止まらない）。
 */
const DEST_PULL = { perStep: 0.15, baseReward: 5000, scaleWithReward: true };
const FISH_MAP = new Map(FISH_DATABASE.map(f => [f.id, f]));
const RESERVE = 500;

// 取り込み（ミニゲーム）の成功率。ミニゲーム係のボット計測（src/components/fishing/reelSim.ts・装備3種同レベル・
// 各600回の「慣れた子」）を実効リールLvで補間した近似。
//   common 100% / uncommon 97% / rare Lv1 48%・Lv2以上 100% / legendary Lv2 75%・Lv3以上 100% / mythical Lv4 84%・Lv5 85%
function reelProb(eq: PlayerEquipment, rarity: FishRarity): number {
  const lv = getEffectiveLevel(eq, 'reeling');
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  let p: number;
  switch (rarity) {
    case 'common': p = 0.99; break;
    case 'uncommon': p = 0.97; break;
    case 'rare': p = clamp(0.48 + 0.51 * (lv - 1), 0.48, 0.99); break;
    case 'legendary': p = clamp(0.75 + 0.24 * (lv - 2), 0.3, 0.99); break;
    case 'mythical': p = clamp(0.84 + 0.01 * (lv - 4), 0.2, 0.85) - (lv < 4 ? 0.3 * (4 - lv) : 0); break;
  }
  return getEquippedItem(eq, 'reel') ? Math.max(0.05, p) : Math.max(0.05, p) * 0.6;
}

function successProb(eq: PlayerEquipment, rarity: FishRarity): number {
  const g = getStrikeGreenZone(getEffectiveLevel(eq, 'strike'));
  const pStrike = Math.min(0.95, 0.25 + 1.8 * g);
  return pStrike * reelProb(eq, rarity);
}

interface PlotTrack {
  kind: BuildingKind;
  owner: number;
  builtMonth: number; // 建てた巡
  invested: number;
  cum: number;
  paybackMonth: number | null; // 建ててから回収までの月数
  level2Month: number | null;
  level3Month: number | null;
  natural: number; // 自然成長で上がった回数
  open: boolean;
}

/** 名産の保有記録（回収期間の計測用） */
interface SpecTrack {
  nodeId: string;
  owner: number;
  month: number;
  cost: number;
  cum: number;
  paybackMonth: number | null;
}

/** 線路1区間の記録（回収期間の計測用） */
interface RailTrack {
  routeId: string;
  owner: number;
  month: number;
  price: number;
  fares: number; // この区間で受け取った運賃
  link: number; // 近所の効果（持ち主の線路を外したときとの月収の差を、持ち主の区間数で割ったもの）
  upkeep: number;
  ownPasses: number; // 持ち主が通った回数（歩数が浮いた回数）
  otherPasses: number; // 他の人が通った回数
  paybackMonth: number | null; // 運賃＋近所の効果−維持費 が敷いた値段に届いた月数
  halfMonth: number | null; // 資産に残らない分（値段×(1−assetRate)）に届いた月数
}

/** 災害で建物を失った記録（被災した人の順位の変化を見る） */
interface HitTrack {
  player: number;
  month: number;
  share: number; // 失った額 ÷ その時点の建物の資産価値
  rankBefore: number; // 前の月末の総資産の順位（0=首位）
}

interface PTrack {
  strategy: Strategy;
  // city は simulateRound の純収支（町税の受け取り・支払い、条例の負担、線路の維持費を含む）。rail は運賃の受け取り、aid は見舞金
  income: { city: number; fish: number; portFee: number; festival: number; destination: number; event: number; rest: number; goal: number; visitor: number; award: number; rail: number; aid: number; quest: number; derby: number };
  income12: Record<string, number> | null; // 12か月目終了時点の収入内訳（序盤の構成比用）
  spend: { build: number; upgrade: number; acquire: number; renovate: number; specialty: number; visitor: number; card: number; rail: number; fare: number };
  // 以下は内訳の覚え（income.city に含まれている）
  mayorTax: number; // 町長として受け取った町税
  taxPaid: number; // ほかの町長に払った町税
  ordinanceCost: number; // 条例の月々の負担
  railUpkeep: number; // 線路の維持費
  railLinkGain: number; // 線路の近所の効果（線路が1本もないときとの月収の差の合計。他人の線路の分も含む）
  railsLaid: number;
  firstRailMonth: number | null;
  enacts: number;
  binboLoss: number; // 貧乏神で失った額（無駄遣い・渡した額・半値で売った差額）
  acquiredFrom: number; // 買収されて受け取った額
  disasterLoss: number;
  maxSingleLossShare: number;
  assetsAt: number[];
  buildingsAt: number[];
  cityIncomeAt: number[]; // その月のまちの純収入
}

interface CGame {
  state: CityState;
  players: Player[];
  tracks: PTrack[];
  plots: Map<string, PlotTrack>;
  closed: PlotTrack[];
  turn: number;
  disasterLossTotal: number;
  propertySum: number; // 月ごとの全プレイヤー資産価値の合計（平均算出用）
  disasterEvents: number;
  levelUps: number;
  upgradablePlotMonths: number;
  kindUps: Record<string, number>;
  kindPlotMonths: Record<string, number>;
  goalClaims: number[];
  cards: CardState;
  pendingDice: number;
  bonusActions: number; // この手番の追加工事（目的地・工事券）
  specs: Map<string, SpecTrack>;
  specsClosed: SpecTrack[];
  regionMonoMonths: number;
  regionMonoEver: boolean;
  firstRegionMono: number | null; // 最初に地方独占が起きた月

  binboDamage: number; // binboMischief が返す「被害額」の合計
  binboMonths: number[]; // プレイヤーごとの、月末にとりつかれていた月数
  binboAttaches: number;
  binboTransfers: number;
  visitorTotal: number;
  cardUses: Record<string, number>;
  cardsBought: number;
  awardsTotal: number;
  renovations: number;
  inspections: number;
  vacated: number;
  resDemandHist: number[]; // 住宅区画・月の需要分布 [>0, -0.5〜0, -1.5〜-0.5, ≤-1.5]
  resOccupancy: { sum: number; n: number }; // 住宅区画・月の入居率の合計と件数（空き家は除く）

  // ===== v5 =====
  months: number;
  railTracks: Map<string, RailTrack>;
  railFareTotal: number;
  ordEnacts: Record<string, number>; // 条例を出した回数（種類ごと。替えた回も数える）
  ordRepeals: number; // 条例をやめた回数
  mayorTownMonths: number; // 町長のいる町×月
  ordTownMonths: number; // そのうち条例が出ている町×月
  ordKindMonths: Record<string, number>;
  mayorTownsEver: Set<string>; // 一度でも町長が生まれた町
  seatChanges: number; // 町長が替わった（別の人になった）回数
  mayorAt: Map<string, number>; // 前の月末の町長
  taxMoved: number; // 町税で動いた額
  recoveryStarts: number; // 復興特需が始まった（残り月が戻った）町の数
  aidTotal: number;
  recoveryBuilds: number; // 復興特需の町での建設・再開発・修理の回数
  recoverySaved: number; // 割引で浮いた額
  hits: HitTrack[];
  /** 町ごとの建物×月と収入（特色の比較用） */
  townIncome: Map<string, { plotMonths: number; levelMonths: number; income: number }>;

  // ===== お題・魚市場 =====
  /** 年度ごとのお題の結果（4月の引き直しの前と最後の月に記録） */
  questLog: { id: QuestId; year: number; need: number; done: number }[];
  questPrizeTotal: number;
  /** 年度末の、全部のお題の進み具合（引かれなかったお題も）。数を決めるための分布。「お題:年度」→ 値ごとの人数 */
  questDist: Map<string, Map<number, number>>;
  /** 釣り: 竿を出した回数・釣れた回数・売値の合計・売値の倍率の合計・漁場の状態ごとの回数 */
  fishing: { casts: number; caught: number; sale: number; mulSum: number; byFishery: Record<string, number> };
  fishBooms: number; // 大物で町おこしが起きた回数
  derbyHeld: number; // 釣り大会で優勝者が出た回数
  derbyPrizeTotal: number;
}

function makePlayer(i: number, strategy?: Strategy): Player {
  const cpuStyle = strategy ? CPU_STYLE_OF[strategy] : undefined;
  return {
    id: i, name: `P${i + 1}`, color: '#fff', currentNode: CITY_START_NODE, money: CITY_INITIAL_MONEY,
    equipment: createInitialEquipment(), caughtFish: [], score: 0, hasFinished: false, finishOrder: null,
    skipNextTurn: false, extraTurn: false, fishBonusMultiplier: 1, fishBonusTurnsLeft: 0,
    ...(cpuStyle ? { isCpu: true, cpuStyle } : {}),
  };
}

const plotKey = (nodeId: string, idx: number) => `${nodeId}#${idx}`;

function totalProperty(g: CGame): number {
  let s = 0;
  for (let i = 0; i < g.players.length; i++) s += playerPropertyValue(g.state, i);
  return s;
}

/** 災害・イベントの前後で資産価値の目減りを測る */
function measureLoss(g: CGame, before: CityState, after: CityState) {
  let total = 0;
  for (let i = 0; i < g.players.length; i++) {
    const b = playerPropertyValue(before, i);
    const a = playerPropertyValue(after, i);
    const loss = Math.max(0, b - a);
    if (loss > 0) {
      g.tracks[i].disasterLoss += loss;
      if (b > 0) g.tracks[i].maxSingleLossShare = Math.max(g.tracks[i].maxSingleLossShare, loss / b);
      total += loss;
      recordHit(g, i, loss, b);
    }
  }
  if (total > 0) g.disasterEvents++;
  g.disasterLossTotal += total;
}

/** 前の月末の総資産の順位（0=首位）。1か月目は全員同じなので null */
function rankBefore(g: CGame, i: number): number | null {
  if (g.turn < 2) return null;
  const mine = g.tracks[i].assetsAt[g.turn - 1];
  return g.tracks.filter(t => t.assetsAt[g.turn - 1] > mine).length;
}

/** 被災の記録（保険のあとに残った損失） */
function recordHit(g: CGame, i: number, loss: number, propertyBefore: number) {
  const rank = rankBefore(g, i);
  if (rank === null || propertyBefore <= 0 || loss <= 0) return;
  g.hits.push({ player: i, month: g.turn, share: loss / propertyBefore, rankBefore: rank });
}

/** 区画の追跡情報を state に合わせる（壊れた区画を閉じる） */
function syncPlots(g: CGame) {
  for (const [key, t] of g.plots) {
    if (!t.open) continue;
    const [nodeId, idxS] = key.split('#');
    const p = g.state.towns[nodeId]?.plots[Number(idxS)];
    if (!p || p.kind !== t.kind) {
      t.open = false;
      g.closed.push(t);
      g.plots.delete(key);
    } else {
      t.owner = p.owner;
      if (p.level >= 2 && t.level2Month === null) t.level2Month = g.turn - t.builtMonth + 1;
      if (p.level >= MAX_BUILDING_LEVEL && t.level3Month === null) t.level3Month = g.turn - t.builtMonth + 1;
    }
  }
}

// 同じ状態に対する町の統計を使い回す（候補マスを評価するたびに全町を計算し直さない。挙動は変わらない）
let statsCacheKey: CityState | null = null;
let statsCacheVal: ReturnType<typeof computeAllStats> | null = null;
function cachedStats(state: CityState): ReturnType<typeof computeAllStats> {
  if (statsCacheKey !== state || !statsCacheVal) {
    statsCacheKey = state;
    statsCacheVal = computeAllStats(state);
  }
  return statsCacheVal;
}

// ===== 戦略: 工事の選択 =====

type Act =
  | { type: 'build'; idx: number; kind: BuildingKind }
  | { type: 'upgrade'; idx: number }
  | { type: 'acquire'; idx: number }
  | { type: 'renovate'; idx: number }
  /** 町長として条例を出す（null はやめる） */
  | { type: 'enact'; kind: OrdinanceKind | null }
  /** 隣の中継マスに線路を敷く */
  | { type: 'rail'; route: string };

/** 建物の種類に対応する需要（観光は幸福度から） */
function demandOf(kind: BuildingKind, st: { demand: { r: number; c: number; i: number }; happiness: number }): number {
  return kind === 'res' ? st.demand.r : kind === 'com' ? st.demand.c : kind === 'ind' ? st.demand.i : kind === 'tourism' ? (st.happiness - CITY_ECONOMY.tourismGrowthHappiness) / 2 : 0;
}

function chooseAction(g: CGame, i: number, nodeId: string): Act | null {
  const own = g.tracks[i].strategy;
  if (own === 'fisher' || CPU_STYLE_OF[own]) return null; // 本物の CPU は cpuAction で決める
  const strat = own === 'rail' ? 'demand' : own; // 鉄道王の建て方は需要追従
  const info = getTownInfo(nodeId);
  const town = g.state.towns[nodeId];
  if (!info || !town) return null;
  const money = g.players[i].money - RESERVE;
  const st = cachedStats(g.state).get(nodeId)!;
  const empty = town.plots.map((p, idx) => (p ? -1 : idx)).filter(idx => idx >= 0);
  const canB = (kind: BuildingKind) => empty.length > 0 && !canBuild(g.state, nodeId, kind, empty[0], money);
  const buildA = (kind: BuildingKind): Act => ({ type: 'build', idx: empty[0], kind });
  const ownUp = (kinds: BuildingKind[]) => {
    const cands = town.plots
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p && p.owner === i && !p.vacant && kinds.includes(p.kind) && isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL)
      .filter(({ p, idx }) => upgradeCost(p!, nodeId, town) <= money && idx >= 0);
    cands.sort((a, b) => a.p!.level - b.p!.level);
    return cands[0] ? ({ type: 'upgrade', idx: cands[0].idx } as Act) : null;
  };
  // 自分の空き家は、需要が空き家の境目より上に戻っていれば直す（戻っていなければ直してもすぐ空く）
  const vacantIdx = town.plots.findIndex(p => p && p.owner === i && p.vacant && demandOf(p.kind, st) > CITY_ECONOMY.vacancyDemand && renovateCost(p, nodeId, town) <= money);
  if (vacantIdx >= 0) return { type: 'renovate', idx: vacantIdx };
  // 空き家の警告（自分の住宅の lowMonths>0 か空き家）: 住宅が余っているので、雇用や幸福度を足す
  const resWarn = town.plots.some(p => p && p.owner === i && p.kind === 'res' && (p.vacant || (p.lowMonths ?? 0) > 0));
  const mixForRes = (): Act | null => {
    if (st.powered && canB('com') && st.demand.c > -0.5) return buildA('com');
    if (canB('park') && st.happiness < 8) return buildA('park');
    if (st.powered && canB('ind') && info.cls !== 'onsen') return buildA('ind');
    return null;
  };

  switch (strat) {
    case 'res': {
      // 住宅需要がひどくマイナスの町（住宅の供給過多）には建てない。空き家の警告が出たら商業・公園・工業を混ぜる
      if (resWarn) {
        const mix = mixForRes();
        if (mix) return mix;
      }
      if (canB('res') && st.demand.r > -0.5) return buildA('res');
      const mine = town.plots.some(p => p?.owner === i && p.kind === 'res');
      if (mine && st.happiness < 6 && canB('park')) return buildA('park');
      const up = ownUp(['res']);
      if (up && st.demand.r > -1) return up;
      return null;
    }
    case 'indpow': {
      const hasComInd = info.allowed.includes('ind') || info.allowed.includes('com');
      if (!st.powered && hasComInd && canB('power')) return buildA('power');
      if (st.powered) {
        const pref: BuildingKind[] = st.demand.i >= st.demand.c ? ['ind', 'com'] : ['com', 'ind'];
        for (const k of pref) if (canB(k)) return buildA(k);
        const up = ownUp(['com', 'ind']);
        if (up) return up;
      }
      return null;
    }
    case 'tour': {
      if (canB('tourism')) return buildA('tourism');
      const up = ownUp(['tourism']);
      if (up) return up;
      const mine = town.plots.some(p => p?.owner === i);
      if (mine && canB('park') && st.happiness < 8) return buildA('park');
      if (!info.allowed.includes('tourism') && canB('res')) return buildA('res');
      return null;
    }
    case 'mono': {
      // 区画の少ない町（もとの区画が4以下）を1人で埋めて独占ボーナスを狙う
      const small = (town.base ?? town.plots.length) <= 4;
      if (!small) {
        // 大きな町では独占は狙わず、需要に沿って建てて資金を寝かせない
        const up = ownUp(['res', 'ind', 'com', 'tourism']);
        if (up) return up;
        const opts: { k: BuildingKind; d: number }[] = [
          { k: 'res' as BuildingKind, d: st.demand.r },
          { k: 'com' as BuildingKind, d: st.powered ? st.demand.c : -9 },
          { k: 'ind' as BuildingKind, d: st.powered ? st.demand.i : -9 },
        ].sort((a, b) => b.d - a.d);
        for (const o of opts) if (o.d > 0 && canB(o.k)) return buildA(o.k);
        return null;
      }
      const others = town.plots.map((p, idx) => ({ p, idx })).filter(({ p }) => p && p.owner !== i);
      const mineN = town.plots.filter(p => p?.owner === i).length;
      // 他人の建物が1〜2つで自分が同数以上なら買収して独占に近づける
      if (others.length > 0 && others.length <= 2 && mineN >= others.length) {
        const cheapest = others.sort((a, b) => acquireCost(a.p!, nodeId, town) - acquireCost(b.p!, nodeId, town))[0];
        if (acquireCost(cheapest.p!, nodeId, town) <= money) return { type: 'acquire', idx: cheapest.idx };
      }
      if (others.length <= 1) {
        // 住宅が余り気味（需要 < −0.5 か空き家の警告）なら、住宅の代わりに雇用・幸福度を足して埋める
        const resOk = st.demand.r > -0.5 && !resWarn;
        const fill: BuildingKind[] = info.cls === 'onsen' ? ['tourism', 'com', 'park'] : info.cls === 'port' ? ['port', 'ind', 'com', 'park'] : st.powered ? ['ind', 'park'] : ['power', 'park'];
        const pref: BuildingKind[] = resOk ? ['res', ...fill] : fill;
        for (const k of pref) if (canB(k)) return buildA(k);
      }
      return ownUp(['res', 'ind', 'com', 'tourism']);
    }
    case 'demand': {
      if (info.allowed.includes('port') && canB('port')) return buildA('port');
      const hasComInd = info.allowed.includes('ind') || info.allowed.includes('com');
      if (!st.powered && hasComInd && canB('power') && town.plots.some(p => p?.kind === 'com' || p?.kind === 'ind')) return buildA('power');
      if (st.pollution >= 3 && canB('park')) return buildA('park');
      const opts: { k: BuildingKind; d: number }[] = [
        { k: 'res' as BuildingKind, d: st.demand.r },
        { k: 'com' as BuildingKind, d: st.powered ? st.demand.c : -9 },
        { k: 'ind' as BuildingKind, d: st.powered ? st.demand.i : -9 },
      ].sort((a, b) => b.d - a.d);
      for (const o of opts) if (o.d > -1 && canB(o.k)) return buildA(o.k);
      if (canB('tourism') && st.happiness >= 6) return buildA('tourism');
      return ownUp(['res', 'com', 'ind', 'tourism']);
    }
    case 'mayor': {
      // 町長狙い: 区画の半分より多くを取りに行く。届く見込みのある町では需要が低くても建てて数を稼ぎ、あと1軒なら買収する
      const stand = mayorStanding(town, i);
      const byDemand = (floor: number): Act | null => {
        if (!st.powered && (info.allowed.includes('ind') || info.allowed.includes('com')) && canB('power') && town.plots.some(p => p?.kind === 'com' || p?.kind === 'ind')) return buildA('power');
        const opts: { k: BuildingKind; d: number }[] = [
          { k: 'res' as BuildingKind, d: st.demand.r },
          { k: 'com' as BuildingKind, d: st.powered ? st.demand.c : -9 },
          { k: 'ind' as BuildingKind, d: st.powered ? st.demand.i : -9 },
        ].sort((a, b) => b.d - a.d);
        for (const o of opts) if (o.d > floor && canB(o.k)) return buildA(o.k);
        if (canB('tourism') && st.happiness >= 6) return buildA('tourism');
        return null;
      };
      if (stand.mayor !== i) {
        if (empty.length > 0 && stand.mine + empty.length >= stand.need) {
          // 座に届く: 需要に沿う物を優先し、なければ安い物（公園・住宅）で数を稼ぐ
          const b = byDemand(-1) ?? (canB('park') ? buildA('park') : canB('res') ? buildA('res') : null);
          if (b) return b;
        }
        if (stand.mine + 1 >= stand.need && empty.length === 0) {
          const others = town.plots.map((p, idx) => ({ p, idx })).filter(({ p }) => p && p.owner !== i);
          const cheapest = others.sort((a, b) => acquireCost(a.p!, nodeId, town) - acquireCost(b.p!, nodeId, town))[0];
          if (cheapest && acquireCost(cheapest.p!, nodeId, town) <= money) return { type: 'acquire', idx: cheapest.idx };
        }
      }
      // 町長になった町・届かない町: 需要に沿って建て、自分の建物を育てる
      return byDemand(-1) ?? ownUp(['res', 'com', 'ind', 'tourism']);
    }
  }
  return null;
}

/** 町長として、今より得になる条例があるか（本物の CPU と同じ判断）。同じ状態には結果を使い回す */
let ordCacheState: CityState | null = null;
const ordCache = new Map<string, ReturnType<typeof chooseOrdinance>>();
function ordinanceChoice(g: CGame, i: number, nodeId: string): ReturnType<typeof chooseOrdinance> {
  if (!FEATURES.ordinances) return null;
  const town = g.state.towns[nodeId];
  if (!town || mayorOf(town) !== i) return null;
  if (ordCacheState !== g.state) {
    ordCacheState = g.state;
    ordCache.clear();
  }
  const key = `${nodeId}:${i}:${g.turn}`;
  if (!ordCache.has(key)) ordCache.set(key, chooseOrdinance(g.state, nodeId, i, g.players[i].money, g.turn));
  return ordCache.get(key) ?? null;
}

const monthsLeftOf = (g: CGame) => g.months - g.turn + 1;

/** 借りてきた CPU の判断で、今いる町から敷く線路（値打ちがプラスの最良のもの） */
function railChoice(g: CGame, i: number, nodeId: string): string | null {
  if (!FEATURES.rails) return null;
  const rc = railCandidates(g.state, nodeId, i, g.players[i].money, styleOf(g.tracks[i].strategy), monthsLeftOf(g))[0];
  return rc && rc.value > 0 ? rc.route : null;
}

/** 鉄道王の予備費（線路を敷いたあとに残すお金） */
const RAIL_KING_RESERVE = 2000;

/**
 * 鉄道王: 自分の建物がある町で、払えるなら線路を1本敷く。
 * 自分の建物がある町へ向かう区間・自分の線路の続き・目的地への近道・安い区間の順に好む。
 */
function railKingChoice(g: CGame, i: number, nodeId: string): string | null {
  if (!FEATURES.rails) return null;
  const money = g.players[i].money;
  const opts = railOptions(g.state, nodeId, i, money).filter(o => !o.reason && money - o.price >= RAIL_KING_RESERVE);
  if (!opts.length) return null;
  const rails = g.state.rails ?? {};
  const mineAround = (town: string, except: string) => routeEnds(town).some(r => r !== except && rails[r] === i);
  const dest = g.state.destination;
  let best: string | null = null;
  let bestS = -Infinity;
  for (const o of opts) {
    let sc = -o.price / 3000;
    if (o.otherEnd && g.state.towns[o.otherEnd]?.plots.some(p => p && p.owner === i)) sc += 3;
    if (mineAround(nodeId, o.routeId)) sc += 1;
    if (o.otherEnd && mineAround(o.otherEnd, o.routeId)) sc += 2;
    if (dest) {
      const d0 = railDistancesFrom(rails, dest).get(nodeId) ?? 40;
      const d1 = railDistancesFrom({ ...rails, [o.routeId]: i }, dest).get(nodeId) ?? 40;
      if (d1 < d0) sc += 1;
    }
    if (sc > bestS) {
      bestS = sc;
      best = o.routeId;
    }
  }
  return best;
}

/** 本物の CPU の工事の判断（chooseCityAction）をシミュレーションの行動に直す */
function cpuAction(g: CGame, i: number, nodeId: string, style: CpuStyle): Act | null {
  const a = chooseCityAction(g.state, nodeId, i, g.players[i].money, style, monthsLeftOf(g));
  if (!a) return null;
  switch (a.type) {
    case 'build': return { type: 'build', idx: a.plot, kind: a.kind };
    case 'upgrade': return { type: 'upgrade', idx: a.plot };
    case 'acquire': return { type: 'acquire', idx: a.plot };
    case 'renovate': return { type: 'renovate', idx: a.plot };
    case 'enact': return FEATURES.ordinances ? { type: 'enact', kind: a.ordinance } : null;
    case 'rail': return FEATURES.rails ? { type: 'rail', route: a.route } : null;
  }
}

/**
 * 町での次の工事。本物の CPU は chooseCityAction そのまま。
 * シミュレーション独自の戦略は、戦略の工事（建設・再開発・買収・修理）→ 建てる物がなければ線路（railCandidates の値打ちがプラスのもの）。
 * 鉄道王は工事の前に線路を1本。条例は工事の回数を使わないので、ここでは選ばない（enactIfWanted）。
 */
function nextAct(g: CGame, i: number, nodeId: string, visit: { rails: number }): Act | null {
  const strat = g.tracks[i].strategy;
  if (strat === 'fisher') return null;
  const style = CPU_STYLE_OF[strat];
  if (style) return cpuAction(g, i, nodeId, style);
  if (strat === 'rail' && visit.rails === 0) {
    const route = railKingChoice(g, i, nodeId);
    if (route) return { type: 'rail', route };
  }
  const act = chooseAction(g, i, nodeId);
  if (act) return act;
  const route = railChoice(g, i, nodeId);
  return route ? { type: 'rail', route } : null;
}

/** お題: 数に届いた人にその場で賞金（ストアの settleQuestsNow と同じ。月末にも同じ関数を呼ぶ） */
function questSettleNow(g: CGame) {
  if (!g.state.quests) return;
  const r = settleQuests(g.state, g.players.length);
  if (!r.awards.length) return;
  g.state = r.city;
  for (const a of r.awards) {
    if (!g.players[a.playerIndex]) continue;
    g.players[a.playerIndex].money += a.prize;
    g.tracks[a.playerIndex].income.quest += a.prize;
    g.questPrizeTotal += a.prize;
  }
}

/** お題: 工事を1回した（工事をした地方と、built なら建てた数を数えて判定。ストアの questWork と同じ） */
function questWork(g: CGame, i: number, nodeId: string, built = false) {
  if (!g.state.quests) return;
  g.state = tallyWork(g.state, i, nodeId, built);
  questSettleNow(g);
}

/** お題: その年度の結果を記録する */
function logQuestYear(g: CGame) {
  const q = g.state.quests;
  if (!q) return;
  for (const it of q.items) g.questLog.push({ id: it.id, year: q.year, need: it.need, done: it.done.length });
  // 数を決めるための分布: その年度の終わりに、どのお題なら何人がいくつまで届いていたか
  const stats = computeAllStats(g.state);
  for (const def of QUEST_DEFS) {
    const key = `${def.id}:${q.year}`;
    let m = g.questDist.get(key);
    if (!m) {
      m = new Map();
      g.questDist.set(key, m);
    }
    for (let pi = 0; pi < g.players.length; pi++) {
      const v = questProgress(g.state, def.id, pi, stats);
      m.set(v, (m.get(v) ?? 0) + 1);
    }
  }
}

/**
 * 町長なら条例を出す（本物の CPU と同じ chooseOrdinance）。条例は工事の回数を使わず、お金もかからない。1か月に1回まで。
 * ストアの cpuStep と同じく、町に入ったら工事を選ぶ前に呼ぶ。
 */
function enactIfWanted(g: CGame, i: number, nodeId: string) {
  const ord = ordinanceChoice(g, i, nodeId);
  if (!ord) return;
  const p = g.players[i];
  const r = enactOrdinance(g.state, nodeId, i, ord.kind, p.money, g.turn);
  if (!r.ok) return;
  g.state = r.state;
  p.money -= r.cost;
  g.tracks[i].enacts++;
  if (ord.kind) g.ordEnacts[ord.kind] = (g.ordEnacts[ord.kind] ?? 0) + 1;
  else g.ordRepeals++;
  questWork(g, i, nodeId); // お題: 条例も「工事をした地方」に数える
}

/**
 * 名産を買うか。空きなら建てる戦略はみな買う（予備費を残して払えるとき）。
 * 独占狙いは、その地方で自分が半分以上を持っていれば他人の名産も買収する。釣り専念は買わない。
 */
function wantSpecialty(g: CGame, i: number, nodeId: string): boolean {
  const strat = g.tracks[i].strategy;
  if (strat === 'fisher' || !isSpecialtyNode(nodeId)) return false;
  const cpuStyle = CPU_STYLE_OF[strat];
  if (cpuStyle) return shouldBuySpecialty(g.state.specialties, nodeId, i, g.players[i].money, cpuStyle);
  const owners = g.state.specialties;
  const owner = ownerOf(owners, nodeId);
  if (owner === i) return false;
  const cost = specialtyBuyCost(owners, nodeId);
  if (g.players[i].money - RESERVE < cost) return false;
  if (owner === null) return true;
  if (strat !== 'mono') return false;
  const region = regionOfSpecialty(nodeId);
  const ids = region ? regionSpecialtyIds(region) : [];
  const mine = ids.filter(id => ownerOf(owners, id) === i).length;
  return mine * 2 >= ids.length;
}

function doActions(g: CGame, i: number, nodeId: string) {
  let used = 0;
  const limit = () => CITY_ACTIONS_PER_VISIT + g.bonusActions;
  // 名産（工事1回を使う）
  if (used < limit() && wantSpecialty(g, i, nodeId)) {
    const p = g.players[i];
    const r = buySpecialty(g.state.specialties, nodeId, i, p.money);
    if (r.ok) {
      used++;
      g.state = { ...g.state, specialties: { ...r.owners } };
      p.money -= r.cost;
      g.tracks[i].spend.specialty += r.cost;
      if (r.prevOwner !== undefined) {
        g.players[r.prevOwner].money += r.cost;
        g.tracks[r.prevOwner].acquiredFrom += r.cost;
      }
      const old = g.specs.get(nodeId);
      if (old) {
        g.specsClosed.push(old);
        g.specs.delete(nodeId);
      }
      g.specs.set(nodeId, { nodeId, owner: i, month: g.turn, cost: r.cost, cum: 0, paybackMonth: null });
      questWork(g, i, nodeId); // お題
    }
  }
  const visit = { rails: 0 };
  while (used < limit()) {
    // 町長なら、工事を選ぶ前にまず条例（工事の回数は使わない。cpuStep と同じ順番）
    enactIfWanted(g, i, nodeId);
    const act = nextAct(g, i, nodeId, visit);
    if (!act) break;
    const p = g.players[i];
    const tr = g.tracks[i];
    // 復興特需の町での工事（割引で浮いた額を測る）
    const townNow = g.state.towns[nodeId];
    const inRecovery = recoveryMonthsLeft(townNow) > 0;
    const noteRecovery = (fullPrice: number, paid: number) => {
      if (!inRecovery) return;
      g.recoveryBuilds++;
      g.recoverySaved += Math.max(0, fullPrice - paid);
    };
    if (act.type === 'enact') {
      // chooseCityAction はもう条例を選ばない（条例は enactIfWanted が出す）。型の上だけ残っている枝
      break;
    } else if (act.type === 'rail') {
      const r = layRail(g.state, nodeId, act.route, i, p.money);
      if (!r.ok) break;
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.rail += r.cost;
      tr.railsLaid++;
      if (tr.firstRailMonth === null) tr.firstRailMonth = g.turn;
      visit.rails++;
      g.railTracks.set(act.route, { routeId: act.route, owner: i, month: g.turn, price: r.cost, fares: 0, link: 0, upkeep: 0, ownPasses: 0, otherPasses: 0, paybackMonth: null, halfMonth: null });
    } else if (act.type === 'build') {
      const r = build(g.state, nodeId, act.idx, act.kind, i, p.money, g.turn);
      if (!r.ok) break;
      noteRecovery(baseBuildCost(act.kind, nodeId, townNow), r.cost);
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.build += r.cost;
      g.plots.set(plotKey(nodeId, act.idx), { kind: act.kind, owner: i, builtMonth: g.turn, invested: r.cost, cum: 0, paybackMonth: null, level2Month: null, level3Month: null, natural: 0, open: true });
    } else if (act.type === 'upgrade') {
      const r = upgrade(g.state, nodeId, act.idx, i, p.money);
      if (!r.ok) break;
      const plot = townNow?.plots[act.idx];
      if (plot) noteRecovery(Math.round((baseBuildCost(plot.kind, nodeId, townNow) * 0.8 * plot.level) / 100) * 100, r.cost);
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.upgrade += r.cost;
      const t = g.plots.get(plotKey(nodeId, act.idx));
      if (t) t.invested += r.cost;
    } else if (act.type === 'renovate') {
      const r = renovate(g.state, nodeId, act.idx, i, p.money);
      if (!r.ok) break;
      const plot = townNow?.plots[act.idx];
      if (plot) noteRecovery(Math.round((baseBuildCost(plot.kind, nodeId, townNow) * CITY_ECONOMY.renovateCostRate) / 100) * 100, r.cost);
      g.state = r.state;
      p.money -= r.cost;
      tr.spend.renovate += r.cost;
      g.renovations++;
      const t = g.plots.get(plotKey(nodeId, act.idx));
      if (t) t.invested += r.cost;
    } else {
      // 地上げが効いていれば価値の1.1倍で買収できる（ストアの cityAcquire と同じ）
      const town = g.state.towns[nodeId];
      const plot = town?.plots[act.idx];
      let price: number | null = null;
      if (plot) {
        const lg = consumeLandGrab(g.cards, i);
        if (lg.used) {
          price = landGrabPrice(plotValue(plot, nodeId, town));
          if (p.money < price) break;
          g.cards = lg.cs;
        }
      }
      const r = acquire(g.state, nodeId, act.idx, i, price !== null ? Infinity : p.money);
      if (!r.ok) break;
      const cost = price ?? r.cost;
      g.state = r.state;
      p.money -= cost;
      tr.spend.acquire += cost;
      if (r.prevOwner !== undefined) {
        g.players[r.prevOwner].money += cost;
        g.tracks[r.prevOwner].acquiredFrom += cost;
      }
    }
    used++;
    syncPlots(g);
    questWork(g, i, nodeId, act.type === 'build'); // お題: 工事をした地方（新築は建てた数にも）
  }
  // 人は工事を使い切った後でも条例を出せる（この訪問で町長になったときなど）。本物の CPU は工事が残っている間だけ考える
  if (!CPU_STYLE_OF[g.tracks[i].strategy]) enactIfWanted(g, i, nodeId);
}


// ===== 釣り（まちづくり中の寄り道） =====

/**
 * 釣り。人を模したボットは3回（成功率は successProb、大漁あり）。本物の CPU は cpu = true で、cpuCatchChance・大漁なし。
 * 魚市場: 売値 = 基本 × 賑わい × 漁場 × 物価。漁場が荒れると出る魚も変わる。7月は釣り大会に数え、大物（レア以上）で町おこし。
 */
function doFishing(g: CGame, i: number, nodeId: string, casts = 3, cpu = false) {
  const p = g.players[i];
  const node = NODE_MAP.get(nodeId)!;
  const isSpecial = node.type === 'fishing_special';
  for (let k = 0; k < casts; k++) {
    if (!getEquippedItem(p.equipment, 'rod')) return;
    const parts = FEATURES.fishMarket ? fishPriceParts(g.state, nodeId, g.turn, cachedStats(g.state).get(nodeId)) : null;
    const select = parts?.fishery.select;
    const mul = parts?.mul ?? 1;
    const fish = selectFish(node.id, node.region, p.equipment, isSpecial, false, select);
    g.fishing.casts++;
    if (parts) g.fishing.byFishery[parts.fishery.level] = (g.fishing.byFishery[parts.fishery.level] ?? 0) + 1;
    if (random() < (cpu ? cpuCatchChance(p, fish) : successProb(p.equipment, fish.rarity))) {
      const all = [createCaughtFish(fish.id, node.id, g.turn, p.equipment)];
      // 大漁（人の釣りだけ。CPU の町の釣りには無い）
      const bonus = cpu ? 0 : checkTairyou(p.equipment, isSpecial);
      for (let b = 0; b < bonus; b++) all.push(createCaughtFish(selectFish(node.id, node.region, p.equipment, isSpecial, false, select).id, node.id, g.turn, p.equipment));
      let sale = 0;
      const kinds: { rarity: FishRarity }[] = [];
      for (const c of all) {
        const fd = FISH_MAP.get(c.fishId);
        sale += fd ? fishSalePrice(fd.rarity, c.size, mul) : Math.round(200 * mul);
        if (fd) kinds.push(fd);
      }
      p.money += sale;
      g.tracks[i].income.fish += sale;
      g.fishing.caught++;
      g.fishing.sale += sale;
      g.fishing.mulSum += mul;
      // 水揚げ手数料は、倍率を掛けた後の売値に掛かる
      const fee = portFee(g.state, nodeId, sale);
      if (fee && fee.fee > 0 && g.players[fee.owner]) {
        g.players[fee.owner].money += fee.fee;
        g.tracks[fee.owner].income.portFee += fee.fee;
      }
      if (FEATURES.fishMarket) {
        // 7月は釣り大会に数える。大物で町おこし（その町に特需）
        g.state = recordDerby(g.state, i, sale, g.turn, g.players.length);
        if (g.state.towns[nodeId] && isBoomCatch(kinds)) {
          g.state = startBoom(g.state, nodeId, FISH_MARKET.boomMonths);
          g.fishBooms++;
        }
      }
      // お題: 釣った種類
      if (g.state.quests) {
        g.state = tallyFish(g.state, i, all.map(c => ({ fishId: c.fishId })));
        questSettleNow(g);
      }
    }
    // まちづくりでは道具は傷まない（魚市場を入れる前は釣るたびに傷んでいた）
    if (FEATURES.fishMarket) continue;
    p.equipment = applyDurabilityLoss(p.equipment);
    const eq = p.equipment;
    for (const t of ['rod', 'reel', 'lure'] as const) {
      if (eq.equipped[t]) continue;
      const cand = eq.inventory.find(it => it.type === t && !isBroken(it));
      if (cand) p.equipment = { ...p.equipment, equipped: { ...p.equipment.equipped, [t]: cand.id } };
    }
  }
}

// ストア(useGameStore.ts)の中継マスの道中イベント（ROAD_EVENTS）とゴール着順賞金（CITY_GOAL_REWARDS）の写し
const ROAD_EVENT_AMOUNTS = [600, -300, 500, -400, 800, -500];
const CITY_GOAL_REWARDS = [5000, 3000, 2000, 1000];

// ===== 移動 =====

function endpointScore(g: CGame, i: number, path: string[], fromNode: string): number {
  const nodeId = path[path.length - 1];
  const strat = g.tracks[i].strategy;
  const node = NODE_MAP.get(nodeId);
  if (!node) return -99;
  let s = random();
  if (g.state.destination === nodeId) s += 3 + g.state.destinationReward / 2000;
  else if (g.state.destination) {
    // 線路は歩数を使わないので、線路を考えた距離で近さを測る（線路が無ければ盤面の距離と同じ）
    const d = railDistancesFrom(g.state.rails, g.state.destination);
    // 賞金が大きいほど目的地へ寄る（1年目のふつうの賞金 ¥5,000 で1歩 0.15。物価で賞金が4倍なら 0.6）
    const pull = DEST_PULL.scaleWithReward ? g.state.destinationReward / DEST_PULL.baseReward : 1;
    s += ((d.get(fromNode) ?? 30) - (d.get(nodeId) ?? 30)) * DEST_PULL.perStep * pull;
  }
  if (node.type === 'capital') s += 1.5;
  if (node.type === 'fishing' || node.type === 'fishing_special') s += strat === 'fisher' ? 4 : 0.8;
  if (node.type === 'event_bad') s -= 1;
  if (node.type === 'rest') s += 0.5;
  if (isTown(node) && strat !== 'fisher') {
    const todo = !!chooseAction(g, i, nodeId) || wantSpecialty(g, i, nodeId);
    // 鉄道王が線路を敷ける町も「用事のある町」
    if (todo || (strat === 'rail' && !!railKingChoice(g, i, nodeId))) s += 3;
    // 町長として出したい条例がある町（条例はただで出せるので、寄れるなら寄る。工事のある町よりは軽い）
    if (ordinanceChoice(g, i, nodeId)) s += 1.5;
    // 復興特需の町は建設・再開発が安い（用事があるときだけ寄る）
    if (todo && FEATURES.recovery && recoveryMonthsLeft(g.state.towns[nodeId]) > 0) s += 1.5;
  }
  // 貧乏神にとりつかれていたら、他の駒のいるマスを通って押し付けたい
  if (g.state.binbo?.playerIndex === i) {
    const others = new Set(g.players.filter((_, k) => k !== i).map(pl => pl.currentNode));
    if (path.slice(1).some(n => others.has(n))) s += 5;
  }
  // 買い物代を払う町は少し避ける（他人の商業・観光の多い町）
  const fee = visitorFees(g.state, nodeId, i, g.players[i].money, g.turn).total;
  s -= fee / 1500;
  // 他人の線路の運賃も同じ重みで少し避ける
  s -= railFares(g.state.rails, path, i, g.players[i].money).total / 1500;
  return s;
}

/** 線路に乗る: 他人の線路は1区間ごとに運賃を払う（ストアの railFaresAfterMove と同じ。移動の直後・到着の処理より前） */
function rideRails(g: CGame, i: number, path: string[]) {
  const rails = g.state.rails;
  if (!rails) return;
  const p = g.players[i];
  // 区間ごとの記録（railFares と同じ数え方: 1回の移動で払うのは所持金の fareMaxRate まで）
  let left = Math.floor(Math.max(0, p.money) * RAIL_ECONOMY.fareMaxRate);
  for (const id of path.slice(1, -1)) {
    const owner = rails[id];
    if (owner === undefined) continue;
    const t = g.railTracks.get(id);
    if (owner === i) {
      if (t) t.ownPasses++;
      continue;
    }
    if (t) t.otherPasses++;
    const pay = Math.min(left, RAIL_ECONOMY.fare);
    left -= pay;
    if (t) t.fares += pay;
  }
  const fares = railFares(rails, path, i, p.money);
  if (fares.total <= 0) return;
  p.money = Math.max(0, p.money - fares.total);
  g.tracks[i].spend.fare += fares.total;
  g.railFareTotal += fares.total;
  for (const pay of fares.payments) {
    g.players[pay.owner].money += pay.amount;
    g.tracks[pay.owner].income.rail += pay.amount;
  }
}

function playerNodes(g: CGame): string[] {
  return g.players.map(pl => pl.currentNode);
}

/** 貧乏神: とりつかれた人が動いたら、通ったマスの駒へ移る */
function binboMove(g: CGame, i: number, path: string[]) {
  const r = transferOnMove(g.state.binbo, i, path, playerNodes(g));
  if (r.to !== null) {
    g.state = { ...g.state, binbo: r.binbo };
    g.binboTransfers++;
  }
}

/** 災害の前後で保険を効かせる（ストアの applyInsurance と同じ）。disasters は保険で戻った被害を除いた報告 */
function insure(g: CGame, before: CityState, after: CityState, disasters: CityDisasterReport[]): { city: CityState; disasters: CityDisasterReport[] } {
  let city = after;
  const out: CityDisasterReport[] = [];
  for (const d of disasters) {
    const r = protectInsured(before, city, d, g.cards);
    city = r.city;
    g.cards = r.cs;
    out.push(r.report);
  }
  return { city, disasters: out };
}

/**
 * 災害の後始末（ストアと同じ順番: 保険 → settleDisasters）。保険のあとに残った被害の町は復興特需になり、
 * 全壊した建物の持ち主に見舞金が出る。
 */
function settleAfterDisaster(g: CGame, before: CityState, after: CityState, disasters: CityDisasterReport[]): { city: CityState; disasters: CityDisasterReport[] } {
  const ins = insure(g, before, after, disasters);
  if (!FEATURES.recovery) return ins;
  const settle = settleDisasters(before, ins.city, ins.disasters, g.players.length);
  g.recoveryStarts += settle.recoveryTowns.length;
  settle.aid.forEach((v, k) => {
    if (v <= 0 || !g.players[k]) return;
    g.players[k].money += v;
    g.tracks[k].income.aid += v;
    g.aidTotal += v;
  });
  return { city: settle.state, disasters: ins.disasters };
}

function playBotCard(g: CGame, i: number, idx: number, target: number | undefined, timing: 'before_roll' | 'in_town', nodeId: string): CardEffect | null {
  const r = playCard(g.cards, i, idx, target, { timing, hasEmptyPlot: emptyPlotIndex(g.state, nodeId) >= 0, pendingDice: g.pendingDice });
  if ('error' in r) return null;
  g.cards = r.cs;
  g.cardUses[r.card] = (g.cardUses[r.card] ?? 0) + 1;
  return r.effect;
}

/** 到着したマスの処理（ストアの executeCityNodeAction と同じ順番）と町の画面 */
function arrive(g: CGame, i: number, best: string) {
  const p = g.players[i];
  const node = NODE_MAP.get(best)!;
  const tr = g.tracks[i];
  // 目的地に一番乗り: 賞金・次の目的地・特需・追加工事・貧乏神
  if (g.state.destination === best) {
    p.money += g.state.destinationReward;
    tr.income.destination += g.state.destinationReward;
    const nd = pickDestination(best, best, g.turn, stageOf(g.state.quests)); // 今年の舞台に寄せる
    g.state = startBoom({ ...g.state, destination: nd.nodeId, destinationReward: nd.reward }, best);
    if (g.state.quests) g.state = tallyFirst(g.state, i); // お題: 一番乗りの回数
    g.bonusActions += CITY_ECONOMY.destinationBonusActions;
    const prev = g.state.binbo?.playerIndex ?? null;
    const nb = attachOnDestination(g.state.binbo, i, playerNodes(g), best, g.players.length, g.players.map(pl => pl.money));
    g.state = { ...g.state, binbo: nb };
    if (nb.playerIndex !== null && nb.playerIndex !== prev) g.binboAttaches++;
  }
  // 客としての買い物代
  const fees = visitorFees(g.state, best, i, p.money, g.turn); // 単価は物価で年ごとに上がる
  if (fees.total > 0) {
    p.money = Math.max(0, p.money - fees.total);
    tr.spend.visitor += fees.total;
    g.visitorTotal += fees.total;
    for (const pay of fees.payments) {
      g.players[pay.owner].money += pay.amount;
      g.tracks[pay.owner].income.visitor += pay.amount;
    }
  }
  // 視察
  const ins = recordInspection(g.state, best, i);
  if (ins.inspected && ins.state !== g.state) {
    g.state = ins.state;
    g.inspections++;
  }
  let panel = false;
  let cardDrawn = false;
  switch (node.type) {
    case 'event_good':
    case 'event_bad':
    case 'event_random': {
      // 村マスでは必ず「まちの出来事」。半分の確率でカードも引く
      const kind = node.type === 'event_good' ? 'good' : node.type === 'event_bad' ? 'bad' : 'random';
      const card = drawCityEvent(kind);
      const before = g.state;
      const out = applyCityEvent(g.state, card, i, best, g.turn);
      g.state = out.disaster ? settleAfterDisaster(g, before, out.state, [out.disaster]).city : out.state;
      const nm = Math.max(0, p.money + out.moneyDelta);
      tr.income.event += nm - p.money;
      p.money = nm;
      if (card.effect.kind === 'disaster') measureLoss(g, before, g.state);
      if (card.effect.kind === 'free_build') {
        const town = g.state.towns[best];
        town?.plots.forEach((pl, idx) => {
          if (pl && pl.builtTurn === g.turn && pl.owner === i && !g.plots.has(plotKey(best, idx))) {
            g.plots.set(plotKey(best, idx), { kind: pl.kind, owner: i, builtMonth: g.turn, invested: 0, cum: 0, paybackMonth: null, level2Month: null, level3Month: null, natural: 0, open: true });
          }
        });
      }
      syncPlots(g);
      if (random() < CARD_DROP_VILLAGE) cardDrawn = true;
      panel = isTown(node);
      break;
    }
    case 'route':
      if (random() < CARD_DROP_ROUTE) cardDrawn = true;
      if (random() < 0.3) {
        const amt = ROAD_EVENT_AMOUNTS[Math.floor(random() * ROAD_EVENT_AMOUNTS.length)] * priceScale(g.turn); // 物価
        const nm = Math.max(0, p.money + amt);
        tr.income.event += nm - p.money;
        p.money = nm;
      }
      break;
    case 'rest':
      p.money += REST_MONEY_BONUS;
      tr.income.rest += REST_MONEY_BONUS;
      panel = true;
      break;
    case 'goal':
      // 着順賞金は1人1回
      if (!g.goalClaims.includes(i)) {
        const reward = CITY_GOAL_REWARDS[g.goalClaims.length] ?? CITY_GOAL_REWARDS[CITY_GOAL_REWARDS.length - 1];
        g.goalClaims.push(i);
        p.money += reward;
        tr.income.goal += reward;
      }
      break;
    case 'start':
      break;
    default:
      panel = isTown(node);
  }
  if (cardDrawn) g.cards = addCard(g.cards, i, drawCard()).cs;
  questSettleNow(g); // お題: 一番乗りなどで届いていれば、その場で賞金（ストアの到着処理の最後と同じ）
  if (!panel) return;
  // 町の画面: 祭り → 釣り → カード（誘致・地上げ・工事券）→ 売り場 → 名産・工事
  if (node.type === 'capital' && node.capitalEventId) {
    const ev = getCapitalEvent(node.capitalEventId);
    const feast = ev?.choices.find(c => c.effect.kind === 'feast');
    if (feast && feast.effect.kind === 'feast') {
      const bonus = feast.effect.moneyBonus * priceScale(g.turn); // まちづくりでは宴の賞金に物価が掛かる（eventSlice と同じ）
      p.money += bonus;
      tr.income.festival += bonus;
      p.equipment = { ...p.equipment, inventory: p.equipment.inventory.map(it => ({ ...it, durability: 100 })) };
      const eq = p.equipment;
      for (const t of ['rod', 'reel', 'lure'] as const) {
        if (!eq.equipped[t]) {
          const cand = eq.inventory.find(it => it.type === t);
          if (cand) p.equipment = { ...p.equipment, equipped: { ...p.equipment.equipped, [t]: cand.id } };
        }
      }
    }
  }
  // 釣り: 人を模したボットは町に着いたら3回。本物の CPU は工事の後に2回（魚市場を入れる前は CPU もここで釣っていた）
  const isFishing = node.type === 'fishing' || node.type === 'fishing_special';
  const cpuFishes = !!CPU_STYLE_OF[tr.strategy] && FEATURES.fishMarket;
  if (isFishing && !cpuFishes) doFishing(g, i, best);
  if (tr.strategy !== 'fisher') {
    const town = g.state.towns[best];
    const wantsAcquire = (tr.strategy === 'mono' || tr.strategy === 'cpuM') && !!town && town.plots.some(pl => pl && pl.owner !== i);
    const pick = chooseCpuCard(g.cards, i, { distToDestination: Infinity, money: p.money, isInTown: true, opponents: [], hasEmptyPlot: emptyPlotIndex(g.state, best) >= 0, wantsAcquire });
    if (pick) {
      const e = playBotCard(g, i, pick.index, pick.target, 'in_town', best);
      if (e?.kind === 'build_bonus') g.bonusActions += e.extra;
      if (e?.kind === 'free_build') {
        const idx = emptyPlotIndex(g.state, best);
        const kind = idx >= 0 ? suggestFreeBuildKind(g.state, best, idx) : null;
        if (idx >= 0 && kind) {
          const b = freeBuild(g.state, best, idx, kind, i, g.turn);
          if (b.ok) {
            g.state = b.state;
            questWork(g, i, best, true); // お題: 誘致も建てた数に入る
          }
        }
      }
    }
    // 売り場（大都市・商都）: お金に余裕があり手札が少なければ工事券か保険を1枚
    if (hasCardShop(best) && p.money >= 8000 && (g.cards.hands[i]?.length ?? 0) < 2) {
      const want = p.money >= 15000 ? 'kojiken' : 'hoken';
      const r = buyCard(g.cards, i, want, p.money, g.turn); // 値段は物価で上がる（上限3倍）
      if (!('error' in r)) {
        g.cards = r.cs;
        p.money -= r.cost;
        tr.spend.card += r.cost;
        g.cardsBought++;
      }
    }
  }
  doActions(g, i, best);
  // 本物の CPU: 工事を終えたら、釣り場の町で決まった回数だけ釣る（cpuStep の cpuFishTown）
  if (isFishing && cpuFishes) {
    const casts = cpuTownCasts(node.type, p.equipment, 0);
    if (casts > 0) doFishing(g, i, best, casts, true);
  }
}

function playTurn(g: CGame, i: number) {
  const p = g.players[i];
  g.pendingDice = 1;
  g.bonusActions = 0;
  // サイコロの前のカード（保険・牛歩・急行/特急・ぶっとび・地上げ）
  if (g.tracks[i].strategy !== 'fisher' || (g.cards.hands[i]?.length ?? 0) > 0) {
    const dist = g.state.destination ? distancesFrom(g.state.destination) : null;
    const pick = chooseCpuCard(g.cards, i, {
      distToDestination: dist?.get(p.currentNode) ?? Infinity,
      money: p.money,
      isInTown: false,
      opponents: g.players.map((pl, k) => ({ index: k, distToDestination: dist?.get(pl.currentNode) ?? Infinity })),
      pendingDice: g.pendingDice,
    });
    if (pick) {
      const e = playBotCard(g, i, pick.index, pick.target, 'before_roll', p.currentNode);
      if (e?.kind === 'dice') g.pendingDice = e.count;
      if (e?.kind === 'warp') {
        const from = p.currentNode;
        const dest = pickWarpDestination(from);
        p.currentNode = dest;
        binboMove(g, i, [from, dest]);
        arrive(g, i, dest);
        g.cards = tickSlow(g.cards, i);
        return;
      }
    }
  }
  const faces = rollDiceFaces(g.pendingDice, diceCap(g.cards, i));
  const steps = faces.reduce((a, b) => a + b, 0);
  const stops = g.state.destination ? [g.state.destination] : [];
  // 線路のある中継マスは歩数を使わずに通り抜ける（止まれない）
  const paths = getReachableNodes(p.currentNode, steps, stops, g.state.rails ? railPassSet(g.state.rails) : undefined);
  let bestPath = paths[0];
  if (CPU_STYLE_OF[g.tracks[i].strategy]) {
    // 本物の CPU の道選び
    bestPath = paths[chooseCpuPath({
      paths, mode: 'city', player: p, playerIndex: i, city: g.state, turn: g.turn, maxTurns: g.months,
      goalClaims: g.goalClaims, binboHolder: g.state.binbo?.playerIndex ?? null, playerNodes: playerNodes(g),
    })] ?? paths[0];
  } else {
    let bestS = -Infinity;
    for (const pa of paths) {
      const sc = endpointScore(g, i, pa, p.currentNode);
      if (sc > bestS) {
        bestS = sc;
        bestPath = pa;
      }
    }
  }
  const best = bestPath[bestPath.length - 1];
  p.currentNode = best;
  rideRails(g, i, bestPath);
  binboMove(g, i, bestPath);
  arrive(g, i, best);
  g.cards = tickSlow(g.cards, i);
}

/**
 * 線路の月末の記録: 維持費と「近所の効果」（線路でつながった町が人口と働き口を分け合うことで増える月収）。
 * 近所の効果は、その持ち主の線路を外した状態との月収の差（cpuAI.playerMonthlyIncome。季節・景気は含めない）を区間数で割る。
 */
function railMonth(g: CGame) {
  const rails = g.state.rails;
  if (!rails || !Object.keys(rails).length) return;
  const n = g.players.length;
  const now = Array.from({ length: n }, (_, k) => playerMonthlyIncome(g.state, k));
  // 全員への効果（線路が1本もないときとの差）
  const bare: CityState = { ...g.state, rails: {} };
  for (let k = 0; k < n; k++) g.tracks[k].railLinkGain += now[k] - playerMonthlyIncome(bare, k);
  // 持ち主ごと（その人の線路だけ外す）
  const owners = [...new Set(Object.values(rails))];
  for (const o of owners) {
    const mine = Object.entries(rails).filter(([, w]) => w === o);
    const without: CityState = { ...g.state, rails: Object.fromEntries(Object.entries(rails).filter(([, w]) => w !== o)) };
    const gain = now[o] - playerMonthlyIncome(without, o);
    g.tracks[o].railUpkeep += mine.length * RAIL_ECONOMY.upkeep;
    for (const [routeId] of mine) {
      const t = g.railTracks.get(routeId);
      if (!t) continue;
      t.link += gain / mine.length;
      t.upkeep += RAIL_ECONOMY.upkeep;
      const net = t.fares + t.link - t.upkeep;
      if (t.paybackMonth === null && net >= t.price) t.paybackMonth = g.turn - t.month + 1;
      if (t.halfMonth === null && net >= t.price * (1 - RAIL_ECONOMY.assetRate)) t.halfMonth = g.turn - t.month + 1;
    }
  }
}

/** 月末: 区画ごとの収入を記録してから simulateRound を回す */
function monthEnd(g: CGame) {
  const stats = computeAllStats(g.state);
  const season = seasonOf(g.turn);
  const pw = new Map<string, number>();
  for (const [id, town] of Object.entries(g.state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const mono = monopolyOwner(town);
    const ord = ordinanceContext(town); // 条例（町長がいる町だけ効く）
    const mayor = mayorOf(town);
    if (mayor !== null) {
      g.mayorTownMonths++;
      g.mayorTownsEver.add(id);
      if (ord) {
        g.ordTownMonths++;
        g.ordKindMonths[ord.kind] = (g.ordKindMonths[ord.kind] ?? 0) + 1;
      }
    }
    let townAcc = g.townIncome.get(id);
    town.plots.forEach((p, idx) => {
      if (!p) return;
      if (p.kind === 'power' && !pw.has(id)) pw.set(id, poweredTownsWithBuildings(g.state, id));
      let v = plotIncome(p, id, s, pw.get(id) ?? 0);
      const tinfo = getTownInfo(id);
      if (v > 0 && tinfo) v = Math.round(v * seasonalIncomeMul(season, p.kind, id)); // simulateRound と同じ（季節の暦と町の特色）
      if (v > 0 && mono === p.owner) v = Math.round(v * CITY_ECONOMY.monopolyMul);
      // 町の稼ぎ（特色の比較用。町税は町の中で動くだけなので引かない）
      const o = ordinancePlotIncome(ord, p, v);
      if (!townAcc) {
        townAcc = { plotMonths: 0, levelMonths: 0, income: 0 };
        g.townIncome.set(id, townAcc);
      }
      townAcc.plotMonths++;
      townAcc.levelMonths += p.level;
      townAcc.income += o.income;
      v = o.income - o.tax; // 持ち主の手取り（観光振興を掛け、町税を引く）
      const t = g.plots.get(plotKey(id, idx));
      if (t) {
        t.cum += v;
        if (t.paybackMonth === null && t.cum >= t.invested) t.paybackMonth = g.turn - t.builtMonth + 1;
      }
      if (p.kind === 'res') {
        const d = s.demand.r;
        g.resDemandHist[d > 0 ? 0 : d > -0.5 ? 1 : d > -1.5 ? 2 : 3]++;
        if (!p.vacant) {
          g.resOccupancy.sum += occupancyRate(d);
          g.resOccupancy.n++;
        }
      }
      if (isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL) {
        g.upgradablePlotMonths++;
        g.kindPlotMonths[p.kind] = (g.kindPlotMonths[p.kind] ?? 0) + 1;
      }
    });
  }
  // 名産の月収（simulateRound と同じ式）で回収を記録し、地方独占を数える
  const owners = g.state.specialties;
  for (const t of g.specs.values()) {
    if (ownerOf(owners, t.nodeId) !== t.owner) continue;
    t.cum += specialtyIncome(t.nodeId, season.month, isSpecialtyMonopolized(owners, t.nodeId));
    if (t.paybackMonth === null && t.cum >= t.cost) t.paybackMonth = g.turn - t.month + 1;
  }
  const monoRegions = Object.keys(regionalMonopolies(owners)).length;
  g.regionMonoMonths += monoRegions;
  if (monoRegions > 0) {
    g.regionMonoEver = true;
    if (g.firstRegionMono === null) g.firstRegionMono = g.turn;
  }
  const before = g.state;
  railMonth(g);
  const levelsBefore = new Map<string, number>();
  for (const [id, town] of Object.entries(before.towns)) town.plots.forEach((p, idx) => p && levelsBefore.set(plotKey(id, idx), p.level));
  const sim = simulateRound(g.state, g.players.length, g.turn, g.players.map(p => p.money));
  g.vacated += sim.report.players.reduce((a, pr) => a + (pr.vacated ?? 0), 0);
  sim.incomes.forEach((v, i) => {
    const nm = Math.max(0, g.players[i].money + v);
    g.tracks[i].cityIncomeAt[g.turn] = v;
    g.tracks[i].income.city += nm - g.players[i].money;
    g.players[i].money = nm;
  });
  // 条例の内訳（町税・負担。どれも上の純収支に含まれている）
  sim.report.players.forEach((pr, i) => {
    g.tracks[i].mayorTax += pr.mayorTax ?? 0;
    g.tracks[i].taxPaid += pr.taxPaid ?? 0;
    g.tracks[i].ordinanceCost += pr.ordinanceCost ?? 0;
    g.taxMoved += pr.mayorTax ?? 0;
  });
  // 自然成長の回数（成長は災害より先に適用される。災害で下がった区画は数えない）
  for (const [id, town] of Object.entries(sim.state.towns)) {
    town.plots.forEach((p, idx) => {
      const lb = levelsBefore.get(plotKey(id, idx));
      if (p && lb !== undefined && p.level > lb) {
        g.levelUps++;
        g.kindUps[p.kind] = (g.kindUps[p.kind] ?? 0) + 1;
        const t = g.plots.get(plotKey(id, idx));
        if (t) t.natural++;
      }
    });
  }
  // 季節の災害による損失（地震・台風は 等級1の全壊=建設費 / 1段階ダウン=建設費×0.6）
  if (sim.report.disasters.length) {
    let total = 0;
    const perOwner = new Map<number, number>();
    for (const d of sim.report.disasters) for (const dmg of d.damages) {
      const c = baseBuildCost(dmg.kind, dmg.nodeId, before.towns[dmg.nodeId]); // 資産価値の基準（復興の割引は含めない）
      const loss = dmg.destroyed ? c : Math.round(c * 0.6);
      total += loss;
      perOwner.set(dmg.owner, (perOwner.get(dmg.owner) ?? 0) + loss);
    }
    for (const [o, loss] of perOwner) {
      if (!g.tracks[o]) continue;
      g.tracks[o].disasterLoss += loss;
      const b = playerPropertyValue(before, o);
      if (b > 0) g.tracks[o].maxSingleLossShare = Math.max(g.tracks[o].maxSingleLossShare, loss / b);
    }
    if (total > 0) g.disasterEvents++;
    g.disasterLossTotal += total;
  }
  // 保険 → 復興（保険のあとに残った被害の町に復興特需・全壊の見舞金）。runMonthEnd と同じ順番
  const settled = settleAfterDisaster(g, before, sim.state, sim.report.disasters);
  g.state = settled.city;
  // 被災の記録（保険のあとに残った損失）
  {
    const perOwner = new Map<number, number>();
    for (const d of settled.disasters) for (const dmg of d.damages) {
      const c = baseBuildCost(dmg.kind, dmg.nodeId, before.towns[dmg.nodeId]);
      perOwner.set(dmg.owner, (perOwner.get(dmg.owner) ?? 0) + (dmg.destroyed ? c : Math.round(c * 0.6)));
    }
    for (const [o, loss] of perOwner) if (g.tracks[o]) recordHit(g, o, loss, playerPropertyValue(before, o));
  }
  // 町長が替わった回数（月の初めと終わりを比べる。工事・買収・災害・区画の増加のどれで替わっても数える）
  for (const [id, town] of Object.entries(g.state.towns)) {
    const was = g.mayorAt.get(id) ?? null;
    const now = mayorOf(town);
    if (was !== null && now !== null && was !== now) g.seatChanges++;
    if (now === null) g.mayorAt.delete(id);
    else g.mayorAt.set(id, now);
  }
  // 貧乏神: 月を数え、とりついた人に悪さをする
  const prevB = g.state.binbo;
  if (prevB && prevB.playerIndex !== null) {
    const b = tickMonth(prevB);
    const who = b.playerIndex!;
    const moneys = g.players.map(pl => pl.money);
    const mm = binboMischief(b, { ...g.state, binbo: b }, who, moneys, undefined, g.turn); // 無駄遣いの上限と渡す額に物価
    mm.moneyDeltas.forEach((d, k) => {
      g.players[k].money = Math.max(0, g.players[k].money + d);
    });
    g.binboDamage += mm.damage;
    const lost = mm.kind === 'sell' ? (mm.sold ?? []).reduce((a, x) => a + x.value - x.price, 0) : Math.max(0, -(mm.moneyDeltas[who] ?? 0));
    g.tracks[who].binboLoss += lost;
    g.binboMonths[who]++;
    g.state = { ...mm.city, binbo: b };
  }
  // お題: 月末にしか分からないもの（発展度・幸福度・町長の交代など）を判定する
  questSettleNow(g);
  // 釣り大会（7月だけ）: その月の水揚げが1位の人に賞金（同額は山分け）
  if (FEATURES.fishMarket) {
    const derby = settleDerby(g.state, g.turn, g.players.map(pl => pl.name));
    g.state = derby.state;
    if (derby.winners.length) {
      g.derbyHeld++;
      for (const w of derby.winners) {
        if (!g.players[w]) continue;
        g.players[w].money += derby.prize;
        g.tracks[w].income.derby += derby.prize;
        g.derbyPrizeTotal += derby.prize;
      }
    }
  }
  // 年度末（3月）の称号: 賞金・罰金
  if (isYearEndTurn(g.turn)) {
    const ye = computeYearEnd(g.state, g.players.map(pl => pl.money), g.turn, CITY_INITIAL_MONEY);
    for (const t of ye.titles) {
      const wp = g.players[t.playerIndex];
      if (!wp) continue;
      const nm = Math.max(0, wp.money + t.prize);
      g.tracks[t.playerIndex].income.award += nm - wp.money;
      g.awardsTotal += nm - wp.money;
      wp.money = nm;
    }
  }
  // お題: 次の月が4月なら来年度のお題と舞台を引く（最後の月は引かない）。その前に今年度の結果を記録する
  if (g.state.quests && (isQuestDrawTurn(g.turn + 1) || g.turn === g.months)) {
    logQuestYear(g);
    if (g.turn !== g.months) g.state = openQuestYear(g.state, questYearOf(g.turn + 1), g.players.length);
  }
  syncPlots(g);
  g.propertySum += totalProperty(g);
  g.players.forEach((p, i) => {
    g.tracks[i].assetsAt[g.turn] = p.money + playerPropertyValue(g.state, i) + playerSpecialtyValue(g.state.specialties, i) + playerRailValue(g.state.rails, i);
    g.tracks[i].buildingsAt[g.turn] = Object.values(g.state.towns).reduce((a, t) => a + t.plots.filter(pl => pl?.owner === i).length, 0);
    if (g.turn === 12) g.tracks[i].income12 = { ...g.tracks[i].income };
  });
}

export function simulateCityGame(seed: number, strategies: Strategy[], months = CITY_DEFAULT_MONTHS): CGame {
  setRandomSource(mulberry32(seed));
  const g: CGame = {
    // 新しい対局は1年目のお題と舞台つき（ストアの sessionSlice と同じ）
    state: FEATURES.quests ? createQuestCityState(strategies.length) : createInitialCityState(),
    players: strategies.map((s, i) => makePlayer(i, s)),
    tracks: strategies.map(s => ({
      strategy: s,
      income: { city: 0, fish: 0, portFee: 0, festival: 0, destination: 0, event: 0, rest: 0, goal: 0, visitor: 0, award: 0, rail: 0, aid: 0, quest: 0, derby: 0 },
      income12: null,
      spend: { build: 0, upgrade: 0, acquire: 0, renovate: 0, specialty: 0, visitor: 0, card: 0, rail: 0, fare: 0 },
      mayorTax: 0,
      taxPaid: 0,
      ordinanceCost: 0,
      railUpkeep: 0,
      railLinkGain: 0,
      railsLaid: 0,
      firstRailMonth: null,
      enacts: 0,
      binboLoss: 0,
      acquiredFrom: 0,
      disasterLoss: 0,
      maxSingleLossShare: 0,
      assetsAt: [],
      buildingsAt: [],
      cityIncomeAt: [],
    })),
    plots: new Map(),
    closed: [],
    turn: 1,
    disasterLossTotal: 0,
    propertySum: 0,
    disasterEvents: 0,
    levelUps: 0,
    upgradablePlotMonths: 0,
    kindUps: {},
    kindPlotMonths: {},
    goalClaims: [],
    cards: createCardState(strategies.length),
    pendingDice: 1,
    bonusActions: 0,
    specs: new Map(),
    specsClosed: [],
    regionMonoMonths: 0,
    regionMonoEver: false,
    firstRegionMono: null,
    binboDamage: 0,
    binboMonths: strategies.map(() => 0),
    binboAttaches: 0,
    binboTransfers: 0,
    visitorTotal: 0,
    cardUses: {},
    cardsBought: 0,
    awardsTotal: 0,
    renovations: 0,
    inspections: 0,
    vacated: 0,
    resDemandHist: [0, 0, 0, 0],
    resOccupancy: { sum: 0, n: 0 },
    months,
    railTracks: new Map(),
    railFareTotal: 0,
    ordEnacts: {},
    ordRepeals: 0,
    mayorTownMonths: 0,
    ordTownMonths: 0,
    ordKindMonths: {},
    mayorTownsEver: new Set(),
    seatChanges: 0,
    mayorAt: new Map(),
    taxMoved: 0,
    recoveryStarts: 0,
    aidTotal: 0,
    recoveryBuilds: 0,
    recoverySaved: 0,
    hits: [],
    townIncome: new Map(),
    questLog: [],
    questPrizeTotal: 0,
    questDist: new Map(),
    fishing: { casts: 0, caught: 0, sale: 0, mulSum: 0, byFishery: {} },
    fishBooms: 0,
    derbyHeld: 0,
    derbyPrizeTotal: 0,
  };
  for (let t = 1; t <= months; t++) {
    g.turn = t;
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (p.skipNextTurn) {
        p.skipNextTurn = false;
        continue;
      }
      for (let guard = 0; guard < 4; guard++) {
        playTurn(g, i);
        if (!p.extraTurn) break;
        p.extraTurn = false;
      }
      p.extraTurn = false;
    }
    monthEnd(g);
  }
  resetRandomSource();
  return g;
}

// ===== 集計 =====

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
};
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}
const r0 = (v: number) => (Number.isFinite(v) ? Math.round(v) : NaN);
const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN);

export interface CitySummary {
  label: string;
  games: number;
  byStrategy: Record<string, { n: number; assets: number; assetsSd: number; wins: number; winRate: number; buildings: number; money: number; property: number; owned: Record<string, string>; income: Record<string, number>; spend: Record<string, number>; disasterLoss: number; maxLossShare: number; v5: Record<string, number> }>;
  paybackMedian: Record<string, number>;
  paybackRecovered: Record<string, number>;
  paybackCount: Record<string, number>;
  level3Median: number;
  level3Rate: number;
  growthPerPlotMonth: number;
  annualDisasterLossRate: number;
  leaderAt12Wins: number;
  leaderAt24Wins: number;
  winnerShareOfTotal: number;
  finalGapTop2: number;
  assetsMedianAt: Record<number, number>;
  buildingsMeanAt: Record<number, number>;
  incomeShare: Record<string, number>;
  incomeShare12: Record<string, number>;
  kindRoi: Record<string, { n: number; invested: number; cum: number; roi: number; perMonth: number }>;
  kindGrowth: Record<string, number>;
  level2Median: number;
  tierMedian: { t1: number; t2: number; t3: number }; // 36か月で発展度が壱以上・弐以上・参になった町の数（中央値）
  vacatedPerGame: number;
  specialtyPayback: number; // 最初の24か月に買った名産の回収月数（中央値）
  specialtyRecovered: number; // そのうち回収できた割合(%)
  specialtiesOwnedAtEnd: number; // 最終月に持ち主のいる名産の数（平均）
  regionMonoEverRate: number; // 地方独占が一度でも起きた局の割合(%)
  regionMonoAtEndRate: number; // 最終月に地方独占がある局の割合(%)
  regionMonoMonthsPerGame: number; // 地方独占の「地方×月」の合計（1局平均）
  firstMonoMedian: number; // 最初の地方独占の月（起きた局の中央値）
  firstMonoYear1Rate: number; // 1年目（12か月目まで）に最初の地方独占が起きた局の割合(%)
  binboDamagePerGame: number; // 貧乏神の被害額（binboMischief の damage 合計・1局平均）
  binboLossPerGame: number; // 実際に失った額（無駄遣い・渡した額・半値売りの差額・1局平均）
  binboMaxShareMedian: number; // 1局の中で一番長くとりつかれた人の割合（中央値。4人で均等なら25%）
  binboMaxShareP90: number;
  binboLossShareOfAssets: number; // 失った額 ÷ 最終総資産（とりつかれた人ごと・中央値%）
  visitorPerGame: number; // 買い物代の総額（1局）
  cardUsesPerGame: Record<string, number>;
  cardsBoughtPerGame: number;
  awardsPerGame: number;
  vacantAtEnd: number; // 最終月に空き家だった区画の割合(%)
  renovationsPerGame: number;
  inspectionsPerGame: number;
  resDemandHist: number[];
  resOccupancy: number; // 住宅の入居率の平均(%)（空き家は除く）
  rail: RailSummary;
  mayor: MayorSummary;
  recovery: RecoverySummary;
  traits: Record<string, TraitSummary>;
  /** 帳尻のずれ（運賃・町税は人から人へ動くだけ。受け取りと支払いの差の合計。0 のはず） */
  ledgerGap: number;
  quests: QuestSummary;
  fishing: FishingSummary;
}

/** お題の計測 */
export interface QuestSummary {
  /** お題ごと・年度ごと: 引かれた回数 / 数（平均）/ 達成した人の割合(%) / 誰かが達成した割合(%) */
  rows: { id: string; year: number; draws: number; need: number; rate: number; anyRate: number }[];
  /** 全部のお題をならした「1人が1つのお題を達成する割合」(%) */
  rate: number;
  /** 年度ごとの同じ割合(%) */
  rateByYear: Record<number, number>;
  /** 1局の賞金の合計 */
  prizePerGame: number;
  /**
   * 数を決めるための分布: 「お題:年度」→ その数以上に届いた人の割合(%)（年度末の値。引かれなかったお題も数える）。
   * 例: { 'build_count:1': { 3: 92, 5: 71, 8: 40 } } なら、1年目に8軒建てた人は4割
   */
  reach: Record<string, Record<number, number>>;
}

/** 魚市場の計測 */
export interface FishingSummary {
  castsPerGame: number; // 竿を出した回数（1局）
  catchRate: number; // 釣れた割合(%)
  salePerCatch: number; // 1回の釣果の売値（大漁こみ）
  mulMean: number; // 売値の倍率の平均（賑わい × 漁場 × 物価）
  fishery: Record<string, number>; // 漁場の状態の内訳(%)
  boomsPerGame: number; // 大物で町おこし
  derbyHeld: number; // 優勝者の出た釣り大会（1局。3回のうち）
  derbyPrizePerGame: number;
}

/** 鉄道の計測 */
export interface RailSummary {
  gameRate: number; // 線路が敷かれた局の割合(%)
  segmentsPerGame: number; // 1局の区間数（全局の平均）
  segmentsWhenLaid: number; // 敷かれた局だけの平均
  layersPerGame: number; // 敷いた人の数（1局）
  firstMonthMedian: number; // 最初の線路が敷かれた月（敷かれた局の中央値）
  priceMean: number;
  paybackMedian: number; // 運賃＋近所の効果−維持費で値段を回収するまでの月数（24か月目までに敷いた区間の中央値。回収できなければ Infinity）
  paybackRate: number; // 回収できた割合(%)
  halfMedian: number; // 資産に残らない分（値段×(1−assetRate)）の回収。assetRate が1なら、運賃＋近所の効果が維持費の累計を上回るまで
  halfRate: number;
  yieldPerMonth: number; // 利回り: 1区間1か月の（運賃＋近所の効果−維持費）÷ 平均の値段（%）
  perSegMonth: { fares: number; link: number; upkeep: number; net: number }; // 1区間1か月あたり
  passesPerSegMonth: { other: number; own: number }; // 1区間1か月あたりの通過（他人 / 持ち主）
  faresPerGame: number;
  linkGainPerGame: number; // 近所の効果（全員の月収の増減の合計・1局）
  layerRankChange: number; // 敷いた人の順位の変化（最初に敷いた月の前の月末 → 最終。＋は下がった）
  layerWinRate: number; // 敷いた人の勝率(%)
  layerLeadRate: number; // 参考: 敷いた時点で首位だった割合(%)
  byStrategy: Record<string, number>; // 戦略ごとの区間数（1局）
}

/** 町長と条例の計測 */
export interface MayorSummary {
  townsEver: number; // 一度でも町長が生まれた町の数（1局）
  townsAtEnd: number; // 最終月に町長のいる町
  seatChanges: number; // 町長が別の人に替わった回数（1局）
  coverage: number; // 町長のいる町×月のうち、条例が出ている割合(%)
  coverageAtEnd: number; // 最終月の町長のいる町のうち、条例が出ている割合(%)
  enactsPerGame: number;
  repealsPerGame: number;
  kindShare: Record<string, number>; // 出した回数の内訳(%)
  kindMonthShare: Record<string, number>; // 効いていた町×月の内訳(%)
  maxKindShare: number; // 出した回数でいちばん多い条例の割合(%)
  maxKindMonthShare: number;
  taxPerGame: number; // 町税で動いた額（1局）
  taxShareOfCity: number; // まちの収入（全員の純収支の合計）に対する割合(%)
  taxMaxPlayerShare: number; // 町税の受け取り ÷ その人のまちの収入（受け取った人の p90・%）
  costPerGame: number; // 条例の月々の負担の合計（1局）
}

/** 災害からの復興の計測 */
export interface RecoverySummary {
  startsPerGame: number; // 復興特需が始まった町の数（1局。2度目の被災で残り月が戻った回も数える）
  aidPerGame: number; // 見舞金の合計（1局）
  aidShareOfLoss: number; // 見舞金 ÷ 災害の損失(%)
  buildsPerGame: number; // 復興特需の町での工事の回数（1局）
  savedPerGame: number; // 割引で浮いた額（1局）
  hitsPerGame: number; // 建物の資産の1割以上を一度に失った件数（1局）
  hitRankChange: number; // その人の順位の変化（前の月末 → 最終。＋は下がった）
  hitDrop2Rate: number; // そのうち順位を2つ以上落とした割合(%)
  victimRank: number; // 1局でいちばんひどく被災した人（一度に失った割合が最大）の最終順位（1=首位）
  victimRankBefore: number; // その人の被災前の順位
  victimLastRate: number; // その人が最下位で終わる割合(%)
  victimWinRate: number;
}

/** 町の特色ごとの計測（none は特色のない町） */
export interface TraitSummary {
  towns: number; // その特色の町の数
  builtRate: number; // 最終月に建物がある割合(%)
  buildings: number; // 最終月の建物の数（町ごとの平均）
  population: number; // 最終月の人口（町ごとの平均）
  incomePerPlotMonth: number; // 建物1つ1か月あたりの稼ぎ
  incomePerLevelMonth: number; // 等級1つ1か月あたりの稼ぎ（町の育ち具合の差をならす）
  vsClass: number; // 同じ格の特色のない町に対する、等級1つあたりの稼ぎの倍率
}

export function summarizeCity(label: string, games: CGame[], months = CITY_DEFAULT_MONTHS): CitySummary {
  const byStrategy: CitySummary['byStrategy'] = {};
  const rows: { strat: Strategy; assets: number; win: boolean; tr: PTrack; buildings: number; money: number; property: number; owned: Record<string, [number, number]>; mayorTowns: number }[] = [];
  let lead12 = 0;
  let lead24 = 0;
  const gaps: number[] = [];
  const winnerShare: number[] = [];
  for (const g of games) {
    const finals = g.tracks.map(t => t.assetsAt[months]);
    const winner = finals.indexOf(Math.max(...finals));
    const argmax = (arr: number[]) => arr.indexOf(Math.max(...arr));
    if (argmax(g.tracks.map(t => t.assetsAt[12])) === winner) lead12++;
    if (argmax(g.tracks.map(t => t.assetsAt[24])) === winner) lead24++;
    const sorted = [...finals].sort((a, b) => b - a);
    gaps.push((sorted[0] - sorted[1]) / Math.max(1, sorted[0]));
    winnerShare.push(sorted[0] / Math.max(1, finals.reduce((a, b) => a + b, 0)));
    g.tracks.forEach((t, i) => {
      const owned: Record<string, [number, number]> = {};
      for (const town of Object.values(g.state.towns)) for (const pl of town.plots) {
        if (!pl || pl.owner !== i) continue;
        const o = owned[pl.kind] ?? [0, 0];
        owned[pl.kind] = [o[0] + 1, o[1] + pl.level];
      }
      rows.push({ strat: t.strategy, assets: finals[i], win: i === winner, tr: t, buildings: t.buildingsAt[months], money: g.players[i].money, property: playerPropertyValue(g.state, i), owned, mayorTowns: Object.values(g.state.towns).filter(town => mayorOf(town) === i).length });
    });
  }
  const strats = [...new Set(rows.map(r => r.strat))];
  for (const s of strats) {
    const rs = rows.filter(r => r.strat === s);
    const inc: Record<string, number> = {};
    for (const k of Object.keys(rs[0].tr.income)) inc[k] = r0(mean(rs.map(r => r.tr.income[k as keyof PTrack['income']])));
    const sp: Record<string, number> = {};
    for (const k of Object.keys(rs[0].tr.spend)) sp[k] = r0(mean(rs.map(r => r.tr.spend[k as keyof PTrack['spend']])));
    byStrategy[s] = {
      n: rs.length,
      assets: r0(mean(rs.map(r => r.assets))),
      assetsSd: r0(sd(rs.map(r => r.assets))),
      wins: rs.filter(r => r.win).length,
      winRate: r2((rs.filter(r => r.win).length / rs.length) * 100),
      buildings: r2(mean(rs.map(r => r.buildings))),
      money: r0(mean(rs.map(r => r.money))),
      property: r0(mean(rs.map(r => r.property))),
      owned: Object.fromEntries(['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'].map(k => {
        const cnt = mean(rs.map(r => r.owned[k]?.[0] ?? 0));
        const lv = rs.reduce((a, r) => a + (r.owned[k]?.[1] ?? 0), 0) / Math.max(1, rs.reduce((a, r) => a + (r.owned[k]?.[0] ?? 0), 0));
        return [k, `${r2(cnt)}件/Lv${r2(lv)}`];
      }).filter(([, v]) => !String(v).startsWith('0件'))),
      income: inc,
      spend: sp,
      disasterLoss: r0(mean(rs.map(r => r.tr.disasterLoss))),
      maxLossShare: r2(quantile(rs.map(r => r.tr.maxSingleLossShare), 0.9) * 100),
      v5: {
        線路: r2(mean(rs.map(r => r.tr.railsLaid))),
        線路の維持費: r0(mean(rs.map(r => r.tr.railUpkeep))),
        近所の効果: r0(mean(rs.map(r => r.tr.railLinkGain))),
        町長の町: r2(mean(rs.map(r => r.mayorTowns))),
        条例: r2(mean(rs.map(r => r.tr.enacts))),
        町税の受け取り: r0(mean(rs.map(r => r.tr.mayorTax))),
        町税の支払い: r0(mean(rs.map(r => r.tr.taxPaid))),
        条例の負担: r0(mean(rs.map(r => r.tr.ordinanceCost))),
      },
    };
  }
  // 回収期間（最初の18か月に建てた建物。回収できなかったものは Infinity）
  const allPlots: PlotTrack[] = [];
  for (const g of games) {
    allPlots.push(...g.closed, ...g.plots.values());
  }
  const paybackMedian: Record<string, number> = {};
  const paybackRecovered: Record<string, number> = {};
  const paybackCount: Record<string, number> = {};
  for (const k of ['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'] as BuildingKind[]) {
    const ps = allPlots.filter(p => p.kind === k && p.builtMonth <= 18 && p.invested > 0);
    paybackCount[k] = ps.length;
    if (!ps.length) continue;
    const vals = ps.map(p => p.paybackMonth ?? Infinity);
    paybackMedian[k] = quantile(vals, 0.5);
    paybackRecovered[k] = r2((ps.filter(p => p.paybackMonth !== null).length / ps.length) * 100);
  }
  const up = allPlots.filter(p => isUpgradable(p.kind) && p.builtMonth <= 18);
  const l3 = up.filter(p => p.level3Month !== null).map(p => p.level3Month!);
  const totalLevelUps = games.reduce((a, g) => a + g.levelUps, 0);
  const totalPlotMonths = games.reduce((a, g) => a + g.upgradablePlotMonths, 0);
  const lossRate = mean(games.map(g => (g.disasterLossTotal / (months / 12)) / Math.max(1, g.propertySum / months)));
  const assetsMedianAt: Record<number, number> = {};
  const buildingsMeanAt: Record<number, number> = {};
  for (const t of [6, 12, 24, months]) {
    assetsMedianAt[t] = r0(quantile(rows.map(r => r.tr.assetsAt[t]), 0.5));
    buildingsMeanAt[t] = r2(mean(rows.map(r => r.tr.buildingsAt[t])));
  }
  // 収入の構成比（建てる戦略のみ）
  const builders = rows.filter(r => r.strat !== 'fisher');
  const incKeys = Object.keys(builders[0].tr.income) as (keyof PTrack['income'])[];
  const incTot = incKeys.reduce((a, k) => a + builders.reduce((b, r) => b + Math.max(0, r.tr.income[k]), 0), 0);
  const incomeShare: Record<string, number> = {};
  for (const k of incKeys) incomeShare[k] = r2((builders.reduce((b, r) => b + Math.max(0, r.tr.income[k]), 0) / Math.max(1, incTot)) * 100);
  const inc12Tot = incKeys.reduce((a, k) => a + builders.reduce((b, r) => b + Math.max(0, r.tr.income12?.[k] ?? 0), 0), 0);
  const incomeShare12: Record<string, number> = {};
  for (const k of incKeys) incomeShare12[k] = r2((builders.reduce((b, r) => b + Math.max(0, r.tr.income12?.[k] ?? 0), 0) / Math.max(1, inc12Tot)) * 100);
  // 建物種別ごとの収益（ゲーム全体・建てた区画のみ）
  const kindRoi: CitySummary['kindRoi'] = {};
  for (const k of ['res', 'com', 'ind', 'park', 'power', 'port', 'tourism'] as BuildingKind[]) {
    const ps = allPlots.filter(p => p.kind === k);
    if (!ps.length) continue;
    const inv = ps.reduce((a, p) => a + p.invested, 0);
    const cum = ps.reduce((a, p) => a + p.cum, 0);
    const months = ps.reduce((a, p) => a + (CITY_DEFAULT_MONTHS - p.builtMonth + 1), 0);
    kindRoi[k] = { n: r2(ps.length / games.length), invested: r0(inv / games.length), cum: r0(cum / games.length), roi: r2(cum / Math.max(1, inv)), perMonth: r0(cum / Math.max(1, months)) };
  }
  const kindGrowth: Record<string, number> = {};
  for (const k of ['res', 'com', 'ind', 'tourism']) {
    const ups = games.reduce((a, g) => a + (g.kindUps[k] ?? 0), 0);
    const pm = games.reduce((a, g) => a + (g.kindPlotMonths[k] ?? 0), 0);
    kindGrowth[k] = r2((ups / Math.max(1, pm)) * 100);
  }
  return {
    label,
    games: games.length,
    resOccupancy: r2((games.reduce((a, g) => a + g.resOccupancy.sum, 0) / Math.max(1, games.reduce((a, g) => a + g.resOccupancy.n, 0))) * 100),
    quests: summarizeQuests(games),
    fishing: summarizeFishing(games),
    rail: summarizeRail(games, months),
    ledgerGap: games.reduce((a, g) => a
      + Math.abs(g.tracks.reduce((b, t) => b + t.income.rail - t.spend.fare, 0))
      + Math.abs(g.tracks.reduce((b, t) => b + t.mayorTax - t.taxPaid, 0))
      + Math.abs([...g.railTracks.values()].reduce((b, t) => b + t.fares, 0) - g.railFareTotal), 0),
    mayor: summarizeMayor(games),
    recovery: summarizeRecovery(games, months),
    traits: summarizeTraits(games),
    kindRoi,
    kindGrowth,
    level2Median: r0(quantile(up.map(p => p.level2Month ?? Infinity), 0.5)),
    tierMedian: {
      t1: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 1).length), 0.5),
      t2: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 2).length), 0.5),
      t3: quantile(games.map(g => Object.values(g.state.towns).filter(t => (t.tier ?? 0) >= 3).length), 0.5),
    },
    vacatedPerGame: r2(mean(games.map(g => g.vacated))),
    ...(() => {
      const sp = games.flatMap(g => [...g.specsClosed, ...g.specs.values()]).filter(t => t.month <= 24);
      const rec = sp.filter(t => t.paybackMonth !== null);
      return {
        specialtyPayback: quantile(sp.map(t => t.paybackMonth ?? Infinity), 0.5),
        specialtyRecovered: r2((rec.length / Math.max(1, sp.length)) * 100),
      };
    })(),
    specialtiesOwnedAtEnd: r2(mean(games.map(g => Object.keys(g.state.specialties ?? {}).length))),
    regionMonoEverRate: r2((games.filter(g => g.regionMonoEver).length / games.length) * 100),
    regionMonoAtEndRate: r2((games.filter(g => Object.keys(regionalMonopolies(g.state.specialties)).length > 0).length / games.length) * 100),
    regionMonoMonthsPerGame: r2(mean(games.map(g => g.regionMonoMonths))),
    firstMonoMedian: quantile(games.filter(g => g.firstRegionMono !== null).map(g => g.firstRegionMono!), 0.5),
    firstMonoYear1Rate: r2((games.filter(g => g.firstRegionMono !== null && g.firstRegionMono <= 12).length / games.length) * 100),
    binboDamagePerGame: r0(mean(games.map(g => g.binboDamage))),
    binboLossPerGame: r0(mean(games.map(g => g.tracks.reduce((a, t) => a + t.binboLoss, 0)))),
    ...(() => {
      const shares = games.map(g => {
        const tot = g.binboMonths.reduce((a, b) => a + b, 0);
        return tot > 0 ? Math.max(...g.binboMonths) / tot : NaN;
      }).filter(Number.isFinite);
      const lossShares = games.flatMap(g => g.tracks.map(t => (t.binboLoss > 0 ? t.binboLoss / Math.max(1, t.assetsAt[months]) : NaN))).filter(Number.isFinite);
      return {
        binboMaxShareMedian: r2(quantile(shares, 0.5) * 100),
        binboMaxShareP90: r2(quantile(shares, 0.9) * 100),
        binboLossShareOfAssets: r2(quantile(lossShares, 0.5) * 100),
      };
    })(),
    visitorPerGame: r0(mean(games.map(g => g.visitorTotal))),
    cardUsesPerGame: (() => {
      const out: Record<string, number> = {};
      for (const g of games) for (const [k, v] of Object.entries(g.cardUses)) out[k] = (out[k] ?? 0) + v / games.length;
      for (const k of Object.keys(out)) out[k] = r2(out[k]);
      return out;
    })(),
    cardsBoughtPerGame: r2(mean(games.map(g => g.cardsBought))),
    awardsPerGame: r0(mean(games.map(g => g.awardsTotal))),
    vacantAtEnd: r2((games.reduce((a, g) => a + Object.values(g.state.towns).reduce((b, t) => b + t.plots.filter(p => p?.vacant).length, 0), 0)
      / Math.max(1, games.reduce((a, g) => a + Object.values(g.state.towns).reduce((b, t) => b + t.plots.filter(Boolean).length, 0), 0))) * 100),
    renovationsPerGame: r2(mean(games.map(g => g.renovations))),
    inspectionsPerGame: r2(mean(games.map(g => g.inspections))),
    resDemandHist: (() => {
      const h = [0, 1, 2, 3].map(k => games.reduce((a, g) => a + g.resDemandHist[k], 0));
      const t = h.reduce((a, b) => a + b, 0);
      return h.map(v => r2((v / Math.max(1, t)) * 100));
    })(),
    byStrategy,
    paybackMedian,
    paybackRecovered,
    paybackCount,
    level3Median: r0(quantile(l3, 0.5)),
    level3Rate: r2((l3.length / Math.max(1, up.length)) * 100),
    growthPerPlotMonth: r2((totalLevelUps / Math.max(1, totalPlotMonths)) * 100),
    annualDisasterLossRate: r2(lossRate * 100),
    leaderAt12Wins: r2((lead12 / games.length) * 100),
    leaderAt24Wins: r2((lead24 / games.length) * 100),
    winnerShareOfTotal: r2(mean(winnerShare) * 100),
    finalGapTop2: r2(mean(gaps) * 100),
    assetsMedianAt,
    buildingsMeanAt,
    incomeShare,
    incomeShare12,
  };
}

/** 最終順位（0=首位）。同点は同じ順位 */
function finalRanks(g: CGame, months: number): number[] {
  const finals = g.tracks.map(t => t.assetsAt[months]);
  return finals.map(v => finals.filter(x => x > v).length);
}

/** 線路の回収を見るのは、この月までに敷いた区間（建物の回収期間と同じく、残りが1年半以上ある） */
const RAIL_PAYBACK_MONTH = 18;

function summarizeRail(games: CGame[], months: number): RailSummary {
  const laid = games.filter(g => g.railTracks.size > 0);
  const tracks = games.flatMap(g => [...g.railTracks.values()]);
  const segMonths = tracks.reduce((a, t) => a + (months - t.month + 1), 0);
  const early = tracks.filter(t => t.month <= RAIL_PAYBACK_MONTH);
  const per = (v: number) => r2(v / Math.max(1, segMonths));
  const fares = tracks.reduce((a, t) => a + t.fares, 0);
  const link = tracks.reduce((a, t) => a + t.link, 0);
  const upkeep = tracks.reduce((a, t) => a + t.upkeep, 0);
  // 敷いた人の順位の変化（最初に敷いた月の前の月末 → 最終）
  const changes: number[] = [];
  let layers = 0;
  let layerWins = 0;
  let layerLeads = 0;
  const byStrategy: Record<string, number[]> = {};
  for (const g of games) {
    const fin = finalRanks(g, months);
    g.tracks.forEach((t, i) => {
      (byStrategy[t.strategy] ??= []).push(t.railsLaid);
      if (t.firstRailMonth === null) return;
      layers++;
      if (fin[i] === 0) layerWins++;
      if (t.firstRailMonth < 2) return;
      const at = t.firstRailMonth - 1;
      const before = g.tracks.filter(o => o.assetsAt[at] > t.assetsAt[at]).length;
      if (before === 0) layerLeads++;
      changes.push(fin[i] - before);
    });
  }
  return {
    gameRate: r2((laid.length / games.length) * 100),
    segmentsPerGame: r2(tracks.length / games.length),
    segmentsWhenLaid: r2(mean(laid.map(g => g.railTracks.size))),
    layersPerGame: r2(layers / games.length),
    firstMonthMedian: quantile(laid.map(g => Math.min(...[...g.railTracks.values()].map(t => t.month))), 0.5),
    priceMean: r0(mean(tracks.map(t => t.price))),
    paybackMedian: quantile(early.map(t => t.paybackMonth ?? Infinity), 0.5),
    paybackRate: r2((early.filter(t => t.paybackMonth !== null).length / Math.max(1, early.length)) * 100),
    halfMedian: quantile(early.map(t => t.halfMonth ?? Infinity), 0.5),
    halfRate: r2((early.filter(t => t.halfMonth !== null).length / Math.max(1, early.length)) * 100),
    perSegMonth: { fares: per(fares), link: per(link), upkeep: per(upkeep), net: per(fares + link - upkeep) },
    yieldPerMonth: r2(((fares + link - upkeep) / Math.max(1, segMonths) / Math.max(1, mean(tracks.map(t => t.price)) || 1)) * 100),
    passesPerSegMonth: { other: per(tracks.reduce((a, t) => a + t.otherPasses, 0)), own: per(tracks.reduce((a, t) => a + t.ownPasses, 0)) },
    faresPerGame: r0(mean(games.map(g => g.railFareTotal))),
    linkGainPerGame: r0(mean(games.map(g => g.tracks.reduce((a, t) => a + t.railLinkGain, 0)))),
    layerRankChange: r2(mean(changes)),
    layerWinRate: r2((layerWins / Math.max(1, layers)) * 100),
    layerLeadRate: r2((layerLeads / Math.max(1, changes.length)) * 100),
    byStrategy: Object.fromEntries(Object.entries(byStrategy).map(([k, v]) => [k, r2(mean(v))])),
  };
}

function summarizeMayor(games: CGame[]): MayorSummary {
  const share = (rec: Record<string, number>[]) => {
    const tot: Record<string, number> = {};
    for (const r of rec) for (const [k, v] of Object.entries(r)) tot[k] = (tot[k] ?? 0) + v;
    const sum = Object.values(tot).reduce((a, b) => a + b, 0);
    return Object.fromEntries(ORDINANCE_KINDS.map(k => [k, r2(((tot[k] ?? 0) / Math.max(1, sum)) * 100)]));
  };
  const kindShare = share(games.map(g => g.ordEnacts));
  const kindMonthShare = share(games.map(g => g.ordKindMonths));
  let endMayors = 0;
  let endOrd = 0;
  for (const g of games) for (const town of Object.values(g.state.towns)) {
    if (mayorOf(town) === null) continue;
    endMayors++;
    if (ordinanceContext(town)) endOrd++;
  }
  const cityIncome = games.reduce((a, g) => a + g.tracks.reduce((b, t) => b + t.income.city, 0), 0);
  const taxShares = games.flatMap(g => g.tracks.filter(t => t.mayorTax > 0).map(t => t.mayorTax / Math.max(1, t.income.city)));
  return {
    townsEver: r2(mean(games.map(g => g.mayorTownsEver.size))),
    townsAtEnd: r2(endMayors / games.length),
    seatChanges: r2(mean(games.map(g => g.seatChanges))),
    coverage: r2((games.reduce((a, g) => a + g.ordTownMonths, 0) / Math.max(1, games.reduce((a, g) => a + g.mayorTownMonths, 0))) * 100),
    coverageAtEnd: r2((endOrd / Math.max(1, endMayors)) * 100),
    enactsPerGame: r2(mean(games.map(g => Object.values(g.ordEnacts).reduce((a, b) => a + b, 0)))),
    repealsPerGame: r2(mean(games.map(g => g.ordRepeals))),
    kindShare,
    kindMonthShare,
    maxKindShare: Math.max(...Object.values(kindShare)),
    maxKindMonthShare: Math.max(...Object.values(kindMonthShare)),
    taxPerGame: r0(mean(games.map(g => g.taxMoved))),
    taxShareOfCity: r2((games.reduce((a, g) => a + g.taxMoved, 0) / Math.max(1, cityIncome)) * 100),
    taxMaxPlayerShare: r2(quantile(taxShares, 0.9) * 100),
    costPerGame: r0(mean(games.map(g => g.tracks.reduce((a, t) => a + t.ordinanceCost, 0)))),
  };
}

function summarizeRecovery(games: CGame[], months: number): RecoverySummary {
  const BIG = 0.1; // 建物の資産の1割以上を一度に失ったら「被災」
  const changes: number[] = [];
  const victimRank: number[] = [];
  const victimBefore: number[] = [];
  let hits = 0;
  for (const g of games) {
    const fin = finalRanks(g, months);
    const big = g.hits.filter(h => h.share >= BIG);
    hits += big.length;
    for (const h of big) changes.push(fin[h.player] - h.rankBefore);
    const worst = [...big].sort((a, b) => b.share - a.share)[0];
    if (worst) {
      victimRank.push(fin[worst.player] + 1);
      victimBefore.push(worst.rankBefore + 1);
    }
  }
  const lastRank = Math.max(1, ...games.map(g => g.tracks.length));
  return {
    startsPerGame: r2(mean(games.map(g => g.recoveryStarts))),
    aidPerGame: r0(mean(games.map(g => g.aidTotal))),
    aidShareOfLoss: r2((games.reduce((a, g) => a + g.aidTotal, 0) / Math.max(1, games.reduce((a, g) => a + g.disasterLossTotal, 0))) * 100),
    buildsPerGame: r2(mean(games.map(g => g.recoveryBuilds))),
    savedPerGame: r0(mean(games.map(g => g.recoverySaved))),
    hitsPerGame: r2(hits / games.length),
    hitRankChange: r2(mean(changes)),
    hitDrop2Rate: r2((changes.filter(c => c >= 2).length / Math.max(1, changes.length)) * 100),
    victimRank: r2(mean(victimRank)),
    victimRankBefore: r2(mean(victimBefore)),
    victimLastRate: r2((victimRank.filter(r => r >= lastRank).length / Math.max(1, victimRank.length)) * 100),
    victimWinRate: r2((victimRank.filter(r => r === 1).length / Math.max(1, victimRank.length)) * 100),
  };
}

function summarizeTraits(games: CGame[]): Record<string, TraitSummary> {
  type Acc = { towns: Set<string>; n: number; built: number; buildings: number; pop: number; plotMonths: number; levelMonths: number; income: number; expected: number };
  const acc = new Map<string, Acc>();
  const get = (k: string) => {
    let a = acc.get(k);
    if (!a) {
      a = { towns: new Set(), n: 0, built: 0, buildings: 0, pop: 0, plotMonths: 0, levelMonths: 0, income: 0, expected: 0 };
      acc.set(k, a);
    }
    return a;
  };
  // 同じ格の特色のない町の稼ぎ（等級1つ1か月あたり）
  const cls = new Map<TownClass, { levelMonths: number; income: number }>();
  for (const g of games) for (const [id, v] of g.townIncome) {
    const info = getTownInfo(id);
    if (!info || info.traits.length) continue;
    const c = cls.get(info.cls) ?? { levelMonths: 0, income: 0 };
    c.levelMonths += v.levelMonths;
    c.income += v.income;
    cls.set(info.cls, c);
  }
  const classBase = (c: TownClass) => {
    const v = cls.get(c);
    return v && v.levelMonths > 0 ? v.income / v.levelMonths : 0;
  };
  for (const g of games) {
    const stats = computeAllStats(g.state);
    for (const [id, town] of Object.entries(g.state.towns)) {
      const info = getTownInfo(id);
      if (!info) continue;
      const keys: string[] = info.traits.length ? info.traits : ['none'];
      const n = town.plots.filter(Boolean).length;
      const inc = g.townIncome.get(id);
      for (const k of keys) {
        const a = get(k);
        a.towns.add(id);
        a.n++;
        if (n > 0) a.built++;
        a.buildings += n;
        a.pop += stats.get(id)?.population ?? 0;
        a.plotMonths += inc?.plotMonths ?? 0;
        a.levelMonths += inc?.levelMonths ?? 0;
        a.income += inc?.income ?? 0;
        a.expected += (inc?.levelMonths ?? 0) * classBase(info.cls);
      }
    }
  }
  const order = [...(Object.keys(TOWN_TRAITS) as TownTraitId[]), 'none'];
  const out: Record<string, TraitSummary> = {};
  for (const k of order) {
    const a = acc.get(k);
    if (!a) continue;
    out[k] = {
      towns: a.towns.size,
      builtRate: r2((a.built / Math.max(1, a.n)) * 100),
      buildings: r2(a.buildings / Math.max(1, a.n)),
      population: r0(a.pop / Math.max(1, a.n)),
      incomePerPlotMonth: r0(a.income / Math.max(1, a.plotMonths)),
      incomePerLevelMonth: r0(a.income / Math.max(1, a.levelMonths)),
      vsClass: r2(a.income / Math.max(1, a.expected)),
    };
  }
  return out;
}

function summarizeQuests(games: CGame[]): QuestSummary {
  const acc = new Map<string, { id: string; year: number; draws: number; need: number; done: number; any: number; players: number }>();
  for (const g of games) for (const q of g.questLog) {
    const key = `${q.id}:${q.year}`;
    const a = acc.get(key) ?? { id: q.id, year: q.year, draws: 0, need: 0, done: 0, any: 0, players: 0 };
    a.draws++;
    a.need += q.need;
    a.done += q.done;
    a.any += q.done > 0 ? 1 : 0;
    a.players += g.players.length;
    acc.set(key, a);
  }
  const order = QUEST_DEFS.map(d => d.id as string);
  const all = [...acc.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id) || a.year - b.year);
  const rateOf = (xs: typeof all) => r2((xs.reduce((a, x) => a + x.done, 0) / Math.max(1, xs.reduce((a, x) => a + x.players, 0))) * 100);
  const years = [...new Set(all.map(a => a.year))].sort((a, b) => a - b);
  return {
    rows: all.map(a => ({ id: a.id, year: a.year, draws: a.draws, need: r2(a.need / a.draws), rate: r2((a.done / Math.max(1, a.players)) * 100), anyRate: r2((a.any / a.draws) * 100) })),
    rate: rateOf(all),
    rateByYear: Object.fromEntries(years.map(y => [y, rateOf(all.filter(a => a.year === y))])),
    prizePerGame: r0(mean(games.map(g => g.questPrizeTotal))),
    reach: (() => {
      const merged = new Map<string, Map<number, number>>();
      for (const g of games) for (const [key, m] of g.questDist) {
        const t = merged.get(key) ?? new Map<number, number>();
        for (const [v, c] of m) t.set(v, (t.get(v) ?? 0) + c);
        merged.set(key, t);
      }
      const out: Record<string, Record<number, number>> = {};
      for (const [key, m] of merged) {
        const total = [...m.values()].reduce((a, b) => a + b, 0);
        const max = Math.max(...m.keys());
        const row: Record<number, number> = {};
        for (let k = 1; k <= max; k++) {
          let ge = 0;
          for (const [v, c] of m) if (v >= k) ge += c;
          const pct = r0((ge / Math.max(1, total)) * 100);
          if (pct >= 3) row[k] = pct;
        }
        out[key] = row;
      }
      return out;
    })(),
  };
}

function summarizeFishing(games: CGame[]): FishingSummary {
  const casts = games.reduce((a, g) => a + g.fishing.casts, 0);
  const caught = games.reduce((a, g) => a + g.fishing.caught, 0);
  const by: Record<string, number> = {};
  for (const g of games) for (const [k, v] of Object.entries(g.fishing.byFishery)) by[k] = (by[k] ?? 0) + v;
  const byTotal = Object.values(by).reduce((a, b) => a + b, 0);
  return {
    castsPerGame: r2(casts / games.length),
    catchRate: r2((caught / Math.max(1, casts)) * 100),
    salePerCatch: r0(games.reduce((a, g) => a + g.fishing.sale, 0) / Math.max(1, caught)),
    mulMean: r2(games.reduce((a, g) => a + g.fishing.mulSum, 0) / Math.max(1, caught)),
    fishery: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, r2((v / Math.max(1, byTotal)) * 100)])),
    boomsPerGame: r2(mean(games.map(g => g.fishBooms))),
    derbyHeld: r2(mean(games.map(g => g.derbyHeld))),
    derbyPrizePerGame: r0(mean(games.map(g => g.derbyPrizeTotal))),
  };
}

function formatQuestsAndFishing(s: CitySummary): string[] {
  const L: string[] = [];
  const q = s.quests;
  if (q.rows.length) {
    L.push(`お題: 1人が1つのお題を達成する割合 ${q.rate}%（年度ごと ${JSON.stringify(q.rateByYear)}） / 賞金の合計 ¥${q.prizePerGame}/局`);
    L.push('| お題 | 年度 | 引かれた回数 | 数（平均） | 達成した人の割合 | 誰かが達成した割合 |');
    L.push('|---|---|---|---|---|---|');
    for (const r of q.rows) L.push(`| ${r.id} | ${r.year} | ${r.draws} | ${r.need} | ${r.rate}% | ${r.anyRate}% |`);
    L.push('お題の数を決めるための分布（年度末に、その数以上に届いていた人の割合%。引かれなかったお題も数える）:');
    for (const [key, row] of Object.entries(q.reach)) L.push(`- ${key} ${Object.entries(row).map(([k, v]) => `${k}以上 ${v}%`).join(' / ')}`);
  }
  const f = s.fishing;
  L.push(`魚市場: 竿を出した ${f.castsPerGame}回/局・釣れた ${f.catchRate}% / 1回の釣果 ¥${f.salePerCatch}（倍率の平均 ${f.mulMean}） / 漁場 ${JSON.stringify(f.fishery)}% / 町おこし ${f.boomsPerGame}回/局 / 釣り大会 優勝者あり ${f.derbyHeld}回/局・賞金 ¥${f.derbyPrizePerGame}/局`);
  return L;
}

function formatV5(s: CitySummary): string[] {
  const L: string[] = [];
  const r = s.rail;
  L.push(`鉄道: 敷かれた局 ${r.gameRate}% / 1局 ${r.segmentsPerGame}区間（敷かれた局は ${r.segmentsWhenLaid}区間・敷いた人 ${r.layersPerGame}人） / 最初の線路 ${r.firstMonthMedian}か月目（中央値） / 平均の値段 ¥${r.priceMean} / 戦略ごとの区間数 ${JSON.stringify(r.byStrategy)}`);
  L.push(`鉄道の回収（${RAIL_PAYBACK_MONTH}か月目までに敷いた区間）: 値段の全額 ${r.paybackMedian}か月（回収できた ${r.paybackRate}%） / 赤字が消えるまで（資産に残らない分の回収） ${r.halfMedian}か月（${r.halfRate}%） / 1区間1か月 運賃 ¥${r.perSegMonth.fares}＋近所 ¥${r.perSegMonth.link}−維持費 ¥${r.perSegMonth.upkeep}＝¥${r.perSegMonth.net}（値段の ${r.yieldPerMonth}%） / 通過 他人 ${r.passesPerSegMonth.other}回・持ち主 ${r.passesPerSegMonth.own}回（1区間1か月） / 運賃の総額 ¥${r.faresPerGame}/局 / 近所の効果（全員） ¥${r.linkGainPerGame}/局`);
  L.push(`鉄道を敷いた人: 順位の変化 ${r.layerRankChange}（最初に敷いた月の前の月末→最終。＋は下がった） / 勝率 ${r.layerWinRate}%（敷いた時点で首位だった割合 ${r.layerLeadRate}%）`);
  const m = s.mayor;
  L.push(`町長: 一度でも生まれた町 ${m.townsEver}/局・最終月 ${m.townsAtEnd} / 町長が替わった ${m.seatChanges}回/局 / 条例が出ている割合 町×月 ${m.coverage}%・最終月 ${m.coverageAtEnd}%`);
  L.push(`条例: 出した ${m.enactsPerGame}回/局（やめた ${m.repealsPerGame}回） / 種類（回数） ${JSON.stringify(m.kindShare)}% / 種類（効いていた町×月） ${JSON.stringify(m.kindMonthShare)}% / 町税で動いた額 ¥${m.taxPerGame}/局（まちの収入の ${m.taxShareOfCity}%・受け取った人の収入比 p90 ${m.taxMaxPlayerShare}%） / 条例の負担 ¥${m.costPerGame}/局`);
  const c = s.recovery;
  L.push(`復興: 特需の始まった町 ${c.startsPerGame}/局 / 見舞金 ¥${c.aidPerGame}/局（災害の損失の ${c.aidShareOfLoss}%） / 特需の町での工事 ${c.buildsPerGame}回/局・割引で浮いた額 ¥${c.savedPerGame}/局`);
  L.push(`被災した人（建物の1割以上を一度に失った）: ${c.hitsPerGame}件/局 / 順位の変化 ${c.hitRankChange}（前の月末→最終。＋は下がった）・2つ以上落ちた ${c.hitDrop2Rate}% / いちばんひどく被災した人の順位 ${c.victimRankBefore}位→${c.victimRank}位・最下位で終わる ${c.victimLastRate}%・勝つ ${c.victimWinRate}%`);
  L.push('| 特色 | 町の数 | 建物がある割合 | 建物の数 | 人口 | 建物1つ1か月の稼ぎ | 等級1つ1か月の稼ぎ | 同じ格の特色なしとの比（等級あたり） |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(s.traits)) {
    const name = k === 'none' ? '特色なし' : TOWN_TRAITS[k as TownTraitId].name;
    L.push(`| ${name} | ${v.towns} | ${v.builtRate}% | ${v.buildings} | ${v.population} | ¥${v.incomePerPlotMonth} | ¥${v.incomePerLevelMonth} | ${v.vsClass} |`);
  }
  return L;
}

function formatCity(s: CitySummary): string {
  const L: string[] = [];
  L.push(`### ${s.label}（${s.games}局）`);
  L.push('| 戦略 | 最終総資産(平均) | SD | 勝率 | 建物数 | 災害損失 | 1回の最大損失率(p90) |');
  L.push('|---|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(s.byStrategy)) L.push(`| ${k} | ¥${v.assets} | ${v.assetsSd} | ${v.winRate}% | ${v.buildings} | ¥${v.disasterLoss} | ${v.maxLossShare}% |`);
  for (const [k, v] of Object.entries(s.byStrategy)) L.push(`- ${k} 現金¥${v.money} 建物¥${v.property} 保有 ${JSON.stringify(v.owned)} 収入 ${JSON.stringify(v.income)} 支出 ${JSON.stringify(v.spend)} v5 ${JSON.stringify(v.v5)}`);
  L.push(`回収期間(中央値・月) ${JSON.stringify(s.paybackMedian)} / 回収できた割合% ${JSON.stringify(s.paybackRecovered)} / 件数 ${JSON.stringify(s.paybackCount)}`);
  L.push(`等級2到達(中央値) ${s.level2Median}か月 / 最高等級到達(中央値) ${s.level3Median}か月（到達率 ${s.level3Rate}%） / 自然成長 ${s.growthPerPlotMonth}%/区画・月 種別 ${JSON.stringify(s.kindGrowth)}`);
  L.push(`発展度(36か月・町の数の中央値) 壱以上 ${s.tierMedian.t1} / 弐以上 ${s.tierMedian.t2} / 参 ${s.tierMedian.t3}`);
  L.push(`名産: 回収 ${s.specialtyPayback}か月（中央値・24か月以内に買ったもの。回収できた割合 ${s.specialtyRecovered}%） / 最終月に持ち主のいる名産 ${s.specialtiesOwnedAtEnd}件`);
  L.push(`地方独占: 一度でも起きた局 ${s.regionMonoEverRate}% / 最終月にある局 ${s.regionMonoAtEndRate}% / 地方×月 ${s.regionMonoMonthsPerGame}（1局） / 最初の独占 ${s.firstMonoMedian}か月目（中央値）・1年目に起きた局 ${s.firstMonoYear1Rate}%`);
  L.push(`貧乏神: 被害額 ¥${s.binboDamagePerGame}/局（実損 ¥${s.binboLossPerGame}） / 一番長くとりつかれた人の割合 中央値 ${s.binboMaxShareMedian}%・p90 ${s.binboMaxShareP90}% / 実損÷最終総資産 ${s.binboLossShareOfAssets}%（中央値）`);
  L.push(`買い物代 ¥${s.visitorPerGame}/局 / 年度末の称号 ¥${s.awardsPerGame}/局 / カード使用 ${JSON.stringify(s.cardUsesPerGame)} 購入 ${s.cardsBoughtPerGame}枚/局`);
  L.push(`空き家の発生 ${s.vacatedPerGame}件/局 / 最終月の空き家率 ${s.vacantAtEnd}% / 修理 ${s.renovationsPerGame}件/局 / 視察 ${s.inspectionsPerGame}回/局`);
  L.push(`住宅区画の需要分布(>0 / -0.5〜0 / -1.5〜-0.5 / ≤-1.5) ${JSON.stringify(s.resDemandHist)}% / 住宅の入居率（平均） ${s.resOccupancy}%`);
  L.push(`災害の年間損失率 ${s.annualDisasterLossRate}%（資産価値比）`);
  L.push(`12か月目の首位が勝つ率 ${s.leaderAt12Wins}% / 24か月目の首位が勝つ率 ${s.leaderAt24Wins}% / 1位と2位の差 ${s.finalGapTop2}% / 1位の資産シェア ${s.winnerShareOfTotal}%`);
  L.push(`総資産(中央値) ${JSON.stringify(s.assetsMedianAt)} / 建物数(平均) ${JSON.stringify(s.buildingsMeanAt)}`);
  L.push(`収入構成比(建てる戦略) ${JSON.stringify(s.incomeShare)}`);
  L.push(`収入構成比(建てる戦略・最初の12か月) ${JSON.stringify(s.incomeShare12)}`);
  L.push(`種別の収益(1局平均: 件数/投資/累計収入/倍率/1件1か月) ${JSON.stringify(s.kindRoi)}`);
  L.push(...formatV5(s));
  L.push(...formatQuestsAndFishing(s));
  return L.join('\n');
}

function rotateRun(seedBase: number, lineup: Strategy[], perSeat: number): CGame[] {
  const games: CGame[] = [];
  for (let rot = 0; rot < lineup.length; rot++) {
    const seats = lineup.map((_, k) => lineup[(k + rot) % lineup.length]);
    for (let s = 1; s <= perSeat; s++) games.push(simulateCityGame(seedBase + rot * 1000 + s, seats));
  }
  return games;
}

/** 5つの「建てる」戦略から4人を選ぶ全組み合わせ × 席ローテーション（並びの偏りを消す） */
export const BUILDER_STRATEGIES: Strategy[] = ['res', 'indpow', 'tour', 'mono', 'demand'];
function fieldRun(seedBase: number, perSeat: number): CGame[] {
  const games: CGame[] = [];
  for (let skip = 0; skip < BUILDER_STRATEGIES.length; skip++) {
    const lineup = BUILDER_STRATEGIES.filter((_, k) => k !== skip);
    games.push(...rotateRun(seedBase + skip * 10000, lineup, perSeat));
  }
  return games;
}

/** 追加の戦略 extra を、5つの「建てる」戦略から3つ選ぶ全組み合わせ（10通り）に入れて席ローテーション */
function extraRun(seedBase: number, extra: Strategy, perSeat: number): CGame[] {
  const games: CGame[] = [];
  let n = 0;
  for (let a = 0; a < BUILDER_STRATEGIES.length; a++) for (let b = a + 1; b < BUILDER_STRATEGIES.length; b++) for (let c = b + 1; c < BUILDER_STRATEGIES.length; c++) {
    games.push(...rotateRun(seedBase + n * 10000, [extra, BUILDER_STRATEGIES[a], BUILDER_STRATEGIES[b], BUILDER_STRATEGIES[c]], perSeat));
    n++;
  }
  return games;
}

/** 本物の CPU 3性格と、人の代わりの需要追従 */
const CPU_LINEUP: Strategy[] = ['cpuS', 'cpuM', 'cpuR', 'demand'];

/** 人を模したボット1人 対 本物の CPU 3人（堅実・独占・目的地）の結果 */
export interface VsCpuRow {
  bot: Strategy;
  games: number;
  botWin: number; // ボットの勝率(%)。均等なら25%
  cpuWin: Record<string, number>; // CPU の性格ごとの勝率(%)
  botAssets: number;
  cpuAssets: number; // CPU 3人の平均
}

/** 人を模したボット（建てる戦略のどれか）を1人、本物の CPU を3人にして席ローテーションで対戦させる */
export function vsCpuRun(seedBase: number, perSeat: number, bots: Strategy[] = BUILDER_STRATEGIES): VsCpuRow[] {
  return bots.map((bot, k) => {
    const sum = summarizeCity(bot, rotateRun(seedBase + k * 10000, [bot, 'cpuS', 'cpuM', 'cpuR'], perSeat));
    const cpu = ['cpuS', 'cpuM', 'cpuR'];
    return {
      bot,
      games: sum.games,
      botWin: sum.byStrategy[bot].winRate,
      cpuWin: Object.fromEntries(cpu.map(c => [c, sum.byStrategy[c].winRate])),
      botAssets: sum.byStrategy[bot].assets,
      cpuAssets: r0(mean(cpu.map(c => sum.byStrategy[c].assets))),
    };
  });
}

function formatVsCpu(rows: VsCpuRow[]): string {
  const games = rows.reduce((a, r) => a + r.games, 0);
  const avg = r2(rows.reduce((a, r) => a + r.botWin * r.games, 0) / Math.max(1, games));
  return [`### 人を模したボット1人 対 本物の CPU 3人（${games}局。ボットの勝率は平均 ${avg}%、均等なら25%）`,
    '| ボット | 局数 | ボットの勝率 | CPU 堅実 | CPU 独占 | CPU 目的地 | ボットの総資産 | CPU の総資産(平均) |', '|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.bot} | ${r.games} | ${r.botWin}% | ${r.cpuWin.cpuS}% | ${r.cpuWin.cpuM}% | ${r.cpuWin.cpuR}% | ¥${r.botAssets} | ¥${r.cpuAssets} |`)].join('\n');
}

export interface SoloSummary {
  strategy: Strategy;
  games: number;
  assets: number;
  naturalUps: number; // 1局あたりの自然成長の回数
  incomeAt12: number;
  incomeAt36: number;
  buildings: number;
}

/** 1人プレイ（対戦相手なし）でも町が育つかを見る */
export function soloRun(strategy: Strategy, seeds: number, months = CITY_DEFAULT_MONTHS): SoloSummary {
  const gs: CGame[] = [];
  for (let s = 1; s <= seeds; s++) gs.push(simulateCityGame(7000 + s, [strategy], months));
  return {
    strategy,
    games: seeds,
    assets: r0(mean(gs.map(g => g.tracks[0].assetsAt[months]))),
    naturalUps: r2(mean(gs.map(g => g.levelUps))),
    incomeAt12: r0(mean(gs.map(g => g.tracks[0].cityIncomeAt[12] ?? 0))),
    incomeAt36: r0(mean(gs.map(g => g.tracks[0].cityIncomeAt[months] ?? 0))),
    buildings: r2(mean(gs.map(g => g.tracks[0].buildingsAt[months]))),
  };
}

// ===== テスト =====

const ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const REPORT_DIR = ENV.BALANCE_REPORT_DIR;
// 調整用: BALANCE_SWEEP='[{"resIncome":180}, ...]' で CITY_ECONOMY を差し替えながら少数局で比較する
const SWEEP = ENV.BALANCE_SWEEP;
const report: string[] = [];

/** 掃引の1行: 定数を差し替えた設定（CITY_ECONOMY の値はそのまま並べる。ほかは入れ物ごと） */
type SweepConfig = Partial<typeof CITY_ECONOMY> & {
  costs?: Record<string, number>;
  festivalMoneyScale?: number;
  sp?: Partial<typeof SPECIALTY_ECONOMY>;
  binbo?: Partial<typeof BINBO>;
  /** 鉄道（RAIL_ECONOMY。price は地形ごとに一部だけでもよい） */
  rail?: Partial<Omit<typeof RAIL_ECONOMY, 'price'>> & { price?: Partial<typeof RAIL_ECONOMY.price> };
  /** CPU の線路の見込み（RAIL_CPU） */
  railCpu?: Partial<typeof RAIL_CPU>;
  /** 条例（ORDINANCE_ECONOMY） */
  ord?: Partial<typeof ORDINANCE_ECONOMY>;
  /** CPU の町長の判断（CPU_MAYOR。seatBonus は性格ごとに一部だけでもよい） */
  cpuMayor?: Partial<Omit<typeof CPU_MAYOR, 'seatBonus'>> & { seatBonus?: Partial<typeof CPU_MAYOR.seatBonus> };
  /** 復興（RECOVERY） */
  rec?: Partial<typeof RECOVERY>;
  /** 町の特色（TOWN_TRAITS の特色ごとに、差し替える項目だけ） */
  traits?: Partial<Record<TownTraitId, Partial<(typeof TOWN_TRAITS)[TownTraitId]>>>;
  /** シミュレーションで使わない機能（切って比べる） */
  off?: (keyof typeof FEATURES)[];
  /** true なら、シミュレーション独自の戦略が目的地へ寄る強さを賞金に比例させない（DEST_PULL.scaleWithReward = false） */
  destFlat?: boolean;
  /** お題の数（QUEST_DEFS の need。お題ごとに [1年目, 2年目, 3年目, 4年目]） */
  quests?: Partial<Record<QuestId, number[]>>;
  /** お題の賞金と舞台（QUEST_ECONOMY） */
  questEco?: Partial<typeof QUEST_ECONOMY>;
  /** 魚市場（FISH_MARKET） */
  fish?: Partial<typeof FISH_MARKET>;
};

/** v5 の計測を1行にまとめる（掃引用） */
function v5Line(a: CitySummary): string {
  const r = a.rail;
  const m = a.mayor;
  const c = a.recovery;
  return `rail ${r.gameRate}%局 ${r.segmentsPerGame}区間 first ${r.firstMonthMedian}m 回収 ${r.paybackMedian}(${r.paybackRate}%)/半 ${r.halfMedian}(${r.halfRate}%) 区間月 ¥${r.perSegMonth.fares}+${r.perSegMonth.link}-${r.perSegMonth.upkeep}=${r.perSegMonth.net}(${r.yieldPerMonth}%) 通過 ${r.passesPerSegMonth.other}/${r.passesPerSegMonth.own} 順位 ${r.layerRankChange} 勝 ${r.layerWinRate}% by ${JSON.stringify(r.byStrategy)}`
    + `\n  mayor 町 ${m.townsEver}/${m.townsAtEnd} 替 ${m.seatChanges} 条例 ${m.coverage}%/${m.coverageAtEnd}% 回 ${m.enactsPerGame}(-${m.repealsPerGame}) 種類 ${JSON.stringify(m.kindShare)} 町月 ${JSON.stringify(m.kindMonthShare)} 税 ¥${m.taxPerGame}(${m.taxShareOfCity}% p90 ${m.taxMaxPlayerShare}%) 負担 ¥${m.costPerGame}`
    + `\n  recovery 特需 ${c.startsPerGame} 見舞金 ¥${c.aidPerGame}(${c.aidShareOfLoss}%) 工事 ${c.buildsPerGame} 浮いた ¥${c.savedPerGame} 被災 ${c.hitsPerGame}件 順位 ${c.hitRankChange} 2落ち ${c.hitDrop2Rate}% 最悪 ${c.victimRankBefore}→${c.victimRank}位 最下位 ${c.victimLastRate}% 勝 ${c.victimWinRate}%`
    + `\n  quest ${a.quests.rate}% ${JSON.stringify(a.quests.rateByYear)} 賞金 ¥${a.quests.prizePerGame} | ${a.quests.rows.map(r => `${r.id}${r.year}(${r.need}):${r.rate}%/${r.anyRate}%`).join(' ')}`
    + (ENV.BALANCE_QUEST_DIST ? `\n  reach ${Object.entries(a.quests.reach).map(([key, row]) => `${key}[${Object.entries(row).map(([k, v]) => `${k}:${v}`).join(' ')}]`).join(' ')}` : '')
    + `\n  fish 竿 ${a.fishing.castsPerGame} 釣れた ${a.fishing.catchRate}% 1回 ¥${a.fishing.salePerCatch} 倍率 ${a.fishing.mulMean} 漁場 ${JSON.stringify(a.fishing.fishery)} 町おこし ${a.fishing.boomsPerGame} 大会 ${a.fishing.derbyHeld}回 ¥${a.fishing.derbyPrizePerGame}`
    + `\n  traits ${Object.entries(a.traits).map(([k, v]) => `${k}:${v.buildings}軒/${v.population}人/¥${v.incomePerLevelMonth}(${v.vsClass})`).join(' ')}`;
}

describe.skipIf(!SWEEP)('まちづくり: パラメータ掃引（調整用）', () => {
  it('掃引', () => {
    const base = { ...CITY_ECONOMY };
    const baseCosts = Object.fromEntries(Object.entries(BUILDING_INFO).map(([k, v]) => [k, v.cost]));
    const configs = JSON.parse(SWEEP!) as SweepConfig[];
    const spBase = { ...SPECIALTY_ECONOMY };
    const binboBase = { ...BINBO };
    const railBase = structuredClone(RAIL_ECONOMY);
    const railCpuBase = { ...RAIL_CPU };
    const ordBase = { ...ORDINANCE_ECONOMY };
    const cpuMayorBase = structuredClone(CPU_MAYOR);
    const recBase = { ...RECOVERY };
    const traitsBase = structuredClone(TOWN_TRAITS);
    const questNeedBase = QUEST_DEFS.map(d => d.need);
    const questEcoBase = { ...QUEST_ECONOMY };
    const fishBase = { ...FISH_MARKET };
    const out: string[] = [];
    // 祭りの宴の賞金（capitalEvents.ts）の元の値。festivalMoneyScale で倍率をかけて比較できる
    const feastBase = new Map<object, number>();
    for (const ev of Object.values(CAPITAL_EVENTS)) for (const c of ev.choices) if (c.effect.kind === 'feast') feastBase.set(c.effect, c.effect.moneyBonus);
    const setFeast = (k: number) => { for (const [eff, v] of feastBase) (eff as { moneyBonus: number }).moneyBonus = Math.round(v * k); };
    const restoreV5 = () => {
      Object.assign(RAIL_ECONOMY, structuredClone(railBase));
      Object.assign(RAIL_CPU, railCpuBase);
      Object.assign(ORDINANCE_ECONOMY, ordBase);
      Object.assign(CPU_MAYOR, structuredClone(cpuMayorBase));
      Object.assign(RECOVERY, recBase);
      for (const k of Object.keys(TOWN_TRAITS) as TownTraitId[]) {
        for (const f of Object.keys(TOWN_TRAITS[k])) delete (TOWN_TRAITS[k] as unknown as Record<string, unknown>)[f];
        Object.assign(TOWN_TRAITS[k], structuredClone(traitsBase[k]));
      }
      FEATURES.rails = FEATURES.ordinances = FEATURES.recovery = FEATURES.quests = FEATURES.fishMarket = true;
      QUEST_DEFS.forEach((d, k) => { d.need = questNeedBase[k]; });
      Object.assign(QUEST_ECONOMY, questEcoBase);
      Object.assign(FISH_MARKET, fishBase);
      DEST_PULL.scaleWithReward = true;
    };
    const groups = (ENV.BALANCE_SWEEP_GROUPS ?? 'field').split(',').map(x => x.trim()).filter(Boolean);
    const seedBase = Number(ENV.BALANCE_SWEEP_BASE ?? 100);
    const seeds = Number(ENV.BALANCE_SWEEP_SEEDS ?? 3);
    const w = (s: CitySummary) => Object.entries(s.byStrategy).map(([k, v]) => `${k}:${v.winRate}%/¥${Math.round(v.assets / 1000)}k`).join(' ');
    for (const cfg of configs) {
      const { costs, festivalMoneyScale, sp, binbo, rail, railCpu, ord, cpuMayor, rec, traits, off, destFlat, quests, questEco, fish, ...eco } = cfg;
      setFeast(festivalMoneyScale ?? 1);
      Object.assign(SPECIALTY_ECONOMY, spBase, sp ?? {});
      Object.assign(BINBO, binboBase, binbo ?? {});
      Object.assign(CITY_ECONOMY, base, eco);
      for (const [k, v] of Object.entries(BUILDING_INFO)) v.cost = costs?.[k] ?? baseCosts[k];
      restoreV5();
      if (rail) {
        const { price, ...rest } = rail;
        Object.assign(RAIL_ECONOMY, rest);
        Object.assign(RAIL_ECONOMY.price, price ?? {});
      }
      Object.assign(RAIL_CPU, railCpu ?? {});
      Object.assign(ORDINANCE_ECONOMY, ord ?? {});
      if (cpuMayor) {
        const { seatBonus, ...rest } = cpuMayor;
        Object.assign(CPU_MAYOR, rest);
        Object.assign(CPU_MAYOR.seatBonus, seatBonus ?? {});
      }
      Object.assign(RECOVERY, rec ?? {});
      for (const [k, v] of Object.entries(traits ?? {})) Object.assign(TOWN_TRAITS[k as TownTraitId], v);
      for (const f of off ?? []) FEATURES[f] = false;
      DEST_PULL.scaleWithReward = !destFlat;
      for (const [id, need] of Object.entries(quests ?? {})) {
        const def = QUEST_DEFS.find(d => d.id === id);
        if (def && need) def.need = need as unknown as typeof def.need;
      }
      Object.assign(QUEST_ECONOMY, questEco ?? {});
      Object.assign(FISH_MARKET, fish ?? {});
      const lines: string[] = [JSON.stringify(cfg)];
      for (const grp of groups) {
        if (grp === 'none') continue; // 1人プレイだけ見たいとき（BALANCE_SWEEP_SOLO=1 と合わせる）
        if (grp === 'human') {
          // 人を模したボット1人 対 本物の CPU 3人
          const rows = vsCpuRun(seedBase + 900000, Math.max(1, Math.round(seeds / 2)));
          lines.push(`  [human] ${rows.map(r => `${r.bot}:${r.botWin}%(S${r.cpuWin.cpuS}/M${r.cpuWin.cpuM}/R${r.cpuWin.cpuR}) ¥${Math.round(r.botAssets / 1000)}k対¥${Math.round(r.cpuAssets / 1000)}k`).join(' ')}`);
          continue;
        }
        const games = grp === 'rail' ? extraRun(seedBase + 300000, 'rail', Math.max(1, Math.round(seeds / 2)))
          : grp === 'mayor' ? extraRun(seedBase + 500000, 'mayor', Math.max(1, Math.round(seeds / 2)))
          : grp === 'cpu' ? rotateRun(seedBase + 700000, CPU_LINEUP, seeds * 2)
          : fieldRun(seedBase, seeds);
        const a = summarizeCity(grp, games);
        lines.push(`  [${grp} ${a.games}局] ${w(a)}`);
        if (grp === 'field') {
          lines.push(`  pay ${JSON.stringify(a.paybackMedian)} L2 ${a.level2Median} grow ${JSON.stringify(a.kindGrowth)} dis ${a.annualDisasterLossRate}% p90loss ${Math.max(...Object.values(a.byStrategy).map(v => v.maxLossShare))}% lead12 ${a.leaderAt12Wins}% lead24 ${a.leaderAt24Wins}% share ${JSON.stringify(a.incomeShare)} early ${JSON.stringify(a.incomeShare12)} resRoi ${a.kindRoi.res?.roi} resDemand ${JSON.stringify(a.resDemandHist)} occ ${a.resOccupancy}% assets ${JSON.stringify(a.assetsMedianAt)} tier ${JSON.stringify(a.tierMedian)} vac ${a.vacatedPerGame}/${a.vacantAtEnd}% ren ${a.renovationsPerGame}`);
          lines.push(`  spec pay ${a.specialtyPayback}(${a.specialtyRecovered}%) mono ${a.regionMonoEverRate}/${a.regionMonoAtEndRate}% first ${a.firstMonoMedian}m y1 ${a.firstMonoYear1Rate}% binbo ¥${a.binboDamagePerGame}(実損¥${a.binboLossPerGame}, 資産比${a.binboLossShareOfAssets}%) max ${a.binboMaxShareMedian}/${a.binboMaxShareP90}% visitor ¥${a.visitorPerGame} award ¥${a.awardsPerGame} cards ${JSON.stringify(a.cardUsesPerGame)}`);
        }
        lines.push(`  ${v5Line(a)}`);
      }
      if (ENV.BALANCE_SWEEP_SOLO) {
        lines.push(`  solo ${BUILDER_STRATEGIES.map(st => soloRun(st, 10)).map(o => `${o.strategy}:¥${Math.round(o.assets / 1000)}k/成長${o.naturalUps}/月収${o.incomeAt12}→${o.incomeAt36}`).join(' ')}`);
      }
      out.push(lines.join('\n'));
    }
    Object.assign(CITY_ECONOMY, base);
    Object.assign(SPECIALTY_ECONOMY, spBase);
    Object.assign(BINBO, binboBase);
    for (const [k, v] of Object.entries(BUILDING_INFO)) v.cost = baseCosts[k];
    setFeast(1);
    restoreV5();
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/${ENV.BALANCE_SWEEP_OUT ?? 'city-sweep.txt'}`, out.join('\n'));
    else console.log(out.join('\n'));
  }, 1_800_000);
});

describe.skipIf(!!SWEEP)('まちづくりバランス（ヘッドレス36か月シミュレーション）', () => {
  let field: CitySummary;
  let withFisher: CitySummary;
  let solos: SoloSummary[];
  let railKing: CitySummary;
  let mayorSeeker: CitySummary;
  let mayorSeekerNoOrdinance: CitySummary;
  let cpus: CitySummary;
  let vsCpu: VsCpuRow[];

  beforeAll(() => {
    field = summarizeCity('5戦略の総当たり（4人選出×席ローテーション）', fieldRun(100, 8));
    withFisher = summarizeCity('釣り専念を交えた対戦', rotateRun(900, ['fisher', 'demand', 'res', 'indpow'], 6));
    solos = BUILDER_STRATEGIES.map(st => soloRun(st, 20));
    railKing = summarizeCity('鉄道王を交えた対戦（鉄道王＋5戦略から3つ）', extraRun(300100, 'rail', 3));
    mayorSeeker = summarizeCity('町長狙いを交えた対戦（町長狙い＋5戦略から3つ）', extraRun(500100, 'mayor', 2));
    // 同じ対局を条例なしで（条例が町長狙いを押し上げていないかを見る）
    FEATURES.ordinances = false;
    try {
      mayorSeekerNoOrdinance = summarizeCity('町長狙いを交えた対戦・条例なし（比較用）', extraRun(500100, 'mayor', 2));
    } finally {
      FEATURES.ordinances = true;
    }
    cpus = summarizeCity('本物の CPU（堅実・独占・目的地）と需要追従', rotateRun(700100, CPU_LINEUP, 12));
    vsCpu = vsCpuRun(900100, 5);
    report.push('## まちづくりモード', formatCity(field), formatCity(withFisher), formatCity(railKing), formatCity(mayorSeeker), formatCity(mayorSeekerNoOrdinance), formatCity(cpus), formatVsCpu(vsCpu));
    report.push(['### 1人プレイ（20局平均）', '| 戦略 | 最終総資産 | 自然成長の回数 | 12か月目の月収 | 36か月目の月収 | 建物数 |', '|---|---|---|---|---|---|',
      ...solos.map(o => `| ${o.strategy} | ¥${o.assets} | ${o.naturalUps} | ¥${o.incomeAt12} | ¥${o.incomeAt36} | ${o.buildings} |`)].join('\n'));
  }, 600_000);

  afterAll(() => {
    if (REPORT_DIR) writeFileSync(`${REPORT_DIR}/city-balance.md`, report.join('\n\n'));
  });

  it('単一の必勝戦略がない（各戦略の勝率 8〜45%、4人戦の均等は25%）', () => {
    for (const s of BUILDER_STRATEGIES) {
      expect(field.byStrategy[s].winRate, s).toBeGreaterThanOrEqual(8);
      expect(field.byStrategy[s].winRate, s).toBeLessThanOrEqual(45);
    }
  });

  it('戦略間の最終総資産の差が極端でない（最下位 ≥ 首位の60%）', () => {
    const assets = BUILDER_STRATEGIES.map(s => field.byStrategy[s].assets);
    expect(Math.min(...assets) / Math.max(...assets)).toBeGreaterThanOrEqual(0.6);
  });

  it('建物の回収期間はおおむね10〜20か月（公園は維持費のみなので対象外）', () => {
    for (const k of ['res', 'com', 'ind', 'power', 'tourism', 'port']) {
      expect(field.paybackMedian[k], k).toBeGreaterThanOrEqual(9);
      expect(field.paybackMedian[k], k).toBeLessThanOrEqual(21);
    }
  });

  it('町は1年ほどで目に見えて育つ（等級2到達の中央値 ≤ 14か月）', () => {
    expect(field.level2Median).toBeLessThanOrEqual(14);
    expect(field.growthPerPlotMonth).toBeGreaterThanOrEqual(4);
  });

  it('災害は痛いが致命的でない（年間損失は資産価値の2〜8%、1回で失うのはp90でも35%以下）', () => {
    expect(field.annualDisasterLossRate).toBeGreaterThanOrEqual(2);
    expect(field.annualDisasterLossRate).toBeLessThanOrEqual(8);
    for (const s of BUILDER_STRATEGIES) expect(field.byStrategy[s].maxLossShare, s).toBeLessThanOrEqual(35);
  });

  it('終盤まで逆転の余地がある（12か月目の首位が勝つ率 ≤ 60%、24か月目 ≤ 80%）', () => {
    expect(field.leaderAt12Wins).toBeLessThanOrEqual(60);
    expect(field.leaderAt24Wins).toBeLessThanOrEqual(80);
  });

  it('1人プレイでも町が育つ（住宅・需要追従・独占は1局で自然成長8回以上、12か月目の月収 ¥1,500以上）', () => {
    for (const o of solos.filter(x => x.strategy === 'res' || x.strategy === 'demand' || x.strategy === 'mono')) {
      expect(o.naturalUps, o.strategy).toBeGreaterThanOrEqual(8);
      expect(o.incomeAt12, o.strategy).toBeGreaterThanOrEqual(1500);
    }
  });

  it('空き家は起きるが町の1割以下（最終月の空き家率 2〜10%）', () => {
    expect(field.vacantAtEnd).toBeGreaterThanOrEqual(2);
    expect(field.vacantAtEnd).toBeLessThanOrEqual(10);
  });

  it('発展度は36か月で多くの町が壱に、いくつかの町が参に届く', () => {
    expect(field.tierMedian.t1).toBeGreaterThanOrEqual(10);
    expect(field.tierMedian.t3).toBeGreaterThanOrEqual(2);
  });

  it('地方独占は起きるが毎局ではない（36か月の4人戦の30〜60%）。最初の独占はふつう1年目より後', () => {
    expect(field.regionMonoEverRate).toBeGreaterThanOrEqual(30);
    expect(field.regionMonoEverRate).toBeLessThanOrEqual(60);
    expect(field.firstMonoMedian).toBeGreaterThan(12);
    expect(field.firstMonoYear1Rate).toBeLessThanOrEqual(20);
  });

  it('名産は安全な資産として36か月のうちに回収できる（回収 12〜24か月。価値が下がらないぶん建物より少し遅くてよい）', () => {
    expect(field.specialtyPayback).toBeGreaterThanOrEqual(12);
    expect(field.specialtyPayback).toBeLessThanOrEqual(24);
  });

  it('貧乏神は痛いが致命的でなく、特定の人に張り付きすぎない', () => {
    expect(field.binboDamagePerGame).toBeGreaterThan(0);
    expect(field.binboLossShareOfAssets).toBeLessThanOrEqual(10);
    expect(field.binboMaxShareMedian).toBeLessThanOrEqual(60);
    expect(field.binboMaxShareP90).toBeLessThanOrEqual(75);
  });

  it('買い物代は実際に行き交う（1局 ¥3,000以上）', () => {
    expect(field.visitorPerGame).toBeGreaterThanOrEqual(3000);
  });

  it('まちの収入が主役で、序盤は釣り・祭りの収入も意味を持つ', () => {
    expect(field.incomeShare.city).toBeGreaterThanOrEqual(55);
    expect(field.incomeShare12.city).toBeGreaterThanOrEqual(40);
    expect(field.incomeShare12.fish).toBeGreaterThanOrEqual(3);
    // 釣りだけでは勝てない（まちを作らないと総資産で大きく負ける）
    expect(withFisher.byStrategy.fisher.winRate).toBe(0);
  });

  // ===== v5: 鉄道・町長と条例・災害からの復興・町の特色 =====

  it('帳尻: 運賃と町税は人から人へ動くだけ（受け取りと支払いが一致する）', () => {
    for (const s of [field, withFisher, railKing, mayorSeeker, cpus]) expect(s.ledgerGap, s.label).toBe(0);
  });

  it('鉄道: 4人戦の半分以上の局で誰かが線路を敷く（本物の CPU の対戦でも）。CPU は敷きすぎない', () => {
    expect(field.rail.gameRate).toBeGreaterThanOrEqual(50);
    expect(cpus.rail.gameRate).toBeGreaterThanOrEqual(50);
    // CPU は1人あたり1局3区間まで（敷きすぎると建物に回すお金が減って弱くなる）
    for (const k of ['cpuS', 'cpuM', 'cpuR']) expect(cpus.rail.byStrategy[k], k).toBeLessThanOrEqual(3);
  });

  it('鉄道: 1区間は運賃で維持費をまかなう（赤字にならない）が、建物ほどは稼がず、値段の全額はまず取り戻せない', () => {
    // 1区間1か月の 運賃＋近所の効果−維持費 がプラス（敷くほど毎月赤字、にはならない）
    for (const s of [field, railKing, cpus]) expect(s.rail.perSegMonth.net, s.label).toBeGreaterThan(0);
    // 利回りは月に値段の 0.3〜4%（建物は月に8%ほど。線路は儲けの柱ではない）
    for (const s of [field, railKing, cpus]) {
      expect(s.rail.yieldPerMonth, s.label).toBeGreaterThanOrEqual(0.3);
      expect(s.rail.yieldPerMonth, s.label).toBeLessThanOrEqual(4);
    }
    // 回収は区間の多い鉄道王の対局で見る（18か月目までに敷いた区間）: 半分以上の区間で赤字が消え、全額を取り戻すのは3分の1まで
    expect(railKing.rail.halfRate).toBeGreaterThanOrEqual(50);
    expect(railKing.rail.paybackRate).toBeLessThanOrEqual(35);
  });

  it('鉄道: 敷いた人が損も大勝ちもしない', () => {
    // ふつうの使い方（5戦略が CPU と同じ見込みで1局に1〜2区間）: 敷いた人の順位はほぼ動かず、勝率は均等（25%）のまわり
    expect(Math.abs(field.rail.layerRankChange)).toBeLessThanOrEqual(0.75);
    expect(field.rail.layerWinRate).toBeGreaterThanOrEqual(12);
    expect(field.rail.layerWinRate).toBeLessThanOrEqual(45);
    // 鉄道王（1局に十数区間。総投資の3割ほどを線路に回す極端な戦略）: 必勝法ではなく、死に手でもない。
    // 盤が広く1区間の通過は月0.13回ほどなので、線路で勝つことはできない（160局で勝率 9%。帯 8〜45% の下の端）。
    // 局数が少ないと揺れるので、下の境目は 4% に置き、総資産が「同じ建て方で線路を敷かない」需要追従の8割以上あることを見る
    // （叩き台の数値では 70%・勝率 0.6%）
    const king = railKing.byStrategy.rail;
    expect(king.winRate).toBeLessThanOrEqual(45);
    expect(king.winRate).toBeGreaterThanOrEqual(4);
    expect(king.assets / railKing.byStrategy.demand.assets).toBeGreaterThanOrEqual(0.8);
  });

  it('条例: 町長は1局に何人も生まれ、条例は実際に使われ、1種類に偏らない', () => {
    expect(field.mayor.townsEver).toBeGreaterThanOrEqual(6);
    // 条例は工事1回を使うので、値打ちを見て出す人（CPU と同じ物差し）では町長のいる町×月の4割強、最終月でほぼ半分。
    // いつも工事より先に出すと 57%・64% まで上がるが、町を埋めるのが遅れて総資産が5%ほど減る（ORD_POLICY の説明）
    expect(field.mayor.coverage).toBeGreaterThanOrEqual(35);
    expect(field.mayor.coverageAtEnd).toBeGreaterThanOrEqual(42);
    expect(cpus.mayor.coverageAtEnd).toBeGreaterThanOrEqual(42);
    // いちばん多い条例でも6割未満。5種類とも出る（死んだ条例がない）
    expect(field.mayor.maxKindShare).toBeLessThan(60);
    expect(cpus.mayor.maxKindShare).toBeLessThan(60);
    for (const k of ORDINANCE_KINDS) expect(field.mayor.kindShare[k], k).toBeGreaterThanOrEqual(2);
  });

  it('町税は実際に動くが強すぎない（まちの収入の1%未満、受け取る人でも収入の数%）', () => {
    expect(field.mayor.taxPerGame).toBeGreaterThanOrEqual(300);
    expect(field.mayor.taxShareOfCity).toBeLessThanOrEqual(1);
    expect(field.mayor.taxMaxPlayerShare).toBeLessThanOrEqual(8);
  });

  it('町長狙いは条例で勝っているのではない（条例を切っても総資産はほぼ同じ）', () => {
    // 町長狙い（区画の半分より多くを取りに行き、町をまとめて埋める）は5戦略より強いが、条例を切っても強さは変わらない。
    // 強さの元は「1つの町にまとめて建てる」こと（視察1回で育つ建物が多い・独占に近い）で、v4 からの性質
    const on = mayorSeeker.byStrategy.mayor;
    const off = mayorSeekerNoOrdinance.byStrategy.mayor;
    expect(on.assets / off.assets).toBeGreaterThanOrEqual(0.85);
    expect(on.assets / off.assets).toBeLessThanOrEqual(1.15);
    // 町長としての直接の出入り（町税の受け取り−支払い−条例の負担）は総資産の2%以内
    const direct = on.v5['町税の受け取り'] - on.v5['町税の支払い'] - on.v5['条例の負担'];
    expect(Math.abs(direct) / on.assets).toBeLessThanOrEqual(0.02);
    expect(on.winRate).toBeLessThanOrEqual(65);
  });

  it('復興: 特需と見舞金は実際に起き、被災した人の順位が極端に落ちない（災害で得もしない）', () => {
    expect(field.recovery.startsPerGame).toBeGreaterThanOrEqual(2);
    expect(field.recovery.buildsPerGame).toBeGreaterThanOrEqual(3);
    expect(field.recovery.aidPerGame).toBeGreaterThan(0);
    // 見舞金は損失の一部（全壊した等級1の建物だけ。損失の4分の1まで）
    expect(field.recovery.aidShareOfLoss).toBeLessThanOrEqual(25);
    // 建物の1割以上を一度に失った人: 順位の変化は平均 ±0.75 以内、2つ以上落ちるのは3割まで
    expect(field.recovery.hitRankChange).toBeLessThanOrEqual(0.75);
    expect(field.recovery.hitRankChange).toBeGreaterThanOrEqual(-0.5);
    expect(field.recovery.hitDrop2Rate).toBeLessThanOrEqual(30);
    // 1局でいちばんひどく被災した人が最下位で終わるのは半分未満（均等なら25%）
    expect(field.recovery.victimLastRate).toBeLessThanOrEqual(45);
  });

  // ===== 物価（年ごとに賞金も罰も上がる）・入居率・CPU の強さ =====

  it('物価: 賞金（目的地・祭り・称号）が終盤まで収入の2割ほどを占め、貧乏神も年ごとに重くなる', () => {
    // 物価の前は 目的地 5%・祭り 6%・称号 2%（合わせて 13%）で、後半は建物の月収を眺めるだけだった
    const prizes = field.incomeShare.destination + field.incomeShare.festival + field.incomeShare.award;
    expect(prizes).toBeGreaterThanOrEqual(15);
    expect(prizes).toBeLessThanOrEqual(35);
    // 貧乏神の実損は最終総資産の 2〜10%（物価の前は 2.4%）
    expect(field.binboLossShareOfAssets).toBeGreaterThanOrEqual(2);
  });

  it('入居率: 住宅は働き口が足りないと満室にならない（平均 80〜97%）が、主力の建物のまま', () => {
    expect(field.resOccupancy).toBeGreaterThanOrEqual(80);
    expect(field.resOccupancy).toBeLessThanOrEqual(97);
    // 住宅の投資倍率は商業・工業より上のまま（下げすぎていない）
    expect(field.kindRoi.res.roi).toBeGreaterThan(field.kindRoi.ind.roi);
  });

  it('人を模したボット1人 対 本物の CPU 3人: CPU は弱すぎず強すぎない（ボットの勝率は平均 10〜60%、均等なら25%）', () => {
    const games = vsCpu.reduce((a, r) => a + r.games, 0);
    const avg = vsCpu.reduce((a, r) => a + r.botWin * r.games, 0) / games;
    expect(avg).toBeGreaterThanOrEqual(10);
    expect(avg).toBeLessThanOrEqual(60);
  });

  it('町の特色: 特色のある町は少し稼ぐが、同じ格の特色のない町の 0.8〜1.6 倍に収まる', () => {
    for (const [k, v] of Object.entries(field.traits)) {
      if (k === 'none') continue;
      expect(v.vsClass, k).toBeGreaterThanOrEqual(0.8);
      expect(v.vsClass, k).toBeLessThanOrEqual(1.6);
      expect(v.builtRate, k).toBeGreaterThanOrEqual(20); // 誰も建てない町にはなっていない
    }
  });
});
