import type { BoardEdge } from '../game/types';

export const BOARD_EDGES: BoardEdge[] = [
  // ===== スタート =====
  { from: 'start', to: 'wakkanai', directed: true },
  { from: 'start', to: 'kushiro', directed: true },

  // ===== 北海道 =====
  { from: 'wakkanai', to: 'kushiro' },                // bidirectional
  { from: 'wakkanai', to: 'asahikawa', directed: true },
  { from: 'kushiro', to: 'obihiro', directed: true },
  { from: 'asahikawa', to: 'sapporo', directed: true },
  { from: 'obihiro', to: 'sapporo', directed: true },
  { from: 'sapporo', to: 'otaru', directed: true },
  { from: 'otaru', to: 'hakodate', directed: true },
  { from: 'sapporo', to: 'hakodate', directed: true },

  // ===== 北海道 → 東北 =====
  { from: 'hakodate', to: 'aomori', directed: true },
  { from: 'hakodate', to: 'akita', directed: true },

  // ===== 東北 =====
  { from: 'aomori', to: 'akita' },                    // bidirectional
  { from: 'aomori', to: 'morioka', directed: true },
  { from: 'morioka', to: 'kamaishi', directed: true },
  { from: 'morioka', to: 'sendai', directed: true },
  { from: 'kamaishi', to: 'sendai', directed: true },
  { from: 'akita', to: 'tsuruoka', directed: true },
  { from: 'akita', to: 'yamagata', directed: true },
  { from: 'tsuruoka', to: 'sakata', directed: true },
  { from: 'tsuruoka', to: 'yamagata', directed: true },
  { from: 'yamagata', to: 'sakata', directed: true },
  { from: 'sendai', to: 'fukushima', directed: true },
  { from: 'sakata', to: 'fukushima', directed: true },
  { from: 'sakata', to: 'niigata', directed: true },

  // ===== 東北 → 関東/中部 =====
  { from: 'fukushima', to: 'nikko', directed: true },
  { from: 'fukushima', to: 'choshi', directed: true },
  { from: 'nikko', to: 'tokyo', directed: true },
  { from: 'nikko', to: 'maebashi', directed: true },
  { from: 'niigata', to: 'toyama', directed: true },
  { from: 'niigata', to: 'nagano', directed: true },
  { from: 'niigata', to: 'kanazawa', directed: true },

  // ===== 関東 =====
  { from: 'choshi', to: 'tokyo', directed: true },
  { from: 'maebashi', to: 'tokyo', directed: true },
  { from: 'maebashi', to: 'chichibu', directed: true },
  { from: 'nagano', to: 'tokyo' },                    // bidirectional
  { from: 'tokyo', to: 'yokohama', directed: true },
  { from: 'tokyo', to: 'chichibu', directed: true },
  { from: 'yokohama', to: 'kamakura', directed: true },
  { from: 'yokohama', to: 'shizuoka', directed: true },
  { from: 'kamakura', to: 'odawara', directed: true },
  { from: 'odawara', to: 'shizuoka', directed: true },
  { from: 'odawara', to: 'numazu', directed: true },
  { from: 'chichibu', to: 'matsumoto', directed: true },

  // ===== 中部 =====
  { from: 'shizuoka', to: 'numazu', directed: true },
  { from: 'shizuoka', to: 'hamamatsu', directed: true },
  { from: 'hamamatsu', to: 'nagoya', directed: true },
  { from: 'toyama', to: 'kanazawa', directed: true },
  { from: 'toyama', to: 'takayama', directed: true },
  { from: 'kanazawa', to: 'fukui', directed: true },
  { from: 'kanazawa', to: 'nagoya', directed: true },
  { from: 'takayama', to: 'nagoya', directed: true },
  { from: 'matsumoto', to: 'nagoya', directed: true },
  { from: 'matsumoto', to: 'nagano' },                // bidirectional
  { from: 'nagano', to: 'nagoya', directed: true },
  { from: 'numazu', to: 'nagoya', directed: true },

  // ===== 中部 → 近畿 =====
  { from: 'fukui', to: 'maizuru', directed: true },
  { from: 'fukui', to: 'kyoto', directed: true },
  { from: 'fukui', to: 'tottori', directed: true },
  { from: 'nagoya', to: 'kyoto', directed: true },
  { from: 'nagoya', to: 'ise', directed: true },
  { from: 'nagoya', to: 'toba', directed: true },

  // ===== 近畿 =====
  { from: 'maizuru', to: 'kyoto', directed: true },
  { from: 'maizuru', to: 'tottori', directed: true },
  { from: 'kyoto', to: 'osaka', directed: true },
  { from: 'kyoto', to: 'nara', directed: true },
  { from: 'kyoto', to: 'tottori' },                   // bidirectional
  { from: 'nara', to: 'ise', directed: true },
  { from: 'nara', to: 'osaka', directed: true },
  { from: 'toba', to: 'ise', directed: true },
  { from: 'ise', to: 'osaka', directed: true },
  { from: 'ise', to: 'wakayama', directed: true },
  { from: 'osaka', to: 'kobe', directed: true },
  { from: 'osaka', to: 'wakayama', directed: true },
  { from: 'osaka', to: 'naruto', directed: true },
  { from: 'wakayama', to: 'shirarahama', directed: true },
  { from: 'wakayama', to: 'tokushima', directed: true },
  { from: 'shirarahama', to: 'tokushima', directed: true },

  // ===== 近畿 → 中国/四国 =====
  { from: 'kobe', to: 'okayama', directed: true },
  { from: 'kobe', to: 'takamatsu', directed: true },
  { from: 'tottori', to: 'matsue', directed: true },
  { from: 'tottori', to: 'kurashiki', directed: true },
  { from: 'kurashiki', to: 'okayama', directed: true },
  { from: 'okayama', to: 'osaka' },                   // bidirectional
  { from: 'okayama', to: 'takamatsu', directed: true },

  // ===== 中国 =====
  { from: 'matsue', to: 'hiroshima', directed: true },
  { from: 'matsue', to: 'hagi', directed: true },
  { from: 'okayama', to: 'onomichi', directed: true },
  { from: 'onomichi', to: 'hiroshima', directed: true },
  { from: 'hagi', to: 'shimonoseki', directed: true },
  { from: 'hiroshima', to: 'shimonoseki', directed: true },
  { from: 'hiroshima', to: 'matsuyama', directed: true },
  { from: 'hiroshima', to: 'iwakuni', directed: true },
  { from: 'iwakuni', to: 'shimonoseki', directed: true },

  // ===== 四国 =====
  { from: 'naruto', to: 'tokushima', directed: true },
  { from: 'naruto', to: 'takamatsu', directed: true },
  { from: 'takamatsu', to: 'tokushima', directed: true },
  { from: 'tokushima', to: 'kochi', directed: true },
  { from: 'matsuyama', to: 'kochi' },                 // bidirectional
  { from: 'matsuyama', to: 'uwajima', directed: true },
  { from: 'kochi', to: 'shimanto', directed: true },
  { from: 'shimanto', to: 'uwajima', directed: true },
  { from: 'uwajima', to: 'beppu', directed: true },
  { from: 'matsuyama', to: 'beppu', directed: true },

  // ===== 中国 → 九州 =====
  { from: 'shimonoseki', to: 'fukuoka', directed: true },

  // ===== 九州北部 =====
  { from: 'fukuoka', to: 'saga', directed: true },
  { from: 'fukuoka', to: 'kumamoto', directed: true },
  { from: 'fukuoka', to: 'beppu', directed: true },
  { from: 'saga', to: 'nagasaki', directed: true },
  { from: 'saga', to: 'kumamoto', directed: true },
  { from: 'beppu', to: 'oita', directed: true },
  { from: 'oita', to: 'nobeoka', directed: true },
  { from: 'oita', to: 'miyazaki', directed: true },
  { from: 'nagasaki', to: 'amakusa', directed: true },
  { from: 'nagasaki', to: 'kumamoto', directed: true },

  // ===== 九州南部 =====
  { from: 'kumamoto', to: 'amakusa', directed: true },
  { from: 'kumamoto', to: 'miyazaki' },               // bidirectional
  { from: 'kumamoto', to: 'kagoshima', directed: true },
  { from: 'kumamoto', to: 'kirishima', directed: true },
  { from: 'nobeoka', to: 'miyazaki', directed: true },
  { from: 'nobeoka', to: 'aoshima', directed: true },
  { from: 'miyazaki', to: 'aoshima', directed: true },
  { from: 'miyazaki', to: 'kirishima', directed: true },
  { from: 'aoshima', to: 'kirishima', directed: true },
  { from: 'kirishima', to: 'kagoshima', directed: true },

  // ===== 九州 → 島嶼 → ゴール =====
  { from: 'kagoshima', to: 'tanegashima', directed: true },
  { from: 'kagoshima', to: 'yakushima', directed: true },
  { from: 'kagoshima', to: 'goal', directed: true },
  { from: 'tanegashima', to: 'yakushima' },           // bidirectional
  { from: 'yakushima', to: 'amami', directed: true },
  { from: 'amami', to: 'tokunoshima', directed: true },
  { from: 'tokunoshima', to: 'naha', directed: true },
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
