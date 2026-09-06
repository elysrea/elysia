import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WindField } from '../src/features/wind/wind-field.ts';
import { installCanvas, sizeElement, type RecordingContext } from './helpers/canvas.ts';
import { installFrameClock, type FrameClock } from './helpers/frames.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

let canvasHarness: ReturnType<typeof installCanvas>;
let context: RecordingContext;
let clock: FrameClock;
let observers: ObserverHarness;
let canvas: HTMLCanvasElement;
let field: WindField | undefined;

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

describe('WindField', () => {
  it('sizes its backing store for the device pixel ratio', () => {
    stubEnvironment(false);
    field = new WindField(canvas);

    expect(canvas.width).toBe(2560);
    expect(canvas.height).toBe(1440);
    expect(context.transforms.at(-1)).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('draws once the wind has risen far enough to be visible', () => {
    stubEnvironment(false);
    field = new WindField(canvas);

    for (let i = 0; i < 120; i++) clock.tick();

    expect(context.strokes).toBeGreaterThan(0);
  });

  it('stops drawing when the hero scrolls away, and resumes when it returns', () => {
    stubEnvironment(false);
    field = new WindField(canvas);
    for (let i = 0; i < 120; i++) clock.tick();

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: false }]);
    const drawnBeforeOffscreen = context.strokes;
    for (let i = 0; i < 20; i++) clock.tick();

    expect(context.strokes).toBe(drawnBeforeOffscreen);

    observers.observing(canvas)?.emit([{ target: canvas, isIntersecting: true }]);
    for (let i = 0; i < 20; i++) clock.tick();

    expect(context.strokes).toBeGreaterThan(drawnBeforeOffscreen);
  });

  it('paints a still frame and never starts a loop when motion is reduced', () => {
    stubEnvironment(true);
    field = new WindField(canvas);

    expect(context.strokes).toBeGreaterThan(0);
    expect(clock.pending).toBe(0);
  });

  it('releases every observer and the pending frame on destroy', () => {
    stubEnvironment(false);
    field = new WindField(canvas);
    clock.tick();

    field.destroy();
    field = undefined;

    expect(clock.cancelled).toBe(1);
    expect(resizeObservers.every((observer) => observer.disconnected)).toBe(true);
  });

  it('reports a missing 2D context instead of failing silently', () => {
    stubEnvironment(false);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    expect(() => new WindField(canvas)).toThrow(/context unavailable/);
  });
});
