// 札の絵係: 絵で使う色と、道筋（path）を作る小さな関数。
// 色は index.css の @theme（藍・朱・金・和紙）と揃える。絵は SVG の平塗り＋墨の輪郭で描く。

export const INK = '#1c140c';
export const WASHI = '#fbf6e8';
export const WASHI2 = '#e9dcc0';
export const WASHI3 = '#d8c79e';
export const KIN = '#d4a843';
export const KIN_LIGHT = '#f1d893';
export const KIN_PALE = '#f7e7b8';
export const KIN_DARK = '#b8862f';
export const KIN_DEEP = '#9a6f24';
export const SHU = '#c63a26';
export const SHU_LIGHT = '#ef6a52';
export const SHU_BRIGHT = '#e34a33';
export const SHU_DARK = '#a92e1d';
export const AI = '#15314f';
export const AI_DEEP = '#0c1f33';
export const AI_MID = '#2e5e8c';
export const AI_SOFT = '#4a7faf';
export const AI_LIGHT = '#7fa9cd';
export const AI_PALE = '#cfe3ee';
export const LEAF = '#4f9d5d';
export const LEAF_LIGHT = '#7fbf6a';
export const LEAF_DARK = '#2f6b45';
export const WOOD = '#6b4b2a';
export const WOOD_LIGHT = '#c9a05a';
export const WOOD_PALE = '#e2c48a';
export const STONE = '#6f6a62';
export const STONE_DARK = '#4a463f';
export const SKIN = '#f0c9a0';

/** 絵の広さ（札の上半分に入れる横長の一枚絵） */
export const ART_W = 320;
export const ART_H = 150;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 波の線（左から右へ、山が並ぶ） */
export function wavePath(y: number, amp: number, len: number, from = -10, to = ART_W + 10): string {
  let d = `M${from} ${y}`;
  for (let x = from; x < to; x += len) d += ` q${len / 2} ${-amp} ${len} 0`;
  return d;
}

/** 波の面（上が波の線、下は絵の下端まで） */
export function waveArea(y: number, amp: number, len: number, bottom = ART_H): string {
  return `${wavePath(y, amp, len)} L${ART_W + 10} ${bottom} L-10 ${bottom} Z`;
}

/** 後光（中心から広がる三角の光の束）。n 本、1本おきに描く */
export function raysPath(cx: number, cy: number, n: number, r: number, spread = 0.5, startDeg = -90): string {
  let d = '';
  const step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a0 = (startDeg * Math.PI) / 180 + i * step - (step * spread) / 2;
    const a1 = a0 + step * spread;
    d += `M${cx} ${cy} L${r1(cx + Math.cos(a0) * r)} ${r1(cy + Math.sin(a0) * r)} L${r1(cx + Math.cos(a1) * r)} ${r1(cy + Math.sin(a1) * r)} Z `;
  }
  return d.trim();
}

/** ぎざぎざの星（ぶつかった・光った印） */
export function burstPath(cx: number, cy: number, n: number, rOut: number, rIn: number, startDeg = -90): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (startDeg * Math.PI) / 180 + (i * Math.PI) / n;
    const r = i % 2 === 0 ? rOut : rIn;
    d += `${i === 0 ? 'M' : 'L'}${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r)} `;
  }
  return `${d}Z`;
}

/** うずまき（台風の雲・潮の流れ） */
export function spiralPath(cx: number, cy: number, turns: number, r0: number, r1max: number, startDeg = 0): string {
  const steps = Math.round(turns * 24);
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (startDeg * Math.PI) / 180 + t * turns * Math.PI * 2;
    const r = r0 + (r1max - r0) * t;
    d += `${i === 0 ? 'M' : 'L'}${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r * 0.62)} `;
  }
  return d.trim();
}

/** 決まった並びの乱数（雨・星・雪の置き場所。描くたびに同じ絵にする） */
export function scatter(n: number, seed: number): { x: number; y: number; k: number }[] {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: n }, () => ({ x: next(), y: next(), k: next() }));
}

/** 魚の色（体・ひれ・腹） */
export interface FishTone { body: string; fin: string; belly?: string }

/** めずらしさごとの魚の色（札の絵の「跳ねる魚」） */
export const FISH_TONES: Record<string, FishTone> = {
  common: { body: '#9fb9cc', fin: '#6f93b0' },
  uncommon: { body: '#7dbb8e', fin: '#4f9d5d' },
  rare: { body: '#e86a52', fin: '#c63a26', belly: '#ffe6d6' },
  legendary: { body: KIN, fin: KIN_DARK, belly: KIN_PALE },
  mythical: { body: '#fdf6e0', fin: KIN_LIGHT, belly: '#ffffff' },
};

/** 鯛の色 */
export const TAI_TONE: FishTone = { body: '#e86a52', fin: SHU, belly: '#ffe6d6' };
