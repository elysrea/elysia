import { describe, expect, it } from 'vitest';

import { createStars, starCount, twinkle } from '../src/features/hero/stars.ts';
import { mulberry32 } from '../src/lib/random.ts';

describe('starCount', () => {
  it('scales with the viewport, within bounds', () => {
    expect(starCount(375, 700)).toBeLessThan(starCount(2560, 1440));
    expect(starCount(10, 10)).toBe(90);
    expect(starCount(9000, 9000)).toBe(520);
  });
});

describe('createStars', () => {
  const stars = createStars(1280, 720, mulberry32(4));

  it('places every star inside the frame', () => {
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(1280);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(720);
    }
  });

  it('makes most stars faint and a few bright', () => {
    // An evenly scattered field reads as dust, not as a sky.
    const bright = stars.filter((star) => star.alpha > 0.5).length;

    expect(bright).toBeGreaterThan(0);
    expect(bright / stars.length).toBeLessThan(0.25);
  });

  it('is deterministic for a seed', () => {
    expect(createStars(800, 600, mulberry32(9))).toEqual(createStars(800, 600, mulberry32(9)));
  });
});

describe('twinkle', () => {
  const [star] = createStars(400, 400, mulberry32(1));

  it('never goes negative or exceeds the star', () => {
    if (!star) throw new Error('expected a star');

    for (let t = 0; t < 40; t += 0.13) {
      const value = twinkle(star, t);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(star.alpha);
    }
  });

  it('actually varies over time', () => {
    if (!star) throw new Error('expected a star');

    const samples = new Set(
      Array.from({ length: 12 }, (_, i) => twinkle(star, i * 0.4).toFixed(3)),
    );
    expect(samples.size).toBeGreaterThan(4);
  });

  it('does not put the whole sky in step', () => {
    // Counting distinct phases would only measure the birthday problem. What
    // matters is that every part of the cycle is occupied at any moment.
    const stars = createStars(1200, 800, mulberry32(2));
    const quarters = [0, 0, 0, 0];

    for (const s of stars) {
      const quarter = Math.min(3, Math.floor(s.phase / (Math.PI / 2)));
      quarters[quarter] = (quarters[quarter] ?? 0) + 1;
    }

    for (const count of quarters) expect(count).toBeGreaterThan(stars.length * 0.15);
  });
});
