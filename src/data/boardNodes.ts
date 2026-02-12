import type { BoardNode } from '../game/types';

export const BOARD_NODES: BoardNode[] = [
  // スタート・ゴール
  { id: 'start', name: 'スタート', type: 'start', region: 'hokkaido', x: 75, y: 3, description: '冒険の始まり！' },
  { id: 'goal', name: 'ゴール', type: 'goal', region: 'kyushu', x: 6, y: 98, description: '旅の終着点' },

  // 北海道
  { id: 'wakkanai', name: '稚内', type: 'fishing', region: 'hokkaido', x: 68, y: 8, description: '日本最北端の釣りスポット' },
  { id: 'kushiro', name: '釧路', type: 'fishing_special', region: 'hokkaido', x: 82, y: 8, description: '太平洋の豊かな漁場' },
  { id: 'sapporo', name: '札幌', type: 'shop', region: 'hokkaido', x: 72, y: 14, shopTier: 1, description: '北海道最大の都市' },
  { id: 'hakodate', name: '函館', type: 'fishing', region: 'hokkaido', x: 66, y: 20, description: '津軽海峡の入口。イカ釣りの名所' },

  // 東北
  { id: 'aomori', name: '青森', type: 'rest', region: 'tohoku', x: 66, y: 25, description: '津軽海峡を渡って一息' },
  { id: 'akita', name: '秋田', type: 'fishing', region: 'tohoku', x: 56, y: 27, description: '日本海の恵み' },
  { id: 'morioka', name: '盛岡', type: 'fishing', region: 'tohoku', x: 68, y: 27, description: '北上川の渓流釣り' },
  { id: 'sendai', name: '仙台', type: 'event_good', region: 'tohoku', x: 66, y: 33, description: '杜の都で幸運が訪れる' },
  { id: 'sakata', name: '酒田', type: 'event_random', region: 'tohoku', x: 54, y: 33, description: '庄内平野の港町で運試し' },

  // 東北→関東・中部
  { id: 'niigata', name: '新潟', type: 'fishing', region: 'kanto', x: 52, y: 37, description: '日本海側の要衝' },
  { id: 'fukushima', name: '福島', type: 'event_good', region: 'tohoku', x: 64, y: 37, description: '会津の幸運' },

  // 関東
  { id: 'choshi', name: '銚子', type: 'fishing_special', region: 'kanto', x: 68, y: 42, description: '太平洋の一級ポイント' },
  { id: 'tokyo', name: '東京', type: 'shop', region: 'kanto', x: 62, y: 42, shopTier: 3, description: '最高級の装備が揃う' },

  // 中部
  { id: 'nagano', name: '長野', type: 'event_random', region: 'chubu', x: 56, y: 40, description: '信州の山間で運試し' },
  { id: 'kanazawa', name: '金沢', type: 'fishing', region: 'chubu', x: 46, y: 40, description: '加賀の海の幸' },
  { id: 'numazu', name: '沼津', type: 'fishing_special', region: 'chubu', x: 58, y: 48, description: '駿河湾の深海魚が狙える' },
  { id: 'nagoya', name: '名古屋', type: 'shop', region: 'chubu', x: 50, y: 48, shopTier: 2, description: '東海の拠点' },
  { id: 'fukui', name: '福井', type: 'fishing', region: 'chubu', x: 42, y: 44, description: '若狭湾の越前ガニ' },

  // 近畿
  { id: 'kyoto', name: '京都', type: 'event_good', region: 'kinki', x: 44, y: 50, description: '古都で幸運' },
  { id: 'ise', name: '伊勢', type: 'fishing', region: 'kinki', x: 48, y: 55, description: '伊勢志摩の海' },
  { id: 'osaka', name: '大阪', type: 'shop', region: 'kinki', x: 40, y: 55, shopTier: 3, description: '食い倒れの街で最高の装備を' },
  { id: 'wakayama', name: '和歌山', type: 'fishing_special', region: 'kinki', x: 36, y: 58, description: '黒潮の恵み。大物が狙える' },

  // 中国
  { id: 'tottori', name: '鳥取', type: 'event_bad', region: 'chugoku', x: 36, y: 48, description: '砂丘の嵐が吹き荒れる' },
  { id: 'matsue', name: '松江', type: 'fishing', region: 'chugoku', x: 30, y: 48, description: '宍道湖のシジミと魚' },
  { id: 'okayama', name: '岡山', type: 'shop', region: 'chugoku', x: 32, y: 53, shopTier: 2, description: '瀬戸内の釣具店' },
  { id: 'hiroshima', name: '広島', type: 'rest', region: 'chugoku', x: 26, y: 55, description: '瀬戸内海を眺めて休憩' },
  { id: 'shimonoseki', name: '下関', type: 'fishing', region: 'chugoku', x: 20, y: 55, description: 'ふぐの本場' },

  // 四国
  { id: 'tokushima', name: '徳島', type: 'fishing', region: 'shikoku', x: 38, y: 60, description: '鳴門海峡の渦潮釣り' },
  { id: 'kochi', name: '高知', type: 'fishing_special', region: 'shikoku', x: 30, y: 63, description: 'カツオの一本釣り' },
  { id: 'matsuyama', name: '松山', type: 'event_random', region: 'shikoku', x: 24, y: 60, description: '道後温泉で運試し' },

  // 九州
  { id: 'fukuoka', name: '福岡', type: 'shop', region: 'kyushu', x: 16, y: 58, shopTier: 2, description: '九州の玄関口' },
  { id: 'beppu', name: '別府', type: 'rest', region: 'kyushu', x: 24, y: 62, description: '温泉の街で一息' },
  { id: 'nagasaki', name: '長崎', type: 'fishing_special', region: 'kyushu', x: 10, y: 63, description: '五島列島の大物狙い' },
  { id: 'kumamoto', name: '熊本', type: 'fishing', region: 'kyushu', x: 16, y: 66, description: '天草の海で釣り' },
  { id: 'miyazaki', name: '宮崎', type: 'event_random', region: 'kyushu', x: 24, y: 68, description: '南国の運試し' },
  { id: 'kagoshima', name: '鹿児島', type: 'fishing', region: 'kyushu', x: 16, y: 74, description: '桜島を眺めながら釣り' },
  { id: 'kirishima', name: '霧島', type: 'event_bad', region: 'kyushu', x: 22, y: 72, description: '霧島連山の噴火' },
  { id: 'yakushima', name: '屋久島', type: 'fishing_special', region: 'kyushu', x: 10, y: 80, description: '世界遺産の島で大物釣り' },
  { id: 'amami', name: '奄美大島', type: 'fishing', region: 'kyushu', x: 8, y: 86, description: '亜熱帯の魚が豊富' },
  { id: 'naha', name: '那覇', type: 'fishing_special', region: 'kyushu', x: 6, y: 92, description: '南国の海で伝説の魚を狙う' },
];

export const NODE_MAP = new Map(BOARD_NODES.map(n => [n.id, n]));
