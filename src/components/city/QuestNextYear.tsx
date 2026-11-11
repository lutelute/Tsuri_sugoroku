// まちづくり: 年度末の大決算の最後に出す「来年度のお題と舞台」。全画面を増やさず、大決算の中で次の年の目標を見せる。
// お題は月末の処理（monthEnd.ts）で引き直してあるので、ストアの quests が「終わった年度の次」のときだけ出す（最終決算では出さない）。
import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { QUEST_ECONOMY, questLabel, questDef, questPrize, stageLabel } from '../../game/cityQuests';
import Ruby from '../shared/Ruby';
import QuestSeal from './QuestSeal';

interface QuestNextYearProps {
  /** 終わった年度（大決算の年度） */
  year: number;
  /** 入場を始めるまでの待ち(ms)。番付と称号の後に出す */
  delay?: number;
}

export default function QuestNextYear({ year, delay = 0 }: QuestNextYearProps) {
  const quests = useGameStore(s => s.city?.quests);
  if (!quests || quests.year !== year + 1) return null;
  const prize = questPrize(quests.year, false);

  return (
    <div className="fx-rise mb-2 rounded-xl border border-kin-600/55 bg-kin-300/20 px-2.5 py-2" style={{ '--d': `${delay}ms` } as CSSProperties} data-guide="quest-next">
      <p className="text-center text-xs text-[#7a5a2a] tracking-widest font-mincho"><Ruby>来年度のお題</Ruby></p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[#2a2118]">
        <span className="shrink-0 rounded-md bg-kin-600 px-1.5 py-0.5 text-[11px] font-bold font-mincho leading-tight text-white"><Ruby>来年度の舞台</Ruby></span>
        <span className="font-brush text-lg leading-tight"><Ruby>{stageLabel(quests.stage)}</Ruby></span>
      </p>
      <ul className="mt-1.5 space-y-1">
        {quests.items.map(item => (
          <li key={item.id} className="flex items-center gap-2 rounded-lg bg-white/45 px-2 py-1">
            <QuestSeal glyph={questDef(item.id).glyph} size={26} onWashi />
            {/* 「来年度のお題」の欄なので、文の頭の「今年、」は外す（来年の話と取り違えないように） */}
            <span className="min-w-0 flex-1 font-mincho font-bold text-[13px] leading-snug text-[#2a2118]"><Ruby>{questLabel(item).replace(/^今年、/, '')}</Ruby></span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-[#1f6b3a]">¥{prize.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-center text-[10px] text-[#6b5a44]"><Ruby>{`最初に達成した人は賞金${QUEST_ECONOMY.firstMul}倍`}</Ruby></p>
    </div>
  );
}
