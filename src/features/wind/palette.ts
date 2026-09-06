import type { FieldBounds, Particle } from './particles.ts';

/**
 * Colour and opacity for one particle.
 *
 * Everything here is a function of position, so the field lights itself: the
 * closer a particle sits to the horizon the warmer and brighter it is, and the
 * further right it drifts the more it picks up the glow behind the wordmark.
 */

/** 1 at the horizon, falling to 0 toward the top and bottom of the frame. */
export function glowAt(y: number, bounds: FieldBounds): number {
  const half = bounds.height * 0.5;
  if (half <= 0) return 0;

  const distance = Math.abs(y - bounds.horizonY) / half;
  return Math.max(0, 1 - distance * distance * 1.1);
}

/** Brightening toward the right of the frame, where the light source sits. */
export function leanAt(x: number, bounds: FieldBounds): number {
  if (bounds.width <= 0) return 0.72;
  return 0.72 + (x / bounds.width) * 0.46;
}

/** Particles dim over their last ~70 steps so they leave rather than vanish. */
export function lifeFade(life: number): number {
  return Math.min(1, Math.max(0, life / 70));
}

/** Below this the stroke is indistinguishable from the sky, so it is skipped. */
const MIN_ALPHA = 0.002;

/**
 * The canvas stroke for a particle, or `null` when it would be invisible.
 * Returning null lets the renderer skip the draw call entirely.
 */
export function strokeFor(particle: Particle, bounds: FieldBounds, rise: number): string | null {
  const glow = glowAt(particle.y, bounds);
  const alpha = (0.035 + glow * 0.3) * lifeFade(particle.life) * rise * leanAt(particle.x, bounds);
  if (alpha <= MIN_ALPHA) return null;

  const r = Math.round(120 + glow * 112);
  const g = Math.round(96 + glow * 122);
  const b = Math.round(175 + glow * 80);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
