// 釣りの舞台（FishingStage）と、その上に載る各フェーズをつなぐ文脈。
// フェーズは「水面を画面のどこに置きたいか」を伝えるだけ。舞台はそれに合わせて絵（カメラ）を上下に動かす。
import { createContext, useContext } from 'react';

export interface StageApi {
  /**
   * 水面と水底の位置（画面上の y・px）を舞台に伝える。
   * 舞台は CSS 変数を書き換えるだけで、React の再描画はしない。
   */
  setView: (surfaceY: number, floorY: number) => void;
}

export const StageContext = createContext<StageApi | null>(null);

/** 舞台の中にいるか（イベントの釣りなど、舞台なしで呼ばれることがある） */
export function useStage(): StageApi | null {
  return useContext(StageContext);
}
