import type { Anchor } from './cities.ts';
import { isLand, type LandMask } from './land.ts';

/**
 * The planet's surface, baked once as an equirectangular heat field.
 *
 * Land gives a warm floor, cities add hotspots that fall off with distance, and
 * a blur turns the two-degree land mask into something with soft coastlines.
 * Baking it means the per-frame renderer only ever reads an array.
 */
export interface HeatField {
  readonly width: number;
  readonly height: number;
  /** Heat per cell, 0-255, row 0 at the north pole, column 0 at 180 west. */
  readonly data: Uint8Array;
}

export interface HeatOptions {
  readonly width?: number;
  readonly height?: number;
  /** Baseline heat over water and over land, before cities. */
  readonly ocean?: number;
  readonly land?: number;
  /** Radius of a city's influence, in degrees of great-circle distance. */
  readonly cityReach?: number;
  readonly cityWeight?: number;
  /** Box-blur radius in cells, applied twice. */
  readonly blur?: number;
}

const DEG = Math.PI / 180;

/** A city's share of the heat. Stable per name, so the map never shuffles. */
export function cityWeight(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return 0.55 + (Math.abs(hash) % 1000) / 1000 / 2.2;
}

/** Separable box blur, wrapping in longitude and clamping at the poles. */
function blur(data: Float32Array, width: number, height: number, radius: number): Float32Array {
  const pass = new Float32Array(data.length);
  const out = new Float32Array(data.length);
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let total = 0;
      for (let d = -radius; d <= radius; d++) {
        total += data[row + ((x + d + width) % width)] ?? 0;
      }
      pass[row + x] = total / span;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let total = 0;
      for (let d = -radius; d <= radius; d++) {
        const yy = Math.min(height - 1, Math.max(0, y + d));
        total += pass[yy * width + x] ?? 0;
      }
      out[y * width + x] = total / span;
    }
  }

  return out;
}

export function buildHeat(
  mask: LandMask,
  anchors: readonly Anchor[],
  options: HeatOptions = {},
): HeatField {
  const width = options.width ?? 512;
  const height = options.height ?? 256;
  const ocean = options.ocean ?? 0.12;
  const landBase = options.land ?? 0.46;
  const reach = options.cityReach ?? 16;
  const weight = options.cityWeight ?? 0.62;
  const radius = options.blur ?? 3;

  const field = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const lat = 90 - ((y + 0.5) / height) * 180;
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width) * 360 - 180;
      field[y * width + x] = isLand(mask, { lat, lon }) ? landBase : ocean;
    }
  }

  // Cities only touch cells inside their own bounding box: walking the whole
  // map per city would be forty times the work for the same result.
  const cosReach = Math.cos(reach * DEG);

  for (const anchor of anchors) {
    const lat = Math.asin(Math.min(1, Math.max(-1, anchor.vector.y))) / DEG;
    const lon = Math.atan2(anchor.vector.x, anchor.vector.z) / DEG;
    const intensity = weight * cityWeight(anchor.name);

    const sinCity = Math.sin(lat * DEG);
    const cosCity = Math.cos(lat * DEG);

    const latSpan = Math.ceil((reach / 180) * height);
    const lonSpan = Math.ceil((reach / Math.max(0.15, Math.cos(lat * DEG)) / 360) * width);

    const cy = Math.round(((90 - lat) / 180) * height);
    const cx = Math.round(((lon + 180) / 360) * width);

    // The longitude difference depends only on the column offset, so its
    // cosine is computed once per city rather than once per cell.
    const cosDelta = new Float64Array(lonSpan * 2 + 1);
    for (let dx = -lonSpan; dx <= lonSpan; dx++) {
      const x = (cx + dx + width) % width;
      const cellLon = ((x + 0.5) / width) * 360 - 180;
      let delta = cellLon - lon;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      cosDelta[dx + lonSpan] = Math.cos(delta * DEG);
    }

    for (let dy = -latSpan; dy <= latSpan; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= height) continue;

      const cellLat = 90 - ((y + 0.5) / height) * 180;
      const sinLat = Math.sin(cellLat * DEG) * sinCity;
      const cosLat = Math.cos(cellLat * DEG) * cosCity;
      const row = y * width;

      for (let dx = -lonSpan; dx <= lonSpan; dx++) {
        const cosAngle = sinLat + cosLat * (cosDelta[dx + lonSpan] ?? -1);
        if (cosAngle < cosReach) continue;

        // Normalised angular distance without an acos: for angles this small,
        // 1 - cos is proportional to the square of the angle.
        const t = Math.sqrt((1 - cosAngle) / (1 - cosReach));
        const falloff = (1 - t) * (1 - t);

        // Screened, not summed. Europe holds a dozen of these cities within a
        // few degrees; added together they saturate the whole continent to
        // white, while screening lets a cluster read as hot without erasing
        // the shape of the coastline underneath it.
        const x = (cx + dx + width) % width;
        const current = field[row + x] ?? 0;
        field[row + x] = current + intensity * falloff * (1 - current);
      }
    }
  }

  const smoothed = blur(field, width, height, radius);

  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    // Clamped against a fixed scale rather than normalised against the peak:
    // dividing by the hottest cell would drag every city down to whatever the
    // busiest one happened to be, and nothing would ever read as hot.
    const clamped = Math.min(1, smoothed[i] ?? 0);

    // A gamma lift, because most of the map sits at the cool end and left
    // linear the continents read as one dark mass.
    data[i] = Math.round(Math.pow(clamped, 0.72) * 255);
  }

  return { width, height, data };
}

/**
 * Colour ramp, cold to hot, baked to a 256-entry lookup.
 *
 * It stays inside the site's violet family until the very top of the range,
 * where it breaks warm — so a hotspot reads as heat rather than as another
 * shade of purple.
 */
const STOPS: readonly (readonly [number, number, number, number])[] = [
  [0.0, 12, 9, 34],
  [0.3, 34, 22, 84],
  [0.52, 84, 42, 150],
  [0.68, 138, 60, 178],
  [0.8, 204, 82, 158],
  [0.9, 246, 132, 112],
  [1.0, 255, 232, 198],
];

export function buildRamp(): Uint8Array {
  const ramp = new Uint8Array(256 * 3);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;

    let lower = STOPS[0]!;
    let upper = STOPS[STOPS.length - 1]!;
    for (let s = 0; s < STOPS.length - 1; s++) {
      const a = STOPS[s]!;
      const b = STOPS[s + 1]!;
      if (t >= a[0] && t <= b[0]) {
        lower = a;
        upper = b;
        break;
      }
    }

    const span = upper[0] - lower[0];
    const k = span === 0 ? 0 : (t - lower[0]) / span;

    ramp[i * 3] = Math.round(lower[1] + (upper[1] - lower[1]) * k);
    ramp[i * 3 + 1] = Math.round(lower[2] + (upper[2] - lower[2]) * k);
    ramp[i * 3 + 2] = Math.round(lower[3] + (upper[3] - lower[3]) * k);
  }

  return ramp;
}
