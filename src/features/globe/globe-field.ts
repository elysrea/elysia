import { readRatioToken } from '../../lib/dom.ts';
import { FIXED_STEP_MS, RenderLoop } from '../../lib/loop.ts';
import { onReducedMotionChange, prefersReducedMotion } from '../../lib/motion.ts';
import { QualityGovernor } from '../../lib/quality.ts';
import { mulberry32 } from '../../lib/random.ts';
import {
  ArcSystem,
  RING,
  arcHead,
  arcTail,
  arrivalRing,
  departureRing,
  labelOpacity,
  type Arc,
} from './arcs.ts';
import { anchors } from './cities.ts';
import {
  arcPoint,
  dot,
  toVector,
  isOccluded,
  normalize,
  orient,
  project,
  type Vec3,
  type Viewport,
} from './geo.ts';
import { landPoints } from './land.ts';
import { createStars, twinkle, type Star } from './stars.ts';

export interface GlobeFieldOptions {
  readonly seed?: number;
  readonly maxPixelRatio?: number;
  readonly horizon?: number;
}

/** Radians per fixed step: one rotation every ~65 seconds. */
const SPIN_RATE = 0.0016;
/** Axial tilt toward the viewer, so the north pole is visible. */
const TILT = 0.38;
/** How fast the scene fades up, per fixed step. */
const RISE_RATE = 0.006;
/** Steps composited before the reduced-motion still frame is captured. */
const STILL_STEPS = 620;
/** Segments per arc. Enough that a great circle reads as a curve. */
const ARC_SEGMENTS = 20;

/** The sky's glow sits to the upper right; the globe is lit to match. */
const LIGHT = normalize({ x: 0.62, y: 0.34, z: 0.71 });

export interface GlobeLayout extends Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * Places the planet.
 *
 * It is deliberately larger than the frame and anchored off the left edge, so
 * the viewer sees a curve rather than a ball: a body you are near, not a
 * marble you are holding. The right of the frame stays clear for the wordmark.
 *
 * On a narrow screen the same idea is rotated — the planet is cropped by the
 * bottom instead, and the wordmark sits over open sky above it.
 */
export function layoutFor(width: number, height: number, horizon: number): GlobeLayout {
  const narrow = width < 720;

  const radius = Math.max(
    80,
    narrow ? Math.min(width * 1.15, height * 0.55) : Math.min(width * 0.52, height * 0.95),
  );

  // Narrow: the planet is pushed down until only a curve of it crosses the
  // bottom of the frame, which keeps the type off the continents. The top edge
  // is placed directly rather than derived from the horizon, because it is the
  // edge — not the centre — that has to clear the hero text.
  const cy = narrow ? height * 0.72 + radius : height * horizon - radius * 0.1;

  return { width, height, cx: width * (narrow ? 0.42 : 0.08), cy, radius };
}

/**
 * Dot budget for a globe of this radius, before quality scaling.
 *
 * It scales with the sphere's own area rather than the viewport's: an oversized
 * planet cropped by the frame needs far more points to keep its coastlines
 * legible, and a small one would waste them.
 */
export function dotsFor(radius: number): number {
  return Math.round(Math.min(6000, Math.max(900, (radius * radius) / 45)));
}

/**
 * A slowly turning globe with traffic arcing between its landmasses.
 *
 * The class owns the canvas, the browser events and the decision of when not to
 * run. Geometry lives in `geo.ts`, the connections in `arcs.ts`, the land in
 * `land.ts` — none of which know that a canvas exists.
 */
export class GlobeField {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #options: GlobeFieldOptions;
  readonly #governor = new QualityGovernor();
  readonly #loop: RenderLoop;
  readonly #teardown: (() => void)[] = [];

  #layout: GlobeLayout = { width: 0, height: 0, cx: 0, cy: 0, radius: 0 };
  #points: Vec3[] = [];
  #stars: Star[] = [];
  #arcs: ArcSystem;
  #spin = 0;
  #seconds = 0;
  #rise = 0;
  #quality = 1;
  #onScreen = true;
  #reduced: boolean;
  #resizeTimer: number | undefined;

  constructor(canvas: HTMLCanvasElement, options: GlobeFieldOptions = {}) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('GlobeField: 2D canvas context unavailable');

    this.#canvas = canvas;
    this.#context = context;
    this.#options = options;
    this.#reduced = prefersReducedMotion();
    this.#arcs = new ArcSystem(anchors, mulberry32(options.seed ?? 0x1d0e));

    this.#loop = new RenderLoop({
      onStep: () => this.#advance(1),
      onRender: (frameMs) => {
        this.#draw();
        this.#applyQuality(this.#governor.record(frameMs));
      },
    });

    this.#measure();
    this.#observe();
    this.#start();
  }

  destroy(): void {
    this.#loop.stop();
    clearTimeout(this.#resizeTimer);
    for (const off of this.#teardown) off();
    this.#teardown.length = 0;
  }

  // --- lifecycle ---------------------------------------------------------

  #observe(): void {
    const resizeObserver = new ResizeObserver(() => {
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
      if (this.#reduced && this.#onScreen) this.#drawStill();
      return;
    }

    this.#loop.start();
  }

  #advance(scale: number): void {
    this.#seconds += (scale * FIXED_STEP_MS) / 1000;
    this.#spin += SPIN_RATE * scale;
    this.#rise = Math.min(1, this.#rise + RISE_RATE * scale);
    this.#arcs.step(scale);
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
    this.#layout = layoutFor(width, height, horizon);
    this.#rebuild();
    this.#context.clearRect(0, 0, width, height);
  }

  /** Rebuilds the dot field and the sky. Arc endpoints are cities and fixed. */
  #rebuild(): void {
    const target = Math.round(dotsFor(this.#layout.radius) * this.#quality);
    this.#points = landPoints(target);
    this.#stars = createStars(
      this.#layout.width,
      this.#layout.height,
      mulberry32((this.#options.seed ?? 0x1d0e) ^ 0x51a3),
    );
  }

  #applyQuality(scale: number): void {
    // Rebuilding the lattice is not free, so ignore trivial adjustments.
    if (Math.abs(scale - this.#quality) < 0.05) return;
    this.#quality = scale;
    this.#rebuild();
  }

  #draw(): void {
    const context = this.#context;
    const { width, height, cx, cy, radius } = this.#layout;
    if (width === 0 || height === 0) return;

    context.clearRect(0, 0, width, height);

    // The halo adds light to the sky; the body has to cover it, so the two
    // cannot share a composite mode.
    context.globalCompositeOperation = 'lighter';
    this.#drawStars();
    this.#drawHalo(cx, cy, radius);

    context.globalCompositeOperation = 'source-over';
    this.#drawBody(cx, cy, radius);

    context.globalCompositeOperation = 'lighter';
    this.#drawGraticule();
    this.#drawRim(cx, cy, radius);
    this.#drawSurface();
    this.#drawArcs();

    // Text is drawn normally: additive type on a bright sky turns to mush.
    context.globalCompositeOperation = 'source-over';
    this.#drawLabels();
  }

  /** The sky behind everything. Drawn first; the opaque planet covers it. */
  #drawStars(): void {
    const context = this.#context;

    for (const star of this.#stars) {
      const alpha = twinkle(star, this.#seconds) * this.#rise;
      if (alpha <= 0.01) continue;

      context.fillStyle = `rgba(226,220,255,${alpha.toFixed(3)})`;
      context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }
  }

  /**
   * Meridians and parallels, very faint.
   *
   * The dots say where the land is; the graticule says the thing is a sphere
   * being turned. Without it the surface reads as a pattern printed on a disc.
   */
  #drawGraticule(): void {
    const context = this.#context;
    const alpha = 0.05 * this.#rise;
    if (alpha <= 0.004) return;

    context.strokeStyle = `rgba(190,170,240,${alpha.toFixed(3)})`;
    context.lineWidth = Math.max(0.5, this.#layout.radius * 0.0016);

    for (let meridian = 0; meridian < 12; meridian++) {
      this.#strokeCircle((t) => {
        const lon = (meridian / 12) * 360 - 180;
        return toVector({ lat: t * 180 - 90, lon });
      });
    }

    // Parallels stop short of the poles, where they collapse to a point.
    for (let parallel = 1; parallel < 6; parallel++) {
      this.#strokeCircle((t) => {
        const lat = (parallel / 6) * 180 - 90;
        return toVector({ lat, lon: t * 360 - 180 });
      });
    }
  }

  /** Strokes a curve on the sphere, skipping the parts behind it. */
  #strokeCircle(pointAt: (t: number) => Vec3, segments = 72): void {
    const context = this.#context;
    let drawing = false;

    context.beginPath();
    for (let i = 0; i <= segments; i++) {
      const v = orient(pointAt(i / segments), this.#spin, TILT);

      if (v.z <= 0) {
        drawing = false;
        continue;
      }

      const { x, y } = project(v, this.#layout);
      if (drawing) context.lineTo(x, y);
      else context.moveTo(x, y);
      drawing = true;
    }
    context.stroke();
  }

  /** A soft glow around the limb, so the globe sits in the sky, not on it. */
  #drawHalo(cx: number, cy: number, radius: number): void {
    const context = this.#context;
    const halo = context.createRadialGradient(cx, cy, radius * 0.97, cx, cy, radius * 1.13);
    halo.addColorStop(0, `rgba(158,126,224,${(0.16 * this.#rise).toFixed(3)})`);
    halo.addColorStop(0.45, `rgba(120,96,195,${(0.06 * this.#rise).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(120,96,195,0)');

    context.fillStyle = halo;
    context.beginPath();
    context.arc(cx, cy, radius * 1.13, 0, Math.PI * 2);
    context.fill();
  }

  /**
   * The body of the planet: an opaque, shaded disc.
   *
   * Without it the sky gradient shows straight through and the globe reads as a
   * wire sphere. The gradient is centred on the light rather than the middle of
   * the disc, which is what makes a flat circle look round.
   */
  #drawBody(cx: number, cy: number, radius: number): void {
    const context = this.#context;
    const lit = context.createRadialGradient(
      cx + LIGHT.x * radius * 0.68,
      cy - LIGHT.y * radius * 0.68,
      radius * 0.04,
      cx,
      cy,
      radius * 1.04,
    );
    lit.addColorStop(0, `rgba(52,30,92,${(0.92 * this.#rise).toFixed(3)})`);
    lit.addColorStop(0.22, `rgba(28,15,56,${(0.95 * this.#rise).toFixed(3)})`);
    lit.addColorStop(0.55, `rgba(12,6,27,${(0.97 * this.#rise).toFixed(3)})`);
    lit.addColorStop(1, `rgba(3,2,8,${(0.99 * this.#rise).toFixed(3)})`);

    context.fillStyle = lit;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
  }

  /** The lit edge, brightest where the sky's own light falls. */
  #drawRim(cx: number, cy: number, radius: number): void {
    const context = this.#context;
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

  /**
   * The landmasses, as dots.
   *
   * Only the near hemisphere is drawn: the body is opaque now, so a far-side
   * point would be behind a planet. That halves the work as well.
   */
  #drawSurface(): void {
    const context = this.#context;
    const { radius } = this.#layout;
    const size = Math.max(1, radius * 0.0044 + 0.5);

    for (const point of this.#points) {
      const v = orient(point, this.#spin, TILT);
      if (v.z <= 0) continue;

      const { x, y, depth } = project(v, this.#layout);
      const light = Math.max(0, dot(v, LIGHT));
      const alpha = (0.26 + light * 0.62) * this.#rise;
      if (alpha <= 0.004) continue;

      const s = size * (0.74 + depth * 0.36);
      context.fillStyle = `rgba(233,221,255,${alpha.toFixed(3)})`;
      context.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  #drawArcs(): void {
    for (const arc of this.#arcs.arcs) {
      this.#drawArc(arc);
      this.#drawRings(arc);
    }
  }

  #drawArc(arc: Arc): void {
    const context = this.#context;
    const head = arcHead(arc);
    const tail = arcTail(arc);
    if (head <= tail) return;

    // Lift scales with distance: neighbours skim, hemispheres climb. Kept low
    // enough that an arc still reads as hugging the planet.
    const lift = 0.035 + arc.span * 0.055;
    context.lineWidth = Math.max(0.8, this.#layout.radius * 0.004);
    context.lineCap = 'round';

    let previous: { x: number; y: number } | null = null;

    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = tail + ((head - tail) * i) / ARC_SEGMENTS;
      const v = orient(arcPoint(arc.from.vector, arc.to.vector, t, lift), this.#spin, TILT);

      if (isOccluded(v)) {
        previous = null;
        continue;
      }

      const { x, y } = project(v, this.#layout);

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
      const glow = this.#layout.radius * 0.02;
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

      const { x, y } = project(v, this.#layout);
      const alpha = (1 - t) * 0.55 * this.#rise * v.z;
      if (alpha <= 0.01) continue;

      this.#context.strokeStyle = `rgba(233,221,255,${alpha.toFixed(3)})`;
      this.#context.lineWidth = Math.max(0.7, this.#layout.radius * 0.003);
      this.#context.beginPath();
      this.#context.arc(x, y, t * this.#layout.radius * RING * 0.5, 0, Math.PI * 2);
      this.#context.stroke();
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
    const context = this.#context;
    const { radius } = this.#layout;
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

      const { x, y } = project(v, this.#layout);
      const margin = 12;

      // The planet is larger than the frame, so a point can face the viewer and
      // still be off the edge of it. A label pointing outside the canvas has
      // nothing to point at.
      if (
        x < margin ||
        x > this.#layout.width - margin ||
        y < margin ||
        y > this.#layout.height - margin
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
      const width = this.#layout.width;
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

  /**
   * Reduced motion gets the scene, not the movement: the simulation is run
   * forward far enough for arcs to be in flight, then drawn once.
   */
  #drawStill(): void {
    if (this.#layout.width === 0) return;

    this.#rise = 1;
    for (let i = 0; i < STILL_STEPS; i++) this.#advance(1);
    this.#draw();
  }
}
