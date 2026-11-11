// CPU の人物（創作）。性格ごとに名前・印の一文字・場面ごとのせりふを持つ。
// せりふは今あるお知らせの本文の頭に足す（お知らせの件数は増やさない）。1場面2つ、1行24字まで。
// 漢字はふりがな辞書（furigana.ts）で読める語だけを使う（cpuPersonas.test.ts が確かめる）。
import type { CpuStyle } from '../game/cpuAI';

export interface CpuPersona {
  id: string;
  style: CpuStyle;
  /** 名前（お知らせの見出し・下の帯・結果に出る） */
  name: string;
  /** 印の一文字（思案中の札に出す） */
  mark: string;
  /** 肩書き */
  role: string;
}

/**
 * 性格ごとの人物。先頭が1人目。同じ性格の CPU が2人いるときは、2人目に次の名前を付ける
 * （今は4人までなので CPU は性格ごとに1人だが、席が増えても名前が重ならないように用意してある）。
 * 2人目もせりふは同じ（口ぶりは性格で決まる）。せりふに自分の名前は入れない。
 */
export const CPU_PERSONAS: Record<CpuStyle, CpuPersona[]> = {
  steady: [
    { id: 'omatsu', style: 'steady', name: 'お松', mark: '松', role: '宿屋のおかみ' },
    { id: 'oume', style: 'steady', name: 'お梅', mark: '梅', role: '茶屋のおかみ' },
  ],
  monopoly: [
    { id: 'gonzo', style: 'monopoly', name: '権蔵', mark: '権', role: '廻船問屋の旦那' },
    { id: 'tokubei', style: 'monopoly', name: '徳兵衛', mark: '徳', role: '米問屋の旦那' },
  ],
  racer: [
    { id: 'hayata', style: 'racer', name: '早太', mark: '早', role: '飛脚' },
    { id: 'tobisuke', style: 'racer', name: '飛助', mark: '飛', role: '早飛脚' },
  ],
};

/** その性格の nth 人目（0 始まり）の人物。用意した人数を超えたら、名前に番号を足す */
export function cpuPersonaFor(style: CpuStyle, nth = 0): CpuPersona {
  const list = CPU_PERSONAS[style];
  const base = list[nth % list.length];
  const round = Math.floor(nth / list.length);
  return round === 0 ? base : { ...base, id: `${base.id}${round + 1}`, name: `${base.name}${round + 1}` };
}

interface PlayerLike {
  isCpu?: boolean;
  cpuStyle?: CpuStyle;
  name: string;
}

/** プレイヤーの人物（CPU でなければ null）。名前が一致する人物、無ければその性格の1人目 */
export function personaOf(player: PlayerLike | undefined | null): CpuPersona | null {
  if (!player?.isCpu || !player.cpuStyle) return null;
  const list = CPU_PERSONAS[player.cpuStyle];
  return list.find(p => p.name === player.name) ?? list[0];
}

/** せりふの場面 */
export type CpuScene =
  | 'build' | 'upgrade' | 'acquire' | 'acquired' | 'monopoly'
  | 'destination' | 'destination_lost' | 'binbo_come' | 'binbo_pass' | 'disaster'
  | 'year_top' | 'year_last' | 'big_fish' | 'quest';

export const CPU_SCENES: CpuScene[] = [
  'build', 'upgrade', 'acquire', 'acquired', 'monopoly',
  'destination', 'destination_lost', 'binbo_come', 'binbo_pass', 'disaster',
  'year_top', 'year_last', 'big_fish', 'quest',
];

/** せりふの長さの上限（瓦版の本文の頭に足しても2行に収まる長さ） */
export const CPU_LINE_MAX = 24;

type Lines = Record<CpuScene, readonly [string, string]>;

export const CPU_LINES: Record<CpuStyle, Lines> = {
  // 宿屋のおかみ: こつこつ・やりくり上手。おっとりした口ぶり
  steady: {
    build: ['こつこつ建てるのが一番だよ。', 'いい町になっとくれよ。'],
    upgrade: ['手をかければ町は育つよ。', 'もうひとまわり大きくしようかね。'],
    acquire: ['ゆずってもらうよ、悪いねえ。', '大切に使わせてもらうよ。'],
    acquired: ['おやまあ、持っていかれたよ。', 'しかたないね、また建てるよ。'],
    monopoly: ['この町はまるごとお得意さまだよ。', '町じゅうがうちのお客さんだねえ。'],
    destination: ['おやまあ、一番乗りだよ。', 'のんびり歩いても着くもんだねえ。'],
    destination_lost: ['あらあら、足の速いこと。', 'ひと足おそかったねえ。'],
    binbo_come: ['貧乏神さん、お茶だけにしとくれ。', 'いやだよ、お財布が泣いちまう。'],
    binbo_pass: ['貧乏神さん、あちらへどうぞ。', 'お見送りできて、ほっとしたよ。'],
    disaster: ['あれまあ、建て直しだねえ。', 'みんな無事なら、それでいいよ。'],
    year_top: ['こつこつが実ったねえ。', 'ことしもおかげさまだよ。'],
    year_last: ['来年はしっかりかせぐよ。', 'お財布のひもをしめなくちゃ。'],
    big_fish: ['今夜のおぜんはごちそうだよ。', 'おやまあ、りっぱな魚だこと。'],
    quest: ['やることはきっちり果たしたよ。', 'やくそくは守るのが宿屋だよ。'],
  },
  // 廻船問屋の旦那: 欲ばりで強気。「〜じゃ」「がっはっは」
  monopoly: {
    build: ['ここもわしのなわばりじゃ。', 'がっはっは、また建物がふえたぞ。'],
    upgrade: ['もっと大きく、もっとりっぱにじゃ。', '建物は大きいほどよいのじゃ。'],
    acquire: ['その建物、わしがもらった。', 'お金ならある。ゆずってもらおう。'],
    acquired: ['おのれ、おぼえておれよ。', 'わしの建物を…高くつくぞ。'],
    monopoly: ['がっはっは、町ごとわしのものじゃ。', 'これで商いは思いのままじゃ。'],
    destination: ['一番乗りもお金になるのう。', '賞金はありがたくいただくぞ。'],
    destination_lost: ['ふん、賞金くらいくれてやる。', 'ちっ、足の速いやつめ。'],
    binbo_come: ['ええい、よるな貧乏神め。', 'わしのお金にさわるでない。'],
    binbo_pass: ['がっはっは、そっちへ行け。', '貧乏神はよそへおしつけるものじゃ。'],
    disaster: ['わしの建物が…大損じゃ。', 'ええい、すぐ建て直すぞ。'],
    year_top: ['がっはっは、ことしもわしが一番じゃ。', 'とうぜんの結果じゃな。'],
    year_last: ['ぐぬぬ…来年は見ておれ。', '何かのまちがいじゃ、これは。'],
    big_fish: ['大物じゃ。高く売れるぞ。', 'この魚、いくらになるかのう。'],
    quest: ['これも商いのうちじゃ。', 'ごほうびはしっかりもらうぞ。'],
  },
  // 飛脚: 足が自慢でせっかち。「〜でさあ」「へい」
  racer: {
    build: ['へい、ひとっぱしりで建てやした。', 'しごとは早いのが一番でさあ。'],
    upgrade: ['さっと直して、ぱっとりっぱに。', 'ぐずぐずしないのが自慢でさあ。'],
    acquire: ['おさきにいただきやす。', '早いもの勝ちでさあ。'],
    acquired: ['あっ、持っていかれた。', '速さじゃ負けねえのに…。'],
    monopoly: ['へへっ、町ごといただきやした。', 'この町はおいらのなわばりだ。'],
    destination: ['へい、一番乗り！', '足には自信があるんでさあ。'],
    destination_lost: ['ちくしょう、ひと足おそかった。', '次はおいらが一番乗りだ。'],
    binbo_come: ['うわっ、ついてくるなって。', 'おもいにもつをしょっちまった。'],
    binbo_pass: ['へへっ、おいてきやした。', 'にもつはかるいほうがいいでさあ。'],
    disaster: ['うわあ、やられちまった。', 'ひとっぱしりで建て直しでさあ。'],
    year_top: ['へへっ、一番でかけぬけやした。', '速さがとりえでさあ。'],
    year_last: ['来年は倍の速さで走りやす。', 'ちょいとみちくさがすぎやした。'],
    big_fish: ['でっかい！走ってとどけやす。', 'こいつははこぶのが大変だ。'],
    quest: ['へい、ひとっぱしりで果たしやした。', 'へい、おやすいごようで。'],
  },
};

/**
 * 場面のせりふ（CPU でなければ null）。2つのうちどちらを言うかは seed の偶奇で決める
 * （乱数は使わない。巡の数や工事の回数を渡すと、同じ場面でも言い回しが替わる）。
 */
export function cpuLine(player: PlayerLike | undefined | null, scene: CpuScene, seed = 0): string | null {
  if (!player?.isCpu || !player.cpuStyle) return null;
  const pair = CPU_LINES[player.cpuStyle][scene];
  return pair[Math.abs(Math.trunc(seed)) % 2];
}

/** お知らせの本文の頭にせりふを足す（CPU でなければ本文のまま）。件数は増えない */
export function withCpuLine(player: PlayerLike | undefined | null, scene: CpuScene, body: string, seed = 0): string {
  const line = cpuLine(player, scene, seed);
  return line ? `「${line}」${body}` : body;
}

/**
 * 名前つきのひとこと「権蔵「ちっ、足の速いやつめ。」」（CPU でなければ空文字）。
 * お知らせの主役ではない CPU（目的地を取られた・災害に遭った・貧乏神を押し付けた）のせりふを、本文の頭に足すのに使う。
 */
export function cpuQuote(player: PlayerLike | undefined | null, scene: CpuScene, seed = 0): string {
  const line = cpuLine(player, scene, seed);
  return line && player ? `${player.name}「${line}」` : '';
}

/** 何人かのうち、最初に見つかった CPU のひとこと（いなければ空文字）。並びは呼ぶ側で決める（近い順・被害の多い順など） */
export function firstCpuQuote(players: readonly (PlayerLike | undefined | null)[], scene: CpuScene, seed = 0): string {
  for (const p of players) {
    const q = cpuQuote(p, scene, seed);
    if (q) return q;
  }
  return '';
}

/**
 * 災害に遭った CPU のひとこと（被害の多い人から探す。CPU に被害が無ければ空文字）。
 * owners は被害1件ごとの持ち主の席（CityDamage.owner）。決算の見出しや出来事の結果の文の頭に足す。
 */
export function disasterQuote(players: readonly (PlayerLike | undefined | null)[], owners: readonly number[], seed = 0): string {
  const count = new Map<number, number>();
  for (const o of owners) count.set(o, (count.get(o) ?? 0) + 1);
  const order = [...count.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).map(([i]) => players[i]);
  return firstCpuQuote(order, 'disaster', seed);
}

const ALL_LINES: ReadonlySet<string> = new Set(Object.values(CPU_LINES).flatMap(scenes => Object.values(scenes).flat()));

/**
 * 本文の頭に付いたせりふ（withCpuLine・cpuQuote が足したもの）を切り分ける。
 * head は「…」まで（名前つきなら名前も含む）、text は残り。せりふでない「…」（お題の文など）は切らない。
 * お知らせをつなぐとき、せりふ付きの文とせりふ無しの同じ文を「同じ文」と見るために使う（tempo.mergeNoticeBody）。
 */
export function splitCpuLine(body: string): { head: string; text: string } {
  const m = body.match(/^([^「」／]{0,12})「([^「」]+)」/);
  if (!m || !ALL_LINES.has(m[2])) return { head: '', text: body };
  return { head: m[0], text: body.slice(m[0].length) };
}
