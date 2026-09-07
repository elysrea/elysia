import { AuroraScene } from './scenes/aurora.ts';
import { EclipseScene } from './scenes/eclipse.ts';
import { NebulaScene } from './scenes/nebula.ts';
import { PlanetScene } from './scenes/planet.ts';
import type { Scene, SceneFactory } from './scene.ts';

export { SceneHost, type SceneHostOptions } from './host.ts';
export type { Scene, SceneLayout, SceneFactory } from './scene.ts';
export { AuroraScene, CURTAINS, curtainEdge } from './scenes/aurora.ts';
export { EclipseScene } from './scenes/eclipse.ts';
export { NebulaScene } from './scenes/nebula.ts';
export { PlanetScene } from './scenes/planet.ts';
export { fbm, makeNoise } from './noise.ts';

/**
 * The hero treatments, by name.
 *
 * Four heroes is three too many for a finished site — this exists so the
 * choice can be made by looking rather than by arguing, and the losers deleted.
 */
export const scenes: Readonly<Record<string, SceneFactory>> = {
  planet: (seed) => new PlanetScene(seed),
  eclipse: (seed) => new EclipseScene(seed),
  aurora: (seed) => new AuroraScene(seed),
  nebula: (seed) => new NebulaScene(seed),
};

export const DEFAULT_SCENE = 'planet';

export const sceneNames: readonly string[] = Object.keys(scenes);

/**
 * Picks a scene from `?hero=`, falling back to the default for anything
 * unrecognised — a query string is user input, not configuration.
 */
export function resolveScene(search: string, seed = 0x1d0e): { name: string; scene: Scene } {
  const requested = new URLSearchParams(search).get('hero');

  // `in` would also match inherited keys, and `?hero=constructor` would then
  // resolve to Object's constructor and be called as a scene factory.
  const name = requested && Object.hasOwn(scenes, requested) ? requested : DEFAULT_SCENE;
  const factory = scenes[name] ?? scenes[DEFAULT_SCENE]!;

  return { name, scene: factory(seed) };
}
