// まちづくり: お題を達成した瞬間の演出。「達成」の判子がぽんと押され、賞金が数え上がる（一度きり・約2.6秒で消える）。
// 手番の中で人が達成したとき（ストアの quests.last の通し番号が進んだとき）だけ出す。CPU の達成と月末の達成は瓦版で知らせる。
// 押せる物の邪魔をしないよう、タップは素通しする。
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { QUEST_ECONOMY, questLabel } from '../../game/cityQuests';
import Confetti from '../fx/Confetti';
import Stamp from '../fx/Stamp';
import { useCountUp } from '../fx/useCountUp';
import { playGood } from '../../utils/sound';
import Ruby from '../shared/Ruby';

/** 演出を出している時間（index.css の qs-burst の長さと合わせる） */
const BURST_MS = 2600;

function Prize({ value }: { value: number }) {
  const shown = useCountUp(value, 900, 0, 380);
  return <span className="tabular-nums">+¥{shown.toLocaleString()}</span>;
}

export default function QuestBurst() {
  const { last, players } = useGameStore(useShallow(s => ({ last: s.city?.quests?.last, players: s.players })));
  // 画面を開いた時点（再開したセーブなど）の達成は、もう見たものとして出さない
  const [seenSeq, setSeenSeq] = useState(() => last?.seq ?? 0);
  const active = last && last.seq !== seenSeq && last.awards.length > 0 ? last : null;
  const activeSeq = active?.seq;

  useEffect(() => {
    if (activeSeq === undefined) return;
    playGood(); // 判子の「ポン」（Stamp）に、達成の音を重ねる
    const t = window.setTimeout(() => setSeenSeq(activeSeq), BURST_MS);
    return () => clearTimeout(t);
  }, [activeSeq]);

  if (!active || typeof document === 'undefined') return null;
  const who = players[active.awards[0].playerIndex];
  const anyFirst = active.awards.some(a => a.first);

  // 上の帯は backdrop-filter で fixed の基準が変わるので、body へポータルで描く
  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-center justify-center pointer-events-none" role="status" aria-live="polite">
      {anyFirst && <Confetti variant="kin" mode="burst" count={30} seed={active.seq} originY="46%" />}
      <div key={active.seq} className="qs-burst washi-card rounded-2xl pl-3 pr-4 py-3 shadow-2xl w-[340px] max-w-[90vw] flex items-center gap-3" style={{ borderTop: '4px solid #b8862f' }}>
        <Stamp tone="shu" size={66} delay={140} tilt={-9}>達成</Stamp>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] text-[#7a5a2a] font-mincho">
            <span className="tracking-[0.3em]"><Ruby>お題</Ruby></span>
            {who && (
              <span className="inline-flex items-center gap-1 min-w-0 font-bold text-[#2a2118]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: who.color }} />
                <span className="truncate">{who.name}</span>
              </span>
            )}
          </p>
          {active.awards.map(a => (
            <div key={a.id} className="mt-0.5">
              <p className="font-mincho font-bold text-sm leading-snug text-[#2a2118]"><Ruby>{questLabel(a)}</Ruby></p>
              <p className="flex flex-wrap items-center gap-x-1.5 font-bold text-lg leading-tight text-[#1f6b3a]">
                <Prize value={a.prize} />
                {a.first && (
                  <span className="rounded-sm border border-kin-600/60 bg-kin-300/40 px-1.5 text-[11px] font-mincho text-[#7a5a2a] whitespace-nowrap">
                    <Ruby>最初の達成</Ruby> {QUEST_ECONOMY.firstMul}<Ruby>倍</Ruby>
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
