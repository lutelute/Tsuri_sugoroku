import type { BoardNode } from '../game/types';

export const BOARD_NODES: BoardNode[] = [
  // スタート・ゴール
  { id: 'start', name: 'スタート', type: 'start', region: 'hokkaido', x: 150, y: 6, shopTier: 1, description: '冒険の始まり！装備を整えよう' },
  { id: 'goal', name: 'ゴール', type: 'goal', region: 'kyushu', x: 12, y: 200, description: '旅の終着点' },

  // 北海道
  { id: 'wakkanai', name: '稚内', type: 'fishing', region: 'hokkaido', x: 136, y: 16, description: '日本最北端の釣りスポット' },
  { id: 'kushiro', name: '釧路', type: 'fishing_special', region: 'hokkaido', x: 164, y: 16, description: '太平洋の豊かな漁場' },
  { id: 'asahikawa', name: '旭川', type: 'rest', region: 'hokkaido', x: 146, y: 24, description: '北海道第二の都市で一息' },
  { id: 'obihiro', name: '帯広', type: 'fishing', region: 'hokkaido', x: 158, y: 24, description: '十勝平野の河川釣り' },
  { id: 'sapporo', name: '札幌', type: 'shop', region: 'hokkaido', x: 144, y: 32, shopTier: 1, description: '北海道最大の都市' },
  { id: 'hakodate', name: '函館', type: 'fishing', region: 'hokkaido', x: 132, y: 42, description: '津軽海峡の入口。イカ釣りの名所' },

  // 東北
  { id: 'aomori', name: '青森', type: 'rest', region: 'tohoku', x: 132, y: 52, description: '津軽海峡を渡って一息' },
  { id: 'akita', name: '秋田', type: 'fishing', region: 'tohoku', x: 112, y: 56, description: '日本海の恵み' },
  { id: 'morioka', name: '盛岡', type: 'fishing', region: 'tohoku', x: 140, y: 56, description: '北上川の渓流釣り' },
  { id: 'kamaishi', name: '釜石', type: 'fishing_special', region: 'tohoku', x: 150, y: 62, description: '三陸リアス式海岸の好漁場' },
  { id: 'yamagata', name: '山形', type: 'rest', region: 'tohoku', x: 118, y: 64, description: 'さくらんぼの里で一息' },
  { id: 'sakata', name: '酒田', type: 'event_random', region: 'tohoku', x: 108, y: 68, description: '庄内平野の港町で運試し' },
  { id: 'sendai', name: '仙台', type: 'event_good', region: 'tohoku', x: 134, y: 68, description: '杜の都で幸運が訪れる' },
  { id: 'niigata', name: '新潟', type: 'fishing', region: 'kanto', x: 104, y: 76, description: '日本海側の要衝' },
  { id: 'fukushima', name: '福島', type: 'event_good', region: 'tohoku', x: 130, y: 76, description: '会津の幸運' },

  // 関東
  { id: 'choshi', name: '銚子', type: 'fishing_special', region: 'kanto', x: 140, y: 88, description: '太平洋の一級ポイント' },
  { id: 'tokyo', name: '東京', type: 'shop', region: 'kanto', x: 128, y: 86, shopTier: 3, description: '最高級の装備が揃う' },

  // 中部
  { id: 'nagano', name: '長野', type: 'event_random', region: 'chubu', x: 114, y: 82, description: '信州の山間で運試し' },
  { id: 'toyama', name: '富山', type: 'fishing', region: 'chubu', x: 98, y: 78, description: '富山湾のホタルイカ' },
  { id: 'kanazawa', name: '金沢', type: 'fishing', region: 'chubu', x: 92, y: 82, description: '加賀の海の幸' },
  { id: 'takayama', name: '高山', type: 'event_good', region: 'chubu', x: 96, y: 90, description: '飛騨の小京都で幸運' },
  { id: 'shizuoka', name: '静岡', type: 'fishing', region: 'chubu', x: 124, y: 94, description: '駿河湾の深海魚' },
  { id: 'numazu', name: '沼津', type: 'fishing_special', region: 'chubu', x: 120, y: 100, description: '駿河湾の深海魚が狙える' },
  { id: 'nagoya', name: '名古屋', type: 'shop', region: 'chubu', x: 104, y: 100, description: '東海の拠点' },
  { id: 'fukui', name: '福井', type: 'fishing', region: 'chubu', x: 84, y: 90, description: '若狭湾の越前ガニ' },

  // 近畿
  { id: 'maizuru', name: '舞鶴', type: 'fishing', region: 'kinki', x: 78, y: 98, description: '若狭湾の軍港' },
  { id: 'kyoto', name: '京都', type: 'event_good', region: 'kinki', x: 90, y: 104, description: '古都で幸運' },
  { id: 'nara', name: '奈良', type: 'event_good', region: 'kinki', x: 96, y: 112, description: '鹿に導かれて幸運' },
  { id: 'ise', name: '伊勢', type: 'fishing', region: 'kinki', x: 102, y: 118, description: '伊勢志摩の海' },
  { id: 'kobe', name: '神戸', type: 'rest', region: 'kinki', x: 76, y: 112, description: '港町で休憩' },
  { id: 'osaka', name: '大阪', type: 'shop', region: 'kinki', x: 84, y: 116, shopTier: 3, description: '食い倒れの街で最高の装備を' },
  { id: 'wakayama', name: '和歌山', type: 'fishing_special', region: 'kinki', x: 74, y: 122, description: '黒潮の恵み。大物が狙える' },

  // 中国
  { id: 'tottori', name: '鳥取', type: 'event_bad', region: 'chugoku', x: 72, y: 98, description: '砂丘の嵐が吹き荒れる' },
  { id: 'matsue', name: '松江', type: 'fishing', region: 'chugoku', x: 60, y: 98, description: '宍道湖のシジミと魚' },
  { id: 'kurashiki', name: '倉敷', type: 'rest', region: 'chugoku', x: 68, y: 106, description: '美観地区で一息' },
  { id: 'okayama', name: '岡山', type: 'shop', region: 'chugoku', x: 66, y: 112, shopTier: 2, description: '瀬戸内の釣具店' },
  { id: 'onomichi', name: '尾道', type: 'fishing', region: 'chugoku', x: 56, y: 114, description: 'しまなみ海道の入口' },
  { id: 'hiroshima', name: '広島', type: 'rest', region: 'chugoku', x: 50, y: 118, description: '瀬戸内海を眺めて休憩' },
  { id: 'shimonoseki', name: '下関', type: 'fishing', region: 'chugoku', x: 40, y: 116, description: 'ふぐの本場' },

  // 四国
  { id: 'tokushima', name: '徳島', type: 'fishing', region: 'shikoku', x: 80, y: 126, description: '鳴門海峡の渦潮釣り' },
  { id: 'kochi', name: '高知', type: 'fishing_special', region: 'shikoku', x: 64, y: 132, description: 'カツオの一本釣り' },
  { id: 'matsuyama', name: '松山', type: 'event_random', region: 'shikoku', x: 48, y: 124, description: '道後温泉で運試し' },
  { id: 'uwajima', name: '宇和島', type: 'fishing', region: 'shikoku', x: 42, y: 132, description: '宇和海の釣り' },

  // 九州
  { id: 'fukuoka', name: '福岡', type: 'shop', region: 'kyushu', x: 34, y: 120, shopTier: 2, description: '九州の玄関口' },
  { id: 'saga', name: '佐賀', type: 'event_random', region: 'kyushu', x: 26, y: 126, description: '有田焼の里で運試し' },
  { id: 'beppu', name: '別府', type: 'rest', region: 'kyushu', x: 50, y: 130, description: '温泉の街で一息' },
  { id: 'oita', name: '大分', type: 'rest', region: 'kyushu', x: 56, y: 136, description: '温泉で一息' },
  { id: 'nagasaki', name: '長崎', type: 'fishing_special', region: 'kyushu', x: 20, y: 132, description: '五島列島の大物狙い' },
  { id: 'kumamoto', name: '熊本', type: 'fishing', region: 'kyushu', x: 34, y: 140, description: '天草の海で釣り' },
  { id: 'nobeoka', name: '延岡', type: 'fishing', region: 'kyushu', x: 58, y: 142, description: '五ヶ瀬川の清流' },
  { id: 'miyazaki', name: '宮崎', type: 'event_random', region: 'kyushu', x: 50, y: 146, description: '南国の運試し' },
  { id: 'kagoshima', name: '鹿児島', type: 'fishing', region: 'kyushu', x: 34, y: 156, description: '桜島を眺めながら釣り' },
  { id: 'kirishima', name: '霧島', type: 'event_bad', region: 'kyushu', x: 46, y: 150, description: '霧島連山の噴火' },
  { id: 'tanegashima', name: '種子島', type: 'fishing', region: 'kyushu', x: 28, y: 162, description: '種子島沖の大物' },
  { id: 'yakushima', name: '屋久島', type: 'fishing_special', region: 'kyushu', x: 20, y: 168, description: '世界遺産の島で大物釣り' },
  { id: 'amami', name: '奄美大島', type: 'fishing', region: 'kyushu', x: 16, y: 178, description: '亜熱帯の魚が豊富' },
  { id: 'tokunoshima', name: '徳之島', type: 'fishing', region: 'kyushu', x: 14, y: 186, description: '亜熱帯の島' },
  { id: 'naha', name: '那覇', type: 'fishing_special', region: 'kyushu', x: 12, y: 192, description: '南国の海で伝説の魚を狙う' },
];

export const NODE_MAP = new Map(BOARD_NODES.map(n => [n.id, n]));
