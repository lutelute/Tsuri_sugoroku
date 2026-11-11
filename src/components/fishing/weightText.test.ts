import { describe, it, expect } from 'vitest';
import { weightText } from './weightText';

describe('重さの表示', () => {
  it('1kg 未満は g で出す（0.0kg にしない）', () => {
    expect(weightText(0.004)).toEqual({ value: '4', unit: 'g' });
    expect(weightText(0.0004)).toEqual({ value: '1', unit: 'g' });
    expect(weightText(0.043)).toEqual({ value: '40', unit: 'g' });
    expect(weightText(0.35)).toEqual({ value: '350', unit: 'g' });
    expect(weightText(0.994)).toEqual({ value: '990', unit: 'g' });
  });

  it('1kg の境目で 1000g にならない', () => {
    expect(weightText(0.997)).toEqual({ value: '1.0', unit: 'kg' });
    expect(weightText(1)).toEqual({ value: '1.0', unit: 'kg' });
  });

  it('1kg 以上は kg（100kg 以上は整数）', () => {
    expect(weightText(1.64)).toEqual({ value: '1.6', unit: 'kg' });
    expect(weightText(77.9)).toEqual({ value: '77.9', unit: 'kg' });
    expect(weightText(250.4)).toEqual({ value: '250', unit: 'kg' });
  });

  it('0 以下や数でない値でも落ちない', () => {
    expect(weightText(0)).toEqual({ value: '0', unit: 'g' });
    expect(weightText(Number.NaN)).toEqual({ value: '0', unit: 'g' });
  });
});
