import { describe, expect, it } from 'vitest';

import { anchors } from '../src/features/globe/cities.ts';
import { decodeMask, isLand } from '../src/features/globe/land.ts';

const mask = decodeMask();

describe('city anchors', () => {
  it('names every anchor, uniquely', () => {
    const names = anchors.map((anchor) => anchor.name);

    expect(names.length).toBeGreaterThan(20);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.trim()).not.toBe('');
  });

  it('places every anchor on the unit sphere', () => {
    for (const { name, vector } of anchors) {
      expect(Math.hypot(vector.x, vector.y, vector.z), name).toBeCloseTo(1);
    }
  });

  it('puts every city on or beside land', () => {
    // Not "exactly on a land cell": the mask is two degrees to a side, so a
    // coastal city like Istanbul or San Francisco legitimately falls in a cell
    // whose centre is offshore. Within one cell is the honest assertion, and it
    // still catches what matters — a transposed lat/lon or a flipped sign puts
    // a city in the middle of an ocean, nowhere near land.
    for (const { name, vector } of anchors) {
      const lat = (Math.asin(vector.y) * 180) / Math.PI;
      const lon = (Math.atan2(vector.x, vector.z) * 180) / Math.PI;

      const step = 180 / mask.height;
      let nearLand = false;
      for (let dy = -1; dy <= 1 && !nearLand; dy++) {
        for (let dx = -1; dx <= 1 && !nearLand; dx++) {
          nearLand = isLand(mask, { lat: lat + dy * step, lon: lon + dx * step });
        }
      }

      expect(nearLand, `${name} (${lat.toFixed(1)}, ${lon.toFixed(1)})`).toBe(true);
    }
  });

  it('would notice a transposed coordinate', () => {
    // The guard above is only worth having if it can fail. Swapping lat and lon
    // sends Tokyo to the Arctic Ocean.
    expect(isLand(mask, { lat: 35.68, lon: 139.69 })).toBe(true);
    expect(isLand(mask, { lat: 89, lon: 35.68 })).toBe(false);
  });

  it('covers both hemispheres, so no rotation is ever empty', () => {
    const north = anchors.filter((anchor) => anchor.vector.y > 0).length;
    const east = anchors.filter((anchor) => anchor.vector.x > 0).length;

    expect(north).toBeGreaterThan(5);
    expect(anchors.length - north).toBeGreaterThan(5);
    expect(east).toBeGreaterThan(5);
    expect(anchors.length - east).toBeGreaterThan(5);
  });
});
