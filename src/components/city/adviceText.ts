// 見込み札の文（損得係）。画面の部品（BuildPreview.tsx）とテストの両方から読む。
// 漢字はふりがな辞書で読める語だけを使う（cityAdvice.test.ts が確かめる）。
import type { ActionPreview, AdviceReason, AdviceVerdict, TownNeed } from '../../game/cityAdvice';
import { ADVICE, ADVICE_BAD_REASONS } from '../../game/cityAdvice';
import type { BuildingKind } from '../../game/city';
import { CITY_ECONOMY } from '../../game/city';

/** 判定の印の読み上げ・凡例の文 */
export const VERDICT_LABEL: Record<AdviceVerdict, string> = {
  best: 'すぐ元が取れる',
  good: '元が取れる',
  slow: '元が取れるのはおそい',
  never: '元が取れない',
  support: '町の支え',
};

/** 凡例（建てる物の一覧の下に1行で出す） */
export const VERDICT_LEGEND: { verdict: AdviceVerdict; text: string }[] = [
  { verdict: 'best', text: `${ADVICE.bestMonths}か月まで` },
  { verdict: 'good', text: `${ADVICE.goodMonths}か月まで` },
  { verdict: 'slow', text: '終わりまでに' },
  { verdict: 'never', text: '元が取れない' },
];

export const NEED_LABEL: Record<TownNeed, string> = {
  power: '電気',
  park: '公園',
  homes: '住宅',
  shops: 'お店',
  jobs: '働き口',
};

const yen = (n: number) => `¥${Math.abs(Math.round(n)).toLocaleString()}`;

/** 「月に +¥378」 */
export function gainText(gain: number): string {
  return `月に ${gain >= 0 ? '+' : '−'}${yen(gain)}`;
}

/**
 * 「11か月で元が取れる」。収入が増えなければ「元が取れない」。
 * ×（残りの月数では間に合わない）のときは月数を言わず「終わりまでに元が取れない」（×の印と文が食い違わないように）
 */
export function paybackText(payback: number | null, verdict?: AdviceVerdict): string {
  if (payback === null) return '元が取れない';
  if (verdict === 'never') return '終わりまでに元が取れない';
  return `${payback}か月で元が取れる`;
}

/** 建てた直後の小さな札: 「来月から 月に +¥212」 */
export function earnedText(gain: number): string {
  return `来月から ${gainText(gain)}`;
}

function tenths(mul: number): number {
  return Math.round(mul * 10);
}

/** 理由の1行（kind は電気なしのときの割合に使う） */
export function reasonText(reason: AdviceReason, kind?: BuildingKind): string {
  switch (reason) {
    case 'no_power': {
      const mul = kind === 'com' ? CITY_ECONOMY.comUnpoweredMul : kind === 'ind' ? CITY_ECONOMY.indUnpoweredMul : CITY_ECONOMY.resUnpoweredMul;
      return `電気がないので収入が${tenths(mul)}割`;
    }
    case 'no_customers': return '近くに住む人が少ない';
    case 'low_demand': return '今は余っている';
    case 'completes_monopoly': return '独占が完成';
    case 'becomes_mayor': return '町長になれる';
    case 'recovery_discount': return '復興で割引き';
  }
}

/** 公園・発電所が「支え」のときの説明 */
export function supportText(kind: BuildingKind): string {
  return kind === 'power' ? '町に電気が届く' : '幸福度が上がる';
}

/** × や △ の物に出す、悪い方の理由（最初の1つ。無ければ null） */
export function badReason(p: Pick<ActionPreview, 'verdict' | 'reasons'>): AdviceReason | null {
  if (p.verdict !== 'never' && p.verdict !== 'slow') return null;
  return p.reasons.find(r => ADVICE_BAD_REASONS.includes(r)) ?? null;
}

/** 良い方の理由（独占が完成・町長になれる。復興の割引きは値段の横に出ているので除く） */
export function goodReason(p: Pick<ActionPreview, 'reasons'>): AdviceReason | null {
  return p.reasons.find(r => r === 'completes_monopoly' || r === 'becomes_mayor') ?? null;
}
