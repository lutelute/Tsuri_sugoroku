// 後方互換: 既存コードは BOARD_NODES / NODE_MAP / REALISTIC_NODES を見る。
// 元データ本体は realisticData_nodes.ts、アクティブ選択は boardActive.ts に分離。
import type { BoardNode } from '../game/types';
export { REALISTIC_NODES } from './realisticData_nodes';
import { ACTIVE_BOARD_NODES, ACTIVE_NODE_MAP } from './boardActive';
export const BOARD_NODES: BoardNode[] = ACTIVE_BOARD_NODES;
export const NODE_MAP = ACTIVE_NODE_MAP;
