// まちづくり: 年度末（3月）の大決算と称号。純粋関数。
// 称号は桃鉄の決算のように、その場の賞金（公害大王は罰金）で盛り上げる。
import type { CityState } from './city';
import { cityScore, computeAllStats, computePowered, distancesFrom, POWER_RANGE, monopolyOwner, calendarLabel } from './city';
import { regionalMonopolies, specialtyTitle } from './citySpecialties';
import type { Region } from './types';

export interface YearEndRank {
  playerIndex: number;
  assets: number;
  assetsDelta: number; // 前年度末（なければ開始時）からの増減
  population: number;
}

export interface CityTitle {
  id: 'choja' | 'jinko' | 'denryoku' | 'kanko' | 'dokusen' | 'kogai' | 'kaoyaku';
  name: string;
  playerIndex: number;
  reason: string;
  prize: number; // 賞金（負なら罰金）
}

export interface YearEndResult {
  year: number;
  ranking: YearEndRank[];
  titles: CityTitle[];
}

// 長者（総資産1位）は名誉だけ。首位に賞金を足すと逃げ切りやすくなるため（難易度調整係の計測: 称号の賞金が序盤収入の6.5%）。
// 顔役は地方ごとに付くので、複数の地方を独占すると重なる。1つあたりは控えめにする。
const TITLE_DEF: Record<CityTitle['id'], { name: string; prize: number }> = {
  choja: { name: '長者', prize: 0 },
  jinko: { name: '人口王', prize: 2500 },
  denryoku: { name: '電力王', prize: 2000 },
  kanko: { name: '観光大臣', prize: 2000 },
  dokusen: { name: '独占王', prize: 2500 },
  kogai: { name: '公害大王', prize: -1500 },
  kaoyaku: { name: '顔役', prize: 1000 },
};

/** 1位を返す（全員0なら誰にも与えない。同点は先の席） */
function topOf(values: number[]): number | null {
  let best = -1;
  let bestV = 0;
  values.forEach((v, i) => {
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best >= 0 ? best : null;
}

export function computeYearEnd(state: CityState, moneys: number[], turn: number, startMoney: number): YearEndResult {
  const n = moneys.length;
  // 年度は4月始まり（1巡目=1年度4月、12巡目=1年度3月）
  const year = Math.floor((turn - 1) / 12) + 1;
  const scores = moneys.map((m, i) => cityScore(state, i, m));

  // 前年度末の総資産（履歴の12か月前。なければ開始資金）
  const prevPoint = [...state.history].reverse().find(h => h.turn <= turn - 12);
  const ranking: YearEndRank[] = scores
    .map((s, i) => ({
      playerIndex: i,
      assets: s.assets,
      assetsDelta: s.assets - (prevPoint?.assets[i] ?? startMoney),
      population: s.population,
    }))
    .sort((a, b) => b.assets - a.assets);

  const stats = computeAllStats(state);
  const powered = computePowered(state);

  // 電力王: 自分の発電所から送電している町の数
  const poweredBy = Array.from({ length: n }, () => new Set<string>());
  for (const [id, town] of Object.entries(state.towns)) {
    for (const p of town.plots) {
      if (p?.kind !== 'power' || p.owner >= n) continue;
      for (const [nid, d] of distancesFrom(id, POWER_RANGE)) {
        if (d <= POWER_RANGE && state.towns[nid] && powered.has(nid)) poweredBy[p.owner].add(nid);
      }
    }
  }

  // 観光大臣: 観光名所の等級の合計 / 独占王: 独占した町の数
  const tourism = Array.from({ length: n }, () => 0);
  const monopolies = Array.from({ length: n }, () => 0);
  for (const town of Object.values(state.towns)) {
    for (const p of town.plots) if (p?.kind === 'tourism' && p.owner < n) tourism[p.owner] += p.level;
    const m = monopolyOwner(town);
    if (m !== null && m < n) monopolies[m]++;
  }

  // 公害大王: いちばん公害のひどい町で、工業をいちばん多く持つ人
  let worstTown: string | null = null;
  let worstPol = 3; // 公害3未満なら該当なし
  for (const [id, s] of stats) {
    if (s.pollution > worstPol) {
      worstPol = s.pollution;
      worstTown = id;
    }
  }
  let kogai: number | null = null;
  if (worstTown) {
    const ind = Array.from({ length: n }, () => 0);
    for (const p of state.towns[worstTown].plots) if (p?.kind === 'ind' && p.owner < n) ind[p.owner] += p.level;
    kogai = topOf(ind);
  }

  const titles: CityTitle[] = [];
  const add = (id: CityTitle['id'], who: number | null, reason: string) => {
    if (who === null) return;
    titles.push({ id, name: TITLE_DEF[id].name, playerIndex: who, reason, prize: TITLE_DEF[id].prize });
  };
  add('choja', ranking[0] && ranking[0].assets > 0 ? ranking[0].playerIndex : null, `総資産 ¥${(ranking[0]?.assets ?? 0).toLocaleString()}`);
  const pop = scores.map(s => s.population);
  add('jinko', topOf(pop), `人口 ${Math.max(0, ...pop).toLocaleString()}人`);
  const pw = poweredBy.map(s => s.size);
  add('denryoku', topOf(pw), `送電先 ${Math.max(0, ...pw)}町`);
  add('kanko', topOf(tourism), `観光名所の等級 計${Math.max(0, ...tourism)}`);
  add('dokusen', topOf(monopolies), `独占 ${Math.max(0, ...monopolies)}町`);
  add('kogai', kogai, `公害 ${worstPol.toFixed(1)} の町の工場主`);
  // 地方の名産をすべて持つ「○○の顔役」（地方ごとに1つ）
  for (const [region, who] of Object.entries(regionalMonopolies(state.specialties)) as [Region, number][]) {
    if (who === undefined || who >= n) continue;
    titles.push({ id: 'kaoyaku', name: specialtyTitle(region), playerIndex: who, reason: '地方の名産をすべて所有', prize: TITLE_DEF.kaoyaku.prize });
  }

  return { year, ranking, titles };
}

/** 年度末（3月）の決算を行う巡目か */
export function isYearEndTurn(turn: number): boolean {
  return calendarLabel(turn).month === 3;
}
