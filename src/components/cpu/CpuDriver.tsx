// CPU の手番を自動で進める制御部品。現在のプレイヤーが CPU のとき、ターンの段階ごとに1手ずつ実行する。
// 何をしたかは通常の画面（地図・オーバーレイ・お知らせ）にそのまま映る。人が誤って操作しないよう薄い覆いを掛ける。
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { NODE_MAP } from '../../data/boardNodes';
import { getCapitalEvent } from '../../data/capitalEvents';
import { chooseCpuPath, chooseCityAction, chooseShopPurchase, chooseCapitalChoice } from '../../game/cpuAI';
import { BUILDING_INFO, CITY_ACTIONS_PER_VISIT, getTownInfo } from '../../game/city';
import { getEquippedItem, getEquipmentName } from '../../game/equipment';
import { randomInt, random } from '../../utils/random';
import { ROULETTE_MIN, ROULETTE_MAX } from '../../game/constants';
import Ruby from '../shared/Ruby';
import { playDiceRoll, playDiceLand } from '../../utils/sound';

/** 段階ごとの「間」（ms）。人が目で追える速さにする */
const DELAY: Record<string, number> = {
  idle: 900,
  roulette: 400,
  path_selection: 1100,
  fishing_choice: 900,
  shop: 900,
  event: 1200,
  capital_event: 1300,
  rest: 700,
  city: 1100,
  city_event: 1300,
  action_choice: 800,
};

function runCpuStep() {
  const st = useGameStore.getState();
  const player = st.players[st.currentPlayerIndex];
  if (!player?.isCpu || st.screen !== 'game') return;
  const node = NODE_MAP.get(player.currentNode);
  const isCity = st.settings.mode === 'city';

  switch (st.turnPhase) {
    case 'idle':
    case 'roulette': {
      const n = randomInt(ROULETTE_MIN, ROULETTE_MAX);
      playDiceRoll();
      window.setTimeout(playDiceLand, 350);
      st.announce(`${player.name}のサイコロ`, `🎲 ${n} が出た`);
      st.rollDice(n);
      return;
    }
    case 'path_selection': {
      const idx = chooseCpuPath({
        paths: st.reachableNodes,
        mode: isCity ? 'city' : 'fishing',
        player,
        playerIndex: st.currentPlayerIndex,
        city: st.city,
        turn: st.turn,
        maxTurns: st.settings.maxTurns,
        goalClaims: st.cityGoalClaims,
      });
      st.selectPath(idx);
      return;
    }
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
      if (!st.city || st.cityActionsThisTurn >= CITY_ACTIONS_PER_VISIT) {
        st.setTurnPhase('action_choice');
        return;
      }
      const monthsLeft = st.settings.maxTurns > 0 ? st.settings.maxTurns - st.turn + 1 : 24;
      const act = chooseCityAction(st.city, player.currentNode, st.currentPlayerIndex, player.money, player.cpuStyle ?? 'steady', monthsLeft);
      if (!act) {
        st.setTurnPhase('action_choice');
        return;
      }
      const town = getTownInfo(player.currentNode)?.name ?? '';
      if (act.type === 'build') {
        if (!st.cityBuild(act.plot, act.kind)) st.announce(`${player.name}：建設`, `${town}に${BUILDING_INFO[act.kind].name}を建てた`);
        else st.setTurnPhase('action_choice');
      } else if (act.type === 'upgrade') {
        const kind = st.city.towns[player.currentNode]?.plots[act.plot]?.kind;
        if (!st.cityUpgrade(act.plot)) st.announce(`${player.name}：再開発`, `${town}の${kind ? BUILDING_INFO[kind].name : '建物'}を再開発した`);
        else st.setTurnPhase('action_choice');
      } else if (act.type === 'renovate') {
        if (!st.cityRenovate(act.plot)) st.announce(`${player.name}：修繕`, `${town}の空き家を直した`);
        else st.setTurnPhase('action_choice');
      } else {
        const prev = st.city.towns[player.currentNode]?.plots[act.plot];
        if (!st.cityAcquire(act.plot)) st.announce(`${player.name}：買収`, `${town}の${prev ? BUILDING_INFO[prev.kind].name : '建物'}を${prev ? st.players[prev.owner]?.name : ''}から買収した`);
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
      // まちづくりの工事は到着時の町パネルで済ませている（ここで開き直すと往復し続ける恐れがある）
      st.setTurnPhase('turn_end');
      return;
    }
    default:
      // node_action / turn_end は GameScreen のタイマーが進める。city_report は人が閉じる。
      return;
  }
}

export default function CpuDriver() {
  const { player, turnPhase, nodeActions, cityActions, capResult, cityOutcome, money } = useGameStore(
    useShallow(s => ({
      player: s.players[s.currentPlayerIndex],
      turnPhase: s.turnPhase,
      nodeActions: s.nodeActionsThisTurn,
      cityActions: s.cityActionsThisTurn,
      capResult: s.lastCapitalResult,
      cityOutcome: s.lastCityEventOutcome,
      money: s.players[s.currentPlayerIndex]?.money,
    })),
  );
  const isCpu = !!player?.isCpu;

  useEffect(() => {
    if (!isCpu) return;
    const delay = DELAY[turnPhase];
    if (delay === undefined) return;
    const t = window.setTimeout(runCpuStep, delay);
    return () => clearTimeout(t);
    // 段階や状態が変わるたびに次の1手を予約する
  }, [isCpu, turnPhase, nodeActions, cityActions, capResult, cityOutcome, money, player?.currentNode]);

  // 決算の画面は人が閉じる（覆いを掛けない）
  if (!isCpu || turnPhase === 'city_report' || turnPhase === 'city_yearend') return null;
  return (
    <div className="fixed inset-0 z-[45] cursor-wait" aria-live="polite">
      <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-ai-900/85 border border-kin-500/40 text-washi text-xs font-mincho shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: player?.color }} />
        {player?.name} <Ruby>思案中</Ruby>…
      </div>
    </div>
  );
}
