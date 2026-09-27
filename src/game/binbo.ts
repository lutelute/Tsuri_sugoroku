// 貧乏神（日本の民話の「貧乏神」）: まちづくりモードの押し付け合い。
// React / ストアに依存しない純粋関数だけで構成し、Vitest で検証する。
//
// ルール:
//  - 誰かが目的地に一番乗りすると、到着者以外で「目的地から一番遠い人」にとりつく（1人プレイでは出さない。CPU は相手に数える）。
//  - とりつかれた人が、他の駒がいるマスを「通る」か「止まる」と、貧乏神はその駒の持ち主に移る。
//  - 月末に悪さをする: 無駄遣い 40% / 建物を半値で売る 25% / 他の人にお金を渡す 20% / 何もしない 15%。
//  - 同じ人に 12 か月とりつき続けると「大貧乏神」に化け、被害が 2 倍になる。
//    人が替わると（移る・目的地で別の人にとりつき直す）数え直し。同じ人にとりつき直したときは数え続ける。
//
// 状態は CityState に `binbo?: BinboState` として足す想定。ここでは引数で受け取り、新しい値を返すだけ。
import type { BuildingKind, CityState, Plot } from './city';
import { BUILDING_INFO, distancesFrom, getTownInfo, plotValue } from './city';
import { weightedRandom } from '../utils/random';

// ===== 型 =====

export interface BinboState {
  /** とりついている人の index（null: まだ誰にもとりついていない） */
  playerIndex: number | null;
  /** 今の人にとりついてから過ぎた月末の数。BINBO.greatMonths に達すると大貧乏神 */
  months: number;
}

export type BinboMischiefKind = 'waste' | 'sell' | 'give' | 'none';

/** 貧乏神が売り払った建物 */
export interface BinboSale {
  nodeId: string;
  plotIndex: number;
  kind: BuildingKind;
  /** 売る前の資産価値 */
  value: number;
  /** 実際に受け取った代金（資産価値の半値） */
  price: number;
}

export interface BinboMischiefResult {
  city: CityState;
  /** プレイヤーごとのお金の増減（ストアでそのまま足す） */
  moneyDeltas: number[];
  /** 実際に起きた悪さ */
  kind: BinboMischiefKind;
  message: string;
  /** 売った建物の町（大貧乏神で2軒売ったときは1軒目） */
  soldNodeId?: string;
  /** 売った建物の一覧 */
  sold?: BinboSale[];
  /** お金を渡された人 */
  giveTo?: number;
  /** とりつかれた人が失ったお金、または売った建物の資産価値の合計（演出用の「被害額」） */
  damage: number;
  /** くじで引いた悪さ（できなくて別の悪さに変わったときは kind と違う） */
  rolled: BinboMischiefKind;
  /** 大貧乏神の悪さだったか */
  great: boolean;
}

// ===== 定数 =====

export const BINBO = {
  /** 出てくる最少人数（CPU も数える） */
  minPlayers: 2,
  /** 同じ人にとりつき続けてこの月数で大貧乏神 */
  greatMonths: 12,
  /** 大貧乏神の被害の倍率 */
  greatMultiplier: 2,
  /** 月末の悪さの重み（合計100） */
  weights: { waste: 40, sell: 25, give: 20, none: 15 } as Record<BinboMischiefKind, number>,
  /** 無駄遣い: 所持金のこの割合（¥100 単位に切り捨て、最低 ¥100） */
  wasteRate: 0.1,
  /** 無駄遣いの上限 */
  wasteCap: 3000,
  /** 建物を売るときの値段（資産価値に対する率） */
  sellPriceRate: 0.5,
  /** 他の人に渡す額 */
  giveAmount: 1000,
};

const KIND_ORDER: BinboMischiefKind[] = ['waste', 'sell', 'give', 'none'];

const WASTE_FLAVORS = [
  '役に立たない壺を買ってしまった',
  'からくり人形を衝動買いしてしまった',
  '宴会で大盤振る舞いしてしまった',
  'あやしい開運札を買い込んでしまった',
  '食べきれないほどの団子を注文してしまった',
];

const NONE_FLAVORS = [
  '縁側で昼寝をしていて、今月は何もしなかった',
  '団扇であおぎながら居眠り。今月は何もしなかった',
  'ぼんやり雲を眺めていて、今月は何もしなかった',
];

// ===== 状態の基本 =====

export function createBinboState(): BinboState {
  return { playerIndex: null, months: 0 };
}

/** この人数で貧乏神を出すか（1人プレイでは出さない） */
export function binboEnabled(playerCount: number): boolean {
  return playerCount >= BINBO.minPlayers;
}

/** 大貧乏神か */
export function isGreat(binbo: BinboState | undefined | null): boolean {
  return !!binbo && binbo.playerIndex !== null && binbo.months >= BINBO.greatMonths;
}

/** 被害の倍率（大貧乏神なら 2） */
export function binboMultiplier(binbo: BinboState | undefined | null): number {
  return isGreat(binbo) ? BINBO.greatMultiplier : 1;
}

/** 大貧乏神に化けるまでの残り月数（とりついていなければ null、化けていれば 0） */
export function monthsUntilGreat(binbo: BinboState | undefined | null): number | null {
  if (!binbo || binbo.playerIndex === null) return null;
  return Math.max(0, BINBO.greatMonths - binbo.months);
}

/** prev → next で大貧乏神に化けたか（化けた瞬間の演出用） */
export function becameGreat(prev: BinboState | undefined | null, next: BinboState | undefined | null): boolean {
  return !isGreat(prev) && isGreat(next);
}

// ===== とりつく・移る =====

/**
 * 目的地に一番乗りしたとき、到着者以外で目的地から一番遠い人にとりつく。
 * 距離は盤面のマス数（distancesFrom の BFS）。たどり着けないマスは一番遠いとみなす。
 * 同じ距離なら所持金が多い人（moneys を渡したとき）。それも同じなら、到着者の次に手番が来る人から順に先の人。
 * とりつく相手が今と同じ人なら月数を数え続け、別の人なら 0 から数え直す。
 */
export function attachOnDestination(
  binbo: BinboState | undefined,
  arrivedPlayer: number,
  playerNodes: string[],
  destination: string,
  playerCount: number,
  moneys?: number[],
): BinboState {
  const cur = binbo ?? createBinboState();
  if (!binboEnabled(playerCount)) return createBinboState();
  const dist = distancesFrom(destination);
  let best: number | null = null;
  let bestD = -1;
  let bestM = -Infinity;
  for (let k = 1; k < playerCount; k++) {
    const i = (((arrivedPlayer + k) % playerCount) + playerCount) % playerCount;
    const node = playerNodes[i];
    if (node === undefined) continue;
    const d = dist.get(node) ?? Infinity;
    const m = moneys?.[i] ?? 0;
    if (best === null || d > bestD || (d === bestD && m > bestM)) {
      best = i;
      bestD = d;
      bestM = m;
    }
  }
  if (best === null) return cur;
  return best === cur.playerIndex ? cur : { playerIndex: best, months: 0 };
}

/**
 * とりつかれた人が動いたとき、経路上（出発マスを除く・止まったマスを含む）で最初に出会った他の駒の持ち主へ移る。
 * 同じマスに何人もいたら、動いた人の次に手番が来る人から順に先の人。
 * 動いたのがとりつかれた人でなければ何も起きない。移ったら月数は 0 から数え直し。
 */
export function transferOnMove(
  binbo: BinboState | undefined,
  moverIndex: number,
  path: string[],
  playerNodes: string[],
): { binbo: BinboState; to: number | null } {
  const cur = binbo ?? createBinboState();
  if (cur.playerIndex === null || cur.playerIndex !== moverIndex) return { binbo: cur, to: null };
  const n = playerNodes.length;
  for (let s = 1; s < path.length; s++) {
    const node = path[s];
    for (let k = 1; k < n; k++) {
      const i = (moverIndex + k) % n;
      if (playerNodes[i] === node) return { binbo: { playerIndex: i, months: 0 }, to: i };
    }
  }
  return { binbo: cur, to: null };
}

// ===== 月末 =====

/** 月末に1か月進める（とりついていれば月数+1。greatMonths に達したら大貧乏神） */
export function tickMonth(binbo: BinboState | undefined): BinboState {
  const cur = binbo ?? createBinboState();
  if (cur.playerIndex === null) return cur;
  return { ...cur, months: cur.months + 1 };
}

const yen = (v: number) => `¥${v.toLocaleString()}`;

/** 無駄遣いする額: 所持金 × 率を ¥100 単位に切り捨て（最低 ¥100）、上限つき。所持金を超えない */
export function binboWasteAmount(money: number, multiplier = 1): number {
  if (money <= 0) return 0;
  const byRate = Math.max(100, Math.floor((money * BINBO.wasteRate * multiplier) / 100) * 100);
  return Math.min(money, byRate, BINBO.wasteCap * multiplier);
}

/**
 * 売る建物を選ぶ: 資産価値の低いものから（空き家は半値なので先に選ばれやすい）。
 * 子供向けに理不尽すぎないよう、大事な高い建物ほど残す。同額なら町の id 順・区画の順で決定論的に。
 */
export function pickBinboSales(city: CityState, playerIndex: number, count: number): BinboSale[] {
  const owned: BinboSale[] = [];
  for (const [nodeId, town] of Object.entries(city.towns)) {
    town.plots.forEach((p, plotIndex) => {
      if (p && p.owner === playerIndex) {
        const value = plotValue(p, nodeId, town);
        const price = Math.round((value * BINBO.sellPriceRate) / 100) * 100;
        owned.push({ nodeId, plotIndex, kind: p.kind, value, price });
      }
    });
  }
  owned.sort((a, b) => a.value - b.value || (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0) || a.plotIndex - b.plotIndex);
  return owned.slice(0, Math.max(0, count));
}

function removePlots(city: CityState, sales: BinboSale[]): CityState {
  const towns = { ...city.towns };
  for (const s of sales) {
    const town = towns[s.nodeId];
    const plots: (Plot | null)[] = [...town.plots];
    plots[s.plotIndex] = null;
    towns[s.nodeId] = { ...town, plots }; // 発展度・地価・もとの区画数はそのまま
  }
  return { ...city, towns };
}

/** 渡す相手: とりつかれた人以外で所持金が一番少ない人（同額なら次に手番が来る人から順に先の人） */
function poorestOther(moneys: number[], playerIndex: number): number | null {
  const n = moneys.length;
  let best: number | null = null;
  for (let k = 1; k < n; k++) {
    const i = (playerIndex + k) % n;
    if (best === null || moneys[i] < moneys[best]) best = i;
  }
  return best;
}

/**
 * 月末の悪さ。くじ（random() 1回）で種類を決め、できないときは次のように変わる:
 *  - 売る建物がない → 無駄遣い
 *  - 無駄遣い・渡すお金がない（所持金0） → 何もしない
 *  - 渡す相手がいない（1人） → 何もしない
 * 大貧乏神なら被害2倍（無駄遣いの率と上限・売る軒数・渡す額が2倍）。
 * names を渡すと、お金を渡された人の名前をメッセージに入れる。
 */
export function binboMischief(
  binbo: BinboState | undefined,
  city: CityState,
  playerIndex: number,
  moneys: number[],
  names?: string[],
): BinboMischiefResult {
  const great = isGreat(binbo);
  const mul = great ? BINBO.greatMultiplier : 1;
  const who = great ? '大貧乏神' : '貧乏神';
  const moneyDeltas = moneys.map(() => 0);
  const rolled = weightedRandom(KIND_ORDER, KIND_ORDER.map(k => BINBO.weights[k]));
  const money = moneys[playerIndex] ?? 0;
  const base = { city, moneyDeltas, rolled, great };

  const nothing = (message: string): BinboMischiefResult => ({ ...base, kind: 'none', message, damage: 0 });
  if (playerIndex < 0 || playerIndex >= moneys.length) return nothing(`${who}は今月、何もしなかった`);

  const doWaste = (prefix: string): BinboMischiefResult => {
    const amount = binboWasteAmount(money, mul);
    if (amount <= 0) return nothing(`${prefix}財布が空っぽで、${who}もがっかり。今月は何もできなかった`);
    moneyDeltas[playerIndex] = -amount;
    const flavor = WASTE_FLAVORS[Math.floor(amount / 100) % WASTE_FLAVORS.length];
    return { ...base, kind: 'waste', message: `${prefix}${who}が${flavor}。${yen(amount)}の無駄遣い！`, damage: amount };
  };

  if (rolled === 'waste') return doWaste('');

  if (rolled === 'sell') {
    const sales = pickBinboSales(city, playerIndex, mul);
    if (sales.length === 0) return doWaste('売る建物がなかったので、');
    const price = sales.reduce((a, s) => a + s.price, 0);
    const value = sales.reduce((a, s) => a + s.value, 0);
    moneyDeltas[playerIndex] = price;
    const names2 = sales.map(s => `${getTownInfo(s.nodeId)?.name ?? s.nodeId}の${BUILDING_INFO[s.kind].name}`).join('と');
    return {
      ...base,
      city: removePlots(city, sales),
      kind: 'sell',
      message: `${who}が${names2}を勝手に半値で売り払ってしまった！（資産${yen(value)}が${yen(price)}に）`,
      soldNodeId: sales[0].nodeId,
      sold: sales,
      damage: value,
    };
  }

  if (rolled === 'give') {
    const to = poorestOther(moneys, playerIndex);
    if (to === null) return nothing(`${who}は今月、何もしなかった`);
    const amount = Math.min(money, BINBO.giveAmount * mul);
    if (amount <= 0) return nothing(`財布が空っぽで、${who}もがっかり。今月は何もできなかった`);
    moneyDeltas[playerIndex] = -amount;
    moneyDeltas[to] += amount;
    const toName = names?.[to] ?? 'ほかのプレイヤー';
    return { ...base, kind: 'give', message: `${who}が財布から${yen(amount)}を抜き取って、${toName}に渡してしまった！`, giveTo: to, damage: amount };
  }

  const flavor = NONE_FLAVORS[(binbo?.months ?? 0) % NONE_FLAVORS.length];
  return nothing(`${who}は${flavor}`);
}
