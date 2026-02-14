import type { EventCard } from '../game/types';

export const EVENT_CARDS: EventCard[] = [
  // ===== Good Events (15枚) =====
  { id: 'bonus_catch', name: '大漁祈願成就', type: 'good', description: '地元の漁師が釣りのコツを教えてくれた！次の3ターン、釣りポイント1.5倍！', effect: { kind: 'fish_bonus', multiplier: 1.5, duration: 3 } },
  { id: 'treasure', name: '宝箱発見', type: 'good', description: '海辺で宝箱を見つけた！¥2,000獲得！', effect: { kind: 'money', amount: 2000 } },
  { id: 'lucky_fish', name: '幸運の魚', type: 'good', description: '珍しい魚が飛び跳ねてきた！', effect: { kind: 'random_fish', rarity: 'rare' } },
  { id: 'wind_boost', name: '追い風', type: 'good', description: '強い追い風が吹いた！もう一度サイコロを振れる！', effect: { kind: 'extra_turn' } },
  { id: 'sponsor', name: 'スポンサー', type: 'good', description: '釣り雑誌の取材が来た！¥3,000の謝礼をもらった！', effect: { kind: 'money', amount: 3000 } },
  { id: 'free_rod', name: '竿のプレゼント', type: 'good', description: '釣具メーカーから新しいロッドをもらった！', effect: { kind: 'free_upgrade', equipmentType: 'rod' } },
  { id: 'free_reel', name: 'リールのプレゼント', type: 'good', description: '大会の景品でリールを獲得！', effect: { kind: 'free_upgrade', equipmentType: 'reel' } },
  { id: 'tip_money', name: 'おすそわけ', type: 'good', description: '釣った魚を地元の人にあげたらお礼をもらった！¥1,500獲得！', effect: { kind: 'money', amount: 1500 } },
  { id: 'tv_feature', name: 'テレビ出演', type: 'good', description: '釣り番組のロケに遭遇！出演料¥4,000獲得！', effect: { kind: 'money', amount: 4000 } },
  { id: 'fish_migration', name: '魚群到来', type: 'good', description: '大規模な魚群が回遊してきた！次の3ターン、釣りポイント2倍！', effect: { kind: 'fish_bonus', multiplier: 2, duration: 3 } },
  { id: 'legendary_lure', name: '伝説のルアー', type: 'good', description: '古い釣具屋で伝説のルアーを発見！', effect: { kind: 'free_upgrade', equipmentType: 'lure' } },
  { id: 'onsen_heal', name: '温泉パワー', type: 'good', description: '温泉に入ったら不思議な力が湧いてきた！もう一度サイコロを振れる！', effect: { kind: 'extra_turn' } },
  { id: 'local_guide', name: '地元ガイド', type: 'good', description: 'ベテラン漁師がポイントまで案内してくれた！3マス進む！', effect: { kind: 'move_steps', steps: 3 } },
  { id: 'bounty_fish', name: '懸賞金の魚', type: 'good', description: 'タグ付きの調査対象魚を発見！懸賞金¥2,500獲得！', effect: { kind: 'money', amount: 2500 } },
  { id: 'ancient_rod', name: '名匠の竿', type: 'good', description: '蔵から名匠が作った竿が見つかった！', effect: { kind: 'free_upgrade', equipmentType: 'rod' } },

  // ===== Bad Events (18枚) =====
  { id: 'storm', name: '嵐', type: 'bad', description: '激しい嵐が来た！次のターンは休み...', effect: { kind: 'skip_turn' } },
  { id: 'broken_line', name: '糸切れ', type: 'bad', description: 'ラインが切れて修理代が...¥1,000失った', effect: { kind: 'money', amount: -1000 } },
  { id: 'theft', name: 'カラスの盗み', type: 'bad', description: 'カラスに釣った魚を盗まれた！', effect: { kind: 'steal_fish' } },
  { id: 'seasick', name: '船酔い', type: 'bad', description: '船酔いで動けない...次のターンは休み', effect: { kind: 'skip_turn' } },
  { id: 'fine', name: '駐車違反', type: 'bad', description: '駐車場で違反切符を切られた...¥1,500失った', effect: { kind: 'money', amount: -1500 } },
  { id: 'jellyfish', name: 'クラゲ大量発生', type: 'bad', description: 'クラゲが大量発生！¥800の治療費...', effect: { kind: 'money', amount: -800 } },
  { id: 'rod_snap', name: '竿が折れた！', type: 'bad', description: '岩場で足を滑らせ、竿を地面に叩きつけてしまった！', effect: { kind: 'equipment_damage', equipmentType: 'rod', amount: 100 } },
  { id: 'reel_rust', name: 'リール浸水', type: 'bad', description: '突然の高波でリールが水没！耐久度が大幅ダウン...', effect: { kind: 'equipment_damage', equipmentType: 'reel', amount: 60 } },
  { id: 'lure_lost', name: 'ルアー損傷', type: 'bad', description: '根がかりでルアーが大きく傷ついた！', effect: { kind: 'equipment_damage', equipmentType: 'lure', amount: 50 } },
  { id: 'rod_crack', name: '竿にヒビ', type: 'bad', description: '大物とのファイトで竿にヒビが入った...', effect: { kind: 'equipment_damage', equipmentType: 'rod', amount: 40 } },
  { id: 'reel_jam', name: 'リール故障', type: 'bad', description: '砂がリールに入り込んで動きが悪い...', effect: { kind: 'equipment_damage', equipmentType: 'reel', amount: 45 } },
  { id: 'lure_crack', name: 'ルアー破損', type: 'bad', description: '岩にぶつけてルアーが割れてしまった...', effect: { kind: 'equipment_damage', equipmentType: 'lure', amount: 100 } },
  { id: 'typhoon', name: '台風接近', type: 'bad', description: '台風が接近中！避難で次のターンは休み...', effect: { kind: 'skip_turn' } },
  { id: 'sunburn', name: '日焼け', type: 'bad', description: '炎天下で日焼けしすぎた...¥600の薬代', effect: { kind: 'money', amount: -600 } },
  { id: 'tackle_thief', name: '道具泥棒', type: 'bad', description: '目を離した隙に道具が盗まれた！¥2,000の損失...', effect: { kind: 'money', amount: -2000 } },
  { id: 'boat_trouble', name: 'ボート故障', type: 'bad', description: 'エンジントラブルで修理費¥1,200...', effect: { kind: 'money', amount: -1200 } },
  { id: 'seagull_attack', name: 'カモメの襲撃', type: 'bad', description: 'カモメに餌を奪われてルアーも傷ついた！', effect: { kind: 'equipment_damage', equipmentType: 'lure', amount: 35 } },
  { id: 'slippery_rocks', name: '滑る岩場', type: 'bad', description: '岩場で滑って竿をぶつけた！', effect: { kind: 'equipment_damage', equipmentType: 'rod', amount: 30 } },

  // ===== Random Events (27枚) =====
  { id: 'lottery', name: '福引き', type: 'random', description: '地元の商店街で福引きを引いた！何が当たるかな...', effect: { kind: 'money', amount: 2500 } },
  { id: 'shortcut', name: '地元民の案内', type: 'random', description: '地元の漁師が近道を教えてくれた！3マス進む！', effect: { kind: 'move_steps', steps: 3 } },
  { id: 'mysterious_lure', name: '謎のルアー', type: 'random', description: '浜辺で光るルアーを拾った！', effect: { kind: 'free_upgrade', equipmentType: 'lure' } },
  { id: 'drifting', name: '潮の流れ', type: 'random', description: '潮の流れに乗って思わぬ場所へ...2マス戻る', effect: { kind: 'move_steps', steps: -2 } },
  { id: 'festival', name: '地元の祭り', type: 'random', description: 'お祭りで散財してしまった...¥500失った', effect: { kind: 'money', amount: -500 } },
  { id: 'rare_catch', name: '不思議な気配', type: 'random', description: '水面が不思議に光っている...珍しい魚が釣れるかも！', effect: { kind: 'random_fish', rarity: 'uncommon' } },
  { id: 'monkeys', name: '猿の悪戯', type: 'random', description: '猿が道具をいじってルアーを壊した！', effect: { kind: 'equipment_damage', equipmentType: 'lure', amount: 70 } },
  { id: 'bear_scare', name: '熊出没注意', type: 'random', description: '熊に驚いて荷物を落とした！竿が傷ついた...', effect: { kind: 'equipment_damage', equipmentType: 'rod', amount: 50 } },
  { id: 'hot_spring', name: '秘湯発見', type: 'random', description: '山奥で秘湯を発見！疲れが取れてもう一度サイコロを振れる！', effect: { kind: 'extra_turn' } },
  { id: 'fishing_derby', name: '釣り大会', type: 'random', description: '地元の釣り大会に飛び入り参加！入賞して¥3,000獲得！', effect: { kind: 'money', amount: 3000 } },
  { id: 'old_fisherman', name: '老漁師の教え', type: 'random', description: '老漁師が秘伝の技を教えてくれた！次の2ターン、釣りポイント1.5倍！', effect: { kind: 'fish_bonus', multiplier: 1.5, duration: 2 } },
  { id: 'strong_current', name: '急流', type: 'random', description: '川の急流に流されて3マス戻る...', effect: { kind: 'move_steps', steps: -3 } },
  { id: 'shrine_prayer', name: '神社参拝', type: 'random', description: '釣りの安全を祈願！お賽銭¥300...でも御利益がありそう！', effect: { kind: 'money', amount: -300 } },
  { id: 'dolphin_guide', name: 'イルカの導き', type: 'random', description: 'イルカが魚群のポイントを教えてくれた！4マス進む！', effect: { kind: 'move_steps', steps: 4 } },
  { id: 'rain_day', name: '大雨', type: 'random', description: '大雨で川が増水...でも魚の活性は上がった！', effect: { kind: 'fish_bonus', multiplier: 1.3, duration: 2 } },
  { id: 'antique_reel', name: '骨董リール', type: 'random', description: '骨董品屋で年代物のリールを発見！', effect: { kind: 'free_upgrade', equipmentType: 'reel' } },
  { id: 'lost_wallet', name: '財布を落とした', type: 'random', description: '釣りに夢中で財布を落とした...¥1,000失った', effect: { kind: 'money', amount: -1000 } },
  { id: 'celebrity_meet', name: '有名人遭遇', type: 'random', description: '有名釣りYouTuberに遭遇！コラボ動画で¥2,000獲得！', effect: { kind: 'money', amount: 2000 } },
  { id: 'mysterious_fish', name: '謎の魚影', type: 'random', description: '巨大な魚影が水面下を横切った...レアな魚が出現！', effect: { kind: 'random_fish', rarity: 'rare' } },
  { id: 'sea_turtle', name: 'ウミガメ遭遇', type: 'random', description: 'ウミガメに出会った！幸運の印...もう一度サイコロを振れる！', effect: { kind: 'extra_turn' } },
  { id: 'sunset_bonus', name: '夕焼け小焼け', type: 'random', description: '美しい夕焼けに癒された。明日もいい日になりそう！¥800獲得', effect: { kind: 'money', amount: 800 } },
  { id: 'crab_trap', name: 'カニ罠', type: 'random', description: '仕掛けておいたカニ罠にカニが入っていた！', effect: { kind: 'random_fish', rarity: 'uncommon' } },
  { id: 'fog', name: '霧発生', type: 'random', description: '濃い霧で視界ゼロ...方向を見失って2マス戻る', effect: { kind: 'move_steps', steps: -2 } },
  { id: 'local_delicacy', name: '名物グルメ', type: 'random', description: '地元の名物を食べて元気百倍！でも食費が¥700...', effect: { kind: 'money', amount: -700 } },
  { id: 'treasure_map', name: '宝の地図', type: 'random', description: '瓶に入った宝の地図を拾った！指示通りに進むと¥1,800発見！', effect: { kind: 'money', amount: 1800 } },
  { id: 'wild_boar', name: 'イノシシ出没', type: 'random', description: 'イノシシに追いかけられて道具を落とした！リールが傷ついた...', effect: { kind: 'equipment_damage', equipmentType: 'reel', amount: 40 } },
  { id: 'rainbow', name: '虹が出た', type: 'random', description: '雨上がりの虹が出た！幸運の兆し...レジェンダリー級の魚が出現！', effect: { kind: 'random_fish', rarity: 'legendary' } },
];

export function getRandomEventCard(type?: string): EventCard {
  const pool = type ? EVENT_CARDS.filter(e => e.type === type) : EVENT_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
