import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobeField, dotsFor, layoutFor } from '../src/features/globe/globe-field.ts';
import { installCanvas, sizeElement, type RecordingContext } from './helpers/canvas.ts';
import { installFrameClock, type FrameClock } from './helpers/frames.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

describe('layoutFor', () => {
  it('keeps the globe clear of the wordmark on a wide screen', () => {
    const layout = layoutFor(1440, 900, 0.66);

    expect(layout.cx).toBeLessThan(1440 * 0.4);
    expect(layout.cx + layout.radius).toBeLessThan(1440 * 0.62);
  });

  it('lifts the globe above the horizon, where the sky is dark enough to read', () => {
    const layout = layoutFor(1280, 720, 0.66);

    expect(layout.cy).toBeLessThan(720 * 0.66);
  });

  it('centres and shrinks on a phone', () => {
    const layout = layoutFor(375, 812, 0.6);

    expect(layout.cx).toBe(375 / 2);
    expect(layout.radius * 2).toBeLessThanOrEqual(375);
  });

  it('never collapses to nothing', () => {
    expect(layoutFor(0, 0, 0.66).radius).toBeGreaterThan(0);
  });
});

describe('dotsFor', () => {
  it('scales with the viewport, within bounds', () => {
    expect(dotsFor(375, 700)).toBeLessThan(dotsFor(2560, 1440));
    expect(dotsFor(200, 200)).toBe(900);
    expect(dotsFor(5000, 5000)).toBe(3000);
  });
});

describe('GlobeField', () => {
  let canvasHarness: ReturnType<typeof installCanvas>;
  let context: RecordingContext;
  let clock: FrameClock;
  let observers: ObserverHarness;
  let canvas: HTMLCanvasElement;
  let field: GlobeField | undefined;
  const resizeObservers: { disconnected: boolean }[] = [];

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
    sizeElement(canvas, 1280, 720);
    document.body.append(canvas);
  });

  afterEach(() => {
    field?.destroy();
    field = undefined;
    canvasHarness.restore();
    clock.restore();
    document.body.innerHTML = '';
  });

  it('sizes its backing store for the device pixel ratio', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);

    expect(canvas.width).toBe(2560);
    expect(canvas.height).toBe(1440);
    expect(context.transforms.at(-1)).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('draws the surface as soon as it is running', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);

    clock.tick();

    expect(context.rects).toBeGreaterThan(100);
    expect(context.clears).toBeGreaterThan(0);
  });

  it('draws arcs once traffic has had time to depart', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);
    const before = context.strokes;

    for (let i = 0; i < 200; i++) clock.tick();

    expect(context.strokes).toBeGreaterThan(before);
  });

  it('stops drawing when the hero scrolls away, and resumes when it returns', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);
    for (let i = 0; i < 30; i++) clock.tick();

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: false }]);
    const drawn = context.rects;
    for (let i = 0; i < 20; i++) clock.tick();

    expect(context.rects).toBe(drawn);

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: true }]);
    clock.tick();

    expect(context.rects).toBeGreaterThan(drawn);
  });

  it('paints a still frame and never starts a loop when motion is reduced', () => {
    stubEnvironment(true);
    field = new GlobeField(canvas);

    expect(context.rects).toBeGreaterThan(100);
    expect(clock.pending).toBe(0);
  });

  it('releases every observer and the pending frame on destroy', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);
    clock.tick();

    field.destroy();
    field = undefined;

    expect(clock.cancelled).toBe(1);
    expect(resizeObservers.every((observer) => observer.disconnected)).toBe(true);
  });

  it('reports a missing 2D context instead of failing silently', () => {
    stubEnvironment(false);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    expect(() => new GlobeField(canvas)).toThrow(/context unavailable/);
  });

  it('draws nothing at all when the canvas has no size', () => {
    stubEnvironment(false);
    sizeElement(canvas, 0, 0);
    field = new GlobeField(canvas);

    clock.tick();

    expect(context.rects).toBe(0);
  });
});
