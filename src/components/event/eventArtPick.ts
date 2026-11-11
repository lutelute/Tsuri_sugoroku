// 札の絵係: 札の内容から、札の上半分に入れる絵柄を決める（純粋関数）。
// まず札の id で決め（内容に合わせた絵）、無ければ効果の種類（effect.kind）で決める。
// どの札にも必ず絵が付くことを eventArtPick.test.ts で確かめている。
import type { EventCard } from '../../game/types';
import type { CityEventCard } from '../../game/city';

/** 絵柄の種類 */
export type EventArtKind =
  | 'coins'      // お金が入る（宝箱と小判）
  | 'wallet'     // お金を失う（がま口から小判が飛ぶ）
  | 'gift'       // 道具が良くなる（桐箱の贈り物）
  | 'rod_break'  // 竿が折れる
  | 'reel_soak'  // リールが波をかぶる
  | 'lure_lost'  // ルアーが根がかり・糸切れ
  | 'fish'       // 魚をもらう（跳ねる魚）
  | 'tairyo'     // 大漁（大漁旗と魚の山）
  | 'power'      // 釣りの点が増える（大漁祈願の絵馬）
  | 'storm'      // 嵐・台風・大雨
  | 'sky'        // 晴れ・夕焼け・虹・満月
  | 'bird'       // カラス・カモメ
  | 'monkey'     // 猿
  | 'bear'       // 熊
  | 'boar'       // イノシシ
  | 'dolphin'    // イルカ
  | 'turtle'     // ウミガメ
  | 'travel'     // 進む・戻る（船）
  | 'rest'       // 休み（ふとん）
  | 'dice'       // もう一度サイコロ
  | 'onsen'      // 温泉
  | 'shrine'     // 神社（鳥居）
  | 'lottery'    // 福引き・宝くじ
  // ここから下はまちづくりの出来事
  | 'namazu'     // 地震の大鯰
  | 'squid'      // 大王イカ
  | 'fire'       // 火事
  | 'market'     // 景気（好景気・不景気の商店街）
  | 'house'      // 家・公園が建つ
  | 'election';  // 選挙

export const EVENT_ART_KINDS: EventArtKind[] = [
  'coins', 'wallet', 'gift', 'rod_break', 'reel_soak', 'lure_lost', 'fish', 'tairyo', 'power', 'storm', 'sky',
  'bird', 'monkey', 'bear', 'boar', 'dolphin', 'turtle', 'travel', 'rest', 'dice', 'onsen', 'shrine', 'lottery',
  'namazu', 'squid', 'fire', 'market', 'house', 'election',
];

/** 絵柄と、その中の描き分け */
export interface EventArtSpec {
  kind: EventArtKind;
  /** 描き分け（道具の種類・魚のめずらしさ・空の様子・鳥の種類・船の向き など） */
  variant?: string;
}

const spec = (kind: EventArtKind, variant?: string): EventArtSpec => ({ kind, variant });

/** 釣り旅の札: id ごとの絵柄（内容に合わせて、効果の種類より優先する） */
const FISHING_BY_ID: Record<string, EventArtSpec> = {
  // 天気
  storm: spec('storm', 'thunder'),
  typhoon: spec('storm', 'typhoon'),
  rain_day: spec('storm', 'rain'),
  wave_splash: spec('reel_soak'),
  sunset_bonus: spec('sky', 'sunset'),
  rainbow: spec('sky', 'rainbow'),
  full_moon_tide: spec('sky', 'moon'),
  golden_hour: spec('sky', 'sunset'),
  morning_glory: spec('sky', 'sun'),
  sunburn: spec('sky', 'sun'),
  // 動物
  theft: spec('bird', 'crow_fish'),
  crow_flock: spec('bird', 'crow'),
  seagull_attack: spec('bird', 'gull'),
  monkeys: spec('monkey'),
  bear_scare: spec('bear'),
  wild_boar: spec('boar'),
  dolphin_guide: spec('dolphin'),
  sea_turtle: spec('turtle'),
  // 湯・神社・くじ
  onsen_heal: spec('onsen'),
  hot_spring: spec('onsen'),
  volcanic_spring: spec('onsen'),
  shrine_prayer: spec('shrine'),
  fishing_god: spec('shrine'),
  ryujin_blessing: spec('shrine'),
  lottery: spec('lottery'),
  // 移動
  fog: spec('travel', 'fog'),
  drifting: spec('travel', 'back'),
  strong_current: spec('travel', 'back'),
  fishing_boat_ride: spec('travel', 'forward'),
};

/** 釣り旅の札の絵柄 */
export function eventArtFor(card: Pick<EventCard, 'id' | 'effect'>): EventArtSpec {
  const byId = FISHING_BY_ID[card.id];
  if (byId) return byId;
  const e = card.effect;
  switch (e.kind) {
    case 'money': return spec(e.amount >= 0 ? 'coins' : 'wallet');
    case 'move': return spec('travel', 'forward');
    case 'move_steps': return spec('travel', e.steps >= 0 ? 'forward' : 'back');
    case 'skip_turn': return spec('rest');
    case 'extra_turn': return spec('dice');
    case 'free_upgrade': return spec('gift', e.equipmentType);
    case 'fish_bonus': return spec('power');
    case 'steal_fish': return spec('bird', 'crow_fish');
    case 'random_fish': return spec('fish', e.rarity);
    case 'multi_fish': return spec('tairyo');
    case 'equipment_damage': return spec(e.equipmentType === 'rod' ? 'rod_break' : e.equipmentType === 'reel' ? 'reel_soak' : 'lure_lost');
  }
}

/** まちの出来事の絵柄 */
export function cityEventArtFor(card: Pick<CityEventCard, 'id' | 'effect'>): EventArtSpec {
  if (card.id === 'c_lottery') return spec('lottery');
  if (card.id === 'c_election') return spec('election');
  const e = card.effect;
  switch (e.kind) {
    case 'money': return spec(e.amount >= 0 ? 'coins' : 'wallet');
    case 'money_per_building': return spec(e.amount >= 0 ? 'coins' : 'wallet');
    case 'buff': return spec('market', e.buff);
    case 'disaster':
      switch (e.disaster) {
        case 'quake': return spec('namazu');
        case 'typhoon': return spec('storm', 'typhoon');
        case 'fire': return spec('fire');
        case 'kaiju': return spec('squid');
        default: return spec('storm', 'thunder');
      }
    case 'free_build': return spec('house', e.building === 'park' ? 'park' : 'house');
    case 'growth': return spec('house', 'grow');
  }
}
