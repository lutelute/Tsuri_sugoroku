import type { BoardNode } from '../game/types';

export const BOARD_NODES: BoardNode[] = [
  // 北海道
  { id: 'wakkanai', name: '稚内', type: 'fishing', region: 'hokkaido', x: 72, y: 5, description: '日本最北端の釣りスポット' },
  { id: 'kushiro', name: '釧路', type: 'fishing_special', region: 'hokkaido', x: 80, y: 12, description: '太平洋の豊かな漁場' },
  { id: 'sapporo', name: '札幌', type: 'shop', region: 'hokkaido', x: 70, y: 14, shopTier: 2, description: '北海道最大の都市' },
  { id: 'hakodate', name: '函館', type: 'fishing', region: 'hokkaido', x: 66, y: 18, description: '津軽海峡の入口。イカ釣りの名所' },

  // 東北
  { id: 'aomori', name: '青森', type: 'fishing', region: 'tohoku', x: 65, y: 22, description: '津軽海峡の荒波' },
  { id: 'sendai', name: '仙台', type: 'event_good', region: 'tohoku', x: 63, y: 30, description: '杜の都で幸運が訪れる' },
  { id: 'akita', name: '秋田', type: 'fishing', region: 'tohoku', x: 58, y: 26, description: '日本海の恵み' },
  { id: 'yamagata', name: '山形', type: 'rest', region: 'tohoku', x: 60, y: 28, description: 'さくらんぼの里で一息' },
  { id: 'fukushima', name: '福島', type: 'event_good', region: 'tohoku', x: 62, y: 34, description: '会津の幸運' },

  // 関東
  { id: 'niigata', name: '新潟', type: 'event_random', region: 'kanto', x: 55, y: 32, description: '日本海側の要衝' },
  { id: 'tokyo', name: '東京', type: 'shop', region: 'kanto', x: 58, y: 42, shopTier: 3, description: '最高級の装備が揃う' },
  { id: 'choshi', name: '銚子', type: 'fishing_special', region: 'kanto', x: 65, y: 40, description: '太平洋の一級ポイント' },
  { id: 'yokohama', name: '横浜', type: 'rest', region: 'kanto', x: 58, y: 44, description: '港町で一息つく' },
  { id: 'mito', name: '水戸', type: 'event_random', region: 'kanto', x: 63, y: 38, description: '偕楽園で運試し' },
  { id: 'kamakura', name: '鎌倉', type: 'fishing', region: 'kanto', x: 60, y: 46, description: '相模湾の好釣場' },

  // 中部
  { id: 'kanazawa', name: '金沢', type: 'fishing', region: 'chubu', x: 48, y: 36, description: '加賀の海の幸' },
  { id: 'shizuoka', name: '静岡', type: 'fishing', region: 'chubu', x: 52, y: 48, description: '駿河湾の深海魚' },
  { id: 'nagoya', name: '名古屋', type: 'shop', region: 'chubu', x: 48, y: 46, shopTier: 2, description: '東海の拠点' },
  { id: 'toyama', name: '富山', type: 'fishing', region: 'chubu', x: 50, y: 34, description: '富山湾のホタルイカ' },
  { id: 'numazu', name: '沼津', type: 'fishing_special', region: 'chubu', x: 54, y: 46, description: '駿河湾の深海魚が狙える' },

  // 近畿
  { id: 'osaka', name: '大阪', type: 'shop', region: 'kinki', x: 42, y: 52, shopTier: 3, description: '食い倒れの街で最高の装備を' },
  { id: 'wakayama', name: '和歌山', type: 'fishing_special', region: 'kinki', x: 38, y: 56, description: '黒潮の恵み。大物が狙える' },
  { id: 'tango', name: '丹後', type: 'fishing', region: 'kinki', x: 40, y: 44, description: '日本海の好漁場' },
  { id: 'kobe', name: '神戸', type: 'rest', region: 'kinki', x: 38, y: 50, description: '港町で休憩' },
  { id: 'nara', name: '奈良', type: 'event_good', region: 'kinki', x: 42, y: 54, description: '鹿に導かれて幸運' },

  // 中国
  { id: 'tottori', name: '鳥取', type: 'event_bad', region: 'chugoku', x: 35, y: 44, description: '砂丘の嵐が吹き荒れる' },
  { id: 'hiroshima', name: '広島', type: 'rest', region: 'chugoku', x: 28, y: 50, description: '瀬戸内海を眺めて休憩' },
  { id: 'shimonoseki', name: '下関', type: 'fishing', region: 'chugoku', x: 22, y: 50, description: 'ふぐの本場' },
  { id: 'matsue', name: '松江', type: 'fishing', region: 'chugoku', x: 32, y: 44, description: '宍道湖のシジミと魚' },
  { id: 'okayama', name: '岡山', type: 'shop', region: 'chugoku', x: 30, y: 48, shopTier: 2, description: '瀬戸内の釣具店' },

  // 四国
  { id: 'kochi', name: '高知', type: 'fishing_special', region: 'shikoku', x: 30, y: 58, description: 'カツオの一本釣り' },
  { id: 'matsuyama', name: '松山', type: 'event_random', region: 'shikoku', x: 26, y: 54, description: '道後温泉で運試し' },
  { id: 'tokushima', name: '徳島', type: 'fishing', region: 'shikoku', x: 34, y: 56, description: '鳴門海峡の渦潮釣り' },

  // 九州
  { id: 'fukuoka', name: '福岡', type: 'shop', region: 'kyushu', x: 18, y: 54, shopTier: 2, description: '九州の玄関口' },
  { id: 'kumamoto', name: '熊本', type: 'fishing', region: 'kyushu', x: 18, y: 62, description: '天草の海で釣り' },
  { id: 'oita', name: '大分', type: 'rest', region: 'kyushu', x: 24, y: 58, description: '温泉で一息' },
  { id: 'nagasaki', name: '長崎', type: 'fishing_special', region: 'kyushu', x: 12, y: 58, description: '五島列島の大物狙い' },
  { id: 'miyazaki', name: '宮崎', type: 'event_random', region: 'kyushu', x: 22, y: 66, description: '南国の運試し' },
  { id: 'kagoshima', name: '鹿児島', type: 'fishing', region: 'kyushu', x: 16, y: 72, description: '桜島を眺めながら釣り' },
  { id: 'yakushima', name: '屋久島', type: 'fishing_special', region: 'kyushu', x: 12, y: 78, description: '世界遺産の島で大物釣り' },
  { id: 'amami', name: '奄美大島', type: 'fishing', region: 'kyushu', x: 10, y: 84, description: '亜熱帯の魚が豊富' },
  { id: 'naha', name: '那覇', type: 'fishing_special', region: 'kyushu', x: 6, y: 92, description: '南国の海で伝説の魚を狙う' },

  // スタート・ゴール
  { id: 'start', name: 'スタート', type: 'start', region: 'hokkaido', x: 75, y: 3, description: '冒険の始まり！' },
  { id: 'goal', name: 'ゴール', type: 'goal', region: 'kyushu', x: 6, y: 98, description: '旅の終着点' },
];

export const NODE_MAP = new Map(BOARD_NODES.map(n => [n.id, n]));
