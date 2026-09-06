import { bilateral, type Random } from '../../lib/random.ts';
import { DEFAULT_FLOW_FIELD, flowAngle, type FlowFieldConfig } from './flow-field.ts';

export interface FieldBounds {
  readonly width: number;
  readonly height: number;
  /** Vertical centre of the drift, in CSS pixels. */
  readonly horizonY: number;
}

export interface Particle {
  x: number;
  y: number;
  /** Position at the end of the previous step; each particle draws as a segment. */
  prevX: number;
  prevY: number;
  /** CSS pixels per fixed step at full rise. */
  speed: number;
  /** Steps remaining before the particle is recycled. */
  life: number;
}

export interface ParticleFieldOptions {
  readonly flowField?: FlowFieldConfig;
  /** One particle per this many square pixels. */
  readonly density?: number;
  readonly minCount?: number;
  readonly maxCount?: number;
}

const EXIT_MARGIN_X = 24;
const EXIT_MARGIN_Y = 60;
/** How far above and below the horizon particles seed, as a share of height. */
const SPREAD = 0.68;

/** Particle budget for a viewport, before any quality scaling. */
export function countFor(bounds: FieldBounds, options: ParticleFieldOptions = {}): number {
  const density = options.density ?? 1150;
  const min = options.minCount ?? 240;
  const max = options.maxCount ?? 1000;
  const area = bounds.width * bounds.height;
  return Math.round(Math.min(max, Math.max(min, area / density)));
}

/**
 * Places one particle.
 *
 * `fresh` seeds anywhere on screen (used to fill the first frame); otherwise the
 * particle enters from off the left edge, which is where the wind comes from.
 */
export function spawn(random: Random, bounds: FieldBounds, fresh: boolean): Particle {
  const x = fresh ? random() * bounds.width : -20 - random() * bounds.width * 0.18;
  const y = bounds.horizonY + bilateral(random) * bounds.height * SPREAD;

  return {
    x,
    y,
    prevX: x,
    prevY: y,
    // Squaring the uniform makes most particles slow and a few noticeably fast.
    speed: 0.4 + random() * random() * 2.6,
    life: 90 + random() * 320,
  };
}

export function isSpent(particle: Particle, bounds: FieldBounds): boolean {
  return (
    particle.life <= 0 ||
    particle.x > bounds.width + EXIT_MARGIN_X ||
    particle.y < -EXIT_MARGIN_Y ||
    particle.y > bounds.height + EXIT_MARGIN_Y
  );
}

/**
 * A pool of particles that recycles rather than allocating.
 *
 * The pool is the reason the effect can be resized and quality-scaled without
 * garbage collection pauses showing up as stutter in the animation.
 */
export class ParticleField {
  #bounds: FieldBounds;
  #random: Random;
  #options: ParticleFieldOptions;
  #particles: Particle[] = [];
  /** Seconds of simulated time, the input to the flow field. */
  #seconds = 0;

  constructor(bounds: FieldBounds, random: Random, options: ParticleFieldOptions = {}) {
    this.#bounds = bounds;
    this.#random = random;
    this.#options = options;
    this.setCount(countFor(bounds, options));
  }

  get particles(): readonly Particle[] {
    return this.#particles;
  }

  get bounds(): FieldBounds {
    return this.#bounds;
  }

  get seconds(): number {
    return this.#seconds;
  }

  /** Particle budget at full quality for the current bounds. */
  get capacity(): number {
    return countFor(this.#bounds, this.#options);
  }

  setCount(count: number): void {
    const target = Math.max(0, Math.round(count));

    while (this.#particles.length > target) this.#particles.pop();
    while (this.#particles.length < target) {
      const particle = spawn(this.#random, this.#bounds, true);
      // Stagger initial lifetimes so the whole field does not recycle at once.
      particle.life = this.#random() * 320;
      this.#particles.push(particle);
    }
  }

  resize(bounds: FieldBounds): void {
    this.#bounds = bounds;
    for (const particle of this.#particles) {
      Object.assign(particle, spawn(this.#random, bounds, true));
    }
    this.setCount(countFor(bounds, this.#options));
  }

  /**
   * Advances every particle by one step.
   *
   * `rise` ramps from 0 to 1 when the effect starts, so the wind builds instead
   * of snapping on. `scale` is the step length relative to the fixed step.
   */
  step(rise: number, scale = 1): void {
    const field = this.#options.flowField ?? DEFAULT_FLOW_FIELD;
    this.#seconds += 0.016 * scale;

    for (const particle of this.#particles) {
      particle.prevX = particle.x;
      particle.prevY = particle.y;

      const angle = flowAngle(particle.x, particle.y, this.#seconds, field);
      const drift = particle.speed * (0.35 + rise * 0.65) * scale;

      particle.x += Math.cos(angle) * drift;
      particle.y += Math.sin(angle) * drift * 0.5;
      particle.life -= scale;

      if (isSpent(particle, this.#bounds)) {
        Object.assign(particle, spawn(this.#random, this.#bounds, false));
      }
    }
  }
}
