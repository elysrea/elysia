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

**Problem.** That ties speed to refresh rate: the animation ran roughly twice as
fast on a 120Hz display and slowed whenever the machine was busy. Restoring a
backgrounded tab replayed the entire gap in one frame.

**Decision.** `RenderLoop` accumulates elapsed time and runs whole 16.67ms
steps, clamping any single frame to 100ms and capping the steps per frame.

**Consequence.** Motion is identical everywhere, the simulation cannot spiral,
and `planSteps` is a pure function, so all of this is tested without a browser.

## A seeded PRNG

`Math.random` cannot be reproduced, which makes a generated scene impossible to
test and impossible to debug from a screenshot. `mulberry32` is 8 lines, has no
dependencies, and makes "the same seed draws the same globe" an assertion rather
than a hope.

## The globe is drawn, not embedded

**Context.** The hero needed a subject with more to say than drifting lines. A
rotating globe with traffic between landmasses is the reference; the question
was how to get one.

**Options.** A map SDK (Mapbox, MapLibre) gives a real globe and costs an API
key, a tile server, a third-party request on first paint and several hundred
kilobytes. A globe library (three-globe, globe.gl) drags in WebGL and a scene
graph for one static camera. Or draw it.

**Decision.** Draw it. The whole thing is orthographic projection and great
circles — a page of trigonometry — over a land mask baked at build time from
Natural Earth polygons by `scripts/build-land-mask.js`. The mask is one bit per
two-degree cell, 2.7 kB base64, committed as generated source.

**Consequence.** No key, no network, no runtime geo dependency, and the globe
is made of pure functions that a test can interrogate directly. The trade is
that it is a stylised globe and always will be: there are no labels, no zoom and
no projection other than the one it was built for. That is the right trade for a
hero image and the wrong one for a map.

## Dots on the far side are drawn too

An orthographic globe only shows a hemisphere, so the back half could be culled
outright. Drawing it at a fraction of the brightness costs one `fillRect` per
point and turns a flat disc into something with a volume you can read. The limb
gets a faint rim gradient for the same reason: without an edge, the unlit side
of the dot field reads as a scatter rather than a sphere.

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
lose the composition. Instead the same simulation is run forward until arcs are
in flight and then drawn once: the animation, paused.

## The header is a capsule, not a bar

A full-width bar draws a line across the top of the page and divides the hero
in two. A floating capsule sits _over_ the page instead, which is what lets the
globe run behind it. The trade is width: the capsule has to hold everything it
carries on one line, so below 640px the mark is dropped and the call to action
shortens to a single word rather than wrapping into a second row.

`pointer-events: none` on the header with `auto` on the capsule keeps the rest
of the hero clickable around it, which a full-width fixed bar would swallow.

## Arcs end somewhere named

An arc between two arbitrary points on a dot field looks like traffic and means
nothing. Anchoring both ends to a table of cities and labelling the destination
as the head lands turns the animation into a sentence: something arrived, and
here is where.

The label needs longer on screen than the arc does, so an arc holds after its
trail has gone rather than retiring on arrival — which is why the lifecycle has
a `HOLD` phase that draws nothing but the name.

## The globe is opaque

The first version drew the far-side dots faintly, which gave the sphere volume
but read as a glass ball rather than a planet. It now paints a shaded, opaque
body and culls the far hemisphere: the shading is a radial gradient centred on
the light rather than on the disc, which is the difference between a flat circle
and something round. Culling half the points pays for the extra fill.

## The planet is bigger than the frame

A globe that fits inside the viewport is an object on a shelf: you see all of
it, and it reads as an illustration. Drawing it at roughly twice the height of
the frame and anchoring it off the left edge means the viewer only ever sees a
curve, which is what makes it read as a body you are near.

Two things had to follow. Dot density now scales with the sphere's radius rather
than the viewport, because a cropped planet shows far more surface per pixel of
frame. And a city can now face the viewer while sitting outside the canvas
entirely, so labels for off-frame anchors are skipped — a label has to have
something on screen to point at.

## Space, in two layers

The sky is CSS: a near-black ground with nebula blooms placed where the light
is, which costs nothing per frame and scales with the viewport for free. The
stars are canvas, because they twinkle and because they have to be painted
_under_ the planet, which is opaque. Each star is generated once per resize and
then only read, so a frame is one `fillRect` and one sine per star.

Brightness is the cube of a uniform roll. A linear distribution gives an evenly
scattered field that reads as dust; cubing it makes most stars faint and a few
genuinely bright, which is what a sky looks like.

## A graticule, faintly

The dots say where the land is. They do not say that the thing is a sphere being
turned — at a glance they could be a pattern printed on a disc. Twelve meridians
and five parallels at 5% opacity settle it, and cost about a thousand projected
points a frame.

## Nothing is set in capitals

The first version leaned on uppercase with wide tracking for every label, which
is a way of making plain type look designed. Replacing it with a display serif
that has actual character meant the capitals were doing nothing but shouting —
so the tracking dropped from 0.18em to 0.04em and the transforms came out,
including on the city names drawn into the canvas.

## The planet is a heat map, drawn per pixel

**Context.** Dots read well but they are a diagram: one mark per place, evenly
spaced, saying nothing about density. The site wanted a surface that shows where
activity actually is.

**Options.** Keep the dots and vary their size — still a diagram, and a busier
one. Draw thousands of overlapping radial gradients — a heat map made of paint
calls, and far too many of them. Or render the sphere per pixel.

**Decision.** Per pixel, from a texture baked once: land from the mask, city
activity screened on top, blurred to soften the two-degree coastlines, mapped
through a ramp that stays violet until the very top of the range and then breaks
warm.

**Consequence.** It is cheap because almost none of it is per frame. For a given
pixel the view-space normal never changes, so its latitude, its Lambert term and
its coverage at the limb are computed once per resize; only longitude moves, and
it moves by the same amount everywhere. The frame loop is an array read, a lerp
and a lookup. Samples are coarser than pixels and drawn back scaled up, which is
both why it is affordable and why it looks soft.

The cost was measured rather than assumed — about 11ms a frame at full
resolution, 3ms one step coarser — so the effect opens at the coarser setting
and the governor has to earn the finer one.

## Screened, not summed

City hotspots are combined with `a + b(1 - a)` rather than `a + b`. Europe holds
a dozen cities within a few degrees; added together they saturate the whole
continent to flat white and the coastline disappears underneath. Screening lets
a cluster read as hot while keeping the shape beneath it.

The scale is fixed rather than normalised against the hottest cell, too.
Normalising would drag every city down to whatever the busiest one happened to
be, and nothing would ever read as hot.

## No hairlines

The first version separated everything with one-pixel rules: between sections,
under every label, between every row, above every list item. It is an easy way
to make a layout look structured, and at some density it stops reading as
structure and starts reading as ruled paper.

They are all gone. Structure now comes from ground and space — a raised deck for
the page body, soft cards for lists, a hover surface for rows, and a dot instead
of an underline for a section label. The only borders left describe a shape
rather than divide a space.

## The seam is a shape, not an edge

The hero and the page meet at a tab that rises out of the deck's top edge, with
a concave flare either side. The flares are two small squares masked by a
circle, which is what makes the tab look cut from the same sheet as the deck
rather than stuck on top of it — and it is the one place in the page where a
curve does the job a line used to.

## The hero is swappable

**Context.** The planet is the most literal thing on the page, and literal is a
commitment: it says the studio is about the world rather than about the work.
That is worth testing against alternatives rather than defending.

**Decision.** Split the effect in two. Everything about hosting one — canvas
sizing, pausing off-screen, reduced motion, fixed-step time, quality governing —
is the same whatever is drawn, so it moved to `SceneHost`. A scene is three
methods. Three alternatives then cost a file each.

**Consequence.** The comparison can be made by looking, at `?hero=`, instead of
in the abstract. The registry is also the deletion plan: when one wins, the
other three go in a single commit and the host stays.

A query string is user input, not configuration, so an unknown name falls back
to the default — and the lookup uses `Object.hasOwn` rather than `in`, because
`?hero=constructor` otherwise resolves through the prototype chain and gets
`Object` called as a scene factory. A test covers exactly that.

## The switcher is links first

The tabs in the seam are anchors to `?hero=…` rendered at build time, with the
active one marked from the default. Script then intercepts the clicks and swaps
the scene in place.

Doing it in that order means the page has no state that only exists in
JavaScript: the URL is the state, it is shareable, and with scripting off the
tabs still work by navigating. Modified clicks are left alone, because a
cmd-click on a link means "new tab" and this is a link. The URL is updated with
`replaceState` rather than `pushState` — the hero is a preference, not a place,
and it should not fill the back button.

## The catalogue is data, the registry is code

The build-time HTML renderer needs to know what the heroes are called; it cannot
import the scene classes, which expect a DOM. So the list lives in
`catalogue.ts`, which imports nothing, and the registry that builds scenes is
checked against it by a test. Two sources of truth would drift the first time
someone added a hero and forgot the tab.
