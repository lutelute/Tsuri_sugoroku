// 手番の流れ: サイコロ → 分かれ道 → マスの処理 → 行動選択 → ターン終了 → 次の人（月が進めば月末処理）。
// マスに着いたときの処理は、釣り旅は executeNodeAction の switch、まちづくりは cityArrival.ts の executeCityNodeAction。
import type { GameState, TurnPhase } from '../../game/types';
import { REST_MONEY_BONUS, GOAL_MONEY_REWARD } from '../../game/constants';
import { fishingLastTurn } from '../../game/deadline';
import { getCapitalEvent } from '../../data/capitalEvents';
import { calculateReachableNodes } from '../../game/movement';
import { NODE_MAP } from '../../data/boardNodes';
import { getRandomEventCard } from '../../data/eventCards';
import { saveGameState } from '../../utils/storage';
import { random } from '../../utils/random';
import { diceCap, tickSlow } from '../../game/cityCards';
import { railPassSet } from '../../game/railways';
import type { CityReport } from '../../game/city';
import type { YearEndResult } from '../../game/cityAwards';
import { TURN_RESET, isCityMode } from './initialState';
import { afterMove } from './moveHooks';
import { executeCityNodeAction } from './cityArrival';
import { runMonthEnd, planMonthEndDisplay } from './monthEnd';
import { queueNotice } from './notices';
import type { GameSlice } from './types';

export interface TurnActions {
  rollDice: (result: number) => void;
  selectPath: (pathIndex: number) => void;
  executeNodeAction: () => void;
  doActionAgain: () => void;
  endTurn: () => void;
  nextPlayer: () => void;
  setTurnPhase: (phase: TurnPhase) => void;
}

export const createTurnSlice: GameSlice<TurnActions> = (set, get) => ({
  rollDice: (result) => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    // まちづくり: 目的地は通過中でも止まれる
    const city = get().city;
    const stops = isCityMode(get().settings) && city?.destination ? [city.destination] : [];
    // まちづくり: 線路のある中継マスは歩数を使わずに通り抜ける（止まれない）
    const pass = isCityMode(get().settings) && city?.rails ? railPassSet(city.rails) : undefined;
    const paths = calculateReachableNodes(player.currentNode, result, stops, pass);

    if (paths.length === 0) {
      set({ rouletteResult: result, turnPhase: 'action_choice', reachableNodes: [] });
    } else if (paths.length === 1) {
      const destination = paths[0][paths[0].length - 1];
      const newPlayers = [...players];
      newPlayers[currentPlayerIndex] = { ...player, currentNode: destination };
      set({
        rouletteResult: result,
        reachableNodes: paths,
        players: newPlayers,
        turnPhase: 'node_action',
        nodeActionsThisTurn: 0,
        boatFishingRemaining: 0,
        lastMove: { playerIndex: currentPlayerIndex, path: paths[0], seq: (get().lastMove?.seq ?? 0) + 1 },
      });
      afterMove(set, get, paths[0]);
    } else {
      set({
        rouletteResult: result,
        reachableNodes: paths,
        turnPhase: 'path_selection',
      });
    }
  },

  selectPath: (pathIndex) => {
    const { players, currentPlayerIndex, reachableNodes } = get();
    const path = reachableNodes[pathIndex];
    if (!path) return;

    const destination = path[path.length - 1];
    const player = players[currentPlayerIndex];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, currentNode: destination };

    set({
      players: newPlayers,
      turnPhase: 'node_action',
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
      lastMove: { playerIndex: currentPlayerIndex, path, seq: (get().lastMove?.seq ?? 0) + 1 },
    });
    afterMove(set, get, path);
  },

  executeNodeAction: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);

    if (!node) {
      set({ turnPhase: 'action_choice' });
      return;
    }

    if (isCityMode(get().settings) && get().city) {
      executeCityNodeAction(set, get, node.id);
      return;
    }

    switch (node.type) {
      case 'fishing':
      case 'fishing_special':
        set({ turnPhase: 'fishing_choice' });
        break;
      case 'shop':
        set({ turnPhase: 'shop' });
        break;
      case 'event_good': {
        const event = getRandomEventCard('good');
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'event_bad': {
        const event = getRandomEventCard('bad');
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'event_random': {
        const event = getRandomEventCard();
        set({ currentEvent: event, turnPhase: 'event' });
        break;
      }
      case 'rest': {
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...player,
          money: player.money + REST_MONEY_BONUS,
        };
        set({ players: newPlayers, turnPhase: 'rest' });
        break;
      }
      case 'route': {
        // 街道中継マス: 50%でランダム小イベント、50%は素通り。稀にレア魚遭遇。
        const r = random();
        if (r < 0.5) {
          const event = getRandomEventCard();
          set({ currentEvent: event, turnPhase: 'event' });
        } else {
          set({ turnPhase: 'action_choice' });
        }
        break;
      }
      case 'capital': {
        // 県メインイベント: 固有イベントを表示
        if (node.capitalEventId && getCapitalEvent(node.capitalEventId)) {
          set({ turnPhase: 'capital_event' });
        } else {
          // フォールバック: ショップ扱い
          set({ turnPhase: 'shop' });
        }
        break;
      }
      case 'start': {
        // スタート地点でもショップが利用可能
        set({ turnPhase: 'shop' });
        break;
      }
      case 'goal': {
        const finishedCount = players.filter(p => p.hasFinished).length;
        const reward = GOAL_MONEY_REWARD[finishedCount] ?? GOAL_MONEY_REWARD[GOAL_MONEY_REWARD.length - 1];
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...player,
          hasFinished: true,
          finishOrder: finishedCount,
          money: player.money + reward,
        };
        set({ players: newPlayers, turnPhase: 'turn_end', firstFinishTurn: get().firstFinishTurn ?? get().turn });
        break;
      }
      default:
        set({ turnPhase: 'action_choice' });
    }
  },

  doActionAgain: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node) return;

    // ノードタイプに応じて再アクション
    switch (node.type) {
      case 'fishing':
      case 'fishing_special':
        set({ turnPhase: 'fishing_choice' });
        break;
      case 'shop':
        set({ turnPhase: 'shop' });
        break;
      default:
        set({ turnPhase: 'turn_end' });
    }
  },

  endTurn: () => {
    const state = get();
    const { players } = state;
    const idx = state.currentPlayerIndex;

    // 全員ゴール → 即終了
    if (players.every(p => p.hasFinished)) {
      get().endGame();
      return;
    }

    const player = players[idx];

    // 釣りポイントボーナスのターン減算（このプレイヤーのターン終了時に1減らす）
    if (player.fishBonusTurnsLeft > 0) {
      const newPlayers = [...players];
      const newTurns = player.fishBonusTurnsLeft - 1;
      newPlayers[idx] = {
        ...player,
        fishBonusTurnsLeft: newTurns,
        fishBonusMultiplier: newTurns > 0 ? player.fishBonusMultiplier : 1,
      };
      set({ players: newPlayers });
    }

    // 追加ターン: 同じプレイヤーがもう一度（ターン番号は進めない）
    const refreshed = get().players[idx];
    if (refreshed.extraTurn) {
      const newPlayers = [...get().players];
      newPlayers[idx] = { ...refreshed, extraTurn: false };
      const cards = get().cityCards ? tickSlow(get().cityCards!, idx) : null;
      set({
        players: newPlayers,
        turnPhase: 'idle',
        ...TURN_RESET,
        cityCards: cards,
        pendingDiceCap: cards ? diceCap(cards, idx) : null,
      });
      saveGameState(get());
      return;
    }

    get().nextPlayer();
  },

  nextPlayer: () => {
    const { players, currentPlayerIndex, turn, settings } = get();
    const len = players.length;
    // カード: 手番を終えた人の牛歩を1つ減らす
    let cards = get().cityCards ? tickSlow(get().cityCards!, currentPlayerIndex) : null;
    // ループ内で逐次 set せず、走査用の作業コピーを1つ作り、最後に一度だけ反映する。
    // （複数プレイヤーが同時に skipNextTurn の場合に解除が巻き戻るバグを防ぐ）
    let workingPlayers = players.map(p => ({ ...p }));

    let nextIndex = (currentPlayerIndex + 1) % len;
    let newTurn = nextIndex === 0 ? turn + 1 : turn;

    let attempts = 0;
    while (attempts < len) {
      const cand = workingPlayers[nextIndex];
      if (cand.hasFinished) {
        nextIndex = (nextIndex + 1) % len;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      if (cand.skipNextTurn) {
        cand.skipNextTurn = false; // 作業コピーに対して解除（最後にまとめて反映）
        nextIndex = (nextIndex + 1) % len;
        if (nextIndex === 0) newTurn++;
        attempts++;
        continue;
      }
      break;
    }

    // まちづくり: ラウンド（月）が進んだら月末処理（monthEnd.ts: 収入・自然成長・季節の災害 → 保険 → 貧乏神 → 年度末）
    const city = get().city;
    let cityReport: CityReport | null = null;
    let cityNext = city;
    let yearEnd: YearEndResult | null = null;
    let titleHistory = get().cityTitleHistory;
    let binboEvent: GameState['cityBinboEvent'] = null;
    let binboBecame = false;
    if (city && isCityMode(settings) && newTurn > turn) {
      const m = runMonthEnd({
        city, cards, players: workingPlayers, fromTurn: turn, toTurn: newTurn, titleHistory,
        finalTurn: settings.maxTurns > 0 ? settings.maxTurns : undefined,
      });
      workingPlayers = m.players;
      cards = m.cards;
      cityNext = m.city;
      cityReport = m.report;
      yearEnd = m.yearEnd;
      titleHistory = m.titleHistory;
      binboEvent = m.binboEvent;
      binboBecame = m.binboBecame;
    }

    // 釣り旅: 最初のゴールから GOAL_CLOSE_ROUNDS 巡たったら締め切り（MIN_CLOSE_TURN 巡目より前には来ない）
    const ff = get().firstFinishTurn;
    if (!isCityMode(settings) && ff != null && newTurn > fishingLastTurn(ff, settings.maxTurns)) {
      set({ players: workingPlayers });
      get().endGame();
      return;
    }

    // 最大ターン到達: ラウンドが maxTurns を超えた時点で終了（全員が同数ラウンドをプレイ済み）
    if (settings.maxTurns > 0 && newTurn > settings.maxTurns) {
      set({ players: workingPlayers, city: cityNext, cityReport, cityYearEnd: yearEnd, cityTitleHistory: titleHistory, cityCards: cards });
      // まちづくり: 最後の月は結果画面へ飛ばさず、大決算を「最終決算」として見せる。閉じたら結果発表へ（monthEndSlice）
      if (isCityMode(settings) && yearEnd?.final) {
        set({ turnPhase: 'city_yearend', ...TURN_RESET });
        saveGameState(get());
        return;
      }
      get().endGame();
      return;
    }

    // 月末の見せ方（全画面か上部のお知らせか）は monthEnd.ts の planMonthEndDisplay
    const display = planMonthEndDisplay(cityReport, yearEnd, binboEvent, binboBecame, workingPlayers);
    set({
      players: workingPlayers,
      currentPlayerIndex: nextIndex,
      turn: newTurn,
      turnPhase: display.phase,
      ...TURN_RESET,
      city: cityNext,
      cityReport,
      cityYearEnd: yearEnd,
      cityTitleHistory: titleHistory,
      cityCards: cards,
      pendingDiceCap: cards ? diceCap(cards, nextIndex) : null,
      cityBinboEvent: display.binboFull ? binboEvent : get().cityBinboEvent,
    });
    display.notices.forEach(n => queueNotice(set, get, n));

    saveGameState(get());
  },

  setTurnPhase: (phase) => set({ turnPhase: phase }),
});
