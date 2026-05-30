// 乱数ソースを差し替え可能にすることで、ゲームロジックを決定論的にテストできる。
// 本番では Math.random、テストではシード付きジェネレータを注入する。
type RandomSource = () => number;

let _rng: RandomSource = Math.random;

/** 乱数ソースを差し替える（主にテスト用）。0以上1未満を返す関数を渡すこと。 */
export function setRandomSource(fn: RandomSource): void {
  _rng = fn;
}

/** 乱数ソースを既定の Math.random に戻す。 */
export function resetRandomSource(): void {
  _rng = Math.random;
}

/** 現在の乱数ソースから 0以上1未満の値を取得する。 */
export function random(): number {
  return _rng();
}

/**
 * 線形合同法によるシード付き乱数ジェネレータ。テストで決定論的な系列が欲しいときに使う。
 * 例: setRandomSource(mulberry32(42))
 */
export function mulberry32(seed: number): RandomSource {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 重み付きランダム選択。
 * 負の重みは0として扱い、有効な重みの合計が0以下の場合は一様ランダムにフォールバックする。
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length === 0) {
    throw new Error('weightedRandom: items must not be empty');
  }

  // 負値・NaN を0に正規化
  const safeWeights = weights.map(w => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  // 有効な重みが無い → 一様ランダム
  if (totalWeight <= 0) {
    return items[Math.floor(random() * items.length)] ?? items[items.length - 1];
  }

  let r = random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= safeWeights[i];
    if (r < 0) return items[i];
  }

  // 浮動小数の誤差で末尾まで到達した場合: 最後の正の重みを持つ要素を返す
  for (let i = items.length - 1; i >= 0; i--) {
    if (safeWeights[i] > 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
