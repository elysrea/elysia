import type { HeatField } from './heat.ts';
import type { Vec3, Viewport } from './geo.ts';

/**
 * Renders the planet as a heat map, one screen sample at a time.
 *
 * The expensive half of that — turning a pixel back into a point on a sphere —
 * does not change while the planet turns. For a given pixel the view-space
 * normal is fixed, so its latitude, its lighting and its coverage at the limb
 * are all constant; only its longitude moves, and it moves by the same amount
 * for every pixel. So all of it is computed once per resize, and a frame is an
 * array read, a lerp and a lookup per sample.
 *
 * Samples are coarser than pixels and the result is drawn back scaled up, which
 * is both the reason this is cheap and the reason the map looks soft.
 */
export interface SurfaceTables {
  readonly cols: number;
  readonly rows: number;
  /** Where the sample grid sits in canvas pixels, and how big a sample is. */
  readonly left: number;
  readonly top: number;
  readonly scale: number;
  /** Row offset into the heat field, or -1 where the sample misses the globe. */
  readonly row: Int32Array;
  /** Column in the heat field before the planet's rotation is applied. */
  readonly column: Float32Array;
  /** Lambert term for the fixed light, 0-1. */
  readonly shade: Float32Array;
  /** Coverage at the limb, for an edge that is not a staircase. */
  readonly coverage: Float32Array;
}

export interface SurfaceOptions {
  /** Canvas pixels per sample. Larger is cheaper and softer. */
  readonly scale?: number;
  /** Clip the sample grid to this box, so an oversized planet costs nothing
   *  for the part of it that is off screen. */
  readonly clipWidth: number;
  readonly clipHeight: number;
}

const DEG = 180 / Math.PI;

export function buildTables(
  view: Viewport,
  tilt: number,
  light: Vec3,
  heat: HeatField,
  options: SurfaceOptions,
): SurfaceTables {
  const scale = Math.max(1, options.scale ?? 3);

  const left = Math.max(0, Math.floor(view.cx - view.radius));
  const top = Math.max(0, Math.floor(view.cy - view.radius));
  const right = Math.min(options.clipWidth, Math.ceil(view.cx + view.radius));
  const bottom = Math.min(options.clipHeight, Math.ceil(view.cy + view.radius));

  const cols = Math.max(0, Math.ceil((right - left) / scale));
  const rows = Math.max(0, Math.ceil((bottom - top) / scale));

  const row = new Int32Array(cols * rows).fill(-1);
  const column = new Float32Array(cols * rows);
  const shade = new Float32Array(cols * rows);
  const coverage = new Float32Array(cols * rows);

  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  // One sample wide, expressed in units of the sphere's radius.
  const feather = view.radius > 0 ? scale / view.radius : 0;

  for (let r = 0; r < rows; r++) {
    const y = top + (r + 0.5) * scale;
    const ny = (view.cy - y) / view.radius;

    for (let c = 0; c < cols; c++) {
      const x = left + (c + 0.5) * scale;
      const nx = (x - view.cx) / view.radius;

      const radial = nx * nx + ny * ny;
      const i = r * cols + c;
      if (radial >= 1 + feather) continue;

      const nz = Math.sqrt(Math.max(0, 1 - radial));

      // Undo the tilt to recover the point on the spinning sphere.
      const uy = ny * cosTilt + nz * sinTilt;
      const uz = nz * cosTilt - ny * sinTilt;

      const lat = Math.asin(Math.min(1, Math.max(-1, uy))) * DEG;
      const lon = Math.atan2(nx, uz) * DEG;

      const ty = Math.min(
        heat.height - 1,
        Math.max(0, Math.floor(((90 - lat) / 180) * heat.height)),
      );

      row[i] = ty * heat.width;
      column[i] = ((lon + 180) / 360) * heat.width;
      shade[i] = Math.max(0, nx * light.x + ny * light.y + nz * light.z);
      coverage[i] = Math.min(1, Math.max(0, (1 + feather - radial) / Math.max(feather, 1e-6)));
    }
  }

  return { cols, rows, left, top, scale, row, column, shade, coverage };
}

export interface SurfacePaint {
  /** Radians the planet has turned. */
  readonly spin: number;
  /** Global fade-in, 0-1. */
  readonly rise: number;
  /**
   * Floor under the Lambert term. Kept high: this is a map before it is a
   * planet, and a hard terminator would hide half of it.
   */
  readonly ambient?: number;
}

/**
 * Writes one frame of the heat map into `target`.
 *
 * Longitude is sampled with a lerp between neighbouring columns: stepping whole
 * columns would make the rotation visibly click round at this texture size.
 */
/** Packed RGBA writes need to know which end the bytes go. */
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/**
 * Writes one frame of the heat map into `target`.
 *
 * Longitude is sampled with a lerp between neighbouring columns: stepping whole
 * columns would make the rotation visibly click round at this texture size.
 *
 * The loop is written for speed rather than for looks. Four byte stores per
 * sample became one 32-bit store, and the wrap is an add and a compare instead
 * of a float modulo — together about three times faster, which is the
 * difference between this fitting in a frame and not.
 */
export function paintSurface(
  tables: SurfaceTables,
  heat: HeatField,
  ramp: Uint8Array,
  target: Uint8ClampedArray,
  paint: SurfacePaint,
): void {
  const { cols, rows, row, column, shade, coverage } = tables;
  const ambient = paint.ambient ?? 0.62;
  const width = heat.width;
  const data = heat.data;
  const count = cols * rows;

  // The planet turns east, so the surface under a fixed pixel moves west.
  let shift = ((-paint.spin / (Math.PI * 2)) * width) % width;
  if (shift < 0) shift += width;

  const packed = LITTLE_ENDIAN
    ? new Uint32Array(target.buffer, target.byteOffset, target.length >> 2)
    : null;

  for (let i = 0; i < count; i++) {
    const base = row[i]!;

    if (base < 0) {
      if (packed) packed[i] = 0;
      else target[i * 4 + 3] = 0;
      continue;
    }

    let c = column[i]! + shift;
    if (c >= width) c -= width;

    const c0 = c | 0;
    const c1 = c0 + 1 === width ? 0 : c0 + 1;
    const t = c - c0;

    const value = (data[base + c0]! * (1 - t) + data[base + c1]! * t) | 0;
    const lit = ambient + (1 - ambient) * shade[i]!;
    const entry = value * 3;

    const r = (ramp[entry]! * lit) | 0;
    const g = (ramp[entry + 1]! * lit) | 0;
    const b = (ramp[entry + 2]! * lit) | 0;
    const a = (255 * coverage[i]! * paint.rise) | 0;

    if (packed) {
      packed[i] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    } else {
      const out = i * 4;
      target[out] = r;
      target[out + 1] = g;
      target[out + 2] = b;
      target[out + 3] = a;
    }
  }
}
