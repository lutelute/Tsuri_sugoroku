// 遊び方の画面のページ（文章だけ。図解は HowToDiagrams.tsx）。
// 子どもも読むので文章は短く。漢字はすべてふりがな辞書（data/furigana.ts）で読めるようにする（howToPages.test.ts で確認）。
import type { HowToMode } from '../../store/useGuideStore';
import { CITY_ACTIONS_PER_VISIT, CITY_DEFAULT_MONTHS, CITY_ECONOMY, RECOVERY } from '../../game/city';
import { SPECIALTY_ECONOMY, SPECIALTY_REGIONS, regionSpecialtyIds } from '../../game/citySpecialties';
import { GOAL_CLOSE_ROUNDS } from '../../game/constants';
import { MIN_CLOSE_TURN } from '../../game/deadline';
import { RIGS, RIG_ORDER } from '../../game/fishing';
import { FISH_MARKET } from '../../game/fishMarket';
import { RAIL_ECONOMY } from '../../game/railways';
import { QUEST_ECONOMY, QUEST_GROUPS } from '../../game/cityQuests';
import { ADVICE } from '../../game/cityAdvice';
import { ADVICE_TOP } from '../../game/pathAdvice';
import { CPU_PERSONAS } from '../../data/cpuPersonas';

/** どの地方にも少なくともこの数の名産がある（県庁が2つの地方は、名物で知られる町で補っている） */
const MIN_SPECIALTIES_PER_REGION = Math.min(...SPECIALTY_REGIONS.map(r => regionSpecialtyIds(r).length));

/** 物価の例に出す年度（ふつうの対局の最後の年）と、その年の倍率 */
const PRICE_YEAR = Math.min(CITY_ECONOMY.yearScale.length, Math.ceil(CITY_DEFAULT_MONTHS / 12));
const PRICE_SCALE = CITY_ECONOMY.yearScale[PRICE_YEAR - 1];

export type DiagramId =
  | 'dice-move' | 'fork' | 'fishing-flow' | 'rigs' | 'spot' | 'gear' | 'squares' | 'goal-score'
  | 'destination' | 'build-grow' | 'demand' | 'monopoly' | 'cards' | 'specialty' | 'binbo' | 'seasons' | 'yearend'
  | 'recovery' | 'mayor' | 'quest' | 'traits' | 'fish-market' | 'rail' | 'advice' | 'path-advice' | 'cpu' | 'pause-join';

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
      lines: [
        `道が分かれたら、光っているマスをタップ。金の輪の1〜${ADVICE_TOP}が、おすすめの行き先。`,
        '下の金のボタンなら1回で進める。おすすめは、一覧を開くと切り替えできる。',
      ],
    },
    {
      id: 'f-fish', title: '釣りのミニゲーム', diagram: 'fishing-flow',
      lines: ['釣りのマスでは釣りができる。アタリが来たら合わせて、魚とやり取りしよう。', 'ミニゲームは毎回はじめに説明が出る。だれが何を釣ったかは、右下の魚籠で見返せるよ。'],
    },
    {
      id: 'f-rig', title: '仕掛けを選ぶ', diagram: 'rigs',
      lines: [
        `仕掛けは${RIG_ORDER.length}つ。数ねらいは小物がたくさん、大物ねらいはめずらしい魚（${RIGS.oomono.slots}回ぶん使う）。`,
        '道具が育つと、小物は合わせただけで釣り上げる（雑魚は手早く。切り替えできる）。',
      ],
    },
    {
      id: 'f-spot', title: '釣り場の札', diagram: 'spot',
      lines: ['何が釣れるかは「釣り場の札」で分かる。魚の種類と、まだ見ていない数が出る。', '影絵は、まだ見ていない魚と、道具を育てると会える魚。'],
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
      lines: ['魚の点数・めずらしさ・地方ごとの種類・ゴールの順番で得点が決まる。', `最初の人がゴールしてから${GOAL_CLOSE_ROUNDS}巡で終わり（${MIN_CLOSE_TURN}巡目までは続く）。`],
    },
    {
      id: 'f-pause', title: 'やめる・なかま', diagram: 'pause-join',
      lines: ['左上の「やめる」で、セーブしてやめるか、ここで順位を決めて終われる。', '「なかま」で途中から仲間を増やせる。登録すると、釣った魚が図鑑に残るよ。'],
    },
  ],
  city: [
    {
      id: 'c-dest', title: '目的地をめざす', diagram: 'destination',
      lines: [
        '旗の立った町が目的地。一番乗りで賞金がもらえ、工事が1回多くできる。',
        `年が進むと物価が上がる。${PRICE_YEAR}年目は、賞金も罰金も${PRICE_SCALE}倍。カードの値段も上がる。`,
      ],
    },
    {
      id: 'c-fork', title: '分かれ道とおすすめ', diagram: 'path-advice',
      lines: [
        `金の輪の1〜${ADVICE_TOP}が、おすすめの行き先。理由の札も出る。下の金のボタンなら1回で進める。`,
        '買い物代や運賃がかかる行き先には、注意の札。おすすめは、一覧を開くと切り替えできる。',
      ],
    },
    {
      id: 'c-build', title: '空き地に建てる', diagram: 'build-grow',
      lines: [`町に止まったら、空き地をタップして建物を建てる（1回の訪問で${CITY_ACTIONS_PER_VISIT}回まで）。`, '月末に持ち主へお金が入り、条件の良い建物は育つ。'],
    },
    {
      id: 'c-advice', title: '建てる前に見込みを見る', diagram: 'advice',
      lines: [
        '建てる物の札に、月にいくら入るかと、何か月で元が取れるかが出る。金色の「おすすめ」がいちばん得。',
        `◎は${ADVICE.bestMonths}か月まで、○は${ADVICE.goodMonths}か月まで、△は終わりまでに元が取れる。×は取れない。♡は町の支え。`,
      ],
    },
    {
      id: 'c-demand', title: '需要と電気', diagram: 'demand',
      lines: [
        // 2行目の「需要が低いと…」は入居率（住宅の収入にだけ掛かる。city.ts の occupancyRate）
        '需要の緑が伸びている物ほど育つ（芽が多いほど育ちやすい）。需要が低いと、住宅の収入が減る。',
        '発電所の近くには電気が届く。「この町に足りないもの」に電気や公園が出たら建てよう。',
      ],
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
      lines: ['県庁と、名物で知られる町には名産がある。買うと毎月収入が入り、旬の月は多くなる。', `名産はどの地方にも${MIN_SPECIALTIES_PER_REGION}つ以上。ぜんぶ集めると地方独占。収入が${SPECIALTY_ECONOMY.monopolyMul}倍！`],
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
      id: 'c-quest', title: 'お題と今年の舞台', diagram: 'quest',
      lines: [
        `4月にお題が${QUEST_GROUPS.length}つ出る。達成すると賞金。最初に達成した人は${QUEST_ECONOMY.firstMul}倍。`,
        '今年の舞台の地方には、目的地が出やすい。上の札を押すと進み具合が見える。',
      ],
    },
    {
      id: 'c-traits', title: '町の特色', diagram: 'traits',
      lines: ['古都や城下町には観光名所を建てられる。港湾都市は商業、工業地帯は工場に向く。', '雪国は冬に住宅の収入が減り、湯の町は冬に観光客が増える。町の名前の下に出るよ。'],
    },
    {
      id: 'c-fish', title: '魚市場', diagram: 'fish-market',
      lines: [
        '釣り場の町では、釣った魚を魚市場で売れる。商業地と漁港があるほど高く売れる。',
        `工場の公害で漁場が荒れると安くなる。大物を釣ると町おこし。${FISH_MARKET.derbyMonth}月は釣り大会。`,
      ],
    },
    {
      id: 'c-rail', title: '鉄道', diagram: 'rail',
      lines: [
        '自分の建物がある町の隣の中継マスに、線路を敷ける。線路は歩数を使わずに通り抜ける。',
        `ほかの人が通ると運賃が入る（1回の移動で所持金の${Math.round(RAIL_ECONOMY.fareMaxRate * 100)}%まで）。毎月の維持費もかかる。`,
      ],
    },
    {
      id: 'c-recovery', title: '災害と復興', diagram: 'recovery',
      lines: [
        `地震や台風で壊れた町は、${RECOVERY.months}か月の復興特需。建設と再開発が${Math.round((1 - RECOVERY.costMul) * 10)}割引き。`,
        `全壊した建物の持ち主には、建設費の${Math.round(RECOVERY.aidRate * 100)}%の見舞金が出る。`,
      ],
    },
    {
      id: 'c-mayor', title: '町長と条例', diagram: 'mayor',
      lines: ['区画の半分より多くを自分の建物にすると、町長になれる。', '町長は1か月に1回、条例を決める。町税などはほかのプレイヤーの建物にも効く。'],
    },
    {
      id: 'c-cpu', title: 'CPUの3人', diagram: 'cpu',
      lines: [
        `${CPU_PERSONAS.steady[0].name}は堅実、${CPU_PERSONAS.monopoly[0].name}は独占ねらい、${CPU_PERSONAS.racer[0].name}は目的地へ急ぐ。3人とも、せりふで気持ちがわかる。`,
        'CPUの番には、上の札に「いまの狙い」が出る。画面をタップすると早送りできる。',
      ],
    },
    {
      id: 'c-year', title: '年度末の大決算', diagram: 'yearend',
      lines: ['3月は1年のしめくくり。総資産の番付と称号の発表がある。', '最後の月は最終決算。総資産がいちばん多い人の勝ち！'],
    },
    {
      id: 'c-pause', title: 'やめる・なかま', diagram: 'pause-join',
      lines: ['左上の「やめる」で、セーブしてやめるか、ここで順位を決めて終われる。', '「なかま」で途中から仲間を増やせる。はじめの町から、はじめのお金で始まるよ。'],
    },
  ],
};
