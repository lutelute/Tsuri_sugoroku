// まちづくりすごろく（SimCity 風モード）のゲームロジック。
// React / ストアに依存しない純粋関数だけで構成し、Vitest で検証する。
//
// 仕組みの要点:
//  - 盤面の「町」マス（中継・スタート・ゴール以外）に区画(plot)があり、止まったプレイヤーが建物を建てる。
//  - 住宅(R)・商業(C)・工業(I) のバランス、電力、公害、公園・観光による幸福度で、町は毎月「自然に」成長/衰退する。
//  - 月末に建物の持ち主へ税収・売上が入る。発電所は周囲の町へ送電し、送電料を得る。
//  - 地震・台風などの災害が町を壊す。目的地へ一番乗りすると賞金。
import type { BoardNode, NodeType, Region } from './types';
import { BOARD_NODES, NODE_MAP } from '../data/boardNodes';
import { buildAdjacencyList } from '../data/boardEdges';
import { random } from '../utils/random';
import { specialtyIncomes, playerSpecialtyValue } from './citySpecialties';
import { traitClassOverride, traitAllowAdd, traitIdsOf, traitDemand, traitIncomeMul, traitPollutionMul, traitSeasonMul } from './cityTraits';
import type { TownTraitId } from '../data/cityTraits';
import type { BinboState } from './binbo';
import type { RailMap } from './railways';
import { mergeRailNeighbors, railNeighborMap, railUpkeep, playerRailValue } from './railways';
import type { Ordinance } from './mayor';
import type { QuestAward, QuestState } from './cityQuests';
import { ordinanceStatsEffect, isIndustryBanned, ordinanceContext, ordinancePlotIncome, ordinanceMonthlyCost, mayorChanges } from './mayor';

// ===== 型 =====

export type BuildingKind = 'res' | 'com' | 'ind' | 'park' | 'power' | 'port' | 'tourism';
export type TownClass = 'metro' | 'city' | 'port' | 'onsen' | 'market' | 'village';

export interface Plot {
  kind: BuildingKind;
  level: number; // 1..3（住宅/商業/工業/観光は自然成長する）
  owner: number; // プレイヤー index
  builtTurn: number;
  /** 需要が低い状態が続いた月数（空き家へのカウントダウン） */
  lowMonths?: number;
  /** 空き家（収入0・発展しない）。需要が戻るか、持ち主が直すと元に戻る */
  vacant?: boolean;
}

export interface TownState {
  plots: (Plot | null)[];
  /** 発展度 0〜3（壱・弐・参）。上がるたびに区画が増え、地価が上がる */
  tier?: number;
  /** 地価の係数（幸福度・公害で毎月変わる。建設費と資産価値にだけ効く） */
  land?: number;
  /** 発展で区画が増えたときの、もとの区画数（独占の判定に使う） */
  base?: number;
  /** 復興特需の残り月数（災害の被害が残った町。建設・再開発・修理が割引、住宅・商業の需要が上がる。RECOVERY） */
  recovery?: number;
  /** 条例（町長が決める。町長が替わっても残り、町長がいない間はお休み。mayor.ts） */
  ordinance?: Ordinance;
  /** 最後に条例を決めた（やめた）人と月。条例は1か月に1回まで（mayor.ts） */
  lastEnact?: { by: number; turn: number };
}

export interface CityBuff {
  playerIndex: number;
  kind: 'boom' | 'recession';
  roundsLeft: number;
}

export interface CityHistoryPoint {
  turn: number;
  assets: number[];
  population: number[];
}

export interface CityDamage {
  nodeId: string;
  kind: BuildingKind;
  owner: number;
  destroyed: boolean; // true: 全壊 / false: 1段階ダウン
  /** 空き家だった建物（見舞金は半額） */
  vacant?: boolean;
}

export interface CityDisasterReport {
  kind: DisasterKind;
  title: string;
  area: string;
  damages: CityDamage[];
}

export interface CityPlayerReport {
  income: number;
  upkeep: number;
  net: number;
  population: number;
  populationDelta: number;
  grown: number;
  declined: number;
  /** この月に空き家になった建物の数 */
  vacated?: number;
  /** 災害の見舞金（全壊した建物の持ち主へ。recovery.ts の settleDisasters の額をストアが入れる。income には含めない） */
  aid?: number;
  /** 町長として受け取った町税 / ほかの町長に払った町税 / 条例の負担（どれも income・upkeep に含まれている） */
  mayorTax?: number;
  taxPaid?: number;
  ordinanceCost?: number;
}

export interface CityReport {
  turn: number; // 集計したラウンド
  players: CityPlayerReport[];
  disasters: CityDisasterReport[];
  headlines: string[];
  /** 発展度が変わった町 */
  tierChanges?: { nodeId: string; from: number; to: number }[];
  /** この月末に達成されたお題（賞金は income に含めない。cityQuests.ts） */
  questDone?: QuestAward[];
}

export interface CityState {
  towns: Record<string, TownState>;
  destination: string | null;
  destinationReward: number;
  buffs: CityBuff[];
  history: CityHistoryPoint[];
  /** 今月視察した町（次の月末、その町の持ち主の建物は発展判定を多く受ける） */
  inspections?: { nodeId: string; playerIndex: number }[];
  /** 視察の瓦版を見た人の席（瓦版はその人の初回だけ。2回目からは町の画面の「視察済み」の札だけ。cityArrival.ts） */
  inspectNoticed?: number[];
  /** 特需（目的地に一番乗りされた町など）: 残り月数のあいだ需要が上乗せされる */
  booms?: { nodeId: string; monthsLeft: number }[];
  /** 名産の持ち主（名産のある町の nodeId → playerIndex） */
  specialties?: Record<string, number>;
  /** 貧乏神（とりついている人と月数） */
  binbo?: BinboState;
  /** 鉄道: 線路のある中継マス → 持ち主（railways.ts） */
  rails?: RailMap;
  /** お題と今年の舞台（cityQuests.ts。古いセーブには無く、次の4月に引く） */
  quests?: QuestState;
  /** 釣り大会（7月）: その年の7月に釣った魚の売値の合計（席ごと）。月末に精算して消す（fishMarket.ts） */
  derby?: { year: number; totals: number[] };
}

export type DisasterKind = 'quake' | 'typhoon' | 'fire' | 'kaiju';

// ===== 定数 =====

export const CITY_INITIAL_MONEY = 12000;
export const CITY_START_NODE = 'tokyo';
export const CITY_ACTIONS_PER_VISIT = 2;
export const CITY_DEFAULT_MONTHS = 36;
export const CITY_GOAL_BONUS = 5000;
export const MAX_BUILDING_LEVEL = 3;
/** 送電の届く距離（盤面のマス数。中継マスを含む） */
export const POWER_RANGE = 6;
/** 近隣の町とみなす距離（隣の町 = 中継マスを1つ挟んで2） */
export const NEIGHBOR_RANGE = 2;

/**
 * 経済・成長・災害の調整値。balance.city.sim.test.ts（36か月・4戦略の対戦シミュレーション）で計測して決めた。
 * 目安: 建物の回収期間は約10〜20か月、単一の必勝戦略がない、災害の年間損失は資産価値の数%。
 */
export const CITY_ECONOMY = {
  /** 住宅: 等級1・地価1.0・幸福度係数1.0あたりの月収 */
  resIncome: 210,
  /** 電気のない住宅の収入・人口の倍率 */
  resUnpoweredMul: 0.7,
  /** 商業: 等級1・地価1.0あたりの月収（客の入り 0.3〜1.6 倍） */
  comIncome: 135,
  comUnpoweredMul: 0.3,
  /** 工業: 等級1・地価1.0あたりの月収（働き手 0.4〜1.12 倍） */
  indIncome: 185,
  indUnpoweredMul: 0.2,
  /**
   * 観光名所: 等級1あたりの月収（幸福度で 0.4〜1.5 倍）。
   * v5 の物価（賞金が年ごとに上がる）で手元のお金が増えると、建設費の高い観光名所を建てきれるようになり、
   * 観光の勝率が 35% → 43〜47% に上がった（帯の上限は 45%）。310 → 290 で 36〜37%。回収は 15〜16か月のまま。
   */
  tourismIncome: 240,
  /** 観光収入に地価を掛けるか（false だと地価の高い町ほど割に合わない） */
  tourismUsesLandValue: true,
  /**
   * 観光名所の「幸福度による倍率」（0.6 + 幸福度×0.06）の上限。住宅の倍率は 1.5 で頭打ちだが、観光には上限が無かった。
   * 観光名所は自分でも幸福度を上げる（等級1つにつき+1）ので、観光名所で埋めた町は幸福度 20 を越え、倍率が 2 倍以上になる
   * （独占3倍・季節1.5倍・観光振興・古都と掛け合わさって、1軒で月に2万円を越えた）。幸福度 10 で頭打ち（1.2）。
   */
  tourismFactorMax: 1.2,
  /** 発電所: 送電先（建物のある町）1つあたりの送電料・上限・維持費 */
  powerPerTown: 110,
  powerMaxTowns: 12,
  powerUpkeep: 250,
  /** 漁港: 固定の月収と、釣果の売上に対する水揚げ手数料の率 */
  portIncome: 320,
  portFeeRate: 0.3,
  parkUpkeep: 60,
  /** 自然成長: 需要がプラスのときの成長確率 = growthBase + 需要×growthPerDemand（上限 growthMax） */
  growthBase: 0.1,
  growthPerDemand: 0.3,
  growthMax: 0.5,
  /** 住宅需要 = (近くの雇用 − 近くの人口×demandResPop)/100 + (幸福度−4)×demandResHappiness + demandResBase */
  demandResPop: 0.45,
  demandResHappiness: 0.15,
  demandResBase: 0.6,
  /** 商業需要 = (近くの人口×demandComPop − 商業等級×demandComPer)/100 + 漁港 demandComPort */
  demandComPop: 0.45,
  demandComPer: 90,
  demandComPort: 0.4,
  /** 工業需要 = (近くの人口×demandIndPop − 工業等級×demandIndPer)/100 + demandIndBase */
  demandIndPop: 0.35,
  demandIndPer: 70,
  demandIndBase: 0.3,
  /** 観光名所が自然成長するのに必要な幸福度（需要 = (幸福度 − これ)/2。上限 tourismGrowthDemandMax） */
  tourismGrowthHappiness: 8,
  /**
   * 観光名所の自然成長の「需要」の上限。v5 で条例がただになり、景観条例（幸福度+2）を毎月出せるようになって、
   * 公園と観光名所で埋めた町（幸福度 15〜20）が毎月のように育つ雪だるまになった（観光の戦略の勝率 62%・総資産がほかの1.7倍）。
   * 0.3 で上限を付け（成長の確率は最大 0.19）、観光名所の月収を 290 → 250 にして 41%・回収 19か月（160局）。
   */
  tourismGrowthDemandMax: 0.3,
  /**
   * 需要が growthFloorMinDemand より上なら、幸福度 growthFloorHappiness 以上で月 growthFloor の確率で育つ（0 で無効）。
   * 1人プレイでは相手の雇用・人口が無く需要が0付近に張り付くため、これが無いと町がほとんど育たなかった。
   * 幸福度2は「電気の来ていない素の町（5−3）」でも満たす値。
   */
  growthFloor: 0.04,
  growthFloorMinDemand: -1,
  growthFloorHappiness: 2,
  /** 町の格ごとの需要の上乗せ（町の個性。r=住宅 c=商業 i=工業。全て0で無効） */
  // 大都市は住・商が集まり、温泉町は工場を嫌い、商都は商いが盛ん、村は店が育ちにくい（まちづくり企画係の案。平均はほぼ0）
  classDemand: {
    metro: { r: 0.3, c: 0.3, i: 0 },
    city: { r: 0.1, c: 0.1, i: 0 },
    port: { r: -0.1, c: 0, i: 0.2 },
    onsen: { r: 0, c: 0.2, i: -0.6 },
    market: { r: -0.1, c: 0.4, i: 0.1 },
    village: { r: 0.1, c: -0.4, i: 0.1 },
  } as Record<TownClass, { r: number; c: number; i: number }>,
  /** 町の全区画を1人で埋めたときの収入倍率（発展で区画が増えると独占が崩れやすいため、v4.1 で 2.5 → 3） */
  monopolyMul: 3,
  /** 季節の災害: 8〜9月の台風確率 / 毎月の地震確率 */
  typhoonChance: 0.45,
  quakeChance: 0.08,
  /** 被害: 地震で各建物が被災する確率 / 台風 / 等級1の建物が全壊する確率 */
  quakeHit: 0.4,
  typhoonHit: 0.35,
  /** 備え: 公園のある町の地震の被災率 / 漁港のある町の台風の被災率（quakeHit・typhoonHit と同じ値なら効果なし） */
  parkQuakeHit: 0.2,
  portTyphoonHit: 0.18,
  level1DestroyChance: 0.5,
  /** 空き家: 需要がこれを下回る月が vacancyMonths 続くと空き家。需要が正に戻れば毎月 vacancyRecoverChance で戻る */
  // 36か月の総当たりで最終月の空き家が建物の約8%・修理が1局2件程度になる値（−1.0/3か月/0.5 では約12%）
  vacancyDemand: -1.3,
  vacancyMonths: 4,
  vacancyRecoverChance: 0.7,
  /** 空き家を持ち主が直す費用（建設費に対する率） */
  renovateCostRate: 0.3,
  /** 視察: 視察した町の自分の建物が次の月末に受ける発展判定の回数 */
  inspectRolls: 2,
  /** 発展度: 壱・弐・参に上がる人口 / 1段ごとに増える区画 / 1段ごとの地価の上乗せ / 下がる境目の割合 */
  tierPop: [120, 250, 450],
  tierPlotBonus: 1,
  tierLandBonus: 0.15,
  tierDownRatio: 0.7,
  /** 地価の係数 = 1 + landHappinessCoef×(幸福度−5) − landPollutionCoef×公害（landMin〜landMax） */
  landHappinessCoef: 0.04,
  landPollutionCoef: 0.03,
  landMin: 0.75,
  landMax: 1.35,
  /**
   * 客としての買い物代: 他人の商業（等級×これ×地価）・観光（等級×これ）。独占された町は倍。所持金のこの割合まで。
   * v4.1 第2弾: 季節の暦で観光・商業が年平均1〜2割伸び、工業は伸びないため、観光を下げて商工業・送電料を上げた
   * （商135・工185・観光310・送電110）。買い物代は1局¥7,000ほどで目立たなかったので 120/200 → 180/300。
   */
  visitorComFee: 180,
  visitorTourismFee: 300,
  visitorMonopolyMul: 2,
  visitorMaxRate: 0.25,
  /** 目的地: 一番乗りされた町の特需（月数・需要の上乗せ） / 一番乗りした人の追加工事。賞金は物価（yearScale）で年ごとに上がる */
  destinationBoomMonths: 6,
  destinationBoomDemand: 1.0,
  destinationBonusActions: 1,
  /**
   * 入居率: 住宅の収入に掛ける。入居率 = 1 + occupancyPerDemand × 住宅の需要（occupancyMin〜1）。
   * 需要が0以上なら満室。働き口（商・工・観光）が近くに無いまま住宅ばかり建てると、満額は入らない。
   */
  occupancyPerDemand: 0.25,
  occupancyMin: 0.6,
  /** 物価: 年度ごとの倍率（1年目から）。賞金・罰・カードの値段・買い物代・魚の売値に掛ける。建設費と建物の収入には掛けない */
  yearScale: [1, 2, 4, 6],
};

/**
 * 物価の倍率（その巡の年度）。町の収入は年に2〜3倍に伸びるので、額の決まった賞金や罰は年ごとに軽くなる。
 * これを掛けて、終盤でも目的地・貧乏神・称号・カード・釣りが同じ重さを保つようにする。
 */
export function priceScale(turn: number): number {
  const s = CITY_ECONOMY.yearScale;
  return s[Math.min(s.length - 1, Math.max(0, Math.floor((turn - 1) / 12)))];
}

/**
 * その月（turn）を締めたあと、来月から物価が上がるなら、新しい倍率と去年からの上がり方（上がらなければ null）。
 * 3月の月末（4月の始まり）の瓦版に使う。
 */
export function priceRiseAfter(turn: number): { scale: number; ratio: number } | null {
  const now = priceScale(turn);
  const next = priceScale(turn + 1);
  return next > now ? { scale: next, ratio: next / now } : null;
}

/**
 * 災害からの復興（企画案⑧）。数値は難易度調整係が balance.city.sim.test.ts で調整する。
 * - 災害の被害が残った町は months か月の「復興特需」: 建設・再開発・空き家の修理が costMul 倍、住宅・商業の需要が demand 上がる。
 *   目的地の特需（booms）と重なっても需要は足し算せず、大きい方を使う。2度目の被災は残り月を months に戻す（延長はしない）。
 * - 全壊した建物の持ち主に、建設費（割引前・被災前の地価）の aidRate を見舞金として払う。空き家だった建物は vacantAidMul 倍。
 * - 保険で元に戻った建物は見舞金の対象外、被害がすべて保険で戻った町は特需にしない（recovery.ts の settleDisasters）。
 */
export const RECOVERY = {
  months: 6,
  costMul: 0.7,
  demand: 1.0,
  aidRate: 0.3,
  vacantAidMul: 0.5,
};

/** 復興特需の残り月数（0 なら特需なし） */
export function recoveryMonthsLeft(town?: TownState): number {
  return Math.max(0, town?.recovery ?? 0);
}

/** 季節の暦: 月ごとの行事と収入の倍率（正の収入だけに掛ける） */
export interface SeasonInfo {
  name: string;
  desc: string;
  mul: (kind: BuildingKind, cls: TownClass, region: Region) => number;
}

export const SEASONS: Record<number, SeasonInfo> = {
  4: { name: '花見', desc: '観光1.5倍・商業1.1倍', mul: k => (k === 'tourism' ? 1.5 : k === 'com' ? 1.1 : 1) },
  5: { name: '大型連休', desc: '観光1.3倍', mul: k => (k === 'tourism' ? 1.3 : 1) },
  6: { name: '梅雨', desc: '観光0.8倍', mul: k => (k === 'tourism' ? 0.8 : 1) },
  7: { name: '夏祭り', desc: '都市の商業1.2倍', mul: (k, c) => (k === 'com' && (c === 'city' || c === 'metro') ? 1.2 : 1) },
  8: { name: '花火・お盆', desc: '観光1.4倍・港町の商業1.2倍・台風に注意', mul: (k, c) => (k === 'tourism' ? 1.4 : k === 'com' && c === 'port' ? 1.2 : 1) },
  9: { name: '台風', desc: '台風に注意', mul: () => 1 },
  10: { name: '紅葉', desc: '観光1.5倍・温泉町1.3倍', mul: (k, c) => (k === 'tourism' ? 1.5 : c === 'onsen' ? 1.3 : 1) },
  11: { name: '紅葉', desc: '観光1.5倍・温泉町1.3倍', mul: (k, c) => (k === 'tourism' ? 1.5 : c === 'onsen' ? 1.3 : 1) },
  12: { name: '年末商戦', desc: '商業1.5倍', mul: k => (k === 'com' ? 1.5 : 1) },
  1: { name: '初売り', desc: '商業1.3倍', mul: k => (k === 'com' ? 1.3 : 1) },
  2: { name: '雪まつり', desc: '北海道の観光2倍・北国の住宅0.9倍', mul: (k, _c, r) => (k === 'tourism' && r === 'hokkaido' ? 2 : k === 'res' && (r === 'hokkaido' || r === 'tohoku') ? 0.9 : 1) },
  3: { name: '年度末', desc: '大決算', mul: () => 1 },
};

export function seasonOf(turn: number): SeasonInfo & { month: number } {
  const month = ((turn - 1 + 3) % 12) + 1;
  return { ...SEASONS[month], month };
}

/**
 * 季節の暦と町の特色（雪国・湯の町）を合わせた収入の倍率（正の収入だけに掛ける）。
 * 暦がその月・その建物を同じ向きに動かしている町では、特色の補正を重ねない
 * （例: 北海道の2月は暦の雪まつりで観光2倍なので、雪国の「2月の観光2倍」は足さない）。
 */
export function seasonalIncomeMul(season: SeasonInfo & { month: number }, kind: BuildingKind, nodeId: string): number {
  const info = getTownInfo(nodeId);
  if (!info) return 1;
  const base = season.mul(kind, info.cls, info.region);
  const t = traitSeasonMul(nodeId, kind, season.month);
  if (t === 1) return base;
  if (base !== 1 && (base > 1) === (t > 1)) return base;
  return base * t;
}

export const TIER_LABEL = ['', '壱', '弐', '参'];

export const BUILDING_INFO: Record<BuildingKind, { name: string; short: string; cost: number; desc: string; color: string }> = {
  res: { name: '住宅地', short: '住', cost: 2000, desc: '人が住む。雇用と幸福度が高いと自然に発展し、税収が増える', color: '#4f9d5d' },
  com: { name: '商業地', short: '商', cost: 3000, desc: '近くの人口が多いほど売上UP。電力が必要', color: '#3d7fc4' },
  ind: { name: '工業地', short: '工', cost: 3500, desc: '雇用と大きな売上を生むが公害を出す。電力が必要', color: '#c99a2e' },
  park: { name: '公園', short: '園', cost: 1500, desc: `幸福度UP・公害を吸収。避難場所になり、町の地震の被害を減らす。維持費 ¥${CITY_ECONOMY.parkUpkeep}/月`, color: '#7cc36b' },
  power: { name: '発電所', short: '電', cost: 9000, desc: `周囲${POWER_RANGE}マスの町へ送電し、送電料を得る。維持費 ¥${CITY_ECONOMY.powerUpkeep}/月`, color: '#e0c341' },
  port: { name: '漁港', short: '港', cost: 5000, desc: 'この町で誰かが釣るたび水揚げ手数料。商業も活気づき、防波堤で台風の被害を減らす', color: '#4fb0c6' },
  tourism: { name: '観光名所', short: '観', cost: 6000, desc: '幸福度が高いほど観光収入UP。人気が出ると発展する', color: '#d9628a' },
};

export const TOWN_CLASS_INFO: Record<TownClass, { name: string; plots: number; landValue: number; allowed: BuildingKind[] }> = {
  metro: { name: '大都市', plots: 8, landValue: 2.0, allowed: ['res', 'com', 'ind', 'park', 'power', 'tourism'] },
  city: { name: '都市', plots: 6, landValue: 1.5, allowed: ['res', 'com', 'ind', 'park', 'power', 'tourism'] },
  port: { name: '港町', plots: 4, landValue: 1.1, allowed: ['res', 'com', 'ind', 'park', 'port'] },
  onsen: { name: '温泉町', plots: 4, landValue: 1.1, allowed: ['res', 'com', 'park', 'tourism'] },
  market: { name: '商都', plots: 5, landValue: 1.3, allowed: ['res', 'com', 'ind', 'park', 'power'] },
  village: { name: '村', plots: 3, landValue: 0.8, allowed: ['res', 'ind', 'park', 'power'] },
};

const METRO = new Set(['tokyo', 'osaka', 'nagoya']);
const TOWN_TYPES: Set<NodeType> = new Set(['capital', 'fishing', 'fishing_special', 'shop', 'rest', 'event_good', 'event_bad', 'event_random']);

// ===== 町の静的情報 =====

export function isTown(node: BoardNode | undefined): node is BoardNode {
  return !!node && TOWN_TYPES.has(node.type);
}

export function townClassOf(node: BoardNode): TownClass {
  const override = traitClassOverride(node.id); // 町の特色の表で格を直した町（神戸は都市、倉敷は商都など）
  if (override) return override;
  if (METRO.has(node.id)) return 'metro';
  switch (node.type) {
    case 'capital': return 'city';
    case 'fishing':
    case 'fishing_special': return 'port';
    case 'rest': return 'onsen';
    case 'shop': return 'market';
    default: return 'village';
  }
}

export interface TownInfo {
  id: string;
  name: string;
  region: Region;
  cls: TownClass;
  plots: number;
  landValue: number;
  allowed: BuildingKind[];
  /** 町の特色（data/cityTraits.ts。なければ空） */
  traits: TownTraitId[];
}

export const TOWN_IDS: string[] = BOARD_NODES.filter(isTown).map(n => n.id);

const TOWN_INFO_CACHE = new Map<string, TownInfo>();
export function getTownInfo(nodeId: string): TownInfo | null {
  const cached = TOWN_INFO_CACHE.get(nodeId);
  if (cached) return cached;
  const node = NODE_MAP.get(nodeId);
  if (!isTown(node)) return null;
  const cls = townClassOf(node);
  const ci = TOWN_CLASS_INFO[cls];
  // 特色で建てられる建物を足す（並びは BUILDING_INFO の順にそろえる）
  const extra = traitAllowAdd(node.id);
  const allowed = extra.length ? (Object.keys(BUILDING_INFO) as BuildingKind[]).filter(k => ci.allowed.includes(k) || extra.includes(k)) : ci.allowed;
  const info: TownInfo = { id: node.id, name: node.name, region: node.region, cls, plots: ci.plots, landValue: ci.landValue, allowed, traits: traitIdsOf(node.id) };
  TOWN_INFO_CACHE.set(nodeId, info);
  return info;
}

// ===== グラフ距離 =====

const ADJ = buildAdjacencyList();

/** nodeId から maxDist 以内の全ノードまでの距離（BFS） */
export function distancesFrom(nodeId: string, maxDist = Infinity): Map<string, number> {
  const dist = new Map<string, number>([[nodeId, 0]]);
  const q = [nodeId];
  while (q.length) {
    const cur = q.shift()!;
    const d = dist.get(cur)!;
    if (d >= maxDist) continue;
    for (const nb of ADJ.get(cur) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        q.push(nb);
      }
    }
  }
  return dist;
}

const NEIGHBOR_CACHE = new Map<string, string[]>();
/** 近隣の町（自分を除く） */
export function townNeighbors(nodeId: string): string[] {
  const c = NEIGHBOR_CACHE.get(nodeId);
  if (c) return c;
  const res = [...distancesFrom(nodeId, NEIGHBOR_RANGE).keys()].filter(id => id !== nodeId && getTownInfo(id));
  NEIGHBOR_CACHE.set(nodeId, res);
  return res;
}

// ===== 初期化 =====

/** stage（今年の舞台）を渡すと最初の目的地を舞台に寄せる。お題つきの対局は cityQuests.ts の createQuestCityState で作る */
export function createInitialCityState(stage?: DestinationStage): CityState {
  const towns: Record<string, TownState> = {};
  for (const id of TOWN_IDS) {
    const info = getTownInfo(id)!;
    towns[id] = { plots: Array.from({ length: info.plots }, () => null) };
  }
  const destination = pickDestination(null, CITY_START_NODE, 1, stage);
  return {
    towns,
    destination: destination.nodeId,
    destinationReward: destination.reward,
    buffs: [],
    history: [],
  };
}

// ===== 費用・価値 =====

/** 観光名所の自然成長の「需要」（幸福度から決まる。住・商・工の需要と同じ物差しで成長の確率に使う） */
export function tourismGrowthDemand(happiness: number): number {
  return Math.min(CITY_ECONOMY.tourismGrowthDemandMax, (happiness - CITY_ECONOMY.tourismGrowthHappiness) / 2);
}

/** 町の今の地価（基本の地価 × 発展度の上乗せ × 幸福度・公害による係数） */
export function effectiveLandValue(nodeId: string, town?: TownState): number {
  const base = getTownInfo(nodeId)?.landValue ?? 1;
  const tier = town?.tier ?? 0;
  return base * (1 + CITY_ECONOMY.tierLandBonus * tier) * (town?.land ?? 1);
}

/** 建設費の基準（発展度・地価の変動を反映。復興の割引は含めない＝資産価値・買収額・見舞金の基準） */
export function baseBuildCost(kind: BuildingKind, nodeId: string, town?: TownState): number {
  return Math.round((BUILDING_INFO[kind].cost * effectiveLandValue(nodeId, town)) / 100) * 100;
}

/** 建設費。town を渡すと発展度・地価の変動と、復興特需の割引を反映する（省略時は基本の地価） */
export function buildCost(kind: BuildingKind, nodeId: string, town?: TownState): number {
  const base = baseBuildCost(kind, nodeId, town);
  return recoveryMonthsLeft(town) > 0 ? Math.round((base * RECOVERY.costMul) / 100) * 100 : base;
}

/** 建物の資産価値（空き家は半値） */
export function plotValue(plot: Plot, nodeId: string, town?: TownState): number {
  const base = baseBuildCost(plot.kind, nodeId, town); // 復興の割引で資産価値・買収額は下げない
  return Math.round(base * (1 + 0.6 * (plot.level - 1)) * (plot.vacant ? 0.5 : 1));
}

export function upgradeCost(plot: Plot, nodeId: string, town?: TownState): number {
  return Math.round((buildCost(plot.kind, nodeId, town) * 0.8 * plot.level) / 100) * 100;
}

export function acquireCost(plot: Plot, nodeId: string, town?: TownState): number {
  return Math.round((plotValue(plot, nodeId, town) * 1.5) / 100) * 100;
}

/** 空き家を直す費用 */
export function renovateCost(plot: Plot, nodeId: string, town?: TownState): number {
  return Math.round((buildCost(plot.kind, nodeId, town) * CITY_ECONOMY.renovateCostRate) / 100) * 100;
}

/** 等級を上げられる建物か（公園・発電所・漁港は1段階のみ） */
export function isUpgradable(kind: BuildingKind): boolean {
  return kind === 'res' || kind === 'com' || kind === 'ind' || kind === 'tourism';
}

// ===== 建設・再開発・買収 =====

export type CityActionResult = { ok: true; state: CityState; cost: number; message: string } | { ok: false; reason: string };

function withTown(state: CityState, nodeId: string, plots: (Plot | null)[]): CityState {
  return { ...state, towns: { ...state.towns, [nodeId]: { ...state.towns[nodeId], plots } } };
}

export function canBuild(state: CityState, nodeId: string, kind: BuildingKind, plotIndex: number, money: number): string | null {
  const info = getTownInfo(nodeId);
  const town = state.towns[nodeId];
  if (!info || !town) return 'ここには建てられない';
  if (!info.allowed.includes(kind)) return `${info.name}（${TOWN_CLASS_INFO[info.cls].name}）には${BUILDING_INFO[kind].name}を建てられない`;
  if (kind === 'ind' && isIndustryBanned(town)) return '景観条例で工業地の新築は禁止されている';
  if (plotIndex < 0 || plotIndex >= town.plots.length) return '区画がない';
  if (town.plots[plotIndex]) return 'その区画は使用中';
  if ((kind === 'power' || kind === 'port') && town.plots.some(p => p?.kind === kind)) return `${BUILDING_INFO[kind].name}は1つの町に1つまで`;
  if (money < buildCost(kind, nodeId, town)) return 'お金が足りない';
  return null;
}

export function build(state: CityState, nodeId: string, plotIndex: number, kind: BuildingKind, playerIndex: number, money: number, turn: number): CityActionResult {
  const err = canBuild(state, nodeId, kind, plotIndex, money);
  if (err) return { ok: false, reason: err };
  const cost = buildCost(kind, nodeId, state.towns[nodeId]);
  const plots = [...state.towns[nodeId].plots];
  plots[plotIndex] = { kind, level: 1, owner: playerIndex, builtTurn: turn };
  const info = getTownInfo(nodeId)!;
  return { ok: true, state: withTown(state, nodeId, plots), cost, message: `${info.name}に${BUILDING_INFO[kind].name}を建てた` };
}

export function upgrade(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number): CityActionResult {
  const town = state.towns[nodeId];
  const plot = town?.plots[plotIndex];
  if (!plot) return { ok: false, reason: '建物がない' };
  if (plot.owner !== playerIndex) return { ok: false, reason: '自分の建物ではない' };
  if (!isUpgradable(plot.kind)) return { ok: false, reason: 'この建物は再開発できない' };
  if (plot.level >= MAX_BUILDING_LEVEL) return { ok: false, reason: 'すでに最高等級' };
  if (plot.vacant) return { ok: false, reason: '空き家は先に直す必要がある' };
  const cost = upgradeCost(plot, nodeId, town);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };
  const plots = [...town.plots];
  plots[plotIndex] = { ...plot, level: plot.level + 1 };
  return { ok: true, state: withTown(state, nodeId, plots), cost, message: `${BUILDING_INFO[plot.kind].name}を再開発（等級${plot.level + 1}）` };
}

export function acquire(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number): CityActionResult & { prevOwner?: number } {
  const town = state.towns[nodeId];
  const plot = town?.plots[plotIndex];
  if (!plot) return { ok: false, reason: '建物がない' };
  if (plot.owner === playerIndex) return { ok: false, reason: 'すでに自分の建物' };
  const cost = acquireCost(plot, nodeId, town);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };
  const plots = [...town.plots];
  plots[plotIndex] = { ...plot, owner: playerIndex };
  return { ok: true, state: withTown(state, nodeId, plots), cost, prevOwner: plot.owner, message: `${BUILDING_INFO[plot.kind].name}を買収した` };
}

/** 空き家を直す（持ち主のみ） */
export function renovate(state: CityState, nodeId: string, plotIndex: number, playerIndex: number, money: number): CityActionResult {
  const town = state.towns[nodeId];
  const plot = town?.plots[plotIndex];
  if (!plot) return { ok: false, reason: '建物がない' };
  if (plot.owner !== playerIndex) return { ok: false, reason: '自分の建物ではない' };
  if (!plot.vacant) return { ok: false, reason: '空き家ではない' };
  const cost = renovateCost(plot, nodeId, town);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };
  const plots = [...town.plots];
  plots[plotIndex] = { ...plot, vacant: false, lowMonths: 0 };
  return { ok: true, state: withTown(state, nodeId, plots), cost, message: `${BUILDING_INFO[plot.kind].name}を直して入居者が戻った` };
}

/** 視察を記録する（自分の建物がある町に止まったとき）。記録したら true */
export function recordInspection(state: CityState, nodeId: string, playerIndex: number): { state: CityState; inspected: boolean } {
  const town = state.towns[nodeId];
  if (!town || !town.plots.some(p => p && p.owner === playerIndex)) return { state, inspected: false };
  const list = state.inspections ?? [];
  if (list.some(x => x.nodeId === nodeId && x.playerIndex === playerIndex)) return { state, inspected: true };
  // 視察で入居者の不安も和らぐ（空き家へのカウントダウンをリセット）
  const plots = town.plots.map(p => (p && p.owner === playerIndex && !p.vacant && p.lowMonths ? { ...p, lowMonths: 0 } : p));
  return {
    state: { ...state, inspections: [...list, { nodeId, playerIndex }], towns: { ...state.towns, [nodeId]: { ...town, plots } } },
    inspected: true,
  };
}

// ===== 町の状態計算 =====

export interface TownStats {
  population: number;
  jobs: number;
  pollution: number;
  happiness: number;
  powered: boolean;
  demand: { r: number; c: number; i: number };
  /** 近隣を含む人口（商業の客・工業の働き手） */
  popNear: number;
}

function sumLevel(plots: (Plot | null)[], kind: BuildingKind): number {
  let s = 0;
  for (const p of plots) if (p?.kind === kind && !p.vacant) s += p.level;
  return s;
}
function countKind(plots: (Plot | null)[], kind: BuildingKind): number {
  let s = 0;
  for (const p of plots) if (p?.kind === kind) s++;
  return s;
}

/** 発電所から送電が届いている町 */
export function computePowered(state: CityState): Set<string> {
  const powered = new Set<string>();
  for (const [id, town] of Object.entries(state.towns)) {
    if (!town.plots.some(p => p?.kind === 'power')) continue;
    for (const [nid, d] of distancesFrom(id, POWER_RANGE)) {
      if (d <= POWER_RANGE) powered.add(nid);
    }
  }
  return powered;
}

export function computeAllStats(state: CityState): Map<string, TownStats> {
  const powered = computePowered(state);
  const boomed = new Set((state.booms ?? []).filter(b => b.monthsLeft > 0).map(b => b.nodeId));
  // 1. 町ごとの素の値
  const base = new Map<string, { R: number; C: number; I: number; P: number; T: number; port: boolean; cls: TownClass; ord: ReturnType<typeof ordinanceStatsEffect> }>();
  for (const [id, town] of Object.entries(state.towns)) {
    const info = getTownInfo(id);
    if (!info) continue;
    base.set(id, {
      R: sumLevel(town.plots, 'res'),
      C: sumLevel(town.plots, 'com'),
      I: sumLevel(town.plots, 'ind'),
      P: countKind(town.plots, 'park'),
      T: sumLevel(town.plots, 'tourism'),
      port: town.plots.some(p => p?.kind === 'port'),
      cls: info.cls,
      ord: ordinanceStatsEffect(town), // 条例（町長がいる町だけ）
    });
  }
  // 2. 公害（自町 + 近隣からの流入）
  const pollution = new Map<string, number>();
  for (const [id, b] of base) {
    let pol = b.I * 3 * traitPollutionMul(id) - b.P * 2 + b.ord.pollution; // 工業地帯は工場の公害が少ない
    for (const nb of townNeighbors(id)) {
      const nbb = base.get(nb);
      if (nbb) pol += nbb.I * 1.2 * traitPollutionMul(nb);
    }
    pollution.set(id, Math.max(0, Math.round(pol * 10) / 10));
  }
  // 3. 幸福度・人口
  const pop = new Map<string, number>();
  const hap = new Map<string, number>();
  for (const [id, b] of base) {
    const isPowered = powered.has(id);
    const h = 5 + b.P * 3 + b.T + (b.cls === 'onsen' ? 2 : 0) - (pollution.get(id) ?? 0) - (isPowered ? 0 : 3) + b.ord.happiness;
    hap.set(id, Math.round(h * 10) / 10);
    const factor = Math.max(0.3, Math.min(1.5, 0.6 + h * 0.06)) * (isPowered ? 1 : CITY_ECONOMY.resUnpoweredMul);
    pop.set(id, Math.round(b.R * 100 * factor));
  }
  // 4. 需要（RCI）
  const out = new Map<string, TownStats>();
  // 鉄道: 線路でつながった町も近所として人口と働き口を分け合う（公害は線路を伝わらないので 2. では使わない）
  const railNear = railNeighborMap(state.rails);
  for (const [id, b] of base) {
    const isPowered = powered.has(id);
    let popNear = pop.get(id) ?? 0;
    let jobsNear = b.C * 50 + b.I * 80 + b.T * 30;
    for (const nb of mergeRailNeighbors(townNeighbors(id), railNear.get(id), id, t => base.has(t))) {
      const nbb = base.get(nb);
      popNear += (pop.get(nb) ?? 0) * 0.5;
      if (nbb) jobsNear += (nbb.C * 50 + nbb.I * 80 + nbb.T * 30) * 0.5;
    }
    const h = hap.get(id) ?? 0;
    const E = CITY_ECONOMY;
    const cd = E.classDemand[b.cls];
    const td = traitDemand(id); // 町の特色（工業地帯・城下町など）
    const boom = boomed.has(id) ? E.destinationBoomDemand : 0;
    // 復興特需（住宅・商業だけ）。目的地の特需と重なっても足し算せず、大きい方を使う
    const rcBoom = Math.max(boom, recoveryMonthsLeft(state.towns[id]) > 0 ? RECOVERY.demand : 0);
    const r = (jobsNear - popNear * E.demandResPop) / 100 + (h - 4) * E.demandResHappiness + E.demandResBase + cd.r + rcBoom + b.ord.r + td.r;
    const c = (popNear * E.demandComPop - b.C * E.demandComPer) / 100 + (b.port ? E.demandComPort : 0) + (isPowered ? 0 : -1.5) + cd.c + rcBoom + td.c;
    const i = (popNear * E.demandIndPop - b.I * E.demandIndPer) / 100 + E.demandIndBase + (isPowered ? 0 : -1.5) + cd.i + boom + b.ord.i + td.i;
    out.set(id, {
      population: pop.get(id) ?? 0,
      jobs: b.C * 50 + b.I * 80 + b.T * 30,
      pollution: pollution.get(id) ?? 0,
      happiness: h,
      powered: isPowered,
      demand: { r: round1(r), c: round1(c), i: round1(i) },
      popNear: Math.round(popNear),
    });
  }
  return out;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// ===== 収入 =====

/** 住宅の入居率（occupancyMin〜1）。住宅の需要が0以上なら満室、マイナスが大きいほど空き部屋が増える */
export function occupancyRate(demandR: number): number {
  const E = CITY_ECONOMY;
  return Math.max(E.occupancyMin, Math.min(1, 1 + E.occupancyPerDemand * demandR));
}

/** 1つの建物の月収（維持費はマイナス） */
export function plotIncome(plot: Plot, nodeId: string, stats: TownStats, poweredTownsWithBuildings: number): number {
  const v = basePlotIncome(plot, nodeId, stats, poweredTownsWithBuildings);
  if (v <= 0) return v;
  const m = traitIncomeMul(nodeId, plot.kind); // 町の特色（古都の観光・港湾都市の商業など）
  return m === 1 ? v : Math.round(v * m);
}

function basePlotIncome(plot: Plot, nodeId: string, stats: TownStats, poweredTownsWithBuildings: number): number {
  if (plot.vacant) return 0;
  const info = getTownInfo(nodeId);
  const lv = info?.landValue ?? 1;
  const E = CITY_ECONOMY;
  switch (plot.kind) {
    case 'res': {
      const k = Math.max(0.3, Math.min(1.5, 0.6 + stats.happiness * 0.06)) * (stats.powered ? 1 : E.resUnpoweredMul);
      return Math.round(E.resIncome * plot.level * lv * k * occupancyRate(stats.demand.r));
    }
    case 'com': {
      const customers = Math.min(1.3, stats.popNear / Math.max(1, 60 * plot.level * 2));
      return Math.round(E.comIncome * plot.level * lv * (0.3 + customers) * (stats.powered ? 1 : E.comUnpoweredMul));
    }
    case 'ind': {
      const workers = Math.min(1.2, (stats.popNear + 60) / Math.max(1, 70 * plot.level * 2));
      return Math.round(E.indIncome * plot.level * lv * (0.4 + workers * 0.6) * (stats.powered ? 1 : E.indUnpoweredMul));
    }
    case 'tourism':
      return Math.round(E.tourismIncome * plot.level * (E.tourismUsesLandValue ? lv : 1) * Math.min(E.tourismFactorMax, Math.max(0.4, 0.6 + stats.happiness * 0.06)));
    case 'power':
      return Math.min(E.powerMaxTowns, poweredTownsWithBuildings) * E.powerPerTown - E.powerUpkeep;
    case 'port':
      return E.portIncome;
    case 'park':
      return -E.parkUpkeep;
  }
}

/** 発電所のある町から送電している「建物のある町」の数（送電料の基準） */
export function poweredTownsWithBuildings(state: CityState, powerTown: string): number {
  let n = 0;
  for (const [nid, d] of distancesFrom(powerTown, POWER_RANGE)) {
    if (d <= POWER_RANGE && state.towns[nid]?.plots.some(p => p && p.kind !== 'power')) n++;
  }
  return n;
}

// ===== 月末シミュレーション =====

export interface SimulationResult {
  state: CityState;
  report: CityReport;
  incomes: number[]; // プレイヤーごとの純収支（ストアでお金に加算する）
}

export function playerPopulation(state: CityState, playerIndex: number, stats = computeAllStats(state)): number {
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const R = sumLevel(town.plots, 'res');
    if (R === 0) continue;
    const mine = town.plots.reduce((acc, p) => acc + (p?.kind === 'res' && p.owner === playerIndex ? p.level : 0), 0);
    total += Math.round((s.population * mine) / R);
  }
  return total;
}

export function playerPropertyValue(state: CityState, playerIndex: number): number {
  let total = 0;
  for (const [id, town] of Object.entries(state.towns)) {
    for (const p of town.plots) if (p && p.owner === playerIndex) total += plotValue(p, id, town);
  }
  return total;
}

/** 所有する建物の数 */
export function playerBuildingCount(state: CityState, playerIndex: number): number {
  let n = 0;
  for (const town of Object.values(state.towns)) for (const p of town.plots) if (p && p.owner === playerIndex) n++;
  return n;
}

/**
 * 独占: 町のもとの区画数ぶん以上の建物を1人だけで持っている。
 * 発展で増えた区画に他の人が建てると独占は崩れる（町の発展が独占争いの火種になる）。
 */
export function monopolyOwner(town: TownState): number | null {
  const built = town.plots.filter((p): p is Plot => !!p);
  const need = town.base ?? town.plots.length;
  if (built.length === 0 || built.length < need) return null;
  const owner = built[0].owner;
  return built.every(p => p.owner === owner) ? owner : null;
}

function monthOf(turn: number): number {
  return ((turn - 1 + 3) % 12) + 1; // 1巡目 = 4月
}

export function calendarLabel(turn: number): { year: number; month: number } {
  return { year: Math.floor((turn - 1 + 3) / 12) + 1, month: monthOf(turn) };
}

/**
 * 1ラウンド（1か月）を進める: 収入計算 → 自然成長/衰退 → 季節の災害 → 履歴記録。
 * 収入は成長前の状態で計算する（今月の町の姿に対して入る）。
 */
export function simulateRound(state: CityState, playerCount: number, turn: number, moneys: number[]): SimulationResult {
  const stats = computeAllStats(state);
  const powered = computePowered(state);
  const poweredWithBuildings = new Map<string, number>(); // 発電所の町 → 送電先のうち建物がある町の数
  for (const [id, town] of Object.entries(state.towns)) {
    if (town.plots.some(p => p?.kind === 'power')) poweredWithBuildings.set(id, poweredTownsWithBuildings(state, id));
  }

  const income = Array.from({ length: playerCount }, () => 0);
  const upkeep = Array.from({ length: playerCount }, () => 0);
  // 条例: 町税（受け取り・支払い）と月々の負担（income・upkeep にも含める。レポートの内訳用）
  const mayorTax = Array.from({ length: playerCount }, () => 0);
  const taxPaid = Array.from({ length: playerCount }, () => 0);
  const ordinanceCost = Array.from({ length: playerCount }, () => 0);
  const popBefore = Array.from({ length: playerCount }, (_, i) => playerPopulation(state, i, stats));

  const season = seasonOf(turn);
  // 景気の札（好景気 1.5倍・不景気 0.5倍）の倍率。町税は「景気を掛けた後の、実際に入る額」から取るので先に求めておく
  const buffMul = Array.from({ length: playerCount }, () => 1);
  for (const b of state.buffs) if (b.playerIndex < playerCount) buffMul[b.playerIndex] *= b.kind === 'boom' ? 1.5 : 0.5;
  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s) continue;
    const mono = monopolyOwner(town);
    const tinfo = getTownInfo(id);
    const ord = ordinanceContext(town);
    const mayorHere = ord && ord.mayor < playerCount ? ord.mayor : null;
    for (const p of town.plots) {
      if (!p || p.owner >= playerCount) continue;
      let v = plotIncome(p, id, s, poweredWithBuildings.get(id) ?? 0);
      if (v > 0 && tinfo) v = Math.round(v * seasonalIncomeMul(season, p.kind, id)); // 季節の行事と特色（雪国・湯の町）
      if (v > 0 && mono === p.owner) v = Math.round(v * CITY_ECONOMY.monopolyMul); // 独占ボーナス
      const o = ordinancePlotIncome(ord, p, v); // 観光振興・町税
      v = o.income;
      if (v >= 0) income[p.owner] += v;
      else upkeep[p.owner] += -v;
      if (o.tax > 0 && mayorHere !== null) {
        // 町税: 持ち主の景気を掛けた後の収入から取り、町長にはその額がそのまま入る（払う額と受け取る額が同じ）
        const tax = Math.round(o.tax * buffMul[p.owner]);
        upkeep[p.owner] += tax;
        taxPaid[p.owner] += tax;
        mayorTax[mayorHere] += tax;
      }
    }
    const oc = mayorHere !== null ? ordinanceMonthlyCost(ord?.kind) : 0;
    if (oc > 0 && mayorHere !== null) {
      upkeep[mayorHere] += oc;
      ordinanceCost[mayorHere] += oc;
    }
  }

  // 名産の月収（季節で上下・地方独占で倍）
  specialtyIncomes(state.specialties, playerCount, season.month).forEach((v, i) => {
    income[i] += v;
  });
  // 鉄道の維持費（1区間ごと）
  railUpkeep(state.rails, playerCount).forEach((v, i) => {
    upkeep[i] += v;
  });

  // 景気バフ
  const buffs: CityBuff[] = [];
  for (const b of state.buffs) {
    if (b.playerIndex < playerCount) {
      income[b.playerIndex] = Math.round(income[b.playerIndex] * (b.kind === 'boom' ? 1.5 : 0.5));
    }
    if (b.roundsLeft > 1) buffs.push({ ...b, roundsLeft: b.roundsLeft - 1 });
  }
  // 町税の受け取りは、景気を掛けた後に足す（町長の景気で町税が増減しない）
  mayorTax.forEach((v, i) => {
    income[i] += v;
  });

  // 自然成長・衰退
  const grown = Array.from({ length: playerCount }, () => 0);
  const declined = Array.from({ length: playerCount }, () => 0);
  const vacated = Array.from({ length: playerCount }, () => 0);
  const inspected = new Set((state.inspections ?? []).map(x => `${x.nodeId}:${x.playerIndex}`));
  const headlines: string[] = [];
  const towns: Record<string, TownState> = {};
  for (const [id, town] of Object.entries(state.towns)) {
    const s = stats.get(id);
    if (!s || town.plots.every(p => !p)) {
      towns[id] = town;
      continue;
    }
    let changed = false;
    const plots = town.plots.map(p => {
      if (!p || !isUpgradable(p.kind)) return p;
      const E = CITY_ECONOMY;
      const d = p.kind === 'res' ? s.demand.r : p.kind === 'com' ? s.demand.c : p.kind === 'ind' ? s.demand.i : tourismGrowthDemand(s.happiness);
      // 空き家: 需要が戻れば入居者が戻る。空き家の間は発展しない
      if (p.vacant) {
        if (d > 0 && random() < E.vacancyRecoverChance) {
          changed = true;
          return { ...p, vacant: false, lowMonths: 0 };
        }
        return p;
      }
      // 需要の低い月が続くと空き家に近づく
      if (d < E.vacancyDemand) {
        const low = (p.lowMonths ?? 0) + 1;
        changed = true;
        if (low >= E.vacancyMonths) {
          if (p.owner < playerCount) vacated[p.owner]++;
          return { ...p, vacant: true, lowMonths: low };
        }
        p = { ...p, lowMonths: low };
      } else if (p.lowMonths) {
        changed = true;
        p = { ...p, lowMonths: 0 };
      }
      const growChance = Math.max(
        d > 0 ? Math.min(E.growthMax, E.growthBase + d * E.growthPerDemand) : 0,
        d > E.growthFloorMinDemand && s.happiness >= E.growthFloorHappiness ? E.growthFloor : 0,
      );
      // 視察した町の建物は発展判定を複数回受ける
      const rolls = inspected.has(`${id}:${p.owner}`) ? E.inspectRolls : 1;
      let r = random();
      for (let k = 1; k < rolls && r >= growChance; k++) r = random();
      if (p.level < MAX_BUILDING_LEVEL && r < growChance) {
        changed = true;
        if (p.owner < playerCount) grown[p.owner]++;
        return { ...p, level: p.level + 1 };
      }
      const unpoweredDecay = (p.kind === 'com' || p.kind === 'ind') && !s.powered;
      if (p.level > 1 && ((d < -1.5 && r > 0.75) || (unpoweredDecay && r > 0.7))) {
        changed = true;
        if (p.owner < playerCount) declined[p.owner]++;
        return { ...p, level: p.level - 1 };
      }
      return p;
    });
    towns[id] = changed ? { ...town, plots } : town;
  }

  const booms = (state.booms ?? []).map(b => ({ ...b, monthsLeft: b.monthsLeft - 1 })).filter(b => b.monthsLeft > 0);
  let next: CityState = tickRecovery({ ...state, towns, buffs, inspections: [], booms });

  // 季節の災害（8〜9月は台風、まれに地震）
  const disasters: CityDisasterReport[] = [];
  const month = monthOf(turn);
  const hasBuildings = Object.values(next.towns).some(t => t.plots.some(Boolean));
  if (hasBuildings) {
    if ((month === 8 || month === 9) && random() < CITY_ECONOMY.typhoonChance) {
      const r = applyDisaster(next, 'typhoon');
      next = r.state;
      disasters.push(r.report);
    } else if (random() < CITY_ECONOMY.quakeChance) {
      const r = applyDisaster(next, 'quake');
      next = r.state;
      disasters.push(r.report);
    }
  }

  // 発展度と地価（月末の町の姿で決める）
  const tierChanges: { nodeId: string; from: number; to: number }[] = [];
  {
    const E = CITY_ECONOMY;
    const st2 = computeAllStats(next);
    const towns2: Record<string, TownState> = { ...next.towns };
    for (const [id, town] of Object.entries(next.towns)) {
      const s2 = st2.get(id);
      if (!s2) continue;
      const land = Math.max(E.landMin, Math.min(E.landMax, 1 + E.landHappinessCoef * (s2.happiness - 5) - E.landPollutionCoef * s2.pollution));
      let tier = town.tier ?? 0;
      const from = tier;
      while (tier < E.tierPop.length && s2.population >= E.tierPop[tier]) tier++;
      while (tier > 0 && s2.population < E.tierPop[tier - 1] * E.tierDownRatio) tier--;
      let plots = town.plots;
      // 独占中の町は囲い込める（区画は増えず、地価だけが上がる）。独占のない町は区画が増えて新規参入の余地ができる
      if (tier > from && monopolyOwner(town) === null) {
        // 上がるたびに区画が増える（下がっても区画は減らさない。増やした分は最大まで）
        const info = getTownInfo(id);
        const maxPlots = (info?.plots ?? plots.length) + E.tierPop.length * E.tierPlotBonus;
        const want = Math.min(maxPlots, (info?.plots ?? plots.length) + tier * E.tierPlotBonus);
        if (plots.length < want) plots = [...plots, ...Array.from({ length: want - plots.length }, () => null)];
      }
      if (tier !== from) tierChanges.push({ nodeId: id, from, to: tier });
      if (tier !== from || plots !== town.plots || Math.abs((town.land ?? 1) - land) > 0.001) {
        towns2[id] = { ...town, plots, tier, land: Math.round(land * 100) / 100, base: town.base ?? getTownInfo(id)?.plots ?? town.plots.length };
      }
    }
    next = { ...next, towns: towns2 };
  }
  for (const c of tierChanges) {
    if (c.to > c.from) headlines.push(`${getTownInfo(c.nodeId)?.name}の発展度が${TIER_LABEL[c.to]}に上がった（区画が増えた）`);
  }
  // 災害や区画の増加で町長の座が替わった町（名前はストアが知っているので、ここでは町の名前だけ）
  for (const c of mayorChanges(state, next)) {
    const name = getTownInfo(c.nodeId)?.name;
    if (c.to === null) headlines.push(`${name}の町長の座が空いた`);
    else headlines.push(c.from === null ? `${name}に町長が生まれた` : `${name}の町長が替わった`);
  }

  // 目玉ニュース
  const allStats = computeAllStats(next);
  let bestTown: string | null = null;
  let bestPop = 0;
  for (const [id, s] of allStats) {
    if (s.population > bestPop) {
      bestPop = s.population;
      bestTown = id;
    }
  }
  if (bestTown && bestPop >= 300) headlines.push(`人口日本一の町は${getTownInfo(bestTown)?.name}（${bestPop.toLocaleString()}人）`);
  const unpoweredTowns = Object.entries(next.towns).filter(([id, t]) => t.plots.some(p => p && (p.kind === 'com' || p.kind === 'ind')) && !powered.has(id)).length;
  if (unpoweredTowns > 0) headlines.push(`電気の来ていない商工業の町が${unpoweredTowns}つ。発電所が求められている`);
  const nextSeason = seasonOf(turn + 1);
  headlines.push(`来月は${nextSeason.month}月「${nextSeason.name}」（${nextSeason.desc}）`);

  // 履歴
  const popAfter = Array.from({ length: playerCount }, (_, i) => playerPopulation(next, i, allStats));
  const net = income.map((v, i) => v - upkeep[i]);
  const assets = Array.from({ length: playerCount }, (_, i) => (moneys[i] ?? 0) + net[i] + playerPropertyValue(next, i) + playerSpecialtyValue(next.specialties, i) + playerRailValue(next.rails, i));
  next = { ...next, history: [...next.history, { turn, assets, population: popAfter }].slice(-120) };

  return {
    state: next,
    incomes: net,
    report: {
      turn,
      players: income.map((v, i) => ({
        income: v,
        upkeep: upkeep[i],
        net: net[i],
        population: popAfter[i],
        populationDelta: popAfter[i] - popBefore[i],
        grown: grown[i],
        declined: declined[i],
        vacated: vacated[i],
        mayorTax: mayorTax[i],
        taxPaid: taxPaid[i],
        ordinanceCost: ordinanceCost[i],
      })),
      disasters,
      headlines,
      tierChanges,
    },
  };
}

// ===== 災害 =====

/**
 * 復興特需の残り月を1つ減らす（月末。今月の災害の特需は、保険のあとで recovery.ts の settleDisasters が付ける）。
 * 切れた町は recovery を undefined にする（キーを消すと、保険の {...前, ...後} で前の値が戻ってしまうため）。
 */
function tickRecovery(state: CityState): CityState {
  let towns: Record<string, TownState> | null = null;
  for (const [id, t] of Object.entries(state.towns)) {
    if (!t.recovery) continue;
    towns ??= { ...state.towns };
    const left = t.recovery - 1;
    towns[id] = { ...t, recovery: left > 0 ? left : undefined };
  }
  return towns ? { ...state, towns } : state;
}

const REGION_JA: Record<Region, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州・沖縄',
};

const DISASTER_TITLE: Record<DisasterKind, string> = {
  quake: '大鯰の地震',
  typhoon: '台風上陸',
  fire: '大火事',
  kaiju: '大王イカ上陸',
};

function damagePlot(p: Plot, destroy: boolean): Plot | null {
  if (destroy || p.level <= 1) return null;
  return { ...p, level: p.level - 1 };
}

/**
 * 災害を起こす。
 * quake: 地方全体の建物が quakeHit の確率で損壊 / typhoon: 地方の港町・都市が typhoonHit の確率で損壊 /
 * fire: 対象プレイヤーの建物1つが全焼 / kaiju: 海辺の町から3つの町を進み、各町の最大の建物を壊す
 */
export function applyDisaster(
  state: CityState,
  kind: DisasterKind,
  opts: { region?: Region; targetPlayer?: number; startTown?: string } = {},
): { state: CityState; report: CityDisasterReport } {
  const towns = { ...state.towns };
  const damages: CityDamage[] = [];
  const regions: Region[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];
  // 建物のある地方を優先して選ぶ（誰も困らない災害は盛り上がらない）
  // （ただし毎回狙い撃ちにならないよう、4割は全国から無作為）
  const builtRegions = regions.filter(r => Object.entries(towns).some(([id, t]) => getTownInfo(id)?.region === r && t.plots.some(Boolean)));
  const pool = builtRegions.length && random() < 0.6 ? builtRegions : regions;
  const region = opts.region ?? pool[Math.floor(random() * pool.length)];
  let area = REGION_JA[region];

  // 等級2以上は1段階ダウン。等級1の建物は level1DestroyChance の確率でだけ全壊（残りは持ちこたえる）
  const hit = (id: string, pred: (p: Plot) => boolean, chance: number) => {
    const t = towns[id];
    if (!t) return;
    let changed = false;
    const plots = t.plots.map(p => {
      if (!p || !pred(p) || random() >= chance) return p;
      if (p.level <= 1 && random() >= CITY_ECONOMY.level1DestroyChance) return p;
      changed = true;
      const np = damagePlot(p, false);
      damages.push({ nodeId: id, kind: p.kind, owner: p.owner, destroyed: np === null, ...(p.vacant ? { vacant: true } : {}) });
      return np;
    });
    if (changed) towns[id] = { ...t, plots };
  };

  if (kind === 'quake') {
    for (const id of Object.keys(towns)) {
      if (getTownInfo(id)?.region !== region) continue;
      const chance = towns[id].plots.some(p => p?.kind === 'park') ? CITY_ECONOMY.parkQuakeHit : CITY_ECONOMY.quakeHit;
      hit(id, p => p.kind !== 'park' && p.kind !== 'power', chance);
    }
  } else if (kind === 'typhoon') {
    for (const id of Object.keys(towns)) {
      const info = getTownInfo(id);
      if (info?.region === region && (info.cls === 'port' || info.cls === 'city' || info.cls === 'metro')) {
        const chance = towns[id].plots.some(p => p?.kind === 'port') ? CITY_ECONOMY.portTyphoonHit : CITY_ECONOMY.typhoonHit;
        hit(id, p => p.kind !== 'power', chance);
      }
    }
  } else if (kind === 'fire') {
    const owned: { id: string; idx: number }[] = [];
    for (const [id, t] of Object.entries(towns)) {
      t.plots.forEach((p, idx) => {
        if (p && p.kind !== 'park' && (opts.targetPlayer === undefined || p.owner === opts.targetPlayer)) owned.push({ id, idx });
      });
    }
    if (owned.length) {
      const pick = owned[Math.floor(random() * owned.length)];
      const t = towns[pick.id];
      const p = t.plots[pick.idx]!;
      const plots = [...t.plots];
      plots[pick.idx] = null;
      towns[pick.id] = { ...t, plots };
      damages.push({ nodeId: pick.id, kind: p.kind, owner: p.owner, destroyed: true, ...(p.vacant ? { vacant: true } : {}) });
      area = getTownInfo(pick.id)?.name ?? area;
    }
  } else if (kind === 'kaiju') {
    const coastal = Object.keys(towns).filter(id => getTownInfo(id)?.cls === 'port' && (opts.region ? getTownInfo(id)?.region === opts.region : true));
    let cur = opts.startTown ?? coastal[Math.floor(random() * Math.max(1, coastal.length))];
    const visited: string[] = [];
    for (let step = 0; step < 3 && cur; step++) {
      visited.push(cur);
      const t = towns[cur];
      if (t) {
        let best = -1;
        t.plots.forEach((p, idx) => {
          if (p && (best < 0 || p.level > t.plots[best]!.level)) best = idx;
        });
        if (best >= 0) {
          const p = t.plots[best]!;
          const plots = [...t.plots];
          plots[best] = null;
          towns[cur] = { ...t, plots };
          damages.push({ nodeId: cur, kind: p.kind, owner: p.owner, destroyed: true, ...(p.vacant ? { vacant: true } : {}) });
        }
      }
      const nexts = townNeighbors(cur).filter(n => !visited.includes(n));
      cur = nexts.length ? nexts[Math.floor(random() * nexts.length)] : '';
    }
    area = visited.map(id => getTownInfo(id)?.name).filter(Boolean).join('→');
  }

  return { state: { ...state, towns }, report: { kind, title: DISASTER_TITLE[kind], area, damages } };
}

// ===== 目的地 =====

const DESTINATION_CANDIDATES = BOARD_NODES.filter(n => n.type === 'capital').map(n => n.id);

/** 今年の舞台（cityQuests.ts の stageOf）: rate の確率で、この地方の県庁から目的地を選ぶ */
export interface DestinationStage {
  regions: readonly Region[];
  rate: number;
}

/**
 * 次の目的地を選ぶ。賞金は前の地点からの距離に比例。
 * stage を渡すと、rate の確率で舞台の地方の県庁から選ぶ（舞台に候補が無ければ全国から）。
 * stage を省いたときは今までと同じ結果で、乱数も1回だけ（渡すと2回）。
 */
export function pickDestination(current: string | null, from: string, turn = 1, stage?: DestinationStage): { nodeId: string; reward: number } {
  const dist = distancesFrom(from);
  const pool = DESTINATION_CANDIDATES.filter(id => id !== current && id !== from && (dist.get(id) ?? 0) >= 6);
  let list = pool.length ? pool : DESTINATION_CANDIDATES.filter(id => id !== current);
  if (stage && stage.regions.length && random() < stage.rate) {
    const inStage = list.filter(id => stage.regions.includes(NODE_MAP.get(id)!.region));
    if (inStage.length) list = inStage;
  }
  const nodeId = list[Math.floor(random() * list.length)];
  const d = dist.get(nodeId) ?? 10;
  // 賞金は物価に合わせて年ごとに上がる（町の収入が年に2〜3倍に伸びても、目的地レースが同じ重さを保つ）
  return { nodeId, reward: Math.round(((2000 + d * 220) * priceScale(turn)) / 100) * 100 };
}

/**
 * 町に特需を起こす（目的地に一番乗りされた町は既定の月数。大物で町おこしは months を渡す）。
 * すでに特需の町は、残りの月数が長い方を残す（短い特需で長い特需を縮めない）。
 */
export function startBoom(state: CityState, nodeId: string, months: number = CITY_ECONOMY.destinationBoomMonths): CityState {
  const left = (state.booms ?? []).find(b => b.nodeId === nodeId)?.monthsLeft ?? 0;
  const booms = (state.booms ?? []).filter(b => b.nodeId !== nodeId);
  return { ...state, booms: [...booms, { nodeId, monthsLeft: Math.max(left, months) }] };
}

/**
 * 客としての買い物代: 他人の商業地・観光名所がある町に止まると払う。独占された町は倍。所持金の一定割合まで。
 * 自分の建物のぶんは払わない。空き家は営業していないので払わない。
 * turn を渡すと単価に物価（priceScale）が掛かる（所持金の割合の上限はそのまま）。
 */
export function visitorFees(state: CityState, nodeId: string, visitorIndex: number, visitorMoney: number, turn = 1): { payments: { owner: number; amount: number }[]; total: number } {
  const town = state.towns[nodeId];
  if (!town) return { payments: [], total: 0 };
  const E = CITY_ECONOMY;
  const lv = effectiveLandValue(nodeId, town);
  const mono = monopolyOwner(town);
  const scale = priceScale(turn);
  const byOwner = new Map<number, number>();
  for (const p of town.plots) {
    if (!p || p.owner === visitorIndex || p.vacant) continue;
    let fee = (p.kind === 'com' ? p.level * E.visitorComFee * lv : p.kind === 'tourism' ? p.level * E.visitorTourismFee : 0) * scale;
    if (fee <= 0) continue;
    if (mono === p.owner) fee *= E.visitorMonopolyMul;
    byOwner.set(p.owner, (byOwner.get(p.owner) ?? 0) + fee);
  }
  let total = [...byOwner.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return { payments: [], total: 0 };
  const cap = Math.floor(visitorMoney * E.visitorMaxRate);
  const shrink = total > cap ? cap / total : 1;
  const payments = [...byOwner.entries()].map(([owner, amt]) => ({ owner, amount: Math.round((amt * shrink) / 10) * 10 })).filter(x => x.amount > 0);
  total = payments.reduce((a, b) => a + b.amount, 0);
  return { payments, total };
}

// ===== まちのイベントカード =====

export type CityEventEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'money_per_building'; amount: number }
  | { kind: 'buff'; buff: 'boom' | 'recession'; rounds: number }
  | { kind: 'disaster'; disaster: DisasterKind }
  | { kind: 'free_build'; building: BuildingKind }
  | { kind: 'growth'; chance: number };

export interface CityEventCard {
  id: string;
  name: string;
  type: 'good' | 'bad' | 'random';
  description: string;
  effect: CityEventEffect;
}

export const CITY_EVENT_CARDS: CityEventCard[] = [
  // 良い
  { id: 'c_subsidy', name: '国からの補助金', type: 'good', description: '地方創生の補助金が下りた！建物1つにつき¥500。', effect: { kind: 'money_per_building', amount: 500 } },
  { id: 'c_boom', name: '好景気', type: 'good', description: '町に活気があふれる！2か月の間、収入1.5倍。', effect: { kind: 'buff', buff: 'boom', rounds: 2 } },
  { id: 'c_migration', name: '移住ブーム', type: 'good', description: 'テレビで紹介され、あなたの町へ移住者が殺到！建物が発展するかも。', effect: { kind: 'growth', chance: 0.5 } },
  { id: 'c_free_house', name: '空き家バンク', type: 'good', description: 'この町の空き家を無償で譲り受けた！空き区画に住宅地が建つ。', effect: { kind: 'free_build', building: 'res' } },
  { id: 'c_free_park', name: '篤志家の寄付', type: 'good', description: '地元の名士が公園を寄付してくれた！空き区画に公園が建つ。', effect: { kind: 'free_build', building: 'park' } },
  { id: 'c_expo', name: '博覧会の誘致', type: 'good', description: '博覧会の誘致に成功！¥6,000の協賛金。', effect: { kind: 'money', amount: 6000 } },
  { id: 'c_furusato', name: 'ふるさと納税', type: 'good', description: '返礼品が大人気！¥3,000の寄付が集まった。', effect: { kind: 'money', amount: 3000 } },
  // 悪い
  { id: 'c_quake', name: '大鯰が暴れた', type: 'bad', description: '地下の大鯰が身をよじり、大地震が発生！ある地方の建物が損壊する。', effect: { kind: 'disaster', disaster: 'quake' } },
  { id: 'c_typhoon', name: '大型台風', type: 'bad', description: '大型台風が上陸！港町と都市に被害が出る。', effect: { kind: 'disaster', disaster: 'typhoon' } },
  { id: 'c_fire', name: '火の用心', type: 'bad', description: 'あなたの建物の1つで火事が起きた…！', effect: { kind: 'disaster', disaster: 'fire' } },
  { id: 'c_kaiju', name: '大王イカ上陸', type: 'bad', description: '巨大な大王イカが港に上陸し、町を踏み荒らしながら進む！', effect: { kind: 'disaster', disaster: 'kaiju' } },
  { id: 'c_recession', name: '不景気', type: 'bad', description: '景気が冷え込んだ…2か月の間、収入が半分に。', effect: { kind: 'buff', buff: 'recession', rounds: 2 } },
  { id: 'c_tax', name: '固定資産税', type: 'bad', description: '固定資産税の納付書が届いた。建物1つにつき¥400を支払う。', effect: { kind: 'money_per_building', amount: -400 } },
  // どちらでも
  { id: 'c_lottery', name: '年末ジャンボ', type: 'random', description: '宝くじが当たった…かも？', effect: { kind: 'money', amount: 2000 } },
  { id: 'c_election', name: '町長選挙', type: 'random', description: '選挙戦で町が盛り上がる。選挙費用¥1,500。', effect: { kind: 'money', amount: -1500 } },
];

export function drawCityEvent(type?: 'good' | 'bad' | 'random'): CityEventCard {
  const pool = type ? CITY_EVENT_CARDS.filter(c => c.type === type) : CITY_EVENT_CARDS;
  return pool[Math.floor(random() * pool.length)];
}

export interface CityEventOutcome {
  state: CityState;
  moneyDelta: number;
  message: string;
  disaster?: CityDisasterReport;
}

/** まちイベントの効果を適用する（お金の増減はストア側で player.money に反映） */
export function applyCityEvent(state: CityState, card: CityEventCard, playerIndex: number, nodeId: string, turn: number): CityEventOutcome {
  const e = card.effect;
  switch (e.kind) {
    case 'money':
      return { state, moneyDelta: e.amount, message: e.amount >= 0 ? `¥${e.amount.toLocaleString()} を得た` : `¥${(-e.amount).toLocaleString()} を支払った` };
    case 'money_per_building': {
      const n = playerBuildingCount(state, playerIndex);
      const amt = e.amount * n;
      return { state, moneyDelta: amt, message: n === 0 ? '建物がないので関係なかった' : `建物${n}つ分で ${amt >= 0 ? '+' : '−'}¥${Math.abs(amt).toLocaleString()}` };
    }
    case 'buff':
      return {
        state: { ...state, buffs: [...state.buffs, { playerIndex, kind: e.buff, roundsLeft: e.rounds }] },
        moneyDelta: 0,
        message: e.buff === 'boom' ? `${e.rounds}か月間、収入1.5倍！` : `${e.rounds}か月間、収入が半分…`,
      };
    case 'disaster': {
      const node = NODE_MAP.get(nodeId);
      const r = applyDisaster(state, e.disaster, {
        region: e.disaster === 'fire' ? undefined : node?.region,
        targetPlayer: e.disaster === 'fire' ? playerIndex : undefined,
      });
      const n = r.report.damages.length;
      return { state: r.state, moneyDelta: 0, message: n === 0 ? `${r.report.area}で発生したが、被害はなかった` : `${r.report.area}で${n}件の被害`, disaster: r.report };
    }
    case 'free_build': {
      const town = state.towns[nodeId];
      const idx = town ? town.plots.findIndex(p => !p) : -1;
      if (!town || idx < 0) {
        return { state, moneyDelta: 1500, message: '空き区画がなかったので、代わりに¥1,500を受け取った' };
      }
      const plots = [...town.plots];
      plots[idx] = { kind: e.building, level: 1, owner: playerIndex, builtTurn: turn };
      return { state: withTown(state, nodeId, plots), moneyDelta: 0, message: `${getTownInfo(nodeId)?.name}に${BUILDING_INFO[e.building].name}が建った！` };
    }
    case 'growth': {
      let grown = 0;
      const towns = { ...state.towns };
      for (const [id, t] of Object.entries(towns)) {
        let changed = false;
        const plots = t.plots.map(p => {
          if (p && p.owner === playerIndex && isUpgradable(p.kind) && p.level < MAX_BUILDING_LEVEL && random() < e.chance) {
            changed = true;
            grown++;
            return { ...p, level: p.level + 1 };
          }
          return p;
        });
        if (changed) towns[id] = { ...t, plots };
      }
      return { state: { ...state, towns }, moneyDelta: 0, message: grown ? `建物が${grown}つ発展した！` : '発展できる建物がなかった…' };
    }
  }
}

// ===== 最終成績 =====

export interface CityScore {
  money: number;
  property: number;
  assets: number;
  population: number;
  buildings: number;
  monopolies: number;
}

export function cityScore(state: CityState, playerIndex: number, money: number): CityScore {
  const property = playerPropertyValue(state, playerIndex) + playerSpecialtyValue(state.specialties, playerIndex) + playerRailValue(state.rails, playerIndex);
  let monopolies = 0;
  for (const t of Object.values(state.towns)) if (monopolyOwner(t) === playerIndex) monopolies++;
  return {
    money,
    property,
    assets: money + property,
    population: playerPopulation(state, playerIndex),
    buildings: playerBuildingCount(state, playerIndex),
    monopolies,
  };
}

/** 釣りで漁港の町に落ちるお金（漁港の持ち主へ。市場が払うので釣り人は損しない） */
export function portFee(state: CityState, nodeId: string, sellPrice: number): { owner: number; fee: number } | null {
  const port = state.towns[nodeId]?.plots.find(p => p?.kind === 'port');
  if (!port) return null;
  return { owner: port.owner, fee: Math.round(sellPrice * CITY_ECONOMY.portFeeRate) };
}
