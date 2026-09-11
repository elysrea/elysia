import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHero } from '../src/features/hero/index.ts';
import { fbm, makeNoise } from '../src/features/hero/noise.ts';
import { SceneHost } from '../src/features/hero/host.ts';
import type { Scene, SceneLayout } from '../src/features/hero/scene.ts';
import { installCanvas, sizeElement, type RecordingContext } from './helpers/canvas.ts';
import { installFrameClock, type FrameClock } from './helpers/frames.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

describe('value noise', () => {
  const noise = makeNoise(7);

  it('stays in range', () => {
    for (let i = 0; i < 4000; i++) {
      const value = noise(i * 0.37, i * 0.11);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous: neighbours do not jump', () => {
    let worst = 0;
    for (let x = 0; x < 40; x += 0.01) {
      worst = Math.max(worst, Math.abs(noise(x, 3.2) - noise(x + 0.01, 3.2)));
    }

    expect(worst).toBeLessThan(0.06);
  });

  it('is deterministic per seed, and different across seeds', () => {
    expect(makeNoise(1)(2.5, 3.5)).toBe(makeNoise(1)(2.5, 3.5));
    expect(makeNoise(1)(2.5, 3.5)).not.toBe(makeNoise(2)(2.5, 3.5));
  });

  it('fbm stays in range and adds detail', () => {
    for (let i = 0; i < 500; i++) {
      const value = fbm(noise, i * 0.13, i * 0.29, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }

    // More octaves means more small-scale variation between close samples.
    const near = (octaves: number): number =>
      Math.abs(fbm(noise, 5, 5, octaves) - fbm(noise, 5.05, 5, octaves));

    expect(near(4)).toBeGreaterThan(near(1));
  });
});

describe('SceneHost', () => {
  let canvasHarness: ReturnType<typeof installCanvas>;
  let context: RecordingContext;
  let clock: FrameClock;
  let observers: ObserverHarness;
  let canvas: HTMLCanvasElement;
  let host: SceneHost | undefined;
  const resizeObservers: { disconnected: boolean }[] = [];

  /** A scene that records what the host asked it to do. */
  class SpyScene implements Scene {
    layouts: SceneLayout[] = [];
    steps = 0;
    draws = 0;
    destroyed = false;

    layout(layout: SceneLayout): void {
      this.layouts.push(layout);
    }
    step(): void {
      this.steps++;
    }
    draw(context: CanvasRenderingContext2D): void {
      this.draws++;
      context.fillRect(0, 0, 1, 1);
    }
    destroy(): void {
      this.destroyed = true;
    }
  }

  function stubEnvironment(reducedMotion: boolean): void {
    clock = installFrameClock();
    observers = installIntersectionObserver();

    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: reducedMotion && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {
          resizeObservers.push(this);
        }
        disconnected = false;
        observe(): void {
          // The harness triggers resizes directly.
        }
        disconnect(): void {
          this.disconnected = true;
        }
        trigger(): void {
          this.callback();
        }
      },
    );

    vi.stubGlobal('devicePixelRatio', 2);
  }

  beforeEach(() => {
    resizeObservers.length = 0;
    canvasHarness = installCanvas();
    context = canvasHarness.context;

    canvas = document.createElement('canvas');
    sizeElement(canvas, 1280, 800);
    document.body.append(canvas);
  });

  afterEach(() => {
    host?.destroy();
    host = undefined;
    canvasHarness.restore();
    clock.restore();
    document.body.innerHTML = '';
  });

  it('sizes the backing store for the device pixel ratio', () => {
    stubEnvironment(false);
    host = new SceneHost(canvas, new SpyScene());

    expect(canvas.width).toBe(2560);
    expect(canvas.height).toBe(1600);
    expect(context.transforms.at(-1)).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('lays the scene out before drawing it, and tells it the size', () => {
    stubEnvironment(false);
    const scene = new SpyScene();
    host = new SceneHost(canvas, scene);

    expect(scene.layouts[0]).toMatchObject({ width: 1280, height: 800 });
    expect(scene.draws).toBe(0);

    clock.tick();
    expect(scene.draws).toBe(1);
  });

  it('opens below full quality and lets the scene earn the rest', () => {
    stubEnvironment(false);
    const scene = new SpyScene();
    host = new SceneHost(canvas, scene);

    expect(scene.layouts[0]?.quality).toBeLessThan(1);

    // Cheap frames, sustained: the host should raise the budget.
    for (let i = 0; i < 400; i++) clock.tick(4);

    expect(scene.layouts.at(-1)?.quality).toBe(1);
  });

  it('clears the canvas each frame so a scene cannot leave a smear', () => {
    stubEnvironment(false);
    host = new SceneHost(canvas, new SpyScene());

    const before = context.clears;
    clock.tick();

    expect(context.clears).toBeGreaterThan(before);
  });

  it('never reads layout while animating', () => {
    stubEnvironment(false);
    host = new SceneHost(canvas, new SpyScene());

    // Count every layout read from here on. Size is measured on resize and
    // cached; a per-frame read forces a layout whenever anything else on the
    // page has dirtied it since the last frame.
    let reads = 0;
    for (const [prop, value] of [
      ['clientWidth', 1280],
      ['clientHeight', 800],
    ] as const) {
      Object.defineProperty(canvas, prop, {
        configurable: true,
        get: () => {
          reads++;
          return value;
        },
      });
    }

    for (let i = 0; i < 20; i++) clock.tick();

    expect(reads).toBe(0);
  });

  it('stops stepping the scene when the hero scrolls away', () => {
    stubEnvironment(false);
    const scene = new SpyScene();
    host = new SceneHost(canvas, scene);
    for (let i = 0; i < 10; i++) clock.tick();

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: false }]);
    const steps = scene.steps;
    for (let i = 0; i < 20; i++) clock.tick();

    expect(scene.steps).toBe(steps);
  });

  it('runs a scene forward and draws it once when motion is reduced', () => {
    stubEnvironment(true);
    const scene = new SpyScene();
    host = new SceneHost(canvas, scene);

    expect(scene.steps).toBeGreaterThan(100);
    expect(scene.draws).toBe(1);
    expect(clock.pending).toBe(0);
  });

  it('tells the scene to release itself on destroy', () => {
    stubEnvironment(false);
    const scene = new SpyScene();
    host = new SceneHost(canvas, scene);

    host.destroy();
    host = undefined;

    expect(scene.destroyed).toBe(true);
    expect(clock.cancelled).toBe(1);
    expect(resizeObservers.every((observer) => observer.disconnected)).toBe(true);
  });

  it('reports a missing 2D context instead of failing silently', () => {
    stubEnvironment(false);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    expect(() => new SceneHost(canvas, new SpyScene())).toThrow(/context unavailable/);
  });
});

describe('the nebula', () => {
  it('survives being laid out and drawn at any size', () => {
    const harness = installCanvas();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('expected a context');

    try {
      const scene = createHero(3);

      for (const [width, height] of [
        [1440, 900],
        [375, 812],
        [0, 0],
      ] as const) {
        scene.layout({ width, height, horizon: 0.66, quality: 0.8 });
        scene.step(1);
        expect(() => scene.draw(context, 1)).not.toThrow();
      }
    } finally {
      harness.restore();
    }
  });

  it('builds a fresh scene per call, so two hosts cannot share a star field', () => {
    expect(createHero(3)).not.toBe(createHero(3));
  });
});
