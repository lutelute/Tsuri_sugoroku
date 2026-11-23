// 「やめる」「なかま」の画面の文（子どもも読む。漢字はすべてふりがなで読めること: sessionText.test.ts）。
import { MAX_PLAYERS } from '../../game/midGame';

export const QUIT_TEXT = {
  button: 'やめる',
  title: '今日はここまで？',
  save: 'セーブしてやめる',
  saveSub: '次はタイトルの「つづきから」で続きができるよ',
  saveSubTurnStart: 'この番のはじめから続きになるよ',
  end: 'ここで終わりにして順位を決める',
  endSubFishing: '今の釣果で結果発表。釣った魚は図鑑に残るよ',
  endSubCity: '今の資産で結果発表。釣った魚は図鑑に残るよ',
  confirmTitle: '本当に終わりにする？',
  confirmSub: '結果発表のあとは、続きはできないよ',
  confirmYes: '終わりにする',
  back: 'もどる',
  keepPlaying: 'つづける',
} as const;

export const MEMBERS_TEXT = {
  button: 'なかま',
  title: 'なかま',
  lead: '途中から仲間を増やせるよ。アカウントを登録すると、釣った魚が図鑑に残るよ。',
  cpu: 'CPU',
  linked: 'アカウント',
  notLinked: '登録していない',
  lateTag: '途中から',
  register: '登録する',
  add: '仲間を増やす',
  addName: 'なまえ',
  addSubmit: '仲間に入れる',
  addNoteFishing: (after: string) => `スタートから、はじめの道具とお金で始まるよ。番は${after}の次。`,
  addNoteCity: (after: string) => `はじめの町から、はじめのお金で始まるよ。番は${after}の次。`,
  added: (name: string) => `${name}が仲間に入ったよ！`,
  full: `${MAX_PLAYERS}人でいっぱいだよ`,
  noSwap: 'つないだアカウントを途中で入れ替えることはできないよ',
  close: 'とじる',
} as const;

export const ACCOUNT_TEXT = {
  title: (name: string) => `${name}を登録する`,
  haveAccount: 'アカウントがある',
  newAccount: '新しく作る',
  username: 'なまえ（ログインのなまえ）',
  password: 'パスワード',
  passwordNew: 'パスワード（6文字以上）',
  submitLink: '登録する',
  submitCreate: '作って登録する',
  busy: '確かめているよ…',
  noteFishing: 'この対局で釣った魚は、アカウントの図鑑に入るよ。お金は増えた分だけ足されるよ。竿などの道具は引き継がないよ。',
  noteCity: 'この対局で釣った魚は、アカウントの図鑑に入るよ。まちづくりのお金は持ち帰らないよ。',
  done: (name: string) => `${name}を登録したよ！`,
  duplicate: (other: string) => `このアカウントは、もう${other}につないであるよ`,
  failed: '登録できなかったよ。もう一度ためしてね',
  cancel: 'やめる',
} as const;
