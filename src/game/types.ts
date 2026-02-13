// ===== ノード関連 =====

export type NodeType =
  | 'start'
  | 'goal'
  | 'fishing'
  | 'fishing_special'
  | 'shop'
  | 'event_good'
  | 'event_bad'
  | 'event_random'
  | 'rest';

export type Region = 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kinki' | 'chugoku' | 'shikoku' | 'kyushu';

export interface BoardNode {
  id: string;
  name: string;
  type: NodeType;
  region: Region;
  x: number; // SVG座標 (0-100)
  y: number;
  shopTier?: number; // 1-3: ショップノードのみ
  description?: string;
}

export interface BoardEdge {
  from: string;
  to: string;
  directed?: boolean; // true: from→toのみ（前進専用）、falseまたは省略: 双方向
}

// ===== 魚関連 =====

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythical';

export type FishBodyShape = 'standard' | 'elongated' | 'flat' | 'round' | 'eel' | 'squid' | 'octopus';
export type FishPattern = 'stripes' | 'spots' | 'gradient' | 'none';
export type FishFinStyle = 'normal' | 'large' | 'spiky' | 'long' | 'small';
export type FishSizeClass = 'small' | 'medium' | 'large' | 'huge';

export interface FishAppearance {
  bodyColor: string;
  accentColor: string;
  bodyShape: FishBodyShape;
  pattern?: FishPattern;
  finStyle: FishFinStyle;
  size: FishSizeClass;
}

export interface Fish {
  id: string;
  name: string;
  rarity: FishRarity;
  points: number;
  regions: Region[];
  limitedNodes?: string[]; // 特定ノード限定
  minEquipmentLevel: number; // 最低装備レベル
  description: string;
  emoji: string;
  appearance: FishAppearance;
  weight: { min: number; max: number }; // kg
  season: string; // 旬の時期
  habitat: string; // 生息場所
  difficulty: number; // 釣り難易度 1-5
}

export interface CaughtFish {
  fishId: string;
  caughtAt: string; // ノードID
  turn: number;
  size: number; // 0.5-2.0 サイズ倍率
  bonusMultiplier?: number;
}

// ===== 装備関連 =====

export type EquipmentType = 'rod' | 'reel' | 'lure';

export interface Equipment {
  type: EquipmentType;
  level: number; // 1-5
  name: string;
  cost: number;
  description: string;
  effect: string;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  level: number;        // 1-5
  durability: number;   // 100=新品, 0=壊れた
}

export interface PlayerEquipment {
  equipped: {
    rod: string | null;
    reel: string | null;
    lure: string | null;
  };
  inventory: EquipmentItem[];
}

// ===== イベント関連 =====

export type EventType = 'good' | 'bad' | 'random';

export interface EventCard {
  id: string;
  name: string;
  type: EventType;
  description: string;
  effect: EventEffect;
}

export type EventEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'move'; nodeId: string }
  | { kind: 'move_steps'; steps: number }
  | { kind: 'skip_turn' }
  | { kind: 'extra_turn' }
  | { kind: 'free_upgrade'; equipmentType: EquipmentType }
  | { kind: 'fish_bonus'; multiplier: number; duration: number }
  | { kind: 'steal_fish' }
  | { kind: 'random_fish'; rarity: FishRarity }
  | { kind: 'equipment_damage'; equipmentType: EquipmentType; amount: number };

// ===== プレイヤー =====

export interface Player {
  id: number;
  name: string;
  color: string;
  currentNode: string;
  money: number;
  equipment: PlayerEquipment;
  caughtFish: CaughtFish[];
  score: number;
  hasFinished: boolean;
  finishOrder: number | null;
  skipNextTurn: boolean;
  extraTurn: boolean;
  fishBonusMultiplier: number;
  fishBonusTurnsLeft: number;
}

// ===== 釣りフェーズ =====

export type FishingPhase = 'cast' | 'waiting' | 'strike' | 'reeling' | 'result';

export interface FishingState {
  phase: FishingPhase;
  targetFish: Fish | null;
  biteTimer: number;
  hasBite: boolean;
  strikeSuccess: boolean;
  reelingProgress: number;
  tension: number;
  caughtSize: number;
  escaped: boolean;
}

// ===== ゲーム全体 =====

export type GameScreen = 'title' | 'setup' | 'game' | 'result' | 'login';

export type TurnPhase =
  | 'idle'
  | 'roulette'
  | 'moving'
  | 'path_selection'
  | 'node_action'
  | 'fishing'
  | 'shop'
  | 'event'
  | 'rest'
  | 'action_choice'
  | 'turn_end';

export interface GameSettings {
  playerCount: number;
  playerNames: string[];
  maxTurns: number; // 0 = ゴール到達で終了
}

export interface GameState {
  screen: GameScreen;
  settings: GameSettings;
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  turnPhase: TurnPhase;
  rouletteResult: number | null;
  reachableNodes: string[][];
  fishingState: FishingState | null;
  currentEvent: EventCard | null;
  gameOver: boolean;
  encyclopedia: Record<string, boolean>;
  nodeActionsThisTurn: number;
}

// ===== スコア =====

export interface ScoreBreakdown {
  fishPoints: number;
  rarityBonus: number;
  regionBonus: number;
  encyclopediaBonus: number;
  giantFishBonus: number;
  finishBonus: number;
  moneyBonus: number;
  total: number;
}
