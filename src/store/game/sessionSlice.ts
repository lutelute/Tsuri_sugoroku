// 対局の始まりと終わり、保存と再開（画面の切り替え・新しい対局・再開・終了・クラウド同期）。
// 新しい状態を足したら、startGame（新しい対局の初期値）と resumeGame（古いセーブに無いときの既定値 `saved.x ?? 既定`）の両方に足す。
// 対局中の保存は saveGameState(get()) で状態をまるごと JSON にしている（関数は落ちる）。
import type { GameScreen, GameSettings, GameState, PlayerEquipment } from '../../game/types';
import { loadEncyclopedia, saveEncyclopedia, saveGameState, loadGameState, clearGameState, loadGameStateAsync } from '../../utils/storage';
import { saveUserEquipment, saveUserMoney, saveUserEncyclopedia, loadUserEncyclopedia } from '../../lib/firestore';
import { CITY_DEFAULT_MONTHS } from '../../game/city';
import { createQuestCityState } from '../../game/cityQuests';
import { createCardState } from '../../game/cityCards';
import { initialState, createInitialPlayers, isCityMode } from './initialState';
import type { GameSlice } from './types';

export interface SessionActions {
  setScreen: (screen: GameScreen) => void;
  startGame: (settings: GameSettings, savedEquipments?: (PlayerEquipment | null)[], savedMoneys?: (number | null)[], savedEncyclopedias?: (Record<string, boolean> | null)[]) => void;
  endGame: () => void;
  resetGame: () => void;
  resumeGame: () => void;
  syncFromCloud: () => Promise<void>;
  clearUserData: () => void;
}

export function hasSavedGame(): boolean {
  const saved = loadGameState();
  return saved != null;
}

export const createSessionSlice: GameSlice<SessionActions> = (set, get) => ({
  setScreen: (screen) => set({ screen }),

  startGame: (rawSettings, savedEquipments, savedMoneys, savedEncyclopedias) => {
    // まちづくりは月数（ラウンド）で決着するため無制限は不可
    const settings: GameSettings = rawSettings.mode === 'city'
      ? { ...rawSettings, maxTurns: rawSettings.maxTurns > 0 ? rawSettings.maxTurns : CITY_DEFAULT_MONTHS, carryOver: false }
      : rawSettings;
    const players = createInitialPlayers(settings, savedEquipments, savedMoneys);
    // プレイヤーごとの図鑑を初期化
    const encyclopedias = players.map((p, i) => {
      if (savedEncyclopedias?.[i] != null) return savedEncyclopedias[i]!;
      // ゲストプレイヤーはlocalStorageから読み込み、登録ユーザーは空で開始（Firestoreからロード済みのはず）
      return p.uid || p.isCpu ? {} : loadEncyclopedia();
    });
    // ゲーム開始時の図鑑をスナップショット（NEW判定用）
    const initialEncyclopedias = encyclopedias.map(enc => ({ ...enc }));
    set({
      screen: 'game',
      settings,
      players,
      currentPlayerIndex: 0,
      turn: 1,
      turnPhase: 'idle',
      rouletteResult: null,
      reachableNodes: [],
      fishingState: null,
      currentEvent: null,
      gameOver: false,
      encyclopedias,
      initialEncyclopedias,
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
      lastMove: null,
      lastCapitalResult: null,
      // 1年目のお題と今年の舞台を引いて始める（古いセーブは quests が無く、次の4月に引く。monthEnd.ts）
      city: isCityMode(settings) ? createQuestCityState(players.length) : null,
      cityReport: null,
      cityActionsThisTurn: 0,
      currentCityEvent: null,
      lastCityEventOutcome: null,
      cityToast: null,
      capitalDoneThisTurn: false,
      cityGoalClaims: [],
      cityYearEnd: null,
      cityTitleHistory: [],
      firstFinishTurn: null,
      cityBonusActions: 0,
      cityCards: isCityMode(settings) ? createCardState(players.length) : null,
      pendingDiceCount: 1,
      pendingDiceCap: null,
      cityBinboToast: null,
      cityBinboEvent: null,
      noticeQueue: [],
    });
  },

  // ゲーム終了処理（永続化 + 結果画面へ）。endTurn と nextPlayer の双方から呼ばれる。
  endGame: () => {
    const { players, settings, encyclopedias } = get();
    // 図鑑は常に保存。装備・所持金は引き継ぎモード時のみ。
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.uid) {
        saveUserEncyclopedia(p.uid, encyclopedias[i]).catch(() => {});
        if (settings.carryOver !== false && !isCityMode(settings)) {
          saveUserEquipment(p.uid, p.equipment).catch(() => {});
          saveUserMoney(p.uid, p.money).catch(() => {});
        }
      } else if (!p.isCpu) {
        // ゲストプレイヤーはlocalStorageに保存（CPU は保存しない）
        saveEncyclopedia(encyclopedias[i]);
      }
    }
    set({ gameOver: true, screen: 'result', turnPhase: 'idle' });
    clearGameState();
  },

  resetGame: () => set({ ...initialState, noticeQueue: [], encyclopedias: [loadEncyclopedia()], initialEncyclopedias: [] }),

  resumeGame: () => {
    const saved = loadGameState() as GameState | null;
    if (!saved) return;
    // 旧フォーマット互換: encyclopediaフィールドがある場合は変換
    const legacySaved = saved as GameState & { encyclopedia?: Record<string, boolean> };
    const encyclopedias = saved.encyclopedias
      ?? (legacySaved.encyclopedia
        ? saved.players.map(() => legacySaved.encyclopedia!)
        : saved.players.map(() => loadEncyclopedia()));
    // 再開時は現在の図鑑を初期スナップショットとする（NEW表示は新ゲームのみ）
    const initialEncyclopedias = encyclopedias.map(enc => ({ ...enc }));
    set({
      screen: 'game',
      settings: saved.settings,
      players: saved.players,
      currentPlayerIndex: saved.currentPlayerIndex,
      turn: saved.turn,
      turnPhase: saved.turnPhase,
      rouletteResult: saved.rouletteResult,
      reachableNodes: saved.reachableNodes,
      fishingState: null,
      currentEvent: null,
      gameOver: saved.gameOver,
      encyclopedias,
      initialEncyclopedias,
      nodeActionsThisTurn: saved.nodeActionsThisTurn,
      boatFishingRemaining: saved.boatFishingRemaining ?? 0,
      lastMove: null,
      city: saved.city ?? null,
      cityReport: saved.cityReport ?? null,
      cityActionsThisTurn: saved.cityActionsThisTurn ?? 0,
      currentCityEvent: saved.currentCityEvent ?? null,
      lastCityEventOutcome: null,
      cityToast: null,
      capitalDoneThisTurn: saved.capitalDoneThisTurn ?? false,
      cityGoalClaims: saved.cityGoalClaims ?? [],
      cityYearEnd: saved.cityYearEnd ?? null,
      cityTitleHistory: saved.cityTitleHistory ?? [],
      firstFinishTurn: saved.firstFinishTurn ?? null,
      cityBonusActions: saved.cityBonusActions ?? 0,
      cityCards: saved.cityCards ?? (saved.city ? createCardState(saved.players.length) : null),
      pendingDiceCount: saved.pendingDiceCount ?? 1,
      pendingDiceCap: saved.pendingDiceCap ?? null,
      cityBinboToast: null,
      cityBinboEvent: saved.cityBinboEvent ?? null,
      noticeQueue: [],
    });
  },

  syncFromCloud: async () => {
    const savedGame = await loadGameStateAsync();
    // ゲーム中の場合、各プレイヤーのUIDに基づいてFirestoreから図鑑を同期
    const { encyclopedias, players } = get();
    const newEncyclopedias = [...encyclopedias];
    for (let i = 0; i < players.length; i++) {
      const uid = players[i]?.uid;
      if (uid) {
        try {
          const remote = await loadUserEncyclopedia(uid);
          if (remote) newEncyclopedias[i] = remote;
        } catch {
          // Firestore失敗時は既存データを維持
        }
      }
    }
    set({ encyclopedias: newEncyclopedias });
    if (savedGame) {
      saveGameState(savedGame);
    }
  },

  clearUserData: () => {
    set({ encyclopedias: [{}], players: [], gameOver: false });
    clearGameState();
  },
});
