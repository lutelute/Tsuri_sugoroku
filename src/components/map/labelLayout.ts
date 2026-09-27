// 地名ラベルの自動配置（重なり回避）。
// 盤面は不変なので、モジュール読み込み時に一度だけ計算する。
// ズーム段階(LOD)ごとに文字の大きさが違うため、段階ごとに「マス中心からのずらし量」を求める。
// 描画側は CSS 変数 + transform で段階を切り替える（React の再描画なし）。
import { BOARD_NODES } from '../../data/boardNodes';
import type { BoardNode } from '../../game/types';
import { nodeRadius } from './mapTheme';

export type LabelLod = 'near' | 'mid' | 'far';

/** index.css の .lbl-cap / .lbl-node と同じ値にすること */
export const LABEL_FONT: Record<LabelLod, { cap: number; node: number }> = {
  near: { cap: 13, node: 9.5 },
  mid: { cap: 15, node: 11 },
  far: { cap: 24, node: 0 }, // 引きでは主要マス以外の地名は出さない
};

export interface LabelPlacement {
  near: [number, number];
  mid: [number, number];
  far: [number, number];
  /** 引いた表示でも出すか（重なる場合は大都市を優先して間引く） */
  farVisible: boolean;
}

interface Box { x0: number; y0: number; x1: number; y1: number }

const METRO = new Set(['tokyo', 'osaka', 'nagoya', 'sapporo', 'fukuoka', 'sendai', 'hiroshima', 'naha']);

function isMajor(n: BoardNode): boolean {
  return n.type === 'capital' || n.type === 'start' || n.type === 'goal';
}

function priority(n: BoardNode): number {
  if (n.type === 'start' || n.type === 'goal') return 0;
  if (METRO.has(n.id)) return 1;
  if (n.type === 'capital') return 2;
  if (n.type === 'fishing_special') return 3;
  if (n.type === 'fishing' || n.type === 'shop') return 4;
  return 5;
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

// 候補の方向と好み（小さいほど優先）。上側は駒のピンと町のスカイラインがあるので不利にする
const DIRS: { dx: number; dy: number; pref: number }[] = [
  { dx: 0, dy: 1, pref: 0 },
  { dx: 1, dy: 0, pref: 0.25 },
  { dx: -1, dy: 0, pref: 0.25 },
  { dx: 0.75, dy: 0.75, pref: 0.4 },
  { dx: -0.75, dy: 0.75, pref: 0.4 },
  { dx: 0, dy: -1, pref: 0.9 },
  { dx: 0.75, dy: -0.75, pref: 1.1 },
  { dx: -0.75, dy: -0.75, pref: 1.1 },
];

function layoutFor(lod: LabelLod, nodes: BoardNode[]): Map<string, { off: [number, number]; ok: boolean }> {
  const out = new Map<string, { off: [number, number]; ok: boolean }>();
  // 障害物: 全マスの円（中継マスも）と、主要マスの上の駒/スカイライン領域
  const discs: Box[] = [];
  for (const n of nodes) {
    const r = nodeRadius(n) + (n.type === 'route' ? 1 : 1.5);
    discs.push({ x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r });
  }
  const placed: Box[] = [];
  const order = nodes.filter(n => n.type !== 'route').sort((a, b) => priority(a) - priority(b));
  for (const n of order) {
    const major = isMajor(n);
    const fs = major ? LABEL_FONT[lod].cap : LABEL_FONT[lod].node;
    if (fs <= 0) continue;
    const w = n.name.length * fs * 1.02 + fs * 0.3;
    const h = fs * 1.2;
    const R = nodeRadius(n);
    const gap = 1.5;
    let best: { off: [number, number]; cost: number; labelHit: number } | null = null;
    for (const d of DIRS) {
      // ラベル中心 = マス中心 + 方向 × (半径 + 余白 + ラベル半幅/半高)
      const cx = n.x + d.dx * (R + gap + w / 2);
      const cy = n.y + d.dy * (R + gap + h / 2);
      const box: Box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
      let labelHit = 0;
      for (const p of placed) labelHit += overlap(box, p);
      let discHit = 0;
      for (const b of discs) discHit += overlap(box, b);
      const cost = labelHit * 3 + discHit * 1.6 + d.pref * h * h * 0.6;
      if (!best || cost < best.cost) best = { off: [cx - n.x, cy - n.y], cost, labelHit };
    }
    if (!best) continue;
    const ok = best.labelHit < w * h * 0.08;
    if (lod !== 'far' || ok) {
      const [ox, oy] = best.off;
      placed.push({ x0: n.x + ox - w / 2, y0: n.y + oy - h / 2, x1: n.x + ox + w / 2, y1: n.y + oy + h / 2 });
    }
    out.set(n.id, { off: [Math.round(best.off[0] * 10) / 10, Math.round(best.off[1] * 10) / 10], ok });
  }
  return out;
}

function computeAll(): Map<string, LabelPlacement> {
  const near = layoutFor('near', BOARD_NODES);
  const mid = layoutFor('mid', BOARD_NODES);
  const far = layoutFor('far', BOARD_NODES);
  const res = new Map<string, LabelPlacement>();
  for (const n of BOARD_NODES) {
    if (n.type === 'route') continue;
    const nr = near.get(n.id);
    const md = mid.get(n.id);
    const fr = far.get(n.id);
    const fallback: [number, number] = [0, nodeRadius(n) + 8];
    res.set(n.id, {
      near: nr?.off ?? fallback,
      mid: md?.off ?? nr?.off ?? fallback,
      far: fr?.off ?? md?.off ?? fallback,
      farVisible: !!fr && fr.ok,
    });
  }
  return res;
}

export const LABEL_LAYOUT: Map<string, LabelPlacement> = computeAll();
