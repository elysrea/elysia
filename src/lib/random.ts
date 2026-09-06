/**
 * A seeded 32-bit PRNG (mulberry32).
 *
 * `Math.random` cannot be reproduced, which makes a particle system impossible
 * to test and impossible to debug from a screenshot. Seeding it means an
 * identical field every run, and a test can assert exact positions.
 */
export type Random = () => number;

export function mulberry32(seed: number): Random {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sum of two uniforms, centred on zero: dense in the middle, thin at the edges. */
export function bilateral(random: Random): number {
  return random() + random() - 1;
}
