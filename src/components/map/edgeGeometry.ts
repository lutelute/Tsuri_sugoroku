// エッジの形状（地図の街道と到達ルートの強調で共有）
/**
 * エッジを二次ベジェ曲線として描く (視覚的な交差を緩和)。
 * from.id と to.id の辞書順でカーブ方向を決定論的に決める（同じ2点間は常に同じ形）。
 */
export function curvePath(from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return `M ${from.x},${from.y} L ${to.x},${to.y}`;
  const px = -dy / len;
  const py = dx / len;
  const bow = Math.min(len * 0.1, 18);
  const dir = from.id < to.id ? 1 : -1;
  const mx = (from.x + to.x) / 2 + px * bow * dir;
  const my = (from.y + to.y) / 2 + py * bow * dir;
  return `M ${from.x},${from.y} Q ${mx.toFixed(1)},${my.toFixed(1)} ${to.x},${to.y}`;
}

