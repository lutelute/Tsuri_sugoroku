// 島ホップ盤（案D）。
// 8地方をそれぞれ離散した「島」として配置。
// 既存ノード/エッジ構造は維持し、座標のみ地方ごとのクラスタへ移す。

import type { BoardNode, BoardEdge } from '../../game/types';
import { REALISTIC_NODES } from '../realisticData_nodes';
import { REALISTIC_EDGES } from '../realisticData_edges';

// 各地方の島の中心座標と半径
const ISLAND_CENTER: Record<string, { cx: number; cy: number; r: number }> = {
  hokkaido: { cx: 800, cy: 130, r: 130 },
  tohoku: { cx: 700, cy: 360, r: 140 },
  kanto: { cx: 820, cy: 580, r: 130 },
  chubu: { cx: 560, cy: 620, r: 140 },
  kinki: { cx: 420, cy: 800, r: 130 },
  chugoku: { cx: 220, cy: 720, r: 130 },
  shikoku: { cx: 380, cy: 970, r: 110 },
  kyushu: { cx: 160, cy: 970, r: 150 },
};

function reposition(): BoardNode[] {
  // 地域ごとにグループ化
  const byRegion = new Map<string, BoardNode[]>();
  for (const n of REALISTIC_NODES) {
    if (n.id === 'start' || n.id === 'goal') continue;
    const arr = byRegion.get(n.region) || [];
    arr.push(n);
    byRegion.set(n.region, arr);
  }

  const out: BoardNode[] = [];
  out.push({ ...REALISTIC_NODES.find(n => n.id === 'start')!, x: 800, y: 30 });

  for (const [region, nodes] of byRegion) {
    const center = ISLAND_CENTER[region];
    if (!center) {
      // フォールバック
      for (const n of nodes) out.push({ ...n });
      continue;
    }
    // 元の重心からの相対位置を「島の中心 + スケール」で配置
    const cx0 = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const cy0 = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const ext = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      1,
    );
    const scale = (center.r * 1.4) / ext;
    for (const n of nodes) {
      const dx = (n.x - cx0) * scale;
      const dy = (n.y - cy0) * scale;
      out.push({ ...n, x: center.cx + dx, y: center.cy + dy });
    }
  }

  out.push({ ...REALISTIC_NODES.find(n => n.id === 'goal')!, x: 60, y: 1120 });
  return out;
}

export const ISLANDS_NODES: BoardNode[] = reposition();
export const ISLANDS_EDGES: BoardEdge[] = REALISTIC_EDGES;
