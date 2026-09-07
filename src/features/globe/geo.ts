/**
 * The globe's mathematics: sphere coordinates, rotation, orthographic
 * projection and great-circle interpolation.
 *
 * Everything here is a pure function of its inputs, which is what makes a
 * rotating 3D scene testable without a canvas.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Degrees, as they come out of a geographic dataset. */
export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}

export interface Viewport {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export interface Projected {
  readonly x: number;
  readonly y: number;
  /** Depth along the view axis: +1 faces the viewer, -1 is the far side. */
  readonly depth: number;
}

const DEG = Math.PI / 180;

/** Unit vector for a lat/lon. Longitude 0 faces the viewer. */
export function toVector({ lat, lon }: GeoPoint): Vec3 {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  const cosPhi = Math.cos(phi);

  return { x: cosPhi * Math.sin(lambda), y: Math.sin(phi), z: cosPhi * Math.cos(lambda) };
}

/**
 * Spins around the polar axis, then tilts the axis toward the viewer.
 *
 * Applied in this order the globe turns the way a planet does — the poles stay
 * put and the surface travels — rather than tumbling.
 */
export function orient(v: Vec3, spin: number, tilt: number): Vec3 {
  const cosSpin = Math.cos(spin);
  const sinSpin = Math.sin(spin);
  const x = v.x * cosSpin + v.z * sinSpin;
  const z = v.z * cosSpin - v.x * sinSpin;

  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  return { x, y: v.y * cosTilt - z * sinTilt, z: z * cosTilt + v.y * sinTilt };
}

/** Orthographic projection: a planet at this size has no visible perspective. */
export function project(v: Vec3, view: Viewport): Projected {
  return { x: view.cx + v.x * view.radius, y: view.cy - v.y * view.radius, depth: v.z };
}

/** True when the sphere itself is between the viewer and this point. */
export function isOccluded(v: Vec3): boolean {
  return v.z < 0 && v.x * v.x + v.y * v.y < 1;
}

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length === 0) return v;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function scale(v: Vec3, factor: number): Vec3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}

/** Shortest path across the surface, not through the sphere. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const cosine = Math.min(1, Math.max(-1, dot(a, b)));
  const omega = Math.acos(cosine);

  // Near-identical points: the sine terms collapse, so fall back to a lerp.
  if (omega < 1e-6) {
    return normalize({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });
  }

  const sinOmega = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / sinOmega;
  const wb = Math.sin(t * omega) / sinOmega;

  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb };
}

/**
 * A point along a flight path: the great circle, lifted off the surface.
 *
 * The lift is proportional to the distance travelled, so a hop between
 * neighbours stays low and an intercontinental arc climbs.
 */
export function arcPoint(a: Vec3, b: Vec3, t: number, lift: number): Vec3 {
  const height = 1 + lift * Math.sin(Math.PI * t);
  return scale(slerp(a, b, t), height);
}

/** Angle between two surface points, in radians. */
export function angleBetween(a: Vec3, b: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
}
