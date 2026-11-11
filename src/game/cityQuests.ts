// まちづくり: お題（1年ごとの短い目標）と今年の舞台。React / ストアに依存しない純粋関数。
//
// 仕組みの要点:
//  - 4月（1・13・25・37巡目）に、全員共通のお題を3つ引く（建てる・駆け引き・くらしの組から1つずつ）。
//    誰でも達成でき、賞金は1つ QUEST_ECONOMY.prize × 物価（priceScale）。最初に達成した人は firstMul 倍。
//  - お題には「今年ぶんを数えるもの」（建てた数・工事した地方・一番乗り・釣った種類。tally に数える）と、
//    「今の持ち物を数えるもの」（等級3・発展度・名産・独占・町長・線路・幸福な町）がある。
//  - 今年の舞台: 4月に隣り合う2つの地方を引く。その年の目的地は stageRate の確率で舞台の地方から選ぶ
//    （city.ts の pickDestination に stageOf(...) を渡す）。駒が同じ地方に集まり、取り合いが増える。
//
// ストア（store/game/questHooks.ts・monthEnd.ts）も、対戦シミュレーション（balance.city.sim.test.ts）も、
// ここの関数を呼ぶだけで進み具合・達成の判定・賞金が決まる:
//    数える   tallyWork（工事）/ tallyFirst（目的地の一番乗り）/ tallyFish（釣果）
//    判定する settleQuests（その場でも月末でも同じ関数。届いた人を done に足して賞金の一覧を返す）
//    引く     createQuestCityState（新しい対局）/ openQuestYear（4月の引き直し）
import type { CaughtFish, Region } from './types';
import type { CityState, DestinationStage, TownStats } from './city';
import { computeAllStats, createInitialCityState, monopolyOwner, priceScale, CITY_START_NODE, MAX_BUILDING_LEVEL } from './city';
import { mayorOf } from './mayor';
import { railCount } from './railways';
import { playerSpecialtyCount } from './citySpecialties';
import { NODE_MAP } from '../data/boardNodes';
import { BOARD_EDGES } from '../data/boardEdges';
import { random } from '../utils/random';

// ===== 型 =====

export type QuestGroup = 'build' | 'rival' | 'life';

export type QuestId =
  | 'build_count' | 'build_regions' | 'level3' | 'tier_sum'
  | 'dest_first' | 'specialty' | 'monopoly' | 'mayor' | 'rail'
  | 'fish_species' | 'happy_towns';

export interface QuestItem {
  id: QuestId;
  /** 達成に要る数 */
  need: number;
  /** 達成した順のプレイヤー（同じ判定で届いた人は席の順） */
  done: number[];
  /** 最初の達成の人数（done の先頭から。同じ判定で何人か届いたときは2以上） */
  firstCount?: number;
}

/** 今年ぶんの数（プレイヤーごと）。4月に空に戻る */
export interface QuestTally {
  /** 今年建てた建物の数（新築と誘致。再開発・買収は数えない） */
  built: number;
  /** 今年工事をした地方 */
  regions: Region[];
  /** 今年、目的地に一番乗りした回数 */
  firsts: number;
  /** 今年釣った魚の種類（祭りの名物釣り・出来事でもらった魚は入れない） */
  species: string[];
}

/** 達成1件（賞金つき） */
export interface QuestAward {
  playerIndex: number;
  id: QuestId;
  need: number;
  prize: number;
  /** 最初に達成した（賞金 firstMul 倍） */
  first: boolean;
}

export interface QuestState {
  /** 年度（1年目 = 1〜12巡目） */
  year: number;
  /** 今年の舞台（隣り合う2つの地方。北から） */
  stage: Region[];
  items: QuestItem[];
  tally: QuestTally[];
  /** 手番の中で人が達成したときの演出用（通し番号が変わったら「達成」の判子を出す） */
  last?: { seq: number; awards: QuestAward[] };
}

export interface QuestDef {
  id: QuestId;
  group: QuestGroup;
  /** 1年目・2年目・3年目・4年目の数（難易度調整係が balance.city.sim.test.ts で測って決める。達成率の狙いは1つあたり4〜6割） */
  need: readonly [number, number, number, number];
  /** 引ける最初の年度（町長と鉄道は2年目から） */
  fromYear: number;
  /** true: 今年ぶんを数える（tally） / false: 今の持ち物を数える */
  yearly: boolean;
  /** 札に出す短い名前 */
  short: string;
  /** 判子の一文字 */
  glyph: string;
  label: (n: number) => string;
}

// ===== 定数 =====

/** お題の調整値（賞金と舞台）。数（need）は QUEST_DEFS */
export const QUEST_ECONOMY = {
  /** 賞金の基本額。物価（priceScale）を掛ける: 1年目 ¥3,000・2年目 ¥6,000・3年目 ¥12,000 */
  prize: 3000,
  /** 最初に達成した人の賞金の倍率 */
  firstMul: 1.5,
  /** 目的地を舞台の地方から選ぶ確率 */
  stageRate: 0.7,
  /** 「幸福な町」に数える幸福度 */
  happyLevel: 7,
};

export const QUEST_GROUPS: QuestGroup[] = ['build', 'rival', 'life'];

export const QUEST_GROUP_LABEL: Record<QuestGroup, string> = {
  build: '建てる',
  rival: '駆け引き',
  life: 'くらし',
};

export const QUEST_DEFS: QuestDef[] = [
  { id: 'build_count', group: 'build', need: [5, 8, 10, 12], fromYear: 1, yearly: true, short: '建設', glyph: '建', label: n => `今年、建物を${n}軒建てる` },
  { id: 'build_regions', group: 'build', need: [3, 4, 5, 5], fromYear: 1, yearly: true, short: '地方めぐり', glyph: '巡', label: n => `今年、${n}つの地方で工事をする` },
  { id: 'level3', group: 'build', need: [1, 3, 6, 10], fromYear: 1, yearly: false, short: '等級3', glyph: '参', label: n => `等級3の建物を${n}軒持つ` },
  { id: 'tier_sum', group: 'build', need: [1, 4, 8, 12], fromYear: 1, yearly: false, short: '発展度', glyph: '展', label: n => `建物のある町の発展度を合わせて${n}にする` },
  { id: 'dest_first', group: 'rival', need: [1, 2, 2, 3], fromYear: 1, yearly: true, short: '一番乗り', glyph: '旗', label: n => `今年、目的地に${n}回一番乗りする` },
  { id: 'specialty', group: 'rival', need: [1, 2, 3, 4], fromYear: 1, yearly: false, short: '名産', glyph: '産', label: n => `名産を${n}つ持つ` },
  { id: 'monopoly', group: 'rival', need: [1, 2, 3, 4], fromYear: 1, yearly: false, short: '独占', glyph: '独', label: n => `町を${n}つ独占する` },
  { id: 'mayor', group: 'rival', need: [1, 2, 4, 6], fromYear: 2, yearly: false, short: '町長', glyph: '長', label: n => `${n}つの町で町長をつとめる` },
  { id: 'rail', group: 'rival', need: [1, 3, 5, 8], fromYear: 2, yearly: false, short: '線路', glyph: '鉄', label: n => `線路を${n}区間持つ` },
  { id: 'fish_species', group: 'life', need: [3, 5, 6, 8], fromYear: 1, yearly: true, short: '釣り', glyph: '魚', label: n => `今年、魚を${n}種類釣る` },
  { id: 'happy_towns', group: 'life', need: [1, 2, 4, 6], fromYear: 1, yearly: false, short: '幸福な町', glyph: '福', label: n => `建物のある町のうち${n}つを幸福度${QUEST_ECONOMY.happyLevel}以上にする` },
];

const DEF_BY_ID = new Map<QuestId, QuestDef>(QUEST_DEFS.map(d => [d.id, d]));

export function questDef(id: QuestId): QuestDef {
  return DEF_BY_ID.get(id)!;
}

/** お題の文（「今年、建物を5軒建てる」） */
export function questLabel(item: Pick<QuestItem, 'id' | 'need'>): string {
  return questDef(item.id).label(item.need);
}

// ===== 年度・賞金 =====

/** その巡の年度（1〜12巡目 = 1年目） */
export function questYearOf(turn: number): number {
  return Math.floor((turn - 1) / 12) + 1;
}

/** お題を引く巡目か（4月 = 1・13・25・37巡目） */
export function isQuestDrawTurn(turn: number): boolean {
  return turn >= 1 && (turn - 1) % 12 === 0;
}

/** お題1つの賞金（その年度の物価を掛ける。最初に達成した人は firstMul 倍） */
export function questPrize(year: number, first: boolean): number {
  const scale = priceScale((Math.max(1, year) - 1) * 12 + 1);
  return Math.round(QUEST_ECONOMY.prize * scale * (first ? QUEST_ECONOMY.firstMul : 1));
}

// ===== 今年の舞台 =====

const REGION_ORDER: Region[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];

export const QUEST_REGION_NAME: Record<Region, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州',
};

/** 盤の上で隣り合う地方の組（道でつながっている地方どうし。北から順） */
export const STAGE_PAIRS: [Region, Region][] = (() => {
  const seen = new Set<string>();
  const out: [Region, Region][] = [];
  for (const e of BOARD_EDGES) {
    const a = NODE_MAP.get(e.from)?.region;
    const b = NODE_MAP.get(e.to)?.region;
    if (!a || !b || a === b) continue;
    const pair = [a, b].sort((x, y) => REGION_ORDER.indexOf(x) - REGION_ORDER.indexOf(y)) as [Region, Region];
    const key = pair.join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  return out.sort((p, q) => REGION_ORDER.indexOf(p[0]) - REGION_ORDER.indexOf(q[0]) || REGION_ORDER.indexOf(p[1]) - REGION_ORDER.indexOf(q[1]));
})();

/** 舞台の名前（「関東・中部」） */
export function stageLabel(stage: readonly Region[]): string {
  return stage.map(r => QUEST_REGION_NAME[r]).join('・');
}

/**
 * 今年の舞台を引く（乱数1回）。
 * - near を渡すと、その地方を含む組から引く（1年目は出発地の地方。遠い舞台まで何か月も歩かせない）。
 * - prev（去年の舞台）と重ならない組から引く。無ければ去年と同じ組だけ外す。
 */
export function drawStage(prev?: readonly Region[], near?: Region): Region[] {
  let pool = STAGE_PAIRS;
  if (near) {
    const around = pool.filter(p => p.includes(near));
    if (around.length) pool = around;
  }
  if (prev?.length) {
    const fresh = pool.filter(p => !p.some(r => prev.includes(r)));
    const other = pool.filter(p => !(p[0] === prev[0] && p[1] === prev[1]));
    pool = fresh.length ? fresh : other.length ? other : pool;
  }
  return [...pool[Math.floor(random() * pool.length)]];
}

/** pickDestination に渡す舞台（お題が無ければ undefined = 今までどおり全国から） */
export function stageOf(quests: QuestState | undefined): DestinationStage | undefined {
  return quests?.stage.length ? { regions: quests.stage, rate: QUEST_ECONOMY.stageRate } : undefined;
}

/** そのマスが今年の舞台の地方にあるか */
export function isStageNode(quests: QuestState | undefined, nodeId: string): boolean {
  const region = NODE_MAP.get(nodeId)?.region;
  return !!region && !!quests?.stage.includes(region);
}

// ===== 進み具合 =====

function emptyTally(): QuestTally {
  return { built: 0, regions: [], firsts: 0, species: [] };
}

function tallyOf(quests: QuestState | undefined, playerIndex: number): QuestTally {
  return quests?.tally[playerIndex] ?? emptyTally();
}

/**
 * お題の進み具合（その人の今の数）。
 * 「幸福な町」だけ町の状態（computeAllStats）が要る。何度も呼ぶときは stats を渡すと速い。
 */
export function questProgress(city: CityState, id: QuestId, playerIndex: number, stats?: Map<string, TownStats>): number {
  const t = tallyOf(city.quests, playerIndex);
  switch (id) {
    case 'build_count': return t.built;
    case 'build_regions': return t.regions.length;
    case 'dest_first': return t.firsts;
    case 'fish_species': return t.species.length;
    case 'specialty': return playerSpecialtyCount(city.specialties, playerIndex);
    case 'rail': return railCount(city.rails, playerIndex);
    case 'level3': {
      let n = 0;
      for (const town of Object.values(city.towns)) for (const p of town.plots) if (p && p.owner === playerIndex && p.level >= MAX_BUILDING_LEVEL) n++;
      return n;
    }
    case 'tier_sum': {
      let n = 0;
      for (const town of Object.values(city.towns)) if (town.plots.some(p => p?.owner === playerIndex)) n += town.tier ?? 0;
      return n;
    }
    case 'monopoly': {
      let n = 0;
      for (const town of Object.values(city.towns)) if (monopolyOwner(town) === playerIndex) n++;
      return n;
    }
    case 'mayor': {
      let n = 0;
      for (const town of Object.values(city.towns)) if (mayorOf(town) === playerIndex) n++;
      return n;
    }
    case 'happy_towns': {
      const s = stats ?? computeAllStats(city);
      let n = 0;
      for (const [nodeId, town] of Object.entries(city.towns)) {
        if (town.plots.some(p => p?.owner === playerIndex) && (s.get(nodeId)?.happiness ?? 0) >= QUEST_ECONOMY.happyLevel) n++;
      }
      return n;
    }
  }
}

/** お題の一覧に出す1行（全員の進み具合と賞金） */
export interface QuestRow {
  item: QuestItem;
  def: QuestDef;
  label: string;
  /** プレイヤーごとの今の数（達成した人は need 以上に見せる） */
  progress: number[];
  /** これから達成する人がもらう賞金 */
  prize: number;
  /** まだ誰も達成していない（次に達成した人が firstMul 倍） */
  open: boolean;
  /** 最初に達成した人（同じ判定で届いた人は全員） */
  firstBy: number[];
}

export function questRows(city: CityState, playerCount: number): QuestRow[] {
  const q = city.quests;
  if (!q) return [];
  const stats = q.items.some(i => i.id === 'happy_towns') ? computeAllStats(city) : undefined;
  return q.items.map(item => {
    const open = item.done.length === 0;
    return {
      item,
      def: questDef(item.id),
      label: questLabel(item),
      // 達成した後で持ち物が減っても（独占が崩れた等）、達成は取り消さない
      progress: Array.from({ length: playerCount }, (_, p) => (item.done.includes(p) ? Math.max(item.need, questProgress(city, item.id, p, stats)) : questProgress(city, item.id, p, stats))),
      prize: questPrize(q.year, open),
      open,
      firstBy: item.done.slice(0, item.firstCount ?? 1),
    };
  });
}

/**
 * 上の帯の札に、誰の進み具合を出すか。人が1人だけならその人（CPU の手番でも自分の数が見える）、
 * 何人かで遊ぶとき・CPU だけのときは手番の人。
 */
export function questViewer(isCpu: readonly boolean[], currentPlayerIndex: number): number {
  const humans = isCpu.map((cpu, i) => (cpu ? -1 : i)).filter(i => i >= 0);
  return humans.length === 1 ? humans[0] : currentPlayerIndex;
}

/** その人が達成したお題の数 */
export function questDoneCount(quests: QuestState | undefined, playerIndex: number): number {
  return quests ? quests.items.filter(i => i.done.includes(playerIndex)).length : 0;
}

// ===== 数える（今年ぶん） =====

function withTally(city: CityState, playerIndex: number, fn: (t: QuestTally) => QuestTally): CityState {
  const q = city.quests;
  if (!q || playerIndex < 0) return city;
  const cur = tallyOf(q, playerIndex);
  const next = fn(cur);
  if (next === cur) return city;
  const tally = Array.from({ length: Math.max(q.tally.length, playerIndex + 1) }, (_, i) => q.tally[i] ?? emptyTally());
  tally[playerIndex] = next;
  return { ...city, quests: { ...q, tally } };
}

/**
 * 工事を1回した（建設・再開発・買収・修理・名産・条例・線路）。工事をした地方を記録する。
 * built = true なら建てた数にも数える（新築と、誘致カードの建設）。
 */
export function tallyWork(city: CityState, playerIndex: number, nodeId: string, built = false): CityState {
  const region = NODE_MAP.get(nodeId)?.region;
  return withTally(city, playerIndex, t => {
    const newRegion = !!region && !t.regions.includes(region);
    if (!built && !newRegion) return t;
    return { ...t, built: t.built + (built ? 1 : 0), regions: newRegion ? [...t.regions, region] : t.regions };
  });
}

/** 目的地に一番乗りした */
export function tallyFirst(city: CityState, playerIndex: number): CityState {
  return withTally(city, playerIndex, t => ({ ...t, firsts: t.firsts + 1 }));
}

/** お題に数える釣果か（釣って取った魚だけ。祭りの名物釣り・出来事でもらった魚は入れない） */
export function isQuestCatch(c: Pick<CaughtFish, 'via'>): boolean {
  return !c.via || c.via === 'tairyou';
}

/** 魚を釣った（種類を記録する。同じ種類は1つ） */
export function tallyFish(city: CityState, playerIndex: number, caught: readonly Pick<CaughtFish, 'fishId' | 'via'>[]): CityState {
  return withTally(city, playerIndex, t => {
    const add = [...new Set(caught.filter(isQuestCatch).map(c => c.fishId))].filter(id => !t.species.includes(id));
    return add.length ? { ...t, species: [...t.species, ...add] } : t;
  });
}

// ===== 達成の判定 =====

/**
 * 達成の判定。まだ達成していない人のうち、数に届いた人を done に足し、賞金の一覧を返す（お金は呼ぶ側が足す）。
 * 手番の中（工事・一番乗り・釣果の直後）でも月末でも同じ関数を呼ぶ。届いた人がいなければ city はそのまま返す。
 * 同じ判定で何人か届いたとき、まだ誰も達成していなければ全員が「最初」（賞金 firstMul 倍）。
 */
export function settleQuests(city: CityState, playerCount: number): { city: CityState; awards: QuestAward[] } {
  const q = city.quests;
  if (!q) return { city, awards: [] };
  let stats: Map<string, TownStats> | undefined;
  const awards: QuestAward[] = [];
  const items = q.items.map(item => {
    if (item.done.length >= playerCount) return item;
    if (item.id === 'happy_towns') stats ??= computeAllStats(city);
    const reached: number[] = [];
    for (let p = 0; p < playerCount; p++) {
      if (!item.done.includes(p) && questProgress(city, item.id, p, stats) >= item.need) reached.push(p);
    }
    if (!reached.length) return item;
    const first = item.done.length === 0;
    for (const p of reached) awards.push({ playerIndex: p, id: item.id, need: item.need, first, prize: questPrize(q.year, first) });
    return { ...item, done: [...item.done, ...reached], ...(first ? { firstCount: reached.length } : {}) };
  });
  if (!awards.length) return { city, awards };
  return { city: { ...city, quests: { ...q, items } }, awards };
}

/**
 * 開発用（DevPanel の「お題を1つ達成」）: その人がまだ達成していないお題を1つ、数に関係なく達成にする。
 * お題が無い・全部達成しているなら null。
 */
export function forceQuestDone(city: CityState, playerIndex: number): { city: CityState; award: QuestAward } | null {
  const q = city.quests;
  const item = q?.items.find(i => !i.done.includes(playerIndex));
  if (!q || !item) return null;
  const first = item.done.length === 0;
  const award: QuestAward = { playerIndex, id: item.id, need: item.need, first, prize: questPrize(q.year, first) };
  const items = q.items.map(i => (i === item ? { ...i, done: [...i.done, playerIndex], ...(first ? { firstCount: 1 } : {}) } : i));
  return { city: { ...city, quests: { ...q, items } }, award };
}

/** お知らせ・決算の見出しに出す文（「「今年、建物を5軒建てる」賞金 ¥4,500（一番乗りで1.5倍）」） */
export function questAwardText(a: QuestAward): string {
  return `「${questLabel(a)}」賞金 ¥${a.prize.toLocaleString()}${a.first ? `（最初の達成で${QUEST_ECONOMY.firstMul}倍）` : ''}`;
}

// ===== 引く =====

/**
 * お題を3つ引く（組ごとに1つ。乱数は組ごとに1回）。
 * - その年度に引けるものだけ（町長と鉄道は2年目から）。
 * - 去年と同じお題は続けて引かない（ほかに候補があるとき）。
 * - 今の持ち物でもう届いている人がいるお題は外す（引いたとたんに達成、を避ける）。
 *   どれも届いていたら、いちばん多い人より1つ多い数にする。
 */
export function drawQuests(city: CityState, playerCount: number, year: number, prevIds: readonly QuestId[] = []): QuestItem[] {
  const yi = Math.min(3, Math.max(0, year - 1));
  // 今年ぶんの数は 0 から数え直すので、持ち物だけを見る
  const base: CityState = { ...city, quests: undefined };
  let stats: Map<string, TownStats> | undefined;
  const best = (def: QuestDef): number => {
    if (def.yearly) return 0;
    if (def.id === 'happy_towns') stats ??= computeAllStats(base);
    let m = 0;
    for (let p = 0; p < playerCount; p++) m = Math.max(m, questProgress(base, def.id, p, stats));
    return m;
  };
  return QUEST_GROUPS.map(group => {
    const all = QUEST_DEFS.filter(d => d.group === group && d.fromYear <= year);
    const fresh = all.filter(d => !prevIds.includes(d.id));
    const cands = fresh.length ? fresh : all;
    const open = cands.filter(d => best(d) < d.need[yi]);
    const pool = open.length ? open : cands;
    const def = pool[Math.floor(random() * pool.length)];
    return { id: def.id, need: Math.max(def.need[yi], best(def) + 1), done: [] };
  });
}

/**
 * 新しい年度のお題と舞台を引いて city に入れる（乱数は舞台1回 + お題3回）。
 * 4月の引き直しと、お題の無い古いセーブの「次の4月」に呼ぶ。今年ぶんの数は空に戻る。
 * stage を渡すとその舞台を使う（新しい対局で、先に舞台を引いて最初の目的地を決めるとき）。
 */
export function openQuestYear(city: CityState, year: number, playerCount: number, stage?: Region[]): CityState {
  const prev = city.quests;
  const theStage = stage ?? drawStage(prev?.stage, year <= 1 ? NODE_MAP.get(CITY_START_NODE)?.region : undefined);
  const items = drawQuests(city, playerCount, year, prev?.items.map(i => i.id));
  return {
    ...city,
    quests: { year, stage: theStage, items, tally: Array.from({ length: playerCount }, emptyTally), last: prev?.last ? { seq: prev.last.seq, awards: [] } : undefined },
  };
}

/**
 * 新しい対局の町の状態（1年目のお題と舞台つき）。最初の目的地も舞台に寄せる。
 * 乱数の順: 舞台 → 最初の目的地（舞台に寄せるかの1回 + 選ぶ1回）→ お題3つ。
 */
export function createQuestCityState(playerCount: number): CityState {
  const stage = drawStage(undefined, NODE_MAP.get(CITY_START_NODE)?.region);
  const base = createInitialCityState({ regions: stage, rate: QUEST_ECONOMY.stageRate });
  return openQuestYear(base, 1, playerCount, stage);
}
