import { readRatioToken } from '../../lib/dom.ts';
import { RenderLoop } from '../../lib/loop.ts';
import { onReducedMotionChange, prefersReducedMotion } from '../../lib/motion.ts';
import { QualityGovernor } from '../../lib/quality.ts';
import { mulberry32 } from '../../lib/random.ts';
import { strokeFor } from './palette.ts';
import { ParticleField, type FieldBounds } from './particles.ts';

export interface WindFieldOptions {
  /** Fixed seed keeps the opening frames identical between loads. */
  readonly seed?: number;
  /** Device pixel ratio ceiling. Above 2 the cost is real and the gain is not. */
  readonly maxPixelRatio?: number;
  /** Fallback if `--horizon` cannot be read from the cascade. */
  readonly horizon?: number;
}

/** Trail persistence: how much of the previous frame is erased each step. */
const TRAIL_FADE = 0.052;
/** How fast the wind builds, per fixed step. */
const RISE_RATE = 0.0055;
/** Steps composited into the single frame shown under reduced motion. */
const STILL_EXPOSURE_STEPS = 260;

/**
 * Draws the drifting light over the hero.
 *
 * Responsibilities are deliberately narrow: simulation lives in `ParticleField`,
 * colour in `palette.ts`, timing in `RenderLoop`. This class owns the canvas,
 * the browser events, and the decision of when not to run at all.
 */
export class WindField {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #options: WindFieldOptions;
  readonly #governor = new QualityGovernor();
  readonly #loop: RenderLoop;
  readonly #teardown: (() => void)[] = [];

  #field: ParticleField;
  #bounds: FieldBounds = { width: 0, height: 0, horizonY: 0 };
  #rise = 0;
  #onScreen = true;
  #reduced: boolean;
  #resizeTimer: number | undefined;

  constructor(canvas: HTMLCanvasElement, options: WindFieldOptions = {}) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('WindField: 2D canvas context unavailable');

    this.#canvas = canvas;
    this.#context = context;
    this.#options = options;
    this.#reduced = prefersReducedMotion();
    this.#field = new ParticleField(this.#bounds, mulberry32(options.seed ?? 0x5eed));

    this.#loop = new RenderLoop({
      onStep: () => {
        this.#rise = Math.min(1, this.#rise + RISE_RATE);
        this.#field.step(this.#rise);
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

  /** Removes every listener and stops the loop. */
  destroy(): void {
    this.#loop.stop();
    clearTimeout(this.#resizeTimer);
    for (const off of this.#teardown) off();
    this.#teardown.length = 0;
  }

  // --- setup -------------------------------------------------------------

  #observe(): void {
    const resizeObserver = new ResizeObserver(() => {
      // Resizing reallocates the backing store; coalesce bursts from a drag.
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = window.setTimeout(() => {
        this.#measure();
        this.#governor.reset();
        if (this.#reduced) this.#drawStill();
      }, 180);
    });
    resizeObserver.observe(this.#canvas);
    this.#teardown.push(() => resizeObserver.disconnect());

    // Nothing is drawn once the hero has scrolled away.
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

  // --- canvas ------------------------------------------------------------

  #measure(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, this.#options.maxPixelRatio ?? 2);
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.#canvas.width = Math.round(width * ratio);
    this.#canvas.height = Math.round(height * ratio);
    this.#context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const horizon = readRatioToken(this.#canvas, '--horizon', this.#options.horizon ?? 0.66);
    this.#bounds = { width, height, horizonY: height * horizon };

    this.#field.resize(this.#bounds);
    this.#context.clearRect(0, 0, width, height);
  }

  #applyQuality(scale: number): void {
    const target = Math.round(this.#field.capacity * scale);
    if (target !== this.#field.particles.length) this.#field.setCount(target);
  }

  #draw(): void {
    const context = this.#context;
    const { width, height } = this.#bounds;
    if (width === 0 || height === 0) return;

    // Erasing a little alpha each frame leaves trails without a full repaint.
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'lighter';
    context.lineWidth = 0.9;
    context.lineCap = 'round';

    for (const particle of this.#field.particles) {
      const stroke = strokeFor(particle, this.#bounds, this.#rise);
      if (!stroke) continue;

      context.strokeStyle = stroke;
      context.beginPath();
      context.moveTo(particle.prevX, particle.prevY);
      context.lineTo(particle.x, particle.y);
      context.stroke();
    }

    context.globalCompositeOperation = 'source-over';
  }

  /**
   * Reduced motion still gets the image, just not the movement.
   *
   * The simulation is run forward to its steady state with the same trail fade
   * the live version uses, so the frozen frame looks like the animation paused
   * rather than a separate, denser illustration.
   */
  #drawStill(): void {
    const { width, height } = this.#bounds;
    if (width === 0 || height === 0) return;

    this.#rise = 1;
    this.#context.clearRect(0, 0, width, height);
    for (let i = 0; i < STILL_EXPOSURE_STEPS; i++) {
      this.#field.step(1);
      this.#draw();
    }
  }
}
