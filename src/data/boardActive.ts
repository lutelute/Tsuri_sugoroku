// 現在アクティブなボードのデータを返す。
// localStorage に保存された boardType に応じて realistic / snake / islands を切り替える。
// 切替はリロードベース（モジュール初期化時に1度だけ評価）。

import type { BoardNode, BoardEdge } from '../game/types';
import { REALISTIC_NODES } from './realisticData_nodes';
import { REALISTIC_EDGES } from './realisticData_edges';
import { SNAKE_NODES, SNAKE_EDGES } from './boards/snakeBoard';
import { ISLANDS_NODES, ISLANDS_EDGES } from './boards/islandsBoard';
import { getActiveBoardType } from './boards/boardType';

function pickNodes(): BoardNode[] {
  const t = getActiveBoardType();
  if (t === 'snake') return SNAKE_NODES;
  if (t === 'islands') return ISLANDS_NODES;
  return REALISTIC_NODES;
}

function pickEdges(): BoardEdge[] {
  const t = getActiveBoardType();
  if (t === 'snake') return SNAKE_EDGES;
  if (t === 'islands') return ISLANDS_EDGES;
  return REALISTIC_EDGES;
}

export const ACTIVE_BOARD_NODES: BoardNode[] = pickNodes();
export const ACTIVE_BOARD_EDGES: BoardEdge[] = pickEdges();
export const ACTIVE_NODE_MAP: Map<string, BoardNode> = new Map(ACTIVE_BOARD_NODES.map(n => [n.id, n]));
