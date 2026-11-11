// 釣り: ミニゲームの開始・進行・釣果（図鑑と売上）・CPU の釣り。
// まちづくりでは魚市場（fishMarket.ts）が効く: 売値は賑わい×漁場×物価、大物で町おこし、7月は釣り大会、道具は傷まない。
import type { CaughtFish, Fish, FishingRig, FishingState } from '../../game/types';
import { NODE_MAP } from '../../data/boardNodes';
import { selectFish, createCaughtFish, mergeSelectOpts, rigBlockReason, RIGS } from '../../game/fishing';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { saveEncyclopedia } from '../../utils/storage';
import { saveUserEncyclopedia } from '../../lib/firestore';
import { getEquippedItem } from '../../game/equipment';
import { portFee, startBoom } from '../../game/city';
import {
  FISH_MARKET, boatFishingCost, cpuTownCasts, fisheryOf, fishPriceParts, fishSalePrice, isBoomCatch, recordDerby,
} from '../../game/fishMarket';
import { random } from '../../utils/random';
import { cpuCatchChance } from '../../game/cpuAI';
import { MAX_FISHING_PER_TURN, isCityMode } from './initialState';
import { queueNotice } from './notices';
import { questFish } from './questHooks';
import type { GameGet, GameSet, GameSlice } from './types';
import { withCpuLine } from '../../data/cpuPersonas';

export interface FishingActions {
  /** rig: 仕掛け（数ねらい・ふつう・大物ねらい）。省けば「ふつう」。船釣りは「ふつう」で釣る */
  startFishing: (boatFishing?: boolean, rig?: FishingRig) => void;
  startBoatFishing: () => void;
  updateFishingState: (state: Partial<FishingState>) => void;
  catchFish: (caught: CaughtFish, bonusFish?: CaughtFish[]) => void;
  failFishing: () => void;
  endFishing: () => void;
  /** CPU: ミニゲームを遊ばずに確率で1回釣る */
  cpuFish: () => void;
  /** CPU（まちづくり）: 釣り場の町で、工事のあとに決まった回数だけ釣る。お知らせは1訪問1件にまとめる */
  cpuFishTown: () => void;
}

const FISH_BY_ID = new Map(FISH_DATABASE.map(f => [f.id, f]));

/** この1投が使う釣りの枠（大物ねらいは2回ぶん） */
function slotsOf(fs: FishingState | null): number {
  return RIGS[fs?.rig ?? 'futsu'].slots;
}

interface Sale {
  /** 売値の合計（大漁の魚こみ） */
  total: number;
  /** 釣り上げた1匹の売値 */
  main: number;
  /** 魚市場の倍率（釣り旅は 1） */
  mul: number;
  /** 大物で町おこしが起きたか */
  boom: boolean;
}

/**
 * 釣果を受け取る: 魚籠と図鑑に入れ、売値を払い、まちづくりなら魚市場の処理（水揚げ手数料・釣り大会・町おこし）をする。
 * 釣りの枠（nodeActionsThisTurn）もここで進める。
 */
function landCatch(set: GameSet, get: GameGet, caught: CaughtFish, bonusFish?: CaughtFish[]): Sale {
  const { players, currentPlayerIndex, encyclopedias, nodeActionsThisTurn, turn, fishingState } = get();
  const player = players[currentPlayerIndex];
  let city = get().city;

  // メイン + ボーナス魚を全てまとめる
  const allCaught = [caught, ...(bonusFish ?? [])];
  const allWithBonus = allCaught.map(c => ({ ...c, bonusMultiplier: player.fishBonusMultiplier }));

  // 売却金合計 & 図鑑更新（現在のプレイヤーのみ）。まちづくりの売値は魚市場の倍率（賑わい × 漁場 × 物価）を掛ける
  const mul = city ? fishPriceParts(city, player.currentNode, turn).mul : 1;
  let totalSellPrice = 0;
  let mainPrice = 0;
  const kinds: Fish[] = [];
  const newEncyclopedia = { ...encyclopedias[currentPlayerIndex] };
  allCaught.forEach((c, i) => {
    const fishData = FISH_BY_ID.get(c.fishId);
    const price = fishData ? fishSalePrice(fishData.rarity, c.size, mul) : Math.round(200 * mul);
    if (fishData) kinds.push(fishData);
    if (i === 0) mainPrice = price;
    totalSellPrice += price;
    newEncyclopedia[c.fishId] = true;
  });

  const newEncyclopedias = [...encyclopedias];
  newEncyclopedias[currentPlayerIndex] = newEncyclopedia;

  const newPlayers = [...players];
  newPlayers[currentPlayerIndex] = {
    ...player,
    caughtFish: [...player.caughtFish, ...allWithBonus],
    money: player.money + totalSellPrice,
  };
  let boom = false;
  if (city) {
    // 漁港の町なら水揚げ手数料（持ち主へ売上の3割（CITY_ECONOMY.portFeeRate）。市場が払うので釣り人は損しない）
    const fee = portFee(city, player.currentNode, totalSellPrice);
    if (fee && fee.fee > 0 && newPlayers[fee.owner]) {
      newPlayers[fee.owner] = { ...newPlayers[fee.owner], money: newPlayers[fee.owner].money + fee.fee };
    }
    // 7月は釣り大会: 売値の合計を数える（精算は月末。monthEnd.ts）
    city = recordDerby(city, currentPlayerIndex, totalSellPrice, turn, players.length);
    // 大物（レア以上）で町おこし: その町に特需
    if (city.towns[player.currentNode] && isBoomCatch(kinds)) {
      city = startBoom(city, player.currentNode, FISH_MARKET.boomMonths);
      boom = true;
    }
  }

  // 永続化（uidがあればFirestore、なければlocalStorage）
  if (player.uid) {
    saveUserEncyclopedia(player.uid, newEncyclopedia).catch(() => {});
  } else if (!player.isCpu) {
    // CPU の釣果で人のローカル図鑑を上書きしない
    saveEncyclopedia(newEncyclopedia);
  }

  const sale: Sale = { total: totalSellPrice, main: mainPrice, mul, boom };
  set({
    players: newPlayers,
    encyclopedias: newEncyclopedias,
    ...(city !== get().city ? { city } : {}),
    nodeActionsThisTurn: nodeActionsThisTurn + slotsOf(fishingState),
    fishingState: fishingState
      ? { ...fishingState, phase: 'result', escaped: false, tairyouCount: bonusFish?.length ?? 0, tairyouFishIds: (bonusFish ?? []).map(f => f.fishId), sale }
      : null,
  });
  questFish(set, get, currentPlayerIndex, allCaught); // お題係: 釣った種類を数える（数に届いていればその場で賞金。questHooks.ts）
  return sale;
}

export const createFishingSlice: GameSlice<FishingActions> = (set, get) => ({
  startFishing: (boatFishing, rig) => {
    const { players, currentPlayerIndex, nodeActionsThisTurn, city } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node) return;
    // 1手番の釣りの枠を使い切っていたら始めない（まちづくりの町の画面からは何度でも入り直せるため、ここで止める）
    if (nodeActionsThisTurn >= MAX_FISHING_PER_TURN) {
      set({ turnPhase: 'action_choice' });
      return;
    }

    // 仕掛け: 船釣りは「ふつう」。選べない仕掛け（竿のレベル・残りの枠が足りない）も「ふつう」に戻す
    const wanted: FishingRig = boatFishing ? 'futsu' : rig ?? 'futsu';
    const useRig: FishingRig = rigBlockReason(wanted, player.equipment, MAX_FISHING_PER_TURN - nodeActionsThisTurn) === null ? wanted : 'futsu';
    // まちづくり: 漁場の状態（公害で荒れる・幸福度が高いと豊か）で魚の出方が変わる
    const opts = mergeSelectOpts(RIGS[useRig].select, city ? fisheryOf(city, node.id).select : undefined);
    const fish = selectFish(
      node.id,
      node.region,
      player.equipment,
      node.type === 'fishing_special',
      boatFishing,
      opts,
    );

    set({
      fishingState: {
        phase: 'cast',
        miniGame: 'reeling',
        targetFish: fish,
        biteTimer: 0,
        hasBite: false,
        strikeSuccess: false,
        reelingProgress: 0,
        tension: 0,
        caughtSize: 1,
        escaped: false,
        boatFishing: !!boatFishing,
        tairyouCount: 0,
        rig: useRig,
      },
      turnPhase: 'fishing',
    });
  },

  startBoatFishing: () => {
    const { players, currentPlayerIndex, boatFishingRemaining, city, turn } = get();
    const player = players[currentPlayerIndex];

    if (boatFishingRemaining > 0) {
      // 既に船釣り中（無料で続行）
      set({ boatFishingRemaining: boatFishingRemaining - 1 });
      get().startFishing(true);
      return;
    }

    // 初回: お金を差し引き、残り2回をセット（まちづくりの船代は物価で上がる）
    const cost = boatFishingCost(city, turn);
    if (player.money < cost) return;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, money: player.money - cost };
    set({ players: newPlayers, boatFishingRemaining: 2 });
    get().startFishing(true);
  },

  updateFishingState: (partial) => {
    const { fishingState } = get();
    if (!fishingState) return;
    set({ fishingState: { ...fishingState, ...partial } });
  },

  catchFish: (caught, bonusFish) => {
    landCatch(set, get, caught, bonusFish);
  },

  failFishing: () => {
    const { nodeActionsThisTurn, fishingState } = get();
    set({
      nodeActionsThisTurn: nodeActionsThisTurn + slotsOf(fishingState),
      fishingState: fishingState
        ? { ...fishingState, phase: 'result', escaped: true }
        : null,
    });
  },

  endFishing: () => {
    const { settings, fishingState } = get();
    // 釣り後に装備消耗を適用（まちづくりでは道具は傷まない。大物ねらいで逃がすと傷みが倍）
    if (!isCityMode(settings)) {
      const times = fishingState?.escaped ? RIGS[fishingState.rig ?? 'futsu'].escapeWearMul : 1;
      for (let k = 0; k < times; k++) get().degradeEquipment();
    }
    // 釣り後は action_choice へ（もう1回釣るか選べる）
    set({ fishingState: null, turnPhase: 'action_choice' });
  },

  cpuFish: () => {
    const { players, currentPlayerIndex, turn, city, settings } = get();
    const player = players[currentPlayerIndex];
    const node = NODE_MAP.get(player.currentNode);
    if (!node || !getEquippedItem(player.equipment, 'rod')) {
      set({ turnPhase: 'action_choice' });
      return;
    }
    const fish = selectFish(node.id, node.region, player.equipment, node.type === 'fishing_special', false, city ? fisheryOf(city, node.id).select : undefined);
    const ok = random() < cpuCatchChance(player, fish);
    if (ok) {
      const caught = createCaughtFish(fish.id, node.id, turn, player.equipment);
      const sale = landCatch(set, get, caught);
      const catchText = `${node.name}で${caught.size >= 1.5 ? '大物の' : ''}${fish.name}（¥${sale.main.toLocaleString()}）`;
      get().announce(`${player.name}：${fish.name}を釣った`, caught.size >= 1.5 ? withCpuLine(player, 'big_fish', catchText, turn) : catchText);
    } else {
      get().failFishing();
      get().announce(`${player.name}：逃げられた`, `${node.name}で${fish.name}に糸を切られた`);
    }
    if (!isCityMode(settings)) get().degradeEquipment();
    set({ fishingState: null, turnPhase: 'action_choice' });
  },

  cpuFishTown: () => {
    const st = get();
    const seat = st.currentPlayerIndex;
    const player = st.players[seat];
    const node = NODE_MAP.get(player.currentNode);
    const casts = st.city && node ? cpuTownCasts(node.type, player.equipment, st.nodeActionsThisTurn) : 0;
    if (!node || casts <= 0) {
      set({ turnPhase: 'action_choice' });
      return;
    }
    const got: string[] = [];
    let total = 0;
    let boom = false;
    let lost = '';
    for (let k = 0; k < casts; k++) {
      const cur = get();
      const p = cur.players[seat];
      const fish = selectFish(node.id, node.region, p.equipment, node.type === 'fishing_special', false, cur.city ? fisheryOf(cur.city, node.id).select : undefined);
      if (random() < cpuCatchChance(p, fish)) {
        const caught = createCaughtFish(fish.id, node.id, cur.turn, p.equipment);
        const sale = landCatch(set, get, caught);
        got.push(`${caught.size >= 1.5 ? '大物の' : ''}${fish.name}`);
        total += sale.total;
        boom = boom || sale.boom;
      } else {
        get().failFishing();
        lost = fish.name;
      }
    }
    set({ fishingState: null, turnPhase: 'action_choice' });
    // お知らせは1訪問1件
    if (got.length) {
      const boomText = boom ? `。大物で町おこし、${node.name}に${FISH_MARKET.boomMonths}か月の特需` : '';
      queueNotice(set, get, { kind: 'city', title: `${player.name}：魚を釣った`, body: `${node.name}で${got.join('と')}（水揚げ ¥${total.toLocaleString()}）${boomText}` });
    } else {
      queueNotice(set, get, { kind: 'city', title: `${player.name}：逃げられた`, body: `${node.name}で${lost}に糸を切られた` });
    }
  },
});
