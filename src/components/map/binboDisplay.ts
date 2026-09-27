// 貧乏神の人形を地図のどの駒に乗せるかの「見た目の遅れ」の計算（純粋関数）。
// ストアでは移動が確定した瞬間に貧乏神が移るが、地図では動いた駒が移り先のマスに着いてから付け替える。
// 通知の係（トーストの順番）もこの待ち時間を使えるよう、ここにまとめる。

/** 動いた駒が経路の何歩目で移り先のマスに着くか（見つからなければ null） */
export function binboPassStep(path: readonly string[], holderNode: string): number | null {
  for (let s = 1; s < path.length; s++) {
    if (path[s] === holderNode) return s;
  }
  return null;
}

/**
 * 地図の人形を付け替えるまでの待ち時間(ms)。移動が確定した時点（lastMove.seq が変わった時点）から数える。
 * 駒は1マスを stepMs で進むので、s 歩目のマスに着くのは s × stepMs 後。
 * 移り先のマスが経路に無いとき（目的地の一番乗りでとりついた等）は、移動の演出が終わるまで待つ。
 */
export function binboSwapDelayMs(path: readonly string[], holderNode: string, stepMs: number): number {
  const s = binboPassStep(path, holderNode);
  return Math.max(0, (s ?? path.length - 1) * stepMs);
}
