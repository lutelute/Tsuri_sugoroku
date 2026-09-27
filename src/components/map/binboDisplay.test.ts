import { describe, expect, it } from 'vitest';
import { binboPassStep, binboSwapDelayMs } from './binboDisplay';

describe('貧乏神の人形の付け替え（見た目の遅れ）', () => {
  const path = ['a', 'b', 'c', 'd'];

  it('移り先のマスが経路の何歩目か', () => {
    expect(binboPassStep(path, 'b')).toBe(1);
    expect(binboPassStep(path, 'd')).toBe(3);
    // 出発したマス（0歩目）ではすれ違わない
    expect(binboPassStep(path, 'a')).toBeNull();
    expect(binboPassStep(path, 'x')).toBeNull();
  });

  it('s 歩目なら s × 1マスの時間だけ待つ', () => {
    expect(binboSwapDelayMs(path, 'c', 190)).toBe(380);
  });

  it('経路に無いときは移動の演出が終わるまで待つ', () => {
    expect(binboSwapDelayMs(path, 'x', 190)).toBe(570);
    expect(binboSwapDelayMs(['a'], 'x', 190)).toBe(0);
  });
});
