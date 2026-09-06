import { describe, expect, it } from 'vitest';

import { glowAt, leanAt, lifeFade, strokeFor } from '../src/features/wind/palette.ts';
import { mulberry32 } from '../src/lib/random.ts';
import { spawn, type FieldBounds } from '../src/features/wind/particles.ts';

const bounds: FieldBounds = { width: 1000, height: 800, horizonY: 500 };

describe('glowAt', () => {
  it('peaks at the horizon and falls away from it', () => {
    expect(glowAt(bounds.horizonY, bounds)).toBe(1);
    expect(glowAt(bounds.horizonY + 200, bounds)).toBeLessThan(1);
    expect(glowAt(bounds.horizonY + 200, bounds)).toBeGreaterThan(
      glowAt(bounds.horizonY + 380, bounds),
    );
  });

  it('never goes negative, however far out the particle is', () => {
    expect(glowAt(-5000, bounds)).toBe(0);
    expect(glowAt(5000, bounds)).toBe(0);
  });

  it('survives a zero-height canvas', () => {
    expect(glowAt(10, { width: 0, height: 0, horizonY: 0 })).toBe(0);
  });
});

describe('leanAt', () => {
  it('brightens toward the light source on the right', () => {
    expect(leanAt(0, bounds)).toBeLessThan(leanAt(bounds.width, bounds));
  });
});

describe('lifeFade', () => {
  it('is full while a particle is young and fades as it expires', () => {
    expect(lifeFade(300)).toBe(1);
    expect(lifeFade(35)).toBeCloseTo(0.5);
    expect(lifeFade(0)).toBe(0);
    expect(lifeFade(-10)).toBe(0);
  });
});

describe('strokeFor', () => {
  const particle = spawn(mulberry32(21), bounds, true);

  it('returns a canvas-ready rgba colour', () => {
    const stroke = strokeFor({ ...particle, x: 800, y: bounds.horizonY, life: 300 }, bounds, 1);

    expect(stroke).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
  });

  it('skips particles that would be invisible', () => {
    expect(strokeFor(particle, bounds, 0)).toBeNull();
    expect(strokeFor({ ...particle, life: 0 }, bounds, 1)).toBeNull();
    expect(strokeFor({ ...particle, y: -4000, life: 300 }, bounds, 0.02)).toBeNull();
  });

  it('keeps every channel inside the byte range', () => {
    const random = mulberry32(22);

    for (let i = 0; i < 2000; i++) {
      const stroke = strokeFor(
        {
          ...particle,
          x: random() * bounds.width,
          y: random() * bounds.height,
          life: random() * 400,
        },
        bounds,
        random(),
      );
      if (!stroke) continue;

      const [r, g, b] = stroke.slice(5, -1).split(',').map(Number);
      for (const channel of [r, g, b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});
