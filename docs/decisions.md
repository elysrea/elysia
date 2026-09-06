# Decisions

Short notes on the choices that were not obvious, kept for the same reason a
commit message is kept: the code shows what, not why.

## Content is rendered at build time, not in the browser

**Context.** The site is a handful of static sections whose copy should live in
one typed place rather than being scattered through markup.

**Options.** Hand-maintained HTML (drifts, no types); client-side templating
(an empty shell before hydration, invisible to crawlers, JavaScript required to
read a paragraph); build-time rendering.

**Decision.** A Vite plugin fills `<!--@slot-->` placeholders from
`src/content/render.ts` during `transformIndexHtml`. Content stays typed, the
output stays static, and the runtime cost is zero.

**Consequence.** Content changes need a rebuild — trivially handled by HMR in
dev, where the plugin forces a full reload on any change under `src/content/`.
An unknown or unfilled placeholder throws, so a hole in the page fails the build
instead of shipping.

## Fixed timestep instead of per-frame increments

**Context.** The original prototype advanced the simulation by a constant amount
every animation frame.

**Problem.** That ties speed to refresh rate: the wind blew roughly twice as
fast on a 120Hz display and slowed whenever the machine was busy. Restoring a
backgrounded tab replayed the entire gap in one frame.

**Decision.** `RenderLoop` accumulates elapsed time and runs whole 16.67ms
steps, clamping any single frame to 100ms and capping the steps per frame.

**Consequence.** Motion is identical everywhere, the simulation cannot spiral,
and `planSteps` is a pure function, so all of this is tested without a browser.

## A seeded PRNG

`Math.random` cannot be reproduced, which makes a particle system impossible to
test and impossible to debug from a screenshot. `mulberry32` is 8 lines, has no
dependencies, and makes "the same seed draws the same field" an assertion rather
than a hope.

## Native `<details>` for the case studies

A scripted disclosure needs `aria-expanded`, `aria-controls`, keyboard handling,
focus management, and its own state — all of which the browser already
implements. `<details name="work">` also gives exclusive-accordion behaviour for
free. Animation uses `interpolate-size` and `::details-content`; where those are
unsupported the panel simply appears, which is an acceptable difference.

## The canvas reads `--horizon` from CSS

The horizon moves at two breakpoints. The prototype restated those breakpoints
in JavaScript, so the gradient and the particle field could disagree. The canvas
now reads the computed custom property, which makes the cascade the single
source of truth and deletes a whole class of drift bug.

## Quality is governed, not assumed

Rather than guessing a particle count from a device check, the field measures
its own frame cost. The governor uses the median of a window of samples so one
long frame — every page has them — does not trigger a downgrade, steps down in
large decrements and recovers in small ones, so the field never visibly pulses.

## Reduced motion gets a picture, not a blank

Turning the effect off entirely would leave the hero with a flat gradient and
lose the composition. Instead the same simulation is run forward to its steady
state and left on screen: the animation, paused.
