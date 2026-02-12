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
export const FISHING_STRIKE_DURATION_MS = 2000;
export const FISHING_STRIKE_GREEN_ZONE_BASE = 0.2;
export const FISHING_STRIKE_GREEN_ZONE_PER_ROD_LEVEL = 0.05;
export const FISHING_REELING_TARGET = 100;
export const FISHING_REELING_TAP_BASE = 7;
export const FISHING_REELING_TAP_PER_REEL_LEVEL = 2;
export const FISHING_TENSION_MAX = 100;
export const FISHING_TENSION_RISE_PER_TAP = 11;
export const FISHING_TENSION_DECAY_RATE = 0.3;
export const FISHING_TENSION_BREAK_THRESHOLD = 100;

// ルアーの当たり確率補正（レベル別配列、interpolateBonus で補間して使用）
export const LURE_BITE_SPEED_BONUS = [0, 0, 0.15, 0.25, 0.35, 0.5];
export const LURE_RARE_BONUS = [0, 0, 0.05, 0.1, 0.2, 0.35];

// 装備の重み付け: 各装備は全能力に寄与するが、主要能力への貢献が大きい
// rod=釣竿, reel=リール, lure=ルアー/餌
export type EquipmentAbility = 'strike' | 'reeling' | 'rareChance' | 'biteSpeed';

export const EQUIPMENT_WEIGHTS: Record<EquipmentAbility, { rod: number; reel: number; lure: number }> = {
  strike:     { rod: 0.6, reel: 0.2, lure: 0.2 },   // 竿が主力
  reeling:    { rod: 0.2, reel: 0.6, lure: 0.2 },   // リールが主力
  rareChance: { rod: 0.1, reel: 0.2, lure: 0.7 },   // ルアーが主力
  biteSpeed:  { rod: 0.15, reel: 0.15, lure: 0.7 },  // ルアーが主力
};

// 魚の売却価格（レアリティ別）
export const FISH_SELL_PRICE: Record<string, number> = {
  common: 200,
  uncommon: 500,
  rare: 1000,
  legendary: 2500,
  mythical: 5000,
};

// スコア計算
export const RARITY_BONUS: Record<string, number> = {
  common: 0,
  uncommon: 50,
  rare: 150,
  legendary: 500,
  mythical: 1500,
};

export const REGION_COMPLETE_BONUS = 500;
export const ENCYCLOPEDIA_COMPLETION_BONUS_PER_PERCENT = 20;
export const GIANT_FISH_THRESHOLD = 1.5;
export const GIANT_FISH_BONUS = 200;

export const FINISH_BONUS = [2000, 1200, 600, 200];
export const MONEY_TO_POINTS_RATE = 0.5;

// 休憩所
export const REST_MONEY_BONUS = 500;

// デフォルト設定
export const DEFAULT_MAX_TURNS = 50;
