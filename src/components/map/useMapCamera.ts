// 地図カメラ（パン/ズーム/自動追従）。
// 性能のため、操作中は React の state を一切更新せず svg の viewBox 属性を直接書き換える。
// ズーム段階(LOD)も data-lod 属性で CSS に委ね、ラベルの出し分けで再描画を起こさない。
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Camera {
  cx: number;
  cy: number;
  w: number; // 表示幅（ゲーム座標）。高さは要素の縦横比から決まる
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type Lod = 'far' | 'mid' | 'near';

const MIN_W = 220;
const MAX_W = 5200;
const DRAG_THRESHOLD = 6;

function lodOf(scale: number): Lod {
  if (scale < 0.5) return 'far';
  if (scale < 0.95) return 'mid';
  return 'near';
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Options {
  panBounds: Bounds;
  onTap?: (nodeId: string | null, e: PointerEvent) => void;
}

export function useMapCamera(svgRef: React.RefObject<SVGSVGElement | null>, { panBounds, onTap }: Options) {
  const cam = useRef<Camera>({ cx: 640, cy: 700, w: 1500 });
  const size = useRef({ w: 1, h: 1 });
  const lodRef = useRef<Lod | null>(null);
  const anim = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  });
  // 「全体表示から動いたか」だけを React に伝える（ボタン表示用・低頻度）
  const [interacted, setInteracted] = useState(false);

  const aspect = () => size.current.h / Math.max(1, size.current.w);

  const clamp = useCallback(
    (c: Camera): Camera => {
      // 画面が広いほど寄りすぎない（1ゲーム単位が約2.6pxを超えない）
      const minW = Math.max(MIN_W, size.current.w / 2.6);
      const w = Math.max(minW, Math.min(MAX_W, c.w));
      return {
        w,
        cx: Math.max(panBounds.minX, Math.min(panBounds.maxX, c.cx)),
        cy: Math.max(panBounds.minY, Math.min(panBounds.maxY, c.cy)),
      };
    },
    [panBounds],
  );

  const apply = useCallback(() => {
    raf.current = null;
    const svg = svgRef.current;
    if (!svg) return;
    const c = cam.current;
    const h = c.w * aspect();
    svg.setAttribute('viewBox', `${(c.cx - c.w / 2).toFixed(2)} ${(c.cy - h / 2).toFixed(2)} ${c.w.toFixed(2)} ${h.toFixed(2)}`);
    const lod = lodOf(size.current.w / c.w);
    if (lod !== lodRef.current) {
      lodRef.current = lod;
      svg.setAttribute('data-lod', lod);
    }
  }, [svgRef]);

  const schedule = useCallback(() => {
    if (raf.current == null) raf.current = requestAnimationFrame(apply);
  }, [apply]);

  const set = useCallback(
    (c: Camera) => {
      cam.current = clamp(c);
      schedule();
    },
    [clamp, schedule],
  );

  const stopAnim = useCallback(() => {
    if (anim.current != null) {
      cancelAnimationFrame(anim.current);
      anim.current = null;
    }
  }, []);

  /** 指定位置へなめらかに移動 */
  const flyTo = useCallback(
    (target: Partial<Camera>, duration = 650) => {
      stopAnim();
      const from = { ...cam.current };
      const to = clamp({ cx: target.cx ?? from.cx, cy: target.cy ?? from.cy, w: target.w ?? from.w });
      if (duration <= 0) {
        set(to);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const k = easeInOut(t);
        // ズームは対数補間の方が自然
        const w = Math.exp(Math.log(from.w) + (Math.log(to.w) - Math.log(from.w)) * k);
        cam.current = { cx: from.cx + (to.cx - from.cx) * k, cy: from.cy + (to.cy - from.cy) * k, w };
        apply();
        anim.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply, clamp, set, stopAnim],
  );

  /** 範囲がちょうど収まる幅を返す */
  const widthToFit = useCallback((b: Bounds, pad = 40) => {
    const bw = b.maxX - b.minX + pad * 2;
    const bh = b.maxY - b.minY + pad * 2;
    return Math.max(bw, bh / aspect());
  }, []);

  const fitBounds = useCallback(
    (b: Bounds, opts: { pad?: number; minW?: number; duration?: number } = {}) => {
      const w = Math.max(opts.minW ?? MIN_W, widthToFit(b, opts.pad ?? 40));
      flyTo({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, w }, opts.duration ?? 650);
    },
    [flyTo, widthToFit],
  );

  /** 1px あたりのゲーム座標幅から「プレイしやすい寄り」の幅を決める */
  const followWidth = useCallback(() => {
    const px = size.current.w;
    return Math.max(380, Math.min(1000, px / 0.95));
  }, []);

  const isVisible = useCallback((x: number, y: number, margin = 0.15) => {
    const c = cam.current;
    const h = c.w * aspect();
    const mx = c.w * margin;
    const my = h * margin;
    return x > c.cx - c.w / 2 + mx && x < c.cx + c.w / 2 - mx && y > c.cy - h / 2 + my && y < c.cy + h / 2 - my;
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      stopAnim();
      flyTo({ w: cam.current.w * factor }, 220);
    },
    [flyTo, stopAnim],
  );

  const getCamera = useCallback(() => ({ ...cam.current }), []);

  // --- 要素サイズの追跡 ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const r = svg.getBoundingClientRect();
      size.current = { w: Math.max(1, r.width), h: Math.max(1, r.height) };
      apply();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [svgRef, apply]);

  // --- ポインタ操作（マウス/タッチ/ペン共通） ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { sx: number; sy: number; cx: number; cy: number; moved: boolean; id: number } | null = null;
    let pinch: { dist: number; w: number; mx: number; my: number; cx: number; cy: number } | null = null;

    const toWorld = (clientX: number, clientY: number, c = cam.current) => {
      const r = svg.getBoundingClientRect();
      const h = c.w * aspect();
      return {
        x: c.cx - c.w / 2 + ((clientX - r.left) / r.width) * c.w,
        y: c.cy - h / 2 + ((clientY - r.top) / r.height) * h,
      };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stopAnim();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        drag = { sx: e.clientX, sy: e.clientY, cx: cam.current.cx, cy: cam.current.cy, moved: false, id: e.pointerId };
        pinch = null;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const r = svg.getBoundingClientRect();
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          w: cam.current.w,
          mx: (a.x + b.x) / 2 - r.left,
          my: (a.y + b.y) / 2 - r.top,
          cx: cam.current.cx,
          cy: cam.current.cy,
        };
        if (drag) drag.moved = true; // ピンチ後はタップ扱いにしない
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const r = svg.getBoundingClientRect();
        const w = Math.max(Math.max(MIN_W, size.current.w / 2.6), Math.min(MAX_W, (pinch.w * pinch.dist) / dist));
        // ピンチ中心を固定してズーム
        const startCam = { cx: pinch.cx, cy: pinch.cy, w: pinch.w };
        const hStart = startCam.w * aspect();
        const fx = pinch.mx / r.width;
        const fy = pinch.my / r.height;
        const wx = startCam.cx - startCam.w / 2 + fx * startCam.w;
        const wy = startCam.cy - hStart / 2 + fy * hStart;
        const h = w * aspect();
        const mx = (a.x + b.x) / 2 - r.left;
        const my = (a.y + b.y) / 2 - r.top;
        set({ w, cx: wx - (mx / r.width) * w + w / 2, cy: wy - (my / r.height) * h + h / 2 });
        setInteracted(true);
        return;
      }
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        if (!drag.moved) {
          drag.moved = true;
          try { svg.setPointerCapture(e.pointerId); } catch { /* noop */ }
          setInteracted(true);
        }
        const r = svg.getBoundingClientRect();
        const k = cam.current.w / r.width;
        set({ ...cam.current, cx: drag.cx - dx * k, cy: drag.cy - dy * k });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try { svg.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (drag && e.pointerId === drag.id && !drag.moved && pointers.size === 0) {
        // タップ: 指の下のマスを探す
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const nodeEl = el?.closest?.('[data-node-id]');
        onTapRef.current?.(nodeEl ? nodeEl.getAttribute('data-node-id') : null, e);
      }
      if (pointers.size === 0) {
        drag = null;
        pinch = null;
      } else if (pointers.size === 1) {
        // ピンチ→1本指ドラッグへ移行
        const [id, p] = [...pointers.entries()][0];
        drag = { sx: p.x, sy: p.y, cx: cam.current.cx, cy: cam.current.cy, moved: true, id };
        pinch = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopAnim();
      const factor = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))));
      const before = toWorld(e.clientX, e.clientY);
      const w = Math.max(Math.max(MIN_W, size.current.w / 2.6), Math.min(MAX_W, cam.current.w * factor));
      const r = svg.getBoundingClientRect();
      const h = w * aspect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      set({ w, cx: before.x - fx * w + w / 2, cy: before.y - fy * h + h / 2 });
      setInteracted(true);
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
    };
  }, [svgRef, set, stopAnim]);

  useEffect(() => () => {
    stopAnim();
    if (raf.current != null) cancelAnimationFrame(raf.current);
  }, [stopAnim]);

  return { flyTo, fitBounds, followWidth, isVisible, zoomBy, getCamera, widthToFit, interacted, setInteracted };
}
