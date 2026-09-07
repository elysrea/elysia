import { AuroraScene } from './scenes/aurora.ts';
import { EclipseScene } from './scenes/eclipse.ts';
import { NebulaScene } from './scenes/nebula.ts';
import { PlanetScene } from './scenes/planet.ts';
import { DEFAULT_HERO, HERO_CATALOGUE } from './catalogue.ts';
import type { Scene, SceneFactory } from './scene.ts';

export { SceneHost, type SceneHostOptions } from './host.ts';
export type { Scene, SceneLayout, SceneFactory } from './scene.ts';
export { AuroraScene, CURTAINS, curtainEdge } from './scenes/aurora.ts';
export { EclipseScene } from './scenes/eclipse.ts';
export { NebulaScene } from './scenes/nebula.ts';
export { PlanetScene } from './scenes/planet.ts';
export { fbm, makeNoise } from './noise.ts';
export { HERO_CATALOGUE, DEFAULT_HERO, type HeroEntry } from './catalogue.ts';
export { initHeroSwitcher } from './switcher.ts';

/**
 * The hero treatments, by name. The catalogue lists them; this builds them.
 */
export const scenes: Readonly<Record<string, SceneFactory>> = {
  nebula: (seed) => new NebulaScene(seed),
  planet: (seed) => new PlanetScene(seed),
  eclipse: (seed) => new EclipseScene(seed),
  aurora: (seed) => new AuroraScene(seed),
};

export const DEFAULT_SCENE = DEFAULT_HERO;

export const sceneNames: readonly string[] = HERO_CATALOGUE.map((entry) => entry.name);

/** Builds one scene by name, falling back to the default. */
export function createScene(name: string, seed = 0x1d0e): Scene {
  const factory = Object.hasOwn(scenes, name) ? scenes[name] : undefined;
  return (factory ?? scenes[DEFAULT_SCENE]!)(seed);
}

/**
 * Picks a scene from `?hero=`, falling back to the default for anything
 * unrecognised — a query string is user input, not configuration.
 */
export function resolveScene(search: string, seed = 0x1d0e): { name: string; scene: Scene } {
  const requested = new URLSearchParams(search).get('hero');

  // `in` would also match inherited keys, and `?hero=constructor` would then
  // resolve to Object's constructor and be called as a scene factory.
  const name = requested && Object.hasOwn(scenes, requested) ? requested : DEFAULT_SCENE;

  return { name, scene: createScene(name, seed) };
}
