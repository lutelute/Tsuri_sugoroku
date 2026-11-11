// 札の絵係: 道具の能力を、棒で見比べるための計算（純粋関数。表示だけに使い、遊びの計算は変えない）。
// 竿・リール・ルアーはどれも全部の能力に少しずつ効く（EQUIPMENT_WEIGHTS）。
// 「いまの3つの道具」と「この道具に持ちかえたとき」の実効レベル（0〜5）を並べて返す。
import { EQUIPMENT_WEIGHTS } from '../../game/constants';
import type { EquipmentAbility } from '../../game/constants';
import { getEquipmentLevels } from '../../game/equipment';
import type { EquipmentType, PlayerEquipment } from '../../game/types';

/** 棒で見せる能力（上から: 合わせ・巻き・糸の強さ・当たり） */
export const GEAR_STAT_ROWS: { ability: EquipmentAbility; label: string }[] = [
  { ability: 'strike', label: '合わせ' },
  { ability: 'reeling', label: '巻き' },
  { ability: 'tensionTolerance', label: '糸の強さ' },
  { ability: 'biteSpeed', label: '当たり' },
];

/** 実効レベルの上限（棒の右端） */
export const GEAR_STAT_MAX = 5;

export interface GearStatRow {
  ability: EquipmentAbility;
  label: string;
  /** いまの道具での実効レベル（0〜5） */
  now: number;
  /** この道具に持ちかえたときの実効レベル（0〜5） */
  next: number;
}

type Levels = { rod: number; reel: number; lure: number };

function weighted(levels: Levels, ability: EquipmentAbility): number {
  const w = EQUIPMENT_WEIGHTS[ability];
  return levels.rod * w.rod + levels.reel * w.reel + levels.lure * w.lure;
}

/** いまの道具と、type の道具を level のものに持ちかえたときの能力を並べる */
export function gearStatRows(equipment: PlayerEquipment, type: EquipmentType, level: number): GearStatRow[] {
  const now = getEquipmentLevels(equipment);
  const next: Levels = { ...now, [type]: level };
  return GEAR_STAT_ROWS.map(r => ({ ...r, now: weighted(now, r.ability), next: weighted(next, r.ability) }));
}

/** いまつけている同じ種類の道具とくらべて、上がる(1)・同じ(0)・下がる(-1) */
export function gearCompare(equipment: PlayerEquipment, type: EquipmentType, level: number): 1 | 0 | -1 {
  const cur = getEquipmentLevels(equipment)[type];
  return level > cur ? 1 : level < cur ? -1 : 0;
}

/** 耐久度（0〜100）の色の段階: 元気(good)・注意(warn)・あぶない(bad) */
export function durabilityTone(durability: number): 'good' | 'warn' | 'bad' {
  return durability > 50 ? 'good' : durability > 20 ? 'warn' : 'bad';
}

/** いまつけている道具とくらべた印の文 */
export const GEAR_COMPARE_LABEL: Record<1 | 0 | -1, string> = {
  1: 'いまより強い',
  0: 'いまと同じ',
  [-1]: 'いまより弱い',
};

/** 店と道具箱で使う見出しの文 */
export const GEAR_TEXT = {
  nowGear: 'いまの道具',
  nowPower: 'いまの道具と力',
  durability: '耐久',
} as const;
