import type { EventCard } from '../game/types';

export const EVENT_CARDS: EventCard[] = [
  // ===== Good Events =====
  { id: 'bonus_catch', name: '大漁祈願成就', type: 'good', description: '地元の漁師が釣りのコツを教えてくれた！次の3ターン、釣りポイント1.5倍！', effect: { kind: 'fish_bonus', multiplier: 1.5, duration: 3 } },
  { id: 'treasure', name: '宝箱発見', type: 'good', description: '海辺で宝箱を見つけた！¥2,000獲得！', effect: { kind: 'money', amount: 2000 } },
  { id: 'lucky_fish', name: '幸運の魚', type: 'good', description: '珍しい魚が飛び跳ねてきた！', effect: { kind: 'random_fish', rarity: 'rare' } },
  { id: 'wind_boost', name: '追い風', type: 'good', description: '強い追い風が吹いた！もう一度サイコロを振れる！', effect: { kind: 'extra_turn' } },
  { id: 'sponsor', name: 'スポンサー', type: 'good', description: '釣り雑誌の取材が来た！¥3,000の謝礼をもらった！', effect: { kind: 'money', amount: 3000 } },
  { id: 'free_rod', name: '竿のプレゼント', type: 'good', description: '釣具メーカーから新しいロッドをもらった！', effect: { kind: 'free_upgrade', equipmentType: 'rod' } },
  { id: 'free_reel', name: 'リールのプレゼント', type: 'good', description: '大会の景品でリールを獲得！', effect: { kind: 'free_upgrade', equipmentType: 'reel' } },
  { id: 'tip_money', name: 'おすそわけ', type: 'good', description: '釣った魚を地元の人にあげたらお礼をもらった！¥1,500獲得！', effect: { kind: 'money', amount: 1500 } },

  // ===== Bad Events =====
  { id: 'storm', name: '嵐', type: 'bad', description: '激しい嵐が来た！次のターンは休み...', effect: { kind: 'skip_turn' } },
  { id: 'broken_line', name: '糸切れ', type: 'bad', description: 'ラインが切れて修理代が...¥1,000失った', effect: { kind: 'money', amount: -1000 } },
  { id: 'theft', name: 'カラスの盗み', type: 'bad', description: 'カラスに釣った魚を盗まれた！', effect: { kind: 'steal_fish' } },
  { id: 'seasick', name: '船酔い', type: 'bad', description: '船酔いで動けない...次のターンは休み', effect: { kind: 'skip_turn' } },
  { id: 'fine', name: '駐車違反', type: 'bad', description: '駐車場で違反切符を切られた...¥1,500失った', effect: { kind: 'money', amount: -1500 } },
  { id: 'jellyfish', name: 'クラゲ大量発生', type: 'bad', description: 'クラゲが大量発生！¥800の治療費...', effect: { kind: 'money', amount: -800 } },
  { id: 'rod_snap', name: '竿が折れた！', type: 'bad', description: '岩場で足を滑らせ、竿を地面に叩きつけてしまった！', effect: { kind: 'equipment_damage', equipmentType: 'rod', amount: 100 } },
  { id: 'reel_rust', name: 'リール浸水', type: 'bad', description: '突然の高波でリールが水没！耐久度が大幅ダウン...', effect: { kind: 'equipment_damage', equipmentType: 'reel', amount: 60 } },
  { id: 'lure_lost', name: 'ルアー損傷', type: 'bad', description: '根がかりでルアーが大きく傷ついた！', effect: { kind: 'equipment_damage', equipmentType: 'lure', amount: 50 } },

  // ===== Random Events =====
  { id: 'lottery', name: '福引き', type: 'random', description: '地元の商店街で福引きを引いた！何が当たるかな...', effect: { kind: 'money', amount: 2500 } },
  { id: 'shortcut', name: '地元民の案内', type: 'random', description: '地元の漁師が近道を教えてくれた！3マス進む！', effect: { kind: 'move_steps', steps: 3 } },
  { id: 'mysterious_lure', name: '謎のルアー', type: 'random', description: '浜辺で光るルアーを拾った！', effect: { kind: 'free_upgrade', equipmentType: 'lure' } },
  { id: 'drifting', name: '潮の流れ', type: 'random', description: '潮の流れに乗って思わぬ場所へ...2マス戻る', effect: { kind: 'move_steps', steps: -2 } },
  { id: 'festival', name: '地元の祭り', type: 'random', description: 'お祭りで散財してしまった...¥500失った', effect: { kind: 'money', amount: -500 } },
  { id: 'rare_catch', name: '不思議な気配', type: 'random', description: '水面が不思議に光っている...珍しい魚が釣れるかも！', effect: { kind: 'random_fish', rarity: 'uncommon' } },
];

export function getRandomEventCard(type?: string): EventCard {
  const pool = type ? EVENT_CARDS.filter(e => e.type === type) : EVENT_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
