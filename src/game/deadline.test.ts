import { describe, it, expect } from 'vitest';
import { fishingLastTurn, MIN_CLOSE_TURN } from './deadline';
import { GOAL_CLOSE_ROUNDS } from './constants';

describe('釣り旅の締め切り', () => {
  it('誰もゴールしていなければ最大巡数まで', () => {
    expect(fishingLastTurn(null, 80)).toBe(80);
    expect(fishingLastTurn(null, 0)).toBe(Infinity);
  });
  it('最初のゴールから GOAL_CLOSE_ROUNDS 巡で終わる', () => {
    expect(fishingLastTurn(50, 80)).toBe(50 + GOAL_CLOSE_ROUNDS);
  });
  it('早くゴールしても MIN_CLOSE_TURN 巡目までは続く', () => {
    expect(fishingLastTurn(11, 80)).toBe(MIN_CLOSE_TURN);
  });
  it('最大巡数を超えない', () => {
    expect(fishingLastTurn(78, 80)).toBe(80);
    expect(fishingLastTurn(11, 30)).toBe(30);
  });
});
