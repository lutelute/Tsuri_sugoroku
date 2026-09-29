// サイコロの目の配置（3x3 マスの番号 0..8）と、出目の面を上に向ける回転。
import { hash01 } from './prng';

export const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** 立方体の6面の配置（向かい合う面の和が7） */
export const FACES: { value: number; transform: (half: number) => string }[] = [
  { value: 1, transform: h => `translateZ(${h}px)` },
  { value: 6, transform: h => `rotateY(180deg) translateZ(${h}px)` },
  { value: 3, transform: h => `rotateY(90deg) translateZ(${h}px)` },
  { value: 4, transform: h => `rotateY(-90deg) translateZ(${h}px)` },
  { value: 5, transform: h => `rotateX(90deg) translateZ(${h}px)` },
  { value: 2, transform: h => `rotateX(-90deg) translateZ(${h}px)` },
];

/** 出目 v の面を上に向ける [rotateX, rotateY]（右の rotateY から先にかかる） */
export const TOP_ROT: Record<number, [number, number]> = {
  1: [90, 0],
  2: [180, 0],
  3: [90, -90],
  4: [90, 90],
  5: [0, 0],
  6: [-90, 0],
};

/** 見下ろす角度。本物のサイコロと同じく、上の面（出目）がいちばん大きく見える */
export const VIEW_TILT = -52;
/** 縦軸まわりのひねり（側面を2つ見せて立体に見せる） */
export const REST_YAW = 28;

/**
 * 立方体の transform。出目の面を上に向け、縦軸まわりにひねってから斜め上から見下ろす。
 * 関数の並びは振る前も後も同じにして、CSS の遷移が角度ごとに補間される（転がって見える）ようにする。
 * rollId = 0 は振る前の構え（1 が上）。spinSeed は複数個振るときの何個目か。
 */
export function diceTransform(value: number, rollId: number, spinSeed = 0): string {
  const [tx, ty] = rollId > 0 ? (TOP_ROT[value] ?? TOP_ROT[1]) : TOP_ROT[1];
  let yaw = REST_YAW;
  let sx = 0;
  let sy = 0;
  if (rollId > 0) {
    // 振るたびに回転数を変える（見た目だけ・決定論的）。1回転の倍数なので止まる向きは変わらない
    sx = 360 * (2 + Math.floor(hash01(rollId, value, 1 + 16 * spinSeed) * 2)) * rollId;
    sy = 360 * (1 + Math.floor(hash01(rollId, value, 2 + 16 * spinSeed) * 2)) * rollId;
    // 2個目以降は止まる向きを少しだけずらし、並んだサイコロが揃いすぎないようにする（±8°）
    if (spinSeed) yaw += (hash01(spinSeed, rollId, 3) - 0.5) * 16;
  }
  return `rotateX(${VIEW_TILT}deg) rotateY(${yaw}deg) rotateX(${tx + sx}deg) rotateY(${ty + sy}deg)`;
}
