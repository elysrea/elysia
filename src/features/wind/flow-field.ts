/**
 * The wind itself: a steady, layered sine field.
 *
 * Angle 0 points east, and the summed amplitudes are deliberately under half a
 * radian, so the field can bend but never doubles back or curls into vortices.
 * Real turbulence would read as weather; this has to read as a calm evening.
 */

export interface FlowWave {
  /** Weight on the normalised x coordinate. */
  readonly x: number;
  /** Weight on the normalised y coordinate. */
  readonly y: number;
  /** Radians per second of drift. */
  readonly time: number;
  /** Contribution to the final angle, in radians. */
  readonly amplitude: number;
}

export interface FlowFieldConfig {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly waves: readonly FlowWave[];
}

export const DEFAULT_FLOW_FIELD: FlowFieldConfig = {
  scaleX: 0.0016,
  scaleY: 0.0044,
  waves: [
    { x: 0, y: 1, time: 0.17, amplitude: 0.33 },
    { x: 1.7, y: -0.55, time: 0.1, amplitude: 0.25 },
    { x: 0.55, y: 0, time: 0.045, amplitude: 0.13 },
  ],
};

/** The largest angle the field can produce, in radians. */
export function maxAngle(config: FlowFieldConfig = DEFAULT_FLOW_FIELD): number {
  return config.waves.reduce((total, wave) => total + Math.abs(wave.amplitude), 0);
}

/** Flow direction at a point, in radians, at `seconds` into the animation. */
export function flowAngle(
  x: number,
  y: number,
  seconds: number,
  config: FlowFieldConfig = DEFAULT_FLOW_FIELD,
): number {
  const nx = x * config.scaleX;
  const ny = y * config.scaleY;

  let angle = 0;
  for (const wave of config.waves) {
    angle += Math.sin(nx * wave.x + ny * wave.y + seconds * wave.time) * wave.amplitude;
  }
  return angle;
}
