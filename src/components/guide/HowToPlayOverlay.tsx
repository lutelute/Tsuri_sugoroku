// 遊び方の画面（案内役）。「釣り旅」「まちづくり」のページを送りながら、動く図解と短い文で教える。
// タイトル画面とゲーム中のどちらからでも開ける（開閉は useGuideStore.howTo）。
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGuideStore } from '../../store/useGuideStore';
import type { HowToMode } from '../../store/useGuideStore';
import { useReducedMotion } from '../fx/useReducedMotion';
import { HOWTO_MODE_LABEL, HOWTO_PAGES } from './howToPages';
import HowToDiagram from './HowToDiagrams';
import Icon from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { playCardFlip } from '../../utils/sound';

const MODES: HowToMode[] = ['fishing', 'city'];
/** 横になぞってページを送る距離（px） */
const SWIPE_PX = 48;

export default function HowToPlayOverlay() {
  const mode = useGuideStore(s => s.howTo);
  if (!mode || typeof document === 'undefined') return null;
  return createPortal(<HowToPanel initialMode={mode} />, document.body);
}

function HowToPanel({ initialMode }: { initialMode: HowToMode }) {
  const close = useGuideStore(s => s.closeHowTo);
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<HowToMode>(initialMode);
  const [page, setPage] = useState(0);
  const pages = HOWTO_PAGES[mode];
  const idx = Math.min(page, pages.length - 1);
  const p = pages[idx];
  const isLast = idx === pages.length - 1;
  const swipeStart = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback((to: number) => {
    if (to < 0 || to >= pages.length) return;
    playCardFlip();
    setPage(to);
  }, [pages.length]);

  const switchMode = (m: HowToMode) => {
    if (m === mode) return;
    setMode(m);
    setPage(0);
  };

  // キーボード: ←→ でページ送り、Esc で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, go, idx]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3" onClick={close}>
      <div
        className={`panel-ai relative w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-2xl p-4 sm:p-5${reduced ? '' : ' fx-rise'}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="遊び方"
        onPointerDown={e => { swipeStart.current = e.clientX; }}
        onPointerUp={e => {
          const x0 = swipeStart.current;
          swipeStart.current = null;
          if (x0 === null) return;
          const dx = e.clientX - x0;
          if (dx <= -SWIPE_PX) go(idx + 1);
          else if (dx >= SWIPE_PX) go(idx - 1);
        }}
      >
        <button
          ref={closeRef}
          onClick={close}
          aria-label="閉じる"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-ai-800/60 border border-kin-500/30 rounded-full text-washi/70 hover:text-washi transition cursor-pointer"
        >
          <Icon name="close" size={16} />
        </button>

        <h2 className="font-brush text-3xl text-washi leading-none pr-10"><Ruby>遊び方</Ruby></h2>

        {/* 釣り旅 / まちづくり */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-ai-950/60 border border-kin-500/25 p-1" role="tablist" aria-label="遊び方の種類">
          {MODES.map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={m === mode}
              onClick={() => switchMode(m)}
              className={`rounded-full py-1.5 text-sm font-mincho font-bold transition cursor-pointer ${
                m === mode ? 'bg-gradient-to-b from-kin-300 to-kin-600 text-[#3a2a0e] shadow' : 'text-washi/70 hover:text-washi'
              }`}
            >
              <Ruby>{HOWTO_MODE_LABEL[m]}</Ruby>
            </button>
          ))}
        </div>

        {/* 図解と文（ページを変えるたびに作り直して、アニメをはじめから） */}
        <div key={`${mode}-${p.id}`} className={reduced ? '' : 'gd-page-in'}>
          <div className="mt-3 rounded-xl overflow-hidden border border-kin-500/25 bg-gradient-to-b from-ai-800/80 to-ai-950/90">
            <HowToDiagram id={p.diagram} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xs tabular-nums text-kin-300/80 font-mincho">{idx + 1}/{pages.length}</span>
            <h3 className="font-mincho text-lg font-bold text-kin-300 leading-snug"><Ruby>{p.title}</Ruby></h3>
          </div>
          <div className="mt-1.5 space-y-1.5 min-h-[5.5em]">
            {p.lines.map(l => (
              <p key={l} className="text-[14px] leading-relaxed text-washi/90"><Ruby>{l}</Ruby></p>
            ))}
          </div>
        </div>

        {/* ページ送り */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            className="px-3 py-2 rounded-xl text-sm font-mincho border border-kin-500/35 bg-ai-800/60 text-washi hover:bg-ai-700/70 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            ‹ まえへ
          </button>
          <div className="flex items-center gap-1.5" aria-label={`${idx + 1}ページ目`}>
            {pages.map((pg, i) => (
              <button
                key={pg.id}
                onClick={() => go(i)}
                aria-label={`${i + 1}ページ目`}
                aria-current={i === idx ? 'page' : undefined}
                className={`h-2 rounded-full transition-all cursor-pointer ${i === idx ? 'w-5 bg-kin-300' : 'w-2 bg-washi/30 hover:bg-washi/55'}`}
              />
            ))}
          </div>
          {isLast ? (
            mode === 'fishing' ? (
              <button
                onClick={() => switchMode('city')}
                className="px-3 py-2 rounded-xl text-sm font-mincho font-bold bg-gradient-to-b from-kin-300 to-kin-600 text-[#3a2a0e] border border-kin-300/60 cursor-pointer"
              >
                まちづくり ›
              </button>
            ) : (
              <button
                onClick={close}
                className="px-3 py-2 rounded-xl text-sm font-mincho font-bold bg-gradient-to-b from-kin-300 to-kin-600 text-[#3a2a0e] border border-kin-300/60 cursor-pointer"
              >
                とじる
              </button>
            )
          ) : (
            <button
              onClick={() => go(idx + 1)}
              className="px-3 py-2 rounded-xl text-sm font-mincho font-bold bg-gradient-to-b from-kin-300 to-kin-600 text-[#3a2a0e] border border-kin-300/60 cursor-pointer"
            >
              つぎへ ›
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
