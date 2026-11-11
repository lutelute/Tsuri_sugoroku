import { buildAdjacencyList, BOARD_EDGES } from '../data/boardEdges';

const bidirectionalAdjacency = buildAdjacencyList();
/**
 * 経路探索で調べる手数の上限。線路（歩数0のマス）が盤の大半に敷かれると道の数が爆発し、
 * サイコロ3個（最大18歩）で数秒固まることがあった。上限に達したら、そこまでに見つけた行き先を返す。
 * ふつうの盤面（線路が20区間まで）では上限に届かない。
 */
const SEARCH_BUDGET = 300_000;

/** 通り抜けるだけのマス（まちづくりの線路）が無いとき */
const NO_PASS: ReadonlySet<string> = new Set();

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

/**
 * steps 歩で行ける経路の一覧（終点ごとに最短のもの）。
 * stopNodes（まちづくりの目的地など）は、ゴールと同じく歩数が残っていても止まれる（そこを終点にする経路も加える）。
 * passThrough（まちづくりの線路のある中継マス）は歩数を使わずに通り抜け、そこには止まれない。
 */
export function getReachableNodes(startNode: string, steps: number, stopNodes: string[] = [], passThrough: ReadonlySet<string> = NO_PASS): string[][] {
  if (steps <= 0) return [[startNode]];

  const paths: string[][] = [];
  const stops = new Set(stopNodes);
  const cost = (id: string) => (passThrough.has(id) ? 0 : 1);
  let budget = SEARCH_BUDGET;

  function dfs(current: string, remaining: number, path: string[]) {
    if (--budget < 0) return;
    // goalノードに到達した場合、残りステップがあっても停止
    if (current === 'goal' && path.length > 1) {
      paths.push([...path]);
      return;
    }
    // 線路の上は通り抜けるだけ（止まれない）
    const passing = path.length > 1 && passThrough.has(current);
    // 目的地: ぴったりでなくても止まれる（通り抜けることもできる）
    if (!passing && stops.has(current) && path.length > 1 && remaining > 0) {
      paths.push([...path]);
    }

    // 残り0歩 → 終点
    if (remaining === 0) {
      if (!passing) paths.push([...path]);
      return;
    }

    const neighbors = bidirectionalAdjacency.get(current) || [];
    let hasValidNeighbor = false;

    for (const neighbor of neighbors) {
      if (!path.includes(neighbor)) {
        hasValidNeighbor = true;
        path.push(neighbor);
        dfs(neighbor, remaining - cost(neighbor), path);
        path.pop();
      }
    }

    // 行き止まり: 歩数が残っていてもここが終点（線路の上では止まれないので捨てる）
    if (!hasValidNeighbor && path.length > 1 && !passing) {
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

  // パスが見つからなかった場合、1歩〜steps-1歩で探す（フォールバック）
  if (uniqueEndpoints.size === 0) {
    for (let s = steps - 1; s >= 1; s--) {
      const fallbackPaths: string[][] = [];
      let fallbackBudget = SEARCH_BUDGET;
      const fallbackDfs = (current: string, remaining: number, path: string[]) => {
        if (--fallbackBudget < 0) return;
        if (current === 'goal' && path.length > 1) {
          fallbackPaths.push([...path]);
          return;
        }
        if (remaining === 0) {
          if (!(path.length > 1 && passThrough.has(current))) fallbackPaths.push([...path]);
          return;
        }
        const neighbors2 = bidirectionalAdjacency.get(current) || [];
        for (const neighbor of neighbors2) {
          if (!path.includes(neighbor)) {
            path.push(neighbor);
            fallbackDfs(neighbor, remaining - cost(neighbor), path);
            path.pop();
          }
        }
      };
      fallbackDfs(startNode, s, [startNode]);
      if (fallbackPaths.length > 0) {
        const fallbackEndpoints = new Map<string, string[]>();
        for (const path of fallbackPaths) {
          const endpoint = path[path.length - 1];
          if (!fallbackEndpoints.has(endpoint)) {
            fallbackEndpoints.set(endpoint, path);
          }
        }
        if (fallbackEndpoints.size > 0) {
          return Array.from(fallbackEndpoints.values());
        }
      }
    }
    // 本当にどこにも行けない場合は隣接ノードへ1歩（線路の上には止まれないので、線路でないマスを優先）
    const neighbors = bidirectionalAdjacency.get(startNode) || [];
    const stoppable = neighbors.filter(n => !passThrough.has(n));
    return (stoppable.length ? stoppable : neighbors).map(n => [startNode, n]);
  }

  return Array.from(uniqueEndpoints.values());
}

export function getNeighbors(nodeId: string): string[] {
  return bidirectionalAdjacency.get(nodeId) || [];
}
