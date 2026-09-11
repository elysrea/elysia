/**
 * Colour ramp, dark to light, baked to a 256-entry lookup.
 *
 * Grey — a long exposure in black and white rather than a colour plate. It
 * held violet until the top of the range and broke pink then warm, which was
 * right while the page was violet; once the grounds went black, a purple hero
 * was the one room in a different colour from the rest of the house.
 *
 * Every stop carries a few points more blue than red and green. That is not a
 * tint, it is the same bias the black grounds carry (#17171d, #141419), so the
 * nebula and the page it sits on read as one material.
 *
 * Baking it means the per-frame renderer only ever reads an array: no colour
 * arithmetic happens inside the pixel loop.
 */
const STOPS: readonly (readonly [number, number, number, number])[] = [
  [0.0, 10, 10, 12],
  [0.3, 26, 26, 30],
  [0.52, 66, 67, 73],
  [0.68, 116, 117, 124],
  [0.8, 168, 169, 176],
  [0.9, 212, 213, 218],
  [1.0, 244, 244, 247],
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
