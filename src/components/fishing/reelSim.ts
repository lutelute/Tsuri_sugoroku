// やり取り（リーリング）ミニゲームの純粋シミュレーション。
// React から独立させ、テスト（reelSim.test.ts）でボットに遊ばせて難易度曲線を担保する。
//
// 操作: 長押し（押している間）= 巻く / 離す = 糸を休める。
// 魚の気分（FishMood）が 静か→予兆→暴れ→弱り→静か… と巡回し、レア度で「質」が変わる:
//   - 暴れ中に巻き続けるとテンションが跳ね上がる（手を止めるのが正解。そのぶん糸は出される）
//   - 暴れの後は弱り: 巻き効率が大きく上がる「攻め時」
//   - 予兆は必ず暴れの前に出る（反応の猶予）＝理不尽な即死はない
import type { FishRarity, PlayerEquipment } from '../../game/types';
import { getEffectiveLevel, interpolateBonus } from '../../game/fishing';
import { getEquippedItem } from '../../game/equipment';
import {
  FISHING_REELING_TAP_BASE,
  FISHING_REELING_TAP_PER_REEL_LEVEL,
  FISHING_TENSION_RISE_PER_TAP,
  FISHING_TENSION_DECAY_RATE,
  FISHING_TENSION_BREAK_THRESHOLD,
  FISHING_REELING_TARGET,
  FISHING_REELING_TIME_LIMIT_MS,
  REEL_TENSION_TOLERANCE,
  REEL_TIME_EXTENSION,
  NO_REEL_TAP_MULTIPLIER,
  NO_REEL_TENSION_MULTIPLIER,
} from '../../game/constants';

export type FishMood = 'calm' | 'warn' | 'surge' | 'tired';
export type ReelResult = 'playing' | 'caught' | 'snapped' | 'timeout';

/** レア度ごとの「手応え」。数値の単位は秒・倍率。 */
export interface RarityFeel {
  /** 巻いている間のテンション上昇倍率 */
  tensionMul: number;
  /** 魚が引き戻す力（進捗の自然後退）の倍率 */
  resistMul: number;
  /** 巻き速度の倍率 */
  tapMul: number;
  /** 静かな時間（次の暴れまで）の最小・最大秒 */
  calmMin: number;
  calmMax: number;
  /** 暴れの予兆の秒数（プレイヤーが手を離す猶予） */
  warn: number;
  /** 暴れの秒数 */
  surge: number;
  /** 暴れ中に巻いたときのテンション上昇倍率 */
  surgeTension: number;
  /** 暴れ中の引き戻し倍率 */
  surgePull: number;
  /** 暴れの後の「弱り」秒数（攻め時） */
  tired: number;
  /** 暴れが始まった瞬間に巻いていたときのショック（基本の糸の強さ FISHING_TENSION_BREAK_THRESHOLD に対する割合）。予兆で手を離せば受けない */
  jolt: number;
}

// レア度による難易度・手応え（ミニゲーム係の担当数値）。
// 子供向けバランス: common は暴れが短く穏やかで「手を離す」ことを覚えるだけ。
// legendary は初遭遇の装備（Lv2〜3）でも、暴れを見て指を離せば大半は釣れる。
// mythical は 突進→休み の波がはっきりあり、予兆で指を離さないと糸が切れる。
// ただし最高装備（テンション上限・制限時間延長・竿の衝撃吸収）なら十分釣れる。
// 「装備が良いほど成功率が下がらない」ことも含め、reelSim.test.ts のボット対戦で担保している。
export const RARITY_DIFFICULTY: Record<FishRarity, RarityFeel> = {
  common:    { tensionMul: 1.0,  resistMul: 1.0,  tapMul: 1.0,  calmMin: 3.4, calmMax: 5.2, warn: 0.8,  surge: 0.8, surgeTension: 1.3, surgePull: 1.6, tired: 1.0, jolt: 0 },
  uncommon:  { tensionMul: 1.04, resistMul: 1.08, tapMul: 0.85, calmMin: 3.0, calmMax: 4.6, warn: 0.75, surge: 1.0, surgeTension: 1.6, surgePull: 1.9, tired: 1.1, jolt: 0.06 },
  rare:      { tensionMul: 1.08, resistMul: 1.16, tapMul: 0.8,  calmMin: 2.6, calmMax: 4.0, warn: 0.7,  surge: 1.2, surgeTension: 2.0, surgePull: 2.1, tired: 1.2, jolt: 0.12 },
  legendary: { tensionMul: 1.12, resistMul: 1.24, tapMul: 0.72, calmMin: 2.2, calmMax: 3.4, warn: 0.7,  surge: 1.4, surgeTension: 2.7, surgePull: 2.3, tired: 1.4, jolt: 0.16 },
  mythical:  { tensionMul: 1.16, resistMul: 1.32, tapMul: 0.56, calmMin: 1.9, calmMax: 3.0, warn: 0.6,  surge: 1.6, surgeTension: 3.2, surgePull: 2.6, tired: 1.5, jolt: 0.28 },
};

/** 長押し1秒あたりを「何タップ分」とみなすか（既存のタップ定数を流用するための換算） */
const HOLD_TAPS_PER_SEC = 2.9;
/** 長押し1秒あたりのテンション上昇を「何タップ分」とみなすか */
const HOLD_TENSION_TAPS_PER_SEC = 2.0;
/** 魚の基本引き戻し（進捗/秒）。旧実装の 0.35/50ms と同じ */
const BASE_RESIST_PER_SEC = 7;
/** 離しているときのテンション回復速度（旧 decay 定数からの換算係数） */
const TENSION_DECAY_FACTOR = 140;
/** 竿（strike能力）1レベルあたりの衝撃吸収（暴れ時のテンション倍率を軽減） */
const ROD_SHOCK_ABSORB_PER_LEVEL = 0.06;
/** 弱り中の巻き効率・引き戻し・テンション */
const TIRED_GAIN = 1.5;
const TIRED_PULL = 0.25;
const TIRED_TENSION = 0.7;
/** 暴れ中の巻き効率（巻いてもほとんど進まない） */
const SURGE_GAIN = 0.3;
/** 暴れ中に手を離しているときのテンション回復（通常より遅い） */
const SURGE_DECAY = 0.5;
/** 静か/予兆のとき、巻いている間は魚の引き戻しが弱まる（巻かれて抵抗しきれない） */
const HOLD_PULL = 0.25;
/** パーフェクト合わせの初期進捗 */
export const HEAD_START_PROGRESS = 15;

export interface ReelParams {
  /** 巻き速度（進捗/秒） */
  reelSpeed: number;
  /** 引き戻し（進捗/秒） */
  resist: number;
  /** 巻いている間のテンション上昇（/秒） */
  tensionRise: number;
  /** 離している間のテンション回復（/秒） */
  tensionDecay: number;
  /** この値に達すると糸が切れる */
  tensionLimit: number;
  /** 制限時間（秒） */
  timeLimit: number;
  /** 釣り上げに必要な進捗 */
  target: number;
  /** 暴れ中のテンション倍率（竿の衝撃吸収を反映済み） */
  surgeTension: number;
  /** 暴れ開始時に巻いていた場合のテンション加算量（竿の衝撃吸収を反映済み） */
  jolt: number;
  feel: RarityFeel;
}

/** 装備とレア度からやり取りのパラメータを組み立てる（既存の装備定数をそのまま使う）。 */
export function buildReelParams(equipment: PlayerEquipment, rarity: FishRarity): ReelParams {
  const feel = RARITY_DIFFICULTY[rarity];
  const reelingLevel = getEffectiveLevel(equipment, 'reeling');
  const toleranceLevel = getEffectiveLevel(equipment, 'tensionTolerance');
  const strikeLevel = getEffectiveLevel(equipment, 'strike');

  const tapPower = FISHING_REELING_TAP_BASE + FISHING_REELING_TAP_PER_REEL_LEVEL * (reelingLevel - 1);
  let reelSpeed = tapPower * HOLD_TAPS_PER_SEC * feel.tapMul;
  let tensionRise = FISHING_TENSION_RISE_PER_TAP * HOLD_TENSION_TAPS_PER_SEC * feel.tensionMul;
  const resist = BASE_RESIST_PER_SEC * feel.resistMul;

  // リールなし: 巻き上げが困難（ただし不可能にはしない＝引き戻しより少しだけ速い）
  if (!getEquippedItem(equipment, 'reel')) {
    reelSpeed *= NO_REEL_TAP_MULTIPLIER;
    tensionRise *= NO_REEL_TENSION_MULTIPLIER;
    reelSpeed = Math.max(reelSpeed, resist * 2.2);
  }

  const shockAbsorb = Math.max(0, Math.min(0.3, (strikeLevel - 1) * ROD_SHOCK_ABSORB_PER_LEVEL));

  const params: ReelParams = {
    reelSpeed,
    resist,
    tensionRise,
    tensionDecay: FISHING_TENSION_DECAY_RATE * TENSION_DECAY_FACTOR,
    tensionLimit: FISHING_TENSION_BREAK_THRESHOLD + interpolateBonus(REEL_TENSION_TOLERANCE, toleranceLevel),
    timeLimit: (FISHING_REELING_TIME_LIMIT_MS + interpolateBonus(REEL_TIME_EXTENSION, toleranceLevel)) / 1000,
    target: FISHING_REELING_TARGET,
    surgeTension: 1 + (feel.surgeTension - 1) * (1 - shockAbsorb),
    jolt: 0, // 下で計算
    feel,
  };
  // ショックは「基本の糸の強さ」基準。リールで上がった上限はそのまま余裕になる（装備が良いほど必ず有利）
  params.jolt = FISHING_TENSION_BREAK_THRESHOLD * feel.jolt * (1 - shockAbsorb);
  return params;
}

export interface ReelState {
  progress: number;
  tension: number;
  elapsed: number;
  mood: FishMood;
  /** 現在の気分の残り秒 */
  moodLeft: number;
  /** 現在の気分の長さ（UIの予兆ゲージ用） */
  moodTotal: number;
  surges: number;
  /** 直近で暴れのショック（jolt）を受けた経過時間。演出用（受けていなければ -1） */
  joltAt: number;
  /** 暴れ開始のショック判定待ち */
  joltPending: boolean;
  result: ReelResult;
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function createReelState(params: ReelParams, rng: () => number, headStart = false): ReelState {
  // 最初の暴れは早めに来る（高性能な装備でも一度は「波」を味わう。予兆があるので理不尽ではない）
  const first = randRange(rng, params.feel.calmMin * 0.8, params.feel.calmMin * 1.1);
  return {
    progress: headStart ? HEAD_START_PROGRESS : 0,
    tension: 0,
    elapsed: 0,
    mood: 'calm',
    moodLeft: first,
    moodTotal: first,
    surges: 0,
    joltAt: -1,
    joltPending: false,
    result: 'playing',
  };
}

function nextMood(s: ReelState, p: ReelParams, rng: () => number): void {
  const f = p.feel;
  switch (s.mood) {
    case 'calm':
      s.mood = 'warn';
      s.moodTotal = f.warn;
      break;
    case 'warn':
      s.mood = 'surge';
      s.moodTotal = f.surge;
      s.surges++;
      s.joltPending = true;
      break;
    case 'surge':
      s.mood = 'tired';
      s.moodTotal = f.tired;
      break;
    case 'tired':
      s.mood = 'calm';
      s.moodTotal = randRange(rng, f.calmMin, f.calmMax);
      break;
  }
  s.moodLeft += s.moodTotal;
}

/**
 * シミュレーションを dt 秒進める（state をその場で更新して返す）。
 * holding = 押している（巻いている）か。
 */
export function stepReel(s: ReelState, p: ReelParams, dt: number, holding: boolean, rng: () => number): ReelState {
  if (s.result !== 'playing') return s;

  s.elapsed += dt;
  s.moodLeft -= dt;
  // dt が大きくても気分遷移を取りこぼさない
  let guard = 0;
  while (s.moodLeft <= 0 && guard++ < 8) nextMood(s, p, rng);

  // 暴れ開始の瞬間に巻いていたらショック（予兆で離していれば受けない）
  if (s.joltPending) {
    s.joltPending = false;
    if (holding) {
      s.tension += p.jolt;
      s.joltAt = s.elapsed;
    }
  }

  let gain = p.reelSpeed;
  let pull = p.resist * (holding ? HOLD_PULL : 1);
  let rise = p.tensionRise;
  let decay = p.tensionDecay;
  if (s.mood === 'surge') {
    gain *= SURGE_GAIN;
    pull = p.resist * p.feel.surgePull;
    rise *= p.surgeTension;
    decay *= SURGE_DECAY;
  } else if (s.mood === 'tired') {
    gain *= TIRED_GAIN;
    pull = p.resist * TIRED_PULL;
    rise *= TIRED_TENSION;
  }

  if (holding) {
    s.progress += gain * dt;
    s.tension += rise * dt;
  } else {
    s.tension -= decay * dt;
  }
  s.progress = Math.max(0, s.progress - pull * dt);
  s.tension = Math.max(0, s.tension);

  if (s.tension >= p.tensionLimit) {
    s.tension = p.tensionLimit;
    s.result = 'snapped';
  } else if (s.progress >= p.target) {
    s.progress = p.target;
    s.result = 'caught';
  } else if (s.elapsed >= p.timeLimit) {
    s.result = 'timeout';
  }
  return s;
}
