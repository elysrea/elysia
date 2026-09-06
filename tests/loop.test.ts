import { describe, expect, it } from 'vitest';

import { FIXED_STEP_MS, MAX_FRAME_MS, planSteps } from '../src/lib/loop.ts';

describe('planSteps', () => {
  it('runs one step per frame at the target frame rate', () => {
    const plan = planSteps(0, FIXED_STEP_MS);

    expect(plan.steps).toBe(1);
    expect(plan.accumulator).toBeCloseTo(0);
  });

  it('runs two steps for a 30Hz frame, so motion covers the same distance', () => {
    expect(planSteps(0, FIXED_STEP_MS * 2).steps).toBe(2);
  });

  it('carries the remainder instead of dropping it', () => {
    // 120Hz: every other frame should advance the simulation.
    const half = FIXED_STEP_MS / 2;
    const first = planSteps(0, half);
    const second = planSteps(first.accumulator, half);

    expect(first.steps).toBe(0);
    expect(second.steps).toBe(1);
  });

  it('does not replay a long stall, so a restored tab cannot freeze the page', () => {
    const plan = planSteps(0, 10_000);

    expect(plan.steps).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_MS / FIXED_STEP_MS));
  });

  it('caps the steps per frame', () => {
    expect(planSteps(0, MAX_FRAME_MS, 1, 3).steps).toBe(3);
  });

  it('ignores a negative frame time from a clock adjustment', () => {
    expect(planSteps(0, -50).steps).toBe(0);
  });
});
