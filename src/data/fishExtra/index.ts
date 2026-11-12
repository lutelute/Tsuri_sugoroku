// 図鑑に足した魚（1000 種図鑑）。1 ファイル＝1 つの群（川・磯・沖・深海・南の海…）。
// 群のファイルは `export const PACK: FishPack = { fish: [...], forms: {...} }` を出し、ここに並べる。
// 足したら `npx vitest run src/data/fishExtra src/components/shared/fishArt` を通す。
import type { Fish } from '../../game/types';
import { PACK as P01 } from './p01Freshwater';
import { PACK as P02 } from './p02Rocky';
import type { FishFormEntry, LegacyEntry } from '../../components/shared/fishArt/types';

export interface FishPack {
  fish: Fish[];
  /** 魚ごとの絵の指定（型・模様・色）。キーは魚の id */
  forms: Record<string, FishFormEntry | LegacyEntry>;
}

const PACKS: FishPack[] = [
  P01,
  P02,
];

export const EXTRA_FISH: Fish[] = PACKS.flatMap(p => p.fish);
export const EXTRA_FORMS: Record<string, FishFormEntry | LegacyEntry> = Object.assign({}, ...PACKS.map(p => p.forms));
