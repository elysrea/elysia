import { mulberry32 } from '../../../lib/random.ts';
import { createStars, twinkle, type Star } from '../../globe/stars.ts';
import type { Scene, SceneLayout } from '../scene.ts';

/**
 * Curtains of light rising from below the frame.
 *
 * Each curtain is one filled path whose top edge is a sum of three sines, lit
 * by a vertical gradient. Stacked with `lighter` and drifting at different
 * rates, a handful of them read as an aurora — no particles, no noise field,
 * about a hundred line segments a frame.
 */
export interface Curtain {
  /** Where the curtain sits, as a fraction of height. */
  readonly base: number;
  /** How tall its glow is, as a fraction of height. */
  readonly reach: number;
  readonly amplitude: number;
  readonly frequency: number;
  readonly speed: number;
  readonly phase: number;
  readonly alpha: number;
  readonly tint: readonly [string, string];
}

export const CURTAINS: readonly Curtain[] = [
  {
    base: 1.02,
    reach: 0.46,
    amplitude: 0.06,
    frequency: 1.1,
    speed: 0.05,
    phase: 0,
    alpha: 0.2,
    tint: ['168,104,235', '58,28,110'],
  },
  {
    base: 0.96,
    reach: 0.38,
    amplitude: 0.08,
    frequency: 1.7,
    speed: -0.075,
    phase: 1.9,
    alpha: 0.17,
    tint: ['232,96,168', '78,26,120'],
  },
  {
    base: 1.06,
    reach: 0.3,
    amplitude: 0.05,
    frequency: 2.6,
    speed: 0.11,
    phase: 3.4,
    alpha: 0.13,
    tint: ['250,150,116', '92,34,104'],
  },
  {
    base: 0.92,
    reach: 0.26,
    amplitude: 0.1,
    frequency: 0.8,
    speed: -0.04,
    phase: 5.1,
    alpha: 0.1,
    tint: ['122,150,255', '40,30,120'],
  },
];

/** The top edge of a curtain at `t` across the frame, 0-1 down the frame. */
export function curtainEdge(curtain: Curtain, t: number, seconds: number): number {
  const drift = seconds * curtain.speed + curtain.phase;
  const wave =
    Math.sin(t * Math.PI * 2 * curtain.frequency + drift) * 0.6 +
    Math.sin(t * Math.PI * 2 * curtain.frequency * 1.9 - drift * 1.4) * 0.3 +
    Math.sin(t * Math.PI * 2 * curtain.frequency * 0.4 + drift * 0.6) * 0.1;

  return curtain.base - curtain.reach - wave * curtain.amplitude;
}

/** Segments across the frame. Enough that the edge reads as a curve. */
const SEGMENTS = 64;

export class AuroraScene implements Scene {
  readonly #seed: number;
  #width = 0;
  #height = 0;
  #stars: Star[] = [];
  #seconds = 0;

  readonly stillSteps = 900;

  constructor(seed = 0x1d0e) {
    this.#seed = seed;
  }

  layout({ width, height }: SceneLayout): void {
    this.#width = width;
    this.#height = height;
    this.#stars = createStars(width, height, mulberry32(this.#seed ^ 0x51a3), { density: 2400 });
  }

  step(scale: number): void {
    this.#seconds += scale / 60;
  }

  draw(context: CanvasRenderingContext2D, rise: number): void {
    const width = this.#width;
    const height = this.#height;
    if (width === 0 || height === 0) return;

    context.globalCompositeOperation = 'lighter';

    for (const star of this.#stars) {
      const alpha = twinkle(star, this.#seconds) * rise;
      if (alpha <= 0.01) continue;
      context.fillStyle = `rgba(226,220,255,${alpha.toFixed(3)})`;
      context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }

    for (const curtain of CURTAINS) {
      const top = curtainEdge(curtain, 0, this.#seconds) * height;
      const bottom = curtain.base * height;

      const gradient = context.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(0, `rgba(${curtain.tint[0]},0)`);
      gradient.addColorStop(0.35, `rgba(${curtain.tint[0]},${(curtain.alpha * rise).toFixed(3)})`);
      gradient.addColorStop(
        1,
        `rgba(${curtain.tint[1]},${(curtain.alpha * 0.15 * rise).toFixed(3)})`,
      );

      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(0, bottom);

      for (let i = 0; i <= SEGMENTS; i++) {
        const t = i / SEGMENTS;
        context.lineTo(t * width, curtainEdge(curtain, t, this.#seconds) * height);
      }

      context.lineTo(width, bottom);
      context.closePath();
      context.fill();
    }

    context.globalCompositeOperation = 'source-over';
  }
}
