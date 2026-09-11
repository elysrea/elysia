import { readRatioToken } from '../../lib/dom.ts';
import { RenderLoop } from '../../lib/loop.ts';
import { onReducedMotionChange, prefersReducedMotion } from '../../lib/motion.ts';
import { QualityGovernor } from '../../lib/quality.ts';
import type { Scene } from './scene.ts';

export interface SceneHostOptions {
  readonly seed?: number;
  /** Device pixel ratio ceiling. Above 2 the cost is real and the gain is not. */
  readonly maxPixelRatio?: number;
  /** Fallback if `--horizon` cannot be read from the cascade. */
  readonly horizon?: number;
  /** Where the effect opens on the quality scale, 0-1. */
  readonly initialQuality?: number;
}

/** How fast a scene fades up on first load, per fixed step. */
const RISE_RATE = 0.006;
/** Faster on a swap: the visitor asked for this one and is waiting for it. */
const SWAP_RISE_RATE = 0.022;
/** Steps a scene is run forward before the reduced-motion still frame. */
const DEFAULT_STILL_STEPS = 620;

/**
 * Runs one scene on one canvas.
 *
 * The host decides *whether* to draw; the scene decides *what*. Nothing here
 * knows about planets or aurorae, which is what makes the hero swappable.
 */
export class SceneHost {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #options: SceneHostOptions;
  #scene: Scene;
  readonly #governor: QualityGovernor;
  readonly #loop: RenderLoop;
  readonly #teardown: (() => void)[] = [];

  #rise = 0;
  #riseRate = RISE_RATE;
  #quality: number;
  #onScreen = true;
  #reduced: boolean;
  #resizeTimer: number | undefined;
  // The canvas's CSS size, measured on resize and read every frame from here.
  #width = 0;
  #height = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene, options: SceneHostOptions = {}) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('SceneHost: 2D canvas context unavailable');

    this.#canvas = canvas;
    this.#context = context;
    this.#scene = scene;
    this.#options = options;
    this.#reduced = prefersReducedMotion();
    this.#quality = options.initialQuality ?? 0.8;
    this.#governor = new QualityGovernor({ initial: this.#quality });

    this.#loop = new RenderLoop({
      onStep: () => {
        this.#rise = Math.min(1, this.#rise + this.#riseRate);
        this.#scene.step(1);
      },
      onRender: (frameMs) => {
        this.#draw();
        this.#applyQuality(this.#governor.record(frameMs));
      },
    });

    this.#measure();
    this.#observe();
    this.#start();
  }

  /**
   * Swaps in a different scene on the same canvas.
   *
   * The old one is released, the new one is laid out at the current size and
   * fades up quickly — this happens because someone clicked, so it should feel
   * like an answer rather than an entrance.
   */
  setScene(scene: Scene): void {
    if (scene === this.#scene) return;

    this.#scene.destroy?.();
    this.#scene = scene;
    this.#rise = 0;
    this.#riseRate = SWAP_RISE_RATE;
    this.#governor.reset();

    this.#measure();
    if (this.#reduced) this.#drawStill();
    else this.#start();
  }

  destroy(): void {
    this.#loop.stop();
    clearTimeout(this.#resizeTimer);
    for (const off of this.#teardown) off();
    this.#teardown.length = 0;
    this.#scene.destroy?.();
  }

  // --- lifecycle ---------------------------------------------------------

  #observe(): void {
    const resizeObserver = new ResizeObserver(() => {
      // Resizing reallocates buffers; coalesce the bursts from a drag.
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = window.setTimeout(() => {
        this.#measure();
        this.#governor.reset();
        if (this.#reduced) this.#drawStill();
      }, 180);
    });
    resizeObserver.observe(this.#canvas);
    this.#teardown.push(() => resizeObserver.disconnect());

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.#onScreen = entries[0]?.isIntersecting ?? true;
        this.#start();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(this.#canvas);
    this.#teardown.push(() => intersectionObserver.disconnect());

    const onVisibility = (): void => {
      this.#start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.#teardown.push(() => document.removeEventListener('visibilitychange', onVisibility));

    this.#teardown.push(
      onReducedMotionChange((reduced) => {
        this.#reduced = reduced;
        this.#rise = reduced ? 1 : 0;
        this.#start();
      }),
    );
  }

  #start(): void {
    const shouldRun = this.#onScreen && !document.hidden && !this.#reduced;

    if (!shouldRun) {
      this.#loop.stop();
      // A still frame is the reduced-motion experience, not an empty canvas.
      if (this.#reduced && this.#onScreen) this.#drawStill();
      return;
    }

    this.#loop.start();
  }

  #measure(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, this.#options.maxPixelRatio ?? 2);
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    this.#width = width;
    this.#height = height;
    if (width === 0 || height === 0) return;

    // Every read before any write. Resizing the backing store invalidates
    // style, and reading --horizon after it forced a second recalculation:
    // 32ms on desktop, 40ms on a throttled phone.
    const horizon = readRatioToken(this.#canvas, '--horizon', this.#options.horizon ?? 0.66);

    this.#canvas.width = Math.round(width * ratio);
    this.#canvas.height = Math.round(height * ratio);
    this.#context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.#context.clearRect(0, 0, width, height);

    this.#scene.layout({ width, height, horizon, quality: this.#quality });
  }

  #applyQuality(quality: number): void {
    if (Math.abs(quality - this.#quality) < 0.01) return;
    this.#quality = quality;
    this.#measure();
  }

  #draw(): void {
    // From the cache #measure keeps, never from the element. Reading the
    // element's size here forced a layout on every frame whenever anything
    // else on the page had dirtied it since the last one — the largest forced
    // reflow Lighthouse found, 127ms on desktop and 153ms on a phone.
    const width = this.#width;
    const height = this.#height;
    if (width === 0 || height === 0) return;

    this.#context.clearRect(0, 0, width, height);
    this.#scene.draw(this.#context, this.#rise);
  }

  #drawStill(): void {
    if (this.#width === 0) return;

    this.#rise = 1;
    const steps = this.#scene.stillSteps ?? DEFAULT_STILL_STEPS;
    for (let i = 0; i < steps; i++) this.#scene.step(1);
    this.#draw();
  }
}
