// まちづくり: 上の帯の「お題」の札。今年のお題3つの進み具合と、今年の舞台を見せる。押すと一覧（QuestSheet）が出る。
// 見せるのは「見ている人」の数（人が1人ならその人、何人かで遊ぶときは手番の人。cityQuests.ts の questViewer）。
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { questRows, questViewer, stageLabel } from '../../game/cityQuests';
import type { QuestRow } from '../../game/cityQuests';
import Ruby from '../shared/Ruby';
import QuestSeal from './QuestSeal';

interface QuestChipProps {
  /** row: 帯の2段目いっぱいの札 / inline: 帯の1段目に入る小さな札（背の低い画面） */
  variant: 'row' | 'inline';
  onOpen: () => void;
}

/** お題1つぶんの小さな印: 判子・（広い画面では名前）・進み具合の棒・数 */
function Pip({ row, viewer, compact }: { row: QuestRow; viewer: number; compact: boolean }) {
  const done = row.item.done.includes(viewer);
  const have = Math.min(row.item.need, row.progress[viewer] ?? 0);
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <QuestSeal glyph={row.def.glyph} done={done} size={compact ? 16 : 18} />
      {!compact && (
        <>
          <span className="hidden sm:inline text-xs font-mincho text-washi/85 whitespace-nowrap"><Ruby>{row.def.short}</Ruby></span>
          <span className="qs-bar w-5 sm:w-9" aria-hidden="true">
            <span className={done ? 'is-done' : ''} style={{ width: `${(have / row.item.need) * 100}%` }} />
          </span>
          <span className={`hidden min-[420px]:inline text-[11px] tabular-nums whitespace-nowrap ${done ? 'text-shu-400 font-bold' : 'text-washi/70'}`}>
            {have}/{row.item.need}
          </span>
        </>
      )}
    </span>
  );
}

export default function QuestChip({ variant, onOpen }: QuestChipProps) {
  const { city, players, current } = useGameStore(
    useShallow(s => ({ city: s.city, players: s.players, current: s.currentPlayerIndex })),
  );
  const rows = useMemo(() => (city ? questRows(city, players.length) : []), [city, players.length]);
  const quests = city?.quests;
  if (!quests || rows.length === 0) return null;

  const viewer = questViewer(players.map(p => !!p.isCpu), current);
  const doneCount = rows.filter(r => r.item.done.includes(viewer)).length;
  const stage = stageLabel(quests.stage);
  const label = `お題 ${rows.length}つのうち${doneCount}つ達成。今年の舞台は${stage}。押すと一覧を開く`;

  const count = (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-kin-500/45 bg-kin-500/15 pl-2 pr-2 py-0.5 text-xs font-mincho text-kin-200 whitespace-nowrap">
      <Ruby>お題</Ruby>
      {/* 達成の数が変わったら一度だけ弾む */}
      <span key={doneCount} className="fx-pop tabular-nums font-bold text-kin-300">{doneCount}/{rows.length}</span>
    </span>
  );

  if (variant === 'inline') {
    return (
      <button
        type="button"
        data-guide="quest"
        onClick={onOpen}
        aria-label={label}
        title={`今年の舞台 ${stage}`}
        className="shrink-0 min-h-11 inline-flex items-center gap-1.5 cursor-pointer"
      >
        {count}
        <span className="inline-flex items-center gap-1">
          {rows.map(r => <Pip key={r.item.id} row={r} viewer={viewer} compact />)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-guide="quest"
      onClick={onOpen}
      aria-label={label}
      className="w-full min-h-11 flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 text-left border-t border-kin-500/15 bg-ai-950/35 hover:bg-ai-900/55 transition-colors cursor-pointer"
    >
      {count}
      <span className="flex items-center gap-1.5 sm:gap-4 min-w-0">
        {rows.map(r => <Pip key={r.item.id} row={r} viewer={viewer} compact={false} />)}
      </span>
      {/* 今年の舞台（年が替わったら一度だけ弾む） */}
      <span key={quests.year} className="fx-season-in ml-auto min-w-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-mincho text-washi/85">
        <span className="shrink-0 rounded-full border border-kin-400/70 bg-kin-500/25 px-1.5 py-px text-[10px] font-bold text-kin-300 whitespace-nowrap">
          <span className="hidden sm:inline"><Ruby>今年の舞台</Ruby></span>
          <span className="sm:hidden"><Ruby>舞台</Ruby></span>
        </span>
        <span className="truncate"><Ruby>{stage}</Ruby></span>
      </span>
      <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" className="shrink-0 text-kin-300/70">
        <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
