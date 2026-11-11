// 災害からの復興（まちづくり・企画案⑧）: 被害が残った町の「復興特需」と、全壊した建物の「見舞金」。
// React・ストアに依存しない純粋関数。数値は city.ts の RECOVERY。
//
// 呼ぶ順番（ストア・シミュレーション共通）:
//   災害（simulateRound の季節の災害 / applyCityEvent の出来事）→ 保険（protectInsured / applyInsurance）→ settleDisasters
// 保険のあとの被害で計算するので、保険で元に戻った建物に見舞金は出ず、被害がすべて戻った町は特需にならない（二重取りしない）。
//
// 特需の効き目（割引・需要）と残り月の減り方は city.ts が持つ:
//   buildCost（→ upgradeCost・renovateCost）が割引、computeAllStats が需要、simulateRound が月末に残り月を1減らす。
import type { BuildingKind, CityDisasterReport, CityState, TownState } from './city';
import { baseBuildCost, getTownInfo, RECOVERY } from './city';

export interface DisasterSettlement {
  /** 復興特需を付けた状態 */
  state: CityState;
  /** プレイヤーごとの見舞金（所持金に足す） */
  aid: number[];
  /** 復興特需が始まった（または残り月が戻った）町 */
  recoveryTowns: string[];
  /** 市政だよりに載せる見出し */
  headlines: string[];
}

/** 全壊した建物1つの見舞金: 建設費（割引前・被災前の町の地価と発展度）× aidRate。空き家だった建物は vacantAidMul 倍 */
export function aidFor(kind: BuildingKind, nodeId: string, townBefore: TownState | undefined, vacant = false): number {
  const base = baseBuildCost(kind, nodeId, townBefore) * RECOVERY.aidRate * (vacant ? RECOVERY.vacantAidMul : 1);
  return Math.round(base / 100) * 100;
}

/** 見出し用: 割引の割合（0.7 → 3） */
export function recoveryDiscountTenths(): number {
  return Math.round((1 - RECOVERY.costMul) * 10);
}

/**
 * 災害の後始末。disasters は保険を効かせたあとの報告（保険で戻った被害は除かれている）。
 * before は被災前の状態（見舞金の地価に使う）、after は被災後（保険のあと）の状態。
 */
export function settleDisasters(
  before: CityState,
  after: CityState,
  disasters: CityDisasterReport[],
  playerCount: number,
): DisasterSettlement {
  const aid = Array.from({ length: playerCount }, () => 0);
  const hit: string[] = [];
  for (const d of disasters) {
    for (const dmg of d.damages) {
      if (!hit.includes(dmg.nodeId)) hit.push(dmg.nodeId);
      if (dmg.destroyed && dmg.owner >= 0 && dmg.owner < playerCount) {
        aid[dmg.owner] += aidFor(dmg.kind, dmg.nodeId, before.towns[dmg.nodeId], !!dmg.vacant);
      }
    }
  }
  const recoveryTowns = hit.filter(id => !!after.towns[id]);
  if (!recoveryTowns.length) return { state: after, aid, recoveryTowns: [], headlines: [] };

  const towns = { ...after.towns };
  for (const id of recoveryTowns) towns[id] = { ...towns[id], recovery: RECOVERY.months };

  const names = recoveryTowns.map(id => getTownInfo(id)?.name ?? id);
  const shown = names.length > 3 ? `${names.slice(0, 3).join('・')}ほか${names.length - 3}か所` : names.join('・');
  const headlines = [`${shown}で復興特需（${RECOVERY.months}か月、建設・再開発が${recoveryDiscountTenths()}割引き）`];
  const paid = aid.reduce((a, b) => a + b, 0);
  if (paid > 0) headlines.push(`全壊した建物の持ち主に見舞金（合計¥${paid.toLocaleString()}）`);

  return { state: { ...after, towns }, aid, recoveryTowns, headlines };
}
