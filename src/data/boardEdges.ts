import type { BoardEdge } from '../game/types';

export const BOARD_EDGES: BoardEdge[] = [
  // ===== スタート =====
  { from: 'start', to: 'wakkanai', directed: true },
  { from: 'start', to: 'kushiro', directed: true },

  // ===== 北海道 =====
  { from: 'wakkanai', to: 'kushiro' },             // bidirectional
  { from: 'wakkanai', to: 'sapporo', directed: true },
  { from: 'kushiro', to: 'sapporo', directed: true },
  { from: 'sapporo', to: 'hakodate', directed: true },

  // ===== 北海道 → 東北 =====
  { from: 'hakodate', to: 'aomori', directed: true },
  { from: 'hakodate', to: 'akita', directed: true },

  // ===== 東北 =====
  { from: 'aomori', to: 'akita' },                 // bidirectional
  { from: 'aomori', to: 'morioka', directed: true },
  { from: 'akita', to: 'sakata', directed: true },
  { from: 'morioka', to: 'sendai', directed: true },
  { from: 'sendai', to: 'fukushima', directed: true },
  { from: 'sakata', to: 'fukushima', directed: true },
  { from: 'sakata', to: 'niigata', directed: true },

  // ===== 東北 → 関東/中部 =====
  { from: 'fukushima', to: 'tokyo', directed: true },
  { from: 'fukushima', to: 'choshi', directed: true },
  { from: 'niigata', to: 'kanazawa', directed: true },
  { from: 'niigata', to: 'nagano', directed: true },

  // ===== 関東/中部北部 =====
  { from: 'choshi', to: 'tokyo', directed: true },
  { from: 'nagano', to: 'tokyo' },                 // bidirectional
  { from: 'tokyo', to: 'numazu', directed: true },
  { from: 'kanazawa', to: 'fukui', directed: true },
  { from: 'kanazawa', to: 'nagoya', directed: true },
  { from: 'nagano', to: 'nagoya', directed: true },

  // ===== 中部南部 =====
  { from: 'numazu', to: 'nagoya', directed: true },
  { from: 'fukui', to: 'kyoto', directed: true },
  { from: 'fukui', to: 'tottori', directed: true },

  // ===== 中部 → 近畿 =====
  { from: 'nagoya', to: 'kyoto', directed: true },
  { from: 'nagoya', to: 'ise', directed: true },

  // ===== 近畿 =====
  { from: 'kyoto', to: 'osaka', directed: true },
  { from: 'kyoto', to: 'tottori' },                // bidirectional
  { from: 'ise', to: 'osaka', directed: true },
  { from: 'ise', to: 'wakayama', directed: true },
  { from: 'osaka', to: 'wakayama', directed: true },
  { from: 'osaka', to: 'tokushima', directed: true },

  // ===== 近畿 → 中国/四国 =====
  { from: 'wakayama', to: 'tokushima', directed: true },
  { from: 'tottori', to: 'matsue', directed: true },
  { from: 'tottori', to: 'okayama', directed: true },
  { from: 'okayama', to: 'tokushima', directed: true },
  { from: 'okayama', to: 'osaka' },                // bidirectional

  // ===== 中国 =====
  { from: 'matsue', to: 'hiroshima', directed: true },
  { from: 'matsue', to: 'shimonoseki', directed: true },
  { from: 'okayama', to: 'hiroshima', directed: true },
  { from: 'hiroshima', to: 'shimonoseki', directed: true },
  { from: 'hiroshima', to: 'matsuyama', directed: true },

  // ===== 四国 =====
  { from: 'tokushima', to: 'kochi', directed: true },
  { from: 'matsuyama', to: 'kochi' },              // bidirectional
  { from: 'matsuyama', to: 'beppu', directed: true },

  // ===== 中国 → 九州 =====
  { from: 'shimonoseki', to: 'fukuoka', directed: true },

  // ===== 九州北部 =====
  { from: 'fukuoka', to: 'nagasaki', directed: true },
  { from: 'fukuoka', to: 'kumamoto', directed: true },
  { from: 'fukuoka', to: 'beppu', directed: true },
  { from: 'beppu', to: 'miyazaki', directed: true },
  { from: 'nagasaki', to: 'kumamoto', directed: true },

  // ===== 九州南部 =====
  { from: 'kumamoto', to: 'miyazaki' },            // bidirectional
  { from: 'kumamoto', to: 'kagoshima', directed: true },
  { from: 'kumamoto', to: 'kirishima', directed: true },
  { from: 'miyazaki', to: 'kirishima', directed: true },
  { from: 'kirishima', to: 'kagoshima', directed: true },

  // ===== 九州 → 島嶼 → ゴール =====
  { from: 'kagoshima', to: 'yakushima', directed: true },
  { from: 'kagoshima', to: 'goal', directed: true },
  { from: 'yakushima', to: 'amami', directed: true },
  { from: 'amami', to: 'naha', directed: true },
  { from: 'naha', to: 'goal', directed: true },
];

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
