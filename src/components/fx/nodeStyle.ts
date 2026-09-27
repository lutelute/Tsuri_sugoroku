import type { NodeType } from '../../game/types';

export type StampTone = 'shu' | 'kin' | 'ai' | 'sumi';

/** マス種別ごとの判子（地図の漢字記号と揃える）と呼び名 */
export const NODE_STAMP: Record<NodeType, { glyph: string; tone: StampTone; label: string }> = {
  start: { glyph: '発', tone: 'shu', label: 'スタート' },
  goal: { glyph: '終', tone: 'shu', label: 'ゴール' },
  fishing: { glyph: '釣', tone: 'ai', label: '釣り場' },
  fishing_special: { glyph: '名', tone: 'kin', label: '名釣り場' },
  shop: { glyph: '店', tone: 'kin', label: '釣具店' },
  event_good: { glyph: '吉', tone: 'shu', label: '吉のマス' },
  event_bad: { glyph: '凶', tone: 'sumi', label: '凶のマス' },
  event_random: { glyph: '籤', tone: 'ai', label: 'くじのマス' },
  rest: { glyph: '湯', tone: 'ai', label: '温泉' },
  route: { glyph: '道', tone: 'sumi', label: '街道' },
  capital: { glyph: '祭', tone: 'shu', label: '祭りの町' },
};

/** 順位の呼び名（一着・二着…） */
export function finishLabel(order: number): string {
  const kanji = ['一', '二', '三', '四', '五', '六', '七', '八'];
  return `${kanji[order] ?? String(order + 1)}着`;
}
