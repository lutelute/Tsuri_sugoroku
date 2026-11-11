// 魚の重さの表示。軽い魚が「0.0kg」にならないよう、1kg 未満は g で出す。

/**
 * 重さ（kg）→ 表示の数字と単位。
 * 1kg 未満は g（10g 未満は 1g きざみ、ほかは 10g きざみ）、1kg 以上は kg（小数1桁、100kg 以上は整数）。
 */
export function weightText(kg: number): { value: string; unit: 'g' | 'kg' } {
  if (!(kg > 0)) return { value: '0', unit: 'g' };
  if (kg < 0.9995) {
    const g = kg * 1000;
    const shown = g < 10 ? Math.max(1, Math.round(g)) : Math.round(g / 10) * 10;
    if (shown >= 1000) return { value: '1.0', unit: 'kg' };
    return { value: String(shown), unit: 'g' };
  }
  if (kg >= 100) return { value: Math.round(kg).toLocaleString(), unit: 'kg' };
  return { value: kg.toFixed(1), unit: 'kg' };
}
