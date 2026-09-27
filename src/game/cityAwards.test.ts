import { describe, it, expect, afterEach } from 'vitest';
import { computeYearEnd, isYearEndTurn } from './cityAwards';
import { createInitialCityState, build } from './city';
import type { CityState, BuildingKind } from './city';
import { setRandomSource, resetRandomSource, mulberry32 } from '../utils/random';

function place(s: CityState, id: string, i: number, k: BuildingKind, owner: number, level = 1): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  if (level === 1) return r.state;
  const plots = [...r.state.towns[id].plots];
  plots[i] = { ...plots[i]!, level };
  return { ...r.state, towns: { ...r.state.towns, [id]: { plots } } };
}

afterEach(() => resetRandomSource());

describe('年度末の大決算', () => {
  it('3月（12・24・36巡目）が年度末', () => {
    expect(isYearEndTurn(12)).toBe(true);
    expect(isYearEndTurn(24)).toBe(true);
    expect(isYearEndTurn(11)).toBe(false);
    expect(isYearEndTurn(1)).toBe(false);
  });

  it('番付は総資産の順で、前年比を出す', () => {
    setRandomSource(mulberry32(1));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'res', 1, 3);
    const ye = computeYearEnd(s, [10000, 10000], 12, 12000);
    expect(ye.year).toBe(1);
    expect(ye.ranking[0].playerIndex).toBe(1);
    expect(ye.ranking[1].assetsDelta).toBe(10000 - 12000);
  });

  it('称号は該当者だけに与えられ、公害大王は罰金', () => {
    setRandomSource(mulberry32(1));
    let s = createInitialCityState();
    s = place(s, 'tokyo', 0, 'power', 0);
    s = place(s, 'tokyo', 1, 'res', 1, 3);
    s = place(s, 'tokyo', 2, 'ind', 1, 3);
    s = place(s, 'tokyo', 3, 'ind', 1, 3);
    s = place(s, 'tokyo', 4, 'tourism', 0, 2);
    const ye = computeYearEnd(s, [5000, 5000], 12, 12000);
    const byId = Object.fromEntries(ye.titles.map(t => [t.id, t]));
    expect(byId.denryoku?.playerIndex).toBe(0);
    expect(byId.kanko?.playerIndex).toBe(0);
    expect(byId.jinko?.playerIndex).toBe(1);
    expect(byId.kogai?.playerIndex).toBe(1);
    expect(byId.kogai?.prize).toBeLessThan(0);
    expect(byId.dokusen).toBeUndefined(); // 独占した町はない
  });
});
