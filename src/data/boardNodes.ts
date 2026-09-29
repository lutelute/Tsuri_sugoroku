// 盤面は日本列島盤のみ。既存コードは BOARD_NODES / NODE_MAP / REALISTIC_NODES を見る。
// 元データ本体は realisticData_nodes.ts。
import type { BoardNode } from '../game/types';
import { REALISTIC_NODES } from './realisticData_nodes';
export { REALISTIC_NODES };
export const BOARD_NODES: BoardNode[] = REALISTIC_NODES;
export const NODE_MAP: Map<string, BoardNode> = new Map(BOARD_NODES.map(n => [n.id, n]));
