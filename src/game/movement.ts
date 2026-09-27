import { getReachableNodes } from '../utils/pathfinding';

export function calculateReachableNodes(currentNode: string, diceRoll: number, stopNodes: string[] = []): string[][] {
  return getReachableNodes(currentNode, diceRoll, stopNodes);
}

export function getDestinationFromPath(path: string[]): string {
  return path[path.length - 1];
}
