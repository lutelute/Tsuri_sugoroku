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
  | 'rest'
  | 'route'      // 街道中継マス（道中の小イベント/小釣り）
  | 'capital';   // 県メインイベントマス（県固有の大型イベント）

// 街道テーマ（route ノードの装飾用）
export type RouteTheme = 'mountain' | 'sea' | 'river' | 'town';

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
  // capital ノード用: 県固有メインイベントのID（capitalEvents.tsを参照）
  capitalEventId?: string;
  // route ノード用: 街道テーマ（描画と背景イベントテーブル切り替え）
  routeTheme?: RouteTheme;
}

// ===== 県メインイベント =====
// 県(capital)に紐づく固有の大イベント。選択肢ベースで複数アクションを提供。
export interface CapitalEvent {
  id: string;
  title: string;       // 「江戸前ハゼ釣り選手権」など
  flavor: string;      // 短い紹介文
  region: Region;
  choices: CapitalChoice[];
}

export interface CapitalChoice {
  id: string;
  label: string;       // 選択肢ラベル
  description: string; // 効果説明
  effect: CapitalChoiceEffect;
}

export type CapitalChoiceEffect =
  | { kind: 'special_fishing'; fishId: string; difficulty: number; reward: number } // 県固有大物釣り(成功で名声魚+お金)
  | { kind: 'specialty_shop'; equipmentType: EquipmentType; level: number; price: number; durabilityBonus?: number }
  | { kind: 'feast'; moneyBonus: number; repairAll: true }   // ご褒美宴会(全装備修理+お金)
  | { kind: 'lore_event'; eventCardId: string }              // 県固有イベントカード適用
  | { kind: 'money'; amount: number }
  | { kind: 'extra_turn' };

// 県メインイベントの結果（applyCapitalChoice後に結果モーダルへ渡す）
export interface CapitalResult {
  choiceId: string;
  choiceLabel: string;
  success: boolean;          // special_fishingの成功/失敗、その他はtrue
  fishId?: string;            // special_fishing成功時の釣果
  moneyDelta: number;         // 入出金合計（負なら出費）
  message: string;            // 結果メッセージ
  successChance?: number;     // special_fishing時の判定確率（参考表示）
}

export interface BoardEdge {
  from: string;
  to: string;
  directed?: boolean; // true: from→toのみ（前進専用）、falseまたは省略: 双方向
}

// ===== 魚関連 =====

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythical';

export type FishBodyShape =
  | 'standard' | 'elongated' | 'flat' | 'round'
  | 'eel'
  | 'squid' | 'octopus' | 'crab'
  | 'shell_bivalve' | 'shell_spiral'
  | 'catfish' | 'shark' | 'whale' | 'ray' | 'urchin' | 'oarfish';
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
  wikiUrl?: string; // Wikipedia等の詳細情報URL
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
  | { kind: 'multi_fish'; count: number; rarity: FishRarity }
  | { kind: 'equipment_damage'; equipmentType: EquipmentType; amount: number };

// ===== プレイヤー =====

export interface Player {
  id: number;
  name: string;
  color: string;
  uid?: string; // Firebase UID（登録ユーザー紐付け時）
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

export type FishingMiniGame = 'reeling' | 'target' | 'reaction' | 'rhythm';

export interface FishingState {
  phase: FishingPhase;
  miniGame: FishingMiniGame;
  targetFish: Fish | null;
  biteTimer: number;
  hasBite: boolean;
  strikeSuccess: boolean;
  reelingProgress: number;
  tension: number;
  caughtSize: number;
  escaped: boolean;
  boatFishing: boolean;
  tairyouCount: number;
}

// ===== ゲーム全体 =====

export type GameScreen = 'title' | 'setup' | 'game' | 'result' | 'login';

export type TurnPhase =
  | 'idle'
  | 'roulette'
  | 'moving'
  | 'path_selection'
  | 'node_action'
  | 'fishing_choice'
  | 'fishing'
  | 'shop'
  | 'event'
  | 'rest'
  | 'capital_event'
  | 'action_choice'
  | 'turn_end';

export interface GameSettings {
  playerCount: number;
  playerNames: string[];
  playerUids: (string | null)[]; // 各プレイヤーの Firebase UID（未紐付けは null）
  maxTurns: number; // 0 = ゴール到達で終了
  carryOver?: boolean; // 装備・所持金の引き継ぎモード（falseならゲーム終了時にFirestoreへ保存しない）
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
  encyclopedias: Record<string, boolean>[]; // プレイヤーごとの図鑑
  initialEncyclopedias: Record<string, boolean>[]; // ゲーム開始時の図鑑スナップショット（NEW判定用）
  nodeActionsThisTurn: number;
  boatFishingRemaining: number; // 船釣り残り回数（0=通常モード）
  lastCapitalResult: CapitalResult | null; // 直近の県メインイベント結果（モーダル表示用）
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

// ===== ランキング =====

export interface RankingEntry {
  id?: string;
  uid: string;
  displayName: string;
  score: number;
  fishCount: number;
  encyclopediaRate: number;
  date: string;
  breakdown: ScoreBreakdown;
}

// ===== ユーザー情報 =====

export interface UserInfo {
  uid: string;
  displayName: string;
  lastLoginAt?: string;
}
