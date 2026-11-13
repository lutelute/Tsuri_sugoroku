// 図鑑に足した魚（1000 種図鑑）。1 ファイル＝1 つの群（川・磯・沖・深海・南の海…）。
// 群のファイルは `export const PACK: FishPack = { fish: [...], forms: {...} }` を出し、ここに並べる。
// 足したら `npx vitest run src/data/fishExtra src/components/shared/fishArt` を通す。
import type { Fish } from '../../game/types';
import { PACK as P01 } from './p01Freshwater';
import { PACK as P02 } from './p02Rocky';
import { PACK as P03 } from './p03Shore';
import { PACK as P04 } from './p04Offshore';
import { PACK as P05 } from './p05Deep';
import { PACK as P06 } from './p06South';
import { PACK as P07 } from './p07Shellfish';
import { PACK as P08 } from './p08Legend';
import type { FishFormEntry, LegacyEntry } from '../../components/shared/fishArt/types';

export interface FishPack {
  fish: Fish[];
  /** 魚ごとの絵の指定（型・模様・色）。キーは魚の id */
  forms: Record<string, FishFormEntry | LegacyEntry>;
}

const PACKS: FishPack[] = [
  P01,
  P02,
  P03,
  P04,
  P05,
  P06,
  P07,
  P08,
];

export const EXTRA_FISH: Fish[] = PACKS.flatMap(p => p.fish);
export const EXTRA_FORMS: Record<string, FishFormEntry | LegacyEntry> = Object.assign({}, ...PACKS.map(p => p.forms));
