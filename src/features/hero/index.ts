import { NebulaScene } from './scenes/nebula.ts';
import type { Scene } from './scene.ts';

export { SceneHost, type SceneHostOptions } from './host.ts';
export type { Scene, SceneLayout, SceneFactory } from './scene.ts';
export { NebulaScene } from './scenes/nebula.ts';
export { fbm, makeNoise } from './noise.ts';
export { buildRamp } from './ramp.ts';
export { createStars, starCount, twinkle, type Star } from './stars.ts';

/**
 * The hero, built.
 *
 * There is one treatment, and this is it. The site briefly carried four behind
 * a `?hero=` switch; they made the landing page feel undecided, and the three
 * that lost took a whole globe renderer with them when they went.
 */
export function createHero(seed = 0x1d0e): Scene {
  return new NebulaScene(seed);
}
