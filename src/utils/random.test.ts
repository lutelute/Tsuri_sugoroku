import { describe, it, expect, afterEach } from 'vitest';
import {
  weightedRandom, randomInt, randomFloat, shuffleArray,
  setRandomSource, resetRandomSource, mulberry32, random,
} from './random';

afterEach(() => resetRandomSource());

describe('weightedRandom', () => {
  it('全ての重みが0なら一様にフォールバックして必ず要素を返す', () => {
    setRandomSource(() => 0.5);
    const items = ['a', 'b', 'c'];
    const result = weightedRandom(items, [0, 0, 0]);
    expect(items).toContain(result);
  });

  it('正の重みが1つだけなら常にその要素を返す', () => {
    const items = ['a', 'b', 'c'];
    for (const r of [0, 0.3, 0.99]) {
      setRandomSource(() => r);
      expect(weightedRandom(items, [1, 0, 0])).toBe('a');
    }
  });

  it('負の重みは0として扱う', () => {
    setRandomSource(() => 0.5);
    const items = ['a', 'b'];
    expect(weightedRandom(items, [-5, 3])).toBe('b');
  });

  it('NaN/Infinityの重みは無効(0)として扱う', () => {
    setRandomSource(() => 0.5);
    const items = ['a', 'b'];
    // NaN→0 なので有効な重みは index1 のみ → 'b'
    expect(weightedRandom(items, [NaN, 3])).toBe('b');
    // Infinity→0、もう一方も0 → 全て無効なので一様フォールバック（必ず要素を返す）
    expect(items).toContain(weightedRandom(items, [Infinity, 0]));
  });

  it('空配列ならthrowする', () => {
    expect(() => weightedRandom([], [])).toThrow();
  });

  it('重みに比例した分布になる（統計的）', () => {
    setRandomSource(mulberry32(12345));
    const items = ['a', 'b'];
    let aCount = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (weightedRandom(items, [3, 1]) === 'a') aCount++;
    }
    // 期待値 0.75。±0.05 の許容
    expect(aCount / N).toBeGreaterThan(0.70);
    expect(aCount / N).toBeLessThan(0.80);
  });
});

describe('mulberry32 (seedable RNG)', () => {
  it('同じシードは同じ系列を返す（決定論的）', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('0以上1未満を返す', () => {
    const gen = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = gen();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randomInt / randomFloat', () => {
  it('randomInt は [min,max] の整数を返す', () => {
    setRandomSource(mulberry32(1));
    for (let i = 0; i < 500; i++) {
      const v = randomInt(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('randomInt(n,n) は常に n', () => {
    setRandomSource(() => 0.9);
    expect(randomInt(3, 3)).toBe(3);
  });

  it('randomFloat は [min,max) の範囲', () => {
    setRandomSource(mulberry32(2));
    for (let i = 0; i < 500; i++) {
      const v = randomFloat(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('shuffleArray', () => {
  it('元配列を破壊せず、同じ要素集合を返す', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    const shuffled = shuffleArray(original);
    expect(original).toEqual(copy); // 非破壊
    expect([...shuffled].sort((a, b) => a - b)).toEqual(copy);
  });
});

describe('random()', () => {
  it('注入したソースを使う', () => {
    setRandomSource(() => 0.123);
    expect(random()).toBe(0.123);
  });
});
