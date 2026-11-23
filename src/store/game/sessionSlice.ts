// 対局の始まりと終わり、保存と再開（画面の切り替え・新しい対局・再開・終了・クラウド同期）。
// 新しい状態を足したら、startGame（新しい対局の初期値）と resumeGame（古いセーブに無いときの既定値 `saved.x ?? 既定`）の両方に足す。
// 対局中の保存は saveGameState(get()) で状態をまるごと JSON にしている（関数は落ちる）。
// 途中でやめる・仲間を増やす・アカウントにつなぐ（saveAndQuit / addLatePlayer / linkPlayerAccount）の中身は game/midGame.ts。
import type { GameScreen, GameSettings, GameState, PlayerEquipment } from '../../game/types';
import { loadEncyclopedia, saveEncyclopedia, saveGameState, loadGameState, clearGameState, loadGameStateAsync } from '../../utils/storage';
import { saveUserEquipment, saveUserMoney, saveUserEncyclopedia, loadUserEncyclopedia, loadUserMoney } from '../../lib/firestore';
import { canAddPlayer, carryRosterIntoSave, isCalmPhase, lateLinkMoney, withLatePlayer, withLinkedAccount } from '../../game/midGame';
import { CITY_DEFAULT_MONTHS } from '../../game/city';
import { createQuestCityState } from '../../game/cityQuests';
import { createCardState } from '../../game/cityCards';
import { initialState, createInitialPlayers, isCityMode, TURN_RESET } from './initialState';
import type { GameGet, GameSlice } from './types';

export interface SessionActions {
  setScreen: (screen: GameScreen) => void;
  startGame: (settings: GameSettings, savedEquipments?: (PlayerEquipment | null)[], savedMoneys?: (number | null)[], savedEncyclopedias?: (Record<string, boolean> | null)[]) => void;
  endGame: () => void;
  resetGame: () => void;
  resumeGame: () => void;
  syncFromCloud: () => Promise<void>;
  clearUserData: () => void;
  /** いまの対局を保存してタイトルへ（タイトルの「つづきから」で再開） */
  saveAndQuit: () => void;
  /** 途中から仲間を1人増やす（手番は最後）。増やせたら true */
  addLatePlayer: (name: string) => boolean;
  /** 途中でその席をアカウントにつなぐ（それまでの釣果も図鑑に入る）。つなげたら true */
  linkPlayerAccount: (index: number, account: { uid: string; displayName: string }, accountEncyclopedia: Record<string, boolean>) => boolean;
}

/**
 * いまの対局を保存する。そのまま再開できる段階なら丸ごと、釣りの最中などはその番のはじめの保存に
 * 増えた仲間・つないだアカウントだけを書き足す（game/midGame.ts の isCalmPhase / carryRosterIntoSave）。
 */
function persistGame(get: GameGet): void {
  const s = get();
  if (s.screen !== 'game' || s.gameOver) return;
  if (isCalmPhase(s.turnPhase)) {
    saveGameState(s);
    return;
  }
  const saved = loadGameState() as GameState | null;
  saveGameState(saved?.players ? carryRosterIntoSave(saved, s) : { ...s, turnPhase: 'idle', ...TURN_RESET });
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
    // 始めてすぐにやめても「つづきから」で戻れるよう、最初の番のはじめも保存する（前の対局の保存はここで置き換わる）
    saveGameState(get());
  },

  // ゲーム終了処理（永続化 + 結果画面へ）。endTurn と nextPlayer の双方から呼ばれる。
  endGame: () => {
    const { players, settings, encyclopedias } = get();
    // 図鑑は常に保存。装備・所持金は引き継ぎモード時のみ。
    // 途中でつないだ人は、道具は保存せず、お金は増えた分だけアカウントに足す（まちづくりのお金は持ち出さない）。
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.uid) {
        const uid = p.uid;
        saveUserEncyclopedia(uid, encyclopedias[i]).catch(() => {});
        if (p.lateLink) {
          if (!isCityMode(settings)) {
            loadUserMoney(uid).then(m => saveUserMoney(uid, lateLinkMoney(m, p))).catch(() => {});
          }
        } else if (settings.carryOver !== false && !isCityMode(settings)) {
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
    // ゲーム中の場合、各プレイヤーのUIDに基づいてFirestoreから図鑑を同期。
    // 上書きせずに合わせる（対局の途中でログインが変わっても、この対局で釣った魚が消えないように）。
    // 読み込みの間にも魚は釣れるので、最後にその時点の図鑑へ足す
    const { players } = get();
    const remotes: (Record<string, boolean> | null)[] = [];
    for (let i = 0; i < players.length; i++) {
      const uid = players[i]?.uid;
      remotes[i] = null;
      if (uid) {
        try {
          remotes[i] = await loadUserEncyclopedia(uid);
        } catch {
          // Firestore失敗時は既存データを維持
        }
      }
    }
    set(st => ({ encyclopedias: st.encyclopedias.map((e, i) => (remotes[i] ? { ...remotes[i], ...e } : e)) }));
    if (savedGame) {
      saveGameState(savedGame);
    }
  },

  clearUserData: () => {
    set({ encyclopedias: [{}], players: [], gameOver: false });
    clearGameState();
  },

  saveAndQuit: () => {
    persistGame(get);
    set({ screen: 'title' });
  },

  addLatePlayer: (name) => {
    const s = get();
    if (!canAddPlayer(s)) return false;
    // アカウントにつないでいない人の図鑑は、はじめからいる人と同じくこの端末の図鑑
    const patch = withLatePlayer(s, name, loadEncyclopedia());
    if (!patch) return false;
    set(patch);
    persistGame(get);
    return true;
  },

  linkPlayerAccount: (index, account, accountEncyclopedia) => {
    const patch = withLinkedAccount(get(), index, account, accountEncyclopedia);
    if (!patch) return false;
    set(patch);
    persistGame(get);
    return true;
  },
});
