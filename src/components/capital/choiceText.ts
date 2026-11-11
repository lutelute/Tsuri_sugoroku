import type { CapitalChoice } from '../../game/types';

/**
 * 祭りの選択肢の説明文。まちづくりでは宴の賞金に物価が掛かる（store/game/eventSlice の feast）ので、
 * 説明文の額も掛けた額に替える。データ（capitalEvents.ts）の文は1年目の額のまま。
 */
export function choiceText(choice: CapitalChoice, scale: number): string {
  const eff = choice.effect;
  if (eff.kind !== 'feast' || scale <= 1 || !eff.moneyBonus) return choice.description;
  const n = eff.moneyBonus;
  return choice.description.replace(new RegExp(`¥(${n.toLocaleString()}|${n})(?![0-9,])`), `¥${(n * scale).toLocaleString()}`);
}
