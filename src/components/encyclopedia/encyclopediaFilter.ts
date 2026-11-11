// 札の絵係: 図鑑をしぼる札（地方・すみか・めずらしさ・見つけたか）の計算（純粋関数）。
// 図鑑の中身（どの魚がいるか・どこで釣れるか）は変えず、並べる魚を選ぶだけ。
import type { Fish, FishRarity, Region } from '../../game/types';

export const RARITY_ORDER: FishRarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];

export const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  legendary: 'レジェンダリー',
  mythical: 'ミシカル',
};

/** 地方の名前（図鑑での呼び方） */
export const REGION_LABELS: Record<Region, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州',
};
export const REGION_ORDER: Region[] = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'];

/** すみかのまとまり（13 種のすみかを 4 つにまとめる） */
export type HabitatGroup = 'river' | 'shore' | 'offshore' | 'deep';

export const HABITAT_GROUPS: { id: HabitatGroup; label: string; habitats: string[] }[] = [
  { id: 'river', label: '川と湖', habitats: ['渓流', '清流', '河川', '湖沼', '水田'] },
  { id: 'shore', label: '岸べ', habitats: ['河口', '干潟', '堤防', '砂浜', '磯'] },
  { id: 'offshore', label: '沖', habitats: ['沖合', '外洋'] },
  { id: 'deep', label: '深海', habitats: ['深海'] },
];

/** すみかの名前から、まとまりを決める（知らない名前は「沖」にする） */
export function habitatGroupOf(habitat: string): HabitatGroup {
  return HABITAT_GROUPS.find(g => g.habitats.includes(habitat))?.id ?? 'offshore';
}

export interface FishFilter {
  region: Region | 'all';
  habitat: HabitatGroup | 'all';
  rarity: FishRarity | 'all';
  /** all=すべて / found=見つけた魚だけ / yet=まだの魚だけ */
  found: 'all' | 'found' | 'yet';
}

export const NO_FILTER: FishFilter = { region: 'all', habitat: 'all', rarity: 'all', found: 'all' };

/** しぼった魚の並び（もとの順のまま） */
export function filterFish(list: Fish[], f: FishFilter, encyclopedia: Record<string, boolean>): Fish[] {
  return list.filter(fish => {
    if (f.region !== 'all' && !fish.regions.includes(f.region)) return false;
    if (f.habitat !== 'all' && habitatGroupOf(fish.habitat) !== f.habitat) return false;
    if (f.rarity !== 'all' && fish.rarity !== f.rarity) return false;
    if (f.found === 'found' && !encyclopedia[fish.id]) return false;
    if (f.found === 'yet' && encyclopedia[fish.id]) return false;
    return true;
  });
}

/** めずらしさごとの、見つけた数と全部の数 */
export function rarityProgress(list: Fish[], encyclopedia: Record<string, boolean>): Record<FishRarity, { found: number; total: number }> {
  const out = Object.fromEntries(RARITY_ORDER.map(r => [r, { found: 0, total: 0 }])) as Record<FishRarity, { found: number; total: number }>;
  for (const fish of list) {
    out[fish.rarity].total += 1;
    if (encyclopedia[fish.id]) out[fish.rarity].found += 1;
  }
  return out;
}

/** しぼる札まわりの文 */
export const FILTER_TEXT = {
  region: '地方',
  habitat: 'すみか',
  all: 'すべて',
  found: '見つけた',
  yet: 'まだ',
  none: 'この組み合わせの魚はいません',
  reset: 'しぼりこみをやめる',
} as const;
