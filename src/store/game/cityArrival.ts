// まちづくり: マスに着いたときの処理（到着のフック）と、ゴールの着順賞金。
import type { TurnPhase } from '../../game/types';
import { REST_MONEY_BONUS } from '../../game/constants';
import { NODE_MAP } from '../../data/boardNodes';
import { isTown, recordInspection, startBoom, visitorFees, drawCityEvent, pickDestination, priceScale, distancesFrom, CITY_ECONOMY } from '../../game/city';
import { drawCard, addCard, CARD_DROP_VILLAGE, CARD_DROP_ROUTE, CARD_INFO } from '../../game/cityCards';
import { attachOnDestination, isGreat } from '../../game/binbo';
import { random } from '../../utils/random';
import { showFeeNotice, showInspectNotice } from '../../game/tempo';
import type { Notice } from '../../game/tempo';
import { withCpuLine, firstCpuQuote } from '../../data/cpuPersonas';
import { queueNotice } from './notices';
import { stageOf, tallyFirst } from '../../game/cityQuests';
import { settleQuestsNow } from './questHooks';
import type { GameGet, GameSet } from './types';

/** まちづくり: ゴール賞金（着順）。1人1回だけ */
const CITY_GOAL_REWARDS = [5000, 3000, 2000, 1000];

/** まちづくり: 中継マスの小さな道中イベント（釣り旅のカードの代わり） */
const ROAD_EVENTS: { title: string; body: string; amount: number }[] = [
  { title: '道の駅で名産を売った', body: '旅の途中で仕入れた名産が売れた', amount: 600 },
  { title: '峠の茶屋でひと休み', body: '団子代を払った', amount: -300 },
  { title: '落とし物を届けた', body: '持ち主からお礼をもらった', amount: 500 },
  { title: '通行料', body: '有料道路を通った', amount: -400 },
  { title: '観光客を案内した', body: 'ガイド料をもらった', amount: 800 },
  { title: '渋滞にはまった', body: '燃料代がかさんだ', amount: -500 },
];

/** まちづくり: ゴール到着の処理（着順賞金は1人1回。以後は記念のみ） */
export function claimCityGoal(claims: number[], playerIndex: number): { claims: number[]; reward: number; order: number | null } {
  if (claims.includes(playerIndex)) return { claims, reward: 0, order: null };
  const order = claims.length;
  return { claims: [...claims, playerIndex], reward: CITY_GOAL_REWARDS[order] ?? CITY_GOAL_REWARDS[CITY_GOAL_REWARDS.length - 1], order };
}

/**
 * まちづくり: マスに着いたときの処理（目的地の一番乗り → 利用料 → 視察 → マスの種類ごと → カード）。
 * 新しい「着いたら起きること」（条例の罰金・駅・復興の手伝いなど）はマスの種類ごとの switch の前後に足し、
 * お知らせは say(...) で積み、状態は最後の set にまとめる。
 */
export function executeCityNodeAction(set: GameSet, get: GameGet, nodeId: string) {
  const st = get();
  const { players, currentPlayerIndex, city } = st;
  if (!city) return;
  const player = players[currentPlayerIndex];
  const node = NODE_MAP.get(nodeId)!;
  const newPlayers = [...players];
  const p = { ...player };
  let nextCity = city;
  // この到着で起きたことは全部お知らせの順番待ちに積む（人の手番のものは溢れても捨てない）
  const notices: Notice[] = [];
  // 見出しには誰の話かを付ける（CPU の手番や、何人かで遊ぶときに取り違えないように）
  const say = (title: string, body: string) => notices.push({ kind: 'city', title: `${player.name}：${title}`, body, important: !player.isCpu });

  // 目的地に一番乗り → 賞金 + 次の目的地
  let bonusActions = st.cityBonusActions;
  if (city.destination === nodeId) {
    p.money += city.destinationReward;
    const nd = pickDestination(nodeId, nodeId, st.turn, stageOf(city.quests)); // 今年の舞台に寄せる
    const nextName = NODE_MAP.get(nd.nodeId)?.name ?? '';
    // せりふ（お知らせは増やさず本文の頭に足す）: 着いたのが CPU ならその人のひとこと、
    // 人なら「目的地を取られた」CPU のうち、目的地にいちばん近かった人のひとこと
    const dd = distancesFrom(nodeId);
    const rivals = players
      .map((pl, i) => ({ pl, i, d: dd.get(pl.currentNode) ?? Infinity }))
      .filter(x => x.i !== currentPlayerIndex)
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .map(x => x.pl);
    const lost = player.isCpu ? '' : firstCpuQuote(rivals, 'destination_lost', st.turn);
    say(`目的地「${node.name}」に一番乗り！`, lost + withCpuLine(player, 'destination', `賞金 ¥${city.destinationReward.toLocaleString()} 獲得。この町に特需が起き、工事が1回多くできる。次の目的地は「${nextName}」（¥${nd.reward.toLocaleString()}）`, st.turn));
    nextCity = startBoom({ ...city, destination: nd.nodeId, destinationReward: nd.reward }, nodeId);
    nextCity = tallyFirst(nextCity, currentPlayerIndex); // お題: 一番乗りの回数
    bonusActions += CITY_ECONOMY.destinationBonusActions;
    // 貧乏神: 目的地から一番遠い人にとりつく（1人プレイでは出ない）
    const prevB = nextCity.binbo;
    const nb = attachOnDestination(prevB, currentPlayerIndex, players.map(pl => pl.currentNode), nodeId, players.length, players.map(pl => pl.money));
    nextCity = { ...nextCity, binbo: nb };
    if (nb.playerIndex !== null && nb.playerIndex !== (prevB?.playerIndex ?? null)) {
      notices.push({ kind: 'binbo', reason: 'destination', playerIndex: nb.playerIndex, great: isGreat(nb) });
    }
  }

  // 客としての買い物代: 他人の商業地・観光名所に払う（持ち主の収入になる）
  const fees = visitorFees(nextCity, nodeId, currentPlayerIndex, p.money, st.turn); // 単価は物価で年ごとに上がる
  if (fees.total > 0) {
    p.money = Math.max(0, p.money - fees.total);
    for (const pay of fees.payments) {
      if (newPlayers[pay.owner] && pay.owner !== currentPlayerIndex) {
        newPlayers[pay.owner] = { ...newPlayers[pay.owner], money: newPlayers[pay.owner].money + pay.amount };
      }
    }
    // 瓦版は ¥500×物価 以上の買い物だけ（小さな買い物は静かに払う。下の帯の所持金の増減で分かる）
    if (showFeeNotice(fees.total, priceScale(st.turn))) {
      const who = fees.payments.map(x => players[x.owner]?.name).filter(Boolean).join('・');
      say(`${node.name}で買い物`, `¥${fees.total.toLocaleString()} を${who}の店へ（他人の商業地・観光名所がある町）`);
    }
  }

  // 視察: 自分の建物がある町に止まると、次の月末にその町の自分の建物が発展しやすくなる
  const insp = recordInspection(nextCity, nodeId, currentPlayerIndex);
  if (insp.inspected && insp.state !== nextCity) {
    nextCity = insp.state;
    // 瓦版は、その対局でその人が初めて視察したときだけ。2回目からは町の画面の「視察済み」の札だけ
    if (showInspectNotice(nextCity.inspectNoticed, currentPlayerIndex)) {
      nextCity = { ...nextCity, inspectNoticed: [...(nextCity.inspectNoticed ?? []), currentPlayerIndex] };
      say(`${node.name}を視察`, `次の月末、この町の${player.name}の建物は発展しやすくなる。これからは町の画面の「視察済み」の札を見よう`);
    }
  }

  let phase: TurnPhase = 'action_choice';
  const currentEvent = null;
  let currentCityEvent = null;
  let goalClaims = st.cityGoalClaims;
  let cards = st.cityCards;
  let cardDrawn = false;

  switch (node.type) {
    case 'event_good':
    case 'event_bad':
    case 'event_random': {
      // 村マスでは必ず「まちの出来事」（釣り旅のカードは混ぜない）
      const kind = node.type === 'event_good' ? 'good' : node.type === 'event_bad' ? 'bad' : 'random';
      currentCityEvent = drawCityEvent(kind);
      phase = 'city_event';
      if (cards && random() < CARD_DROP_VILLAGE) cardDrawn = true;
      break;
    }
    case 'route': {
      // 中継マス: 3割で小さな道中イベント
      if (cards && random() < CARD_DROP_ROUTE) cardDrawn = true;
      if (random() < 0.3) {
        const ev = ROAD_EVENTS[Math.floor(random() * ROAD_EVENTS.length)];
        const amount = ev.amount * priceScale(st.turn); // 道中の額も物価で年ごとに上がる
        p.money = Math.max(0, p.money + amount);
        say(`道中: ${ev.title}`, `${ev.body}（${amount >= 0 ? '+' : '−'}¥${Math.abs(amount).toLocaleString()}）`);
      }
      break;
    }
    case 'rest':
      p.money += REST_MONEY_BONUS;
      phase = 'city';
      break;
    case 'goal': {
      const g = claimCityGoal(st.cityGoalClaims, currentPlayerIndex);
      goalClaims = g.claims;
      p.money += g.reward;
      if (g.order !== null) say(`南の果てに${g.order + 1}番目に到達！`, `着順賞金 ¥${g.reward.toLocaleString()}（賞金は1人1回）。まちづくりはまだまだ続く`);
      else say('南の果てに再訪', 'ゴール賞金はもう受け取り済み。町へ戻って稼ごう');
      break;
    }
    case 'start':
      phase = 'shop';
      break;
    default:
      phase = isTown(node) ? 'city' : 'action_choice';
  }

  // カードを1枚引く（村マスの半分・中継マスの一部）
  if (cards && cardDrawn) {
    const card = drawCard();
    const added = addCard(cards, currentPlayerIndex, card);
    cards = added.cs;
    const extra = added.discarded ? `（手札がいっぱいなので「${CARD_INFO[added.discarded].name}」を捨てた）` : '';
    say(`カード「${CARD_INFO[card].name}」を手に入れた`, `${CARD_INFO[card].desc}${extra}`);
  }

  newPlayers[currentPlayerIndex] = p;
  set({
    cityCards: cards,
    players: newPlayers,
    city: nextCity,
    turnPhase: phase,
    currentEvent,
    currentCityEvent,
    lastCityEventOutcome: null,
    cityGoalClaims: goalClaims,
    cityBonusActions: bonusActions,
  });
  notices.forEach(n => queueNotice(set, get, n));
  // お題: 一番乗りで数に届いていれば、その場で達成（賞金とお知らせ）
  settleQuestsNow(set, get);
}
