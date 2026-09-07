/**
 * A hero scene: something that draws itself into the canvas behind the
 * wordmark.
 *
 * Everything about *hosting* an effect — sizing the canvas for the device pixel
 * ratio, pausing when it scrolls away or the tab hides, honouring reduced
 * motion, keeping time in fixed steps, backing off when frames run long — is
 * the same whatever is being drawn. It lives in `host.ts`, and a scene is only
 * the drawing.
 */

export interface SceneLayout {
  /** CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** The shared `--horizon` token, as a fraction of height. */
  readonly horizon: number;
  /** 1 is full quality; lower means the frames are not keeping up. */
  readonly quality: number;
}

export interface Scene {
  /** Called on resize and whenever the quality budget changes. */
  layout(layout: SceneLayout): void;
  /** Advance by one fixed step. `scale` is the step length, normally 1. */
  step(scale: number): void;
  /** Draw the current state. `rise` fades the scene in, 0 to 1. */
  draw(context: CanvasRenderingContext2D, rise: number): void;
  /** Steps to run before the single frame shown under reduced motion. */
  readonly stillSteps?: number;
  /** Release anything the scene allocated outside the canvas. */
  destroy?(): void;
}

export type SceneFactory = (seed: number) => Scene;
