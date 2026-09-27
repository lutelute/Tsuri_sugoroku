// サイコロの目の配置（3x3 マスの番号 0..8）と、各面を正面に向ける回転。
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

/** 出目 v の面を正面に向ける [rotateX, rotateY] */
export const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  6: [0, 180],
};

/** 振る前の構え（斜め上から見下ろす） */
export const IDLE_ROT: [number, number] = [-22, 30];
/** 止まったときに少し斜めに見せる傾き */
export const REST_TILT: [number, number] = [-16, 20];
