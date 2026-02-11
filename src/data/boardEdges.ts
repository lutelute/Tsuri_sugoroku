import type { BoardEdge } from '../game/types';

export const BOARD_EDGES: BoardEdge[] = [
  // スタート → 北海道（前進のみ）
  { from: 'start', to: 'wakkanai', directed: true },
  { from: 'start', to: 'kushiro', directed: true },

  // 北海道内（前進のみ）
  { from: 'wakkanai', to: 'sapporo', directed: true },
  { from: 'kushiro', to: 'sapporo', directed: true },
  { from: 'sapporo', to: 'hakodate', directed: true },

  // 北海道 → 東北（前進のみ）
  { from: 'hakodate', to: 'aomori', directed: true },
  { from: 'hakodate', to: 'akita', directed: true },

  // 東北内（双方向 - 同一地域内の横移動）
  { from: 'aomori', to: 'akita' },
  { from: 'aomori', to: 'sendai' },
  { from: 'akita', to: 'sendai' },

  // 東北内（前進のみ - 中間ノード経由）
  { from: 'sendai', to: 'fukushima', directed: true },
  { from: 'akita', to: 'yamagata', directed: true },
  { from: 'yamagata', to: 'niigata', directed: true },

  // 東北 → 関東（前進のみ）
  { from: 'fukushima', to: 'mito', directed: true },
  { from: 'fukushima', to: 'choshi', directed: true },
  { from: 'mito', to: 'tokyo', directed: true },
  { from: 'niigata', to: 'tokyo', directed: true },
  { from: 'choshi', to: 'tokyo', directed: true },

  // 関東内（前進のみ）
  { from: 'tokyo', to: 'kamakura', directed: true },
  { from: 'kamakura', to: 'yokohama', directed: true },

  // 関東 → 中部（前進のみ）
  { from: 'niigata', to: 'toyama', directed: true },
  { from: 'niigata', to: 'kanazawa', directed: true },
  { from: 'yokohama', to: 'numazu', directed: true },
  { from: 'yokohama', to: 'shizuoka', directed: true },

  // 中部内（前進のみ）
  { from: 'toyama', to: 'kanazawa', directed: true },
  { from: 'numazu', to: 'nagoya', directed: true },
  { from: 'shizuoka', to: 'nagoya', directed: true },
  { from: 'kanazawa', to: 'nagoya', directed: true },

  // 中部 → 近畿（前進のみ）
  { from: 'nagoya', to: 'osaka', directed: true },
  { from: 'kanazawa', to: 'tango', directed: true },
  { from: 'nagoya', to: 'wakayama', directed: true },

  // 近畿内（前進のみ - 中間ノード経由）
  { from: 'osaka', to: 'kobe', directed: true },
  { from: 'osaka', to: 'nara', directed: true },
  { from: 'nara', to: 'wakayama', directed: true },

  // 近畿内（双方向 - 同一地域内の横移動）
  { from: 'tango', to: 'osaka' },
  { from: 'osaka', to: 'wakayama' },

  // 近畿 → 中国（前進のみ）
  { from: 'tango', to: 'matsue', directed: true },
  { from: 'tango', to: 'tottori', directed: true },
  { from: 'kobe', to: 'hiroshima', directed: true },

  // 中国内（前進のみ - 中間ノード経由）
  { from: 'matsue', to: 'tottori', directed: true },
  { from: 'tottori', to: 'okayama', directed: true },
  { from: 'okayama', to: 'hiroshima', directed: true },
  { from: 'hiroshima', to: 'shimonoseki', directed: true },

  // 中国内（双方向 - 同一地域内の横移動）
  { from: 'tottori', to: 'hiroshima' },

  // 中国/近畿 → 四国（前進のみ）
  { from: 'wakayama', to: 'tokushima', directed: true },
  { from: 'tokushima', to: 'kochi', directed: true },
  { from: 'hiroshima', to: 'matsuyama', directed: true },

  // 四国内（双方向 - 同一地域内の横移動）
  { from: 'matsuyama', to: 'kochi' },

  // 四国/中国 → 九州（前進のみ）
  { from: 'kochi', to: 'fukuoka', directed: true },
  { from: 'matsuyama', to: 'fukuoka', directed: true },
  { from: 'shimonoseki', to: 'fukuoka', directed: true },

  // 九州内（前進のみ - 中間ノード経由で広く）
  { from: 'fukuoka', to: 'nagasaki', directed: true },
  { from: 'fukuoka', to: 'oita', directed: true },
  { from: 'fukuoka', to: 'kumamoto', directed: true },
  { from: 'nagasaki', to: 'kumamoto', directed: true },
  { from: 'oita', to: 'miyazaki', directed: true },
  { from: 'kumamoto', to: 'kagoshima', directed: true },
  { from: 'miyazaki', to: 'kagoshima', directed: true },

  // 九州 → 沖縄/ゴール（前進のみ - 島伝いの長いルート）
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
