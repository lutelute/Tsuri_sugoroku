// 案内役: 人間の手番で初めて出会う状況に、指差し・脈打つ輪・吹き出しで教える案内（モーションガイド）。
// どの案内を出すかは guideRules.ts（純粋関数）。ここは「いつ出すか（待ち時間・1段階に1つ）」と
// 「どこに描くか（data-guide の要素に位置を合わせる）」を受け持つ。
// 盤面は止めない: 覆いは掛けず、吹き出し以外はタップを素通しする。CPU の手番・DEV の操作も待たせない。
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, MAX_FISHING_PER_TURN } from '../../store/useGameStore';
import { useGuideStore } from '../../store/useGuideStore';
import { useReducedMotion, prefersReducedMotion as reducedMotionNow } from '../fx/useReducedMotion';
import { buildGuideContext, guideById, pickGuide, stillValid, targetOf } from './guideRules';
import type { GuideDef, GuideText } from './guideRules';
import { findGuideTarget, findGuideTargets, revealGuideTarget } from './guideDom';
import Ruby from '../shared/Ruby';

function currentContext() {
  return buildGuideContext(useGameStore.getState(), MAX_FISHING_PER_TURN);
}

/** DOM の変化（町の画面で区画を選ぶ等）はストアに現れないので、ときどき見直す */
const POLL_MS = 700;
/** 指す要素がこの間ずっと見えなければ、状況が過ぎたとみなす（現れ直す演出の一瞬は待つ） */
const MISSING_MS = 600;

export default function GuideLayer() {
  const activeId = useGuideStore(s => s.activeId);
  const reduced = useReducedMotion();

  // 判定の途中経過（再描画に関わらないのでref）
  const pending = useRef<{ id: string; timer: number } | null>(null);
  const activePhaseKey = useRef<string | null>(null);
  const lastPhaseKey = useRef<string | null>(null);
  const missingSince = useRef<number | null>(null);

  /** 案内を閉じる（見たものとして記録し、同じ段階では続けて出さない） */
  const finish = useCallback((id: string) => {
    const g = useGuideStore.getState();
    g.markSeen(id);
    g.setActive(null);
    lastPhaseKey.current = activePhaseKey.current;
    activePhaseKey.current = null;
    missingSince.current = null;
  }, []);

  useEffect(() => {
    let raf = 0;
    const clearPending = () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
    };
    const pick = () => {
      const g = useGuideStore.getState();
      const ctx = currentContext();
      return { ctx, def: pickGuide(ctx, { seen: new Set(g.seen), hasTarget: t => !!findGuideTarget(t), lastPhaseKey: lastPhaseKey.current }) };
    };

    const evaluate = () => {
      raf = 0;
      const g = useGuideStore.getState();
      const ctx = currentContext();
      if (!g.enabled || g.howTo || !ctx.onGame) {
        clearPending();
        if (g.activeId) {
          g.setActive(null);
          activePhaseKey.current = null;
        }
        return;
      }
      const active = guideById(g.activeId);
      if (active) {
        // 操作した・画面が閉じた等で状況が過ぎたら、見たものとして閉じる
        if (!stillValid(active, ctx)) {
          finish(active.id);
        } else if (findGuideTarget(targetOf(active, ctx))) {
          missingSince.current = null;
        } else if (missingSince.current === null) {
          missingSince.current = Date.now();
        } else if (Date.now() - missingSince.current > MISSING_MS) {
          finish(active.id);
        }
        return;
      }
      const { def } = pick();
      if (!def) {
        clearPending();
        return;
      }
      if (pending.current?.id === def.id) return; // すでに出す準備中
      clearPending();
      const timer = window.setTimeout(() => {
        pending.current = null;
        const g2 = useGuideStore.getState();
        if (!g2.enabled || g2.howTo || g2.activeId) return;
        // 待っている間に状況が変わっていないか確かめてから出す
        const again = pick();
        if (again.def?.id !== def.id) {
          schedule();
          return;
        }
        activePhaseKey.current = again.ctx.phaseKey;
        g2.setActive(def.id);
      }, def.delayMs);
      pending.current = { id: def.id, timer };
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(evaluate);
    };

    schedule();
    const unsubGame = useGameStore.subscribe(schedule);
    const unsubGuide = useGuideStore.subscribe(schedule);
    const iv = window.setInterval(schedule, POLL_MS);
    return () => {
      unsubGame();
      unsubGuide();
      clearInterval(iv);
      if (raf) cancelAnimationFrame(raf);
      clearPending();
      useGuideStore.getState().setActive(null);
    };
  }, [finish]);

  const def = guideById(activeId);
  if (!def || typeof document === 'undefined') return null;
  const ctx = currentContext();
  return createPortal(
    <GuidePointer
      key={def.id}
      def={def}
      text={def.text(ctx)}
      reduced={reduced}
      onOk={() => finish(def.id)}
      onNever={() => {
        finish(def.id);
        useGuideStore.getState().setEnabled(false);
      }}
    />,
    document.body,
  );
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 指し示す要素の位置を追い続ける（大きさの変化・回転・スクロール・現れる演出） */
function useTargetBox(def: GuideDef): { box: Box | null; vw: number; vh: number } {
  const [state, setState] = useState<{ box: Box | null; vw: number; vh: number }>(() => ({
    box: null,
    vw: typeof window !== 'undefined' ? window.innerWidth : 0,
    vh: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    let els: HTMLElement[] = [];
    let last = '';
    let scrolled = false;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;

    function measure() {
      const all = findGuideTargets(targetOf(def, currentContext()));
      const found = def.union ? all : all.slice(0, 1);
      if (found.length !== els.length || found.some((e, i) => e !== els[i])) {
        els.forEach(e => ro?.unobserve(e));
        els = found;
        els.forEach(e => ro?.observe(e));
        // 町の画面などでスクロールの外や下の帯の裏にあれば、見える所まで寄せる（一度だけ。演出が落ち着いたらもう一度確かめる）
        if (els[0] && !scrolled) {
          scrolled = true;
          revealGuideTarget(els[0], !reducedMotionNow());
        }
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 複数を囲むときは、すべての要素の外側の四角
      const rs = els.map(e => e.getBoundingClientRect());
      const r = rs.length
        ? rs.reduce((a, b) => {
          const left = Math.min(a.left, b.left);
          const top = Math.min(a.top, b.top);
          return { left, top, width: Math.max(a.left + a.width, b.left + b.width) - left, height: Math.max(a.top + a.height, b.top + b.height) - top };
        }, { left: rs[0].left, top: rs[0].top, width: rs[0].width, height: rs[0].height })
        : null;
      const key = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${vw},${vh}` : `none,${vw},${vh}`;
      if (key === last) return;
      last = key;
      setState({ box: r, vw, vh });
    }

    measure();
    // 現れる演出（拡大・スライド）が落ち着くまでは毎フレーム測る
    const settleUntil = performance.now() + 1200;
    let raf = 0;
    let rechecked = false;
    const settle = () => {
      measure();
      if (performance.now() < settleUntil) {
        raf = requestAnimationFrame(settle);
      } else {
        raf = 0;
        // 下から出てくる画面の途中で測ると「見えている」と判定されるため、落ち着いてから一度だけ確かめ直す
        if (!rechecked && els[0]) {
          rechecked = true;
          if (revealGuideTarget(els[0], !reducedMotionNow())) window.setTimeout(measure, 450);
        }
      }
    };
    raf = requestAnimationFrame(settle);

    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    window.visualViewport?.addEventListener('resize', onChange);
    document.addEventListener('scroll', onChange, true);
    document.addEventListener('animationend', onChange, true);
    document.addEventListener('transitionend', onChange, true);
    // 周りの配置が変わって押し出されたときの保険
    const iv = window.setInterval(measure, 400);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(iv);
      ro?.disconnect();
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
      window.visualViewport?.removeEventListener('resize', onChange);
      document.removeEventListener('scroll', onChange, true);
      document.removeEventListener('animationend', onChange, true);
      document.removeEventListener('transitionend', onChange, true);
    };
  }, [def]);

  return state;
}

const EDGE = 12;
const GAP = 14;
const RING_PAD = 6;

function GuidePointer({ def, text, reduced, onOk, onNever }: {
  def: GuideDef;
  text: GuideText;
  reduced: boolean;
  onOk: () => void;
  onNever: () => void;
}) {
  const { box, vw, vh } = useTargetBox(def);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(150);

  // 指した物を押したら「わかった」とみなして閉じる（開いた一覧を吹き出しで隠さない・次の案内へ進める）
  const onOkRef = useRef(onOk);
  useEffect(() => {
    onOkRef.current = onOk;
  }, [onOk]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest(`[data-guide="${targetOf(def, currentContext())}"]`)) onOkRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [def]);

  // 吹き出しの高さ（上下どちらに置けるかの判定に使う）
  const hasBox = box !== null;
  useEffect(() => {
    const el = bubbleRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBubbleH(el.offsetHeight || 150));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasBox]);

  if (!box) return null;

  const bw = Math.min(320, vw - EDGE * 2);
  const cx = box.left + box.width / 2;
  const spaceAbove = box.top - RING_PAD;
  const spaceBelow = vh - (box.top + box.height) - RING_PAD;
  const need = bubbleH + GAP + EDGE;
  // 吹き出しは要素の上か下の広い方へ。どちらにも入らない大きな要素なら、画面の端に重ねて置く
  const place: 'below' | 'above' | 'overlay' =
    spaceBelow >= need && (spaceBelow >= spaceAbove || spaceAbove < need) ? 'below'
      : spaceAbove >= need ? 'above'
        : 'overlay';
  const left = Math.max(EDGE, Math.min(vw - bw - EDGE, cx - bw / 2));
  const tailX = Math.max(22, Math.min(bw - 22, cx - left));
  const bubbleStyle: CSSProperties = { left, width: bw };
  if (place === 'below') bubbleStyle.top = box.top + box.height + RING_PAD + GAP;
  else if (place === 'above') bubbleStyle.bottom = vh - box.top + RING_PAD + GAP;
  else if (box.top + box.height / 2 > vh / 2) bubbleStyle.top = EDGE;
  else bubbleStyle.bottom = EDGE;

  // 指の先は要素の中央より少し下（ボタンの文字を隠しすぎない）
  const tipX = cx;
  const tipY = box.top + box.height / 2 + Math.min(box.height * 0.25, 14);

  return (
    <div className="gd-layer" data-guide-layer="">
      <div
        className={`gd-ring${reduced ? '' : ' is-pulse'}`}
        style={{ left: box.left - RING_PAD, top: box.top - RING_PAD, width: box.width + RING_PAD * 2, height: box.height + RING_PAD * 2 }}
        aria-hidden="true"
      />
      {!reduced && (
        <div className="gd-hand" style={{ left: tipX, top: tipY }} aria-hidden="true">
          <GuideHandIcon />
        </div>
      )}
      <div
        ref={bubbleRef}
        className={`gd-bubble washi-card${reduced ? '' : ' is-pop'}${place === 'above' ? ' is-above' : ''}`}
        style={bubbleStyle}
        role="dialog"
        aria-label={text.title}
      >
        {place !== 'overlay' && (
          <span className={`gd-tail ${place === 'above' ? 'is-bottom' : 'is-top'}`} style={{ left: tailX }} aria-hidden="true" />
        )}
        <div className="flex items-center gap-2">
          <span className="seal shrink-0 w-6 h-6 rounded-[4px] font-mincho text-[11px] leading-none" aria-hidden="true">案</span>
          <p className="font-mincho font-bold text-[15px] leading-snug text-[#2a2118]"><Ruby>{text.title}</Ruby></p>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#4a3a28]"><Ruby>{text.body}</Ruby></p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onNever}
            className="text-[11px] text-[#7a5a2a] underline underline-offset-2 decoration-[#9a6f24]/50 hover:text-[#2a2118] cursor-pointer px-1 py-1"
          >
            <Ruby>ガイドを表示しない</Ruby>
          </button>
          <button
            type="button"
            onClick={onOk}
            className="px-4 py-1.5 rounded-lg text-sm font-bold font-mincho text-[#3a2a0e] bg-gradient-to-b from-kin-300 to-kin-600 border border-kin-300/60 shadow active:scale-95 transition cursor-pointer"
          >
            わかった
          </button>
        </div>
      </div>
    </div>
  );
}

/** 指差しの手（指の先が左上＝要素に当たる位置） */
function GuideHandIcon({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M9 4.5c2.2-1 4.4.3 5.2 2.4l4.6 12.2 1.1-1.4c1.4-1.8 4-2 5.6-.5l.6.6.6-.6c1.6-1.4 4.1-1.2 5.4.5l.5.7.4-.3c1.7-1.2 4.1-.7 5.2 1.1l2.7 4.6c2 3.5 2.5 7.7 1.2 11.5l-1.3 3.9c-1 3-3.8 5-7 5H23.8c-2.6 0-5-1.3-6.4-3.5L8.6 26.9c-1.2-1.8-.8-4.2.9-5.5 1.6-1.2 3.8-1 5.2.4l1.9 2L6.8 9.6C5.9 7.5 6.8 5.4 9 4.5Z"
        fill="#fbf6e8"
        stroke="#1a1510"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M26 21.5l2 5.6M32 22l1.6 4.8" fill="none" stroke="#1a1510" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
