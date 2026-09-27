// ミニゲームの説明・失敗理由の文言（UI 共通）。テキストは <Ruby> で包んで表示する前提。
import type { FishRarity, FishingMiniGame } from '../../game/types';

export type FailReason =
  | 'early'    // 合わせが早すぎ
  | 'late'     // 合わせが遅すぎ
  | 'missed'   // 当たりを見逃した
  | 'snap'     // 糸が切れた
  | 'timeout'  // 時間切れ
  | 'foul'     // 早押しの失敗が重なった / ラウンド切れ
  | 'short';   // 進捗が足りなかった

export const MINI_GAME_INFO: Record<FishingMiniGame, { title: string; lines: string[]; short: string }> = {
  reeling: {
    title: 'やり取り',
    lines: ['長押しで巻く・離すと糸が休まる', '「くるぞ！」が出たら指を離そう'],
    short: '長押しで巻く！',
  },
  target: {
    title: '魚をつかまえろ',
    lines: ['泳ぐ魚をタップしよう', '外すと魚が逃げまわるよ'],
    short: '魚をタップ！',
  },
  reaction: {
    title: '早合わせ',
    lines: ['浮きが沈んだ瞬間にタップ', 'ピクッとしただけで押すとお手つき'],
    short: '沈んだらタップ！',
  },
  rhythm: {
    title: '波のリズム',
    lines: ['玉が線に重なったらタップ', '続けて当てるとコンボ！'],
    short: '線でタップ！',
  },
};

export const FAIL_HINT: Record<FailReason, { title: string; hint: string }> = {
  early: { title: '早すぎた…', hint: '輪が光った瞬間にタップしよう' },
  late: { title: '遅すぎた…', hint: '輪が光ったら、すぐにタップしよう' },
  missed: { title: '見逃した…', hint: '浮きが沈んだら、輪をよく見てタップ' },
  snap: { title: '糸が切れた…', hint: '糸が赤くなったら指を離して休ませよう' },
  timeout: { title: '時間切れ…', hint: '魚が弱った時は一気に巻くチャンス' },
  foul: { title: '逃げられた…', hint: 'ピクッではなく、沈んだ瞬間を待とう' },
  short: { title: 'あと少し…', hint: 'タイミングを合わせて続けて当てよう' },
};

/** 掛かった直後に出す「引き」の予告（大物ほどドラマチックに） */
export const RARITY_PULL_LINE: Partial<Record<FishRarity, string>> = {
  rare: 'なかなかの引きだ！',
  legendary: 'ただならぬ引き…！',
  mythical: 'この引き…まさか幻の…！？',
};

/** 魚の見た目サイズ（px）: 影・ミニゲームの魚の大きさ */
export const SIZE_CLASS_PX: Record<string, number> = {
  small: 56,
  medium: 72,
  large: 92,
  huge: 118,
};
