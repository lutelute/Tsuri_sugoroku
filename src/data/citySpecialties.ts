// まちづくり: 名産（桃鉄の物件にあたる、区画とは別の枠）。
//
// - 盤面の県庁マス（type === 'capital'）すべてに1つずつ置く（citySpecialties.test.ts で網羅を確認）。
// - 県庁が2つしかない地方（北海道・中部・近畿・中国）には、名物で知られる県庁以外の町にも1つ置き、
//   どの地方も名産が3つ以上になるようにする（2つだけだと地方独占が偶然そろいやすいため）。
//   県庁以外の名産も、買う・買収・収入・地図の印・称号は県庁の名産とまったく同じに扱う。
// - 名産を置けるのは町のマス（city.ts の isTown が町とみなすマス）だけ。中継・スタート・ゴールには置かない。
// - 実在の地名と一般的な名物だけを使い、実在の企業名・商標は使わない。
// - season は「月(1〜12) → 収入の倍率」。書いていない月は 1.0。12か月の平均がほぼ 1.0 になるように組み、
//   年間でならすと「月収 = 価格の5%」の流儀が崩れないようにしてある（テストで確認）。
// - 経済の数値（収入率・独占倍率・買収倍率）は src/game/citySpecialties.ts の SPECIALTY_ECONOMY。
import type { Region } from '../game/types';

/** 名産の絵（src/components/city/SpecialtyIcon.tsx が描く） */
export type SpecialtyIcon =
  | 'beer' | 'robata' | 'apple' | 'urchin' | 'gyutan' | 'sake' | 'sushi' | 'shumai'
  | 'goldleaf' | 'eel' | 'weave' | 'takoyaki' | 'oyster' | 'fugu' | 'katsuo' | 'mikan'
  | 'udon' | 'mentaiko' | 'castella' | 'watermelon' | 'pork' | 'mango'
  | 'squid' | 'soba' | 'ume' | 'peach';

export interface CitySpecialty {
  nodeId: string;
  /** 名産の名前（札の見出し） */
  name: string;
  /** 短い呼び名（地図の印や一覧で使う。2〜4文字） */
  short: string;
  /** 空きのときの価格（＝資産価値）。¥4,000〜¥12,000 */
  price: number;
  icon: SpecialtyIcon;
  /** 月(1〜12) → 収入の倍率。書いていない月は 1.0 */
  season: Partial<Record<number, number>>;
  /** ひとこと説明 */
  flavor: string;
}

/** 名産の地方名（称号「○○の顔役」に使う） */
export const SPECIALTY_REGION_NAME: Record<Region, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  kyushu: '九州・沖縄',
};

export const CITY_SPECIALTIES: Record<string, CitySpecialty> = {
  // ===== 北海道（3。函館は県庁ではない） =====
  sapporo: {
    nodeId: 'sapporo', name: '麦酒工場', short: '麦酒', price: 9000, icon: 'beer',
    season: { 6: 1.4, 7: 1.6, 8: 1.5, 10: 0.9, 11: 0.8, 12: 0.7, 1: 0.7, 2: 0.7, 3: 0.8, 4: 0.9 },
    flavor: '北の大地の大麦で仕込む。夏の大通りはビアガーデンでにぎわう',
  },
  kushiro: {
    nodeId: 'kushiro', name: '炉端焼き', short: '炉端', price: 5000, icon: 'robata',
    season: { 9: 1.3, 10: 1.4, 11: 1.2, 12: 1.2, 1: 1.2, 2: 1.1, 3: 0.8, 4: 0.8, 5: 0.8, 6: 0.7, 7: 0.7, 8: 0.8 },
    flavor: '炭火で秋刀魚や鮭を焼く港町の炉端。寒い夜ほど客が増える',
  },
  hakodate: {
    nodeId: 'hakodate', name: 'いか刺し', short: 'いか', price: 7000, icon: 'squid',
    season: { 6: 1.3, 7: 1.4, 8: 1.4, 9: 1.3, 10: 1.2, 11: 0.9, 12: 0.9, 1: 0.7, 2: 0.6, 3: 0.6, 4: 0.8, 5: 0.9 },
    flavor: '漁火の灯る津軽海峡で釣るいか。朝獲れを刺身で味わう。夏から秋が旬',
  },

  // ===== 東北（3） =====
  aomori: {
    nodeId: 'aomori', name: '津軽りんご', short: 'りんご', price: 6000, icon: 'apple',
    season: { 9: 1.3, 10: 1.6, 11: 1.5, 12: 1.2, 3: 0.8, 4: 0.7, 5: 0.7, 6: 0.7, 7: 0.7, 8: 0.8 },
    flavor: '津軽の赤いりんご。秋の収穫どきが一番の稼ぎどき',
  },
  kamaishi: {
    nodeId: 'kamaishi', name: '三陸うに', short: 'うに', price: 4000, icon: 'urchin',
    season: { 5: 1.2, 6: 1.5, 7: 1.5, 8: 1.3, 11: 0.8, 12: 0.7, 1: 0.7, 2: 0.7, 3: 0.7, 4: 0.9 },
    flavor: '三陸のリアス海岸で獲れる生うに。夏の漁の季節が旬',
  },
  sendai: {
    nodeId: 'sendai', name: '牛たん焼き', short: '牛たん', price: 8000, icon: 'gyutan',
    season: { 8: 1.3, 12: 1.1, 1: 0.9, 2: 0.8, 6: 0.9 },
    flavor: '厚切りを炭火で焼く杜の都の名物。七夕の夏はとくに行列ができる',
  },

  // ===== 関東（3。盤面の地方分けでは新潟も関東） =====
  niigata: {
    nodeId: 'niigata', name: '酒蔵', short: '酒蔵', price: 7000, icon: 'sake',
    season: { 12: 1.4, 1: 1.4, 2: 1.3, 3: 1.1, 5: 0.8, 6: 0.8, 7: 0.7, 8: 0.7, 9: 0.8 },
    flavor: '米どころ越後の雪解け水で仕込む。新酒が出る冬が書き入れどき',
  },
  tokyo: {
    nodeId: 'tokyo', name: '江戸前鮨', short: '鮨', price: 12000, icon: 'sushi',
    season: { 12: 1.3, 1: 1.2, 2: 0.8, 6: 0.9, 8: 0.8 },
    flavor: '江戸前の海の幸を握る。年末年始は祝いの席で大にぎわい',
  },
  yokohama: {
    nodeId: 'yokohama', name: '中華街の焼売', short: '焼売', price: 8000, icon: 'shumai',
    season: { 12: 1.3, 1: 1.2, 2: 1.1, 6: 0.9, 7: 0.8, 8: 0.8, 9: 0.9 },
    flavor: '港町の中華街で湯気を立てる蒸したて。寒い季節ほどよく売れる',
  },

  // ===== 中部（3。松本は県庁ではない） =====
  kanazawa: {
    nodeId: 'kanazawa', name: '金箔工房', short: '金箔', price: 8000, icon: 'goldleaf',
    season: { 4: 1.2, 11: 1.2, 12: 1.1, 1: 0.8, 2: 0.8, 6: 0.9 },
    flavor: '加賀の城下町で打つ薄い金箔。桜と紅葉の観光どきによく売れる',
  },
  nagoya: {
    nodeId: 'nagoya', name: 'うなぎの蒲焼き', short: 'うなぎ', price: 10000, icon: 'eel',
    season: { 7: 1.8, 8: 1.3, 9: 0.9, 10: 0.9, 11: 0.9, 12: 0.9, 1: 0.8, 2: 0.8, 3: 0.9, 4: 0.9, 5: 0.9 },
    flavor: '木曽三川のうなぎを香ばしく焼く。土用の丑の夏が大勝負',
  },
  matsumoto: {
    nodeId: 'matsumoto', name: '信州そば', short: 'そば', price: 8000, icon: 'soba',
    season: { 10: 1.3, 11: 1.4, 12: 1.5, 1: 0.9, 2: 0.8, 3: 0.8, 4: 0.9, 5: 0.9, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.8 },
    flavor: '信州の高原で育つそば。秋の新そばと、暮れの年越しそばが稼ぎどき',
  },

  // ===== 近畿（3。和歌山は県庁ではない） =====
  kyoto: {
    nodeId: 'kyoto', name: '西陣織', short: '西陣', price: 11000, icon: 'weave',
    season: { 4: 1.2, 10: 1.1, 11: 1.3, 1: 1.1, 2: 0.8, 6: 0.8, 7: 0.9, 8: 0.8 },
    flavor: '千年の都で織られる色鮮やかな帯。桜と紅葉の季節に観光客が買い求める',
  },
  osaka: {
    nodeId: 'osaka', name: 'たこ焼き', short: 'たこ焼き', price: 10000, icon: 'takoyaki',
    season: { 7: 1.2, 8: 1.3, 12: 1.1, 2: 0.8, 3: 0.9, 6: 0.9, 9: 0.9, 11: 0.9 },
    flavor: '天下の台所の食い倒れ。夏祭りの屋台で飛ぶように売れる',
  },
  wakayama: {
    nodeId: 'wakayama', name: '紀州の梅干し', short: '梅干し', price: 10000, icon: 'ume',
    season: { 6: 1.4, 7: 1.3, 8: 1.1, 12: 1.2, 1: 0.9, 2: 0.8, 3: 0.8, 4: 0.9, 5: 0.9, 9: 0.9, 10: 0.9, 11: 0.9 },
    flavor: '梅雨どきに実った梅の実を、夏の日差しで干して漬ける。すっぱさが自慢',
  },

  // ===== 中国（3。岡山は県庁ではない） =====
  okayama: {
    nodeId: 'okayama', name: '岡山の白桃', short: '白桃', price: 7000, icon: 'peach',
    season: { 6: 1.1, 7: 1.7, 8: 1.6, 10: 0.9, 11: 0.9, 1: 0.7, 2: 0.7, 3: 0.7, 4: 0.8, 5: 0.9 },
    flavor: '紙袋をかけて大切に育てる白桃。やわらかく甘い夏の贈り物',
  },
  hiroshima: {
    nodeId: 'hiroshima', name: '牡蠣小屋', short: '牡蠣', price: 7000, icon: 'oyster',
    season: { 11: 1.3, 12: 1.6, 1: 1.6, 2: 1.5, 3: 1.2, 5: 0.7, 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.6 },
    flavor: '瀬戸内の穏やかな海で育つ牡蠣を焼く。寒い冬こそ旬',
  },
  shimonoseki: {
    nodeId: 'shimonoseki', name: 'ふく料理', short: 'ふく', price: 8000, icon: 'fugu',
    season: { 11: 1.2, 12: 1.5, 1: 1.6, 2: 1.5, 4: 0.9, 5: 0.7, 6: 0.6, 7: 0.6, 8: 0.6, 9: 0.8 },
    flavor: '下関ではふぐを「福」にかけてふくと呼ぶ。薄造りと鍋の冬が旬',
  },

  // ===== 四国（3） =====
  kochi: {
    nodeId: 'kochi', name: '鰹のたたき', short: '鰹', price: 6000, icon: 'katsuo',
    season: { 4: 1.3, 5: 1.5, 9: 1.2, 10: 1.4, 7: 0.9, 12: 0.7, 1: 0.6, 2: 0.6, 3: 0.8 },
    flavor: '藁の炎で表面をあぶる土佐の味。春の初鰹と秋の戻り鰹が旬',
  },
  matsuyama: {
    nodeId: 'matsuyama', name: '伊予みかん', short: 'みかん', price: 5000, icon: 'mikan',
    season: { 11: 1.3, 12: 1.6, 1: 1.5, 2: 1.2, 5: 0.7, 6: 0.7, 7: 0.6, 8: 0.6, 9: 0.8 },
    flavor: '日当たりのよい段々畑で実るみかん。冬のこたつの友',
  },
  takamatsu: {
    nodeId: 'takamatsu', name: '讃岐うどん', short: 'うどん', price: 4000, icon: 'udon',
    season: { 12: 1.1, 1: 1.2, 2: 1.1, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.9 },
    flavor: 'コシの強い讃岐の麺。朝から一杯すする人で一年中にぎわう',
  },

  // ===== 九州・沖縄（5） =====
  fukuoka: {
    nodeId: 'fukuoka', name: '明太子', short: '明太子', price: 9000, icon: 'mentaiko',
    season: { 12: 1.5, 1: 1.1, 7: 1.2, 2: 0.8, 5: 0.8, 6: 0.8, 9: 0.8 },
    flavor: '博多の屋台と並ぶ名物。お中元とお歳暮の贈り物でよく売れる',
  },
  nagasaki: {
    nodeId: 'nagasaki', name: 'カステラ', short: 'カステラ', price: 7000, icon: 'castella',
    season: { 12: 1.3, 7: 1.1, 2: 0.9, 6: 0.9, 8: 0.9, 9: 0.9 },
    flavor: '南蛮貿易の港から伝わった甘い焼き菓子。贈り物の季節によく売れる',
  },
  kumamoto: {
    nodeId: 'kumamoto', name: '火の国すいか', short: 'すいか', price: 5000, icon: 'watermelon',
    season: { 5: 1.2, 6: 1.5, 7: 1.7, 8: 1.5, 3: 0.9, 4: 0.9, 10: 0.8, 11: 0.7, 12: 0.6, 1: 0.6, 2: 0.6 },
    flavor: '火の国の強い日差しで育つ大玉。夏の稼ぎ頭',
  },
  kagoshima: {
    nodeId: 'kagoshima', name: '薩摩黒豚', short: '黒豚', price: 6000, icon: 'pork',
    season: { 11: 1.1, 12: 1.3, 1: 1.3, 2: 1.1, 6: 0.8, 7: 0.8, 8: 0.8, 9: 0.8 },
    flavor: '黒豚をしゃぶしゃぶで。桜島を眺めながら鍋を囲む冬が旬',
  },
  naha: {
    nodeId: 'naha', name: '琉球マンゴー', short: 'マンゴー', price: 6000, icon: 'mango',
    season: { 6: 1.6, 7: 1.8, 8: 1.4, 9: 0.8, 10: 0.8, 11: 0.8, 12: 0.8, 1: 0.7, 2: 0.7, 3: 0.8, 4: 0.8 },
    flavor: '南国の太陽で熟すマンゴー。夏だけの甘い宝物',
  },
};
