import type { FishPack } from '.';

// 第8群：各地の名物・巨大な主・言い伝えの魚。
// 重量は kg（ゲーム内の個体範囲）、季節は旬・釣期・観察期の目安。
// 地方型・亜種・無斑型・移入魚も収録。regions は国内の確認された生息地から選ぶ。
// ミシカルの重量と絵は伝承をもとにした演出で、実在・姿を断定するものではない。
// 生態・分布・食文化の参照：
// イワナ類 https://www.jfa.maff.go.jp/j/enoki/pdf/hatugannran.pdf
// ミヤベイワナ https://www.shikaoi-story.jp/highlight/miyabeiwana/
// シナノユキマス https://www.pref.nagano.lg.jp/suisan/joho/sakanatachi/shinanoyukimasu.html
// イサザ https://shigaquo.jp/foods/4831.html
// ウツセミカジカ https://www.lberi.jp/iframe_dir/data/cottus-reinii/
// ワニエソ https://www.pref.niigata.lg.jp/uploaded/attachment/280318.pdf
// クニマス https://www.pref.yamanashi.jp/shokusui/kunimasu.html
// サツキマス https://www.pref.gifu.lg.jp/page/4440.html
// ウケクチウグイ https://www.pref.nagano.lg.jp/suisan/joho/sakanatachi/ukekuchiugui.html
// カワバタモロコ https://biodiversity.pref.fukuoka.lg.jp/rdb/rdbs/detail/202400984
// ジュズカケハゼ https://www.zukan-bouz.com/haze/ukigori/juzukakehaze.html
// 移入魚 https://www.nies.go.jp/biodiversity/invasive/DB/detail/50190.html
// https://www.nies.go.jp/biodiversity/invasive/DB/detail/50320.html
// https://www.nies.go.jp/biodiversity/invasive/DB/detail/50070.html
// アユカケ https://www.honda.co.jp/fishing/picture-book/ayukake/
// レイクトラウト https://www.honda.co.jp/fishing/picture-book/laketrout/index.html
// 南方魚 https://www.museum.kagoshima-u.ac.jp/staff/motomura/FishesYoron_lowes.pdf
// https://zukan.com/fish/internal2454 （アカメモドキ）
// https://zukan.com/fish/internal771 （イセゴイ）
// https://zukan.com/fish/internal547 （チャイロマルハタ）
// https://www.honda.co.jp/fishing/picture-book/barahata/
// https://www.oki-churaumi.jp/fishbook/00000091/ （カスリハタ）
// https://www.oki-churaumi.jp/fishbook/1577779281/ （スジナメモンガラ）
// https://www.zukan-bouz.com/syu/オオグチイシチビキ
// テツギョ https://www.kahaku.go.jp/research/db/zoology/uodas/fish_in_focus/tennen/tetugyo.html
// イワメ https://www.pref.ehime.jp/reddatabook2014/detail/04_08_000540_0.html
// オオニベ https://www.yoshoku.or.jp/gyosyu/oonibe/
// タマカイ https://zukan.com/fish/internal2520
// ヤイトハタ https://kariyushi-aquarium.com/animals/lists/?animals_category=kana&id=9
// オオクチイシナギ https://www.pref.niigata.lg.jp/uploaded/attachment/97380.pdf
// オオメジロザメ https://churaumi.okinawa/sp/fishbook/00000495/
// 伝承の参照：タキタロウ https://ootori-tengo.com/731
// ナミタロウ https://niigata-kankou.or.jp/spot/detail_12909.html
// 岩魚坊主 https://www.nichibun.ac.jp/cgi-bin/YoukaiDB3/simsearch.cgi?ID=0030128
// 鮭の大助 https://www.akihaku.jp/monogatari/show_detail.php?serial_no=1861
// https://crd.ndl.go.jp/reference/entry/index.php?id=1000084593&page=ref_view
export const PACK: FishPack = {
  fish: [
    // uncommon: 10 種
    {
      id: 'oshorokoma', name: 'オショロコマ', rarity: 'uncommon', points: 300,
      regions: ['hokkaido'], minEquipmentLevel: 2,
      description: '北海道の冷たい渓流にすむイワナの仲間で、体側の赤い小斑点が目印。水生昆虫などを食べ、毛針にも反応する。',
      emoji: '🐟',
      appearance: { bodyColor: '#839779', accentColor: '#e3be86', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.03, max: 0.5 }, season: '春〜秋', habitat: '渓流', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/オショロコマ',
    },
    {
      id: 'nikkouiwana', name: 'ニッコウイワナ', rarity: 'uncommon', points: 260,
      regions: ['tohoku', 'kanto', 'chubu'], minEquipmentLevel: 1,
      description: '東北南部や関東、中部の渓流にすむイワナ。白い斑点に黄橙色の斑点が交じり、川虫を使う餌釣りや毛針で狙う。',
      emoji: '🐟',
      appearance: { bodyColor: '#8e9670', accentColor: '#e2ce9b', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.03, max: 1.2 }, season: '春〜秋', habitat: '渓流', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/イワナ',
    },
    {
      id: 'yamatoiwana', name: 'ヤマトイワナ', rarity: 'uncommon', points: 320,
      regions: ['chubu', 'kinki'], minEquipmentLevel: 2,
      description: '中部地方の太平洋側や紀伊半島の渓流にすむイワナ。体側の橙色の斑点が目立ち、水生昆虫や水面に落ちた虫を食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#8c8961', accentColor: '#d9bd80', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.03, max: 0.6 }, season: '春〜秋', habitat: '渓流', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ヤマトイワナ',
    },
    {
      id: 'gogi', name: 'ゴギ', rarity: 'uncommon', points: 340,
      regions: ['chugoku'], minEquipmentLevel: 2,
      description: '中国山地の冷たい渓流にすむイワナで、頭の上にも白い斑点がある。岩陰に身を寄せ、水生昆虫などを食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#7e8963', accentColor: '#ded0a2', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.03, max: 0.5 }, season: '春〜秋', habitat: '渓流', difficulty: 3,
    },
    {
      id: 'amemasu', name: 'アメマス', rarity: 'uncommon', points: 380,
      regions: ['hokkaido', 'tohoku'], minEquipmentLevel: 2,
      description: '北海道や東北に分布する、大きな白い斑点をもつイワナの仲間。海へ下る個体は大型に育ち、スプーンなどのルアーで狙う。',
      emoji: '🐟',
      appearance: { bodyColor: '#91aaa0', accentColor: '#e8e7d8', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'large' },
      weight: { min: 0.1, max: 5 }, season: '春〜秋', habitat: '河川', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/アメマス',
    },
    {
      id: 'kawamasu', name: 'カワマス', rarity: 'uncommon', points: 300,
      regions: ['kanto', 'chubu'], minEquipmentLevel: 2,
      description: '北米原産で、日光の湖などに移入されたイワナの仲間。背の虫食い模様と青白く縁取られた赤点が特徴で、毛針釣りの対象になる。',
      emoji: '🐟',
      appearance: { bodyColor: '#80916b', accentColor: '#e7ad73', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.05, max: 1.5 }, season: '春〜秋', habitat: '湖沼', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/カワマス',
    },
    {
      id: 'shinanoyukimasu', name: 'シナノユキマス', rarity: 'uncommon', points: 280,
      regions: ['chubu'], minEquipmentLevel: 1,
      description: '長野県で養殖が広まった、銀白色で口の小さいサケ科の魚。自然下では動物プランクトンなどを食べ、白身は塩焼きやフライに向く。',
      emoji: '🐟',
      appearance: { bodyColor: '#bccbd0', accentColor: '#f0f0e7', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.15, max: 1.2 }, season: '春〜夏', habitat: '湖沼', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/シナノユキマス',
    },
    {
      id: 'isaza', name: 'イサザ', rarity: 'uncommon', points: 240,
      regions: ['kinki'], minEquipmentLevel: 1,
      description: '琵琶湖固有の小さなハゼで、薄茶色の体に大きな頭と口をもつ。大豆と甘辛く煮る「いさざ豆」は湖国の郷土料理。',
      emoji: '🐟',
      appearance: { bodyColor: '#b6aa8b', accentColor: '#eee4c9', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'small' },
      weight: { min: 0.001, max: 0.008 }, season: '秋〜冬', habitat: '湖沼', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/イサザ',
    },
    {
      id: 'utsusemikajika', name: 'ウツセミカジカ', rarity: 'uncommon', points: 260,
      regions: ['kinki'], minEquipmentLevel: 1,
      description: '大きな胸びれをもつ底生魚で、琵琶湖では湖と流入河川に暮らす。石の間で小動物を食べ、湖周辺では煮付けなどに利用される。',
      emoji: '🐟',
      appearance: { bodyColor: '#9c8d6d', accentColor: '#ded4b7', bodyShape: 'standard', pattern: 'spots', finStyle: 'large', size: 'small' },
      weight: { min: 0.005, max: 0.1 }, season: '春〜秋', habitat: '湖沼', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/カジカ_(魚)',
    },
    {
      id: 'wanieso', name: 'ワニエソ', rarity: 'uncommon', points: 250,
      regions: ['chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'], minEquipmentLevel: 1,
      description: '大きな口と鋭い歯をもつ細長い海の魚で、砂泥底の近くで魚を捕らえる。小骨が多いため、すり身にしてかまぼこに使われる。',
      emoji: '🐟',
      appearance: { bodyColor: '#b7ae8a', accentColor: '#e6ddc2', bodyShape: 'elongated', pattern: 'spots', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.1, max: 2 }, season: '通年', habitat: '沖合', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ワニエソ',
    },
    // rare: 20 種
    {
      id: 'miyabeiwana', name: 'ミヤベイワナ', rarity: 'rare', points: 780,
      regions: ['hokkaido'], minEquipmentLevel: 3,
      description: '北海道の然別湖に固有のオショロコマの亜種。胸びれが大きく、発達した鰓耙でプランクトンをこし取り、特別解禁では毛針で狙う。',
      emoji: '🐟',
      appearance: { bodyColor: '#83a592', accentColor: '#dce1be', bodyShape: 'standard', pattern: 'spots', finStyle: 'large', size: 'medium' },
      weight: { min: 0.1, max: 1.2 }, season: '夏〜秋', habitat: '湖沼', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ミヤベイワナ',
    },
    {
      id: 'satsukimasu', name: 'サツキマス', rarity: 'rare', points: 720,
      regions: ['chubu'], minEquipmentLevel: 3,
      description: 'アマゴが海へ下って成長し、銀色の姿で川へ戻ったもの。長良川では春から初夏に遡上し、ミノーやスプーンで狙う。',
      emoji: '🐟',
      appearance: { bodyColor: '#b6c7be', accentColor: '#eef0e4', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'large' },
      weight: { min: 0.3, max: 2 }, season: '春〜初夏', habitat: '河川', difficulty: 4,
    },
    {
      id: 'reikutorauto', name: 'レイクトラウト', rarity: 'rare', points: 760,
      regions: ['kanto'], minEquipmentLevel: 3,
      description: '北米原産で、中禅寺湖に定着した大型のイワナの仲間。淡い斑点と深く切れ込む尾びれが特徴で、湖底近くをルアーで探る。',
      emoji: '🐟',
      appearance: { bodyColor: '#7b9180', accentColor: '#e0ddc1', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 0.3, max: 12 }, season: '春〜秋', habitat: '湖沼', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/レイクトラウト',
    },
    {
      id: 'kunimasu', name: 'クニマス', rarity: 'rare', points: 800,
      regions: ['chubu'], minEquipmentLevel: 3,
      description: '秋田の田沢湖で絶滅したと考えられたが、移植先の山梨県西湖で再発見されたサケ科の魚。湖の深場で暮らし、湖底で産卵する。',
      emoji: '🐟',
      appearance: { bodyColor: '#737d73', accentColor: '#c7c9b5', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.1, max: 0.8 }, season: '通年', habitat: '湖沼', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/クニマス',
    },
    {
      id: 'ukekuchiugui', name: 'ウケクチウグイ', rarity: 'rare', points: 740,
      regions: ['tohoku', 'chubu'], minEquipmentLevel: 3,
      description: '信濃川や最上川など日本海側の大河川にすむ大型のウグイの仲間。下あごが前へ突き出し、小魚などを食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#9ea99c', accentColor: '#dedfc9', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'large' },
      weight: { min: 0.2, max: 5 }, season: '春〜秋', habitat: '河川', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ウケクチウグイ',
    },
    {
      id: 'juzukakehaze', name: 'ジュズカケハゼ', rarity: 'rare', points: 550,
      regions: ['hokkaido', 'tohoku', 'kanto'], minEquipmentLevel: 2,
      description: '池や流れの緩い水路にすむ小さなハゼ。体側には数珠を思わせる暗色の模様が並び、水底の小さな動物を食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#a69b7d', accentColor: '#e1d9bc', bodyShape: 'standard', pattern: 'stripes', finStyle: 'normal', size: 'small' },
      weight: { min: 0.001, max: 0.01 }, season: '春〜秋', habitat: '湖沼', difficulty: 2,
    },
    {
      id: 'kawabatamoroko', name: 'カワバタモロコ', rarity: 'rare', points: 600,
      regions: ['chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'], minEquipmentLevel: 2,
      description: '西日本の水草が多い池や水路にすむ小魚。普段は銀色だが、繁殖期の雄は金色になり、岸辺の水に浸かった植物に産卵する。',
      emoji: '🐟',
      appearance: { bodyColor: '#d2c56c', accentColor: '#eee5b5', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'small' },
      weight: { min: 0.001, max: 0.006 }, season: '夏', habitat: '水田', difficulty: 2,
      wikiUrl: 'https://ja.wikipedia.org/wiki/カワバタモロコ',
    },
    {
      id: 'ayukake', name: 'アユカケ', rarity: 'rare', points: 680,
      regions: ['tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'], minEquipmentLevel: 2,
      description: '大きな頭と口、えらぶたの曲がった棘が特徴のカジカの仲間。川底で小魚を待ち伏せ、冬には産卵のため海へ下る。',
      emoji: '🐟',
      appearance: { bodyColor: '#968b67', accentColor: '#ddd3b1', bodyShape: 'standard', pattern: 'spots', finStyle: 'large', size: 'medium' },
      weight: { min: 0.03, max: 0.6 }, season: '秋〜冬', habitat: '河川', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/アユカケ',
    },
    {
      id: 'akamemodoki', name: 'アカメモドキ', rarity: 'rare', points: 620,
      regions: ['kyushu'], minEquipmentLevel: 2,
      description: '琉球列島の浅い海にすむ、赤みを帯びた目と銀褐色の体をもつ魚。大きな口で小魚などを食べ、白身はバター焼きにも使われる。',
      emoji: '🐟',
      appearance: { bodyColor: '#a39c83', accentColor: '#ddd6bc', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.2, max: 2 }, season: '通年', habitat: '磯', difficulty: 3,
    },
    {
      id: 'isegoi', name: 'イセゴイ', rarity: 'rare', points: 650,
      regions: ['kanto', 'chubu', 'kyushu'], minEquipmentLevel: 2,
      description: '大きな銀色の鱗と、糸のように伸びる背びれの最後の軟条が特徴。暖かい沿岸や汽水域にすみ、幼魚は川にも入る。',
      emoji: '🐟',
      appearance: { bodyColor: '#becfcd', accentColor: '#edf0e6', bodyShape: 'standard', pattern: 'gradient', finStyle: 'long', size: 'large' },
      weight: { min: 0.1, max: 6 }, season: '夏〜秋', habitat: '河口', difficulty: 3,
    },
    {
      id: 'kasurihata', name: 'カスリハタ', rarity: 'rare', points: 800,
      regions: ['kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 3,
      description: '灰色の体に眼より大きな黒褐色の斑紋が散る大型のハタ。南日本のサンゴ礁や岩穴に身を隠し、魚や甲殻類を捕らえる。',
      emoji: '🐟',
      appearance: { bodyColor: '#a6a58d', accentColor: '#ddd7b9', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 1, max: 40 }, season: '通年', habitat: '磯', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/カスリハタ',
    },
    {
      id: 'chairomaruhata', name: 'チャイロマルハタ', rarity: 'rare', points: 700,
      regions: ['chubu', 'kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 3,
      description: '体やひれに橙褐色の丸い斑点が散る大型のハタ。南日本の浅い海やマングローブの汽水域に入り、小魚や甲殻類を食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#b3ac86', accentColor: '#e3dbb7', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'large' },
      weight: { min: 0.3, max: 20 }, season: '通年', habitat: '河口', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/チャイロマルハタ',
    },
    {
      id: 'barahata', name: 'バラハタ', rarity: 'rare', points: 640,
      regions: ['kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 2,
      description: '赤褐色の体に小斑点が散り、尾びれの両端が長く伸びるハタ。サンゴ礁の中層も泳ぎ、沖釣りや磯釣りでかかることがある。',
      emoji: '🐟',
      appearance: { bodyColor: '#d08167', accentColor: '#ebc29a', bodyShape: 'standard', pattern: 'spots', finStyle: 'long', size: 'large' },
      weight: { min: 0.2, max: 5 }, season: '通年', habitat: '磯', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/バラハタ',
    },
    {
      id: 'kitsunefuefuki', name: 'キツネフエフキ', rarity: 'rare', points: 760,
      regions: ['kyushu'], minEquipmentLevel: 3,
      description: '長く突き出た吻が特徴の大型のフエフキダイの仲間。沖縄ではウムナガーと呼ばれ、サンゴ礁周辺で魚や底生動物を食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#a8b58b', accentColor: '#e4dfbc', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'large' },
      weight: { min: 0.5, max: 12 }, season: '通年', habitat: '磯', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/キツネフエフキ',
    },
    {
      id: 'ishifuedai', name: 'イシフエダイ', rarity: 'rare', points: 650,
      regions: ['kanto', 'chubu', 'kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 2,
      description: '暗い青色の細長い体に大きな口をもつ南方の魚。岩礁やサンゴ礁の周辺にすみ、魚を追い、釣りや刺し網で漁獲される。',
      emoji: '🐟',
      appearance: { bodyColor: '#738eaa', accentColor: '#cbd4ce', bodyShape: 'elongated', pattern: 'gradient', finStyle: 'normal', size: 'large' },
      weight: { min: 0.2, max: 4 }, season: '通年', habitat: '磯', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/イシフエダイ',
    },
    {
      id: 'ooguchiishichibiki', name: 'オオグチイシチビキ', rarity: 'rare', points: 700,
      regions: ['kanto', 'chubu', 'kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 3,
      description: '大きく裂ける口と、赤みを帯びた細長い体をもつ魚。南日本の深い岩礁域にすみ、白身は刺身やバター焼きに利用される。',
      emoji: '🐟',
      appearance: { bodyColor: '#cf9897', accentColor: '#ecd6c3', bodyShape: 'elongated', pattern: 'gradient', finStyle: 'normal', size: 'large' },
      weight: { min: 0.5, max: 12 }, season: '通年', habitat: '沖合', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/オオグチイシチビキ',
    },
    {
      id: 'sujinamemongara', name: 'スジナメモンガラ', rarity: 'rare', points: 580,
      regions: ['kanto', 'kyushu'], minEquipmentLevel: 2,
      description: '八丈島や琉球列島のサンゴ礁外縁にすむモンガラカワハギの仲間。体の上半分に細い褐色の線が入り、動物プランクトンを食べる。',
      emoji: '🐟',
      appearance: { bodyColor: '#b7aa8b', accentColor: '#e3d6b9', bodyShape: 'flat', pattern: 'stripes', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.1, max: 1 }, season: '通年', habitat: '沖合', difficulty: 3,
    },
    {
      id: 'tetsugyo', name: 'テツギョ', rarity: 'rare', points: 780,
      regions: ['tohoku'], minEquipmentLevel: 3,
      description: '宮城県の魚取沼などで知られる、尾びれが長く伸びるフナに似た魚。鉄色や赤色など色彩の変化があり、泳ぐ姿が観賞される。',
      emoji: '🐟',
      appearance: { bodyColor: '#a18b63', accentColor: '#daceab', bodyShape: 'standard', pattern: 'gradient', finStyle: 'long', size: 'medium' },
      weight: { min: 0.02, max: 0.3 }, season: '春〜秋', habitat: '湖沼', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/テツギョ',
    },
    {
      id: 'kokuchibasu', name: 'コクチバス', rarity: 'rare', points: 550,
      regions: ['tohoku', 'kanto', 'chubu'], minEquipmentLevel: 2,
      description: '北米原産で、日本の湖や河川にも定着した外来魚。口の後端が目の後ろを越えず、褐色の体に暗い帯が入り、ルアー釣りの対象になる。',
      emoji: '🐟',
      appearance: { bodyColor: '#97925b', accentColor: '#ded4a5', bodyShape: 'standard', pattern: 'stripes', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.1, max: 3 }, season: '春〜秋', habitat: '湖沼', difficulty: 3,
      wikiUrl: 'https://ja.wikipedia.org/wiki/コクチバス',
    },
    {
      id: 'iwame', name: 'イワメ', rarity: 'rare', points: 750,
      regions: ['kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 3,
      description: 'アマゴなどの斑紋が消えた無斑型として知られる渓流魚。大分県の大野川水系などに生息し、斑点のない体が目を引く。',
      emoji: '🐟',
      appearance: { bodyColor: '#b3b99a', accentColor: '#eee6cb', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'medium' },
      weight: { min: 0.03, max: 0.5 }, season: '春〜秋', habitat: '渓流', difficulty: 4,
      wikiUrl: 'https://ja.wikipedia.org/wiki/サツキマス',
    },
    // legendary: 6 種
    {
      id: 'oonibe', name: 'オオニベ', rarity: 'legendary', points: 1600,
      regions: ['kanto', 'chubu', 'kinki', 'shikoku', 'kyushu'], minEquipmentLevel: 3,
      description: '宮崎で親しまれる、全長一・五メートルを超える大型のニベ。銀灰色の体をもち、白身は刺身や焼き物、蒸し物で味わえる。',
      emoji: '🐟',
      appearance: { bodyColor: '#a8b3ae', accentColor: '#e4e7d8', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 5, max: 40 }, season: '冬', habitat: '砂浜', difficulty: 4,
    },
    {
      id: 'tamakai', name: 'タマカイ', rarity: 'legendary', points: 2000,
      regions: ['kanto', 'kinki', 'chugoku', 'shikoku', 'kyushu'], minEquipmentLevel: 4,
      description: 'サンゴ礁の岩穴などに暮らす、二メートルを超える巨大なハタ。成魚は灰褐色のまだら模様で、大きな口で魚や甲殻類をのみ込む。',
      emoji: '🐟',
      appearance: { bodyColor: '#8e9480', accentColor: '#c8c9a9', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 10, max: 250 }, season: '通年', habitat: '磯', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/タマカイ',
    },
    {
      id: 'yaitohata', name: 'ヤイトハタ', rarity: 'legendary', points: 1800,
      regions: ['kyushu'], minEquipmentLevel: 4,
      description: '沖縄でアーラミーバイと呼ばれる大型のハタ。お灸の跡のような黒い小斑点が体に散り、サンゴ礁や汽水域で小魚などを捕食する。',
      emoji: '🐟',
      appearance: { bodyColor: '#a8a387', accentColor: '#dfd8b8', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 3, max: 70 }, season: '通年', habitat: '磯', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ヤイトハタ',
    },
    {
      id: 'ookuchiishinagi', name: 'オオクチイシナギ', rarity: 'legendary', points: 1900,
      regions: ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu'], minEquipmentLevel: 4,
      description: '大きな口と厚い体をもつ、二メートル級になる海の大型魚。深い岩礁域で魚やイカを食べ、大きな餌を使う船釣りの対象になる。',
      emoji: '🐟',
      appearance: { bodyColor: '#8d8e7b', accentColor: '#cfceba', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'huge' },
      weight: { min: 10, max: 180 }, season: '春〜夏', habitat: '深海', difficulty: 5,
    },
    {
      id: 'aouo', name: 'アオウオ', rarity: 'legendary', points: 1700,
      regions: ['kanto'], minEquipmentLevel: 4,
      description: '中国原産で利根川水系にも定着した、青黒く細長い巨魚。コイに似るが口ひげがなく、貝を餌にした底釣りで狙う。',
      emoji: '🐟',
      appearance: { bodyColor: '#647a78', accentColor: '#c3cdc3', bodyShape: 'elongated', pattern: 'gradient', finStyle: 'normal', size: 'huge' },
      weight: { min: 5, max: 70 }, season: '春・秋', habitat: '河川', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/アオウオ',
    },
    {
      id: 'oomejirozame', name: 'オオメジロザメ', rarity: 'legendary', points: 1800,
      regions: ['kyushu'], minEquipmentLevel: 4,
      description: '短く丸い吻と太い体をもつ大型のサメ。沖縄にも生息し、淡水に適応して川をさかのぼることがあり、魚などを捕食する。',
      emoji: '🐟',
      appearance: { bodyColor: '#9eaeb1', accentColor: '#e2e7e1', bodyShape: 'shark', pattern: 'gradient', finStyle: 'normal', size: 'huge' },
      weight: { min: 20, max: 300 }, season: '通年', habitat: '河口', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/オオメジロザメ',
    },
    // mythical: 4 種
    {
      id: 'takitarou', name: 'タキタロウ', rarity: 'mythical', points: 4800,
      regions: ['tohoku'], minEquipmentLevel: 5,
      description: '山形県の大鳥池にすむと語られる幻の巨大魚。長い下あごをもつとも伝わるが、正体は確定しておらず、湖の伝説として知られる。',
      emoji: '🐟',
      appearance: { bodyColor: '#74816c', accentColor: '#c6c9a3', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 30, max: 150 }, season: '通年', habitat: '湖沼', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/タキタロウ',
    },
    {
      id: 'namitarou', name: 'ナミタロウ', rarity: 'mythical', points: 4500,
      regions: ['chubu'], minEquipmentLevel: 5,
      description: '新潟県糸魚川市の高浪の池で語られる巨大魚。四メートルほどの魚がすむといわれ、浪太郎の愛称で親しまれるが、正体は不明。',
      emoji: '🐟',
      appearance: { bodyColor: '#958464', accentColor: '#d1c09a', bodyShape: 'standard', pattern: 'gradient', finStyle: 'normal', size: 'huge' },
      weight: { min: 50, max: 200 }, season: '通年', habitat: '湖沼', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/ナミタロウ',
    },
    {
      id: 'iwanabouzu', name: '岩魚坊主', rarity: 'mythical', points: 4000,
      regions: ['chubu'], minEquipmentLevel: 5,
      description: '岐阜などに伝わる、僧に化けて殺生を戒める岩魚の怪。もてなされた団子が、のちに捕らえられた岩魚の腹から出たと語られる。',
      emoji: '🐟',
      appearance: { bodyColor: '#6b7651', accentColor: '#d1bb83', bodyShape: 'standard', pattern: 'spots', finStyle: 'normal', size: 'huge' },
      weight: { min: 5, max: 35 }, season: '通年', habitat: '渓流', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/岩魚坊主',
    },
    {
      id: 'sakenooosuke', name: '鮭の大助', rarity: 'mythical', points: 5000,
      regions: ['tohoku', 'chubu'], minEquipmentLevel: 5,
      description: '東北や新潟に伝わる鮭の王。川を上る際に声を発するといわれ、その日に漁を休むなど、鮭漁にまつわる禁忌の物語に登場する。',
      emoji: '🐟',
      appearance: { bodyColor: '#7c8a75', accentColor: '#dad6af', bodyShape: 'standard', pattern: 'stripes', finStyle: 'normal', size: 'huge' },
      weight: { min: 20, max: 100 }, season: '秋〜冬', habitat: '河川', difficulty: 5,
      wikiUrl: 'https://ja.wikipedia.org/wiki/鮭の大助',
    },
  ],
  forms: {
    oshorokoma: { form: 'sake', col: { back: '#405c4d', mid: '#839779', belly: '#e3be86' }, marks: [{ k: 'spots', n: 18, col: '#e3ddad', r: [1, 1.7], y0: 0.05, y1: 0.45 }, { k: 'spots', n: 15, col: '#d75b3e', r: [1, 1.7], y0: 0.4, y1: 0.8 }] },
    nikkouiwana: { form: 'sake', col: { back: '#515c40', mid: '#8e9670', belly: '#e2ce9b' }, marks: [{ k: 'spots', n: 28, col: '#eee9cf', r: [1, 1.7], y0: 0.05, y1: 0.6 }, { k: 'spots', n: 14, col: '#d9a34f', r: [1, 1.7], y0: 0.4, y1: 0.8 }] },
    yamatoiwana: { form: 'sake', col: { back: '#4b5140', mid: '#8c8961', belly: '#d9bd80' }, marks: [{ k: 'spots', n: 28, col: '#df963f', r: [1, 1.7], y0: 0.25, y1: 0.8 }] },
    gogi: { form: 'sake', col: { back: '#424b32', mid: '#7e8963', belly: '#ded0a2' }, marks: [{ k: 'spots', n: 34, col: '#eae5c6', r: [1, 1.7], x0: 0.02, x1: 0.96, y0: 0.02, y1: 0.7 }] },
    amemasu: { form: 'sake', col: { back: '#435c55', mid: '#91aaa0', belly: '#e8e7d8' }, marks: [{ k: 'spots', n: 34, col: '#eee9d2', r: [1.6, 2.5], y0: 0.1, y1: 0.8 }] },
    kawamasu: { form: 'sake', col: { back: '#3d503b', mid: '#80916b', belly: '#e7ad73' }, marks: [{ k: 'mushikui', col: '#c3c49a', to: 0.35 }, { k: 'spots', n: 22, col: '#d9d894', r: [1, 1.7], y0: 0.35, y1: 0.75 }, { k: 'eyespot', x: 0.48, rel: 0.6, r: 1.6, col: '#cf4c43', ring: '#b1d6de' }, { k: 'eyespot', x: 0.69, rel: 0.58, r: 1.5, col: '#cf4c43', ring: '#b1d6de' }], fin: '#c87648' },
    shinanoyukimasu: { form: 'ayu', col: { back: '#5a6d79', mid: '#bccbd0', belly: '#f0f0e7' }, stretch: 1.2 },
    isaza: { form: 'haze', col: { back: '#776952', mid: '#b6aa8b', belly: '#eee4c9' }, marks: [{ k: 'spots', n: 16, col: '#68543c', r: [0.7, 1.2], y0: 0.15, y1: 0.65 }] },
    utsusemikajika: { form: 'kajika', col: { back: '#554b38', mid: '#9c8d6d', belly: '#ded4b7' }, marks: [{ k: 'mottle', n: 12, col: '#554732', size: 5 }] },
    wanieso: { form: 'eso', col: { back: '#776e51', mid: '#b7ae8a', belly: '#e6ddc2' }, marks: [{ k: 'bands', n: 7, col: '#665d43', op: 0.4 }, { k: 'spots', n: 25, col: '#7a674a', r: [0.8, 1.4], y0: 0.05, y1: 0.4 }] },
    miyabeiwana: { form: 'sake', col: { back: '#365e53', mid: '#83a592', belly: '#dce1be' }, marks: [{ k: 'spots', n: 18, col: '#e6e2bb', r: [1, 1.7], y0: 0.05, y1: 0.4 }, { k: 'spots', n: 23, col: '#d9764b', r: [1, 1.7], y0: 0.3, y1: 0.8 }], stretch: 1.08 },
    satsukimasu: { form: 'sake', col: { back: '#4b665f', mid: '#b6c7be', belly: '#eef0e4' }, marks: [{ k: 'spots', n: 15, col: '#323d32', r: [0.8, 1.2], y0: 0.05, y1: 0.38 }, { k: 'spots', n: 6, col: '#cd7455', r: [0.8, 1.1], y0: 0.5, y1: 0.75 }] },
    reikutorauto: { form: 'sake', col: { back: '#3c5147', mid: '#7b9180', belly: '#e0ddc1' }, marks: [{ k: 'spots', n: 55, col: '#dadbb8', r: [1, 2], y0: 0.04, y1: 0.85 }], stretch: 0.9 },
    kunimasu: { form: 'sake', col: { back: '#343d3b', mid: '#737d73', belly: '#c7c9b5' } },
    ukekuchiugui: { form: 'ugui', col: { back: '#4b5a56', mid: '#9ea99c', belly: '#dedfc9' }, marks: [{ k: 'stripe', rel: 0.48, col: '#4c5140', w: 2, op: 0.45 }], stretch: 1.2 },
    juzukakehaze: { form: 'haze', col: { back: '#655b45', mid: '#a69b7d', belly: '#e1d9bc' }, marks: [{ k: 'bands', n: 8, col: '#554936', w: 3, x0: 0.2, x1: 0.95, op: 0.65 }] },
    kawabatamoroko: { form: 'ugui', col: { back: '#8b8648', mid: '#d2c56c', belly: '#eee5b5' }, stretch: 1.2 },
    ayukake: { form: 'kajika', col: { back: '#544d36', mid: '#968b67', belly: '#ddd3b1' }, marks: [{ k: 'mottle', n: 14, col: '#51462e', size: 6 }], stretch: 1.12 },
    akamemodoki: { form: 'suzuki', col: { back: '#655e4e', mid: '#a39c83', belly: '#ddd6bc' }, eye: 1.15, iris: '#bd6645' },
    isegoi: { form: 'iwashi', col: { back: '#506d70', mid: '#becfcd', belly: '#edf0e6' }, stretch: 1.18 },
    kasurihata: { form: 'hata', col: { back: '#686b59', mid: '#a6a58d', belly: '#ddd7b9' }, marks: [{ k: 'spots', n: 15, col: '#3a3c31', r: [3.5, 5.5], y0: 0.08, y1: 0.85 }], stretch: 1.1 },
    chairomaruhata: { form: 'hata', col: { back: '#757053', mid: '#b3ac86', belly: '#e3dbb7' }, marks: [{ k: 'bands', n: 5, col: '#675c3f', op: 0.2 }, { k: 'spots', n: 65, col: '#ac713b', r: [1, 1.8], y0: 0.03, y1: 0.9 }] },
    barahata: { form: 'hata', col: { back: '#914e49', mid: '#d08167', belly: '#ebc29a' }, marks: [{ k: 'spots', n: 60, col: '#edb1b2', r: [0.7, 1.2], y0: 0.03, y1: 0.92 }], stretch: 1.12, fin: '#d3ad53' },
    kitsunefuefuki: { form: 'tai', col: { back: '#697956', mid: '#a8b58b', belly: '#e4dfbc' }, stretch: 0.85 },
    ishifuedai: { form: 'suzuki', col: { back: '#334c66', mid: '#738eaa', belly: '#cbd4ce' }, stretch: 0.85 },
    ooguchiishichibiki: { form: 'suzuki', col: { back: '#975e66', mid: '#cf9897', belly: '#ecd6c3' }, stretch: 0.9 },
    sujinamemongara: { form: 'kawahagi', col: { back: '#827664', mid: '#b7aa8b', belly: '#e3d6b9' }, marks: [{ k: 'stripe', rel: 0.14, col: '#6d5948', w: 1.2, op: 0.7 }, { k: 'stripe', rel: 0.24, col: '#6d5948', w: 1.2, op: 0.7 }, { k: 'stripe', rel: 0.34, col: '#6d5948', w: 1.2, op: 0.7 }, { k: 'stripe', rel: 0.44, col: '#6d5948', w: 1.2, op: 0.7 }], stretch: 0.9 },
    tetsugyo: { form: 'funa', col: { back: '#514c3e', mid: '#a18b63', belly: '#daceab' }, stretch: 1.05 },
    kokuchibasu: { form: 'suzuki', col: { back: '#555838', mid: '#97925b', belly: '#ded4a5' }, marks: [{ k: 'bands', n: 9, col: '#544a2e', w: 3, op: 0.45 }], stretch: 1.1 },
    iwame: { form: 'sake', col: { back: '#667158', mid: '#b3b99a', belly: '#eee6cb' } },
    oonibe: { form: 'ishimochi', col: { back: '#586567', mid: '#a8b3ae', belly: '#e4e7d8' }, marks: [{ k: 'spots', n: 40, col: '#68746d', r: [0.6, 1], y0: 0.08, y1: 0.5 }], stretch: 0.88 },
    tamakai: { form: 'hata', col: { back: '#505449', mid: '#8e9480', belly: '#c8c9a9' }, marks: [{ k: 'mottle', n: 22, col: '#4c5143', size: 8, op: 0.8 }], stretch: 1.25 },
    yaitohata: { form: 'hata', col: { back: '#6f7058', mid: '#a8a387', belly: '#dfd8b8' }, marks: [{ k: 'spots', n: 80, col: '#34382b', r: [0.8, 1.5], y0: 0.02, y1: 0.95 }, { k: 'spots', n: 20, col: '#e2dbc2', r: [1.3, 2.2], y0: 0.3, y1: 0.95 }], stretch: 1.15 },
    ookuchiishinagi: { form: 'hata', col: { back: '#4f5148', mid: '#8d8e7b', belly: '#cfceba' }, stretch: 1.15 },
    aouo: { form: 'ugui', col: { back: '#283f42', mid: '#647a78', belly: '#c3cdc3' }, stretch: 1.1 },
    oomejirozame: { form: 'same' },
    takitarou: { form: 'itou', col: { back: '#34443b', mid: '#74816c', belly: '#c6c9a3' }, marks: [{ k: 'spots', n: 32, col: '#b9bca0', r: [1.4, 2.2], y0: 0.1, y1: 0.75 }], stretch: 1.2 },
    namitarou: { form: 'koi', col: { back: '#554a37', mid: '#958464', belly: '#d1c09a' }, stretch: 1.2 },
    iwanabouzu: { form: 'itou', col: { back: '#343c2a', mid: '#6b7651', belly: '#d1bb83' }, marks: [{ k: 'spots', n: 32, col: '#d7d0a1', r: [1.2, 2], y0: 0.05, y1: 0.7 }], stretch: 1.1 },
    sakenooosuke: { form: 'sake', col: { back: '#394d48', mid: '#7c8a75', belly: '#dad6af' }, marks: [{ k: 'bands', n: 7, col: '#834f56', w: 6, op: 0.6 }, { k: 'spots', n: 18, col: '#293d32', r: [0.8, 1.4], y0: 0.03, y1: 0.35 }], stretch: 1.2 },
  },
};
