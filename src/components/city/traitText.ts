// 町の特色の効果の説明文。TOWN_TRAITS の数値から作る（数値を調整しても説明がずれない）。
import { TOWN_CLASS_INFO, getTownInfo } from '../../game/city';
import type { BuildingKind } from '../../game/city';
import type { TownTraitDef } from '../../data/cityTraits';

const KIND_LABEL: Record<BuildingKind, string> = {
  res: '住宅', com: '商業', ind: '工業', park: '公園', power: '発電所', port: '漁港', tourism: '観光',
};
const BUILD_LABEL: Record<BuildingKind, string> = {
  res: '住宅地', com: '商業地', ind: '工業地', park: '公園', power: '発電所', port: '漁港', tourism: '観光名所',
};

const num = (v: number) => String(Number(v.toFixed(2)));

/** 月の並びを「12〜2月」「2月」「4〜5月・9〜10月」の形にする（年をまたぐ並びもひとつながり） */
export function monthsLabel(months: number[]): string {
  const set = new Set(months);
  if (set.size === 0) return '';
  if (set.size === 12) return '一年中';
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

/**
 * 特色の効果の短い説明（「・」区切り）。
 * nodeId を渡すと、その町でもとから建てられる建物は「建てられる」に書かない（京都の古都なら観光名所は元から建つ）。
 */
export function traitEffectText(def: TownTraitDef, nodeId?: string): string {
  const parts: string[] = [];
  const info = nodeId ? getTownInfo(nodeId) : null;
  const already = info ? TOWN_CLASS_INFO[info.cls].allowed : [];
  const adds = (def.allowAdd ?? []).filter(k => !already.includes(k));
  if (adds.length) parts.push(`${adds.map(k => BUILD_LABEL[k]).join('と')}を建てられる`);
  for (const [k, m] of Object.entries(def.incomeMul ?? {}) as [BuildingKind, number][]) {
    if (m !== 1) parts.push(`${KIND_LABEL[k]}の収入×${num(m)}`);
  }
  const d = def.demand ?? {};
  for (const [k, label] of [['r', '住宅'], ['c', '商業'], ['i', '工業']] as const) {
    const v = d[k] ?? 0;
    if (v !== 0) parts.push(`${label}の需要${v > 0 ? '+' : '−'}${num(Math.abs(v))}`);
  }
  if (def.pollutionMul !== undefined && def.pollutionMul !== 1) parts.push(`工場の公害×${num(def.pollutionMul)}`);
  for (const s of def.season ?? []) parts.push(`${monthsLabel(s.months)}は${KIND_LABEL[s.kind]}の収入×${num(s.mul)}`);
  return parts.join('・');
}
