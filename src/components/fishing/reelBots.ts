// テスト専用: やり取りシミュレーションを遊ぶボット（reelSim.test.ts から使う）。
import type { FishMood, ReelParams, ReelState } from './reelSim';
import { createReelState, stepReel } from './reelSim';

export type BotKind = 'good' | 'novice' | 'careless' | 'greedy';

/**
 * good: 予兆/暴れを 0.3 秒遅れで見て手を離し、弱りで攻める（上達したプレイヤー）
 * novice: 予兆は見落とすが、魚が暴れ出したら 0.45 秒遅れで手を離す（慣れてきた子供）
 * careless: 魚の気分を無視し、テンションだけ見て押したり離したりする（初見のプレイヤー）
 * greedy: ずっと押しっぱなし
 */
export function playReel(kind: BotKind, p: ReelParams, rng: () => number, headStart = false, reaction = 0.3): ReelState {
  const s = createReelState(p, rng, headStart);
  const dt = 1 / 60;
  const lag = Math.max(1, Math.round(reaction / dt));
  const lag2 = Math.max(1, Math.round(0.45 / dt));
  const hist: FishMood[] = [];
  const tHist: number[] = [];
  let holding = false;
  let guard = 0;
  while (s.result === 'playing' && guard++ < 60 * 120) {
    hist.push(s.mood);
    tHist.push(s.tension);
    // 人間は画面を見てから指が動くまでに遅れがある（気分もテンションも reaction 秒前の値で判断）
    const seen = hist.length > lag ? hist[hist.length - 1 - lag] : 'calm';
    const ratio = (tHist.length > lag ? tHist[tHist.length - 1 - lag] : 0) / p.tensionLimit;
    if (kind === 'greedy') {
      holding = true;
    } else {
      if (holding && ratio >= 0.85) holding = false;
      else if (!holding && ratio <= 0.45) holding = true;
      if (kind === 'good') {
        if (seen === 'warn' || seen === 'surge') holding = false;
        else if (seen === 'tired' && ratio < 0.85) holding = true;
      } else if (kind === 'novice') {
        const seenLate = hist.length > lag2 ? hist[hist.length - 1 - lag2] : 'calm';
        if (seenLate === 'surge') holding = false;
      }
    }
    stepReel(s, p, dt, holding, rng);
  }
  return s;
}
