import { getReachableNodes } from '../utils/pathfinding';

export function calculateReachableNodes(currentNode: string, diceRoll: number): string[][] {
  return getReachableNodes(currentNode, diceRoll);
}

export function getDestinationFromPath(path: string[]): string {
  return path[path.length - 1];
}
