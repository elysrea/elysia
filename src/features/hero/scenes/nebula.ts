import { mulberry32 } from '../../../lib/random.ts';
import { buildRamp } from '../ramp.ts';
import { createStars, twinkle, type Star } from '../stars.ts';
import { fbm, makeNoise, type Noise2D } from '../noise.ts';
import type { Scene, SceneLayout } from '../scene.ts';

/**
 * A drifting nebula: domain-warped noise through a baked colour ramp.
 *
 * It renders coarser than the screen and is drawn back scaled up. Nothing can
 * be precomputed — the field moves — so the sample grid is coarse, and the
 * browser's smoothing does the rest.
 */
export function sampleScaleFor(quality: number): number {
  const clamped = Math.min(1, Math.max(0.35, quality));
  return Math.round(6 + (1 - clamped) * 8);
}

/** Noise units across the frame. Larger means smaller, busier structures. */
const FIELD = 2.4;

export class NebulaScene implements Scene {
  readonly #ramp: Uint8Array;
  readonly #noise: Noise2D;
  readonly #warp: Noise2D;
  readonly #offscreen: HTMLCanvasElement;
  readonly #seed: number;

  #offscreenContext: CanvasRenderingContext2D | null = null;
  #buffer: ImageData | null = null;
  #cols = 0;
  #rows = 0;
  #scale = 6;
  #width = 0;
  #height = 0;
  #stars: Star[] = [];
  #seconds = 0;

  constructor(seed = 0x1d0e) {
    this.#seed = seed;
    this.#ramp = buildRamp();
    this.#noise = makeNoise(seed);
    this.#warp = makeNoise(seed ^ 0x9e37);
    this.#offscreen = document.createElement('canvas');
  }

  layout({ width, height, quality }: SceneLayout): void {
    this.#width = width;
    this.#height = height;
    this.#scale = sampleScaleFor(quality);
    this.#cols = Math.max(0, Math.ceil(width / this.#scale));
    this.#rows = Math.max(0, Math.ceil(height / this.#scale));

    const context = this.#offscreenContext ?? this.#offscreen.getContext('2d');
    this.#offscreenContext = context;

    if (context && this.#cols > 0 && this.#rows > 0) {
      this.#offscreen.width = this.#cols;
      this.#offscreen.height = this.#rows;
      this.#buffer = context.createImageData(this.#cols, this.#rows);
    } else {
      this.#buffer = null;
    }

    this.#stars = createStars(width, height, mulberry32(this.#seed ^ 0x51a3), { density: 3200 });
  }

  step(scale: number): void {
    this.#seconds += scale / 60;
  }

  draw(context: CanvasRenderingContext2D, rise: number): void {
    if (this.#width === 0 || this.#height === 0) return;

    this.#paint(rise);

    if (this.#buffer && this.#offscreenContext) {
      this.#offscreenContext.putImageData(this.#buffer, 0, 0);
      context.globalCompositeOperation = 'source-over';
      context.imageSmoothingEnabled = true;
      context.drawImage(this.#offscreen, 0, 0, this.#width, this.#height);
    }

    // The field drifts, so sooner or later a bright filament passes under the
    // wordmark. The type sits in the middle, so the scrim is a soft well in the
    // middle rather than a wash down one side — it has to darken where the
    // words are without flattening the corners the nebula is doing its work in.
    const scrim = context.createRadialGradient(
      this.#width * 0.5,
      this.#height * 0.46,
      0,
      this.#width * 0.5,
      this.#height * 0.46,
      Math.max(this.#width, this.#height) * 0.62,
    );
    scrim.addColorStop(0, `rgba(5,5,6,${(0.74 * rise).toFixed(3)})`);
    scrim.addColorStop(0.45, `rgba(5,5,6,${(0.44 * rise).toFixed(3)})`);
    scrim.addColorStop(1, 'rgba(5,5,6,0)');
    context.fillStyle = scrim;
    context.fillRect(0, 0, this.#width, this.#height);

    context.globalCompositeOperation = 'lighter';
    for (const star of this.#stars) {
      const alpha = twinkle(star, this.#seconds) * rise;
      if (alpha <= 0.01) continue;
      context.fillStyle = `rgba(230,231,236,${alpha.toFixed(3)})`;
      context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }
    context.globalCompositeOperation = 'source-over';
  }

  #paint(rise: number): void {
    const buffer = this.#buffer;
    if (!buffer) return;

    const target = buffer.data;
    const drift = this.#seconds * 0.035;
    const aspect = this.#height === 0 ? 1 : this.#width / this.#height;

    for (let r = 0; r < this.#rows; r++) {
      const v = (r / this.#rows) * FIELD;

      for (let c = 0; c < this.#cols; c++) {
        const u = (c / this.#cols) * FIELD * aspect;

        // Domain warping: sample the field at a position that is itself
        // decided by the field. It is what turns bland cloud into filament.
        const wx = fbm(this.#warp, u + drift, v - drift * 0.6, 2);
        const wy = fbm(this.#warp, u - drift * 0.4, v + drift, 2);
        const value = fbm(this.#noise, u + wx * 1.6, v + wy * 1.6, 3);

        // Push the midtones down so the frame reads as mostly empty space with
        // structure in it, rather than as an evenly cloudy sky.
        const shaped = Math.min(1, Math.max(0, (value - 0.34) * 1.9));
        const entry = ((shaped * 255) | 0) * 3;

        const out = (r * this.#cols + c) * 4;
        target[out] = this.#ramp[entry]! * rise;
        target[out + 1] = this.#ramp[entry + 1]! * rise;
        target[out + 2] = this.#ramp[entry + 2]! * rise;
        target[out + 3] = 255;
      }
    }
  }
}
