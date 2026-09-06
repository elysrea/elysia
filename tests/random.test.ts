import { describe, expect, it } from 'vitest';

import { bilateral, mulberry32 } from '../src/lib/random.ts';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const draw = (random: () => number): number[] => Array.from({ length: 8 }, random);

    expect(draw(a)).toEqual(draw(b));
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 8 }, mulberry32(1));
    const b = Array.from({ length: 8 }, mulberry32(2));

    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const random = mulberry32(7);

    for (let i = 0; i < 5000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('bilateral', () => {
  it('stays within [-1, 1] and centres on zero', () => {
    const random = mulberry32(99);
    let sum = 0;

    for (let i = 0; i < 20_000; i++) {
      const value = bilateral(random);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      sum += value;
    }

    expect(Math.abs(sum / 20_000)).toBeLessThan(0.02);
  });
});
