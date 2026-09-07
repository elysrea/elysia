import { describe, expect, it } from 'vitest';

import {
  angleBetween,
  arcPoint,
  dot,
  isOccluded,
  normalize,
  orient,
  project,
  slerp,
  toVector,
  type Vec3,
} from '../src/features/globe/geo.ts';

const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

describe('toVector', () => {
  it('puts longitude zero in front of the viewer', () => {
    const v = toVector({ lat: 0, lon: 0 });

    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(1);
  });

  it('puts the north pole up and 90 degrees east to the right', () => {
    expect(toVector({ lat: 90, lon: 0 }).y).toBeCloseTo(1);
    expect(toVector({ lat: 0, lon: 90 }).x).toBeCloseTo(1);
  });

  it('always returns a unit vector', () => {
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon < 180; lon += 15) {
        expect(length(toVector({ lat, lon }))).toBeCloseTo(1);
      }
    }
  });
});

describe('orient', () => {
  const point = toVector({ lat: 34, lon: -58 });

  it('is the identity at rest', () => {
    const v = orient(point, 0, 0);

    expect(v.x).toBeCloseTo(point.x);
    expect(v.y).toBeCloseTo(point.y);
    expect(v.z).toBeCloseTo(point.z);
  });

  it('turns the front of the globe toward the right as it spins', () => {
    const v = orient({ x: 0, y: 0, z: 1 }, Math.PI / 2, 0);

    expect(v.x).toBeCloseTo(1);
    expect(v.z).toBeCloseTo(0);
  });

  it('is a rotation: it never stretches the sphere', () => {
    for (let spin = 0; spin < Math.PI * 2; spin += 0.4) {
      expect(length(orient(point, spin, 0.38))).toBeCloseTo(1);
    }
  });

  it('brings the north pole into view when tilted', () => {
    const upright = orient(toVector({ lat: 90, lon: 0 }), 0, 0);
    const tilted = orient(toVector({ lat: 90, lon: 0 }), 0, 0.38);

    expect(upright.z).toBeCloseTo(0);
    expect(tilted.z).toBeGreaterThan(0);
  });

  it('returns a full turn to where it started', () => {
    const turned = orient(point, Math.PI * 2, 0);

    expect(turned.x).toBeCloseTo(point.x);
    expect(turned.z).toBeCloseTo(point.z);
  });
});

describe('project', () => {
  const view = { cx: 400, cy: 300, radius: 200 };

  it('maps the centre of the disc to the centre of the globe', () => {
    expect(project({ x: 0, y: 0, z: 1 }, view)).toMatchObject({ x: 400, y: 300 });
  });

  it('flips the y axis, because screens count downward', () => {
    expect(project({ x: 0, y: 1, z: 0 }, view).y).toBe(100);
  });

  it('places the limb exactly on the radius', () => {
    expect(project({ x: 1, y: 0, z: 0 }, view).x).toBe(600);
  });
});

describe('isOccluded', () => {
  it('hides points behind the sphere', () => {
    expect(isOccluded({ x: 0, y: 0, z: -1 })).toBe(true);
  });

  it('shows points on the near side', () => {
    expect(isOccluded({ x: 0, y: 0, z: 1 })).toBe(false);
  });

  it('shows a lifted point that clears the limb even while behind it', () => {
    // An arc arching over the far edge is still visible against the sky.
    expect(isOccluded({ x: 1.2, y: 0, z: -0.4 })).toBe(false);
  });
});

describe('slerp', () => {
  const a = toVector({ lat: 0, lon: 0 });
  const b = toVector({ lat: 0, lon: 90 });

  it('returns the endpoints exactly', () => {
    expect(slerp(a, b, 0).z).toBeCloseTo(1);
    expect(slerp(a, b, 1).x).toBeCloseTo(1);
  });

  it('stays on the surface the whole way', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(length(slerp(a, b, t))).toBeCloseTo(1);
    }
  });

  it('travels at a constant rate along the arc', () => {
    const first = angleBetween(slerp(a, b, 0), slerp(a, b, 0.25));
    const last = angleBetween(slerp(a, b, 0.75), slerp(a, b, 1));

    expect(first).toBeCloseTo(last);
  });

  it('handles identical points without dividing by zero', () => {
    const same = slerp(a, a, 0.5);

    expect(Number.isNaN(same.x)).toBe(false);
    expect(length(same)).toBeCloseTo(1);
  });
});

describe('arcPoint', () => {
  const a = toVector({ lat: 0, lon: 0 });
  const b = toVector({ lat: 0, lon: 120 });

  it('starts and ends on the surface', () => {
    expect(length(arcPoint(a, b, 0, 0.3))).toBeCloseTo(1);
    expect(length(arcPoint(a, b, 1, 0.3))).toBeCloseTo(1);
  });

  it('reaches its apex halfway across', () => {
    expect(length(arcPoint(a, b, 0.5, 0.3))).toBeCloseTo(1.3);
  });

  it('never dips below the surface', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(length(arcPoint(a, b, t, 0.2))).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });
});

describe('vector helpers', () => {
  it('normalises to unit length and leaves the zero vector alone', () => {
    expect(length(normalize({ x: 3, y: 4, z: 0 }))).toBeCloseTo(1);
    expect(normalize({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('measures angles between directions', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 1 };

    expect(dot(a, b)).toBe(0);
    expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
    expect(angleBetween(a, a)).toBeCloseTo(0);
  });

  it('does not produce NaN when rounding pushes the dot product past 1', () => {
    const a = { x: 1, y: 0, z: 0 };

    expect(angleBetween(a, { x: 1.0000001, y: 0, z: 0 })).toBe(0);
  });
});
