/**
 * A fixed-timestep animation loop.
 *
 * The original page advanced its simulation by a constant amount per frame, so
 * the wind blew twice as fast on a 120Hz display and slowed to a crawl when the
 * machine was busy. Here the loop accumulates real elapsed time and runs whole
 * simulation steps, which makes motion identical everywhere.
 */

export const FIXED_STEP_MS = 1000 / 60;

/** Frames longer than this (tab restore, a stalled main thread) are not replayed. */
export const MAX_FRAME_MS = 100;

export interface StepPlan {
  /** Whole simulation steps to run this frame. */
  readonly steps: number;
  /** Time carried into the next frame. */
  readonly accumulator: number;
}

/**
 * Splits elapsed time into whole steps plus a remainder.
 * Pure, so the spiral-of-death guard is testable without a browser.
 */
export function planSteps(
  accumulator: number,
  frameMs: number,
  step: number = FIXED_STEP_MS,
  maxSteps = 5,
): StepPlan {
  const elapsed = Math.min(Math.max(frameMs, 0), MAX_FRAME_MS);
  const total = accumulator + elapsed;
  const steps = Math.min(Math.floor(total / step), maxSteps);
  return { steps, accumulator: total - steps * step };
}

export interface RenderLoopOptions {
  /** Advance the simulation by one fixed step. */
  readonly onStep: (stepMs: number) => void;
  /** Draw the current state. Receives the measured frame duration. */
  readonly onRender: (frameMs: number) => void;
  readonly step?: number;
  readonly maxSteps?: number;
}

export class RenderLoop {
  #options: RenderLoopOptions;
  #handle: number | null = null;
  #accumulator = 0;
  #last = 0;

  constructor(options: RenderLoopOptions) {
    this.#options = options;
  }

  get running(): boolean {
    return this.#handle !== null;
  }

  start(): void {
    if (this.#handle !== null) return;
    this.#last = performance.now();
    this.#accumulator = 0;
    this.#handle = requestAnimationFrame(this.#frame);
  }

  stop(): void {
    if (this.#handle === null) return;
    cancelAnimationFrame(this.#handle);
    this.#handle = null;
  }

  #frame = (now: number): void => {
    const frameMs = now - this.#last;
    this.#last = now;

    const step = this.#options.step ?? FIXED_STEP_MS;
    const plan = planSteps(this.#accumulator, frameMs, step, this.#options.maxSteps ?? 5);
    this.#accumulator = plan.accumulator;

    for (let i = 0; i < plan.steps; i++) {
      this.#options.onStep(step);
    }

    this.#options.onRender(frameMs);
    this.#handle = requestAnimationFrame(this.#frame);
  };
}
