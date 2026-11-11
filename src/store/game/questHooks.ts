// お題（game/cityQuests.ts）をストアにつなぐ。手番の中で起きたこと（工事・一番乗り・釣果）を数え、
// 数に届いていれば、その場で賞金を入れてお知らせを積む。月末にしか分からないもの（発展度・幸福度など）と
// 4月の引き直しは monthEnd.ts の runMonthEnd。数え方・判定・賞金の中身はすべて cityQuests.ts の純粋関数。
import type { CaughtFish, Player } from '../../game/types';
import type { Notice } from '../../game/tempo';
import type { QuestAward } from '../../game/cityQuests';
import { settleQuests, tallyWork, tallyFish, questAwardText } from '../../game/cityQuests';
import { withCpuLine } from '../../data/cpuPersonas';
import { queueNotice } from './notices';
import type { GameGet, GameSet } from './types';

/** お題達成のお知らせ（瓦版）。見出しは「名前：お題達成！」 */
export function questNotice(a: QuestAward, players: readonly Pick<Player, 'name' | 'isCpu' | 'cpuStyle'>[]): Notice {
  const p = players[a.playerIndex];
  return { kind: 'city', title: `${p?.name ?? ''}：お題達成！`, body: withCpuLine(p, 'quest', questAwardText(a), a.playerIndex), important: !p?.isCpu };
}

/**
 * お題の達成をその場で判定する。届いた人に賞金を入れて知らせる。
 * - 人が達成したとき: quests.last を進める（QuestBurst が「達成」の判子と賞金の数え上げを出す。同じ中身の瓦版は出さない）。
 * - CPU が達成したとき: 受け取るだけ。瓦版を順番待ちに積む。
 */
export function settleQuestsNow(set: GameSet, get: GameGet) {
  const st = get();
  if (!st.city?.quests) return;
  const r = settleQuests(st.city, st.players.length);
  if (!r.awards.length) return;
  const players = st.players.map((p, i) => {
    const gain = r.awards.reduce((acc, a) => acc + (a.playerIndex === i ? a.prize : 0), 0);
    return gain ? { ...p, money: p.money + gain } : p;
  });
  const q = r.city.quests!;
  const shown = r.awards.filter(a => !st.players[a.playerIndex]?.isCpu);
  const quests = shown.length ? { ...q, last: { seq: (q.last?.seq ?? 0) + 1, awards: shown } } : q;
  set({ city: { ...r.city, quests }, players });
  r.awards.filter(a => !shown.includes(a)).forEach(a => queueNotice(set, get, questNotice(a, players)));
}

/** 工事を1回した後に呼ぶ（工事をした地方と、built なら建てた数を数え、達成を判定する） */
export function questWork(set: GameSet, get: GameGet, playerIndex: number, nodeId: string, built = false) {
  const city = get().city;
  if (!city?.quests) return;
  const next = tallyWork(city, playerIndex, nodeId, built);
  if (next !== city) set({ city: next });
  settleQuestsNow(set, get);
}

/** 釣果の後に呼ぶ（釣った種類を数え、達成を判定する。祭りの名物釣り・出来事の魚は数えない） */
export function questFish(set: GameSet, get: GameGet, playerIndex: number, caught: readonly Pick<CaughtFish, 'fishId' | 'via'>[]) {
  const city = get().city;
  if (!city?.quests) return;
  const next = tallyFish(city, playerIndex, caught);
  if (next === city) return;
  set({ city: next });
  settleQuestsNow(set, get);
}
