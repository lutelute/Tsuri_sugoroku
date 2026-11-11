// まちづくりの町での操作: 建設・再開発・買収・修繕・カード・名産・まちの出来事。
// 新しい町の操作（アクション）はここに足す。月末の処理は monthEnd.ts、町に着いたときの処理は cityArrival.ts。
import type { BuildingKind } from '../../game/city';
import {
  build as cityBuildFn, upgrade as cityUpgradeFn, acquire as cityAcquireFn, renovate as cityRenovateFn,
  plotValue, applyCityEvent, isTown, CITY_ACTIONS_PER_VISIT,
} from '../../game/city';
import {
  buyCard, playCard, consumeLandGrab, landGrabPrice, pickWarpDestination, emptyPlotIndex, suggestFreeBuildKind, freeBuild, CARD_INFO,
} from '../../game/cityCards';
import type { CityCardId } from '../../game/cityCards';
import { buySpecialty } from '../../game/citySpecialties';
import type { OrdinanceKind } from '../../game/mayor';
import { enactOrdinance } from '../../game/mayor';
import { layRail } from '../../game/railways';
import { settleDisasters } from '../../game/recovery';
import { NODE_MAP } from '../../data/boardNodes';
import { disasterQuote } from '../../data/cpuPersonas';
import { afterMove } from './moveHooks';
import { applyInsurance } from './monthEnd';
import { questWork } from './questHooks';
import type { GameSlice } from './types';

export interface CityActions {
  cityBuild: (plotIndex: number, kind: BuildingKind) => string | null;
  cityUpgrade: (plotIndex: number) => string | null;
  cityAcquire: (plotIndex: number) => string | null;
  cityRenovate: (plotIndex: number) => string | null;
  /** まちづくり: 手札のカードを使う（牛歩は target に相手の番号） */
  playCityCard: (index: number, target?: number) => string | null;
  /** まちづくり: カード売り場で買う */
  buyCityCard: (id: CityCardId) => string | null;
  /** まちづくり: 今いる町の名産を買う（他人のものは買収）。県庁と、名物で知られる町に名産がある */
  cityBuySpecialty: () => string | null;
  /** まちづくり: 町長として条例を決める（null は今の条例をやめる）。工事の回数は使わない（1か月に1回まで） */
  cityEnact: (kind: OrdinanceKind | null) => string | null;
  /** まちづくり: 今いる町の隣の中継マスに線路を敷く。工事1回を使う */
  cityLayRail: (routeId: string) => string | null;
  applyCityEventCard: () => void;
  acknowledgeCityEvent: () => void;
}

export const createCitySlice: GameSlice<CityActions> = (set, get) => ({
  cityBuild: (plotIndex, kind) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn, turn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityBuildFn(city, player.currentNode, plotIndex, kind, currentPlayerIndex, player.money, turn);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    questWork(set, get, currentPlayerIndex, player.currentNode, true); // お題: 建てた数・工事をした地方
    return null;
  },

  cityUpgrade: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityUpgradeFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    questWork(set, get, currentPlayerIndex, player.currentNode); // お題
    return null;
  },

  cityAcquire: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    // 地上げ: 有効なら買収価格が価値の1.1倍になる
    let cards = get().cityCards;
    const town = city.towns[player.currentNode];
    const plot = town?.plots[plotIndex];
    let price: number | null = null;
    if (cards && plot && plot.owner !== currentPlayerIndex) {
      const lg = consumeLandGrab(cards, currentPlayerIndex);
      if (lg.used) {
        price = landGrabPrice(plotValue(plot, player.currentNode, town));
        if (player.money < price) return 'お金が足りない';
        cards = lg.cs;
      }
    }
    const r = cityAcquireFn(city, player.currentNode, plotIndex, currentPlayerIndex, price !== null ? Infinity : player.money);
    if (!r.ok) return r.reason;
    const cost = price ?? r.cost;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - cost };
    if (r.prevOwner !== undefined && newPlayers[r.prevOwner]) {
      newPlayers[r.prevOwner] = { ...newPlayers[r.prevOwner], money: newPlayers[r.prevOwner].money + cost };
    }
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1, cityCards: cards });
    questWork(set, get, currentPlayerIndex, player.currentNode); // お題
    return null;
  },

  cityRenovate: (plotIndex) => {
    const { city, players, currentPlayerIndex, cityActionsThisTurn } = get();
    if (!city) return 'まちづくりモードではない';
    if (cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + get().cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + get().cityBonusActions}回まで`;
    const player = players[currentPlayerIndex];
    const r = cityRenovateFn(city, player.currentNode, plotIndex, currentPlayerIndex, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: cityActionsThisTurn + 1 });
    questWork(set, get, currentPlayerIndex, player.currentNode); // お題
    return null;
  },

  playCityCard: (index, target) => {
    const st = get();
    const cards = st.cityCards;
    if (!cards || !st.city) return 'まちづくりモードではない';
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const timing = st.turnPhase === 'idle' ? 'before_roll' : st.turnPhase === 'city' ? 'in_town' : null;
    if (!timing) return '今はカードを使えない';
    const r = playCard(cards, pi, index, target, {
      timing,
      hasEmptyPlot: emptyPlotIndex(st.city, player.currentNode) >= 0,
      pendingDice: st.pendingDiceCount,
    });
    if ('error' in r) return r.error;
    const e = r.effect;
    const name = CARD_INFO[r.card].name;
    switch (e.kind) {
      case 'dice':
        set({ cityCards: r.cs, pendingDiceCount: e.count });
        break;
      case 'warp': {
        const dest = pickWarpDestination(player.currentNode);
        const newPlayers = [...st.players];
        newPlayers[pi] = { ...player, currentNode: dest };
        set({
          cityCards: r.cs,
          players: newPlayers,
          turnPhase: 'node_action',
          lastMove: { playerIndex: pi, path: [player.currentNode, dest], seq: (st.lastMove?.seq ?? 0) + 1 },
        });
        afterMove(set, get, [player.currentNode, dest]);
        break;
      }
      case 'slow':
      case 'land_grab':
      case 'insurance':
        set({ cityCards: r.cs });
        break;
      case 'build_bonus':
        set({ cityCards: r.cs, cityBonusActions: st.cityBonusActions + e.extra });
        break;
      case 'free_build': {
        const idx = emptyPlotIndex(st.city, player.currentNode);
        const kind = idx >= 0 ? suggestFreeBuildKind(st.city, player.currentNode, idx) : null;
        if (idx < 0 || !kind) return '空き区画がない';
        const b = freeBuild(st.city, player.currentNode, idx, kind, pi, st.turn);
        if (!b.ok) return b.reason;
        set({ cityCards: r.cs, city: b.state });
        break;
      }
    }
    get().announce(`${player.name}：${name}`, r.message);
    if (e.kind === 'free_build') questWork(set, get, pi, player.currentNode, true); // お題: 誘致も建てた数に入る
    return null;
  },

  buyCityCard: (id) => {
    const st = get();
    if (!st.cityCards) return 'まちづくりモードではない';
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = buyCard(st.cityCards, pi, id, player.money, st.turn); // 値段は物価で年ごとに上がる（上限3倍）
    if ('error' in r) return r.error;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    set({ cityCards: r.cs, players: newPlayers });
    return null;
  },

  cityBuySpecialty: () => {
    const st = get();
    if (!st.city) return 'まちづくりモードではない';
    if (st.cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + st.cityBonusActions) return `1回の訪問で行える工事は${CITY_ACTIONS_PER_VISIT + st.cityBonusActions}回まで`;
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = buySpecialty(st.city.specialties, player.currentNode, pi, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    if (r.prevOwner !== undefined && newPlayers[r.prevOwner]) {
      newPlayers[r.prevOwner] = { ...newPlayers[r.prevOwner], money: newPlayers[r.prevOwner].money + r.cost };
    }
    set({ city: { ...st.city, specialties: { ...r.owners } }, players: newPlayers, cityActionsThisTurn: st.cityActionsThisTurn + 1 });
    get().announce(r.monopolyFormed ? `${player.name}：地方独占！` : `${player.name}：名産を手に入れた`, r.message);
    questWork(set, get, pi, player.currentNode); // お題
    return null;
  },

  cityEnact: (kind) => {
    const st = get();
    if (!st.city) return 'まちづくりモードではない';
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = enactOrdinance(st.city, player.currentNode, pi, kind, player.money, st.turn);
    if (!r.ok) return r.reason;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers });
    get().announce(`${player.name}：町長の条例`, r.message);
    questWork(set, get, pi, player.currentNode); // お題
    return null;
  },

  cityLayRail: (routeId) => {
    const st = get();
    if (!st.city) return 'まちづくりモードではない';
    const limit = CITY_ACTIONS_PER_VISIT + st.cityBonusActions;
    if (st.cityActionsThisTurn >= limit) return `1回の訪問で行える工事は${limit}回まで`;
    const pi = st.currentPlayerIndex;
    const player = st.players[pi];
    const r = layRail(st.city, player.currentNode, routeId, pi, player.money);
    if (!r.ok) return r.reason;
    const newPlayers = [...st.players];
    newPlayers[pi] = { ...player, money: player.money - r.cost };
    set({ city: r.state, players: newPlayers, cityActionsThisTurn: st.cityActionsThisTurn + 1 });
    get().announce(`${player.name}：鉄道`, r.message);
    questWork(set, get, pi, player.currentNode); // お題
    return null;
  },

  applyCityEventCard: () => {
    const { city, currentCityEvent, players, currentPlayerIndex, turn } = get();
    if (!city || !currentCityEvent) return;
    const player = players[currentPlayerIndex];
    const out = applyCityEvent(city, currentCityEvent, currentPlayerIndex, player.currentNode, turn);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: Math.max(0, player.money + out.moneyDelta) };
    // 保険: まちの出来事の災害で壊れた建物を守る
    const ins = applyInsurance(city, out.state, out.disaster ? [out.disaster] : [], get().cityCards);
    const saved = ins.protectedPlayers.map(i => players[i]?.name).filter(Boolean);
    // 復興: 保険のあとに残った被害の町は復興特需になり、全壊した建物の持ち主に見舞金が出る
    const settle = settleDisasters(city, ins.city, ins.disasters, players.length);
    settle.aid.forEach((v, i) => {
      if (v > 0 && newPlayers[i]) newPlayers[i] = { ...newPlayers[i], money: newPlayers[i].money + v };
    });
    const notes = [...(saved.length ? [`保険で守られた: ${saved.join('・')}`] : []), ...settle.headlines];
    // 災害に遭った CPU のひとこと（保険のあとに残った被害の持ち主。結果の文の頭に足す）
    const quote = disasterQuote(players, ins.disasters.flatMap(d => d.damages.map(x => x.owner)), turn);
    const message = quote + (notes.length ? `${out.message}（${notes.join('。')}）` : out.message);
    set({
      city: settle.state,
      players: newPlayers,
      cityCards: ins.cards,
      lastCityEventOutcome: { message, moneyDelta: out.moneyDelta, disaster: ins.disasters[0] ?? out.disaster },
    });
  },

  acknowledgeCityEvent: () => {
    const { players, currentPlayerIndex } = get();
    const node = NODE_MAP.get(players[currentPlayerIndex].currentNode);
    set({ currentCityEvent: null, lastCityEventOutcome: null, turnPhase: isTown(node) ? 'city' : 'action_choice' });
  },
});
