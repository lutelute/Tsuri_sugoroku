// CPU の「狙い」（損得係）: 分かれ道で CPU が選んだ道の理由を、思案中の札に出すための小さな置き場。
// ゲームの状態ではなく表示だけの値なので、ゲームストアには入れない（保存もしない）。
import { create } from 'zustand';

export interface CpuAim {
  /** どの手番の狙いか（巡:席）。手番が替わったら出さない */
  key: string;
  /** 「金沢の独占まであと1区画…」「目的地の仙台へ急ぐ」 */
  text: string;
}

export const useCpuAim = create<{ aim: CpuAim | null }>(() => ({ aim: null }));

export function aimKey(turn: number, playerIndex: number): string {
  return `${turn}:${playerIndex}`;
}

export function setCpuAim(aim: CpuAim | null) {
  useCpuAim.setState({ aim });
}
