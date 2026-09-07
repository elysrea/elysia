import { describe, expect, it } from 'vitest';

import { anchors } from '../src/features/globe/cities.ts';
import { buildHeat, buildRamp, cityWeight } from '../src/features/globe/heat.ts';
import { decodeMask, isLand } from '../src/features/globe/land.ts';

const mask = decodeMask();
const heat = buildHeat(mask, anchors, { width: 180, height: 90 });

const at = (lat: number, lon: number): number => {
  const x = Math.min(heat.width - 1, Math.floor(((lon + 180) / 360) * heat.width));
  const y = Math.min(heat.height - 1, Math.floor(((90 - lat) / 180) * heat.height));
  return heat.data[y * heat.width + x] ?? 0;
};

describe('cityWeight', () => {
  it('is stable for a name, so the map never shuffles between loads', () => {
    expect(cityWeight('Tokyo')).toBe(cityWeight('Tokyo'));
  });

  it('varies between cities without any of them disappearing', () => {
    const weights = anchors.map((anchor) => cityWeight(anchor.name));

    expect(new Set(weights).size).toBeGreaterThan(5);
    for (const weight of weights) {
      expect(weight).toBeGreaterThan(0.5);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });
});

describe('buildHeat', () => {
  it('fills the whole field', () => {
    expect(heat.data.length).toBe(heat.width * heat.height);
  });

  it('reaches both ends of the ramp', () => {
    let min = 255;
    let max = 0;
    for (const value of heat.data) {
      if (value < min) min = value;
      if (value > max) max = value;
    }

    // Not exactly 255: contributions are screened rather than summed, so the
    // scale is fixed and the hottest cluster approaches the top without any
    // single city being normalised against it.
    expect(max).toBeGreaterThan(215);
    expect(min).toBeLessThan(60);
  });

  it('is warmer over land than over open ocean', () => {
    // Interiors, well away from the coastal blur.
    const land = (at(20, 10) + at(-10, -55) + at(60, 100)) / 3;
    const ocean = (at(0, -140) + at(-40, 80) + at(30, -40)) / 3;

    expect(land).toBeGreaterThan(ocean * 2);
  });

  it('is hottest where the cities are', () => {
    const london = at(51.5, -0.1);
    const sahara = at(23, 15);

    // Both are land; only one has a city on it.
    expect(isLand(mask, { lat: 23, lon: 15 })).toBe(true);
    expect(london).toBeGreaterThan(sahara);
  });

  it('wraps at the date line instead of seaming', () => {
    // Kamchatka and the Aleutians sit either side of it; a blur that clamped
    // instead of wrapping would leave a visible edge down the map.
    const west = at(60, -179);
    const east = at(60, 179);

    expect(Math.abs(west - east)).toBeLessThan(80);
  });

  it('is deterministic', () => {
    const again = buildHeat(mask, anchors, { width: 180, height: 90 });

    expect(Array.from(again.data)).toEqual(Array.from(heat.data));
  });
});

describe('buildRamp', () => {
  const ramp = buildRamp();

  it('has an entry per heat value', () => {
    expect(ramp.length).toBe(256 * 3);
  });

  it('runs cold to hot', () => {
    const brightness = (i: number) =>
      (ramp[i * 3] ?? 0) + (ramp[i * 3 + 1] ?? 0) + (ramp[i * 3 + 2] ?? 0);

    expect(brightness(0)).toBeLessThan(brightness(128));
    expect(brightness(128)).toBeLessThan(brightness(255));
  });

  it('breaks warm at the top, so a hotspot reads as heat', () => {
    const red = ramp[255 * 3] ?? 0;
    const blue = ramp[255 * 3 + 2] ?? 0;

    expect(red).toBeGreaterThan(blue);
  });

  it('never leaves the byte range', () => {
    for (const channel of ramp) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});
