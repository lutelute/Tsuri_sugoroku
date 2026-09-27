// 案内役のボタン: ゲーム中の「遊び方」ボタンと、タイトル画面の「ガイド ON/OFF」「ガイドをはじめから」。
import { useEffect, useState } from 'react';
import { useGuideStore } from '../../store/useGuideStore';
import type { HowToMode } from '../../store/useGuideStore';
import Ruby from '../shared/Ruby';

/** ゲーム中の丸い「遊び方」ボタン（左の列。ほかの丸ボタンと同じ大きさ） */
export function HowToButton({ mode }: { mode: HowToMode }) {
  const openHowTo = useGuideStore(s => s.openHowTo);
  return (
    <button
      onClick={() => openHowTo(mode)}
      data-guide="howto"
      className="bg-ai-900/55 hover:bg-ai-700/70 backdrop-blur-sm border border-kin-500/35 rounded-full w-14 h-14 flex flex-col items-center justify-center text-washi transition cursor-pointer leading-none"
      title="遊び方"
      aria-label="遊び方を見る"
    >
      <span className="text-lg font-mincho font-bold" aria-hidden="true">？</span>
      <span className="text-[9px] font-mincho mt-0.5 tracking-tighter">あそびかた</span>
    </button>
  );
}

/** タイトル画面の案内の設定（ON/OFF と、はじめから） */
export function TitleGuideControls() {
  const enabled = useGuideStore(s => s.enabled);
  const toggle = useGuideStore(s => s.toggleEnabled);
  const setEnabled = useGuideStore(s => s.setEnabled);
  const resetSeen = useGuideStore(s => s.resetSeen);
  const seenCount = useGuideStore(s => s.seen.length);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!resetDone) return;
    const t = window.setTimeout(() => setResetDone(false), 2200);
    return () => clearTimeout(t);
  }, [resetDone]);

  return (
    <div className="flex items-center justify-center gap-2 mt-3 w-full max-w-xs">
      <button
        onClick={toggle}
        aria-pressed={enabled}
        title="遊んでいる途中に、指差しで操作を教える案内"
        className="text-xs px-3 py-1.5 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/75 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer"
      >
        ガイド {enabled ? 'ON' : 'OFF'}
      </button>
      <button
        onClick={() => { resetSeen(); setEnabled(true); setResetDone(true); }}
        disabled={seenCount === 0 && enabled && !resetDone}
        className="text-xs px-3 py-1.5 rounded-full bg-ai-800/55 border border-kin-500/25 text-washi/75 hover:text-washi hover:bg-ai-700/60 transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
      >
        {resetDone ? <Ruby>もう一度出るよ</Ruby> : <Ruby>ガイドをはじめから</Ruby>}
      </button>
    </div>
  );
}
