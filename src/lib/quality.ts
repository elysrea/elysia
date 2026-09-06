/**
 * Keeps an effect inside a frame budget by scaling its own workload.
 *
 * A background animation should never be the reason a page drops frames. This
 * watches measured frame durations and hands back a scale in [min, 1] that the
 * effect applies to its particle count: it steps down quickly when frames run
 * long, and recovers slowly so the field does not visibly pulse.
 */
export interface QualityGovernorOptions {
  /** Frame budget in ms. 20ms leaves headroom under a 60Hz deadline. */
  readonly targetMs?: number;
  readonly sampleSize?: number;
  readonly minScale?: number;
  readonly decrement?: number;
  readonly increment?: number;
}

export class QualityGovernor {
  readonly #targetMs: number;
  readonly #sampleSize: number;
  readonly #minScale: number;
  readonly #decrement: number;
  readonly #increment: number;

  #samples: number[] = [];
  #scale = 1;

  constructor(options: QualityGovernorOptions = {}) {
    this.#targetMs = options.targetMs ?? 20;
    this.#sampleSize = options.sampleSize ?? 45;
    this.#minScale = options.minScale ?? 0.35;
    this.#decrement = options.decrement ?? 0.2;
    this.#increment = options.increment ?? 0.05;
  }

  get scale(): number {
    return this.#scale;
  }

  /** Discards history — call after a resize, when old timings mean nothing. */
  reset(): void {
    this.#samples = [];
  }

  /**
   * Records one frame. Returns the scale to use, which only changes once a
   * full window of samples has been collected.
   */
  record(frameMs: number): number {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return this.#scale;

    this.#samples.push(frameMs);
    if (this.#samples.length < this.#sampleSize) return this.#scale;

    const sorted = [...this.#samples].sort((a, b) => a - b);
    // The median ignores the one-off long frame that every page has.
    const median = sorted[Math.floor(sorted.length / 2)] ?? this.#targetMs;
    this.#samples = [];

    if (median > this.#targetMs) {
      this.#scale = Math.max(this.#minScale, this.#scale - this.#decrement);
    } else if (median < this.#targetMs * 0.7) {
      this.#scale = Math.min(1, this.#scale + this.#increment);
    }

    return this.#scale;
  }
}
