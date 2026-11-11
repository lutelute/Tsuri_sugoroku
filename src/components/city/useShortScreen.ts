import { useSyncExternalStore } from 'react';

// 背の低い画面（スマホの横持ち）。上の帯にお題の段を足すと地図が狭くなりすぎるので、小さな札に切り替える
const QUERY = '(max-height: 480px)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function isShort(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/** 画面の高さが 480px 以下か（向きを変えたときにも追従する） */
export function useShortScreen(): boolean {
  return useSyncExternalStore(subscribe, isShort, () => false);
}
