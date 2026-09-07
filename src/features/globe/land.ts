import { LAND_MASK_BASE64, LAND_MASK_HEIGHT, LAND_MASK_WIDTH } from './land-mask.ts';
import type { GeoPoint } from './geo.ts';

/**
 * Land lookup over the generated bitmask.
 *
 * `scripts/build-land-mask.js` bakes Natural Earth polygons into one bit per
 * two-degree cell, so the browser never sees a GeoJSON or a point-in-polygon
 * test — just an array index.
 */
export interface LandMask {
  readonly width: number;
  readonly height: number;
  readonly bits: Uint8Array;
}

export function decodeMask(
  base64: string = LAND_MASK_BASE64,
  width: number = LAND_MASK_WIDTH,
  height: number = LAND_MASK_HEIGHT,
): LandMask {
  const binary = atob(base64);
  const bits = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bits[i] = binary.charCodeAt(i);

  return { width, height, bits };
}

export function isLand(mask: LandMask, { lat, lon }: GeoPoint): boolean {
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(((lon + 180) / 360) * mask.width)));
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * mask.height)));

  const bit = y * mask.width + x;
  return ((mask.bits[bit >> 3] ?? 0) >> (7 - (bit & 7))) % 2 === 1;
}
