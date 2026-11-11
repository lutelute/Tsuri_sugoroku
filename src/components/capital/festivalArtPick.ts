// 札の絵係: 県庁の祭りごとに、見出しの後ろへ出す飾りの絵柄を決める（純粋関数）。
// capitalEvents.ts の土地と中身に合わせる。知らない id は花火にする。

/** 祭りの絵柄 */
export type FestivalKind =
  | 'snow'        // 雪まつり（雪だるまと雪像）
  | 'crane'       // 湿原の夕日と丹頂
  | 'nebuta'      // ねぶた（武者の灯籠）
  | 'tairyobune'  // 大漁旗の船
  | 'tanabata'    // 七夕（吹き流しと短冊）
  | 'mikoshi'     // 神輿
  | 'hanabi'      // 花火と屋形船
  | 'ukai'        // 鵜飼のかがり火
  | 'tourou'      // 雪吊りと灯籠
  | 'yagura'      // 盆踊りのやぐらと太鼓
  | 'yamahoko'    // 祇園の山鉾
  | 'torii'       // 海に立つ大鳥居
  | 'fugu'        // ふく提灯
  | 'odori'       // 踊りの連（阿波おどり風）
  | 'yu'          // 湯屋と湯けむり
  | 'yamakasa'    // 山笠
  | 'ryu'         // 龍踊り
  | 'volcano'     // 火の山と城（阿蘇）
  | 'sakurajima'  // 海の向こうの火の山（桜島）
  | 'shisa';      // シーサーと赤瓦

export const FESTIVAL_KINDS: FestivalKind[] = [
  'snow', 'crane', 'nebuta', 'tairyobune', 'tanabata', 'mikoshi', 'hanabi', 'ukai', 'tourou', 'yagura',
  'yamahoko', 'torii', 'fugu', 'odori', 'yu', 'yamakasa', 'ryu', 'volcano', 'sakurajima', 'shisa',
];

const BY_EVENT: Record<string, FestivalKind> = {
  sapporo_event: 'snow',
  kushiro_event: 'crane',
  aomori_event: 'nebuta',
  kamaishi_event: 'tairyobune',
  sendai_event: 'tanabata',
  edo_event: 'mikoshi',
  niigata_event: 'hanabi',
  yokohama_event: 'hanabi',
  nagoya_event: 'ukai',
  kanazawa_event: 'tourou',
  osaka_event: 'yagura',
  kyoto_event: 'yamahoko',
  hiroshima_event: 'torii',
  shimonoseki_event: 'fugu',
  takamatsu_event: 'odori',
  kochi_event: 'tairyobune',
  matsuyama_event: 'yu',
  fukuoka_event: 'yamakasa',
  nagasaki_event: 'ryu',
  kumamoto_event: 'volcano',
  kagoshima_event: 'sakurajima',
  okinawa_event: 'shisa',
};

/** 祭りの id から絵柄を決める */
export function festivalArtFor(eventId: string): FestivalKind {
  return BY_EVENT[eventId] ?? 'hanabi';
}

/** 絵柄が決めてある祭りの id（テスト用） */
export const FESTIVAL_EVENT_IDS = Object.keys(BY_EVENT);
