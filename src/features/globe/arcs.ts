import type { Random } from '../../lib/random.ts';
import type { Anchor } from './cities.ts';
import { angleBetween } from './geo.ts';

/**
 * Connections travelling between points on the globe.
 *
 * An arc is a single number — how far along its path the head has gone — plus
 * the two endpoints. Everything drawn (the trailing line, the departure ring,
 * the arrival ring) is derived from that, so there is no separate state machine
 * to keep in sync with the animation.
 */
export interface Arc {
  readonly from: Anchor;
  readonly to: Anchor;
  /** Great-circle separation in radians; drives both lift and duration. */
  readonly span: number;
  /** 0 at departure, 1 on arrival, up to 1 + TAIL while the trail whips out. */
  progress: number;
  readonly speed: number;
}

/** How much of the path the glowing trail covers. */
export const TAIL = 0.32;

/** Rings expand over this much progress after departure and arrival. */
export const RING = 0.22;

/**
 * Extra life after the trail has gone, so the destination label can be read.
 * Without it the name flashes for a fifth of a second and means nothing.
 */
export const HOLD = 1;

export interface ArcSystemOptions {
  readonly maxArcs?: number;
  /** Steps between spawn attempts. */
  readonly interval?: number;
  /** Reject pairs closer together than this, in radians. */
  readonly minSpan?: number;
}

export const arcHead = (arc: Arc): number => Math.min(1, arc.progress);
export const arcTail = (arc: Arc): number => Math.max(0, arc.progress - TAIL);
export const isFinished = (arc: Arc): boolean => arc.progress >= 1 + TAIL + HOLD;

/**
 * Opacity of the destination label: it fades up as the head lands, holds, and
 * fades out as the arc retires.
 */
export function labelOpacity(arc: Arc): number {
  const t = (arc.progress - 1) / (TAIL + HOLD);
  if (t <= 0 || t >= 1) return 0;

  const rising = Math.min(1, t / 0.12);
  const falling = t > 0.72 ? Math.max(0, 1 - (t - 0.72) / 0.28) : 1;
  return rising * falling;
}

/** Departure ring size, 0 to 1, or null once it has finished expanding. */
export function departureRing(arc: Arc): number | null {
  return arc.progress < RING ? arc.progress / RING : null;
}

/** Arrival ring size, 0 to 1, or null before the head lands. */
export function arrivalRing(arc: Arc): number | null {
  if (arc.progress < 1) return null;
  const t = (arc.progress - 1) / RING;
  return t <= 1 ? t : null;
}

export class ArcSystem {
  readonly #points: readonly Anchor[];
  readonly #random: Random;
  readonly #maxArcs: number;
  readonly #interval: number;
  readonly #minSpan: number;

  #arcs: Arc[] = [];
  #sinceSpawn = 0;

  constructor(points: readonly Anchor[], random: Random, options: ArcSystemOptions = {}) {
    this.#points = points;
    this.#random = random;
    this.#maxArcs = options.maxArcs ?? 6;
    this.#interval = options.interval ?? 34;
    this.#minSpan = options.minSpan ?? 0.7;
  }

  get arcs(): readonly Arc[] {
    return this.#arcs;
  }

  /** Advances every arc, retires the finished ones, and spawns on schedule. */
  step(scale = 1): void {
    for (const arc of this.#arcs) arc.progress += arc.speed * scale;
    this.#arcs = this.#arcs.filter((arc) => !isFinished(arc));

    this.#sinceSpawn += scale;
    if (this.#sinceSpawn < this.#interval) return;

    this.#sinceSpawn = 0;
    const arc = this.#createArc();
    if (arc && this.#arcs.length < this.#maxArcs) this.#arcs.push(arc);
  }

  #createArc(): Arc | null {
    if (this.#points.length < 2) return null;

    // A handful of tries, then give up for this interval: rejecting short hops
    // matters more than guaranteeing an arc on every tick.
    for (let attempt = 0; attempt < 8; attempt++) {
      const from = this.#points[Math.floor(this.#random() * this.#points.length)];
      const to = this.#points[Math.floor(this.#random() * this.#points.length)];
      if (!from || !to || from === to) continue;

      const span = angleBetween(from.vector, to.vector);
      if (span < this.#minSpan) continue;

      // Long journeys take longer, but not proportionally — a route across the
      // planet should not feel like it has stalled.
      return { from, to, span, progress: 0, speed: 0.011 / (0.6 + span * 0.35) };
    }

    return null;
  }
}
