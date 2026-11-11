import { getReachableNodes } from '../utils/pathfinding';

/** passThrough: まちづくりの線路のある中継マス（歩数を使わずに通り抜け、止まれない） */
export function calculateReachableNodes(currentNode: string, diceRoll: number, stopNodes: string[] = [], passThrough?: ReadonlySet<string>): string[][] {
  return getReachableNodes(currentNode, diceRoll, stopNodes, passThrough);
}

export function getDestinationFromPath(path: string[]): string {
  return path[path.length - 1];
}
