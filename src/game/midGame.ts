// 対局の途中でやめる・仲間を増やす・アカウントにつなぐ（純粋関数）。
// ストアの側は sessionSlice の saveAndQuit / addLatePlayer / linkPlayerAccount、画面は components/session/。
//
// 決まり（2026-11 ユーザーの指示）:
// - 途中で仲間を増やせる（4人まで）。入れ替え（ほかの人と代わる・つないだアカウントを外す）はしない。
// - 途中でアカウントにつないだ人は、それまでに釣った魚もそのアカウントの図鑑に入る。
//   竿などの道具は引き継がない（アカウントの道具はそのまま）。お金は増えた分だけ足す（減っても引かない）。
import type { GameSettings, GameState, Player, TurnPhase } from './types';
import { INITIAL_MONEY, PLAYER_COLORS, PLAYER_DEFAULT_NAMES } from './constants';
import { createInitialEquipment } from './equipment';
import { CITY_INITIAL_MONEY, CITY_START_NODE } from './city';
import { NODE_MAP } from '../data/boardNodes';

/** 1つの対局に入れる人数の上限（駒の色の数） */
export const MAX_PLAYERS = PLAYER_COLORS.length;

/**
 * そのまま保存して、再開したときに同じ画面へ戻れる段階。
 * 釣りの最中・店・札などは、見せている中身（釣りの状態・引いた札）が保存に入らないので含めない。
 * それらの段階でやめたときは、その番のはじめの保存（ターンの切り替えで毎回とる）から続ける。
 */
const CALM_PHASES: ReadonlySet<TurnPhase> = new Set<TurnPhase>([
  'idle', 'action_choice', 'turn_end', 'city', 'city_report', 'city_yearend',
]);

export function isCalmPhase(phase: TurnPhase): boolean {
  return CALM_PHASES.has(phase);
}

type Roster = Pick<GameState, 'players' | 'settings' | 'encyclopedias' | 'initialEncyclopedias' | 'cityCards' | 'gameOver' | 'turn'>;

export function canAddPlayer(s: Pick<GameState, 'players' | 'gameOver'>): boolean {
  return !s.gameOver && s.players.length > 0 && s.players.length < MAX_PLAYERS;
}

/** 途中から入る人。釣り旅はスタート、まちづくりは最初の町から、はじめの道具とお金で始める */
export function createLatePlayer(settings: GameSettings, index: number, name: string, turn: number): Player {
  const isCity = settings.mode === 'city';
  const money = isCity ? CITY_INITIAL_MONEY : INITIAL_MONEY;
  return {
    id: index,
    isCpu: false,
    name: name.trim() || PLAYER_DEFAULT_NAMES[index] || `プレイヤー${index + 1}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    currentNode: isCity && NODE_MAP.has(CITY_START_NODE) ? CITY_START_NODE : 'start',
    money,
    startMoney: money,
    equipment: createInitialEquipment(),
    caughtFish: [],
    score: 0,
    hasFinished: false,
    finishOrder: null,
    skipNextTurn: false,
    extraTurn: false,
    fishBonusMultiplier: 1,
    fishBonusTurnsLeft: 0,
    joinedTurn: turn,
  };
}

/** 設定の人数・名前・アカウント・人か CPU かを、いまのプレイヤーに合わせる */
function settingsFor(settings: GameSettings, players: Player[]): GameSettings {
  return {
    ...settings,
    playerCount: players.length,
    playerNames: players.map(p => p.name),
    playerUids: players.map(p => p.uid ?? null),
    playerKinds: players.map(p => (p.isCpu ? 'cpu' : 'human')),
  };
}

/**
 * 仲間を1人増やした後の状態（足す分だけ）。手番は最後に入る（いまの巡で最後の人の次）。
 * encyclopedia はその人の図鑑（アカウントにつないでいない人は、この端末の図鑑）。
 */
export function withLatePlayer(s: Roster, name: string, encyclopedia: Record<string, boolean>): Partial<GameState> | null {
  if (!canAddPlayer(s)) return null;
  const index = s.players.length;
  const player = createLatePlayer(s.settings, index, name, s.turn);
  const players = [...s.players, player];
  const hands = s.cityCards ? Array.from({ length: players.length }, (_, i) => s.cityCards!.hands[i] ?? []) : null;
  return {
    players,
    settings: settingsFor(s.settings, players),
    encyclopedias: [...padTo(s.encyclopedias, index), { ...encyclopedia }],
    initialEncyclopedias: [...padTo(s.initialEncyclopedias, index), { ...encyclopedia }],
    cityCards: s.cityCards && hands ? { ...s.cityCards, hands } : s.cityCards,
  };
}

function padTo<T extends object>(list: T[], n: number): T[] {
  return Array.from({ length: n }, (_, i) => list[i] ?? ({} as T));
}

export type LinkRefusal = 'no_player' | 'cpu' | 'already_linked' | 'duplicate';

/** その席をアカウントにつなげない理由（つなげるなら null） */
export function linkRefusal(players: Player[], index: number, uid: string): LinkRefusal | null {
  const p = players[index];
  if (!p) return 'no_player';
  if (p.isCpu) return 'cpu';
  if (p.uid) return 'already_linked';
  if (players.some((q, i) => i !== index && q.uid === uid)) return 'duplicate';
  return null;
}

/** アカウントの図鑑に、この対局で手に入れた魚を足す */
export function mergeCaughtIntoEncyclopedia(accountEncyclopedia: Record<string, boolean>, player: Player): Record<string, boolean> {
  const enc = { ...accountEncyclopedia };
  for (const f of player.caughtFish) enc[f.fishId] = true;
  return enc;
}

/**
 * 途中でアカウントにつないだ後の状態（足す分だけ）。つなげないときは null。
 * 名前はアカウントの名前にする（番付にもこの名前で載る）。NEW の印はアカウントの図鑑から見て付ける。
 */
export function withLinkedAccount(
  s: Roster, index: number, account: { uid: string; displayName: string }, accountEncyclopedia: Record<string, boolean>,
): Partial<GameState> | null {
  if (linkRefusal(s.players, index, account.uid)) return null;
  const before = s.players[index];
  const players = s.players.map((p, i) => (i === index ? { ...p, uid: account.uid, name: account.displayName || p.name, lateLink: true } : p));
  const encyclopedias = padTo(s.encyclopedias, players.length).slice();
  encyclopedias[index] = mergeCaughtIntoEncyclopedia(accountEncyclopedia, before);
  const initialEncyclopedias = padTo(s.initialEncyclopedias, players.length).slice();
  initialEncyclopedias[index] = { ...accountEncyclopedia };
  return { players, settings: settingsFor(s.settings, players), encyclopedias, initialEncyclopedias };
}

/** 途中でつないだ人の、対局の後のアカウントのお金（増えた分だけ足す。減っていても引かない） */
export function lateLinkMoney(savedMoney: number | null, player: Player): number {
  const base = savedMoney ?? INITIAL_MONEY;
  const gain = Math.max(0, player.money - (player.startMoney ?? INITIAL_MONEY));
  return base + gain;
}

/**
 * 保存し直せない段階でやめるとき、その番のはじめの保存に、あとから増えた仲間とつないだアカウントだけを書き足す。
 * 増えた仲間はまだ一度も番が来ていない（手番の最後に入る）ので、いまの姿をそのまま入れてよい。
 */
export function carryRosterIntoSave(saved: GameState, now: Roster): GameState {
  if (!Array.isArray(saved?.players)) return saved;
  const linked = (i: number) => {
    const np = now.players[i];
    const sp = saved.players[i];
    return !!np?.lateLink && !!np.uid && !!sp && !sp.isCpu && !sp.uid;
  };
  const kept = saved.players.map((sp, i) => (linked(i) ? { ...sp, uid: now.players[i].uid, name: now.players[i].name, lateLink: true } : sp));
  const added = now.players.slice(saved.players.length);
  const players = [...kept, ...added];
  if (players.length === saved.players.length && !saved.players.some((_, i) => linked(i))) return saved;
  const savedEnc = padTo(saved.encyclopedias ?? [], saved.players.length);
  const encyclopedias = players.map((_, i) => (i >= saved.players.length || linked(i) ? { ...(now.encyclopedias[i] ?? {}) } : savedEnc[i]));
  const cityCards = saved.cityCards
    ? { ...saved.cityCards, hands: players.map((_, i) => saved.cityCards!.hands[i] ?? []) }
    : saved.cityCards;
  return { ...saved, players, settings: settingsFor(saved.settings, players), encyclopedias, cityCards };
}
