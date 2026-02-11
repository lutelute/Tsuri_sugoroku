import type { BoardEdge } from '../game/types';

export const BOARD_EDGES: BoardEdge[] = [
  // ===== スタート → 北海道 =====
  { from: 'start', to: 'wakkanai', directed: true },
  { from: 'start', to: 'kushiro', directed: true },

  // ===== 北海道内（中間ノード経由で分割） =====
  { from: 'wakkanai', to: 'asahikawa', directed: true },
  { from: 'asahikawa', to: 'sapporo', directed: true },
  { from: 'kushiro', to: 'obihiro', directed: true },
  { from: 'obihiro', to: 'sapporo', directed: true },
  { from: 'sapporo', to: 'noboribetsu', directed: true },
  { from: 'noboribetsu', to: 'hakodate', directed: true },

  // ===== 北海道 → 東北 =====
  { from: 'hakodate', to: 'aomori', directed: true },
  { from: 'hakodate', to: 'akita', directed: true },

  // ===== 東北内 =====
  // 双方向（同一地域内の横移動）
  { from: 'aomori', to: 'akita' },
  { from: 'sakata', to: 'yamagata' },
  // 前進のみ（太平洋側ルート: 青森→盛岡→一関→仙台）
  { from: 'aomori', to: 'morioka', directed: true },
  { from: 'morioka', to: 'ichinoseki', directed: true },
  { from: 'ichinoseki', to: 'sendai', directed: true },
  // 前進のみ（日本海側ルート: 秋田→酒田→山形→新潟）
  { from: 'akita', to: 'sakata', directed: true },
  { from: 'akita', to: 'yamagata', directed: true },
  { from: 'yamagata', to: 'niigata', directed: true },
  // 前進のみ（仙台→郡山→福島）
  { from: 'sendai', to: 'koriyama', directed: true },
  { from: 'koriyama', to: 'fukushima', directed: true },

  // ===== 東北 → 関東 =====
  { from: 'fukushima', to: 'utsunomiya', directed: true },
  { from: 'fukushima', to: 'kashima', directed: true },
  { from: 'utsunomiya', to: 'mito', directed: true },
  { from: 'kashima', to: 'choshi', directed: true },

  // ===== 関東内 =====
  // 双方向（同一地域内の横移動）
  { from: 'mito', to: 'kashima' },
  { from: 'takasaki', to: 'utsunomiya' },
  // 前進のみ
  { from: 'mito', to: 'tokyo', directed: true },
  { from: 'niigata', to: 'nagano', directed: true },
  { from: 'nagano', to: 'takasaki', directed: true },
  { from: 'takasaki', to: 'tokyo', directed: true },
  { from: 'choshi', to: 'tokyo', directed: true },
  { from: 'tokyo', to: 'kamakura', directed: true },
  { from: 'kamakura', to: 'yokohama', directed: true },

  // ===== 関東 → 中部 =====
  { from: 'yokohama', to: 'odawara', directed: true },
  { from: 'odawara', to: 'numazu', directed: true },
  { from: 'yokohama', to: 'shizuoka', directed: true },
  { from: 'niigata', to: 'toyama', directed: true },
  { from: 'niigata', to: 'kanazawa', directed: true },

  // ===== 中部内 =====
  // 双方向（同一地域内の横移動）
  { from: 'nagano', to: 'toyama' },
  // 前進のみ（北陸ルート）
  { from: 'toyama', to: 'kanazawa', directed: true },
  { from: 'kanazawa', to: 'fukui', directed: true },
  { from: 'kanazawa', to: 'nagoya', directed: true },
  // 前進のみ（中央山岳ルート: 長野→松本→高山→名古屋）
  { from: 'nagano', to: 'matsumoto', directed: true },
  { from: 'matsumoto', to: 'takayama', directed: true },
  { from: 'takayama', to: 'nagoya', directed: true },
  // 前進のみ（太平洋側ルート: 沼津→浜松→名古屋）
  { from: 'numazu', to: 'hamamatsu', directed: true },
  { from: 'shizuoka', to: 'hamamatsu', directed: true },
  { from: 'hamamatsu', to: 'nagoya', directed: true },

  // ===== 中部 → 近畿 =====
  { from: 'nagoya', to: 'kyoto', directed: true },
  { from: 'nagoya', to: 'ise', directed: true },
  { from: 'fukui', to: 'maizuru', directed: true },
  { from: 'kanazawa', to: 'tango', directed: true },

  // ===== 近畿内 =====
  // 双方向（同一地域内の横移動）
  { from: 'tango', to: 'osaka' },
  { from: 'osaka', to: 'wakayama' },
  { from: 'maizuru', to: 'tango' },
  // 前進のみ
  { from: 'kyoto', to: 'osaka', directed: true },
  { from: 'ise', to: 'nara', directed: true },
  { from: 'ise', to: 'wakayama', directed: true },
  { from: 'osaka', to: 'kobe', directed: true },
  { from: 'osaka', to: 'nara', directed: true },
  { from: 'nara', to: 'wakayama', directed: true },
  { from: 'wakayama', to: 'shirahama', directed: true },

  // ===== 近畿 → 中国・四国 =====
  { from: 'tango', to: 'matsue', directed: true },
  { from: 'tango', to: 'tottori', directed: true },
  { from: 'kobe', to: 'kurashiki', directed: true },
  { from: 'wakayama', to: 'tokushima', directed: true },
  { from: 'shirahama', to: 'tokushima', directed: true },

  // ===== 中国内 =====
  // 双方向（同一地域内の横移動）
  { from: 'kurashiki', to: 'okayama' },
  { from: 'hagi', to: 'shimonoseki' },
  // 前進のみ（日本海側: 松江→鳥取、松江→萩）
  { from: 'matsue', to: 'tottori', directed: true },
  { from: 'matsue', to: 'hagi', directed: true },
  // 前進のみ（瀬戸内側: 鳥取→岡山→尾道→広島→岩国→下関）
  { from: 'tottori', to: 'okayama', directed: true },
  { from: 'okayama', to: 'onomichi', directed: true },
  { from: 'onomichi', to: 'hiroshima', directed: true },
  { from: 'hiroshima', to: 'iwakuni', directed: true },
  { from: 'iwakuni', to: 'shimonoseki', directed: true },

  // ===== 中国 → 四国 =====
  { from: 'hiroshima', to: 'matsuyama', directed: true },
  { from: 'onomichi', to: 'matsuyama', directed: true },  // しまなみ海道
  { from: 'okayama', to: 'tokushima', directed: true },    // 瀬戸大橋

  // ===== 四国内 =====
  // 双方向（同一地域内の横移動）
  { from: 'matsuyama', to: 'kochi' },
  // 前進のみ
  { from: 'tokushima', to: 'kochi', directed: true },
  { from: 'kochi', to: 'shimanto', directed: true },
  { from: 'shimanto', to: 'uwajima', directed: true },
  { from: 'matsuyama', to: 'uwajima', directed: true },

  // ===== 四国 → 九州（フェリールート） =====
  { from: 'matsuyama', to: 'beppu', directed: true },
  { from: 'uwajima', to: 'beppu', directed: true },

  // ===== 中国 → 九州 =====
  { from: 'shimonoseki', to: 'fukuoka', directed: true },

  // ===== 九州内 =====
  // 前進のみ（西ルート: 福岡→佐賀→長崎→熊本）
  { from: 'fukuoka', to: 'saga', directed: true },
  { from: 'saga', to: 'nagasaki', directed: true },
  { from: 'saga', to: 'kumamoto', directed: true },
  { from: 'nagasaki', to: 'kumamoto', directed: true },
  // 前進のみ（東ルート: 福岡→別府→大分→延岡→宮崎）
  { from: 'fukuoka', to: 'beppu', directed: true },
  { from: 'beppu', to: 'oita', directed: true },
  { from: 'oita', to: 'nobeoka', directed: true },
  { from: 'nobeoka', to: 'miyazaki', directed: true },
  { from: 'oita', to: 'miyazaki', directed: true },
  // 前進のみ（中央→南: 熊本→福岡直通、熊本→霧島→鹿児島）
  { from: 'fukuoka', to: 'kumamoto', directed: true },
  { from: 'kumamoto', to: 'kirishima', directed: true },
  { from: 'kirishima', to: 'kagoshima', directed: true },
  { from: 'miyazaki', to: 'kagoshima', directed: true },

  // ===== 九州 → 沖縄・ゴール =====
  { from: 'kagoshima', to: 'tanegashima', directed: true },
  { from: 'kagoshima', to: 'yakushima', directed: true },
  { from: 'tanegashima', to: 'yakushima' },  // 島同士の双方向
  { from: 'yakushima', to: 'amami', directed: true },
  { from: 'amami', to: 'tokunoshima', directed: true },
  { from: 'tokunoshima', to: 'naha', directed: true },
  { from: 'kagoshima', to: 'goal', directed: true },
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
