import type { BoardNode } from '../game/types';

export const BOARD_NODES: BoardNode[] = [
  // 北海道
  { id: 'wakkanai', name: '稚内', type: 'fishing', region: 'hokkaido', x: 72, y: 5, description: '日本最北端の釣りスポット' },
  { id: 'kushiro', name: '釧路', type: 'fishing_special', region: 'hokkaido', x: 80, y: 12, description: '太平洋の豊かな漁場' },
  { id: 'asahikawa', name: '旭川', type: 'rest', region: 'hokkaido', x: 71, y: 9, description: '北海道第二の都市' },
  { id: 'obihiro', name: '帯広', type: 'fishing', region: 'hokkaido', x: 76, y: 13, description: '十勝平野の河川釣り' },
  { id: 'sapporo', name: '札幌', type: 'shop', region: 'hokkaido', x: 70, y: 14, shopTier: 2, description: '北海道最大の都市' },
  { id: 'noboribetsu', name: '登別', type: 'rest', region: 'hokkaido', x: 68, y: 16, description: '温泉の街' },
  { id: 'hakodate', name: '函館', type: 'fishing', region: 'hokkaido', x: 66, y: 18, description: '津軽海峡の入口。イカ釣りの名所' },

  // 東北
  { id: 'aomori', name: '青森', type: 'fishing', region: 'tohoku', x: 65, y: 22, description: '津軽海峡の荒波' },
  { id: 'akita', name: '秋田', type: 'fishing', region: 'tohoku', x: 58, y: 26, description: '日本海の恵み' },
  { id: 'morioka', name: '盛岡', type: 'fishing', region: 'tohoku', x: 64, y: 26, description: '北上川の渓流釣り' },
  { id: 'sakata', name: '酒田', type: 'fishing', region: 'tohoku', x: 56, y: 28, description: '庄内平野の港町' },
  { id: 'ichinoseki', name: '一関', type: 'rest', region: 'tohoku', x: 64, y: 28, description: '厳美渓で小休止' },
  { id: 'yamagata', name: '山形', type: 'rest', region: 'tohoku', x: 60, y: 28, description: 'さくらんぼの里で一息' },
  { id: 'sendai', name: '仙台', type: 'event_good', region: 'tohoku', x: 63, y: 30, description: '杜の都で幸運が訪れる' },
  { id: 'koriyama', name: '郡山', type: 'event_random', region: 'tohoku', x: 61, y: 32, description: '東北の交通要衝' },
  { id: 'fukushima', name: '福島', type: 'event_good', region: 'tohoku', x: 62, y: 34, description: '会津の幸運' },

  // 関東
  { id: 'niigata', name: '新潟', type: 'event_random', region: 'kanto', x: 55, y: 32, description: '日本海側の要衝' },
  { id: 'utsunomiya', name: '宇都宮', type: 'event_good', region: 'kanto', x: 61, y: 36, description: '餃子の街で幸運' },
  { id: 'kashima', name: '鹿島', type: 'fishing', region: 'kanto', x: 65, y: 36, description: '鹿島灘の好釣場' },
  { id: 'takasaki', name: '高崎', type: 'rest', region: 'kanto', x: 56, y: 38, description: '上州の玄関口' },
  { id: 'mito', name: '水戸', type: 'event_random', region: 'kanto', x: 63, y: 38, description: '偕楽園で運試し' },
  { id: 'choshi', name: '銚子', type: 'fishing_special', region: 'kanto', x: 65, y: 40, description: '太平洋の一級ポイント' },
  { id: 'tokyo', name: '東京', type: 'shop', region: 'kanto', x: 58, y: 42, shopTier: 3, description: '最高級の装備が揃う' },
  { id: 'yokohama', name: '横浜', type: 'rest', region: 'kanto', x: 58, y: 44, description: '港町で一息つく' },
  { id: 'kamakura', name: '鎌倉', type: 'fishing', region: 'kanto', x: 60, y: 46, description: '相模湾の好釣場' },
  { id: 'odawara', name: '小田原', type: 'fishing', region: 'kanto', x: 56, y: 46, description: '相模湾のアジ釣り' },

  // 中部
  { id: 'nagano', name: '長野', type: 'event_random', region: 'chubu', x: 53, y: 36, description: '信州の山間' },
  { id: 'toyama', name: '富山', type: 'fishing', region: 'chubu', x: 50, y: 34, description: '富山湾のホタルイカ' },
  { id: 'kanazawa', name: '金沢', type: 'fishing', region: 'chubu', x: 48, y: 36, description: '加賀の海の幸' },
  { id: 'matsumoto', name: '松本', type: 'rest', region: 'chubu', x: 52, y: 40, description: 'アルプスの麓' },
  { id: 'takayama', name: '高山', type: 'event_good', region: 'chubu', x: 50, y: 38, description: '飛騨の小京都' },
  { id: 'fukui', name: '福井', type: 'fishing', region: 'chubu', x: 44, y: 40, description: '若狭湾の越前ガニ' },
  { id: 'numazu', name: '沼津', type: 'fishing_special', region: 'chubu', x: 54, y: 46, description: '駿河湾の深海魚が狙える' },
  { id: 'shizuoka', name: '静岡', type: 'fishing', region: 'chubu', x: 52, y: 48, description: '駿河湾の深海魚' },
  { id: 'hamamatsu', name: '浜松', type: 'fishing', region: 'chubu', x: 50, y: 48, description: '浜名湖のうなぎ' },
  { id: 'nagoya', name: '名古屋', type: 'shop', region: 'chubu', x: 48, y: 46, shopTier: 2, description: '東海の拠点' },

  // 近畿
  { id: 'maizuru', name: '舞鶴', type: 'fishing', region: 'kinki', x: 40, y: 42, description: '若狭湾の軍港' },
  { id: 'tango', name: '丹後', type: 'fishing', region: 'kinki', x: 40, y: 44, description: '日本海の好漁場' },
  { id: 'kyoto', name: '京都', type: 'event_good', region: 'kinki', x: 42, y: 48, description: '古都で幸運' },
  { id: 'kobe', name: '神戸', type: 'rest', region: 'kinki', x: 38, y: 50, description: '港町で休憩' },
  { id: 'osaka', name: '大阪', type: 'shop', region: 'kinki', x: 42, y: 52, shopTier: 3, description: '食い倒れの街で最高の装備を' },
  { id: 'nara', name: '奈良', type: 'event_good', region: 'kinki', x: 42, y: 54, description: '鹿に導かれて幸運' },
  { id: 'ise', name: '伊勢', type: 'fishing', region: 'kinki', x: 44, y: 54, description: '伊勢志摩の海' },
  { id: 'wakayama', name: '和歌山', type: 'fishing_special', region: 'kinki', x: 38, y: 56, description: '黒潮の恵み。大物が狙える' },
  { id: 'shirahama', name: '白浜', type: 'fishing', region: 'kinki', x: 36, y: 58, description: '紀南の温暖な釣り場' },

  // 中国
  { id: 'matsue', name: '松江', type: 'fishing', region: 'chugoku', x: 32, y: 44, description: '宍道湖のシジミと魚' },
  { id: 'tottori', name: '鳥取', type: 'event_bad', region: 'chugoku', x: 35, y: 44, description: '砂丘の嵐が吹き荒れる' },
  { id: 'hagi', name: '萩', type: 'fishing', region: 'chugoku', x: 24, y: 46, description: '日本海の城下町' },
  { id: 'kurashiki', name: '倉敷', type: 'rest', region: 'chugoku', x: 30, y: 46, description: '美観地区' },
  { id: 'okayama', name: '岡山', type: 'shop', region: 'chugoku', x: 30, y: 48, shopTier: 2, description: '瀬戸内の釣具店' },
  { id: 'onomichi', name: '尾道', type: 'fishing', region: 'chugoku', x: 30, y: 50, description: 'しまなみ海道の入口' },
  { id: 'hiroshima', name: '広島', type: 'rest', region: 'chugoku', x: 28, y: 50, description: '瀬戸内海を眺めて休憩' },
  { id: 'iwakuni', name: '岩国', type: 'event_random', region: 'chugoku', x: 26, y: 52, description: '錦帯橋で運試し' },
  { id: 'shimonoseki', name: '下関', type: 'fishing', region: 'chugoku', x: 22, y: 50, description: 'ふぐの本場' },

  // 四国
  { id: 'tokushima', name: '徳島', type: 'fishing', region: 'shikoku', x: 34, y: 56, description: '鳴門海峡の渦潮釣り' },
  { id: 'matsuyama', name: '松山', type: 'event_random', region: 'shikoku', x: 26, y: 54, description: '道後温泉で運試し' },
  { id: 'kochi', name: '高知', type: 'fishing_special', region: 'shikoku', x: 30, y: 58, description: 'カツオの一本釣り' },
  { id: 'shimanto', name: '四万十', type: 'fishing', region: 'shikoku', x: 28, y: 60, description: '最後の清流' },
  { id: 'uwajima', name: '宇和島', type: 'fishing', region: 'shikoku', x: 24, y: 58, description: '宇和海の釣り' },

  // 九州
  { id: 'fukuoka', name: '福岡', type: 'shop', region: 'kyushu', x: 18, y: 54, shopTier: 2, description: '九州の玄関口' },
  { id: 'saga', name: '佐賀', type: 'event_random', region: 'kyushu', x: 15, y: 56, description: '有田焼の里' },
  { id: 'beppu', name: '別府', type: 'rest', region: 'kyushu', x: 24, y: 56, description: '温泉の街' },
  { id: 'nagasaki', name: '長崎', type: 'fishing_special', region: 'kyushu', x: 12, y: 58, description: '五島列島の大物狙い' },
  { id: 'oita', name: '大分', type: 'rest', region: 'kyushu', x: 24, y: 58, description: '温泉で一息' },
  { id: 'kumamoto', name: '熊本', type: 'fishing', region: 'kyushu', x: 18, y: 62, description: '天草の海で釣り' },
  { id: 'nobeoka', name: '延岡', type: 'fishing', region: 'kyushu', x: 24, y: 62, description: '五ヶ瀬川の清流' },
  { id: 'miyazaki', name: '宮崎', type: 'event_random', region: 'kyushu', x: 22, y: 66, description: '南国の運試し' },
  { id: 'kirishima', name: '霧島', type: 'event_bad', region: 'kyushu', x: 20, y: 68, description: '霧島連山の噴火' },
  { id: 'kagoshima', name: '鹿児島', type: 'fishing', region: 'kyushu', x: 16, y: 72, description: '桜島を眺めながら釣り' },
  { id: 'tanegashima', name: '種子島', type: 'fishing', region: 'kyushu', x: 14, y: 76, description: '種子島沖の大物' },
  { id: 'yakushima', name: '屋久島', type: 'fishing_special', region: 'kyushu', x: 12, y: 78, description: '世界遺産の島で大物釣り' },
  { id: 'amami', name: '奄美大島', type: 'fishing', region: 'kyushu', x: 10, y: 84, description: '亜熱帯の魚が豊富' },
  { id: 'tokunoshima', name: '徳之島', type: 'fishing', region: 'kyushu', x: 8, y: 88, description: '亜熱帯の島' },
  { id: 'naha', name: '那覇', type: 'fishing_special', region: 'kyushu', x: 6, y: 92, description: '南国の海で伝説の魚を狙う' },

  // スタート・ゴール
  { id: 'start', name: 'スタート', type: 'start', region: 'hokkaido', x: 75, y: 3, description: '冒険の始まり！' },
  { id: 'goal', name: 'ゴール', type: 'goal', region: 'kyushu', x: 6, y: 98, description: '旅の終着点' },
];

export const NODE_MAP = new Map(BOARD_NODES.map(n => [n.id, n]));
