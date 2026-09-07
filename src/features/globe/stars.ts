import type { Random } from '../../lib/random.ts';

/**
 * The field the globe hangs in.
 *
 * Stars are generated once per resize from the seeded PRNG and then only read:
 * position and brightness never change, so a frame costs one `fillRect` each
 * plus a sine for the twinkle. They are drawn before the planet, which is
 * opaque, so nothing shows through it.
 */
export interface Star {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Base brightness before the twinkle is applied. */
  readonly alpha: number;
  /** Offset into the twinkle cycle, so the sky does not pulse in unison. */
  readonly phase: number;
  /** How strongly this star twinkles, 0 to 1. */
  readonly variance: number;
}

export interface StarFieldOptions {
  /** One star per this many square pixels. */
  readonly density?: number;
  readonly min?: number;
  readonly max?: number;
}

export function starCount(width: number, height: number, options: StarFieldOptions = {}): number {
  const density = options.density ?? 2600;
  return Math.round(
    Math.min(options.max ?? 520, Math.max(options.min ?? 90, (width * height) / density)),
  );
}

export function createStars(
  width: number,
  height: number,
  random: Random,
  options: StarFieldOptions = {},
): Star[] {
  const stars: Star[] = [];

  for (let i = 0, n = starCount(width, height, options); i < n; i++) {
    // Cubing the roll makes most stars faint and a few genuinely bright, which
    // is what stops a starfield reading as evenly scattered dust.
    const roll = random();
    const brightness = roll * roll * roll;

    stars.push({
      x: random() * width,
      y: random() * height,
      size: 0.6 + brightness * 1.5,
      alpha: 0.14 + brightness * 0.72,
      phase: random() * Math.PI * 2,
      variance: 0.25 + random() * 0.55,
    });
  }

  return stars;
}

/** Brightness of one star at a moment, in [0, 1]. */
export function twinkle(star: Star, seconds: number): number {
  const wave = Math.sin(seconds * 1.1 + star.phase);
  return Math.max(0, star.alpha * (1 - star.variance * 0.5 + star.variance * 0.5 * wave));
}
