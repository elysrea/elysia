import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FIXED_STEP_MS, RenderLoop } from '../src/lib/loop.ts';
import { installFrameClock, type FrameClock } from './helpers/frames.ts';

let clock: FrameClock;

beforeEach(() => {
  clock = installFrameClock();
});

afterEach(() => {
  clock.restore();
});

describe('RenderLoop', () => {
  const build = () => {
    const onStep = vi.fn();
    const onRender = vi.fn();
    return { loop: new RenderLoop({ onStep, onRender }), onStep, onRender };
  };

  it('does not run until started', () => {
    const { loop, onRender } = build();

    clock.tick();

    expect(loop.running).toBe(false);
    expect(onRender).not.toHaveBeenCalled();
  });

  it('renders once per frame and steps once per elapsed step', () => {
    const { loop, onStep, onRender } = build();
    loop.start();

    clock.tick(FIXED_STEP_MS);
    clock.tick(FIXED_STEP_MS);

    expect(onRender).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenCalledWith(FIXED_STEP_MS);
  });

  it('keeps simulated time in step with real time on a slow frame', () => {
    const { loop, onStep } = build();
    loop.start();

    clock.tick(FIXED_STEP_MS * 3);

    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it('still renders on a frame too short to advance the simulation', () => {
    const { loop, onStep, onRender } = build();
    loop.start();

    clock.tick(FIXED_STEP_MS / 2);

    expect(onStep).not.toHaveBeenCalled();
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('reports the measured frame time to the renderer', () => {
    const { loop, onRender } = build();
    loop.start();

    clock.tick(40);

    expect(onRender).toHaveBeenCalledWith(40);
  });

  it('stops cleanly and cancels its pending frame', () => {
    const { loop, onRender } = build();
    loop.start();
    clock.tick();
    loop.stop();

    clock.tick();

    expect(loop.running).toBe(false);
    expect(clock.cancelled).toBe(1);
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('ignores a second start, so it can never run two loops at once', () => {
    const { loop, onRender } = build();
    loop.start();
    loop.start();

    clock.tick();

    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('ignores a stop when it is not running', () => {
    const { loop } = build();

    expect(() => loop.stop()).not.toThrow();
  });

  it('does not replay the gap after a long pause', () => {
    const { loop, onStep } = build();
    loop.start();

    clock.tick(600_000);

    expect(onStep.mock.calls.length).toBeLessThanOrEqual(5);
  });
});
