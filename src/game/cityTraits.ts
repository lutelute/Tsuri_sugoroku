// まちづくり: 町の特色の効果を引く純粋関数。
// city.ts がこのファイルを import するので、ここからは city.ts の「型」だけを import する（実行時の循環を作らない）。
// 数値は data/cityTraits.ts の TOWN_TRAITS を毎回読む（難易度調整係が実行時に書き換えて試算できるよう、キャッシュしない）。
import type { BuildingKind, TownClass } from './city';
import { CITY_TRAITS, TOWN_TRAITS } from '../data/cityTraits';
import type { TownTraitDef, TownTraitEntry, TownTraitId } from '../data/cityTraits';

const NO_TRAITS: TownTraitId[] = [];

/** 町の特色の表の行（特色のない町は null） */
export function traitEntryOf(nodeId: string): TownTraitEntry | null {
  return CITY_TRAITS[nodeId] ?? null;
}

/** 町の特色の id（なければ空） */
export function traitIdsOf(nodeId: string): TownTraitId[] {
  return CITY_TRAITS[nodeId]?.traits ?? NO_TRAITS;
}

/** 町の特色の定義（なければ空） */
export function traitsOf(nodeId: string): TownTraitDef[] {
  return traitIdsOf(nodeId).map(id => TOWN_TRAITS[id]);
}

/** 町の格の上書き（なければ undefined） */
export function traitClassOverride(nodeId: string): TownClass | undefined {
  return CITY_TRAITS[nodeId]?.cls;
}

/** 特色で建てられるようになる建物 */
export function traitAllowAdd(nodeId: string): BuildingKind[] {
  const out: BuildingKind[] = [];
  for (const t of traitsOf(nodeId)) for (const k of t.allowAdd ?? []) if (!out.includes(k)) out.push(k);
  return out;
}

/** 特色による需要の上乗せ（複数の特色は足し合わせる） */
export function traitDemand(nodeId: string): { r: number; c: number; i: number } {
  let r = 0;
  let c = 0;
  let i = 0;
  for (const t of traitsOf(nodeId)) {
    r += t.demand?.r ?? 0;
    c += t.demand?.c ?? 0;
    i += t.demand?.i ?? 0;
  }
  return { r, c, i };
}

/** 特色による収入の倍率（複数の特色は掛け合わせる。正の収入だけに掛ける前提） */
export function traitIncomeMul(nodeId: string, kind: BuildingKind): number {
  let m = 1;
  for (const t of traitsOf(nodeId)) m *= t.incomeMul?.[kind] ?? 1;
  return m;
}

/** この町の工業が出す公害の倍率 */
export function traitPollutionMul(nodeId: string): number {
  let m = 1;
  for (const t of traitsOf(nodeId)) m *= t.pollutionMul ?? 1;
  return m;
}

/**
 * 特色による季節の倍率（月は 1〜12）。季節の暦との重なりの扱いは city.ts の seasonalIncomeMul が決める。
 */
export function traitSeasonMul(nodeId: string, kind: BuildingKind, month: number): number {
  let m = 1;
  for (const t of traitsOf(nodeId)) {
    for (const s of t.season ?? []) if (s.kind === kind && s.months.includes(month)) m *= s.mul;
  }
  return m;
}

/** 特色を持つ町（表の順） */
export const TRAIT_TOWN_IDS: string[] = Object.keys(CITY_TRAITS);
