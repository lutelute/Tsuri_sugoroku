// 遊び方の画面のページ（文章だけ。図解は HowToDiagrams.tsx）。
// 子どもも読むので文章は短く。漢字はすべてふりがな辞書（data/furigana.ts）で読めるようにする（howToPages.test.ts で確認）。
import type { HowToMode } from '../../store/useGuideStore';
import { CITY_ACTIONS_PER_VISIT, CITY_ECONOMY } from '../../game/city';
import { SPECIALTY_ECONOMY } from '../../game/citySpecialties';
import { GOAL_CLOSE_ROUNDS } from '../../game/constants';

export type DiagramId =
  | 'dice-move' | 'fork' | 'fishing-flow' | 'gear' | 'squares' | 'goal-score'
  | 'destination' | 'build-grow' | 'demand' | 'monopoly' | 'cards' | 'specialty' | 'binbo' | 'seasons' | 'yearend';

export interface HowToPage {
  id: string;
  title: string;
  lines: string[];
  diagram: DiagramId;
}

export const HOWTO_MODE_LABEL: Record<HowToMode, string> = {
  fishing: '釣り旅',
  city: 'まちづくり',
};

export const HOWTO_PAGES: Record<HowToMode, HowToPage[]> = {
  fishing: [
    {
      id: 'f-dice', title: 'サイコロで進む', diagram: 'dice-move',
      lines: ['「サイコロを振る」を押すと、出た目の数だけ駒が進む。', 'ゴールは南の那覇。釣りをしながら日本を旅しよう。'],
    },
    {
      id: 'f-fork', title: '分かれ道', diagram: 'fork',
      lines: ['道が分かれていたら、光っているマスをタップして行き先を選ぶ。', '下の一覧から選んでもいいよ。'],
    },
    {
      id: 'f-fish', title: '釣りのミニゲーム', diagram: 'fishing-flow',
      lines: ['釣りのマスでは釣りができる。アタリが来たら合わせて、魚とやり取りしよう。', 'ミニゲームの遊び方は、毎回はじめに説明が出るよ。'],
    },
    {
      id: 'f-gear', title: '道具をそろえる', diagram: 'gear',
      lines: ['竿・リール・ルアーは釣具店で買える。いい道具ほど釣りやすい。', '使うと傷むので、温泉や店で直そう。竿がないと釣れないよ。'],
    },
    {
      id: 'f-squares', title: 'いろいろなマス', diagram: 'squares',
      lines: ['県庁ではお祭り、店では買い物、温泉ではひと休み。', '良いこと・悪いこと・くじのマスでは、運命の札をめくる。'],
    },
    {
      id: 'f-goal', title: 'ゴールと得点', diagram: 'goal-score',
      lines: ['魚の点数・めずらしさ・地方ごとの種類・ゴールの順番で得点が決まる。', `最初の人がゴールしてから${GOAL_CLOSE_ROUNDS}巡で終わり。`],
    },
  ],
  city: [
    {
      id: 'c-dest', title: '目的地をめざす', diagram: 'destination',
      lines: ['旗の立った町が目的地。一番乗りすると賞金がもらえる。', '一番乗りの町では、工事が1回多くできる。'],
    },
    {
      id: 'c-build', title: '空き地に建てる', diagram: 'build-grow',
      lines: [`町に止まったら、空き地をタップして建物を建てる（1回の訪問で${CITY_ACTIONS_PER_VISIT}回まで）。`, '月末に持ち主へお金が入り、条件の良い建物は育つ。'],
    },
    {
      id: 'c-demand', title: '需要と電気', diagram: 'demand',
      lines: ['住宅・商業・工業のうち、需要の緑が伸びている物ほど育つ。', '発電所の近くの町には電気が届く。工場の公害には注意。'],
    },
    {
      id: 'c-mono', title: '独占', diagram: 'monopoly',
      lines: ['町のもとの区画をぜんぶ自分の建物にすると独占。', `収入が${CITY_ECONOMY.monopolyMul}倍になる。他人の建物は買収もできる。`],
    },
    {
      id: 'c-cards', title: 'カード', diagram: 'cards',
      lines: ['村や道のマスでカードがもらえる。大きな町の売り場でも買える。', '急行ならサイコロ2個。振る前や町の中で使おう。'],
    },
    {
      id: 'c-spec', title: '名産', diagram: 'specialty',
      lines: ['県庁には名産がある。買うと毎月収入が入り、旬の月は多くなる。', `地方の名産をぜんぶ集めると地方独占。収入が${SPECIALTY_ECONOMY.monopolyMul}倍！`],
    },
    {
      id: 'c-binbo', title: '貧乏神', diagram: 'binbo',
      lines: ['誰かが目的地に一番乗りすると、いちばん遠い人に貧乏神がとりつく。', '月末に悪さをする。すれ違うと、ほかの人に移せるよ。'],
    },
    {
      id: 'c-season', title: '季節の行事', diagram: 'seasons',
      lines: ['1か月ごとに季節の行事がある。', '花見や夏祭りで、観光や商業の収入が増えたり減ったりする。'],
    },
    {
      id: 'c-year', title: '年度末の大決算', diagram: 'yearend',
      lines: ['3月は1年のしめくくり。総資産の番付と称号の発表がある。', '最後に総資産がいちばん多い人の勝ち！'],
    },
  ],
};
