import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../src/lib/random.ts';
import {
  ParticleField,
  countFor,
  isSpent,
  spawn,
  type FieldBounds,
} from '../src/features/wind/particles.ts';

const bounds: FieldBounds = { width: 1280, height: 800, horizonY: 528 };

describe('countFor', () => {
  it('scales with viewport area', () => {
    const small = countFor({ width: 400, height: 600, horizonY: 300 });
    const large = countFor({ width: 2560, height: 1440, horizonY: 950 });

    expect(small).toBeLessThan(large);
  });

  it('clamps to the configured range', () => {
    expect(countFor({ width: 10, height: 10, horizonY: 5 })).toBe(240);
    expect(countFor({ width: 8000, height: 8000, horizonY: 4000 })).toBe(1000);
  });
});

describe('spawn', () => {
  it('places fresh particles on screen', () => {
    const random = mulberry32(3);

    for (let i = 0; i < 200; i++) {
      const particle = spawn(random, bounds, true);
      expect(particle.x).toBeGreaterThanOrEqual(0);
      expect(particle.x).toBeLessThanOrEqual(bounds.width);
    }
  });

  it('enters recycled particles from upwind, off the left edge', () => {
    const random = mulberry32(4);

    for (let i = 0; i < 200; i++) {
      expect(spawn(random, bounds, false).x).toBeLessThan(0);
    }
  });

  it('starts each particle as a zero-length segment', () => {
    const particle = spawn(mulberry32(5), bounds, true);

    expect(particle.prevX).toBe(particle.x);
    expect(particle.prevY).toBe(particle.y);
  });

  it('clusters around the horizon', () => {
    const random = mulberry32(6);
    const distances = Array.from({ length: 4000 }, () =>
      Math.abs(spawn(random, bounds, true).y - bounds.horizonY),
    ).sort((a, b) => a - b);

    const median = distances[Math.floor(distances.length / 2)] ?? Infinity;
    expect(median).toBeLessThan(bounds.height * 0.25);
  });
});

describe('isSpent', () => {
  const base = spawn(mulberry32(1), bounds, true);

  it('recycles particles that leave the frame or run out of life', () => {
    expect(isSpent({ ...base, x: bounds.width + 25 }, bounds)).toBe(true);
    expect(isSpent({ ...base, y: -61 }, bounds)).toBe(true);
    expect(isSpent({ ...base, y: bounds.height + 61 }, bounds)).toBe(true);
    expect(isSpent({ ...base, life: 0 }, bounds)).toBe(true);
  });

  it('keeps particles that are still in play', () => {
    expect(isSpent({ ...base, x: 10, y: 400, life: 5 }, bounds)).toBe(false);
  });
});

describe('ParticleField', () => {
  it('fills to the budget for its bounds', () => {
    const field = new ParticleField(bounds, mulberry32(11));

    expect(field.particles.length).toBe(countFor(bounds));
  });

  it('grows and shrinks without reallocating the pool wholesale', () => {
    const field = new ParticleField(bounds, mulberry32(12));

    field.setCount(50);
    expect(field.particles.length).toBe(50);

    field.setCount(300);
    expect(field.particles.length).toBe(300);
  });

  it('moves particles downwind', () => {
    const field = new ParticleField(bounds, mulberry32(13));
    field.setCount(200);
    const before = field.particles.map((particle) => particle.x);

    field.step(1);

    const moved = field.particles.filter((particle, index) => particle.x > (before[index] ?? 0));
    expect(moved.length).toBeGreaterThan(150);
  });

  it('records the previous position so each particle draws as a segment', () => {
    const field = new ParticleField(bounds, mulberry32(14));
    field.setCount(1);
    field.step(1);

    const particle = field.particles[0];
    expect(particle).toBeDefined();
    expect(particle?.prevX).not.toBe(particle?.x);
  });

  it('covers the same ground in ten steps as in twenty half steps', () => {
    // Frame-rate independence: this is what the fixed timestep buys. A single
    // long-lived particle is used because the whole pool would also differ in
    // the order it recycles, which is not what this asserts.
    const run = (scale: number, steps: number): { x: number; y: number } => {
      const field = new ParticleField(bounds, mulberry32(15));
      field.setCount(1);
      const particle = field.particles[0];
      if (!particle) throw new Error('expected a particle');
      Object.assign(particle, { x: 100, y: 400, prevX: 100, prevY: 400, speed: 2, life: 1e6 });

      for (let i = 0; i < steps; i++) field.step(1, scale);
      return { x: particle.x, y: particle.y };
    };

    const whole = run(1, 10);
    const halves = run(0.5, 20);

    expect(halves.x).toBeCloseTo(whole.x, 1);
    expect(halves.y).toBeCloseTo(whole.y, 1);
  });

  it('holds the pool size steady while recycling', () => {
    const field = new ParticleField(bounds, mulberry32(16));
    field.setCount(400);

    for (let i = 0; i < 2000; i++) field.step(1);

    expect(field.particles.length).toBe(400);
    for (const particle of field.particles) {
      expect(Number.isFinite(particle.x)).toBe(true);
      expect(particle.life).toBeGreaterThan(0);
    }
  });

  it('re-seeds and re-budgets on resize', () => {
    const field = new ParticleField(bounds, mulberry32(17));
    const next: FieldBounds = { width: 600, height: 900, horizonY: 540 };

    field.resize(next);

    expect(field.bounds).toEqual(next);
    expect(field.particles.length).toBe(countFor(next));
    for (const particle of field.particles) {
      expect(particle.x).toBeLessThanOrEqual(next.width);
    }
  });
});
