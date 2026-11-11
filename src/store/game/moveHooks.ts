// 駒の移動が確定したとき（サイコロ・分かれ道・イベントの移動・ぶっとびカード）に呼ぶ処理。
// 呼ぶのは移動を set した直後で、到着の処理（cityArrival / executeNodeAction）より前。
// 移動そのものに反応する機能（すれ違い・通過で起きること）はここに足す。
import { transferOnMove, isGreat } from '../../game/binbo';
import { railFares } from '../../game/railways';
import { queueNotice } from './notices';
import type { GameGet, GameSet } from './types';

/** まちづくり: 移動経路が決まったら、貧乏神が他の駒へ移るかを判定する */
function binboAfterMove(set: GameSet, get: GameGet, path: string[]) {
  const st = get();
  const city = st.city;
  if (!city?.binbo || city.binbo.playerIndex === null || st.settings.mode !== 'city') return;
  const r = transferOnMove(city.binbo, st.currentPlayerIndex, path, st.players.map(p => p.currentNode));
  if (r.to === null) return;
  set({ city: { ...city, binbo: r.binbo } });
  queueNotice(set, get, { kind: 'binbo', reason: 'pass', playerIndex: r.to, fromIndex: st.currentPlayerIndex, great: isGreat(r.binbo) });
}

/** まちづくり: 他人の線路を通った分の運賃を持ち主へ払う（自分の線路はただ） */
function railFaresAfterMove(set: GameSet, get: GameGet, path: string[]) {
  const st = get();
  const rails = st.city?.rails;
  if (!rails || st.settings.mode !== 'city') return;
  const pi = st.currentPlayerIndex;
  const mover = st.players[pi];
  const fares = railFares(rails, path, pi, mover.money);
  if (fares.total <= 0) return;
  const players = st.players.map((p, i) => {
    if (i === pi) return { ...p, money: Math.max(0, p.money - fares.total) };
    const got = fares.payments.find(x => x.owner === i);
    return got ? { ...p, money: p.money + got.amount } : p;
  });
  set({ players });
  const owners = fares.payments.map(x => st.players[x.owner]?.name).filter(Boolean).join('・');
  queueNotice(set, get, { kind: 'city', title: `${mover.name}：汽車に乗った`, body: `運賃 ¥${fares.total.toLocaleString()} を${owners}の鉄道へ`, important: !mover.isCpu });
}

/** 移動が確定した直後の処理（path は出発マスから到着マスまで） */
export function afterMove(set: GameSet, get: GameGet, path: string[]) {
  railFaresAfterMove(set, get, path);
  binboAfterMove(set, get, path);
}
