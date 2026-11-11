// 開発用（DevPanel）: 好きなマスへ飛ぶ・まちづくりの確かめ用のずる。
import { NODE_MAP } from '../../data/boardNodes';
import { simulateRound, drawCityEvent, CITY_INITIAL_MONEY } from '../../game/city';
import { addCard } from '../../game/cityCards';
import type { CityCardId } from '../../game/cityCards';
import { binboMischief, isGreat } from '../../game/binbo';
import { computeYearEnd } from '../../game/cityAwards';
import { isRouteNode, routeEnds } from '../../game/railways';
import { forceQuestDone, openQuestYear, questYearOf } from '../../game/cityQuests';
import { queueNotice } from './notices';
import { questNotice } from './questHooks';
import type { GameSlice } from './types';

export interface DevActions {
  warpCurrentPlayerTo: (nodeId: string) => void;
  devCityCheat: (kind: 'money' | 'simulate' | 'quake' | 'kaiju' | 'yearend' | 'cards' | 'binbo' | 'binboAct' | 'dest' | 'mayor' | 'rail' | 'quest') => void;
}

export const createDevSlice: GameSlice<DevActions> = (set, get) => ({
  warpCurrentPlayerTo: (nodeId) => {
    // 開発用: 現在のプレイヤーを任意のノードへ瞬間移動。アクション選択フェーズへ進める。
    const { players, currentPlayerIndex } = get();
    if (!NODE_MAP.has(nodeId)) return;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], currentNode: nodeId };
    set({
      players: newPlayers,
      turnPhase: 'node_action',
      rouletteResult: null,
      reachableNodes: [],
      nodeActionsThisTurn: 0,
      boatFishingRemaining: 0,
      cityActionsThisTurn: 0,
      capitalDoneThisTurn: false,
      cityBonusActions: 0,
    });
  },

  devCityCheat: (kind) => {
    const { city, players, currentPlayerIndex, turn } = get();
    if (!city) return;
    if (kind === 'money') {
      const newPlayers = [...players];
      newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], money: newPlayers[currentPlayerIndex].money + 50000 };
      set({ players: newPlayers });
    } else if (kind === 'cards') {
      let cs = get().cityCards;
      if (!cs) return;
      for (const id of ['kyuko', 'gyuho', 'kojiken', 'hoken'] as CityCardId[]) cs = addCard(cs, currentPlayerIndex, id).cs;
      set({ cityCards: cs });
    } else if (kind === 'binbo') {
      set({ city: { ...city, binbo: { playerIndex: currentPlayerIndex, months: 11 } } });
    } else if (kind === 'binboAct') {
      // 月末を待たずに、とりついている人へ悪さをさせる（確かめ用。とりついていなければ手番の人につける）
      const b = city.binbo && city.binbo.playerIndex !== null ? city.binbo : { playerIndex: currentPlayerIndex, months: 0 };
      const who = b.playerIndex!;
      const mm = binboMischief(b, { ...city, binbo: b }, who, players.map(p => p.money), players.map(p => p.name), turn);
      set({
        city: { ...mm.city, binbo: b },
        players: players.map((p, i) => ({ ...p, money: Math.max(0, p.money + (mm.moneyDeltas[i] ?? 0)) })),
        cityBinboEvent: { playerIndex: who, kind: mm.kind, message: mm.message, great: isGreat(b), moneyDelta: mm.moneyDeltas[who] ?? 0, giveTo: mm.giveTo },
      });
    } else if (kind === 'mayor') {
      // 今いる町の空き区画を手番の人の住宅で埋めて、町長にする
      const nodeId = players[currentPlayerIndex].currentNode;
      const town = city.towns[nodeId];
      if (!town) return;
      const plots = town.plots.map(p => p ?? { kind: 'res' as const, level: 1, owner: currentPlayerIndex, builtTurn: turn });
      set({ city: { ...city, towns: { ...city.towns, [nodeId]: { ...town, plots } } } });
    } else if (kind === 'rail') {
      // 今いるマスの隣の中継マスすべてに、手番の人の線路を敷く
      const nodeId = players[currentPlayerIndex].currentNode;
      const rails = { ...(city.rails ?? {}) };
      for (const r of routeEnds(nodeId)) if (isRouteNode(r) && rails[r] === undefined) rails[r] = currentPlayerIndex;
      set({ city: { ...city, rails } });
    } else if (kind === 'quest') {
      // お題を1つ達成にする（お題の無い古いセーブなら、今の年度のお題を引いてから）。賞金と「達成」の判子も出す（CPU の手番なら瓦版）
      const base = city.quests ? city : openQuestYear(city, questYearOf(turn), players.length);
      const r = forceQuestDone(base, currentPlayerIndex);
      if (!r) {
        set({ city: base });
        return;
      }
      const q = r.city.quests!;
      const isCpu = !!players[currentPlayerIndex]?.isCpu;
      set({
        city: isCpu ? r.city : { ...r.city, quests: { ...q, last: { seq: (q.last?.seq ?? 0) + 1, awards: [r.award] } } },
        players: players.map((p, i) => (i === currentPlayerIndex ? { ...p, money: p.money + r.award.prize } : p)),
      });
      if (isCpu) queueNotice(set, get, questNotice(r.award, players));
    } else if (kind === 'dest') {
      if (city.destination) get().warpCurrentPlayerTo(city.destination);
    } else if (kind === 'yearend') {
      const ye = computeYearEnd(city, players.map(p => p.money), turn, CITY_INITIAL_MONEY);
      set({ cityYearEnd: ye, turnPhase: 'city_yearend' });
    } else if (kind === 'simulate') {
      const sim = simulateRound(city, players.length, turn, players.map(p => p.money));
      set({
        city: sim.state,
        cityReport: sim.report,
        players: players.map((p, i) => ({ ...p, money: Math.max(0, p.money + sim.incomes[i]) })),
        turnPhase: 'city_report',
      });
    } else {
      const card = drawCityEvent('bad');
      const forced = { ...card, id: `dev_${kind}`, name: kind === 'quake' ? '大鯰が暴れた' : '大王イカ上陸', description: '（DEV）災害を発生させた', effect: { kind: 'disaster' as const, disaster: kind } };
      set({ currentCityEvent: forced, lastCityEventOutcome: null, turnPhase: 'city_event' });
    }
  },
});
