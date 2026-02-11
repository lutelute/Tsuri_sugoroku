import type { Equipment } from '../game/types';

export const EQUIPMENT_DATA: Equipment[] = [
  // ロッド (rod)
  { type: 'rod', level: 1, name: '竹竿', cost: 0, description: '初心者向けの基本的な竿', effect: 'ストライクゾーン: 標準' },
  { type: 'rod', level: 2, name: 'グラスロッド', cost: 1500, description: 'しなやかで使いやすい', effect: 'ストライクゾーン +5%' },
  { type: 'rod', level: 3, name: 'カーボンロッド', cost: 4000, description: '軽量で感度が高い', effect: 'ストライクゾーン +10%' },
  { type: 'rod', level: 4, name: '競技ロッド', cost: 8000, description: 'トーナメント仕様', effect: 'ストライクゾーン +15%' },
  { type: 'rod', level: 5, name: '名匠ロッド', cost: 15000, description: '伝説の竿師が作った逸品', effect: 'ストライクゾーン +20%' },

  // リール (reel)
  { type: 'reel', level: 1, name: '基本リール', cost: 0, description: 'シンプルなリール', effect: 'リーリング速度: 標準' },
  { type: 'reel', level: 2, name: 'スピニングリール', cost: 1200, description: '汎用性の高いリール', effect: 'タップ効果 +2' },
  { type: 'reel', level: 3, name: 'ベイトリール', cost: 3500, description: '精度の高いキャスティング', effect: 'タップ効果 +4' },
  { type: 'reel', level: 4, name: '電動リール', cost: 7500, description: '深海でも楽々', effect: 'タップ効果 +6' },
  { type: 'reel', level: 5, name: '伝説のリール', cost: 14000, description: '海神が愛用したリール', effect: 'タップ効果 +8' },

  // ルアー (lure)
  { type: 'lure', level: 1, name: 'ミミズ', cost: 0, description: '基本的なエサ', effect: '当たり速度: 標準' },
  { type: 'lure', level: 2, name: 'スプーン', cost: 800, description: '光で魚を誘う', effect: '当たり速度 +15%, レア率 +5%' },
  { type: 'lure', level: 3, name: 'ミノー', cost: 2500, description: '小魚を模したルアー', effect: '当たり速度 +25%, レア率 +10%' },
  { type: 'lure', level: 4, name: 'ソフトベイトPro', cost: 6000, description: 'リアルな動きで誘う', effect: '当たり速度 +35%, レア率 +20%' },
  { type: 'lure', level: 5, name: '黄金ルアー', cost: 12000, description: '伝説の魚も食いつく', effect: '当たり速度 +50%, レア率 +35%' },
];

export function getEquipment(type: string, level: number): Equipment | undefined {
  return EQUIPMENT_DATA.find(e => e.type === type && e.level === level);
}
