// まちづくり: お題の一覧（下から出るシート）。今年の舞台、3つのお題、全員の進み具合の棒、賞金、最初に達成した人。
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { QUEST_ECONOMY, QUEST_GROUP_LABEL, questPrize, questRows, questViewer, stageLabel } from '../../game/cityQuests';
import BottomSheet from '../fx/BottomSheet';
import Ruby from '../shared/Ruby';
import QuestSeal from './QuestSeal';

interface QuestSheetProps {
  onClose: () => void;
}

export default function QuestSheet({ onClose }: QuestSheetProps) {
  const { city, players, current } = useGameStore(useShallow(s => ({ city: s.city, players: s.players, current: s.currentPlayerIndex })));
  const rows = useMemo(() => (city ? questRows(city, players.length) : []), [city, players.length]);
  const quests = city?.quests;
  if (!quests) return null;
  const firstPrize = questPrize(quests.year, true);
  // 印（判子）は上の帯の札と同じく、見ている人が達成したら朱で塗る
  const viewer = questViewer(players.map(p => !!p.isCpu), current);

  return (
    <BottomSheet label="今年度のお題" onClose={onClose}>
      <div className="text-center">
        <p className="text-[11px] tracking-[0.3em] text-[#7a5a2a] font-mincho">{quests.year}<Ruby>年度</Ruby></p>
        <h3 className="font-brush text-2xl text-[#2a2118] leading-tight"><Ruby>今年度のお題</Ruby></h3>
      </div>

      {/* 今年の舞台 */}
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-kin-600/60 bg-kin-300/25 px-2.5 py-2">
        <span className="shrink-0 rounded-md bg-kin-600 px-1.5 py-1 text-xs font-bold font-mincho leading-tight text-white"><Ruby>今年の舞台</Ruby></span>
        <span className="min-w-0 leading-tight">
          <span className="block font-brush text-xl text-[#2a2118]"><Ruby>{stageLabel(quests.stage)}</Ruby></span>
          <span className="block text-[11px] text-[#6b5a44]"><Ruby>目的地は舞台の地方に出やすい</Ruby></span>
        </span>
      </div>

      <ul className="mt-2.5 space-y-2">
        {rows.map(row => (
          <li key={row.item.id} className="rounded-xl border border-[#9a6f24]/30 bg-white/45 px-2.5 py-2">
            <div className="flex items-start gap-2.5">
              <QuestSeal glyph={row.def.glyph} done={row.item.done.includes(viewer)} size={36} onWashi />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] tracking-widest text-[#7a5a2a] font-mincho"><Ruby>{QUEST_GROUP_LABEL[row.def.group]}</Ruby></p>
                <p className="font-mincho font-bold text-[15px] leading-snug text-[#2a2118]"><Ruby>{row.label}</Ruby></p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#4a3a28]">
                  <span><Ruby>賞金</Ruby> <span className="font-bold tabular-nums">¥{questPrize(quests.year, false).toLocaleString()}</span></span>
                  {row.open ? (
                    <span className="rounded-sm border border-kin-600/60 bg-kin-300/40 px-1.5 font-bold text-[#7a5a2a] whitespace-nowrap">
                      <Ruby>最初の達成</Ruby> <span className="tabular-nums">¥{firstPrize.toLocaleString()}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 min-w-0 text-[#7a5a2a]">
                      <span className="shrink-0"><Ruby>最初の達成</Ruby>：</span>
                      {row.firstBy.map(p => (
                        <span key={p} className="inline-flex items-center gap-1 min-w-0 font-bold text-[#2a2118]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: players[p]?.color }} />
                          <span className="truncate max-w-[7em]">{players[p]?.name}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* 全員の進み具合 */}
            <div className="mt-1.5 space-y-1" role="list" aria-label="全員の進み具合">
              {players.map((p, i) => {
                const done = row.item.done.includes(i);
                const have = Math.min(row.item.need, row.progress[i] ?? 0);
                return (
                  <div key={p.id} role="listitem" className="flex items-center gap-1.5 text-xs text-[#2a2118]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="w-[5.5em] shrink-0 truncate font-bold">{p.name}</span>
                    <span className="qs-bar on-washi flex-1" aria-hidden="true">
                      <span style={{ width: `${(have / row.item.need) * 100}%`, backgroundColor: p.color }} />
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums">{have}/{row.item.need}</span>
                    <span className="w-9 shrink-0 text-center">
                      {done && <span className="inline-block rounded-sm bg-shu-600 px-1 text-[10px] font-bold font-mincho leading-tight text-white"><Ruby>達成</Ruby></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[11px] leading-relaxed text-[#6b5a44]">
        <Ruby>{`誰でも達成できる。最初に達成した人は賞金${QUEST_ECONOMY.firstMul}倍。お題は4月に新しくなる。`}</Ruby>
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full min-h-11 rounded-xl border border-[#9a6f24]/50 bg-[#2a2118]/5 hover:bg-[#2a2118]/10 font-mincho font-bold text-[#2a2118] cursor-pointer"
      >
        <Ruby>閉じる</Ruby>
      </button>
    </BottomSheet>
  );
}
