import { describe, expect, it } from 'vitest';
import { arrayOverlap, clamp, parseIncome } from './helpers';

describe('helper utilities', () => {
  it('parses income ranges into numeric midpoints', () => {
    expect(parseIncome('10-15 LPA')).toBe(12.5);
    expect(parseIncome('30-50 LPA')).toBe(40);
  });

  it('returns 0 for open-ended income ranges the rule engine cannot compare', () => {
    expect(parseIncome('100+ LPA')).toBe(0);
  });

  it('counts case-insensitive array overlap', () => {
    expect(arrayOverlap(['Hindi', 'English'], ['english', 'Tamil'])).toBe(1);
  });

  it('clamps numbers to an inclusive range', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});
