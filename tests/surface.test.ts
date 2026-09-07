import { describe, expect, it } from 'vitest';

import { anchors } from '../src/features/globe/cities.ts';
import { buildHeat, buildRamp } from '../src/features/globe/heat.ts';
import { decodeMask } from '../src/features/globe/land.ts';
import { normalize } from '../src/features/globe/geo.ts';
import { buildTables, paintSurface } from '../src/features/globe/surface.ts';

const heat = buildHeat(decodeMask(), anchors, { width: 360, height: 180 });
const ramp = buildRamp();
const light = normalize({ x: 0.62, y: 0.34, z: 0.71 });
const view = { cx: 400, cy: 300, radius: 260 };
const clip = { clipWidth: 900, clipHeight: 600 };

const tables = buildTables(view, 0.38, light, heat, { ...clip, scale: 4 });

const sampleAt = (x: number, y: number): number => {
  const col = Math.floor((x - tables.left) / tables.scale);
  const row = Math.floor((y - tables.top) / tables.scale);
  return row * tables.cols + col;
};

describe('buildTables', () => {
  it('covers the globe and nothing else', () => {
    expect(tables.cols * tables.scale).toBeGreaterThanOrEqual(view.radius * 2 - tables.scale);
    expect(tables.left).toBeGreaterThanOrEqual(0);
    expect(tables.top).toBeGreaterThanOrEqual(0);
  });

  it('marks samples that miss the sphere', () => {
    // A corner of the sample box is outside the disc.
    expect(tables.row[0]).toBe(-1);
    expect(tables.row[sampleAt(view.cx, view.cy)]).toBeGreaterThanOrEqual(0);
  });

  it('is fully covered in the middle and feathered at the limb', () => {
    expect(tables.coverage[sampleAt(view.cx, view.cy)]).toBe(1);

    // The feather is one sample wide, so rather than guessing which sample
    // straddles the edge, assert that some sample does: without it the limb is
    // a staircase.
    let partial = 0;
    for (let i = 0; i < tables.coverage.length; i++) {
      const value = tables.coverage[i] ?? 0;
      if ((tables.row[i] ?? -1) >= 0 && value > 0 && value < 1) partial++;
    }

    expect(partial).toBeGreaterThan(20);
  });

  it('lights the side the light is on', () => {
    const lit =
      tables.shade[sampleAt(view.cx + view.radius * 0.5, view.cy - view.radius * 0.3)] ?? 0;
    const dark =
      tables.shade[sampleAt(view.cx - view.radius * 0.5, view.cy + view.radius * 0.3)] ?? 1;

    expect(lit).toBeGreaterThan(dark);
  });

  it('clips to the canvas, so an off-screen planet costs nothing', () => {
    const offLeft = buildTables({ cx: -400, cy: 300, radius: 900 }, 0.38, light, heat, {
      clipWidth: 500,
      clipHeight: 400,
      scale: 4,
    });

    expect(offLeft.left).toBe(0);
    expect(offLeft.cols * offLeft.scale).toBeLessThanOrEqual(500 + offLeft.scale);
  });

  it('gives an empty grid for a globe entirely off screen', () => {
    const gone = buildTables({ cx: -5000, cy: 0, radius: 100 }, 0, light, heat, {
      clipWidth: 400,
      clipHeight: 400,
      scale: 4,
    });

    expect(gone.cols * gone.rows).toBe(0);
  });

  it('does not depend on the rotation', () => {
    const again = buildTables(view, 0.38, light, heat, { ...clip, scale: 4 });

    expect(Array.from(again.column)).toEqual(Array.from(tables.column));
  });
});

describe('paintSurface', () => {
  const paint = (spin: number, rise = 1): Uint8ClampedArray => {
    const target = new Uint8ClampedArray(tables.cols * tables.rows * 4);
    paintSurface(tables, heat, ramp, target, { spin, rise });
    return target;
  };

  it('writes an opaque planet and a transparent sky', () => {
    const pixels = paint(0);
    const inside = sampleAt(view.cx, view.cy) * 4;

    expect(pixels[inside + 3]).toBe(255);
    expect(pixels[3]).toBe(0);
  });

  it('turns: the same pixel shows different ground as the planet rotates', () => {
    const inside = sampleAt(view.cx, view.cy) * 4;
    const before = paint(0);
    const after = paint(Math.PI / 2);

    expect(after[inside]).not.toBe(before[inside]);
  });

  it('comes back to the same frame after a full turn', () => {
    const inside = sampleAt(view.cx, view.cy) * 4;
    const start = paint(0);
    const round = paint(Math.PI * 2);

    expect(round[inside]).toBe(start[inside]);
  });

  it('fades in with the rise, without changing the colour', () => {
    const inside = sampleAt(view.cx, view.cy) * 4;
    const half = paint(0, 0.5);
    const full = paint(0, 1);

    expect(half[inside + 3]).toBeCloseTo((full[inside + 3] ?? 0) / 2, -1);
    expect(half[inside]).toBe(full[inside]);
  });

  it('keeps the night side visible rather than pure black', () => {
    const pixels = paint(0);
    let darkest = 255;

    for (let i = 0; i < tables.cols * tables.rows; i++) {
      if ((tables.row[i] ?? -1) < 0) continue;
      darkest = Math.min(darkest, pixels[i * 4] ?? 0);
    }

    expect(darkest).toBeGreaterThan(0);
  });
});
