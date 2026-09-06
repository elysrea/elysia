import { describe, expect, it } from 'vitest';

import { DEFAULT_FLOW_FIELD, flowAngle, maxAngle } from '../src/features/wind/flow-field.ts';

describe('flowAngle', () => {
  it('never turns the wind back on itself', () => {
    // Angles are measured from east. Staying inside ±π/2 means every particle
    // keeps drifting downwind, which is what makes the field read as calm.
    const limit = maxAngle();
    expect(limit).toBeLessThan(Math.PI / 2);

    for (let x = 0; x <= 2000; x += 37) {
      for (let y = 0; y <= 1200; y += 29) {
        for (let t = 0; t < 60; t += 7) {
          expect(Math.abs(flowAngle(x, y, t))).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it('is continuous: neighbouring points do not disagree sharply', () => {
    let worst = 0;
    for (let x = 0; x < 1600; x += 4) {
      const delta = Math.abs(flowAngle(x, 400, 12) - flowAngle(x + 4, 400, 12));
      worst = Math.max(worst, delta);
    }

    expect(worst).toBeLessThan(0.01);
  });

  it('drifts over time rather than standing still', () => {
    expect(flowAngle(500, 300, 0)).not.toBeCloseTo(flowAngle(500, 300, 20), 3);
  });

  it('is a pure function of position and time', () => {
    expect(flowAngle(123, 456, 7.5)).toBe(flowAngle(123, 456, 7.5));
  });

  it('accepts a custom field', () => {
    const flat = { scaleX: 0, scaleY: 0, waves: [] };

    expect(flowAngle(999, 999, 999, flat)).toBe(0);
    expect(maxAngle(DEFAULT_FLOW_FIELD)).toBeCloseTo(0.71);
  });
});
