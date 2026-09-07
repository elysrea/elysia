import { describe, expect, it } from 'vitest';

import { QualityGovernor } from '../src/lib/quality.ts';

const feed = (governor: QualityGovernor, frameMs: number, frames: number): number => {
  let scale = governor.scale;
  for (let i = 0; i < frames; i++) scale = governor.record(frameMs);
  return scale;
};

describe('QualityGovernor', () => {
  it('starts at full quality', () => {
    expect(new QualityGovernor().scale).toBe(1);
  });

  it('can open conservatively and climb from there', () => {
    const governor = new QualityGovernor({ initial: 0.8, sampleSize: 4, targetMs: 20 });
    expect(governor.scale).toBe(0.8);

    expect(feed(governor, 6, 40)).toBe(1);
  });

  it('will not start below its own floor', () => {
    expect(new QualityGovernor({ initial: 0.01, minScale: 0.4 }).scale).toBe(0.4);
  });

  it('waits for a full sample window before changing anything', () => {
    const governor = new QualityGovernor({ sampleSize: 10 });

    expect(feed(governor, 50, 9)).toBe(1);
    expect(governor.record(50)).toBeLessThan(1);
  });

  it('scales down while frames run long', () => {
    const governor = new QualityGovernor({ sampleSize: 5, targetMs: 20 });

    expect(feed(governor, 40, 50)).toBeCloseTo(0.35);
  });

  it('never scales below the floor', () => {
    const governor = new QualityGovernor({ sampleSize: 5, minScale: 0.5 });

    expect(feed(governor, 200, 200)).toBe(0.5);
  });

  it('recovers when frames are cheap again, but not instantly', () => {
    const governor = new QualityGovernor({ sampleSize: 5, targetMs: 20 });
    feed(governor, 40, 50);

    const afterOneWindow = feed(governor, 8, 5);
    expect(afterOneWindow).toBeGreaterThan(0.35);
    expect(afterOneWindow).toBeLessThan(0.5);
    expect(feed(governor, 8, 100)).toBe(1);
  });

  it('ignores a single long frame among healthy ones', () => {
    const governor = new QualityGovernor({ sampleSize: 9, targetMs: 20 });

    for (let i = 0; i < 8; i++) governor.record(10);
    expect(governor.record(400)).toBe(1);
  });

  it('rejects nonsense timings', () => {
    const governor = new QualityGovernor({ sampleSize: 2 });

    expect(governor.record(Number.NaN)).toBe(1);
    expect(governor.record(0)).toBe(1);
  });
});
