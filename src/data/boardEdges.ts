// 後方互換: 既存コードは BOARD_EDGES / REALISTIC_EDGES / buildAdjacencyList を見る。
// 元データ本体は realisticData_edges.ts、アクティブ選択は boardActive.ts に分離。
import type { BoardEdge } from '../game/types';
export { REALISTIC_EDGES } from './realisticData_edges';
import { ACTIVE_BOARD_EDGES } from './boardActive';
export const BOARD_EDGES: BoardEdge[] = ACTIVE_BOARD_EDGES;

// 隣接リスト（双方向 - イベント移動用）
export function buildAdjacencyList(): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of BOARD_EDGES) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);
    adj.get(edge.from)!.push(edge.to);
    adj.get(edge.to)!.push(edge.from);
  }
  return adj;
}

// 隣接リスト（方向制限付き - 通常移動用）
// directed: true のエッジは from→to のみ、それ以外は双方向
export function buildDirectedAdjacencyList(): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of BOARD_EDGES) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);
    adj.get(edge.from)!.push(edge.to);
    if (!edge.directed) {
      adj.get(edge.to)!.push(edge.from);
    }
  }
  return adj;
}
