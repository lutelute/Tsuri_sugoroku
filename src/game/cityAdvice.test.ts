import { describe, it, expect } from 'vitest';
import {
  ADVICE, playerMonthlyIncome, paybackMonths, verdictFor, previewBuild, previewUpgrade, previewAcquire, townNeeds,
} from './cityAdvice';
import type { AdviceReason, AdviceVerdict, BuildPreview, TownNeed } from './cityAdvice';
import { playerMonthlyIncome as fromCpuAI } from './cpuAI';
import { createInitialCityState, build, acquireCost, upgradeCost, buildCost, computeAllStats, CITY_INITIAL_MONEY } from './city';
import type { CityState, BuildingKind } from './city';
import {
  VERDICT_LABEL, VERDICT_LEGEND, NEED_LABEL, gainText, paybackText, earnedText, reasonText, supportText, badReason, goodReason,
} from '../components/city/adviceText';
import { toRubySegments } from '../data/furigana';

function place(s: CityState, id: string, i: number, k: BuildingKind, owner = 0): CityState {
  const r = build(s, id, i, k, owner, 1e9, 1);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

const byKind = (list: BuildPreview[], kind: BuildingKind) => list.find(p => p.kind === kind)!;
const GOOD: AdviceVerdict[] = ['best', 'good'];

describe('見込みの判定の境目', () => {
  it('元を取る月数は端数を切り上げ、収入が増えなければ null', () => {
    expect(paybackMonths(4000, 378)).toBe(11);
    expect(paybackMonths(4000, 400)).toBe(10);
    expect(paybackMonths(4000, 0)).toBeNull();
    expect(paybackMonths(4000, -60)).toBeNull();
  });

  it('◎は12か月以内、○は20か月以内、△は残りの月数以内、×はそれ以上か収入なし', () => {
    expect(verdictFor(ADVICE.bestMonths, 36)).toBe('best');
    expect(verdictFor(ADVICE.bestMonths + 1, 36)).toBe('good');
    expect(verdictFor(ADVICE.goodMonths, 36)).toBe('good');
    expect(verdictFor(ADVICE.goodMonths + 1, 36)).toBe('slow');
    expect(verdictFor(36, 36)).toBe('slow');
    expect(verdictFor(37, 36)).toBe('never');
    expect(verdictFor(null, 36)).toBe('never');
    // 残りが少なくても、12か月以内に元が取れる物は◎のまま（建物は資産として残る）
    expect(verdictFor(11, 5)).toBe('best');
  });

  it('公園・発電所は、元がおそくても×にせず「支え」と出す', () => {
    expect(verdictFor(null, 36, true)).toBe('support');
    expect(verdictFor(30, 36, true)).toBe('support');
    expect(verdictFor(10, 36, true)).toBe('best');
  });
});

describe('建てる前の見込み', () => {
  it('月収の見込みは cpuAI からも同じ関数として読める', () => {
    expect(fromCpuAI).toBe(playerMonthlyIncome);
  });

  it('電気のない東京の商業地は×で、理由は電気', () => {
    const city = createInitialCityState();
    const list = previewBuild(city, 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36);
    const com = byKind(list, 'com');
    expect(com.verdict).toBe('never');
    expect(com.reasons).toContain<AdviceReason>('no_power');
    expect(com.reasons).toContain<AdviceReason>('no_customers');
    expect(com.gain).toBeGreaterThan(0);
    expect(com.payback).toBeGreaterThan(36);
    // 工業地も電気がなくて割に合わない
    expect(byKind(list, 'ind').reasons).toContain<AdviceReason>('no_power');
    expect(GOOD).not.toContain(byKind(list, 'ind').verdict);
  });

  it('見込みの月収は、建てた後と今の月収の差に等しい', () => {
    const city = createInitialCityState();
    const res = byKind(previewBuild(city, 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36), 'res');
    const after = place(city, 'tokyo', 0, 'res', 0);
    expect(res.gain).toBe(playerMonthlyIncome(after, 0) - playerMonthlyIncome(city, 0));
    expect(res.cost).toBe(buildCost('res', 'tokyo', city.towns.tokyo));
    expect(res.payback).toBe(Math.ceil(res.cost / res.gain));
  });

  it('電気のある町の住宅地は○以上で、商業地より早く元が取れる', () => {
    // 相手が発電所を建てて電気が来ている東京
    const city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    expect(computeAllStats(city).get('tokyo')?.powered).toBe(true);
    const list = previewBuild(city, 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36);
    const res = byKind(list, 'res');
    expect(GOOD).toContain(res.verdict);
    expect(res.reasons).not.toContain<AdviceReason>('no_power');
    expect(res.payback!).toBeLessThan(byKind(list, 'com').payback ?? Infinity);
    // 電気のない町より月収が多い
    const dark = byKind(previewBuild(createInitialCityState(), 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36), 'res');
    expect(res.gain).toBeGreaterThan(dark.gain);
  });

  it('独占が完成する建物に印が付き、月収の増え方に独占の倍率が入る', () => {
    let city = createInitialCityState();
    const n = city.towns.sakata.plots.length;
    for (let i = 0; i < n - 1; i++) city = place(city, 'sakata', i, 'res', 0);
    const list = previewBuild(city, 'sakata', n - 1, 0, 50000, 1, 36);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.reasons).toContain<AdviceReason>('completes_monopoly');
    // 独占前の同じ建物（別の人が1つ持っている町）より、ずっと増える
    const mixed = place(createInitialCityState(), 'sakata', 0, 'res', 1);
    const plain = byKind(previewBuild(mixed, 'sakata', 1, 0, 50000, 1, 36), 'res');
    expect(byKind(list, 'res').gain).toBeGreaterThan(plain.gain * 2);
    expect(plain.reasons).not.toContain<AdviceReason>('completes_monopoly');
  });

  it('町長になれる建物に印が付く（独占の完成と重なるときは独占だけ）', () => {
    // 東京は8区画。5つ目で過半数（町長）
    let city = createInitialCityState();
    for (let i = 0; i < 4; i++) city = place(city, 'tokyo', i, 'res', 0);
    const res = byKind(previewBuild(city, 'tokyo', 4, 0, 50000, 1, 36), 'res');
    expect(res.reasons).toContain<AdviceReason>('becomes_mayor');
    expect(res.reasons).not.toContain<AdviceReason>('completes_monopoly');
  });

  it('お金が足りない物も見込みは出すが、おすすめにはしない', () => {
    const city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    const poor = previewBuild(city, 'tokyo', 0, 0, 100, 1, 36);
    for (const p of poor) {
      // 発電所は相手の物がもうあるので、お金とは別の理由で建てられない
      if (p.kind !== 'power') expect(p.blocked).toBe('お金が足りない');
      expect(p.blocked).not.toBeNull();
      expect(p.recommended).toBe(false);
    }
    expect(byKind(poor, 'res').gain).toBeGreaterThan(0);
  });

  it('おすすめは1つだけで、建てられて○以上の、いちばん早く元が取れる物', () => {
    const city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    const list = previewBuild(city, 'tokyo', 0, 0, 50000, 1, 36);
    const rec = list.filter(p => p.recommended);
    expect(rec).toHaveLength(1);
    expect(rec[0].blocked).toBeNull();
    expect(GOOD).toContain(rec[0].verdict);
    const fastest = Math.min(...list.filter(p => !p.blocked && p.payback !== null).map(p => p.payback!));
    expect(rec[0].payback).toBe(fastest);
  });

  it('1つの町に1つまでの発電所は、2つ目を建てられない理由が出る', () => {
    const city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    const power = byKind(previewBuild(city, 'tokyo', 0, 0, 99999, 1, 36), 'power');
    expect(power.blocked).toContain('1つまで');
    expect(power.recommended).toBe(false);
  });

  it('公園は×にせず「支え」と出し、育たない', () => {
    const city = createInitialCityState();
    const park = byKind(previewBuild(city, 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36), 'park');
    expect(park.verdict).toBe('support');
    expect(park.gain).toBeLessThan(0);
    expect(park.payback).toBeNull();
    expect(park.growth).toBe(0);
  });

  it('育ちやすさは 0〜3 で、需要の高い物ほど大きい', () => {
    const city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    const list = previewBuild(city, 'tokyo', 0, 0, 50000, 1, 36);
    for (const p of list) expect([0, 1, 2, 3]).toContain(p.growth);
    expect(byKind(list, 'res').growth).toBeGreaterThan(0);
    expect(byKind(list, 'power').growth).toBe(0);
  });

  it('復興特需の町は割引きの印が付く', () => {
    const base = createInitialCityState();
    const city: CityState = { ...base, towns: { ...base.towns, tokyo: { ...base.towns.tokyo, recovery: 3 } } };
    const res = byKind(previewBuild(city, 'tokyo', 0, 0, CITY_INITIAL_MONEY, 1, 36), 'res');
    expect(res.reasons).toContain<AdviceReason>('recovery_discount');
    expect(res.cost).toBeLessThan(buildCost('res', 'tokyo', base.towns.tokyo));
  });

  it('町でないマスや区画のない町では空を返す', () => {
    expect(previewBuild(createInitialCityState(), 'r_choshi_tokyo', 0, 0, 9999, 1, 36)).toEqual([]);
  });
});

describe('再開発・買収の見込み', () => {
  it('再開発は値段と月収の増え方を返す。自分の建物でなければ null', () => {
    const city = place(place(createInitialCityState(), 'tokyo', 7, 'power', 1), 'tokyo', 0, 'res', 0);
    const up = previewUpgrade(city, 'tokyo', 0, 0, 36)!;
    expect(up.cost).toBe(upgradeCost(city.towns.tokyo.plots[0]!, 'tokyo', city.towns.tokyo));
    expect(up.gain).toBeGreaterThan(0);
    expect(up.payback).toBe(Math.ceil(up.cost / up.gain));
    expect(previewUpgrade(city, 'tokyo', 0, 1)).toBeNull(); // 他人の建物
    expect(previewUpgrade(city, 'tokyo', 7, 1)).toBeNull(); // 発電所は再開発できない
    expect(previewUpgrade(city, 'tokyo', 3, 0)).toBeNull(); // 空き地
  });

  it('買収は代金と、その建物が自分に生む月収を返す', () => {
    const city = place(place(createInitialCityState(), 'tokyo', 7, 'power', 1), 'tokyo', 0, 'res', 1);
    const ac = previewAcquire(city, 'tokyo', 0, 0, 36)!;
    expect(ac.cost).toBe(acquireCost(city.towns.tokyo.plots[0]!, 'tokyo', city.towns.tokyo));
    expect(ac.gain).toBeGreaterThan(0);
    expect(previewAcquire(city, 'tokyo', 0, 1)).toBeNull(); // 自分の建物
  });

  it('買収で独占が完成するなら印が付く', () => {
    let city = createInitialCityState();
    const n = city.towns.sakata.plots.length;
    for (let i = 0; i < n - 1; i++) city = place(city, 'sakata', i, 'res', 0);
    city = place(city, 'sakata', n - 1, 'res', 1);
    expect(previewAcquire(city, 'sakata', n - 1, 0)!.reasons).toContain<AdviceReason>('completes_monopoly');
  });
});

describe('この町に足りないもの', () => {
  it('電気の来ていない町は電気、来ていれば出ない', () => {
    const dark = createInitialCityState();
    expect(townNeeds(dark, 'tokyo')).toContain<TownNeed>('power');
    const lit = place(dark, 'tokyo', 7, 'power', 1);
    expect(townNeeds(lit, 'tokyo')).not.toContain<TownNeed>('power');
  });

  it('幸福度の低い町は公園、公園を建てると出ない', () => {
    const dark = createInitialCityState();
    expect(computeAllStats(dark).get('tokyo')!.happiness).toBeLessThan(ADVICE.needHappiness);
    expect(townNeeds(dark, 'tokyo')).toContain<TownNeed>('park');
    const withPark = place(dark, 'tokyo', 0, 'park', 0);
    expect(townNeeds(withPark, 'tokyo')).not.toContain<TownNeed>('park');
  });

  it('住む人が増えて店と働き口の需要が上がると、お店・働き口が出る（建てられる町だけ）', () => {
    let city = place(createInitialCityState(), 'tokyo', 7, 'power', 1);
    for (let i = 0; i < 5; i++) city = place(city, 'tokyo', i, 'res', 0);
    const st = computeAllStats(city).get('tokyo')!;
    const needs = townNeeds(city, 'tokyo');
    expect(needs.includes('shops')).toBe(st.demand.c >= ADVICE.needDemand);
    expect(needs.includes('jobs')).toBe(st.demand.i >= ADVICE.needDemand);
    expect(needs.includes('homes')).toBe(st.demand.r >= ADVICE.needDemand);
    expect(needs).toContain<TownNeed>('shops');
  });

  it('町でないマスは空', () => {
    expect(townNeeds(createInitialCityState(), 'r_choshi_tokyo')).toEqual([]);
  });
});

describe('見込み札の文', () => {
  const KANJI = /[㐀-䶿一-鿿々]/;
  const unread = (text: string) => toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => `${s.t}（${text}）`);

  it('月収と元を取る月数の文', () => {
    expect(gainText(378)).toBe('月に +¥378');
    expect(gainText(-60)).toBe('月に −¥60');
    expect(paybackText(11)).toBe('11か月で元が取れる');
    expect(paybackText(null)).toBe('元が取れない');
    expect(paybackText(250, 'never')).toBe('終わりまでに元が取れない');
    expect(paybackText(25, 'slow')).toBe('25か月で元が取れる');
    expect(earnedText(212)).toBe('来月から 月に +¥212');
  });

  it('悪い理由は×と△の物にだけ出し、良い理由は独占と町長', () => {
    expect(badReason({ verdict: 'never', reasons: ['recovery_discount', 'no_power', 'low_demand'] })).toBe('no_power');
    expect(badReason({ verdict: 'slow', reasons: ['low_demand'] })).toBe('low_demand');
    expect(badReason({ verdict: 'good', reasons: ['no_power'] })).toBeNull();
    expect(goodReason({ reasons: ['no_power', 'becomes_mayor'] })).toBe('becomes_mayor');
    expect(goodReason({ reasons: ['recovery_discount'] })).toBeNull();
  });

  it('漢字にはすべてふりがなが振られる', () => {
    const reasons: AdviceReason[] = ['no_power', 'no_customers', 'low_demand', 'completes_monopoly', 'becomes_mayor', 'recovery_discount'];
    const kinds: BuildingKind[] = ['res', 'com', 'ind'];
    const texts = [
      ...Object.values(VERDICT_LABEL),
      ...VERDICT_LEGEND.map(l => l.text),
      ...Object.values(NEED_LABEL),
      gainText(378), paybackText(11), paybackText(null), paybackText(250, 'never'), earnedText(212),
      ...reasons.flatMap(r => kinds.map(k => reasonText(r, k))),
      supportText('park'), supportText('power'),
      'この町に足りないもの', 'おすすめ', '育ちやすさ',
    ];
    expect(texts.flatMap(unread)).toEqual([]);
  });

  it('読みは場面に合っている（月に＝つきに、元が取れ＝もとがとれ、住む人＝すむひと）', () => {
    const reading = (text: string) => toRubySegments(text).map(s => s.r ?? s.t).join('');
    expect(reading(gainText(378))).toBe('つきに +¥378');
    expect(reading(paybackText(11))).toBe('11かげつでもとがとれる');
    expect(reading(reasonText('no_customers'))).toBe('ちかくにすむひとがすくない');
    expect(reading(earnedText(212))).toBe('らいげつから つきに +¥212');
  });
});
