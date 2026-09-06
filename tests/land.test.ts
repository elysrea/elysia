import { describe, expect, it } from 'vitest';

import { decodeMask, isLand, landPoints } from '../src/features/globe/land.ts';
import { LAND_MASK_HEIGHT, LAND_MASK_WIDTH } from '../src/features/globe/land-mask.ts';

const mask = decodeMask();

describe('decodeMask', () => {
  it('decodes to one bit per cell', () => {
    expect(mask.width).toBe(LAND_MASK_WIDTH);
    expect(mask.height).toBe(LAND_MASK_HEIGHT);
    expect(mask.bits.length).toBe(Math.ceil((LAND_MASK_WIDTH * LAND_MASK_HEIGHT) / 8));
  });

  it('covers roughly the share of the map that is land', () => {
    let land = 0;
    for (const byte of mask.bits) {
      for (let bit = 0; bit < 8; bit++) if ((byte >> bit) % 2 === 1) land++;
    }

    // Equirectangular stretches the poles, so this sits above the true 29%.
    const share = land / (LAND_MASK_WIDTH * LAND_MASK_HEIGHT);
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.4);
  });
});

describe('isLand', () => {
  // If the projection or the row order were wrong, these would fail together.
  it.each([
    ['the Sahara', 20, 10],
    ['Greenland', 72, -40],
    ['Siberia', 65, 100],
    ['central Australia', -25, 134],
    ['Antarctica', -80, 0],
    ['Brazil', -10, -55],
    ['Kansas', 38, -98],
  ])('finds land in %s', (_place, lat, lon) => {
    expect(isLand(mask, { lat, lon })).toBe(true);
  });

  it.each([
    ['the mid Pacific', 0, -140],
    ['the mid Atlantic', 30, -40],
    ['the southern Indian Ocean', -40, 80],
    ['the Arctic Ocean', 88, 0],
    ['the Southern Ocean', -60, -120],
  ])('finds water in %s', (_place, lat, lon) => {
    expect(isLand(mask, { lat, lon })).toBe(false);
  });

  it('clamps rather than reading outside the mask', () => {
    expect(() => isLand(mask, { lat: 95, lon: 200 })).not.toThrow();
    expect(() => isLand(mask, { lat: -95, lon: -200 })).not.toThrow();
  });
});

describe('landPoints', () => {
  it('returns roughly the requested number of points', () => {
    const points = landPoints(1500);

    expect(points.length).toBeGreaterThan(1100);
    expect(points.length).toBeLessThan(1900);
  });

  it('returns unit vectors only', () => {
    for (const point of landPoints(300)) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1);
    }
  });

  it('is deterministic, so the globe looks the same on every load', () => {
    expect(landPoints(400)).toEqual(landPoints(400));
  });

  it('handles a request for nothing', () => {
    expect(landPoints(0)).toEqual([]);
  });
});
