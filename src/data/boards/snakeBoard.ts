// ジグザグ伝統盤（案B）。
// 既存の realistic ボードのノード(207)・エッジ(261)・capital/route 設定を引き継ぎつつ、
// 座標を「左右に蛇行する6行のグリッド」へ再配置する。
// データ的な互換性(NODE_MAP.get/capitalEventId/routeTheme等)は全て維持。

import type { BoardNode, BoardEdge } from '../../game/types';
import { REALISTIC_NODES } from '../realisticData_nodes';
import { REALISTIC_EDGES } from '../realisticData_edges';

// 行(レーン)の中央y座標。最終行(九州〜ゴール)は ゴール位置に近づける。
const LANE_Y: Record<string, number> = {
  hokkaido: 80,
  tohoku: 250,
  kanto: 420,
  chubu: 590,
  kinki: 760,
  chugoku: 760,
  shikoku: 930,
  kyushu: 1100,
};

// 左右の端 (x座標)
const LEFT = 100;
const RIGHT = 1000;
const LANE_DIR: Record<string, 1 | -1> = {
  hokkaido: 1,
  tohoku: -1,
  kanto: 1,
  chubu: -1,
  kinki: -1,
  chugoku: -1,
  shikoku: 1,
  kyushu: -1,
};

function reposition(): BoardNode[] {
  // 各地域ごとにグループ化 → そのレーンに均等配置
  const byRegion = new Map<string, BoardNode[]>();
  for (const n of REALISTIC_NODES) {
    if (n.id === 'start' || n.id === 'goal') continue;
    const arr = byRegion.get(n.region) || [];
    arr.push(n);
    byRegion.set(n.region, arr);
  }

  const out: BoardNode[] = [];

  // スタートは行0(北海道行の左端外側)、ゴールは最終行の右端外側
  out.push({ ...REALISTIC_NODES.find(n => n.id === 'start')!, x: LEFT - 60, y: LANE_Y.hokkaido });

  for (const [region, nodes] of byRegion) {
    const y = LANE_Y[region] ?? 500;
    const dir = LANE_DIR[region] ?? 1;
    // 元のノードは、realisticでの y(縦) でソート → 流れ順を保つ
    const sorted = nodes.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const n = sorted.length;
    if (n === 0) continue;
    const span = RIGHT - LEFT;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = dir === 1 ? LEFT + span * t : RIGHT - span * t;
      // レーン内の上下に少し散らして重なりを避ける (3段ジグザグ)
      const yOffset = ((i % 3) - 1) * 22;
      out.push({ ...sorted[i], x, y: y + yOffset });
    }
  }

  out.push({ ...REALISTIC_NODES.find(n => n.id === 'goal')!, x: LEFT - 60, y: LANE_Y.kyushu + 100 });
  return out;
}

export const SNAKE_NODES: BoardNode[] = reposition();
export const SNAKE_EDGES: BoardEdge[] = REALISTIC_EDGES; // エッジ構造は同じ
