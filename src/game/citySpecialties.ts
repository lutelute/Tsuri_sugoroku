// まちづくり: 名産と地方独占（桃鉄の物件独占）。React / ストアに依存しない純粋関数。
//
// 状態は `CityState.specialties?: Record<string, number>`（名産のある町の nodeId → 持ち主の playerIndex）。
// ここでは city.ts を触らないため、その持ち主表を引数で受け取る。未定義（古いセーブ）でも動くよう undefined も受ける。
//
// ルール:
//  - 県庁マスごとに名産が1つ。県庁が2つしかない地方は、名物で知られる町にも1つあり、どの地方も3つ以上になる。
//    県庁かどうかでルールは変わらない。空きなら価格で買え、他人の名産は価値の acquireMul 倍で買収できる（代金は持ち主へ）。
//  - 月収 = 価格 × 5% × 季節の倍率。電気は要らず、自然には育たない。
//  - ある地方の名産をすべて1人で持つと地方独占。その地方の名産収入が2倍になり、称号「○○の顔役」が付く。
import type { Region } from './types';
import { REALISTIC_NODES } from '../data/realisticData_nodes';
import { CITY_SPECIALTIES, SPECIALTY_REGION_NAME } from '../data/citySpecialties';
import type { CitySpecialty } from '../data/citySpecialties';

/** 名産のある町の nodeId → 持ち主の playerIndex */
export type SpecialtyOwners = Readonly<Record<string, number>>;

/** 名産の経済の数値（難易度調整係が調整する。CITY_ECONOMY と同じく実行時に書き換えて試算してよい） */
export const SPECIALTY_ECONOMY = {
  /** 月収 = 価格 × これ × 季節の倍率（回収は約20か月。災害・空き家で価値が下がらない安全な資産なので建物より少し遅い） */
  incomeRate: 0.05,
  /** 地方独占中の名産収入の倍率 */
  monopolyMul: 2,
  /** 他人の名産を買収するときの代金（資産価値の何倍か。代金は持ち主へ）。2倍では買収が割高すぎて独占狙いが負け続けたため 1.5 */
  acquireMul: 1.5,
  /** 資産価値 = 価格 × これ（総資産に入る） */
  valueRate: 1,
  /** 月収の端数を丸める単位（円） */
  incomeRound: 10,
  /** 季節の倍率がこれ以上の月を「旬」と呼ぶ */
  peakMul: 1.2,
};

// ===== 静的な引き当て =====

// 名産を置けないマス（町ではないマス）。city.ts の isTown と同じ線引き。
// city.ts がこのファイルを import しているので、循環を避けて isTown は使わない（一致はテストで確かめる）。
const NOT_TOWN: ReadonlySet<string> = new Set(['route', 'start', 'goal']);

/** 盤面の順に並べた、名産のある町（県庁と、名物で知られる町） */
export const SPECIALTY_IDS: string[] = REALISTIC_NODES
  .filter(n => !NOT_TOWN.has(n.type) && CITY_SPECIALTIES[n.id] !== undefined)
  .map(n => n.id);

const REGION_OF = new Map<string, Region>(
  REALISTIC_NODES.filter(n => SPECIALTY_IDS.includes(n.id)).map(n => [n.id, n.region]),
);

const IDS_BY_REGION = new Map<Region, string[]>();
for (const id of SPECIALTY_IDS) {
  const r = REGION_OF.get(id)!;
  IDS_BY_REGION.set(r, [...(IDS_BY_REGION.get(r) ?? []), id]);
}

/** 名産のある地方（盤面の順） */
export const SPECIALTY_REGIONS: Region[] = [...IDS_BY_REGION.keys()];

export function getSpecialty(nodeId: string): CitySpecialty | null {
  return CITY_SPECIALTIES[nodeId] ?? null;
}

export function isSpecialtyNode(nodeId: string): boolean {
  return REGION_OF.has(nodeId);
}

/** 名産の地方（名産のないマスは null） */
export function regionOfSpecialty(nodeId: string): Region | null {
  return REGION_OF.get(nodeId) ?? null;
}

/** その地方の名産の nodeId 一覧（盤面の順） */
export function regionSpecialtyIds(region: Region): string[] {
  return IDS_BY_REGION.get(region) ?? [];
}

/** 称号「○○の顔役」 */
export function specialtyTitle(region: Region): string {
  return `${SPECIALTY_REGION_NAME[region]}の顔役`;
}

// ===== 季節 =====

/** 季節の倍率（月は 1〜12。表にない月は 1.0） */
export function specialtySeasonMul(nodeId: string, month: number): number {
  return getSpecialty(nodeId)?.season[month] ?? 1;
}

/** 旬の月（倍率が peakMul 以上の月。1〜12の昇順） */
export function specialtyPeakMonths(nodeId: string): number[] {
  const res: number[] = [];
  for (let m = 1; m <= 12; m++) if (specialtySeasonMul(nodeId, m) >= SPECIALTY_ECONOMY.peakMul) res.push(m);
  return res;
}

/** 旬の表示用ラベル。例: 「6〜8月」「4〜5月・9〜10月」「11〜3月」。旬がなければ「通年」 */
export function specialtySeasonLabel(nodeId: string): string {
  const set = new Set(specialtyPeakMonths(nodeId));
  if (set.size === 0 || set.size === 12) return '通年';
  const prev = (m: number) => (m === 1 ? 12 : m - 1);
  const next = (m: number) => (m === 12 ? 1 : m + 1);
  const runs: string[] = [];
  for (let m = 1; m <= 12; m++) {
    if (!set.has(m) || set.has(prev(m))) continue;
    let end = m;
    while (set.has(next(end)) && next(end) !== m) end = next(end);
    runs.push(end === m ? `${m}月` : `${m}〜${end}月`);
  }
  return runs.join('・');
}

// ===== 価値・費用・収入 =====

/** 名産の資産価値（総資産に入る。名産のないマスは 0） */
export function specialtyValue(nodeId: string): number {
  const sp = getSpecialty(nodeId);
  return sp ? Math.round(sp.price * SPECIALTY_ECONOMY.valueRate) : 0;
}

/** 手に入れる代金: 空きなら価格、他人のものなら価値の acquireMul 倍（代金は持ち主へ） */
export function specialtyBuyCost(owners: SpecialtyOwners | undefined, nodeId: string): number {
  const sp = getSpecialty(nodeId);
  if (!sp) return 0;
  const owner = ownerOf(owners, nodeId);
  if (owner === null) return sp.price;
  return Math.round((specialtyValue(nodeId) * SPECIALTY_ECONOMY.acquireMul) / 100) * 100;
}

/** 名産1つの今月の収入（季節込み）。monopolized なら地方独占の倍率を掛ける */
export function specialtyIncome(nodeId: string, month: number, monopolized = false): number {
  const sp = getSpecialty(nodeId);
  if (!sp) return 0;
  const E = SPECIALTY_ECONOMY;
  const raw = sp.price * E.incomeRate * specialtySeasonMul(nodeId, month) * (monopolized ? E.monopolyMul : 1);
  return Math.round(raw / E.incomeRound) * E.incomeRound;
}

export function ownerOf(owners: SpecialtyOwners | undefined, nodeId: string): number | null {
  const o: number | undefined = owners?.[nodeId];
  return o === undefined ? null : o;
}

/** 地方独占: 地方 → 独占している playerIndex（その地方の名産をすべて1人で持っている地方だけ） */
export function regionalMonopolies(owners: SpecialtyOwners | undefined): Partial<Record<Region, number>> {
  const res: Partial<Record<Region, number>> = {};
  for (const [region, ids] of IDS_BY_REGION) {
    const first = ownerOf(owners, ids[0]);
    if (first === null) continue;
    if (ids.every(id => ownerOf(owners, id) === first)) res[region] = first;
  }
  return res;
}

/** その名産の持ち主が地方独占しているか */
export function isSpecialtyMonopolized(owners: SpecialtyOwners | undefined, nodeId: string): boolean {
  const region = regionOfSpecialty(nodeId);
  const owner = ownerOf(owners, nodeId);
  return region !== null && owner !== null && regionalMonopolies(owners)[region] === owner;
}

/** プレイヤーの今月の名産収入（季節と地方独占込み） */
export function specialtyMonthlyIncome(owners: SpecialtyOwners | undefined, playerIndex: number, month: number): number {
  const mono = regionalMonopolies(owners);
  let total = 0;
  for (const id of SPECIALTY_IDS) {
    if (ownerOf(owners, id) !== playerIndex) continue;
    total += specialtyIncome(id, month, mono[REGION_OF.get(id)!] === playerIndex);
  }
  return total;
}

/** 全員分の今月の名産収入（simulateRound の収入に足す形） */
export function specialtyIncomes(owners: SpecialtyOwners | undefined, playerCount: number, month: number): number[] {
  return Array.from({ length: playerCount }, (_, i) => specialtyMonthlyIncome(owners, i, month));
}

/** プレイヤーが持つ名産の資産価値の合計（cityScore の property に足す形） */
export function playerSpecialtyValue(owners: SpecialtyOwners | undefined, playerIndex: number): number {
  return SPECIALTY_IDS.reduce((acc, id) => acc + (ownerOf(owners, id) === playerIndex ? specialtyValue(id) : 0), 0);
}

/** プレイヤーが持つ名産の数 */
export function playerSpecialtyCount(owners: SpecialtyOwners | undefined, playerIndex: number): number {
  return SPECIALTY_IDS.filter(id => ownerOf(owners, id) === playerIndex).length;
}

// ===== 地方独占の進み具合・称号 =====

export interface RegionProgress {
  region: Region;
  /** その地方の名産（盤面の順）と持ち主（空きは null） */
  items: { nodeId: string; owner: number | null }[];
  total: number;
  /** 一番多く持っている人（同数なら先の席。誰も持っていなければ null） */
  leader: number | null;
  leaderCount: number;
  /** 地方独占している人 */
  monopolist: number | null;
}

export function regionProgress(owners: SpecialtyOwners | undefined, region: Region): RegionProgress {
  const ids = regionSpecialtyIds(region);
  const items = ids.map(nodeId => ({ nodeId, owner: ownerOf(owners, nodeId) }));
  const counts = new Map<number, number>();
  for (const it of items) if (it.owner !== null) counts.set(it.owner, (counts.get(it.owner) ?? 0) + 1);
  let leader: number | null = null;
  let leaderCount = 0;
  for (const [p, c] of [...counts].sort((a, b) => a[0] - b[0])) {
    if (c > leaderCount) {
      leader = p;
      leaderCount = c;
    }
  }
  return {
    region,
    items,
    total: ids.length,
    leader,
    leaderCount,
    monopolist: leaderCount === ids.length && ids.length > 0 ? leader : null,
  };
}

export interface SpecialtyTitle {
  region: Region;
  playerIndex: number;
  /** 「○○の顔役」 */
  title: string;
}

/** 今ついている「○○の顔役」の称号（盤面の地方の順） */
export function specialtyTitles(owners: SpecialtyOwners | undefined): SpecialtyTitle[] {
  const mono = regionalMonopolies(owners);
  return SPECIALTY_REGIONS.filter(r => mono[r] !== undefined).map(r => ({ region: r, playerIndex: mono[r]!, title: specialtyTitle(r) }));
}

// ===== 売買 =====

export type SpecialtyBuyResult =
  | {
      ok: true;
      owners: Record<string, number>;
      /** 支払った代金 */
      cost: number;
      /** 買収したときの元の持ち主（代金はこの人へ） */
      prevOwner?: number;
      /** この取引で買い手が地方独占を完成させた地方 */
      monopolyFormed?: Region;
      /** この取引で崩れた地方独占（元の持ち主のもの） */
      monopolyBroken?: { region: Region; playerIndex: number };
      /** トースト用の文 */
      message: string;
    }
  | { ok: false; reason: string };

/**
 * 名産を手に入れる。空きなら価格、他人のものなら価値の acquireMul 倍（代金を prevOwner へ渡すのは呼び出し側）。
 * owners は書き換えず、新しい表を返す。
 */
export function buySpecialty(owners: SpecialtyOwners | undefined, nodeId: string, playerIndex: number, money: number): SpecialtyBuyResult {
  const sp = getSpecialty(nodeId);
  const region = regionOfSpecialty(nodeId);
  if (!sp || region === null) return { ok: false, reason: 'この町には名産がない' };
  const prev = ownerOf(owners, nodeId);
  if (prev === playerIndex) return { ok: false, reason: 'すでに自分の名産' };
  const cost = specialtyBuyCost(owners, nodeId);
  if (money < cost) return { ok: false, reason: 'お金が足りない' };

  const before = regionalMonopolies(owners);
  const next: Record<string, number> = { ...(owners ?? {}), [nodeId]: playerIndex };
  const after = regionalMonopolies(next);

  const formed = after[region] === playerIndex && before[region] !== playerIndex ? region : undefined;
  const broken = prev !== null && before[region] === prev ? { region, playerIndex: prev } : undefined;

  let message = prev === null ? `名産「${sp.name}」を手に入れた` : `名産「${sp.name}」を買収した`;
  if (formed) message += `。${SPECIALTY_REGION_NAME[region]}の名産を独占、「${specialtyTitle(region)}」になった`;

  return {
    ok: true,
    owners: next,
    cost,
    ...(prev !== null ? { prevOwner: prev } : {}),
    ...(formed ? { monopolyFormed: formed } : {}),
    ...(broken ? { monopolyBroken: broken } : {}),
    message,
  };
}
