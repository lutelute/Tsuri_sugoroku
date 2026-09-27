export const APP_VERSION = '4.4.0';

export const ROULETTE_MIN = 1;
export const ROULETTE_MAX = 6;

export const INITIAL_MONEY = 3000;

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
export const PLAYER_DEFAULT_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];

export const MAX_EQUIPMENT_LEVEL = 5;
export const SHOP_TIER_MAX_LEVEL: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
};

// 釣り定数
export const FISHING_BITE_MIN_MS = 1500;
export const FISHING_BITE_MAX_MS = 5000;
// ストライク緑ゾーン: 実効strikeレベル1で27%、レベルごとに+5%（WaitingPhaseの視覚表現とuseFishingの判定で共有する単一の真実）
export const FISHING_STRIKE_GREEN_ZONE_BASE = 0.27;
export const FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL = 0.05;
export const FISHING_REELING_TARGET = 100;
export const FISHING_REELING_TAP_BASE = 7;
export const FISHING_REELING_TAP_PER_REEL_LEVEL = 2;
export const FISHING_TENSION_RISE_PER_TAP = 10;
export const FISHING_TENSION_DECAY_RATE = 0.3;
export const FISHING_TENSION_BREAK_THRESHOLD = 100;

// ルアーの当たり確率補正（レベル別配列、interpolateBonus で補間して使用）
export const LURE_BITE_SPEED_BONUS = [0, 0, 0.15, 0.25, 0.35, 0.5];
export const LURE_RARE_BONUS = [0, 0, 0.05, 0.1, 0.2, 0.35];

// 装備の重み付け: 各装備は全能力に寄与するが、主要能力への貢献が大きい
// rod=釣竿, reel=リール, lure=ルアー/餌
export type EquipmentAbility = 'strike' | 'reeling' | 'rareChance' | 'biteSpeed' | 'sizeBonus' | 'rarityBoost' | 'tensionTolerance' | 'tairyouChance';

export const EQUIPMENT_WEIGHTS: Record<EquipmentAbility, { rod: number; reel: number; lure: number }> = {
  strike:            { rod: 0.6, reel: 0.2, lure: 0.2 },   // 竿が主力
  reeling:           { rod: 0.2, reel: 0.6, lure: 0.2 },   // リールが主力
  rareChance:        { rod: 0.1, reel: 0.2, lure: 0.7 },   // ルアーが主力
  biteSpeed:         { rod: 0.15, reel: 0.15, lure: 0.7 },  // ルアーが主力
  sizeBonus:         { rod: 0.7, reel: 0.2, lure: 0.1 },   // 竿が主力: 大物サイズ
  rarityBoost:       { rod: 0.6, reel: 0.1, lure: 0.3 },   // 竿が主力: レア度全体UP
  tensionTolerance:  { rod: 0.1, reel: 0.7, lure: 0.2 },   // リールが主力: テンション耐性
  tairyouChance:     { rod: 0.1, reel: 0.2, lure: 0.7 },   // ルアーが主力: 大漁チャンス
};

// 竿: サイズボーナス（実効レベル別、interpolateBonus で補間）
export const ROD_SIZE_BONUS = [0, 0, 0.06, 0.14, 0.24, 0.35];
// 竿: レア度全体ブースト（rare以上の出現率倍率）
export const ROD_RARITY_BOOST = [0, 0, 0.08, 0.18, 0.3, 0.45];
// リール: テンション耐性（上限に加算）
export const REEL_TENSION_TOLERANCE = [0, 0, 8, 16, 26, 38];
// リール: リーリング制限時間延長（ミリ秒）
export const REEL_TIME_EXTENSION = [0, 0, 2000, 4000, 7000, 10000];
// ルアー: 大漁チャンス（確率）
export const LURE_TAIRYOU_CHANCE = [0, 0, 0.08, 0.15, 0.25, 0.35];
// 大漁時のボーナス匹数（1〜3匹追加）
export const TAIRYOU_BONUS_MIN = 1;
export const TAIRYOU_BONUS_MAX = 3;

// 高レア度の出現重み（selectFish で使用）。mythical は最高装備＋限定マスでしか出ないため底上げする。
export const RARITY_BASE_WEIGHT: Record<string, number> = {
  common: 50,
  uncommon: 30,
  rare: 12,
  legendary: 5,
  mythical: 3,
};
// 特別釣りスポット(🌟/名マス)での高レア度ブースト。名所は「幻の魚」を狙う場所にする。
export const SPECIAL_SPOT_RARE_BONUS = 0.5;      // rare以上の重み倍率に加算（従来の特別ボーナス）
export const SPECIAL_SPOT_LEGENDARY_MULT = 2;    // 特別スポットで legendary の重み×2
export const SPECIAL_SPOT_MYTHICAL_MULT = 12;    // 特別スポットで mythical の重み×12（名所＝幻の魚の聖地）

// 魚の売却価格（レアリティ別）
// v4.1 調整: 終盤の高レア売却でお金が使い道なく積み上がっていた（80巡で所持金 中央値¥64,000）ため、
// uncommon 以上を引き下げ。釣った魚の価値は主に「魚ポイント」で受け取る。
export const FISH_SELL_PRICE: Record<string, number> = {
  common: 200,
  uncommon: 400,
  rare: 700,
  legendary: 1500,
  mythical: 3000,
};

// スコア計算
// 魚種ごと（ユニーク）に1回だけ付くレア度ボーナス。同じ魚を釣り続けるより「新しい魚種を集める」方が得になるよう強化。
export const RARITY_BONUS: Record<string, number> = {
  common: 0,
  uncommon: 80,
  rare: 250,
  legendary: 800,
  mythical: 2500,
};

// 地域制覇: その地方の釣り場（釣った場所）で REGION_COMPLETE_SPECIES 種以上を釣ると1地方ごとに加点。
// 旧仕様（その地方に棲む魚の50%）は関東162種中81種などが必要で、ほぼ達成不能だった。
export const REGION_COMPLETE_SPECIES = 8;
export const REGION_COMPLETE_BONUS = 1500;
export const ENCYCLOPEDIA_COMPLETION_BONUS_PER_PERCENT = 50;
export const GIANT_FISH_THRESHOLD = 1.5;
export const GIANT_FISH_BONUS = 300;

// ゴール順位ボーナス。旧値(2000〜200)はスコアの2%弱で、到着順がほぼ勝敗に影響しなかった。
export const FINISH_BONUS = [5000, 3000, 1500, 500];
export const GOAL_MONEY_REWARD = [10000, 6000, 3000, 1000]; // ゴール順位別の賞金
// 残金のスコア換算率。旧0.5では残金ボーナスがスコアの35%を占め、釣りより貯金が強かった。
export const MONEY_TO_POINTS_RATE = 0.3;

// 休憩所
export const REST_MONEY_BONUS = 500;

// 装備耐久度
export const DURABILITY_LOSS_BASE = 8;       // 釣り1回あたりの基本消耗
export const DURABILITY_LOSS_PER_LEVEL = -1; // レベルが高いほど消耗が少ない（Lv5で-4）
export const DURABILITY_BROKEN_THRESHOLD = 0; // この値以下で壊れた扱い
export const REPAIR_COST_PER_POINT = 15;     // 耐久度1あたりの修理コスト

// 装備合体
export const MERGE_DURABILITY_BONUS = 15;    // 合体時のボーナス耐久度
export const MERGE_MAX_DURABILITY = 100;     // 合体後の最大耐久度（通常の耐久度上限100に統一）

// 船釣り
export const BOAT_FISHING_COST = 10000;

// リーリング制限時間（ミリ秒）
export const FISHING_REELING_TIME_LIMIT_MS = 20000;

// 装備なしペナルティ
// 竿なし: 釣り不可（FishingChoiceOverlayで制御）
export const NO_REEL_TAP_MULTIPLIER = 0.3;   // リールなし: タップ効果30%
export const NO_REEL_TENSION_MULTIPLIER = 1.8; // リールなし: テンション上昇1.8倍
export const NO_LURE_BITE_DELAY_MULTIPLIER = 2.5; // ルアーなし: バイト待ち2.5倍

// デフォルト設定
// v2.x: ボード拡張(79→207ノード)に合わせて50→80に増量
export const DEFAULT_MAX_TURNS = 80;

// 釣り旅: 最初の人がゴールしてから、この巡数で全体が終了する（早くゴールした人が長く待たされないように）
// v4.3 調整: 10 → 8 → 7。CPU が締め切りの巡を見て進むようになり（cpuStep.ts）、MIN_CLOSE_TURN（deadline.ts）で
// 直行の抜け道も塞いだため、7 でも CPU はほぼ全員（99〜100%）間に合う（balance.fishing.sim.test.ts）。
export const GOAL_CLOSE_ROUNDS = 7;

// 設定画面・タイトルで共有する「前回選んだ遊び方」の保存キー
export const MODE_STORAGE_KEY = 'tsuri_sugoroku_mode';
