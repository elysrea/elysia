import { mulberry32 } from '../../lib/random.ts';

/**
 * Value noise on a hashed lattice.
 *
 * Small, seeded and dependency-free. Perlin or simplex would be smoother, but
 * the nebula stacks several octaves and blurs the result, and at that point the
 * difference is invisible and the extra arithmetic is not.
 */
export type Noise2D = (x: number, y: number) => number;

const SIZE = 256;
const MASK = SIZE - 1;

/** Smoothstep: the reason lattice noise does not look like a chessboard. */
const fade = (t: number): number => t * t * (3 - 2 * t);

export function makeNoise(seed: number): Noise2D {
  const random = mulberry32(seed);
  const values = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < values.length; i++) values[i] = random();

  return function noise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = fade(x - xi);
    const ty = fade(y - yi);

    const x0 = xi & MASK;
    const y0 = yi & MASK;
    const x1 = (x0 + 1) & MASK;
    const y1 = (y0 + 1) & MASK;

    const a = values[y0 * SIZE + x0]!;
    const b = values[y0 * SIZE + x1]!;
    const c = values[y1 * SIZE + x0]!;
    const d = values[y1 * SIZE + x1]!;

    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;
    return top + (bottom - top) * ty;
  };
}

/** Stacked octaves, each half the amplitude and twice the frequency. */
export function fbm(noise: Noise2D, x: number, y: number, octaves = 3): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return norm === 0 ? 0 : total / norm;
}
