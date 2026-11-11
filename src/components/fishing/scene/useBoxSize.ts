import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface BoxSize {
  w: number;
  h: number;
  /** 画面の短い辺（px）。浮きなど vmin で大きさを決めている物と揃えるため */
  vmin: number;
}

/** 要素の大きさを測る（変わったときだけ再描画。毎フレームは動かない）。測れるまでは null */
export function useBoxSize<T extends Element>(): [RefObject<T | null>, BoxSize | null] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<BoxSize | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const next = { w: Math.round(r.width), h: Math.round(r.height), vmin: Math.min(window.innerWidth, window.innerHeight) };
      setSize(prev => (prev && prev.w === next.w && prev.h === next.h && prev.vmin === next.vmin ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}
