import { mulberry32 } from '../../../lib/random.ts';
import type { Scene, SceneLayout } from '../scene.ts';
import {
  ArcSystem,
  RING,
  arcHead,
  arcTail,
  arrivalRing,
  departureRing,
  labelOpacity,
  type Arc,
} from '../../globe/arcs.ts';
import { anchors } from '../../globe/cities.ts';
import { buildHeat, buildRamp, type HeatField } from '../../globe/heat.ts';
import { buildTables, paintSurface, type SurfaceTables } from '../../globe/surface.ts';
import { decodeMask } from '../../globe/land.ts';
import { createStars, twinkle, type Star } from '../../globe/stars.ts';
import {
  arcPoint,
  isOccluded,
  normalize,
  orient,
  project,
  type Vec3,
  type Viewport,
} from '../../globe/geo.ts';

/** Radians per fixed step: one rotation every ~65 seconds. */
const SPIN_RATE = 0.0016;
/** Axial tilt toward the viewer, so the north pole is visible. */
const TILT = 0.38;
/** Segments per arc. Enough that a great circle reads as a curve. */
const ARC_SEGMENTS = 20;

/** The sky's glow sits to the upper right; the planet is lit to match. */
const LIGHT = normalize({ x: 0.62, y: 0.34, z: 0.71 });

export interface PlanetView extends Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * Places the planet.
 *
 * It is deliberately larger than the frame and anchored off the left edge, so
 * the viewer sees a curve of a body they are near rather than a marble on a
 * shelf. The right of the frame stays clear for the wordmark.
 */
export function layoutFor(width: number, height: number, horizon: number): PlanetView {
  const narrow = width < 720;

  const radius = Math.max(
    80,
    narrow ? Math.min(width * 1.15, height * 0.55) : Math.min(width * 0.52, height * 0.95),
  );

  // Narrow: the planet is pushed down until only a curve of it crosses the
  // bottom of the frame, which keeps the type off the continents.
  const cy = narrow ? height * 0.72 + radius : height * horizon - radius * 0.1;

  return { width, height, cx: width * (narrow ? 0.42 : 0.08), cy, radius };
}

/**
 * Canvas pixels per heat sample for a given quality, smaller being better.
 *
 * The heat map is rendered coarser than the screen and drawn back scaled up,
 * so quality is a resolution rather than a count: when frames run long the
 * samples get bigger, which is cheaper and only softer.
 */
export function sampleScaleFor(quality: number): number {
  const clamped = Math.min(1, Math.max(0.35, quality));
  return Math.round(3 + (1 - clamped) * 5);
}

/**
 * A slowly turning planet, drawn as a heat map, with traffic arcing between
 * its cities.
 */
export class PlanetScene implements Scene {
  readonly #arcs: ArcSystem;
  readonly #heat: HeatField;
  readonly #ramp: Uint8Array;
  readonly #offscreen: HTMLCanvasElement;
  readonly #seed: number;

  #offscreenContext: CanvasRenderingContext2D | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #view: PlanetView = { width: 0, height: 0, cx: 0, cy: 0, radius: 0 };
  #stars: Star[] = [];
  #tables: SurfaceTables | null = null;
  #buffer: ImageData | null = null;
  #spin = 0;
  #seconds = 0;
  #rise = 0;

  constructor(seed = 0x1d0e) {
    this.#seed = seed;
    this.#arcs = new ArcSystem(anchors, mulberry32(seed));
    this.#heat = buildHeat(decodeMask(), anchors);
    this.#ramp = buildRamp();
    this.#offscreen = document.createElement('canvas');
  }

  layout({ width, height, horizon, quality }: SceneLayout): void {
    this.#view = layoutFor(width, height, horizon);

    this.#tables = buildTables(this.#view, TILT, LIGHT, this.#heat, {
      scale: sampleScaleFor(quality),
      clipWidth: width,
      clipHeight: height,
    });

    const { cols, rows } = this.#tables;
    const context = this.#offscreenContext ?? this.#offscreen.getContext('2d');
    this.#offscreenContext = context;

    if (context && cols > 0 && rows > 0) {
      this.#offscreen.width = cols;
      this.#offscreen.height = rows;
      this.#buffer = context.createImageData(cols, rows);
    } else {
      this.#buffer = null;
    }

    this.#stars = createStars(width, height, mulberry32(this.#seed ^ 0x51a3));
  }

  step(scale: number): void {
    this.#seconds += scale / 60;
    this.#spin += SPIN_RATE * scale;
    this.#arcs.step(scale);
  }

  draw(context: CanvasRenderingContext2D, rise: number): void {
    this.#context = context;
    this.#rise = rise;

    const { width, height, cx, cy, radius } = this.#view;
    if (width === 0 || height === 0) return;

    // The halo adds light to the sky; the planet has to cover it, so the two
    // cannot share a composite mode.
    context.globalCompositeOperation = 'lighter';
    this.#drawStars();
    this.#drawHalo(cx, cy, radius);

    context.globalCompositeOperation = 'source-over';
    this.#drawHeat();

    context.globalCompositeOperation = 'lighter';
    this.#drawRim(cx, cy, radius);
    this.#drawArcs();

    // Text is drawn normally: additive type on a bright sky turns to mush.
    context.globalCompositeOperation = 'source-over';
    this.#drawLabels();
  }

  /** A soft glow around the limb, so the planet sits in the sky, not on it. */
  #drawHalo(cx: number, cy: number, radius: number): void {
    const context = this.#context!;
    const halo = context.createRadialGradient(cx, cy, radius * 0.97, cx, cy, radius * 1.13);
    halo.addColorStop(0, `rgba(158,126,224,${(0.16 * this.#rise).toFixed(3)})`);
    halo.addColorStop(0.45, `rgba(120,96,195,${(0.06 * this.#rise).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(120,96,195,0)');

    context.fillStyle = halo;
    context.beginPath();
    context.arc(cx, cy, radius * 1.13, 0, Math.PI * 2);
    context.fill();
  }

  /** The sky behind everything. Drawn first; the opaque planet covers it. */
  #drawStars(): void {
    const context = this.#context!;

    for (const star of this.#stars) {
      const alpha = twinkle(star, this.#seconds) * this.#rise;
      if (alpha <= 0.01) continue;

      context.fillStyle = `rgba(226,220,255,${alpha.toFixed(3)})`;
      context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }
  }

  /**
   * The planet itself: one `putImageData` into a small offscreen canvas, then
   * one `drawImage` to scale it up. The browser's own smoothing does the
   * blurring that makes a coarse sample grid read as a soft heat map.
   */
  #drawHeat(): void {
    const tables = this.#tables;
    const buffer = this.#buffer;
    const offscreen = this.#offscreenContext;
    if (!tables || !buffer || !offscreen || tables.cols === 0) return;

    paintSurface(tables, this.#heat, this.#ramp, buffer.data, {
      spin: this.#spin,
      rise: this.#rise,
    });
    offscreen.putImageData(buffer, 0, 0);

    this.#context!.imageSmoothingEnabled = true;
    this.#context!.drawImage(
      this.#offscreen,
      tables.left,
      tables.top,
      tables.cols * tables.scale,
      tables.rows * tables.scale,
    );
  }

  /** The lit edge, brightest where the sky's own light falls. */
  #drawRim(cx: number, cy: number, radius: number): void {
    const context = this.#context!;
    const rim = context.createLinearGradient(cx - radius, cy + radius, cx + radius, cy - radius);
    rim.addColorStop(0, `rgba(233,221,255,${(0.03 * this.#rise).toFixed(3)})`);
    rim.addColorStop(0.55, `rgba(233,221,255,${(0.1 * this.#rise).toFixed(3)})`);
    rim.addColorStop(1, `rgba(233,221,255,${(0.26 * this.#rise).toFixed(3)})`);

    context.strokeStyle = rim;
    context.lineWidth = Math.max(0.8, radius * 0.004);
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
  }

  #drawArcs(): void {
    for (const arc of this.#arcs.arcs) {
      this.#drawArc(arc);
      this.#drawRings(arc);
    }
  }

  #drawArc(arc: Arc): void {
    const context = this.#context!;
    const head = arcHead(arc);
    const tail = arcTail(arc);
    if (head <= tail) return;

    // Lift scales with distance: neighbours skim, hemispheres climb. Kept low
    // enough that an arc still reads as hugging the planet.
    const lift = 0.035 + arc.span * 0.055;
    context.lineWidth = Math.max(0.8, this.#view.radius * 0.004);
    context.lineCap = 'round';

    let previous: { x: number; y: number } | null = null;

    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = tail + ((head - tail) * i) / ARC_SEGMENTS;
      const v = orient(arcPoint(arc.from.vector, arc.to.vector, t, lift), this.#spin, TILT);

      if (isOccluded(v)) {
        previous = null;
        continue;
      }

      const { x, y } = project(v, this.#view);

      if (previous) {
        // Brightest at the head, so the arc reads as travelling, not drawn.
        const along = i / ARC_SEGMENTS;
        const alpha = 0.5 * along * along * this.#rise;
        context.strokeStyle = `rgba(233,221,255,${alpha.toFixed(3)})`;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(x, y);
        context.stroke();
      }

      previous = { x, y };
    }

    if (arc.progress < 1 && previous) {
      const glow = this.#view.radius * 0.02;
      const gradient = context.createRadialGradient(
        previous.x,
        previous.y,
        0,
        previous.x,
        previous.y,
        glow,
      );
      gradient.addColorStop(0, `rgba(233,221,255,${(0.75 * this.#rise).toFixed(3)})`);
      gradient.addColorStop(1, 'rgba(233,221,255,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(previous.x, previous.y, glow, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** Expanding rings at departure and arrival. */
  #drawRings(arc: Arc): void {
    const rings: [Vec3, number | null][] = [
      [arc.from.vector, departureRing(arc)],
      [arc.to.vector, arrivalRing(arc)],
    ];

    for (const [anchor, t] of rings) {
      if (t === null) continue;

      const v = orient(anchor, this.#spin, TILT);
      if (v.z <= 0) continue;

      const { x, y } = project(v, this.#view);
      const alpha = (1 - t) * 0.55 * this.#rise * v.z;
      if (alpha <= 0.01) continue;

      this.#context!.strokeStyle = `rgba(233,221,255,${alpha.toFixed(3)})`;
      this.#context!.lineWidth = Math.max(0.7, this.#view.radius * 0.003);
      this.#context!.beginPath();
      this.#context!.arc(x, y, t * this.#view.radius * RING * 0.5, 0, Math.PI * 2);
      this.#context!.stroke();
    }
  }

  /**
   * Names the place an arc just reached.
   *
   * The label is what turns the animation from decoration into information:
   * something arrived, and here is where. It is skipped near the limb, where
   * the anchor is about to rotate out of view and the text would be orphaned.
   */
  #drawLabels(): void {
    const context = this.#context!;
    const { radius } = this.#view;
    const size = Math.max(10, Math.min(14, radius * 0.046));

    // Two arcs can land on the same city at once. Drawing its name twice
    // doubles the alpha and reads as a bolder, misaligned label.
    const drawn = new Set<string>();

    for (const arc of this.#arcs.arcs) {
      const alpha = labelOpacity(arc) * this.#rise;
      if (alpha <= 0.02 || drawn.has(arc.to.name)) continue;
      drawn.add(arc.to.name);

      const v = orient(arc.to.vector, this.#spin, TILT);
      if (v.z <= 0.12) continue;

      const { x, y } = project(v, this.#view);
      const margin = 12;

      // The planet is larger than the frame, so a point can face the viewer and
      // still be off the edge of it. A label pointing outside the canvas has
      // nothing to point at.
      if (
        x < margin ||
        x > this.#view.width - margin ||
        y < margin ||
        y > this.#view.height - margin
      ) {
        continue;
      }

      const offset = Math.max(9, radius * 0.045);
      const label = arc.to.name;

      context.font = `${size.toFixed(1)}px "IBM Plex Mono", ui-monospace, monospace`;
      context.textBaseline = 'middle';
      // Not supported everywhere; where it is, it matches the mono type
      // elsewhere on the page.
      context.letterSpacing = '0.04em';

      // A label near either edge would be clipped, so it takes whichever side
      // of its anchor it fits on. On a narrow screen with a large planet
      // neither side may fit, and then it is nudged back into the frame.
      const textWidth = context.measureText(label).width;
      const width = this.#view.width;
      const rightX = x + offset;
      const leftX = x - offset - textWidth;

      let flip: boolean;
      let textX: number;

      if (rightX + textWidth <= width - margin) {
        flip = false;
        textX = rightX;
      } else if (leftX >= margin) {
        flip = true;
        textX = leftX;
      } else {
        flip = x > width / 2;
        textX = Math.max(margin, Math.min(flip ? leftX : rightX, width - margin - textWidth));
      }

      context.fillStyle = `rgba(233,221,255,${(alpha * 0.95).toFixed(3)})`;
      context.fillText(label, textX, y);
      context.letterSpacing = '0px';

      // A short leader line, so the name belongs to the point and not the sky.
      const reach = flip ? -offset : offset;
      context.strokeStyle = `rgba(233,221,255,${(alpha * 0.3).toFixed(3)})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + reach * 0.32, y);
      context.lineTo(x + reach * 0.82, y);
      context.stroke();
    }
  }
}
