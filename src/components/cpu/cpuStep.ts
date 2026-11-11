// CPU の1手（ターンの段階ごとに1手ずつ）。React に依存しないので、テストからもストアを直接進められる。
// 何をしたかは通常の画面（地図・オーバーレイ・お知らせ）にそのまま映る。
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { getCapitalEvent } from '../../data/capitalEvents';
import { chooseCpuPath, chooseCityAction, chooseShopPurchase, chooseCapitalChoice, shouldBuySpecialty } from '../../game/cpuAI';
import { chooseOrdinance } from '../../game/mayorAI';
import { BUILDING_INFO, CITY_ACTIONS_PER_VISIT, getTownInfo, monopolyOwner } from '../../game/city';
import { describePath, pathAim, pathContextOf } from '../../game/pathAdvice';
import { withCpuLine } from '../../data/cpuPersonas';
import type { CpuScene } from '../../data/cpuPersonas';
import { aimKey, setCpuAim } from './cpuAim';
import { getEquippedItem, getEquipmentName } from '../../game/equipment';
import { randomInt, random } from '../../utils/random';
import { ROULETTE_MIN, ROULETTE_MAX } from '../../game/constants';
import { cpuTownCasts } from '../../game/fishMarket';

import { playDiceRoll, playDiceLand } from '../../utils/sound';
import { chooseCpuCard, rollDiceFaces, emptyPlotIndex } from '../../game/cityCards';
import { distancesFrom } from '../../game/city';
import type { CpuCardContext } from '../../game/cityCards';

/** CPU のカード判断に渡す状況 */
function cardContext(isInTown: boolean): CpuCardContext {
  const st = useGameStore.getState();
  const pi = st.currentPlayerIndex;
  const me = st.players[pi];
  const dd = st.city?.destination ? distancesFrom(st.city.destination) : null;
  const dist = (node: string) => (dd ? dd.get(node) ?? Infinity : Infinity);
  const town = st.city?.towns[me.currentNode];
  return {
    distToDestination: dist(me.currentNode),
    money: me.money,
    isInTown,
    opponents: st.players.map((p, i) => ({ index: i, distToDestination: dist(p.currentNode) })).filter(o => o.index !== pi),
    hasEmptyPlot: st.city ? emptyPlotIndex(st.city, me.currentNode) >= 0 : false,
    wantsAcquire: !!town && me.cpuStyle === 'monopoly' && town.plots.some(p => p && p.owner !== pi),
    pendingDice: st.pendingDiceCount,
  };
}

/** 町でのカード検討は1訪問1回まで（同じ手番で何度も考えない） */
const cpuTownCardTried = new Set<string>();

/** 道選びの先読み: 思案中の札に「狙い」を出すため、進む道を先に決めておく（同じ分かれ道なら1手でそのまま使う） */
let plannedPath: { paths: string[][]; index: number } | null = null;

/**
 * 進む道を決め、狙いの文（選んだ道のいちばん効いている理由。行き先のおすすめと同じ札）を思案中の札に出す。
 * 道選びの状況は pathContextOf（釣り旅: 誰かがゴールしたら締め切りを「最後の巡」として選ぶ）。
 */
function decideCpuPath(): number {
  const st = useGameStore.getState();
  if (plannedPath && plannedPath.paths === st.reachableNodes) return plannedPath.index;
  const ctx = pathContextOf(st);
  const index = chooseCpuPath(ctx);
  plannedPath = { paths: st.reachableNodes, index };
  setCpuAim({ key: aimKey(st.turn, st.currentPlayerIndex), text: pathAim(ctx, describePath(ctx, index)) });
  return index;
}

/** CPU が分かれ道で考えはじめたときに呼ぶ（CpuDriver）。進む道と狙いを先に決めて、札に出す */
export function planCpuPath() {
  const st = useGameStore.getState();
  const player = st.players[st.currentPlayerIndex];
  if (!player?.isCpu || st.screen !== 'game' || st.turnPhase !== 'path_selection' || st.reachableNodes.length === 0) return;
  decideCpuPath();
}

export function runCpuStep() {
  const st = useGameStore.getState();
  const player = st.players[st.currentPlayerIndex];
  if (!player?.isCpu || st.screen !== 'game') return;
  const node = NODE_MAP.get(player.currentNode);
  const isCity = st.settings.mode === 'city';

  switch (st.turnPhase) {
    case 'idle':
    case 'roulette': {
      // まちづくり: 振る前にカードを検討（急行・牛歩・保険・ぶっとび…）
      if (st.cityCards && st.turnPhase === 'idle') {
        const pick = chooseCpuCard(st.cityCards, st.currentPlayerIndex, cardContext(false));
        if (pick && !st.playCityCard(pick.index, pick.target)) {
          // ぶっとびで移動したら到着処理へ進む（振らない）
          if (useGameStore.getState().turnPhase !== 'idle') return;
        }
      }
      const st2 = useGameStore.getState();
      const faces = st2.cityCards ? rollDiceFaces(st2.pendingDiceCount, st2.pendingDiceCap) : [randomInt(ROULETTE_MIN, ROULETTE_MAX)];
      const n = faces.reduce((a, b) => a + b, 0);
      playDiceRoll();
      window.setTimeout(playDiceLand, 350);
      // 出目は CPU の「思案中」の札と残りマスの数え上げで見せる（毎手番の瓦版で上部を埋めない）
      st.rollDice(n);
      return;
    }
    case 'path_selection':
      st.selectPath(decideCpuPath());
      return;
    case 'fishing_choice':
      if (isCity) st.setTurnPhase('action_choice');
      else st.cpuFish();
      return;
    case 'shop': {
      if (isCity) {
        st.skipShop();
        return;
      }
      const buy = chooseShopPurchase(player, node?.shopTier ?? 1);
      if (buy) {
        st.buyEquipment(buy.type, buy.level, buy.cost);
        st.announce(`${player.name}：買い物`, `${getEquipmentName(buy.type, buy.level)}を ¥${buy.cost.toLocaleString()} で購入`);
      } else {
        st.skipShop();
      }
      return;
    }
    case 'event': {
      // 魚のイベントは人ならファイト（ミニゲーム）が要るので、CPU は6割の確率でだけ獲得する
      const kind = st.currentEvent?.effect.kind;
      const fishEvent = kind === 'random_fish' || kind === 'multi_fish';
      if (!fishEvent || random() < 0.6) st.applyEventCard();
      const p = useGameStore.getState().players[st.currentPlayerIndex];
      st.setTurnPhase(p?.hasFinished ? 'turn_end' : 'action_choice');
      return;
    }
    case 'capital_event': {
      if (st.lastCapitalResult) {
        st.acknowledgeCapitalResult();
        return;
      }
      const ev = node?.capitalEventId ? getCapitalEvent(node.capitalEventId) : undefined;
      if (!ev) {
        st.setTurnPhase(isCity ? 'city' : 'turn_end');
        return;
      }
      const choiceId = chooseCapitalChoice(ev, player);
      const label = ev.choices.find(c => c.id === choiceId)?.label ?? '';
      st.applyCapitalChoice(choiceId);
      st.announce(`${player.name}：${ev.title}`, `「${label}」を選んだ`);
      return;
    }
    case 'rest': {
      // 傷んだ装備を1つ直す（お金に余裕があれば）
      const worn = Object.values(player.equipment.equipped)
        .map(id => player.equipment.inventory.find(i => i.id === id))
        .filter((i): i is NonNullable<typeof i> => !!i && i.durability < 70)
        .sort((a, b) => a.durability - b.durability)[0];
      if (worn) {
        const cost = (100 - worn.durability) * 15;
        if (player.money - cost >= 1500) st.repairEquipment(worn.id, cost);
      }
      st.setTurnPhase('action_choice');
      return;
    }
    case 'city': {
      if (!st.city || st.cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT + st.cityBonusActions) {
        st.setTurnPhase('action_choice');
        return;
      }
      // 町に入った最初の一手でカードを検討（誘致・地上げ・工事券）
      if (st.cityCards && st.cityActionsThisTurn === 0 && !cpuTownCardTried.has(`${st.turn}:${st.currentPlayerIndex}`)) {
        cpuTownCardTried.add(`${st.turn}:${st.currentPlayerIndex}`);
        const pick = chooseCpuCard(st.cityCards, st.currentPlayerIndex, cardContext(true));
        if (pick && !st.playCityCard(pick.index, pick.target)) return;
      }
      // 名産のある町なら名産を検討（空きは買う・独占が完成するなら買収も。県庁かどうかは問わない）
      if (shouldBuySpecialty(st.city.specialties, player.currentNode, st.currentPlayerIndex, player.money, player.cpuStyle ?? 'steady')) {
        if (!st.cityBuySpecialty()) return;
      }
      const monthsLeft = st.settings.maxTurns > 0 ? st.settings.maxTurns - st.turn + 1 : 24;
      // 町長なら、まず条例を検討する（工事の回数は使わない。1か月に1回まで。お知らせはストアが出す）
      const ord = chooseOrdinance(st.city, player.currentNode, st.currentPlayerIndex, player.money, st.turn);
      if (ord && !st.cityEnact(ord.kind)) return;
      const act = chooseCityAction(st.city, player.currentNode, st.currentPlayerIndex, player.money, player.cpuStyle ?? 'steady', monthsLeft);
      if (!act) {
        st.setTurnPhase('action_choice');
        return;
      }
      const town = getTownInfo(player.currentNode)?.name ?? '';
      // CPU の人物のせりふ（損得係）: お知らせの本文の頭に足す（件数は増やさない）。
      // 1訪問の最初の工事だけ（続けて建てると同じ見出しに本文をつなぐので、2つ目からはせりふなし）。独占の完成はいつでも言う
      const isMono = () => {
        const t = useGameStore.getState().city?.towns[player.currentNode];
        return !!t && monopolyOwner(t) === st.currentPlayerIndex;
      };
      const wasMono = isMono();
      const say = (scene: CpuScene, body: string) => {
        if (!wasMono && isMono()) return withCpuLine(player, 'monopoly', body, st.turn);
        return st.cityActionsThisTurn === 0 ? withCpuLine(player, scene, body, st.turn) : body;
      };
      if (act.type === 'build') {
        if (!st.cityBuild(act.plot, act.kind)) st.announce(`${player.name}：建設`, say('build', `${town}に${BUILDING_INFO[act.kind].name}を建てた`));
        else st.setTurnPhase('action_choice');
      } else if (act.type === 'upgrade') {
        const kind = st.city.towns[player.currentNode]?.plots[act.plot]?.kind;
        if (!st.cityUpgrade(act.plot)) st.announce(`${player.name}：再開発`, say('upgrade', `${town}の${kind ? BUILDING_INFO[kind].name : '建物'}を再開発した`));
        else st.setTurnPhase('action_choice');
      } else if (act.type === 'renovate') {
        if (!st.cityRenovate(act.plot)) st.announce(`${player.name}：修繕`, `${town}の空き家を直した`);
        else st.setTurnPhase('action_choice');
      } else if (act.type === 'enact') {
        // 条例・線路のお知らせはストアが出す
        if (st.cityEnact(act.ordinance)) st.setTurnPhase('action_choice');
      } else if (act.type === 'rail') {
        if (st.cityLayRail(act.route)) st.setTurnPhase('action_choice');
      } else {
        const prev = st.city.towns[player.currentNode]?.plots[act.plot];
        if (!st.cityAcquire(act.plot)) st.announce(`${player.name}：買収`, say('acquire', `${town}の${prev ? BUILDING_INFO[prev.kind].name : '建物'}を${prev ? st.players[prev.owner]?.name : ''}から買収した`));
        else st.setTurnPhase('action_choice');
      }
      return;
    }
    case 'city_event':
      if (!st.lastCityEventOutcome) st.applyCityEventCard();
      else st.acknowledgeCityEvent();
      return;
    case 'action_choice': {
      if (!isCity && node && (node.type === 'fishing' || node.type === 'fishing_special')
        && st.nodeActionsThisTurn < MAX_FISHING_PER_TURN && getEquippedItem(player.equipment, 'rod')) {
        st.doActionAgain();
        return;
      }
      // まちづくり: 釣り場の町では、工事を終えたら決まった回数だけ釣る（魚市場。お知らせは1訪問1件。fishingSlice の cpuFishTown）
      if (isCity && st.city && cpuTownCasts(node?.type, player.equipment, st.nodeActionsThisTurn) > 0) {
        st.cpuFishTown();
        return;
      }
      // まちづくりの工事は到着時の町パネルで済ませている（ここで開き直すと往復し続ける恐れがある）
      st.setTurnPhase('turn_end');
      return;
    }
    default:
      // node_action / turn_end は GameScreen のタイマーが進める。city_report は人が閉じる。
      return;
  }
}
