// 県メインイベント（capitalノードに紐づく固有大イベント）。
// 各 capital ノードの capitalEventId からここを参照する。
// 各県の風土・名物・釣りの特色を反映した選択肢を用意。

import type { CapitalEvent } from '../game/types';

export const CAPITAL_EVENTS: Record<string, CapitalEvent> = {
  // ───── 北海道 ─────
  sapporo_event: {
    id: 'sapporo_event',
    title: '蝦夷の市',
    flavor: '札幌中央卸売市場で北の幸が集結。蟹三昧の宴か、名工の特上ルアーか。',
    region: 'hokkaido',
    choices: [
      { id: 'kani', label: '蟹三昧の宴', description: '毛蟹・ズワイ・タラバで英気を養う。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'lure', label: '名工に特上ルアーを頼む', description: '耐久強化されたルアーLv4を¥6,000で調達。', effect: { kind: 'specialty_shop', equipmentType: 'lure', level: 4, price: 6000, durabilityBonus: 50 } },
      { id: 'ainu', label: 'アイヌ長老の海神話', description: 'カムイの加護で次ラウンド追加ターン。', effect: { kind: 'extra_turn' } },
    ],
  },

  // ───── 東北・青森 ─────
  aomori_event: {
    id: 'aomori_event',
    title: 'ねぶたの夜',
    flavor: '津軽の港町。祭り囃子と漁師たちのざわめきに包まれる夜。',
    region: 'tohoku',
    choices: [
      { id: 'feast', label: '林檎と海鮮丼の宴', description: '青森名物に舌鼓。装備全回復＋¥2,500。', effect: { kind: 'feast', moneyBonus: 2500, repairAll: true } },
      { id: 'oma', label: '大間の漁師と本マグロ勝負', description: '津軽海峡でクロマグロを狙う(難度4)。成功で¥5,000。', effect: { kind: 'special_fishing', fishId: 'kuromaguro', difficulty: 4, reward: 5000 } },
    ],
  },

  // ───── 宮城・仙台 ─────
  sendai_event: {
    id: 'sendai_event',
    title: '杜の都の市',
    flavor: '七夕の街、仙台。笹竹のざわめきと牛タンの香り。',
    region: 'tohoku',
    choices: [
      { id: 'gyutan', label: '牛タン三昧', description: '名物炭火焼で補給。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'rod', label: '蒲鉾屋の特注竿', description: '職人作の竿Lv4を¥5,500で。耐久強化付。', effect: { kind: 'specialty_shop', equipmentType: 'rod', level: 4, price: 5500, durabilityBonus: 30 } },
    ],
  },

  // ───── 関東・東京 ─────
  edo_event: {
    id: 'edo_event',
    title: '江戸前の宵',
    flavor: '老舗鮨屋の暖簾を分け、江戸前の粋に触れる夜。',
    region: 'kanto',
    choices: [
      { id: 'sushi', label: '江戸前鮨を堪能', description: '香り高い赤酢の鮨。装備全回復＋¥2,500。', effect: { kind: 'feast', moneyBonus: 2500, repairAll: true } },
      { id: 'tsukiji', label: '築地で最高級ルアー', description: 'プロも愛用するルアーLv5を¥9,000で。', effect: { kind: 'specialty_shop', equipmentType: 'lure', level: 5, price: 9000 } },
      { id: 'haze', label: '隅田川ハゼ釣り選手権', description: '江戸前ハゼに挑む(難度2)。成功で¥2,000。', effect: { kind: 'special_fishing', fishId: 'haze', difficulty: 2, reward: 2000 } },
    ],
  },

  // ───── 中部・名古屋 ─────
  nagoya_event: {
    id: 'nagoya_event',
    title: '木曽三川の幸',
    flavor: '濃尾平野を貫く木曽川の恵み。名物うなぎと味噌煮込みで宴。',
    region: 'chubu',
    choices: [
      { id: 'hitsumabushi', label: 'ひつまぶしで栄養補給', description: '名物うなぎで装備全回復、＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'unagi', label: '木曽川でウナギ釣り', description: '夜釣りで天然ウナギを狙う(難度3)。成功で¥3,500。', effect: { kind: 'special_fishing', fishId: 'unagi', difficulty: 3, reward: 3500 } },
    ],
  },

  // ───── 近畿・大阪 ─────
  osaka_event: {
    id: 'osaka_event',
    title: '天下の台所',
    flavor: '商人の街で値切り交渉。腕利きの船頭との出会いも。',
    region: 'kinki',
    choices: [
      { id: 'kuidaore', label: '食い倒れの宴', description: 'お好み焼き・たこ焼き・串カツで補給。装備全回復＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'reel', label: '新世界で訳ありリール', description: '裏ルートの特上リールLv4を¥5,000で。耐久強化付。', effect: { kind: 'specialty_shop', equipmentType: 'reel', level: 4, price: 5000, durabilityBonus: 30 } },
      { id: 'tako', label: '明石でタコと格闘', description: '岩陰のマダコを引きずり出す(難度3)。成功で¥3,500。', effect: { kind: 'special_fishing', fishId: 'madako', difficulty: 3, reward: 3500 } },
    ],
  },

  // ───── 九州・福岡 ─────
  fukuoka_event: {
    id: 'fukuoka_event',
    title: '博多の屋台夜話',
    flavor: '玄界灘の幸を屋台で。長浜の鰯にラーメンの替え玉。',
    region: 'kyushu',
    choices: [
      { id: 'yatai', label: '屋台でラーメンと釣り談義', description: '常連客から穴場情報。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'gomasaba', label: 'ゴマサバを狙う', description: '玄界灘の良型サバ(難度2)。成功で¥2,500。', effect: { kind: 'special_fishing', fishId: 'saba', difficulty: 2, reward: 2500 } },
    ],
  },

  // ───── 沖縄・那覇 ─────
  okinawa_event: {
    id: 'okinawa_event',
    title: '琉球の海',
    flavor: '色とりどりのサンゴ礁。亜熱帯の魚が舞う最南端の海。',
    region: 'kyushu',
    choices: [
      { id: 'awamori', label: '泡盛と海ぶどう', description: '琉球の食卓で英気を養う。装備全回復＋¥2,500。', effect: { kind: 'feast', moneyBonus: 2500, repairAll: true } },
      { id: 'gt', label: 'ロウニンアジ(GT)に挑む', description: '南海の怪物GTを狙う(難度4)。成功で¥6,000。', effect: { kind: 'special_fishing', fishId: 'suginami', difficulty: 4, reward: 6000 } },
    ],
  },

  // ───── 北海道・釧路 ─────
  kushiro_event: {
    id: 'kushiro_event',
    title: '釧路湿原の夕焼け',
    flavor: '丹頂鶴が舞う湿原と、太平洋の冷たい潮。秋鮭の遡上が始まる。',
    region: 'hokkaido',
    choices: [
      { id: 'ramen', label: '釧路ラーメンで温まる', description: '太麺と魚介出汁の郷土の味。装備全回復＋¥1,800。', effect: { kind: 'feast', moneyBonus: 1800, repairAll: true } },
      { id: 'sake', label: '秋鮭の遡上と勝負', description: '川を遡るサケを狙う(難度2)。成功で¥3,000。', effect: { kind: 'special_fishing', fishId: 'sake', difficulty: 2, reward: 3000 } },
    ],
  },

  // ───── 東北・釜石 ─────
  kamaishi_event: {
    id: 'kamaishi_event',
    title: '三陸リアスの磯',
    flavor: '入り組んだ海岸線が育む豊かな漁場。磯のメバルが顔を出す。',
    region: 'tohoku',
    choices: [
      { id: 'hoya', label: 'ホヤと海の珍味', description: '三陸の磯香を堪能。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'mebaru', label: '夜のメバル釣り', description: '磯のメバルを狙う(難度2)。成功で¥2,500。', effect: { kind: 'special_fishing', fishId: 'mebaru', difficulty: 2, reward: 2500 } },
    ],
  },

  // ───── 関東・新潟 ─────
  niigata_event: {
    id: 'niigata_event',
    title: '日本海の夕暮れ',
    flavor: '佐渡を望む港町。へぎ蕎麦と南蛮エビ、そして深海の高級魚。',
    region: 'kanto',
    choices: [
      { id: 'hegisoba', label: 'へぎ蕎麦と南蛮海老', description: '越後の味で英気を養う。装備全回復＋¥1,800。', effect: { kind: 'feast', moneyBonus: 1800, repairAll: true } },
      { id: 'nodoguro', label: '日本海でのどぐろ', description: '深海の高級魚アカムツを狙う(難度3)。成功で¥4,500。', effect: { kind: 'special_fishing', fishId: 'nodoguro', difficulty: 3, reward: 4500 } },
    ],
  },

  // ───── 関東・横浜 ─────
  yokohama_event: {
    id: 'yokohama_event',
    title: 'みなと未来の宵',
    flavor: '異国情緒漂う港町。中華街の点心から名工の特注ルアーまで。',
    region: 'kanto',
    choices: [
      { id: 'chuka', label: '中華街で点心三昧', description: '異国の味で気分転換。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'lure', label: 'みなと未来の特注ルアー', description: '港町の名工によるルアーLv3を¥3,500で。', effect: { kind: 'specialty_shop', equipmentType: 'lure', level: 3, price: 3500, durabilityBonus: 20 } },
    ],
  },

  // ───── 中部・金沢 ─────
  kanazawa_event: {
    id: 'kanazawa_event',
    title: '加賀百万石の宴',
    flavor: '兼六園の松籟と、北陸の海の幸。金沢おでんと加賀料理に舌鼓。',
    region: 'chubu',
    choices: [
      { id: 'kaga', label: '金沢おでんと加賀料理', description: '北陸の名品で補給。装備全回復＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'nodoguro', label: '能登半島でのどぐろ', description: '日本海の高級魚を狙う(難度3)。成功で¥4,500。', effect: { kind: 'special_fishing', fishId: 'nodoguro', difficulty: 3, reward: 4500 } },
    ],
  },

  // ───── 近畿・京都 ─────
  kyoto_event: {
    id: 'kyoto_event',
    title: '川床料理の京の夏',
    flavor: '鴨川の川床に座り、清流の音に耳を傾けながら京懐石を味わう。',
    region: 'kinki',
    choices: [
      { id: 'kawayuka', label: '川床料理で京の風雅', description: '京懐石を堪能。装備全回復＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'ayu', label: '鴨川でアユ釣り', description: '清流の女王アユを狙う(難度2)。成功で¥2,800。', effect: { kind: 'special_fishing', fishId: 'ayu', difficulty: 2, reward: 2800 } },
    ],
  },

  // ───── 中国・広島 ─────
  hiroshima_event: {
    id: 'hiroshima_event',
    title: '瀬戸内の凪',
    flavor: '原爆ドームを背に瀬戸内海を眺める。お好み焼きと牡蠣の宴。',
    region: 'chugoku',
    choices: [
      { id: 'okonomi', label: 'お好み焼きと牡蠣三昧', description: '広島焼と牡蠣の宴で補給。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'isaki', label: '瀬戸内でイサキ', description: '凪の海で良型を狙う(難度2)。成功で¥2,500。', effect: { kind: 'special_fishing', fishId: 'isaki', difficulty: 2, reward: 2500 } },
    ],
  },

  // ───── 中国・下関 ─────
  shimonoseki_event: {
    id: 'shimonoseki_event',
    title: 'ふくの本場',
    flavor: '関門海峡の街、下関。ふぐ料理の総本山で食通たちが集う。',
    region: 'chugoku',
    choices: [
      { id: 'fugu_course', label: 'ふく刺しコース', description: '本場の薄造りを堪能。装備全回復＋¥2,500。', effect: { kind: 'feast', moneyBonus: 2500, repairAll: true } },
      { id: 'torafugu', label: '彦島でトラフグ釣り', description: '本物のトラフグに挑む(難度4)。成功で¥5,500。', effect: { kind: 'special_fishing', fishId: 'torafugu', difficulty: 4, reward: 5500 } },
    ],
  },

  // ───── 四国・高松 ─────
  takamatsu_event: {
    id: 'takamatsu_event',
    title: '讃岐うどんの朝',
    flavor: '瀬戸内に面したうどん県。早朝の製麺所巡りと鳴門海峡の鯛。',
    region: 'shikoku',
    choices: [
      { id: 'udon', label: '讃岐うどん巡り', description: '名店を巡って腹を満たす。装備全回復＋¥1,800。', effect: { kind: 'feast', moneyBonus: 1800, repairAll: true } },
      { id: 'madai', label: '鳴門海峡で鯛釣り', description: '渦潮で鍛えられた身の引き締まったマダイ(難度2)。成功で¥3,000。', effect: { kind: 'special_fishing', fishId: 'madai', difficulty: 2, reward: 3000 } },
    ],
  },

  // ───── 四国・高知 ─────
  kochi_event: {
    id: 'kochi_event',
    title: '土佐の海',
    flavor: '黒潮が打ち寄せる豪快な海。土佐料理と藁焼き鰹で港を彩る。',
    region: 'shikoku',
    choices: [
      { id: 'tosa', label: '土佐料理と藁焼き鰹', description: '高知の名物で英気を養う。装備全回復＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'katsuo', label: 'カツオの一本釣り', description: '土佐沖でカツオに挑む(難度3)。成功で¥4,000。', effect: { kind: 'special_fishing', fishId: 'katsuo', difficulty: 3, reward: 4000 } },
    ],
  },

  // ───── 四国・松山 ─────
  matsuyama_event: {
    id: 'matsuyama_event',
    title: '道後の湯',
    flavor: '日本最古の温泉、道後。湯あがりに鯛めしを頬張る。',
    region: 'shikoku',
    choices: [
      { id: 'dougo', label: '道後温泉で湯治', description: '極上の湯と鯛めし。装備全回復＋¥1,800。', effect: { kind: 'feast', moneyBonus: 1800, repairAll: true } },
      { id: 'rod', label: '道後の竿職人を訪ねる', description: '湯治場の竿師が打つ竿Lv3を¥3,200で。', effect: { kind: 'specialty_shop', equipmentType: 'rod', level: 3, price: 3200, durabilityBonus: 20 } },
    ],
  },

  // ───── 九州・長崎 ─────
  nagasaki_event: {
    id: 'nagasaki_event',
    title: '異国の湊',
    flavor: '出島の名残と五島の海。卓袱料理に異国情緒を感じる。',
    region: 'kyushu',
    choices: [
      { id: 'shippoku', label: '卓袱料理の宴', description: '和華蘭の融合料理。装備全回復＋¥2,500。', effect: { kind: 'feast', moneyBonus: 2500, repairAll: true } },
      { id: 'buri', label: '五島で寒ブリ', description: '冬の脂のった鰤を狙う(難度3)。成功で¥4,500。', effect: { kind: 'special_fishing', fishId: 'buri', difficulty: 3, reward: 4500 } },
    ],
  },

  // ───── 九州・熊本 ─────
  kumamoto_event: {
    id: 'kumamoto_event',
    title: '火の国の宴',
    flavor: '阿蘇の麓、馬刺しと辛子蓮根の郷土料理。天草の海も近い。',
    region: 'kyushu',
    choices: [
      { id: 'basashi', label: '馬刺しと辛子蓮根', description: '火の国の名物。装備全回復＋¥2,000。', effect: { kind: 'feast', moneyBonus: 2000, repairAll: true } },
      { id: 'tachiuo', label: '天草でタチウオ', description: '銀色に輝くタチウオを狙う(難度2)。成功で¥2,800。', effect: { kind: 'special_fishing', fishId: 'tachiuo', difficulty: 2, reward: 2800 } },
    ],
  },

  // ───── 九州・鹿児島 ─────
  kagoshima_event: {
    id: 'kagoshima_event',
    title: '薩摩の桜島',
    flavor: '噴煙たなびく桜島を背に、黒豚しゃぶしゃぶと薩摩の海の幸。',
    region: 'kyushu',
    choices: [
      { id: 'kurobuta', label: '黒豚しゃぶしゃぶ', description: '薩摩の銘豚で英気を養う。装備全回復＋¥2,200。', effect: { kind: 'feast', moneyBonus: 2200, repairAll: true } },
      { id: 'katsuo', label: '桜島沖でカツオ', description: '南方系のカツオを狙う(難度2)。成功で¥3,000。', effect: { kind: 'special_fishing', fishId: 'katsuo', difficulty: 2, reward: 3000 } },
    ],
  },
};

export function getCapitalEvent(id: string): CapitalEvent | undefined {
  return CAPITAL_EVENTS[id];
}
