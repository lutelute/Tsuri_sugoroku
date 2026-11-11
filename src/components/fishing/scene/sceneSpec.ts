// 釣り場の絵を決める（純粋関数）。どのマスで・いつ釣るかで、遠景・水の種類・空を選ぶ。
// 遊びの中身には関わらない（見た目だけ）。
import type { BoardNode, GameMode } from '../../../game/types';

/** 遠景の土台 */
export type StageBase = 'coast' | 'open' | 'north' | 'south' | 'valley' | 'lake';
/** 遠景に足す名所 */
export type StageLandmark = 'none' | 'fuji' | 'torii' | 'volcano' | 'meoto' | 'lighthouse' | 'bridge';
/** 空（時刻） */
export type StageSky = 'dawn' | 'day' | 'dusk' | 'night';
/** 水の色あい */
export type StageWater = 'sea' | 'river' | 'lake' | 'south';
/** 季節の小物（まちづくりの暦があるときだけ） */
export type StageSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface StageScene {
  base: StageBase;
  landmark: StageLandmark;
  sky: StageSky;
  water: StageWater;
  season: StageSeason | null;
}

/** イベントの釣りなど、場所が分からないときの絵 */
export const DEFAULT_SCENE: StageScene = { base: 'coast', landmark: 'none', sky: 'day', water: 'sea', season: null };

/** 富士の見える釣り場 */
const FUJI = new Set(['numazu', 'shizuoka', 'odawara', 'kamakura', 'yokohama', 'tokyo']);
/** 海に立つ鳥居（宮島） */
const TORII = new Set(['hiroshima']);
/** 夫婦岩（伊勢・鳥羽） */
const MEOTO = new Set(['ise', 'toba']);
/** 煙を上げる火山（桜島・霧島） */
const VOLCANO = new Set(['kagoshima', 'kirishima']);
/** 岬の灯台 */
const LIGHTHOUSE = new Set(['choshi', 'wakayama']);
/** 川にかかる橋（錦帯橋） */
const BRIDGE = new Set(['iwakuni']);
/** 南の島 */
const SOUTH = new Set(['amami', 'tokunoshima', 'naha', 'yakushima', 'tanegashima', 'aoshima', 'miyazaki']);
/** 雪の山なみが見える北の海 */
const NORTH_EXTRA = new Set(['toyama', 'niigata']);
/** 説明文に川の字が無い、内陸の町 */
const INLAND = new Set(['asahikawa', 'sapporo', 'yamagata', 'fukushima', 'nikko', 'nagano', 'takayama', 'matsumoto', 'kyoto', 'nara', 'saga', 'iwakuni']);

const RIVER_WORD = /渓流|清流|川/;
const LAKE_WORD = /湖/;

function landmarkOf(id: string): StageLandmark {
  if (FUJI.has(id)) return 'fuji';
  if (TORII.has(id)) return 'torii';
  if (MEOTO.has(id)) return 'meoto';
  if (VOLCANO.has(id)) return 'volcano';
  if (LIGHTHOUSE.has(id)) return 'lighthouse';
  if (BRIDGE.has(id)) return 'bridge';
  return 'none';
}

/** 月（1〜12）→ 季節 */
export function seasonOfMonth(month: number): StageSeason {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** 釣り旅の空: 巡と、その手番で何回目の釣りかで時刻が進む */
const TRIP_SKIES: StageSky[] = ['dawn', 'day', 'day', 'dusk', 'night'];
/** まちづくりの空: 季節ごとの2つを行き来する */
const SEASON_SKIES: Record<StageSeason, StageSky[]> = {
  spring: ['dawn', 'day'],
  summer: ['day', 'dusk'],
  autumn: ['dusk', 'day'],
  winter: ['night', 'dawn'],
};

export interface SceneInput {
  node?: Pick<BoardNode, 'id' | 'type' | 'region' | 'description' | 'routeTheme'> | null;
  boat?: boolean;
  mode?: GameMode;
  /** 何巡目か（1〜） */
  turn?: number;
  /** この手番で済ませた行動の数（同じ手番で釣り直すと時刻が進む） */
  actions?: number;
  /** まちづくりの月（1〜12）。あれば季節の空にする */
  month?: number | null;
}

/** 釣り場の絵を決める */
export function pickScene({ node, boat = false, mode = 'fishing', turn = 1, actions = 0, month = null }: SceneInput): StageScene {
  const id = node?.id ?? '';
  const desc = node?.description ?? '';
  const step = Math.max(0, Math.floor(turn) - 1) + Math.max(0, Math.floor(actions));

  let season: StageSeason | null = null;
  let sky: StageSky;
  if (mode === 'city' && month) {
    season = seasonOfMonth(month);
    const list = SEASON_SKIES[season];
    sky = list[step % list.length];
  } else {
    sky = TRIP_SKIES[step % TRIP_SKIES.length];
  }

  const landmark = landmarkOf(id);
  const south = SOUTH.has(id);

  // 船釣りは沖へ出る（富士だけは沖からも小さく見える）
  if (boat) {
    return { base: 'open', landmark: landmark === 'fuji' ? 'fuji' : 'none', sky, water: south ? 'south' : 'sea', season };
  }

  if (LAKE_WORD.test(desc)) return { base: 'lake', landmark: 'none', sky, water: 'lake', season };

  const river = RIVER_WORD.test(desc) || INLAND.has(id)
    || (node?.type === 'route' && (node.routeTheme === 'river' || node.routeTheme === 'mountain'));
  if (river) return { base: 'valley', landmark: landmark === 'bridge' ? 'bridge' : 'none', sky, water: 'river', season };

  if (south) return { base: 'south', landmark: 'none', sky, water: 'south', season };
  if (landmark === 'volcano' || landmark === 'fuji') return { base: 'coast', landmark, sky, water: 'sea', season };

  const north = node?.region === 'hokkaido' || node?.region === 'tohoku' || NORTH_EXTRA.has(id);
  if (north) return { base: 'north', landmark, sky, water: 'sea', season };

  return { base: 'coast', landmark, sky, water: 'sea', season };
}
