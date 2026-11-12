import type { Fish, FishRarity, FishingRig, PlayerEquipment, Region, CaughtFish } from './types';
import { BASE_FISH_IDS, FISH_DATABASE } from '../data/fishDatabase';
import { NODE_MAP } from '../data/boardNodes';
import {
  LURE_RARE_BONUS, LURE_BITE_SPEED_BONUS, EQUIPMENT_WEIGHTS,
  ROD_SIZE_BONUS, ROD_RARITY_BOOST, LURE_TAIRYOU_CHANCE,
  TAIRYOU_BONUS_MIN, TAIRYOU_BONUS_MAX,
  FISHING_BITE_MIN_MS, FISHING_BITE_MAX_MS,
  FISHING_STRIKE_GREEN_ZONE_BASE, FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL,
  RARITY_BASE_WEIGHT, SPECIAL_SPOT_RARE_BONUS,
  SPECIAL_SPOT_LEGENDARY_MULT, SPECIAL_SPOT_MYTHICAL_MULT,
  FISH_SELL_PRICE, REGION_COMPLETE_SPECIES,
} from './constants';
import type { EquipmentAbility } from './constants';
import { getEquipmentLevels, getEquippedItem, getEquippedLevel } from './equipment';
import { weightedRandom, randomFloat, random } from '../utils/random';

// ストライク緑ゾーンの幅（0-1）。WaitingPhaseの描画とuseFishingの当たり判定で共有する単一の真実。
export function getStrikeGreenZone(strikeLevel: number): number {
  return FISHING_STRIKE_GREEN_ZONE_BASE + FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL * (strikeLevel - 1);
}

// 装備の重み付き実効レベルを計算
export function getEffectiveLevel(equipment: PlayerEquipment, ability: EquipmentAbility): number {
  const levels = getEquipmentLevels(equipment);
  const w = EQUIPMENT_WEIGHTS[ability];
  return levels.rod * w.rod + levels.reel * w.reel + levels.lure * w.lure;
}

// レベル別配列から実数レベルで補間して値を取得
export function interpolateBonus(values: number[], level: number): number {
  const clamped = Math.max(1, Math.min(values.length - 1, level));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  if (lower === upper) return values[lower];
  const frac = clamped - lower;
  return values[lower] * (1 - frac) + values[upper] * frac;
}

export function getAvailableFish(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
): Fish[] {
  const levels = getEquipmentLevels(equipment);
  const avgLevel = (levels.rod + levels.reel + levels.lure) / 3;

  return FISH_DATABASE.filter(fish => {
    if (fish.minEquipmentLevel > avgLevel + 1) return false;
    if (fish.limitedNodes && !fish.limitedNodes.includes(nodeId)) return false;
    if (!fish.limitedNodes && !fish.regions.includes(region)) return false;
    return true;
  });
}

/** レア度の順番（数が大きいほどめずらしい） */
export const RARITY_RANK: Record<FishRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3, mythical: 4 };

/**
 * selectFish への補正（漁場の荒れ・豊かな海・仕掛け）。
 * 何も渡さなければ今までと同じ結果になり、乱数を呼ぶ回数と順番も変わらない。
 */
export interface FishSelectOpts {
  /** rare 以上の重みに掛ける（豊かな海・大物ねらい） */
  rareMul?: number;
  /** common の重みに掛ける（大物ねらい） */
  commonMul?: number;
  /** common しか出ない（ひどく荒れた漁場） */
  commonOnly?: boolean;
  /** これより上のレア度は出ない（数ねらいは uncommon まで） */
  maxRarity?: FishRarity;
}

/** 2つの補正を重ねる（倍率は掛け算、レア度の上限は低い方）。どちらも無ければ undefined */
export function mergeSelectOpts(a?: FishSelectOpts, b?: FishSelectOpts): FishSelectOpts | undefined {
  if (!a) return b;
  if (!b) return a;
  const caps = [a.maxRarity, b.maxRarity].filter((r): r is FishRarity => !!r);
  const out: FishSelectOpts = {};
  if (a.rareMul !== undefined || b.rareMul !== undefined) out.rareMul = (a.rareMul ?? 1) * (b.rareMul ?? 1);
  if (a.commonMul !== undefined || b.commonMul !== undefined) out.commonMul = (a.commonMul ?? 1) * (b.commonMul ?? 1);
  if (a.commonOnly || b.commonOnly) out.commonOnly = true;
  if (caps.length) out.maxRarity = caps.reduce((lo, r) => (RARITY_RANK[r] < RARITY_RANK[lo] ? r : lo));
  return out;
}

/** 1匹ごとの出やすさ（重み）。selectFish の抽選と、釣り場の札・売値の見込みで同じ式を使う */
function fishWeigher(equipment: PlayerEquipment, isSpecialSpot: boolean, opts?: FishSelectOpts): (fish: Fish) => number {
  const rareLevel = getEffectiveLevel(equipment, 'rareChance');
  const rareBonus = interpolateBonus(LURE_RARE_BONUS, rareLevel);
  // 竿によるレア度全体ブースト
  const rarityBoostLevel = getEffectiveLevel(equipment, 'rarityBoost');
  const rarityBoost = interpolateBonus(ROD_RARITY_BOOST, rarityBoostLevel);
  const specialBonus = isSpecialSpot ? SPECIAL_SPOT_RARE_BONUS : 0;
  // rare以上に共通でかかる倍率（ルアー＋竿＋特別スポット）
  const highTierMult = 1 + rareBonus + rarityBoost + specialBonus;
  const rareMul = opts?.rareMul;
  const commonMul = opts?.commonMul;

  // 1匹あたりの出現重みを算出。特別スポットでは legendary/mythical をさらに大きく底上げする。
  return (fish: Fish): number => {
    let weight = RARITY_BASE_WEIGHT[fish.rarity] ?? 1;
    switch (fish.rarity) {
      case 'rare':
        weight *= highTierMult;
        break;
      case 'legendary':
        weight *= highTierMult * (isSpecialSpot ? SPECIAL_SPOT_LEGENDARY_MULT : 1);
        break;
      case 'mythical':
        weight *= highTierMult * (isSpecialSpot ? SPECIAL_SPOT_MYTHICAL_MULT : 1);
        break;
      case 'uncommon':
        weight *= (1 + rarityBoost * 0.5);
        break;
      case 'common':
        // 竿レア度ブーストでcommonの出現率を少し下げる
        if (rarityBoost > 0) weight *= Math.max(0.3, 1 - rarityBoost * 0.6);
        break;
    }
    // 補正（漁場・仕掛け）。渡されたときだけ掛ける
    if (rareMul !== undefined && RARITY_RANK[fish.rarity] >= RARITY_RANK.rare) weight *= rareMul;
    if (commonMul !== undefined && fish.rarity === 'common') weight *= commonMul;
    return weight;
  };
}

/** 補正のレア度の上限（commonOnly は common まで）を掛けた候補。1匹も残らなければ元の候補のまま */
function capByRarity(available: Fish[], opts?: FishSelectOpts): Fish[] {
  const cap = opts?.commonOnly ? 'common' : opts?.maxRarity;
  if (!cap) return available;
  const capped = available.filter(f => RARITY_RANK[f.rarity] <= RARITY_RANK[cap]);
  return capped.length > 0 ? capped : available;
}

/**
 * 抽選に入る魚と重み（selectFish と同じ候補・同じ重み。乱数は使わない）。
 * 釣り場の札や「1匹 約¥◯」の見込みに使う。竿が無い・候補が無いときは空。
 */
/**
 * 種が増えても、めずらしさごとの出やすさを変えない（1000 種図鑑）。
 * 魚の重みは「めずらしさの重み × 種の数」で効くので、足した魚は、その場所にいる もとの 300 種と
 * 同じめずらしさの重みを分け合う（もとの種が1匹もいないめずらしさは、そのまま）。
 */
function speciesShare(pool: readonly Fish[]): (fish: Fish) => number {
  const all: Partial<Record<string, number>> = {}, base: Partial<Record<string, number>> = {};
  for (const f of pool) {
    all[f.rarity] = (all[f.rarity] ?? 0) + 1;
    if (BASE_FISH_IDS.has(f.id)) base[f.rarity] = (base[f.rarity] ?? 0) + 1;
  }
  return f => { const b = base[f.rarity]; return b ? b / (all[f.rarity] ?? b) : 1; };
}
const weighOver = (pool: readonly Fish[], w: (f: Fish) => number): number[] => {
  const share = speciesShare(pool);
  return pool.map(f => w(f) * share(f));
};
/**
 * 抽選の前に、めずらしさの順に並べる（同じめずらしさの中は図鑑の順）。重みの合計がめずらしさごとに
 * 変わらないので、種を足しても同じ乱数は同じめずらしさに当たる（シミュレーションが種の数で揺れない）。
 */
function drawFrom(pool: readonly Fish[], w: (f: Fish) => number): Fish {
  const sorted = [...pool].sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);
  return weightedRandom(sorted, weighOver(sorted, w));
}

export function fishOdds(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
  isSpecialSpot: boolean,
  boatFishing?: boolean,
  opts?: FishSelectOpts,
): { fish: Fish; weight: number }[] {
  const available = capByRarity(getAvailableFish(nodeId, region, equipment), opts);
  if (available.length === 0) return [];
  if (!getEquippedItem(equipment, 'lure')) {
    return available.filter(f => f.rarity === 'common').map(fish => ({ fish, weight: 1 }));
  }
  const computeWeight = fishWeigher(equipment, isSpecialSpot, opts);
  let pool = available;
  if (boatFishing) {
    const rareOrAbove = available.filter(f => RARITY_RANK[f.rarity] >= RARITY_RANK.rare);
    const uncommonOrAbove = available.filter(f => f.rarity !== 'common');
    pool = rareOrAbove.length > 0 ? rareOrAbove : uncommonOrAbove.length > 0 ? uncommonOrAbove : available;
  }
  const weights = weighOver(pool, computeWeight);
  return pool.map((fish, i) => ({ fish, weight: weights[i] }));
}

export function selectFish(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
  isSpecialSpot: boolean,
  boatFishing?: boolean,
  opts?: FishSelectOpts,
): Fish {
  const available = capByRarity(getAvailableFish(nodeId, region, equipment), opts);

  if (available.length === 0) {
    return FISH_DATABASE.find(f => f.rarity === 'common')!;
  }

  // ルアーなし: コモンのみ
  if (!getEquippedItem(equipment, 'lure')) {
    const commonOnly = available.filter(f => f.rarity === 'common');
    if (commonOnly.length > 0) {
      return commonOnly[Math.floor(random() * commonOnly.length)];
    }
    return FISH_DATABASE.find(f => f.rarity === 'common')!;
  }

  const computeWeight = fishWeigher(equipment, isSpecialSpot, opts);

  // 船釣り: レア以上の魚のみ（高レア度ブーストもそのまま適用＝幻の魚に最も近づける手段）
  if (boatFishing) {
    const rareOrAbove = available.filter(
      f => f.rarity === 'rare' || f.rarity === 'legendary' || f.rarity === 'mythical',
    );
    if (rareOrAbove.length > 0) {
      return drawFrom(rareOrAbove, computeWeight);
    }
    // レア以上がいない場合はuncommon以上
    const uncommonOrAbove = available.filter(f => f.rarity !== 'common');
    if (uncommonOrAbove.length > 0) {
      return drawFrom(uncommonOrAbove, computeWeight);
    }
  }

  return drawFrom(available, computeWeight);
}

export function generateFishSize(equipment?: PlayerEquipment): number {
  // 正規分布風: 平均1.0, ほとんど0.5-1.5, まれに2.0
  const u1 = random();
  const u2 = random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  // 竿のサイズボーナス: 平均サイズが上がる + 上限も拡大
  const sizeLevel = equipment ? getEffectiveLevel(equipment, 'sizeBonus') : 0;
  const sizeBonus = sizeLevel > 0 ? interpolateBonus(ROD_SIZE_BONUS, sizeLevel) : 0;
  const base = 1.0 + sizeBonus;
  const maxSize = 2.0 + sizeBonus * 0.5;
  return Math.max(0.5, Math.min(maxSize, base + normal * 0.25));
}

// 大漁チェック: ルアー主体で追加の魚を獲得できるか判定
// extraChance: 仕掛けの上乗せ（数ねらい）。乱数の使い方は変わらない
export function checkTairyou(equipment: PlayerEquipment, isSpecialSpot: boolean, extraChance = 0): number {
  const tairyouLevel = getEffectiveLevel(equipment, 'tairyouChance');
  const baseChance = interpolateBonus(LURE_TAIRYOU_CHANCE, tairyouLevel);
  const chance = baseChance + (isSpecialSpot ? 0.1 : 0) + extraChance;

  if (random() >= chance) return 0;

  // 大漁発動！ 1〜3匹追加
  return TAIRYOU_BONUS_MIN + Math.floor(random() * (TAIRYOU_BONUS_MAX - TAIRYOU_BONUS_MIN + 1));
}

export function calculateFishPoints(fish: Fish, size: number, bonusMultiplier: number): number {
  return Math.round(fish.points * size * bonusMultiplier);
}

// 釣果を生成する。equipment を渡すと竿のサイズボーナスが反映される。
export function createCaughtFish(fishId: string, nodeId: string, turn: number, equipment?: PlayerEquipment): CaughtFish {
  return {
    fishId,
    caughtAt: nodeId,
    turn,
    size: generateFishSize(equipment),
  };
}

export function getBiteDelay(equipment: PlayerEquipment): number {
  const biteLevel = getEffectiveLevel(equipment, 'biteSpeed');
  const speedBonus = interpolateBonus(LURE_BITE_SPEED_BONUS, biteLevel);
  const adjustedMax = FISHING_BITE_MAX_MS * (1 - speedBonus);
  return randomFloat(FISHING_BITE_MIN_MS, Math.max(FISHING_BITE_MIN_MS, adjustedMax));
}

// ===== 仕掛け（数ねらい・ふつう・大物ねらい） =====

export interface RigInfo {
  id: FishingRig;
  name: string;
  /** 釣る場所の呼び名（浅場・岸・深場） */
  place: string;
  desc: string;
  /** 魚の抽選への補正（ふつうは無し） */
  select?: FishSelectOpts;
  /** アタリ待ちの長さに掛ける */
  biteMul: number;
  /** 大漁の確率に足す */
  tairyouAdd: number;
  /** 1手番の釣りの枠（MAX_FISHING_PER_TURN）をいくつ使うか */
  slots: number;
  /** 選ぶのに要る竿のレベル（0 は制限なし） */
  minRodLevel: number;
  /** 逃がしたときの道具の傷みの倍率（釣り旅だけ。まちづくりでは道具は傷まない） */
  escapeWearMul: number;
}

/**
 * 仕掛けの数値（釣り係）。balance.fishing.sim.test.ts の「仕掛けの比較」で、3つの1局の得点が2割以内に収まることを確かめている。
 * 数ねらい: 小物だけ・アタリが早い・大漁しやすい（種類集めと売値）。大物ねらい: レア以上が出やすいが、1投で2回ぶんの枠を使う。
 */
export const RIGS: Record<FishingRig, RigInfo> = {
  kazu: {
    id: 'kazu', name: '数ねらい', place: '浅場', desc: '小物がすぐかかる。大漁も多い',
    select: { maxRarity: 'uncommon' }, biteMul: 0.6, tairyouAdd: 0.15, slots: 1, minRodLevel: 0, escapeWearMul: 1,
  },
  futsu: {
    id: 'futsu', name: 'ふつう', place: '岸', desc: '何がかかるかは、お楽しみ',
    biteMul: 1, tairyouAdd: 0, slots: 1, minRodLevel: 0, escapeWearMul: 1,
  },
  oomono: {
    id: 'oomono', name: '大物ねらい', place: '深場', desc: '大物が出やすい。当たりは遅い',
    select: { rareMul: 2.5, commonMul: 0.4 }, biteMul: 1.5, tairyouAdd: 0, slots: 2, minRodLevel: 2, escapeWearMul: 2,
  },
};

export const RIG_ORDER: FishingRig[] = ['kazu', 'futsu', 'oomono'];

/** その仕掛けを選べない理由（選べるなら null）。slotsLeft はこの手番で残っている釣りの枠 */
export function rigBlockReason(rig: FishingRig, equipment: PlayerEquipment, slotsLeft: number): string | null {
  const info = RIGS[rig];
  if (!getEquippedItem(equipment, 'rod')) return '竿がない';
  if (info.minRodLevel > 0 && getEquippedLevel(equipment, 'rod') < info.minRodLevel) return `竿 Lv${info.minRodLevel} から`;
  if (slotsLeft <= 0) return 'この手番はもう釣れない';
  if (slotsLeft < info.slots) return `${info.slots}回ぶん使う（残り${slotsLeft}回）`;
  return null;
}

// ===== 雑魚は手早く =====

/** この「巻き」の実効レベル以上なら、合わせに成功したところでやり取りを省いて釣り上げる（設定で切れる） */
export const QUICK_CATCH_LEVEL: Partial<Record<FishRarity, number>> = { common: 2.5, uncommon: 3.5 };
/** 手早く釣り上げたとき、会心の合わせなら大きさに足す */
export const QUICK_CATCH_PERFECT_SIZE = 0.05;

export function canQuickCatch(rarity: FishRarity, equipment: PlayerEquipment): boolean {
  const need = QUICK_CATCH_LEVEL[rarity];
  if (need === undefined || !getEquippedItem(equipment, 'reel')) return false;
  return getEffectiveLevel(equipment, 'reeling') >= need;
}

// ===== 釣り場の札（この釣り場で何が釣れるか） =====

/** その釣り場に棲む魚（道具に関係なく全部。限定の魚はその釣り場だけ） */
export function getSpotFish(nodeId: string, region: Region): Fish[] {
  return FISH_DATABASE.filter(fish => (fish.limitedNodes ? fish.limitedNodes.includes(nodeId) : fish.regions.includes(region)));
}

/** その魚に会うのに要る道具の平均レベル（getAvailableFish の条件の裏返し） */
export function fishNeedLevel(fish: Fish): number {
  return Math.max(1, Math.ceil(fish.minEquipmentLevel - 1));
}

const byRarest = (a: Fish, b: Fish) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.points - a.points || a.id.localeCompare(b.id);

export interface SpotSummary {
  /** この釣り場に棲む魚の種類 */
  total: number;
  /** そのうち、図鑑にまだ無い種類 */
  unseen: number;
  /** 今の道具（と漁場・仕掛け）で抽選に入る種類 */
  catchable: number;
  /** 今の道具で釣れるいちばんの大物 */
  best: Fish | null;
  /** まだ見ていない中でいちばんめずらしい魚（best と同じ魚は選ばない） */
  rarestUnseen: Fish | null;
  /** 道具が足りず今は釣れない魚（いちばん近い目標）と、会うのに要る道具のレベル */
  locked: { fish: Fish; needLevel: number } | null;
  /** 道具が足りず今は釣れない種類の数 */
  lockedCount: number;
}

/** 釣り場の札の中身。seen は図鑑（魚の id → 見たことがある） */
export function summarizeSpot(
  nodeId: string,
  region: Region,
  equipment: PlayerEquipment,
  isSpecialSpot: boolean,
  seen: Record<string, boolean>,
  opts?: FishSelectOpts,
): SpotSummary {
  const all = getSpotFish(nodeId, region);
  const reachable = new Set(getAvailableFish(nodeId, region, equipment).map(f => f.id));
  const catchable = fishOdds(nodeId, region, equipment, isSpecialSpot, false, opts).map(o => o.fish).sort(byRarest);
  const best = catchable[0] ?? null;
  const rarestUnseen = catchable.find(f => !seen[f.id] && f.id !== best?.id) ?? null;
  const lockedFish = all
    .filter(f => !reachable.has(f.id))
    .sort((a, b) => fishNeedLevel(a) - fishNeedLevel(b) || byRarest(a, b));
  return {
    total: all.length,
    unseen: all.filter(f => !seen[f.id]).length,
    catchable: catchable.length,
    best,
    rarestUnseen,
    locked: lockedFish[0] ? { fish: lockedFish[0], needLevel: fishNeedLevel(lockedFish[0]) } : null,
    lockedCount: lockedFish.length,
  };
}

/** その地方の釣り場で釣った種類の数と、地域制覇（REGION_COMPLETE_SPECIES 種）までの残り */
export function regionProgress(caughtFish: CaughtFish[], region: Region): { caught: number; left: number; goal: number } {
  const species = new Set<string>();
  for (const c of caughtFish) {
    if (NODE_MAP.get(c.caughtAt)?.region === region) species.add(c.fishId);
  }
  return { caught: species.size, left: Math.max(0, REGION_COMPLETE_SPECIES - species.size), goal: REGION_COMPLETE_SPECIES };
}

/** 抽選の重みで均した、1匹の基本の売値（大きさの平均こみ。魚市場の倍率は掛けていない）。候補が無ければ 0 */
export function expectedSellPrice(odds: { fish: Fish; weight: number }[], equipment: PlayerEquipment): number {
  const total = odds.reduce((a, o) => a + o.weight, 0);
  if (total <= 0) return 0;
  const sizeLevel = getEffectiveLevel(equipment, 'sizeBonus');
  const avgSize = 1 + (sizeLevel > 0 ? interpolateBonus(ROD_SIZE_BONUS, sizeLevel) : 0);
  return (odds.reduce((a, o) => a + o.weight * (FISH_SELL_PRICE[o.fish.rarity] ?? 200), 0) / total) * avgSize;
}
