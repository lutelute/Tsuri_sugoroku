// まちづくり: 町の特色（企画書⑪）。町ごとに 1〜2 個の特色を付け、町の格を上書きできる。
//
// - 特色の効果（建てられる建物・需要・収入・公害・季節）はここの TOWN_TRAITS にまとめる。
//   数値は難易度調整係が balance.city.sim.test.ts で測って調整する（CITY_ECONOMY とは別に置く）。
// - 町の割り当ては CITY_TRAITS。実在の地理と歴史に沿う（古都・門前町、開港の港、工業地帯、城下町、豪雪地、温泉地）。
// - cls は町の格の上書き。マスの種類から決まる格が実態と合わない町だけ直す（例: 神戸は温泉町 → 都市）。
// - 効果の計算は src/game/cityTraits.ts、町の情報・需要・収入への組み込みは src/game/city.ts。
import type { BuildingKind, TownClass } from '../game/city';

export type TownTraitId = 'koto' | 'kowan' | 'kogyo' | 'joka' | 'yukiguni' | 'yunomachi';

/** 季節の補正（months の月に kind の収入を mul 倍） */
export interface TraitSeasonRule {
  months: number[];
  kind: BuildingKind;
  mul: number;
}

export interface TownTraitDef {
  id: TownTraitId;
  /** 札に出す名前 */
  name: string;
  /** 1文字の印（飾り。建物の略字「港」「工」などと紛らわしくないもの） */
  mark: string;
  /** 札の色 */
  color: string;
  /** ひとことの由来（効果の説明は数値から自動で作る） */
  flavor: string;
  /** 町の格に関係なく建てられるようになる建物 */
  allowAdd?: BuildingKind[];
  /** 需要の上乗せ（r=住宅 c=商業 i=工業） */
  demand?: { r?: number; c?: number; i?: number };
  /** 建物の種類ごとの収入の倍率（正の収入だけに掛ける） */
  incomeMul?: Partial<Record<BuildingKind, number>>;
  /** この町の工業が出す公害の倍率（近くの町へ流れる分にも効く） */
  pollutionMul?: number;
  /** 季節の補正。季節の暦（city.ts の SEASONS）が同じ月・同じ建物を同じ向きに動かすときは重ねない */
  season?: TraitSeasonRule[];
}

export const TOWN_TRAITS: Record<TownTraitId, TownTraitDef> = {
  koto: {
    id: 'koto', name: '古都・門前町', mark: '寺', color: '#b0417a',
    flavor: '古い都や、お寺・神社の門前町。参拝客と観光客でにぎわう',
    allowAdd: ['tourism'],
    incomeMul: { tourism: 1.4 },
  },
  kowan: {
    id: 'kowan', name: '港湾都市', mark: '船', color: '#2f7fb0',
    flavor: '外国との貿易で栄えた港の都市。船と商いが集まる',
    allowAdd: ['port', 'tourism'],
    incomeMul: { com: 1.2 },
  },
  kogyo: {
    id: 'kogyo', name: '工業地帯', mark: '煙', color: '#a07424',
    flavor: '工場が集まり、ものづくりで栄える。公害を抑える備えも進んでいる',
    demand: { i: 0.8 },
    pollutionMul: 0.7,
  },
  joka: {
    id: 'joka', name: '城下町', mark: '城', color: '#7a5a2a',
    flavor: 'お城のまわりに商人と職人が集まって栄えた。お城は観光名所になる',
    allowAdd: ['tourism'],
    demand: { c: 0.3 },
    incomeMul: { tourism: 1.2 },
  },
  yukiguni: {
    id: 'yukiguni', name: '雪国', mark: '雪', color: '#5f86a8',
    flavor: '冬は深い雪に閉ざされる。暮らしは大変だが、雪まつりに客が集まる',
    season: [
      { months: [12, 1, 2], kind: 'res', mul: 0.9 },
      { months: [2], kind: 'tourism', mul: 2 },
    ],
  },
  yunomachi: {
    id: 'yunomachi', name: '湯の町', mark: '湯', color: '#c0583a',
    flavor: '名湯がわく温泉地。寒い季節ほど湯治の客が増える',
    season: [{ months: [12, 1, 2], kind: 'tourism', mul: 1.5 }],
  },
};

export interface TownTraitEntry {
  traits: TownTraitId[];
  /** 町の格の上書き（マスの種類から決まる格が実態と合わない町だけ） */
  cls?: TownClass;
  /** なぜこの特色・格なのか（札の説明に出す） */
  note: string;
}

/** 町 → 特色。ここにない町は特色なし（町の格もマスの種類どおり） */
export const CITY_TRAITS: Record<string, TownTraitEntry> = {
  // ===== 北海道 =====
  sapporo: { traits: ['yukiguni'], note: '冬は雪に埋もれる北の都' },
  asahikawa: { traits: ['yukiguni'], cls: 'market', note: '道北の商いの中心。温泉町ではなく商都' },
  otaru: { traits: ['yukiguni'], note: '雪あかりの運河で知られる港町' },
  hakodate: { traits: ['kowan'], note: '日本で最初に開かれた港の一つ' },
  // ===== 東北 =====
  aomori: { traits: ['yukiguni'], note: '大雪の降る津軽の港町' },
  akita: { traits: ['yukiguni'], note: '日本海側の豪雪地' },
  yamagata: { traits: ['yukiguni', 'yunomachi'], note: '雪深い山あいに名湯がわく' },
  sakata: { traits: [], cls: 'market', note: '北前船の豪商で栄えた港町。村ではなく商都' },
  kamaishi: { traits: ['kogyo'], note: '近代の製鉄が始まった鉄の町' },
  // ===== 関東（盤面の地方分けでは新潟も関東） =====
  niigata: { traits: ['yukiguni'], note: '日本海側の雪国の玄関口' },
  yokohama: { traits: ['kowan'], note: '開港から始まった港の都市' },
  kamakura: { traits: ['koto'], note: '武士の古都。大仏と古い寺が並ぶ' },
  nikko: { traits: ['koto'], note: '東照宮の門前町' },
  // ===== 中部 =====
  nagano: { traits: ['koto', 'yukiguni'], note: '善光寺の門前町。冬は雪国' },
  toyama: { traits: ['yukiguni'], note: '立山の深い雪に囲まれた北陸の港町' },
  kanazawa: { traits: ['joka', 'yukiguni'], note: '加賀の城下町。雪吊りの冬' },
  takayama: { traits: ['koto', 'yukiguni'], note: '飛騨の小京都。冬は雪国' },
  nagoya: { traits: ['kogyo'], note: '自動車などの工場が集まる工業地帯' },
  matsumoto: { traits: ['joka'], note: '黒いお城で知られる城下町' },
  hamamatsu: { traits: ['kogyo'], note: '楽器とオートバイのものづくりで知られる' },
  // ===== 近畿 =====
  kyoto: { traits: ['koto'], note: '千年の都' },
  nara: { traits: ['koto'], note: '大仏と鹿の古都' },
  ise: { traits: ['koto'], note: '伊勢神宮の門前町' },
  kobe: { traits: ['kowan'], cls: 'city', note: '開港で栄えた港の都市。温泉町ではなく都市' },
  // ===== 中国 =====
  matsue: { traits: ['joka'], note: '宍道湖のほとりの城下町' },
  kurashiki: { traits: ['kogyo'], cls: 'market', note: '白壁の蔵が並ぶ町並みと、海沿いの工業地帯。温泉町ではなく商都' },
  hagi: { traits: ['joka'], note: '維新の志士を育てた城下町' },
  // ===== 四国 =====
  matsuyama: { traits: ['yunomachi'], note: '道後温泉の湯の町' },
  // ===== 九州・沖縄 =====
  fukuoka: { traits: ['kowan'], note: '大陸との玄関口の港の都市' },
  nagasaki: { traits: ['kowan'], note: '異国との貿易で栄えた港の都市' },
  kumamoto: { traits: ['joka'], note: '大きな石垣のお城の城下町' },
  beppu: { traits: ['yunomachi'], note: '湯けむりの上がる日本一の温泉地' },
  kirishima: { traits: ['yunomachi'], cls: 'onsen', note: '霧島の山々に温泉がわく。村ではなく温泉町' },
  nobeoka: { traits: ['kogyo'], note: '化学工場で栄えた工業都市' },
};
