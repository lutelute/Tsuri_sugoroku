// 魚の絵の描き方（設定で選ぶ）。React を使わないのでストアからも読める。
import type { Fish, FishBodyShape } from '../../../game/types';
import { FISH_FORMS } from '../../../data/fishForms';
import type { FormId } from './forms';
import type { FishFormEntry } from './types';

/** hanga=木版（標準）/ flat=描き分け / gyotaku=魚拓 / classic=もとの絵 */
export type FishArtPref = 'hanga' | 'flat' | 'gyotaku' | 'classic';
export const FISH_ART_PREFS: readonly FishArtPref[] = ['hanga', 'flat', 'gyotaku', 'classic'];
export const FISH_ART_LABELS: Record<FishArtPref, string> = {
  hanga: '木版',
  flat: '描き分け',
  gyotaku: '魚拓',
  classic: 'もとの絵',
};
export const DEFAULT_FISH_ART: FishArtPref = 'hanga';

/** 型では描かず、もとの絵に任せる形 */
const LEGACY_SHAPES = new Set<FishBodyShape>(['octopus', 'catfish', 'shark', 'whale', 'ray', 'urchin', 'oarfish']);
const DEFAULT_FORM: Partial<Record<FishBodyShape, FormId>> = { standard: 'suzuki', elongated: 'kamasu', flat: 'karei', round: 'fugu',
  eel: 'unagi', squid: 'ika', crab: 'kani', shell_bivalve: 'hamaguri', shell_spiral: 'makigai',
};

export type ResolvedForm = { entry: FishFormEntry } | { legacy: FishBodyShape };

/** 魚をどの型で描くか（指定が無ければ図鑑の形から決める） */
export function resolveFishForm(fish: Fish): ResolvedForm {
  const e = FISH_FORMS[fish.id];
  if (e) return 'legacy' in e ? { legacy: e.legacy } : { entry: e };
  const shape = fish.appearance.bodyShape;
  const form = DEFAULT_FORM[shape];
  if (!form || LEGACY_SHAPES.has(shape)) return { legacy: shape };
  return { entry: { form } };
}
