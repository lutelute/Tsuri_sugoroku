// 描画中に使える決定論的な擬似乱数。
// 紙吹雪の配置など「見た目だけのばらつき」に使う（描画中に Math.random を呼ばないため）。
export function hash01(seed: number, i: number, salt = 0): number {
  let h = (Math.imul(seed | 0, 374761393) + Math.imul(i | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
