import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { anchors } from '../src/features/globe/cities.ts';
import { GlobeField, layoutFor, sampleScaleFor } from '../src/features/globe/globe-field.ts';
import { installCanvas, sizeElement, type RecordingContext } from './helpers/canvas.ts';
import { installFrameClock, type FrameClock } from './helpers/frames.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

describe('layoutFor', () => {
  it('crops the planet against the left edge on a wide screen', () => {
    const layout = layoutFor(1440, 900, 0.66);

    // Bigger than the frame and anchored left: the viewer sees a curve, not a
    // marble, and the right of the frame stays clear for the wordmark.
    expect(layout.radius * 2).toBeGreaterThan(900);
    expect(layout.cx).toBeLessThan(1440 * 0.2);
    expect(layout.cx + layout.radius).toBeLessThan(1440 * 0.72);
  });

  it('crops against the bottom on a phone, leaving the type on open sky', () => {
    const layout = layoutFor(375, 812, 0.6);

    // Only a curve of the planet crosses the bottom of the frame: its top edge
    // has to clear the wordmark and the line under it.
    expect(layout.cy - layout.radius).toBeGreaterThan(812 * 0.68);
    expect(layout.cy - layout.radius).toBeLessThan(812);
  });

  it('never collapses to nothing', () => {
    expect(layoutFor(0, 0, 0.66).radius).toBeGreaterThan(0);
  });
});

describe('sampleScaleFor', () => {
  it('trades resolution for frame time, never the other way round', () => {
    // Quality is a sample size here, not a count: a slower machine gets a
    // softer heat map rather than a sparser one.
    expect(sampleScaleFor(1)).toBeLessThan(sampleScaleFor(0.5));
    expect(sampleScaleFor(1)).toBe(3);
    expect(sampleScaleFor(0.35)).toBe(6);
  });

  it('clamps a nonsense quality', () => {
    expect(sampleScaleFor(4)).toBe(3);
    expect(sampleScaleFor(-1)).toBe(6);
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

    expect(context.images).toBeGreaterThan(0);
    expect(context.clears).toBeGreaterThan(0);
  });

  it('draws arcs once traffic has had time to depart', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);
    const before = context.strokes;

    for (let i = 0; i < 200; i++) clock.tick();

    expect(context.strokes).toBeGreaterThan(before);
  });

  it('names the city an arc has reached', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);

    for (let i = 0; i < 400; i++) clock.tick();

    expect(context.texts.length).toBeGreaterThan(0);
    // Names are drawn as they are written in the city table, not shouted.
    expect(context.texts.every((text) => text !== text.toUpperCase())).toBe(true);
    expect(context.texts.every((text) => anchors.some((a) => a.name === text))).toBe(true);
  });

  it('keeps labels inside the canvas on a narrow screen', () => {
    stubEnvironment(false);
    sizeElement(canvas, 390, 844);
    field = new GlobeField(canvas);

    for (let i = 0; i < 900; i++) clock.tick();

    // Every label that was drawn has to fit. The renderer takes whichever side
    // of its anchor has room, and nudges the label back in when neither does.
    expect(context.texts.length).toBeGreaterThan(0);
    for (const [text, x] of context.textPositions) {
      const width = text.length * 6;
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x + width, text).toBeLessThanOrEqual(390);
    }
  });

  it('stops drawing when the hero scrolls away, and resumes when it returns', () => {
    stubEnvironment(false);
    field = new GlobeField(canvas);
    for (let i = 0; i < 30; i++) clock.tick();

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: false }]);
    const drawn = context.images;
    for (let i = 0; i < 20; i++) clock.tick();

    expect(context.images).toBe(drawn);

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: true }]);
    clock.tick();

    expect(context.images).toBeGreaterThan(drawn);
  });

  it('paints a still frame and never starts a loop when motion is reduced', () => {
    stubEnvironment(true);
    field = new GlobeField(canvas);

    expect(context.images).toBeGreaterThan(0);
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

    expect(context.images).toBe(0);
  });
});
