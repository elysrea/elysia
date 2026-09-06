import { vi } from 'vitest';

/**
 * A recording 2D context. happy-dom has no canvas implementation, and the
 * question these tests ask is not "what colour is pixel 12" but "did the field
 * draw, and did it stop when it should".
 */
export interface RecordingContext {
  readonly strokes: number;
  readonly clears: number;
  readonly transforms: [number, number, number, number, number, number][];
}

export function installCanvas(): { context: RecordingContext; restore: () => void } {
  const record = { strokes: 0, clears: 0, transforms: [] as RecordingContext['transforms'] };

  const context = {
    setTransform: (...args: RecordingContext['transforms'][number]) => {
      record.transforms.push(args);
    },
    clearRect: () => {
      record.clears++;
    },
    stroke: () => {
      record.strokes++;
    },
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method -- stashed to restore, never called
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as never;

  return {
    context: record,
    restore() {
      HTMLCanvasElement.prototype.getContext = original;
    },
  };
}

/** Gives an element a fixed CSS size, which happy-dom otherwise reports as 0. */
export function sizeElement(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: height, configurable: true });
}
