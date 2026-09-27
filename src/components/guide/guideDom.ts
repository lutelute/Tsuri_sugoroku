// 案内役: data-guide 属性で指し示す要素を画面から探す。

/** 画面に見えている data-guide の要素（見えている順） */
export function findGuideTargets(target: string): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const out: HTMLElement[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push(el);
  }
  return out;
}

/** 画面に見えている data-guide の要素（同じ値が複数あれば、最初に見えているもの） */
export function findGuideTarget(target: string): HTMLElement | null {
  return findGuideTargets(target)[0] ?? null;
}

/** いちばん近い、縦にスクロールできる親要素 */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null;
}

/**
 * 指し示す要素が、スクロールの外に出ている・下に固定された帯（「町を出る」など）に隠れているときは、
 * スクロールの中ほどまで寄せる。隠れていなければ何もしない。寄せたら true。
 */
export function revealGuideTarget(el: HTMLElement, smooth: boolean): boolean {
  if (typeof document === 'undefined') return false;
  const scroller = scrollParentOf(el);
  if (!scroller) {
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* 古い端末 */ }
    return false;
  }
  const r = el.getBoundingClientRect();
  const s = scroller.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  // 案内の吹き出しや輪は数えない（それ自体が上に重なるため）
  const coveredAt = (y: number) => {
    if (y < 0 || y > window.innerHeight) return false;
    const hit = document.elementFromPoint(cx, y);
    return !!hit && !el.contains(hit) && !hit.closest('.gd-layer');
  };
  const clipped = r.top < s.top + 4 || r.bottom > s.bottom - 4 || coveredAt(r.bottom - 6) || coveredAt(r.top + 6);
  if (!clipped) return false;
  const top = scroller.scrollTop + (r.top + r.height / 2) - (s.top + s.height / 2);
  try {
    scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  } catch {
    scroller.scrollTop = Math.max(0, top);
  }
  return true;
}
