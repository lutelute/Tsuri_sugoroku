// 結果発表の「この局の名場面」を、今ある状態から求める純粋関数。
// ルールや得点は変えない（game/scoring.ts・game/city.ts の値を読むだけ）。
import type { CaughtFish, Fish, Region } from '../../game/types';
import type { CityHistoryPoint } from '../../game/city';
import type { CityTitle } from '../../game/cityAwards';

interface HasCatches {
  caughtFish: CaughtFish[];
}

/** 自分で釣った魚か（イベント札・祭りでもらった魚は名場面にしない。大漁の追加は自分の釣果） */
export function isSelfCaught(c: CaughtFish): boolean {
  return c.via !== 'event' && c.via !== 'capital';
}

export interface BigCatch {
  playerIndex: number;
  catchIndex: number;
  fish: Fish;
  caught: CaughtFish;
  /** 点 × 大きさ */
  value: number;
}

/** いちばんの大物: 自分で釣った魚のうち「点×大きさ」が最大の1匹（同じなら先に釣ったほう・席の若いほう） */
export function findBigCatch(players: HasCatches[], fishById: Map<string, Fish>): BigCatch | null {
  let best: BigCatch | null = null;
  players.forEach((p, playerIndex) => {
    p.caughtFish.forEach((caught, catchIndex) => {
      if (!isSelfCaught(caught)) return;
      const fish = fishById.get(caught.fishId);
      if (!fish) return;
      const value = fish.points * caught.size;
      if (!best || value > best.value || (value === best.value && caught.turn < best.caught.turn)) {
        best = { playerIndex, catchIndex, fish, caught, value };
      }
    });
  });
  return best;
}

/** 重さの表示（釣果の画面と同じ式） */
export function catchWeightKg(fish: Fish, size: number): string {
  return (fish.weight.min + (fish.weight.max - fish.weight.min) * size).toFixed(1);
}

/** この局で図鑑に新しく載った魚の数（席ごと）。開始時の図鑑が無ければ、いま載っている数 */
export function newSpeciesCounts(
  encyclopedias: (Record<string, boolean> | undefined)[],
  initialEncyclopedias: (Record<string, boolean> | undefined)[],
  playerCount: number,
): number[] {
  return Array.from({ length: playerCount }, (_, i) => {
    const now = encyclopedias[i] ?? {};
    const before = initialEncyclopedias[i] ?? {};
    let n = 0;
    for (const id of Object.keys(now)) if (now[id] && !before[id]) n++;
    return n;
  });
}

export interface RegionCatch {
  playerIndex: number;
  region: Region;
  /** その地方のマスで釣った魚の種類の数 */
  species: number;
}

/**
 * 地方ごとの釣った種類の数（席ごと）。多い順（同じなら席の若いほう）。
 * 数え方は得点の「地域制覇」（scoring.ts）と同じ: 釣った場所のマスの地方で数える。
 */
export function regionCatches(players: HasCatches[], regionOfNode: (nodeId: string) => Region | undefined): RegionCatch[] {
  const out: RegionCatch[] = [];
  players.forEach((p, playerIndex) => {
    const byRegion = new Map<Region, Set<string>>();
    for (const c of p.caughtFish) {
      const region = regionOfNode(c.caughtAt);
      if (!region) continue;
      let set = byRegion.get(region);
      if (!set) {
        set = new Set();
        byRegion.set(region, set);
      }
      set.add(c.fishId);
    }
    for (const [region, set] of byRegion) out.push({ playerIndex, region, species: set.size });
  });
  return out.sort((a, b) => b.species - a.species || a.playerIndex - b.playerIndex);
}

export interface BestMonth {
  playerIndex: number;
  /** 伸びた月の巡（履歴の点の turn） */
  turn: number;
  delta: number;
}

/** いちばん資産が伸びた月: 履歴のとなり合う2点の差が最大のもの（伸びた月が無ければ null） */
export function findBestMonth(history: CityHistoryPoint[], playerCount: number): BestMonth | null {
  let best: BestMonth | null = null;
  for (let t = 1; t < history.length; t++) {
    for (let i = 0; i < playerCount; i++) {
      const delta = (history[t].assets[i] ?? 0) - (history[t - 1].assets[i] ?? 0);
      if (delta > 0 && (!best || delta > best.delta)) best = { playerIndex: i, turn: history[t].turn, delta };
    }
  }
  return best;
}

export interface TownSize {
  nodeId: string;
  population: number;
}

/** いちばん大きな町（人口。誰も住んでいなければ null） */
export function findBiggestTown(towns: Iterable<[string, { population: number }]>): TownSize | null {
  let best: TownSize | null = null;
  for (const [nodeId, s] of towns) {
    if (s.population > 0 && (!best || s.population > best.population)) best = { nodeId, population: s.population };
  }
  return best;
}

export interface TitleTally {
  /** 席ごとの、取った称号の数（罰の称号・公害大王は数えない） */
  counts: number[];
  /** いちばん多く取った席（誰も取っていなければ null。同じなら席の若いほう） */
  top: number | null;
  /** いちばんの席が取った称号（年度の順） */
  topTitles: CityTitle[];
}

/** 取った称号の数（年度ごとの記録から）。公害大王（罰金の称号）は名誉ではないので数えない */
export function tallyTitles(titleHistory: { year: number; titles: CityTitle[] }[], playerCount: number): TitleTally {
  const counts = Array.from({ length: playerCount }, () => 0);
  const byPlayer: CityTitle[][] = Array.from({ length: playerCount }, () => []);
  for (const h of titleHistory) {
    for (const t of h.titles) {
      if (t.prize < 0 || t.playerIndex < 0 || t.playerIndex >= playerCount) continue;
      counts[t.playerIndex]++;
      byPlayer[t.playerIndex].push(t);
    }
  }
  let top: number | null = null;
  counts.forEach((c, i) => {
    if (c > 0 && (top === null || c > counts[top])) top = i;
  });
  return { counts, top, topTitles: top === null ? [] : byPlayer[top] };
}

/** 順に明かす演出: いま count 人のうち shown 人まで明かした（下の順位から）とき、順位 rank（0 = 1位）は見えているか */
export function isRankShown(rank: number, count: number, shown: number): boolean {
  return rank >= count - shown;
}
