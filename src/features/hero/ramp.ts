/**
 * Colour ramp, cold to hot, baked to a 256-entry lookup.
 *
 * It stays inside the site's violet family until the very top of the range,
 * where it breaks warm — so the brightest cores of the nebula read as heat
 * rather than as another shade of purple.
 *
 * Baking it means the per-frame renderer only ever reads an array: no colour
 * arithmetic happens inside the pixel loop.
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
