import { describe, expect, it } from 'vitest';

import {
  ArcSystem,
  HOLD,
  TAIL,
  arcHead,
  arcTail,
  arrivalRing,
  departureRing,
  isFinished,
  labelOpacity,
  type Arc,
} from '../src/features/globe/arcs.ts';
import { toVector } from '../src/features/globe/geo.ts';
import type { Anchor } from '../src/features/globe/cities.ts';
import { mulberry32 } from '../src/lib/random.ts';

const at = (name: string, lat: number, lon: number): Anchor => ({
  name,
  vector: toVector({ lat, lon }),
});

const points: Anchor[] = [
  at('London', 51, 0),
  at('Sydney', -34, 151),
  at('Tokyo', 35, 139),
  at('Sao Paulo', -23, -46),
  at('San Francisco', 37, -122),
];

const arc = (progress: number): Arc => ({
  from: points[0]!,
  to: points[1]!,
  span: 2.6,
  progress,
  speed: 0.01,
});

describe('arc geometry', () => {
  it('grows a trail behind the head, then whips it out', () => {
    expect(arcHead(arc(0.4))).toBeCloseTo(0.4);
    expect(arcTail(arc(0.4))).toBeCloseTo(0.4 - TAIL);

    // After arrival the head is pinned and only the tail keeps moving.
    expect(arcHead(arc(1.2))).toBe(1);
    expect(arcTail(arc(1.2))).toBeCloseTo(1.2 - TAIL);
  });

  it('never lets the trail start before the departure point', () => {
    expect(arcTail(arc(0.05))).toBe(0);
  });

  it('lingers after the trail has gone, so the label can be read', () => {
    expect(isFinished(arc(1))).toBe(false);
    expect(isFinished(arc(1 + TAIL))).toBe(false);
    expect(isFinished(arc(1 + TAIL + HOLD))).toBe(true);
  });
});

describe('rings', () => {
  it('expands at departure and then stops', () => {
    expect(departureRing(arc(0))).toBe(0);
    expect(departureRing(arc(0.1))).toBeGreaterThan(0);
    expect(departureRing(arc(0.9))).toBeNull();
  });

  it('waits for the head to land before expanding at the destination', () => {
    expect(arrivalRing(arc(0.5))).toBeNull();
    expect(arrivalRing(arc(1))).toBe(0);
    expect(arrivalRing(arc(1.1))).toBeGreaterThan(0);
  });
});

describe('labelOpacity', () => {
  it('is silent until the head lands', () => {
    expect(labelOpacity(arc(0))).toBe(0);
    expect(labelOpacity(arc(0.99))).toBe(0);
  });

  it('fades up, holds, and fades out before the arc retires', () => {
    const early = labelOpacity(arc(1.1));
    const middle = labelOpacity(arc(1 + (TAIL + HOLD) * 0.5));
    const late = labelOpacity(arc(1 + (TAIL + HOLD) * 0.95));

    expect(early).toBeGreaterThan(0);
    expect(middle).toBe(1);
    expect(late).toBeLessThan(0.3);
    expect(labelOpacity(arc(1 + TAIL + HOLD))).toBe(0);
  });

  it('stays within range across an entire arc lifetime', () => {
    for (let progress = 0; progress < 2.5; progress += 0.01) {
      const value = labelOpacity(arc(progress));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('ArcSystem', () => {
  const build = (options = {}) => new ArcSystem(points, mulberry32(9), options);

  it('starts empty and waits for its first interval', () => {
    const system = build({ interval: 10 });
    expect(system.arcs).toHaveLength(0);

    for (let i = 0; i < 9; i++) system.step();
    expect(system.arcs).toHaveLength(0);

    system.step();
    expect(system.arcs).toHaveLength(1);
  });

  it('never exceeds its arc budget', () => {
    const system = build({ interval: 1, maxArcs: 3 });

    for (let i = 0; i < 500; i++) system.step();

    expect(system.arcs.length).toBeLessThanOrEqual(3);
  });

  it('retires arcs once they finish', () => {
    const system = build({ interval: 5 });
    for (let i = 0; i < 5; i++) system.step();
    const [first] = system.arcs;
    expect(first).toBeDefined();

    for (let i = 0; i < 400; i++) system.step();

    expect(system.arcs).not.toContain(first);
  });

  it('only connects points far enough apart to be worth drawing', () => {
    const system = build({ interval: 1, minSpan: 1.2 });

    for (let i = 0; i < 300; i++) system.step();

    for (const item of system.arcs) expect(item.span).toBeGreaterThanOrEqual(1.2);
  });

  it('gives longer journeys more time, without letting them crawl', () => {
    const system = build({ interval: 1 });
    for (let i = 0; i < 300; i++) system.step();

    for (const item of system.arcs) {
      expect(item.speed).toBeGreaterThan(0.005);
      expect(item.speed).toBeLessThan(0.02);
    }
  });

  it('advances by the step scale, so arcs are frame-rate independent', () => {
    const whole = build({ interval: 1 });
    const halves = build({ interval: 1 });

    whole.step(1);
    halves.step(0.5);
    halves.step(0.5);

    expect(halves.arcs[0]?.progress).toBeCloseTo(whole.arcs[0]?.progress ?? -1);
  });

  it('connects named places, so a label always has something to say', () => {
    const system = build({ interval: 1 });
    for (let i = 0; i < 200; i++) system.step();

    expect(system.arcs.length).toBeGreaterThan(0);
    for (const item of system.arcs) {
      expect(item.from.name).not.toBe('');
      expect(item.to.name).not.toBe(item.from.name);
    }
  });

  it('does nothing when there is nowhere to travel', () => {
    const empty = new ArcSystem([], mulberry32(1), { interval: 1 });

    for (let i = 0; i < 50; i++) empty.step();

    expect(empty.arcs).toHaveLength(0);
  });
});
