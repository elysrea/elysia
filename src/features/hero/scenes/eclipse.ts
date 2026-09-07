import { mulberry32 } from '../../../lib/random.ts';
import { createStars, twinkle, type Star } from '../../globe/stars.ts';
import type { Scene, SceneLayout } from '../scene.ts';

/**
 * An eclipse: a black body with a corona burning around it.
 *
 * The whole effect is four radial gradients and a filled circle. It is here as
 * the counter-proposal to the planet — the same celestial register with none of
 * the literal geography, and almost none of the cost.
 */
export interface EclipseView {
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export function layoutFor(width: number, height: number, horizon: number): EclipseView {
  const narrow = width < 720;
  const radius = Math.max(
    60,
    narrow ? Math.min(width * 0.34, height * 0.2) : Math.min(width * 0.19, height * 0.3),
  );

  return {
    width,
    height,
    cx: width * (narrow ? 0.5 : 0.33),
    cy: height * horizon - radius * (narrow ? 1.6 : 0.35),
    radius,
  };
}

/** Corona layers: inner and tight, outer and broad. */
const LAYERS: readonly { reach: number; alpha: number; rate: number; tint: string }[] = [
  { reach: 1.35, alpha: 0.5, rate: 0.21, tint: '255,206,170' },
  { reach: 1.9, alpha: 0.26, rate: -0.14, tint: '236,140,150' },
  { reach: 2.7, alpha: 0.14, rate: 0.09, tint: '168,120,225' },
  { reach: 3.8, alpha: 0.07, rate: -0.05, tint: '110,86,190' },
];

export class EclipseScene implements Scene {
  readonly #seed: number;
  #view: EclipseView = { width: 0, height: 0, cx: 0, cy: 0, radius: 0 };
  #stars: Star[] = [];
  #seconds = 0;

  readonly stillSteps = 400;

  constructor(seed = 0x1d0e) {
    this.#seed = seed;
  }

  layout({ width, height, horizon }: SceneLayout): void {
    this.#view = layoutFor(width, height, horizon);
    this.#stars = createStars(width, height, mulberry32(this.#seed ^ 0x51a3), { density: 2200 });
  }

  step(scale: number): void {
    this.#seconds += scale / 60;
  }

  draw(context: CanvasRenderingContext2D, rise: number): void {
    const { width, height, cx, cy, radius } = this.#view;
    if (width === 0 || height === 0) return;

    context.globalCompositeOperation = 'lighter';

    for (const star of this.#stars) {
      const alpha = twinkle(star, this.#seconds) * rise;
      if (alpha <= 0.01) continue;
      context.fillStyle = `rgba(226,220,255,${alpha.toFixed(3)})`;
      context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }

    // Each layer breathes at its own rate and in its own direction, so the
    // corona never repeats a shape you can catch.
    for (const layer of LAYERS) {
      const breath = 1 + Math.sin(this.#seconds * layer.rate) * 0.06;
      const outer = radius * layer.reach * breath;

      const glow = context.createRadialGradient(cx, cy, radius * 0.94, cx, cy, outer);
      glow.addColorStop(0, `rgba(${layer.tint},${(layer.alpha * rise).toFixed(3)})`);
      glow.addColorStop(0.45, `rgba(${layer.tint},${(layer.alpha * 0.28 * rise).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${layer.tint},0)`);

      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, outer, 0, Math.PI * 2);
      context.fill();
    }

    // The body last, and opaque: an eclipse is defined by what it blocks.
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = '#04020a';
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = 'lighter';
    const rim = context.createRadialGradient(cx, cy, radius * 0.965, cx, cy, radius * 1.03);
    rim.addColorStop(0, 'rgba(255,236,208,0)');
    rim.addColorStop(0.5, `rgba(255,238,214,${(0.85 * rise).toFixed(3)})`);
    rim.addColorStop(1, 'rgba(255,236,208,0)');
    context.fillStyle = rim;
    context.beginPath();
    context.arc(cx, cy, radius * 1.03, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = 'source-over';
  }
}
