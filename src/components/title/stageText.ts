// 晴れ舞台係（タイトル・設定・結果発表・最終決算）の画面に出す文。
// 漢字はふりがな辞書（data/furigana.ts）で読める語だけを使う。stageText.test.ts が確かめる。
import type { CpuStyle } from '../../game/cpuAI';
import type { Region } from '../../game/types';

/** 設定画面: CPU の人物の一言（性格の説明） */
export const CPU_TRAIT: Record<CpuStyle, string> = {
  steady: 'こつこつ、やりくり上手',
  monopoly: 'よくばりで強気',
  racer: '足が自慢のせっかち',
};

/** 設定画面の文 */
export const SETUP_TEXT = {
  fishingDesc: '日本をめぐって魚を集め、ゴールをめざす',
  cityDesc: (money: string) => `町に建物を建てて育て、総資産を競う（初期資金¥${money}）`,
  accountHelp: '登録ユーザーの名前とパスワードを入れると、図鑑と装備をつなげられます',
};

/** 地方の名前（結果発表の名場面） */
export const REGION_NAME: Record<Region, string> = {
  hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州・沖縄',
};

/** 結果発表の文 */
export const RESULT_TEXT = {
  fishingTitle: '釣果番付',
  cityTitle: '長者番付',
  thanks: 'お疲れ様でした',
  tapToSkip: '押すと早送り',
  winnerFishing: '優勝',
  winnerCity: '長者',
  hidden: 'まもなく発表',
  highlights: 'この局の名場面',
  breakdown: '内訳',
  backToTitle: 'タイトルに戻る',
  // 釣り旅の内訳
  fishPoints: '魚ポイント',
  rarity: 'レアリティ',
  region: '地域制覇',
  encyclopedia: '図鑑',
  giant: '巨大魚',
  finish: 'ゴール順位',
  money: '残金',
  // まちづくりの内訳
  cash: '所持金',
  property: '建物の価値',
  population: '人口',
  buildings: '建物',
  monopolies: '独占した町',
  caught: '釣った魚',
  // 名場面
  bigCatch: 'いちばんの大物',
  newSpecies: '図鑑に新しく載った魚',
  conquered: '制覇した地方',
  noConquest: 'いちばん釣った地方',
  bestMonth: 'いちばん資産が伸びた月',
  biggestTown: 'いちばん大きな町',
  titles: '取った称号',
  titlesByYear: '年度ごとの称号',
  assetChart: '総資産の推移',
};

/** すべての文（読みの確かめ用） */
export function allStageTexts(): string[] {
  return [
    ...Object.values(CPU_TRAIT),
    SETUP_TEXT.fishingDesc,
    SETUP_TEXT.cityDesc('12,000'),
    SETUP_TEXT.accountHelp,
    ...Object.values(REGION_NAME),
    ...Object.values(RESULT_TEXT),
  ];
}
