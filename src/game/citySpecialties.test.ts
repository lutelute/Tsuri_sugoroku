import { describe, it, expect } from 'vitest';
import { REALISTIC_NODES } from '../data/realisticData_nodes';
import { CITY_SPECIALTIES, SPECIALTY_REGION_NAME } from '../data/citySpecialties';
import { toRubySegments } from '../data/furigana';
import { isTown } from './city';
import {
  SPECIALTY_ECONOMY, SPECIALTY_IDS, SPECIALTY_REGIONS, regionOfSpecialty, regionSpecialtyIds, specialtySeasonMul,
  specialtySeasonLabel, specialtyValue, specialtyBuyCost, specialtyIncome, specialtyMonthlyIncome, specialtyIncomes,
  regionalMonopolies, isSpecialtyMonopolized, playerSpecialtyValue, playerSpecialtyCount, regionProgress,
  specialtyTitles, specialtyTitle, buySpecialty,
} from './citySpecialties';
import type { SpecialtyOwners } from './citySpecialties';

const CAPITALS = REALISTIC_NODES.filter(n => n.type === 'capital');
const NODE_BY_ID = new Map(REALISTIC_NODES.map(n => [n.id, n]));
/** 県庁以外に置いた名産（県庁が2つしかない地方の補い） */
const NON_CAPITAL = Object.keys(CITY_SPECIALTIES).filter(id => NODE_BY_ID.get(id)?.type !== 'capital');

/** 地方の名産をすべて player に持たせる */
function ownRegion(owners: Record<string, number>, region: Parameters<typeof regionSpecialtyIds>[0], player: number): Record<string, number> {
  const next = { ...owners };
  for (const id of regionSpecialtyIds(region)) next[id] = player;
  return next;
}

describe('名産: データの網羅', () => {
  it('盤面の県庁マスすべてに名産があり、表の名産はすべて盤面に並ぶ', () => {
    expect(CAPITALS.length).toBeGreaterThan(0);
    const missing = CAPITALS.filter(n => !CITY_SPECIALTIES[n.id]).map(n => n.id);
    expect(missing).toEqual([]);
    expect(SPECIALTY_IDS.length).toBe(Object.keys(CITY_SPECIALTIES).length);
    expect(SPECIALTY_IDS.length).toBeGreaterThan(CAPITALS.length);
  });

  it('名産は町のマス（isTown）にだけあり、nodeId がキーと一致する', () => {
    for (const [key, sp] of Object.entries(CITY_SPECIALTIES)) {
      expect(isTown(NODE_BY_ID.get(key)), key).toBe(true);
      expect(sp.nodeId).toBe(key);
    }
  });

  it('県庁以外の名産は、県庁が2つ以下の地方を3つにする補いだけ', () => {
    expect(NON_CAPITAL.length).toBeGreaterThan(0);
    for (const id of NON_CAPITAL) {
      const region = regionOfSpecialty(id)!;
      const capitalsInRegion = CAPITALS.filter(n => n.region === region).length;
      expect(capitalsInRegion, id).toBeLessThan(3);
      expect(regionSpecialtyIds(region).length, id).toBe(3);
    }
  });

  it('価格は¥4,000〜¥12,000の千円単位で、名前と絵は重ならない', () => {
    const all = Object.values(CITY_SPECIALTIES);
    for (const sp of all) {
      expect(sp.price, sp.nodeId).toBeGreaterThanOrEqual(4000);
      expect(sp.price, sp.nodeId).toBeLessThanOrEqual(12000);
      expect(sp.price % 1000, sp.nodeId).toBe(0);
      expect(sp.short.length, sp.nodeId).toBeLessThanOrEqual(4);
      expect(sp.flavor.length, sp.nodeId).toBeGreaterThan(0);
    }
    expect(new Set(all.map(s => s.name)).size).toBe(all.length);
    expect(new Set(all.map(s => s.icon)).size).toBe(all.length);
  });

  it('季節の表は1〜12月の正の倍率で、1年の平均はほぼ1.0（月収=価格の5%の流儀を保つ）', () => {
    for (const sp of Object.values(CITY_SPECIALTIES)) {
      for (const [m, v] of Object.entries(sp.season)) {
        const month = Number(m);
        expect(Number.isInteger(month) && month >= 1 && month <= 12, `${sp.nodeId}:${m}`).toBe(true);
        expect(v!, `${sp.nodeId}:${m}`).toBeGreaterThan(0);
      }
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += specialtySeasonMul(sp.nodeId, m);
      expect(sum / 12, sp.nodeId).toBeGreaterThanOrEqual(0.98);
      expect(sum / 12, sp.nodeId).toBeLessThanOrEqual(1.02);
    }
  });

  it('どの地方にも名産が3つ以上あり、2つだけの地方はない（偶然の独占を防ぐ）', () => {
    const regions = new Set(CAPITALS.map(n => n.region));
    expect(new Set(SPECIALTY_REGIONS)).toEqual(regions);
    for (const r of SPECIALTY_REGIONS) {
      expect(regionSpecialtyIds(r).length, r).toBeGreaterThanOrEqual(3);
      expect(SPECIALTY_REGION_NAME[r].length).toBeGreaterThan(0);
    }
    expect(regionOfSpecialty('sapporo')).toBe('hokkaido');
    expect(regionOfSpecialty('hakodate')).toBe('hokkaido');
    expect(regionOfSpecialty('naha')).toBe('kyushu');
    expect(regionOfSpecialty('choshi')).toBeNull();
    expect(regionOfSpecialty('otaru')).toBeNull();
  });

  it('名産の名前・呼び名・称号の漢字にはすべてふりがなが付く', () => {
    const kanji = /[一-鿿]/;
    const texts = [
      ...Object.values(CITY_SPECIALTIES).flatMap(s => [s.name, s.short]),
      ...SPECIALTY_REGIONS.map(specialtyTitle),
    ];
    for (const t of texts) {
      const bare = toRubySegments(t).filter(s => !s.r && kanji.test(s.t)).map(s => s.t);
      expect(bare, t).toEqual([]);
    }
  });
});

describe('名産: 季節と収入', () => {
  it('麦酒は夏、牡蠣は冬に稼ぐ', () => {
    expect(specialtySeasonMul('sapporo', 7)).toBeGreaterThan(specialtySeasonMul('sapporo', 1));
    expect(specialtySeasonMul('hiroshima', 1)).toBeGreaterThan(specialtySeasonMul('hiroshima', 7));
    expect(specialtyIncome('sapporo', 7)).toBeGreaterThan(specialtyIncome('sapporo', 1));
    expect(specialtyIncome('hiroshima', 12)).toBeGreaterThan(specialtyIncome('hiroshima', 8));
  });

  it('表にない月は1.0倍で、月収は価格の5%', () => {
    // 札幌の5月は表にない
    expect(specialtySeasonMul('sapporo', 5)).toBe(1);
    // 月収は incomeRound 円単位に丸める
    const r = SPECIALTY_ECONOMY.incomeRound;
    expect(specialtyIncome('sapporo', 5)).toBe(Math.round((CITY_SPECIALTIES.sapporo.price * SPECIALTY_ECONOMY.incomeRate) / r) * r);
    // 7月は1.6倍: 9000 × 5% × 1.6 = 720
    expect(specialtyIncome('sapporo', 7)).toBe(720);
  });

  it('旬のラベルは月の並びで出す（年をまたぐ旬もひとつながり）', () => {
    expect(specialtySeasonLabel('sapporo')).toBe('6〜8月');
    expect(specialtySeasonLabel('hiroshima')).toBe('11〜3月');
    expect(specialtySeasonLabel('kochi')).toBe('4〜5月・9〜10月');
  });

  it('持ち主にだけ収入が入り、名産のないマスは無視する', () => {
    const owners: SpecialtyOwners = { sapporo: 0, tokyo: 1, choshi: 0 };
    expect(specialtyMonthlyIncome(owners, 0, 5)).toBe(specialtyIncome('sapporo', 5));
    expect(specialtyMonthlyIncome(owners, 1, 5)).toBe(specialtyIncome('tokyo', 5));
    expect(specialtyMonthlyIncome(owners, 2, 5)).toBe(0);
    expect(specialtyIncomes(owners, 3, 5)).toEqual([specialtyIncome('sapporo', 5), specialtyIncome('tokyo', 5), 0]);
    expect(specialtyMonthlyIncome(undefined, 0, 5)).toBe(0);
  });
});

describe('名産: 地方独占', () => {
  it('地方の名産をすべて1人で持つと独占になり、その地方の名産収入が2倍', () => {
    const owners = ownRegion({ tokyo: 0 }, 'hokkaido', 0);
    expect(regionalMonopolies(owners)).toEqual({ hokkaido: 0 });
    expect(isSpecialtyMonopolized(owners, 'sapporo')).toBe(true);
    expect(isSpecialtyMonopolized(owners, 'tokyo')).toBe(false);
    const expected =
      regionSpecialtyIds('hokkaido').reduce((acc, id) => acc + specialtyIncome(id, 7, true), 0) + specialtyIncome('tokyo', 7, false);
    expect(specialtyMonthlyIncome(owners, 0, 7)).toBe(expected);
    expect(specialtyIncome('sapporo', 7, true)).toBe(specialtyIncome('sapporo', 7) * SPECIALTY_ECONOMY.monopolyMul);
    expect(specialtyTitles(owners)).toEqual([{ region: 'hokkaido', playerIndex: 0, title: '北海道の顔役' }]);
  });

  it('1つでも他人や空きが混じれば独占ではない', () => {
    const kyushu = regionSpecialtyIds('kyushu');
    const owners = ownRegion({}, 'kyushu', 1);
    delete owners[kyushu[0]];
    expect(regionalMonopolies(owners)).toEqual({});
    owners[kyushu[0]] = 2;
    expect(regionalMonopolies(owners)).toEqual({});
    const prog = regionProgress(owners, 'kyushu');
    expect(prog.total).toBe(kyushu.length);
    expect(prog.leader).toBe(1);
    expect(prog.leaderCount).toBe(kyushu.length - 1);
    expect(prog.monopolist).toBeNull();
  });

  it('複数の地方をそれぞれ別の人が独占できる', () => {
    const owners = ownRegion(ownRegion({}, 'chubu', 0), 'kinki', 1);
    expect(regionalMonopolies(owners)).toEqual({ chubu: 0, kinki: 1 });
    expect(regionProgress(owners, 'kinki').monopolist).toBe(1);
    expect(specialtyTitles(owners).map(t => t.title)).toEqual(['中部の顔役', '近畿の顔役']);
  });
});

describe('名産: 売買', () => {
  it('空きの名産は価格で買える（元の表は書き換えない）', () => {
    const owners: SpecialtyOwners = {};
    const r = buySpecialty(owners, 'sendai', 0, 20000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(CITY_SPECIALTIES.sendai.price);
    expect(r.owners).toEqual({ sendai: 0 });
    expect(r.prevOwner).toBeUndefined();
    expect(owners).toEqual({});
  });

  it('他人の名産は価値の acquireMul 倍で買収し、元の持ち主を返す', () => {
    const r = buySpecialty({ tokyo: 1 }, 'tokyo', 0, 1e9);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const acquire = Math.round((specialtyValue('tokyo') * SPECIALTY_ECONOMY.acquireMul) / 100) * 100;
    expect(r.cost).toBe(acquire);
    expect(r.cost).toBeGreaterThan(specialtyValue('tokyo'));
    expect(r.prevOwner).toBe(1);
    expect(r.owners.tokyo).toBe(0);
    expect(specialtyBuyCost({ tokyo: 1 }, 'tokyo')).toBe(acquire);
    expect(specialtyBuyCost({}, 'tokyo')).toBe(12000);
  });

  it('お金が足りない・自分の名産・名産のないマスは買えない', () => {
    const price = CITY_SPECIALTIES.kochi.price;
    const short = buySpecialty({}, 'kochi', 0, price - 1);
    expect(short).toEqual({ ok: false, reason: 'お金が足りない' });
    expect(buySpecialty({}, 'kochi', 0, price).ok).toBe(true);
    // 買収は価値の acquireMul 倍が要る
    expect(buySpecialty({ kochi: 1 }, 'kochi', 0, specialtyBuyCost({ kochi: 1 }, 'kochi') - 1).ok).toBe(false);
    expect(buySpecialty({ kochi: 0 }, 'kochi', 0, 1e9)).toEqual({ ok: false, reason: 'すでに自分の名産' });
    expect(buySpecialty({}, 'choshi', 0, 1e9).ok).toBe(false);
  });

  it('最後の1つを買うと独占が完成し、買収で独占が崩れたことも返す', () => {
    const ids = regionSpecialtyIds('chugoku');
    const last = ids[ids.length - 1];
    const allButLast = Object.fromEntries(ids.slice(0, -1).map(id => [id, 0]));
    const done = buySpecialty(allButLast, last, 0, 1e9);
    expect(done.ok && done.monopolyFormed).toBe('chugoku');
    expect(done.ok && done.message).toContain('中国の顔役');

    const broke = buySpecialty(ownRegion({}, 'chugoku', 0), ids[0], 1, 1e9);
    expect(broke.ok && broke.monopolyBroken).toEqual({ region: 'chugoku', playerIndex: 0 });
    expect(broke.ok && broke.monopolyFormed).toBeUndefined();
  });

  it('県庁以外の名産も県庁と同じく買え、収入・資産・地方独占・称号が付く', () => {
    // 北海道は札幌・釧路（県庁）と函館（県庁ではない）
    expect(regionSpecialtyIds('hokkaido')).toContain('hakodate');
    const bought = buySpecialty({}, 'hakodate', 0, 1e9);
    expect(bought.ok && bought.cost).toBe(CITY_SPECIALTIES.hakodate.price);
    const acquired = buySpecialty({ hakodate: 1 }, 'hakodate', 0, 1e9);
    expect(acquired.ok && acquired.prevOwner).toBe(1);
    expect(acquired.ok && acquired.cost).toBe(specialtyBuyCost({ hakodate: 1 }, 'hakodate'));
    expect(specialtyMonthlyIncome({ hakodate: 0 }, 0, 7)).toBe(specialtyIncome('hakodate', 7));
    expect(playerSpecialtyValue({ hakodate: 0 }, 0)).toBe(CITY_SPECIALTIES.hakodate.price);

    // 県庁2つだけでは独占にならず、函館をそろえて初めて「北海道の顔役」
    expect(regionalMonopolies({ sapporo: 0, kushiro: 0 })).toEqual({});
    const done = buySpecialty({ sapporo: 0, kushiro: 0 }, 'hakodate', 0, 1e9);
    expect(done.ok && done.monopolyFormed).toBe('hokkaido');
    expect(done.ok && specialtyTitles(done.owners)).toEqual([{ region: 'hokkaido', playerIndex: 0, title: '北海道の顔役' }]);
    for (const id of NON_CAPITAL) {
      const region = regionOfSpecialty(id)!;
      expect(isSpecialtyMonopolized(ownRegion({}, region, 2), id), id).toBe(true);
    }
  });

  it('資産価値は価格と同じで、持ち主ごとに合計できる', () => {
    const owners: SpecialtyOwners = { tokyo: 0, osaka: 0, kochi: 1 };
    expect(specialtyValue('tokyo')).toBe(12000);
    expect(specialtyValue('choshi')).toBe(0);
    expect(playerSpecialtyValue(owners, 0)).toBe(12000 + CITY_SPECIALTIES.osaka.price);
    expect(playerSpecialtyValue(owners, 1)).toBe(CITY_SPECIALTIES.kochi.price);
    expect(playerSpecialtyCount(owners, 0)).toBe(2);
    expect(playerSpecialtyValue(undefined, 0)).toBe(0);
  });
});
