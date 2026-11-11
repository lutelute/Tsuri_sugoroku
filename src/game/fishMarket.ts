// 魚市場（まちづくりのときだけ）: 釣りをまちづくりにつなぐ純粋関数。
//   売値 = 基本の売値（FISH_SELL_PRICE × 大きさ）× 賑わい × 漁場 × 物価
//     賑わい: 商業の等級の合計・漁港・発展度で上がる（fishMarketMul。1.0〜2.7）
//     漁場  : 公害で荒れ、幸福度が高いと豊かな海になる（fisheryOf。売値の倍率と selectFish への補正）
//     物価  : 年度ごとの倍率（city.ts の priceScale）
//   大物（レア以上）を釣ると、その町に boomMonths か月の特需（町おこし）
//   7月は釣り大会: 7月に釣った魚の売値の合計が1位の人に賞金（recordDerby で数え、月末に settleDerby で精算）
//   CPU も、釣り場の町で工事を終えたら cpuCastsPerVisit 回まで釣る（cpuTownCasts）
// 数値は FISH_MARKET にまとめてある。まちづくりのシミュレーション（balance.city.sim.test.ts）へ写すのは難易度調整係。
import type { Fish, FishRarity, NodeType, PlayerEquipment } from './types';
import type { CityState, TownStats } from './city';
import { computeAllStats, priceScale, calendarLabel } from './city';
import { FISH_SELL_PRICE, BOAT_FISHING_COST } from './constants';
import { NODE_MAP } from '../data/boardNodes';
import type { FishSelectOpts } from './fishing';
import { RARITY_RANK, fishOdds, expectedSellPrice } from './fishing';
import { getEquippedItem } from './equipment';

export const FISH_MARKET = {
  /** 賑わい: 商業の等級1つにつき（空き家は数えない） */
  comPerLevel: 0.15,
  /** 賑わい: 数える商業の等級の合計の上限 */
  comLevelCap: 6,
  /** 賑わい: 漁港がある */
  portBonus: 0.5,
  /** 賑わい: 発展度1つにつき */
  tierBonus: 0.1,
  /** 漁場: この公害から「荒れ」（売値 roughPriceMul 倍） */
  roughPollution: 3,
  roughPriceMul: 0.6,
  /** 漁場: この公害から「ひどく荒れ」（コモンしか出ず、売値 ruinedPriceMul 倍） */
  ruinedPollution: 6,
  ruinedPriceMul: 0.3,
  /** 漁場: この幸福度から「豊か」（レア以上の重み richRareMul 倍）。荒れているときは豊かにならない */
  richHappiness: 7,
  richRareMul: 1.5,
  /** 町おこし: このレア度以上を釣ると、その町に boomMonths か月の特需 */
  boomMinRarity: 'rare' as FishRarity,
  boomMonths: 3,
  /** 釣り大会の月と賞金（賞金は物価を掛ける） */
  derbyMonth: 7,
  derbyPrize: 3000,
  /** CPU が釣り場の町で1訪問に釣る回数 */
  cpuCastsPerVisit: 2,
};

/** 釣り場のマスか（まちづくりでは港町） */
export function isFishingSpot(nodeId: string): boolean {
  const t = NODE_MAP.get(nodeId)?.type;
  return t === 'fishing' || t === 'fishing_special';
}

/** 賑わい: 魚の売値に掛ける町の倍率（1.0〜2.7）。商業の等級の合計・漁港・発展度で上がる */
export function fishMarketMul(state: CityState, nodeId: string): number {
  const town = state.towns[nodeId];
  if (!town) return 1;
  const M = FISH_MARKET;
  let com = 0;
  let port = false;
  for (const p of town.plots) {
    if (!p || p.vacant) continue;
    if (p.kind === 'com') com += p.level;
    if (p.kind === 'port') port = true;
  }
  const mul = 1 + M.comPerLevel * Math.min(M.comLevelCap, com) + (port ? M.portBonus : 0) + M.tierBonus * (town.tier ?? 0);
  return Math.round(mul * 100) / 100;
}

export type FisheryLevel = 'rich' | 'normal' | 'rough' | 'ruined';

export interface Fishery {
  level: FisheryLevel;
  /** 豊か・ふつう・荒れ・ひどく荒れ */
  label: string;
  /** 売値に掛ける倍率 */
  priceMul: number;
  /** selectFish への補正（ふつうは無し） */
  select?: FishSelectOpts;
  /** なぜそうなっているか（帯の下に出す1行） */
  note: string;
}

/** 漁場の状態。公害で荒れ（3以上）・ひどく荒れ（6以上）、幸福度7以上で豊かな海。町でなければ「ふつう」 */
export function fisheryOf(state: CityState, nodeId: string, stats: TownStats | undefined = computeAllStats(state).get(nodeId)): Fishery {
  const M = FISH_MARKET;
  if (!stats) return { level: 'normal', label: 'ふつう', priceMul: 1, note: '' };
  if (stats.pollution >= M.ruinedPollution) {
    return { level: 'ruined', label: 'ひどく荒れ', priceMul: M.ruinedPriceMul, select: { commonOnly: true }, note: '公害がひどく、小物しか出ない。公園を建てると戻る' };
  }
  if (stats.pollution >= M.roughPollution) {
    return { level: 'rough', label: '荒れ', priceMul: M.roughPriceMul, note: '工場の公害で漁場が荒れている。公園を建てると戻る' };
  }
  if (stats.happiness >= M.richHappiness) {
    return { level: 'rich', label: '豊か', priceMul: 1, select: { rareMul: M.richRareMul }, note: '幸福度が高く、めずらしい魚が出やすい' };
  }
  return { level: 'normal', label: 'ふつう', priceMul: 1, note: '商業地と漁港があると、魚が高く売れる' };
}

export interface FishPriceParts {
  /** 賑わい（商業・漁港・発展度） */
  bustle: number;
  fishery: Fishery;
  /** 物価（年度） */
  scale: number;
  /** 売値に掛ける倍率 = 賑わい × 漁場 × 物価 */
  mul: number;
}

/** 魚の売値の倍率と、その内訳 */
export function fishPriceParts(state: CityState, nodeId: string, turn: number, stats?: TownStats): FishPriceParts {
  const bustle = fishMarketMul(state, nodeId);
  const fishery = stats ? fisheryOf(state, nodeId, stats) : fisheryOf(state, nodeId);
  const scale = priceScale(turn);
  return { bustle, fishery, scale, mul: bustle * fishery.priceMul * scale };
}

/** 売値の内訳を1行にする（等倍のものは省く）。例: 「賑わい ×1.8・漁場 荒れ ×0.6・物価 ×2」。全部等倍なら空文字 */
export function priceBreakdownText(parts: FishPriceParts): string {
  const out: string[] = [];
  if (parts.bustle !== 1) out.push(`賑わい ×${parts.bustle}`);
  if (parts.fishery.priceMul !== 1) out.push(`漁場 ${parts.fishery.label} ×${parts.fishery.priceMul}`);
  if (parts.scale !== 1) out.push(`物価 ×${parts.scale}`);
  return out.join('・');
}

/** 魚の売値の倍率（賑わい × 漁場 × 物価） */
export function fishPriceMul(state: CityState, nodeId: string, turn: number): number {
  return fishPriceParts(state, nodeId, turn).mul;
}

/** 1匹の売値。mul を渡さなければ釣り旅と同じ（基本の売値 × 大きさ） */
export function fishSalePrice(rarity: FishRarity, size: number, mul = 1): number {
  return Math.round((FISH_SELL_PRICE[rarity] ?? 200) * size * mul);
}

/**
 * その町で今の道具（ふつうの仕掛け）で釣ったときの、1匹の売値の見込み（10円単位）。
 * 帯の「1匹 約¥520」に使う。竿が無い・候補が無いときは 0。
 */
export function expectedTownFishPrice(state: CityState, nodeId: string, turn: number, equipment: PlayerEquipment, stats?: TownStats): number {
  const node = NODE_MAP.get(nodeId);
  if (!node || !getEquippedItem(equipment, 'rod')) return 0;
  const parts = fishPriceParts(state, nodeId, turn, stats);
  const odds = fishOdds(node.id, node.region, equipment, node.type === 'fishing_special', false, parts.fishery.select);
  return Math.round((expectedSellPrice(odds, equipment) * parts.mul) / 10) * 10;
}

/** 船釣りの代金。まちづくりでは物価で上がる（魚の売値だけ上がると、船釣りが丸もうけになるため）。釣り旅は定額 */
export function boatFishingCost(state: CityState | null | undefined, turn: number): number {
  return BOAT_FISHING_COST * (state ? priceScale(turn) : 1);
}

/** 釣った魚の中に、町おこしになる大物（レア以上）がいるか */
export function isBoomCatch(fish: Pick<Fish, 'rarity'>[]): boolean {
  return fish.some(f => RARITY_RANK[f.rarity] >= RARITY_RANK[FISH_MARKET.boomMinRarity]);
}

// ===== 釣り大会（7月） =====

/** 決算の見出しの頭（月末のお知らせに回すときの目印） */
export const DERBY_HEADLINE_PREFIX = '釣り大会';

/** その巡が釣り大会の月（7月）か */
export function isDerbyTurn(turn: number): boolean {
  return calendarLabel(turn).month === FISH_MARKET.derbyMonth;
}

/** 釣り大会の賞金（物価こみ） */
export function derbyPrize(turn: number): number {
  return FISH_MARKET.derbyPrize * priceScale(turn);
}

/** 上部の季節の札に出す名前と説明（7月だけ。それ以外は null）。例: { name: '釣り大会', desc: '水揚げ1位に ¥3,000' } */
export function derbySeasonLabel(turn: number): { name: string; desc: string } | null {
  if (!isDerbyTurn(turn)) return null;
  return { name: DERBY_HEADLINE_PREFIX, desc: `水揚げ1位に ¥${derbyPrize(turn).toLocaleString()}` };
}

/** 釣果の売値を釣り大会に数える。7月でなければ何もしない（同じ state を返す） */
export function recordDerby(state: CityState, playerIndex: number, amount: number, turn: number, playerCount: number): CityState {
  if (!isDerbyTurn(turn) || amount <= 0) return state;
  const year = calendarLabel(turn).year;
  const prev = state.derby?.year === year ? state.derby.totals : [];
  const totals = Array.from({ length: Math.max(playerCount, prev.length) }, (_, i) => prev[i] ?? 0);
  totals[playerIndex] = (totals[playerIndex] ?? 0) + amount;
  return { ...state, derby: { year, totals } };
}

export interface DerbyStandings {
  /** 席ごとの、今月の水揚げ額 */
  totals: number[];
  /** いま1位の席（同額なら全員。誰も釣っていなければ空） */
  leaders: number[];
  /** 1位の水揚げ額 */
  top: number;
  /** 賞金（物価こみ。同額1位は山分け） */
  prize: number;
}

/** 釣り大会の途中経過。7月でなければ null（上部の季節の札・町の帯に出す） */
export function derbyStandings(state: CityState, turn: number, playerCount: number): DerbyStandings | null {
  if (!isDerbyTurn(turn)) return null;
  const year = calendarLabel(turn).year;
  const src = state.derby?.year === year ? state.derby.totals : [];
  const totals = Array.from({ length: playerCount }, (_, i) => src[i] ?? 0);
  const top = Math.max(0, ...totals);
  const leaders = top > 0 ? totals.map((v, i) => (v === top ? i : -1)).filter(i => i >= 0) : [];
  return { totals, leaders, top, prize: derbyPrize(turn) };
}

export interface DerbySettlement {
  /** 釣り大会の記録を消した state */
  state: CityState;
  /** 優勝した席（同額なら全員。誰も釣っていなければ空） */
  winners: number[];
  /** 1人あたりの賞金（同額1位は山分け・100円未満は切り捨て） */
  prize: number;
  /** 1位の水揚げ額 */
  top: number;
  /** 決算の見出し（7月でない・誰も釣っていないときは null） */
  headline: string | null;
}

/** 月末の精算（7月の月末だけ）。水揚げ1位に賞金。それ以外の月は何もしない */
export function settleDerby(state: CityState, turn: number, names: string[]): DerbySettlement {
  if (!isDerbyTurn(turn)) return { state, winners: [], prize: 0, top: 0, headline: null };
  const st = derbyStandings(state, turn, names.length)!;
  const next: CityState = { ...state };
  delete next.derby;
  if (st.leaders.length === 0) return { state: next, winners: [], prize: 0, top: 0, headline: null };
  const prize = Math.floor(st.prize / st.leaders.length / 100) * 100;
  const who = st.leaders.map(i => names[i] ?? '').join('・');
  return {
    state: next,
    winners: st.leaders,
    prize,
    top: st.top,
    headline: `${DERBY_HEADLINE_PREFIX}: ${who}が優勝（水揚げ ¥${st.top.toLocaleString()}）賞金 ¥${prize.toLocaleString()}`,
  };
}

// ===== CPU =====

/**
 * CPU が釣り場の町で、工事のあとに何回釣るか。
 * 釣り場のマスで、竿があり、この訪問でまだ釣っていなければ cpuCastsPerVisit 回。それ以外は 0。
 */
export function cpuTownCasts(nodeType: NodeType | undefined, equipment: PlayerEquipment, castsDone: number): number {
  if (nodeType !== 'fishing' && nodeType !== 'fishing_special') return 0;
  if (castsDone > 0 || !getEquippedItem(equipment, 'rod')) return 0;
  return FISH_MARKET.cpuCastsPerVisit;
}
