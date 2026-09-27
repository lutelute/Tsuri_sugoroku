// 合わせ（ストライク）とミニゲーム選択の純粋ロジック。WaitingPhase の描画と useFishing の判定で共有する。
import type { FishRarity, FishingMiniGame } from '../../game/types';

/**
 * 合わせの判定結果。
 * - perfect: 金の帯のど真ん中（会心の合わせ → ミニゲームに先行ボーナス）
 * - good: 金の帯の中
 * - early / late: 帯の外（早すぎ / 遅すぎ）
 */
export type StrikeJudge = 'perfect' | 'good' | 'early' | 'late';

/** 金の帯の幅に対する「会心」の半幅の割合（帯の中央 ±20%×帯幅 → 帯幅の40%が会心） */
export const STRIKE_PERFECT_FRACTION = 0.2;

/**
 * 当たりの輪が縮みきるまでの時間（ms）。レア度が高いほど速い＝鋭い当たり。
 * 金の帯の幅（getStrikeGreenZone）は正規化時間 t の割合なので、実時間の猶予は 帯幅×周期。
 * 例: common Lv1 = 0.27×2000 = 540ms / mythical Lv5 = 0.47×1600 = 752ms
 */
export const STRIKE_RING_PERIOD_MS: Record<FishRarity, number> = {
  common: 2000,
  uncommon: 1900,
  rare: 1800,
  legendary: 1700,
  mythical: 1600,
};

/**
 * 合わせを判定する。t は当たりからの正規化時間（0=輪が最大、0.5=金の帯の中心、1=輪が消える）。
 * greenZone は getStrikeGreenZone(strikeLevel) の値（0〜1）。
 */
export function judgeStrike(t: number, greenZone: number): StrikeJudge {
  const half = greenZone / 2;
  if (t < 0.5 - half) return 'early';
  if (t > 0.5 + half) return 'late';
  if (Math.abs(t - 0.5) <= greenZone * STRIKE_PERFECT_FRACTION) return 'perfect';
  return 'good';
}

const MINI_GAMES: FishingMiniGame[] = ['reeling', 'target', 'reaction', 'rhythm'];

/**
 * 次のミニゲームを選ぶ。
 * - 直前と同じミニゲームは続けて出さない（単調さの解消）
 * - legendary / mythical は「やり取り（突進→休みの波）」が出やすい（大物らしい手応え）
 */
export function pickMiniGame(rarity: FishRarity, last: FishingMiniGame | null, rng: () => number): FishingMiniGame {
  const candidates = MINI_GAMES.filter(g => g !== last);
  const weights = candidates.map(g => (g === 'reeling' && (rarity === 'legendary' || rarity === 'mythical') ? 2.5 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// 直前に出したミニゲーム（ページ内で釣りをまたいで覚えておく）
let lastMiniGame: FishingMiniGame | null = null;

/** pickMiniGame に「直前のミニゲーム」の記憶をつけたもの（useFishing から使う）。 */
export function drawMiniGame(rarity: FishRarity, rng: () => number = Math.random): FishingMiniGame {
  const g = pickMiniGame(rarity, lastMiniGame, rng);
  lastMiniGame = g;
  return g;
}
