// まちづくりの月末処理（ストアに依存しない関数）。
//   runMonthEnd: 収入・自然成長・季節の災害（simulateRound）→ 保険 → 貧乏神の悪さ → 年度末の大決算
//   planMonthEndDisplay: 月末をどう見せるか（全画面の決算・年度末・貧乏神の寸劇か、上部のお知らせか）
// 乱数は utils/random の random() を使うので、呼ぶ順番を変えるとシード付きのテストの結果が変わる。
import type { GameState, Player, TurnPhase } from '../../game/types';
import { simulateRound, getTownInfo, TIER_LABEL, calendarLabel, priceRiseAfter, CITY_INITIAL_MONEY } from '../../game/city';
import type { CityDisasterReport, CityReport, CityState } from '../../game/city';
import { settleDisasters } from '../../game/recovery';
import { protectInsured } from '../../game/cityCards';
import type { CardState } from '../../game/cityCards';
import { tickMonth, binboMischief, isGreat, becameGreat } from '../../game/binbo';
import { computeYearEnd, isYearEndTurn } from '../../game/cityAwards';
import type { YearEndResult } from '../../game/cityAwards';
import { isNotableMonth, showBinboFullScreen } from '../../game/tempo';
import type { Notice } from '../../game/tempo';
import { binboNotice } from './notices';
import { settleDerby, DERBY_HEADLINE_PREFIX } from '../../game/fishMarket';
import { settleQuests, questAwardText, openQuestYear, isQuestDrawTurn, questYearOf } from '../../game/cityQuests';
import { questNotice } from './questHooks';
import { disasterQuote } from '../../data/cpuPersonas';

/** まちづくり: 災害の前後で保険を効かせる（保険に入っている人の壊れた建物を元に戻す） */
export function applyInsurance(
  before: CityState, after: CityState, disasters: CityDisasterReport[], cards: CardState | null,
): { city: CityState; disasters: CityDisasterReport[]; cards: CardState | null; protectedPlayers: number[] } {
  if (!cards || !disasters.length) return { city: after, disasters, cards, protectedPlayers: [] };
  let city = after;
  let cs = cards;
  const out: CityDisasterReport[] = [];
  const saved: number[] = [];
  for (const d of disasters) {
    const r = protectInsured(before, city, d, cs);
    city = r.city;
    cs = r.cs;
    out.push(r.report);
    saved.push(...r.protectedPlayers);
  }
  return { city, disasters: out, cards: cs, protectedPlayers: [...new Set(saved)] };
}

export interface MonthEndInput {
  city: CityState;
  cards: CardState | null;
  /** 手番の人たち。所持金は返り値の players で受け取る（この配列は書き換えない） */
  players: Player[];
  /** 締める月の範囲（fromTurn 以上 toTurn 未満。ふつうは1か月） */
  fromTurn: number;
  toTurn: number;
  titleHistory: GameState['cityTitleHistory'];
  /** 対局の最後の月（この月は3月でなくても大決算をして「最終決算」にする） */
  finalTurn?: number;
}

export interface MonthEndResult {
  city: CityState;
  cards: CardState | null;
  players: Player[];
  /** 最後に締めた月の決算 */
  report: CityReport | null;
  yearEnd: YearEndResult | null;
  titleHistory: GameState['cityTitleHistory'];
  /** 最後に起きた貧乏神の悪さ（無ければ null） */
  binboEvent: GameState['cityBinboEvent'];
  /** その悪さが大貧乏神に化けた月のものか */
  binboBecame: boolean;
}

/**
 * 月末の処理。月ごとに次の順で進める:
 *   1. 収入・自然成長・季節の災害（simulateRound）
 *   2. 保険（季節の災害で壊れた建物を守る）→ 復興（残った被害の町に復興特需・全壊の見舞金）
 *   3. 貧乏神（月を数え、とりついた人に悪さ）
 *   ── 新しい月末の処理（町の特色・復興・条例・鉄道の収入など）は、ここ（年度末の前）に足す ──
 *      お題（達成の判定と賞金。決算の見出しとお知らせに出す）
 *      釣り大会（7月の水揚げ1位に賞金。決算の見出しとお知らせに出す）
 *   4. 3月なら年度末の大決算（番付と称号の賞金/罰金）
 *   5. 次の月が4月なら、来年度のお題と今年の舞台を引く（最後の月は引かない）
 */
export function runMonthEnd(input: MonthEndInput): MonthEndResult {
  const workingPlayers = input.players.map(p => ({ ...p }));
  let cards = input.cards;
  let cityNext = input.city;
  let cityReport: CityReport | null = null;
  let yearEnd: YearEndResult | null = null;
  let titleHistory = input.titleHistory;
  let binboEvent: GameState['cityBinboEvent'] = null;
  let binboBecame = false;
  for (let t = input.fromTurn; t < input.toTurn; t++) {
    const before = cityNext;
    const sim = simulateRound(before, workingPlayers.length, t, workingPlayers.map(p => p.money));
    sim.incomes.forEach((v, i) => {
      workingPlayers[i].money = Math.max(0, workingPlayers[i].money + v);
    });
    // 保険: 季節の災害で壊れた建物を守る
    const ins = applyInsurance(before, sim.state, sim.report.disasters, cards);
    cards = ins.cards;
    cityNext = ins.city;
    cityReport = { ...sim.report, disasters: ins.disasters };
    if (ins.protectedPlayers.length) {
      cityReport = { ...cityReport, headlines: [...cityReport.headlines, `保険で守られた: ${ins.protectedPlayers.map(i => workingPlayers[i]?.name).join('・')}`] };
    }
    // 復興: 保険のあとに残った被害の町は復興特需になり、全壊した建物の持ち主に見舞金が出る
    const settle = settleDisasters(before, cityNext, ins.disasters, workingPlayers.length);
    cityNext = settle.state;
    if (settle.aid.some(v => v > 0)) {
      settle.aid.forEach((v, i) => {
        if (workingPlayers[i]) workingPlayers[i].money += v;
      });
      cityReport = { ...cityReport, players: cityReport.players.map((r, i) => (settle.aid[i] > 0 ? { ...r, aid: settle.aid[i] } : r)) };
    }
    if (settle.headlines.length) {
      // 災害に遭った CPU のひとこと（保険のあとに残った被害の持ち主。見出しは増やさず、復興の見出しの頭に足す）
      const quote = disasterQuote(workingPlayers, ins.disasters.flatMap(d => d.damages.map(x => x.owner)), t);
      cityReport = { ...cityReport, headlines: [...cityReport.headlines, quote + settle.headlines[0], ...settle.headlines.slice(1)] };
    }
    // 貧乏神: 月を数え（12か月で大貧乏神）、とりついた人に悪さをする
    const prevB = cityNext?.binbo;
    if (cityNext && prevB && prevB.playerIndex !== null) {
      const b = tickMonth(prevB);
      const who = b.playerIndex!;
      const mm = binboMischief(b, { ...cityNext, binbo: b }, who, workingPlayers.map(p => p.money), workingPlayers.map(p => p.name), t);
      mm.moneyDeltas.forEach((d, i) => {
        if (workingPlayers[i]) workingPlayers[i].money = Math.max(0, workingPlayers[i].money + d);
      });
      cityNext = { ...mm.city, binbo: b };
      const became = becameGreat(prevB, b);
      if (mm.kind !== 'none' || became) {
        // 月が2つ以上進んでも、見せる悪さ（最後の月）が化けた月のものかで寸劇にするかを決める
        binboBecame = became;
        binboEvent = { playerIndex: who, kind: mm.kind, message: became ? `貧乏神が大貧乏神に化けた！ ${mm.message}` : mm.message, great: isGreat(b), moneyDelta: mm.moneyDeltas[who] ?? 0, giveTo: mm.giveTo };
      }
    }
    // お題: 月末にしか分からないもの（発展度・幸福度・町長の交代など）を判定し、届いた人に賞金を入れる（cityQuests.ts）
    const quest = settleQuests(cityNext, workingPlayers.length);
    if (quest.awards.length) {
      cityNext = quest.city;
      for (const a of quest.awards) {
        if (workingPlayers[a.playerIndex]) workingPlayers[a.playerIndex].money += a.prize;
      }
      cityReport = {
        ...cityReport,
        questDone: quest.awards,
        headlines: [...cityReport.headlines, ...quest.awards.map(a => `お題達成: ${workingPlayers[a.playerIndex]?.name ?? ''} ${questAwardText(a)}`)],
      };
    }
    // 釣り大会（7月だけ）: その月の水揚げ（釣った魚の売値の合計）が1位の人に賞金（fishMarket.ts の settleDerby）
    const derby = settleDerby(cityNext, t, workingPlayers.map(p => p.name));
    cityNext = derby.state;
    if (derby.headline) {
      for (const i of derby.winners) {
        if (workingPlayers[i]) workingPlayers[i].money += derby.prize;
      }
      cityReport = { ...cityReport, headlines: [...cityReport.headlines, derby.headline] };
    }
    // 3月は年度末の大決算: 番付と称号（称号は賞金/罰金つき）
    const isFinal = t === input.finalTurn;
    if (isYearEndTurn(t) || isFinal) {
      yearEnd = computeYearEnd(cityNext, workingPlayers.map(p => p.money), t, CITY_INITIAL_MONEY);
      if (isFinal) yearEnd = { ...yearEnd, final: true };
      for (const title of yearEnd.titles) {
        const wp = workingPlayers[title.playerIndex];
        if (wp) wp.money = Math.max(0, wp.money + title.prize);
      }
      titleHistory = [...titleHistory, { year: yearEnd.year, titles: yearEnd.titles }];
    }
    // お題: 次の月が4月なら、来年度のお題と舞台を引く（最後の月は引かない。お題の無い古いセーブもここで引く）
    if (isQuestDrawTurn(t + 1) && !isFinal) cityNext = openQuestYear(cityNext, questYearOf(t + 1), workingPlayers.length);
  }
  return { city: cityNext, cards, players: workingPlayers, report: cityReport, yearEnd, titleHistory, binboEvent, binboBecame };
}

export interface MonthEndDisplay {
  /** 次の手番の始まりの段階（年度末・全画面の決算・そのまま） */
  phase: TurnPhase;
  /** 貧乏神の悪さを寸劇（cityBinboEvent）で見せるか。false ならお知らせに入っている */
  binboFull: boolean;
  /** 上部のお知らせ（この順に積む） */
  notices: Notice[];
}

/** 月末をどう見せるか。月末の処理が無かった手番（report も yearEnd も無い）なら何も出さない */
export function planMonthEndDisplay(
  cityReport: CityReport | null, yearEnd: YearEndResult | null,
  binboEvent: GameState['cityBinboEvent'], binboBecame: boolean, workingPlayers: Player[],
): MonthEndDisplay {
  // 月末決算の見せ方: 年度末は大決算、災害で壊れた建物がある月と人の建物が衰退・空き家になった月だけ全画面、
  // それ以外（成長・発展度の上昇だけ）は上部のお知らせで流す（tempo.ts の isNotableMonth）
  const humans = workingPlayers.map((p, i) => (p.isCpu ? -1 : i)).filter(i => i >= 0);
  const notable = isNotableMonth(cityReport, humans);
  // 貧乏神の悪さ: 人がとりつかれた月・大貧乏神に化けた月は寸劇、CPU の普通の月はお知らせで流す
  const binboFull = !!binboEvent && showBinboFullScreen(!!workingPlayers[binboEvent.playerIndex]?.isCpu, binboBecame, humans.length > 0);
  const phase: TurnPhase = yearEnd ? 'city_yearend' : notable ? 'city_report' : 'idle';
  const notices: Notice[] = [];
  const ups = (cityReport?.tierChanges ?? []).filter(c => c.to > c.from);
  if (ups.length && (notable || yearEnd)) {
    // 決算画面の見出しにも出るが、地図に戻ったときに分かるよう短く知らせる
    notices.push({ kind: 'city', title: '町が発展した', body: ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・') });
  }
  // 全画面の決算を出さない月（年度末の3月は大決算が決算の代わり）は、月の決算を上部のお知らせで流す。
  // 成長（▲）・衰退（▼）・空き家と災害もここで分かるようにする
  if (cityReport && (!notable || yearEnd)) {
    const cal = calendarLabel(cityReport.turn);
    const summary = cityReport.players
      .map((r, i) => `${workingPlayers[i]?.name} ${r.net >= 0 ? '+' : '−'}¥${Math.abs(r.net).toLocaleString()}${r.grown > 0 ? ` ▲${r.grown}` : ''}${r.declined > 0 ? ` ▼${r.declined}` : ''}${(r.vacated ?? 0) > 0 ? ` 空${r.vacated}` : ''}`)
      .join(' ／ ');
    const upText = ups.length && !yearEnd ? ` ／ ${ups.map(c => `${getTownInfo(c.nodeId)?.name}が発展度${TIER_LABEL[c.to]}に`).join('・')}` : '';
    const disasterText = cityReport.disasters.length
      ? ` ／ ${cityReport.disasters.map(d => `${d.title}（${d.damages.length ? `${d.damages.length}軒に被害` : '被害なし'}）`).join('・')}`
      : '';
    notices.push({ kind: 'city', title: `${cal.month}月の決算`, body: summary + upText + disasterText });
  }
  // お題: 月末に達成されたお題（全画面の決算の月は見出しにも出ている）
  for (const a of cityReport?.questDone ?? []) notices.push(questNotice(a, workingPlayers));
  // 釣り大会（7月）の結果（全画面の決算の月は見出しにも出ている）
  const derbyLine = cityReport?.headlines.find(h => h.startsWith(`${DERBY_HEADLINE_PREFIX}: `));
  if (derbyLine) notices.push({ kind: 'city', title: DERBY_HEADLINE_PREFIX, body: derbyLine.slice(DERBY_HEADLINE_PREFIX.length + 2), important: true });
  if (binboEvent && !binboFull) notices.push(binboNotice(binboEvent, workingPlayers));
  // 物価: 3月を締めたら（4月の始まり）、賞金も貧乏神の悪さも上がることを瓦版で知らせる（ふりがな辞書で読める言い回しにしてある）
  const rise = cityReport ? priceRiseAfter(cityReport.turn) : null;
  if (rise) {
    notices.push({ kind: 'city', title: '物価が上がる', body: `4月から賞金も貧乏神の悪さも、はじめの${Math.round(rise.scale * 10) / 10}倍。カードと買い物代も高くなる`, important: true });
  }
  return { phase, binboFull, notices };
}
