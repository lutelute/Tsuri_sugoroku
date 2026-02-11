import { buildAdjacencyList, buildDirectedAdjacencyList, BOARD_EDGES } from '../data/boardEdges';

const adjacency = buildDirectedAdjacencyList();
const bidirectionalAdjacency = buildAdjacencyList();

/**
 * ゴールからの最短距離をBFSで事前計算（directed graphの逆方向で辿る）
 * 返り値: Map<nodeId, ゴールまでの最小ホップ数>
 */
export function computeDistanceToGoal(): Map<string, number> {
  // 逆方向の隣接リストを構築
  const reverseAdj = new Map<string, string[]>();
  for (const edge of BOARD_EDGES) {
    if (!reverseAdj.has(edge.from)) reverseAdj.set(edge.from, []);
    if (!reverseAdj.has(edge.to)) reverseAdj.set(edge.to, []);
    // directed: from→to のみ → 逆方向は to→from
    reverseAdj.get(edge.to)!.push(edge.from);
    if (!edge.directed) {
      // 双方向エッジ → 逆方向も from→to
      reverseAdj.get(edge.from)!.push(edge.to);
    }
  }

  const dist = new Map<string, number>();
  const queue: string[] = ['goal'];
  dist.set('goal', 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = dist.get(current)!;
    const neighbors = reverseAdj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }

  return dist;
}

// モジュールレベルでキャッシュ（一度だけ計算）
const distanceToGoal = computeDistanceToGoal();

export function getReachableNodes(startNode: string, steps: number): string[][] {
  if (steps <= 0) return [[startNode]];

  const startDist = distanceToGoal.get(startNode);
  const paths: string[][] = [];

  function dfs(current: string, remaining: number, path: string[]) {
    // 残り0歩 → ゴール
    if (remaining === 0) {
      paths.push([...path]);
      return;
    }

    const neighbors = adjacency.get(current) || [];
    let hasValidNeighbor = false;

    for (const neighbor of neighbors) {
      if (!path.includes(neighbor)) {
        hasValidNeighbor = true;
        path.push(neighbor);
        dfs(neighbor, remaining - 1, path);
        path.pop();
      }
    }

    // 行き止まり: 歩数が残っていてもここが終点
    if (!hasValidNeighbor && path.length > 1) {
      paths.push([...path]);
    }
  }

  dfs(startNode, steps, [startNode]);

  // 終点が同じパスを統合（最短パスを優先）
  const uniqueEndpoints = new Map<string, string[]>();
  for (const path of paths) {
    const endpoint = path[path.length - 1];
    if (!uniqueEndpoints.has(endpoint) || path.length < uniqueEndpoints.get(endpoint)!.length) {
      uniqueEndpoints.set(endpoint, path);
    }
  }

  // 前進制約: 移動先のゴールまでの距離が現在地以下であることを保証
  // （同じ距離 = 横移動は許可）
  if (startDist !== undefined) {
    for (const [endpoint] of uniqueEndpoints) {
      const endDist = distanceToGoal.get(endpoint);
      if (endDist !== undefined && endDist > startDist) {
        uniqueEndpoints.delete(endpoint);
      }
    }
  }

  // パスが見つからなかった場合、1歩〜steps-1歩で探す（フォールバック）
  if (uniqueEndpoints.size === 0) {
    for (let s = steps - 1; s >= 1; s--) {
      const fallbackPaths: string[][] = [];
      const fallbackDfs = (current: string, remaining: number, path: string[]) => {
        if (remaining === 0) {
          fallbackPaths.push([...path]);
          return;
        }
        const neighbors2 = adjacency.get(current) || [];
        for (const neighbor of neighbors2) {
          if (!path.includes(neighbor)) {
            path.push(neighbor);
            fallbackDfs(neighbor, remaining - 1, path);
            path.pop();
          }
        }
      };
      fallbackDfs(startNode, s, [startNode]);
      if (fallbackPaths.length > 0) {
        const fallbackEndpoints = new Map<string, string[]>();
        for (const path of fallbackPaths) {
          const endpoint = path[path.length - 1];
          const endDist = distanceToGoal.get(endpoint);
          // フォールバックでも前進制約を適用
          if (startDist !== undefined && endDist !== undefined && endDist > startDist) {
            continue;
          }
          if (!fallbackEndpoints.has(endpoint)) {
            fallbackEndpoints.set(endpoint, path);
          }
        }
        if (fallbackEndpoints.size > 0) {
          return Array.from(fallbackEndpoints.values());
        }
      }
    }
    // 本当に移動先がない場合は隣接ノードへ1歩（前進制約を維持）
    const neighbors = adjacency.get(startNode) || [];
    const forwardNeighbors = neighbors.filter(n => {
      const nDist = distanceToGoal.get(n);
      return startDist === undefined || nDist === undefined || nDist <= startDist;
    });
    if (forwardNeighbors.length > 0) {
      return forwardNeighbors.map(n => [startNode, n]);
    }
    // 本当にどこにも行けない場合は元の隣接ノードへ
    return neighbors.map(n => [startNode, n]);
  }

  return Array.from(uniqueEndpoints.values());
}

export function getNeighbors(nodeId: string): string[] {
  return bidirectionalAdjacency.get(nodeId) || [];
}
