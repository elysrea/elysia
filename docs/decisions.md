# Decisions

Short notes on the choices that were not obvious, kept for the same reason a
commit message is kept: the code shows what, not why.

<!-- index -->

The log runs in the order the decisions were made, and nothing is deleted from
it. When a decision is reversed, the new entry names the ones it supersedes and
the old ones stay: how a decision was retired is part of the record.

**Still standing (31)**

- [Content is rendered at build time, not in the browser](#content-is-rendered-at-build-time-not-in-the-browser)
- [Fixed timestep instead of per-frame increments](#fixed-timestep-instead-of-per-frame-increments)
- [A seeded PRNG](#a-seeded-prng)
- [Native `<details>` for the case studies](#native-details-for-the-case-studies)
- [The canvas reads `--horizon` from CSS](#the-canvas-reads---horizon-from-css)
- [Quality is governed, not assumed](#quality-is-governed-not-assumed)
- [Reduced motion gets a picture, not a blank](#reduced-motion-gets-a-picture-not-a-blank)
- [The header is a capsule, not a bar](#the-header-is-a-capsule-not-a-bar)
- [Space, in two layers](#space-in-two-layers)
- [Nothing is set in capitals](#nothing-is-set-in-capitals)
- [No hairlines](#no-hairlines)
- [The seam is a shape, not an edge](#the-seam-is-a-shape-not-an-edge)
- [A display face is a system, not a family](#a-display-face-is-a-system-not-a-family)
- [The work section had to earn its name](#the-work-section-had-to-earn-its-name)
- [An open case study is a URL](#an-open-case-study-is-a-url)
- [The seam tabs switch the page, not the hero](#the-seam-tabs-switch-the-page-not-the-hero)
- [The tabs got their own subject](#the-tabs-got-their-own-subject)
- [Tracking, and the honest name for a class](#tracking-and-the-honest-name-for-a-class)
- [The wordmark moved to the middle](#the-wordmark-moved-to-the-middle)
- [Three heroes were deleted, and the globe with them](#three-heroes-were-deleted-and-the-globe-with-them)
- [The composer came out again](#the-composer-came-out-again)
- [A page that scrolled sideways on a phone](#a-page-that-scrolled-sideways-on-a-phone)
- [An ordinary footer](#an-ordinary-footer)
- [The contact section lost its headline and its address](#the-contact-section-lost-its-headline-and-its-address)
- [The prism moved to the note](#the-prism-moved-to-the-note)
- [The grounds went black](#the-grounds-went-black)
- [Four subtractions](#four-subtractions)
- [The hero went grey](#the-hero-went-grey)
- [Sizes and spacing, and a rule that went missing](#sizes-and-spacing-and-a-rule-that-went-missing)
- [The place line went too](#the-place-line-went-too)
- [Presentable, and measured](#presentable-and-measured)

**Superseded, kept for the record (17)**

- [The globe is drawn, not embedded](#the-globe-is-drawn-not-embedded)
- [Dots on the far side are drawn too](#dots-on-the-far-side-are-drawn-too)
- [Arcs end somewhere named](#arcs-end-somewhere-named)
- [The globe is opaque](#the-globe-is-opaque)
- [The planet is bigger than the frame](#the-planet-is-bigger-than-the-frame)
- [A graticule, faintly](#a-graticule-faintly)
- [The planet is a heat map, drawn per pixel](#the-planet-is-a-heat-map-drawn-per-pixel)
- [Screened, not summed](#screened-not-summed)
- [The hero is swappable](#the-hero-is-swappable)
- [The switcher is links first](#the-switcher-is-links-first)
- [The catalogue is data, the registry is code](#the-catalogue-is-data-the-registry-is-code)
- [Capabilities are an index, not a row of boxes](#capabilities-are-an-index-not-a-row-of-boxes)
- [A step you cannot see is not a decision](#a-step-you-cannot-see-is-not-a-decision)
- [The last section had to do something](#the-last-section-had-to-do-something)
- [The page sets](#the-page-sets)
- [The page sets, second attempt](#the-page-sets-second-attempt)
- [The prism is the ramp, not a rainbow](#the-prism-is-the-ramp-not-a-rainbow)

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

## A display face is a system, not a family

Swapping `--font-display` alone and leaving everything else in place produces a
worse version of both faces: Instrument Serif wants 400 weight, tight tracking
and 0.86 leading; Syne wants 700, looser leading and a smaller size for the same
optical weight; a mono wants smaller still. So a type set is five tokens —
family, display weight, text weight, tracking, leading — plus a scale for the
wordmark, and `[data-type]` overrides the lot.

The default set is the one declared on bare `:root`. That means the common case
needs no attribute, no script and no work: only a visitor who asked for a
different set pays for one.

It is applied by the inline script in the head rather than from a module,
because a module runs after the document has rendered and the page would visibly
reflow from one face into another. The script's allowlist is written at build
time from `type/sets.ts`, so there is still one source of truth.

## The work section had to earn its name

The five projects carried twenty-two words each: a role and an outcome. On a
site whose entire subject is the work, that was the emptiest thing on the page
and the first thing a reader would test.

Each is now a case study with the shape a case study needs — the situation
before, the decisions taken and why, what changed, and three numbers — which is
about six hundred words in place of a hundred. The content model grew to match,
so the structure is enforced by the compiler rather than by whoever writes the
next one.

Two layout decisions came out of it. The numbers are placed first in the source,
because on a phone the panel stacks in document order and the numbers are what
someone skimming reads; on a wide screen explicit grid placement puts them back
above the narrative. And the outcome is labelled in the accent colour, because
it is the one paragraph a reader who is only skimming should not miss.

## An open case study is a URL

`<details>` opens and closes without any script. What script adds is that the
open one is addressable: the hash follows it, a link into one arrives with it
open, and the back button closes it.

The synchronisation is one flag away from a loop — opening a study from the hash
fires the same `toggle` event that writes the hash — so the code sets a guard
while it is the one doing the opening. `<details name>` closing a sibling also
fires a toggle, which is why closing only clears the hash when the hash actually
pointed at the study that closed.

## The seam tabs switch the page, not the hero

They used to switch the hero, which made them a demo control. They now switch
the section below them, which makes them navigation.

Deciding that took more than moving a click handler, because three things were
already holding the same state:

**The hash.** It has to mean two things at once. `#work` is the Work panel;
`#work-meridian` is the Work panel _and_ a case study open inside it. One
resolver — `sectionForHash` — answers the first question, and the work feature
answers the second, so neither has to know the other exists. When a case study
is already in the hash the deck leaves it alone rather than flattening it back
to `#work`.

**The scrollspy.** Marking the current section by watching sections cross the
middle of the viewport was a reasonable guess when they all scrolled past. Now
one is showing and the rest are `hidden`, so it is a fact the deck knows. Two
things marking the same header links would have fought, so the scrollspy is
gone rather than left running.

**The click.** A tab is a link to a section, so following it would scroll to a
panel already in front of the reader. The handler prevents that and switches in
place — except for modified clicks, which mean "new tab" and are left alone.

Without script none of it applies: four sections on the page in order, four
links pointing at them. Script upgrades the strip to a real tablist — roving
tabindex, arrows, Home and End, `aria-selected`, a labelled `tabpanel` each —
because at that point it is a tab widget and should say so.

The trade is real and worth stating: a tabbed page hides three quarters of
itself, and a visitor who does not touch the tabs sees one section. That is the
right shape for a product page built around a switchable view, and a bet on a
studio site.

## The tabs got their own subject

Switching page sections made the tabs navigation, and navigation the header
already had. They open a bench instead — a specimen of the system the page is
built from: the palette, the three faces, the two easings and their durations,
and the components themselves.

The rule that makes it worth having is that nothing in it is transcribed. The
content model lists token _names_; the values beside them are read from the live
cascade when the page loads. Change `--accent` and the swatch, the label and the
hex all change with it, because they were never separate facts. A test asserts
the rendered bench contains no hex value at all, which is the only way that rule
stays true.

The easings are drawn from the same control points they animate with, and the
square beside each curve runs on that token — so the diagram and the movement
cannot disagree either. The components are the real ones, rendered, not
screenshotted.

Two things fell out of doing this. The tab controller stopped being about
sections and became a plain tab group: a strip, a panel each, roving tabindex,
arrows, Home and End, and no opinion about URLs — a widget is not a place. And
the sections went back to scrolling, which brought the header scrollspy back
with them, because inferring the current section from scroll position is right
again once sections scroll.

## Tracking, and the honest name for a class

Every small label on the page was monospace with 0.18em, then 0.04em, of
letter-spacing. It is a familiar move, and what it mostly does is make plain
type look considered — which is worth doing when the type has no character of
its own and worth undoing when it has.

Labels are now set in the reading face a little heavier, with no tracking at
all, and the monospace is kept for the things that are actually values: a year,
a token name, a duration. The class changed name with the style, because
`.mono` on something that is not monospace is a comment that lies. `.label` is
the editorial one, `.code` is the technical one, and a test asserts no
stylesheet reintroduces letter-spacing.

## The wordmark moved to the middle

Right-aligned, the wordmark shared the frame with the planet on the left, and
the composition depended on that. Centred, it is the only thing in the frame,
which is a stronger and simpler statement — and it made the availability badge
above it look like an ornament hung on a title, so that went.

It also broke the nebula's scrim, which was a wash down the right-hand side
protecting type that used to sit there. It is a soft well in the middle now: it
darkens where the words are without flattening the corners, which is where the
nebula is doing most of its work.

## Capabilities are an index, not a row of boxes

Six identical rounded rectangles with a bold line and a grey line is the default
answer, and it looks like one. They are numbered now — the numeral in the accent,
the name in the display face, the gloss underneath — and the surface is a
gradient that lifts toward the corner the numeral sits in, so a card has a
direction rather than being a flat rectangle.

## Three heroes were deleted, and the globe with them

**Supersedes** "The globe is drawn, not embedded", "Dots on the far side are
drawn too", "Arcs end somewhere named", "The globe is opaque", "The planet is
bigger than the frame", "A graticule, faintly", "The planet is a heat map, drawn
per pixel", "Screened, not summed", "The hero is swappable", "The switcher is
links first", and "The catalogue is data, the registry is code".

**Context.** The registry was built as its own deletion plan: four heroes behind
`?hero=`, a catalogue the renderer read, and a test keeping the two in step, so
that when one won the other three could go in a single commit. This is that
commit.

**Decision.** Nebula stays. Planet, eclipse and aurora go, and the switching
machinery goes with them — the catalogue, `resolveScene`, the `data-hero`
attribute and the query-string parsing. `createHero()` returns the one scene.

**Consequence.** Planet was the only caller of the globe engine, so deleting it
orphaned the projection, the land mask, the great-circle arcs, the city anchors
and the heat field: 965 lines of source and 732 lines of tests, all of it
working, none of it reachable. It went too. Keeping tested code alive with no
caller is not thrift, it is a second thing to maintain and a dead branch for
anyone reading the repo to walk down.

The JavaScript bundle fell from 29.20 kB to 11.15 kB — 4.58 kB gzipped, down
from 11.03 — and the suite from 216 tests to 123. Only two pieces survived, because the nebula uses them: the starfield
and the colour ramp, both now in `hero/`. `SceneHost` is untouched — the seam
the alternatives plugged into is still there, carrying one thing.

The deleted work is not gone, it is just not here: `git log` has it, and the
argument for drawing a globe rather than embedding one is still worth reading.
That is why the entries above were superseded rather than removed.

## A step you cannot see is not a decision

**Context.** The seam between the hero and the deck is the most worked-on shape
on the page — a tab rising out of the deck's top edge with two concave notches
masked by a radial gradient, so it reads as cut from the same sheet. It was
invisible, and had been for weeks.

**Cause.** The two grounds it separates were `--void` `#05030c` and `--surface`
`#0a0619`: a contrast ratio of **1.028**. Not a subtle edge — a 2.8% difference,
below the threshold where a large flat area reads as a different plane at all.
The shape was correct and the colours made it moot. `--deep` was in the palette,
described as the deck's ground, and used for nothing but the skip link.

**Decision.** Rebuild the grounds as a scale rather than a pair, one violet hue
across four values, and size the steps against the job each one does:

| token       | value     | vs. the void | does                            |
| ----------- | --------- | ------------ | ------------------------------- |
| `--void`    | `#05030c` | —            | the hero sky, and the footer    |
| `--dusk`    | `#0d0621` | 1.039        | the work band                   |
| `--deep`    | `#150c31` | 1.102        | raised chrome: the skip link    |
| `--surface` | `#1a0f3a` | **1.145**    | the deck — this is the seam     |
| `--iris`    | `#4a2a86` | 1.919        | the lift at the top of the deck |

`--dusk` sits near the void on this table but that is not the step it has to
survive: it is read against `--surface`, where it lands at 1.102.

**Revised once.** The first pass put `--surface` at `#241650` — 1.274 against
the void, with the deck opening at a 34% mix of `--iris`, so the seam edge ran
at 1.447. It worked, and it was too much: a bright violet field under the whole
page, and a jump at the seam that read as two different sites rather than two
planes of one. The fix was not to undo it but to spend the contrast where the
shape is. The lift dropped to 20% and settles within 440px instead of 520, so
the seam edge is 1.241 and the field it settles into is 1.145. Loud at the edge,
quiet everywhere else.

**Consequence.** The seam reads. The deck opens at a mix of `--iris` into
`--surface` and settles over 440px, so it is brightest exactly where the notch
is; the tab and both notches read the same `--deck-top` token, because a tab
painted the colour the deck _ends_ at would float rather than rise out of it.

The page also gained a rhythm it did not have: void, violet, then a drop back to
`--dusk` under the case studies — the longest read on the page, and now the only
section with a ground of its own — then violet again, then void under the
footer. Four bands instead of one flat field.

Two tokens were audited out on the way: `--veil` was declared and never
referenced, and `--iris` was shown in the palette bench as part of the system
while being used by nothing. A design system that lists colours it does not use
is a swatch library. `--iris` now does the lift.

## The last section had to do something

**Context.** Contact was an eyebrow, one line, the address set large, and a
paragraph asking for "a short note about the project, the timeline, and who is
on the team". Correct, and a dead end: it names three things it wants and then
leaves the visitor to open a mail client and remember all three.

**Decision.** Write the email for them. Three inputs — what you are building,
timeline, who is on the team — compose a `mailto:` href with the subject set and
the answers as labelled lines. Beside it, what answering actually gets you: a
reply in two working days, a thirty-minute call, a written proposal inside a
week. Numbered, because it is a sequence and it can be held to.

**Consequence.** There is no endpoint, no request and nothing to secure: the
link opens the visitor's own client, and the caption says so rather than
implying a form that submits somewhere. The action ships as a working `mailto:`
with the subject already on it, so it is useful before any script runs; the
composer only ever rewrites an href that was already correct. With scripting off
the fields are never shown — `.js .brief` — and the address above them is the
baseline it always was.

The action is an anchor rather than a button, so middle-click and long-press
behave the way they do on every other link on the page.

One detail worth the test it has: `URLSearchParams` is form encoding and writes
a space as `+`. A mail client reading a `mailto:` query shows that plus sign
literally, so the subject arrives as "Project+enquiry". The composed href
percent-encodes instead.

**Verified against the build, not the dev server.** In dev, Vite injects CSS
through JavaScript, so a scripting-off check there loads no styles at all and
every element reports its default `display` — which looks exactly like the
fallback being broken. The no-JS behaviour was confirmed on `vite preview`,
where the composer is `display: none` and the address, the subject-bearing
action and all three steps are still in the markup.

## The composer came out again

**Supersedes** "The last section had to do something".

**Context.** The brief composer worked — three inputs writing a `mailto:` with
labelled lines, hidden without JavaScript, tested to the encoding. It was also
the wrong answer to the question. Set against a reference for how the section
should read, the difference was obvious: a studio's last word should sound like
a person talking, and a panel of form fields sounds like a support ticket.

**Decision.** Prose. The note runs as a sentence with links inside it — five
projects, how we work, say hello — with the address still set large above it and
a column of destinations to the right. Nothing to fill in.

**Consequence.** `features/brief.ts` and its nine tests are gone. The behaviour
they protected went with them, and that is the point: an enhancement nobody
wants is a liability whatever its coverage. `git log` has it if the argument for
a composer ever comes back.

Copy stays data rather than markup. A run of prose is an array where a string is
escaped text and an object is a link, so the content module cannot hand the
renderer a string of HTML, and the sentence still reads as a sentence in
`site.ts`. The footer lost its own nav in the same pass: the column beside the
note carries those three links now, and repeating them twenty pixels lower was
never doing anything.

**One line drawn on purpose.** Links inside running prose are underlined. The
page removed every hairline it had, and this is the exception: inside a
sentence, a colour change alone does not say "this is a link" — and unlike a
rule, an underline is doing work rather than dividing something.

## The page sets

**Context.** The footer was a row of links and a copyright line on the darkest
value in the palette. The page opened with a sky and ended with a form field's
worth of nothing.

**Decision.** End on a horizon. A circle 5600px across, painted the same colour
as the ground it sits on, pushed down until only a rim of it is inside the
frame. It is never seen — it exists to have an edge, and all the light is in the
shadow cast around that edge, which is what turns a glow into a horizon.

Three shadow layers, cold to warm to cold, in the order the hero's colour ramp
uses them: a tight white rim, the warm note just above it, then a wide violet
atmosphere holding the curve. The body carries a short gradient of its own so it
catches a little of that light before falling away to the ground colour, rather
than reading as a hole cut in the page.

**Consequence.** The globe that used to turn in the hero is gone, but the shape
it left behind was worth keeping, and this costs one pseudo-element instead of a
renderer — no canvas, no loop, nothing to pause when the tab is hidden.

The geometry is stated rather than guessed: `--rim` is how far above the
footer's bottom edge the horizon sits, and the circle's offset and the footer's
padding are both derived from it, so the type always clears the line. The radius
shrinks with the viewport, because a curve has to be read against the width it
is drawn in — left at the desktop radius a phone shows a straight line.

## A page that scrolled sideways on a phone

Found while checking the footer at 390px: the address, set at
`--size-contact`, ran 15px past the right edge and took the whole document with
it. The minimum of the clamp was `1.9rem`, which is wider than a phone can hold
for an unbreakable twenty-one character token.

It predates the footer work — the same overflow reproduces on the previous
commit, which is worth saying, because "my change broke it" and "my change
revealed it" call for different fixes. The clamp now bottoms out at `1.35rem`
and scales on `6.9vw`, and the link is `overflow-wrap: anywhere` as a floor it
should never reach. Nothing overflows at 390px or at 320px.

A horizontal scrollbar on a phone is not a small bug on a page whose whole
argument is that the details were checked.

## The page sets, second attempt

**Supersedes** "The page sets".

**Context.** The horizon worked. Asked for another version of it, two were built
before one was worth keeping.

**Aurora, rejected.** Curtains of light rising from the bottom edge, echoing the
hero that was deleted. It read as a smear. The failure is one this codebase has
met before: the warm accent and the violet overlap and _sum_, and where they
overlap they go brown. The heat map solved that by screening rather than adding;
stacked CSS gradients have no such option, so the fix would have been to stop
overlapping them, at which point it is no longer an aurora. Some ideas do not
survive contact with their medium.

**Eclipse, kept.** The same move as the horizon, turned into a whole shape
rather than an arc: a body the colour of the ground it sits on, with the light
stacked around its edge. Nothing is drawn, something is occluded, and what you
see is the corona the occlusion leaves behind. The copyright sits inside it, in
the shadow.

**A rendering bug worth recording.** The first eclipse put all four light layers
in one `box-shadow`, the widest at `280px` blur. Chrome tiles a blur that large
and the seams show as hard vertical bands across the whole footer — visible in a
screenshot, and nothing to do with the CSS being wrong. The three tight layers
stayed in the shadow; the wide violet atmosphere became a `radial-gradient` on a
second pseudo-element, which is the same light for less work and renders clean.

**The geometry is derived, not guessed.** `--body` is the disc, `--corona` is how
far the light reaches past it, and the footer's padding is `--body / 2 +
--corona`. The footer clips its own overflow, so anything less cuts the glow at
the top and bottom edges — which is exactly what the first three attempts did, at
64 to 97px of margin against a corona that reached 126. Stating the relationship
means it holds at any width and whatever the copyright line wraps to, and a
short window shrinks the body and the light together rather than cropping one of
them.

## An ordinary footer

**Supersedes** "The page sets" and "The page sets, second attempt".

The page had a horizon here, then an eclipse. Both were good drawings, and both
were louder than a footer needs to be. This is the part of a site people arrive
at looking for a link, and the job is to have the link where they expect it.

Brand and tagline on the left, two columns of links on the right, copyright and
the disclaimer along the bottom. It separates from the contact section by ground
like everything else on the page — no rule across the top, and none between the
rows.

Two ideas were built and thrown away to get to the plainest possible answer.
That is not waste: an eclipse in the footer is the kind of thing that looks like
a decision until you have seen it under the section it follows, and the contact
note above it is now the last thing with any weight, which is the right order.

The `Source` link points at the repository. The studio is invented; the code is
not, and a footer is the conventional place to say so. External links carry
`rel="noreferrer"` — the page has no business telling another site where its
visitors came from.

## The contact section lost its headline and its address

The section opened with "Tell us what you are building." and set
`studio@elysia.example` underneath it at display size. Both are gone; the note
is the section now.

The headline was saying what the paragraph under it already said, one line
earlier and twice as loud. The address was the more interesting cut: it was the
biggest thing on the page after the wordmark, and everything it did is still
done — "say hello" in the note is a `mailto:`, the row under it has Email, and
so does the footer. A twenty-one character string set at 2.85rem was buying
emphasis, not access, and it was the one element on the page that had to be
argued with about wrapping on a phone.

`--size-contact` went with it, and so did `.lede--wide`, which had quietly lost
its last user when the contact lede got a class of its own a commit earlier.
Dead CSS is not free: it is a rule someone later has to read and decide about.

The footer came down about a fifth in height at the same time. Nothing was
removed from it — the padding and the gaps were simply larger than a footer with
two short columns needs.

## The prism is the ramp, not a rainbow

**Context.** An iridescent gradient — the Apple register: a multi-hue fill on
display type, drifting. Asked for one, the obvious move is a stock rainbow, and
it would have been the first thing on this page that came from nowhere. Every
colour here is one hue at a different value, and a spectrum that ignores that
reads as an effect applied to the site rather than a property of it.

**Decision.** The site already owns a spectrum: `hero/ramp.ts` bakes the
nebula's, violet holding until the top of the range where it breaks pink and
then warm. `--prism` is that ramp's upper stops, lifted into a register that
reads as type on a dark ground. The same light the hero is painted with, used as
ink.

**Where.** Two places, one token. The wordmark takes it with a slow sweep — the
page's largest surface and the only one big enough for a gradient to be a
gradient rather than a tint. The capability numerals take it standing still, six
cards sampling one period at even intervals, so the index reads as a spectrum
across the row instead of six copies of the accent. A numeral is two characters
wide and lands on effectively one colour; the effect is the row, not the numeral.

**Guarded, because the failure mode is invisible text.** The fill is a background
clipped to the glyphs, which means `-webkit-text-fill-color: transparent`. Where
`background-clip: text` is unsupported that is a wordmark nobody can read, so
everything sits inside `@supports`, and `color: var(--halo)` outside it still
stands. Reduced motion keeps the gradient and drops the sweep.

**The sweep loops.** `background-size: 200%` and a position animating 0% to 100%
slides the image by exactly one element width, so the gradient carries the stop
sequence twice and one period is one element width. Stated that way it is
obviously seamless, which is not a reason to believe it: rendered at both ends
of the cycle the wordmark is pixel-identical, against a control at 50% that is
not. The first attempt at that test compared screenshots with the nebula still
running behind the transparent glyphs and reported a seam that did not exist.

## The prism moved to the note

**Supersedes** the placement in "The prism is the ramp, not a rainbow". The
token and the argument for it stand; where it lands changed.

Off the wordmark and off the capability numerals, onto the contact note. The
wordmark is the page's loudest element already — size, weight and a canvas
behind it — and giving it a second job made the hero busy rather than better.
The numerals were the opposite problem: two characters of 11.5px mono each,
which is not enough surface for a gradient to be a gradient. The note is one
paragraph at reading size, which turns out to be the right amount of text: long
enough that the spectrum travels, short enough that it is an accent rather than
a wall of coloured type.

**Legibility is the reason it is safe here.** Every stop is light, and against
the deck ground they run 8.53 to 15.01 — the plain body text on that ground sits
at about 10.53, so the coloured lines are in the same band, not below it. That is
the check that decides whether an effect can go on body copy, and it is worth
doing before the effect rather than after.

`-webkit-text-fill-color` inherits, so the links inside the sentence take the
prism too. That is correct — the paragraph is one piece of text — and their
underlines come from `text-decoration-color`, which nothing here touches, so a
link still reads as a link at whichever stop it lands on.

One rule was written and deleted in the same pass: an override nudging that
underline from 0.4 to 0.45 alpha, placed above the rule it meant to beat. Same
specificity, earlier in the file, so it did nothing. The computed value said 0.4
and the rule went.

## The grounds went black

**Supersedes the values in** "A step you cannot see is not a decision". The
argument stands; the hue does not.

**Context.** The page was violet all the way down — `--surface` `#1a0f3a` under
the deck, which is most of what a visitor sees. It worked, and it committed the
whole site to one colour whether or not a given section wanted it.

**Decision.** Black grounds. `--void` `#050506`, `--dusk` `#0a0a0c`, `--deep`
`#141419`, `--surface` `#17171d`.

**What that costs, and how it was paid.** The seam between the hero and the deck
was reading on two channels at once: the planes differed in value _and_ in hue.
Take the hue away and only value is left, so the steps had to be rebuilt rather
than desaturated. They were sized to land where the violet ones did, and they do:

| step                  | violet | black     |
| --------------------- | ------ | --------- |
| seam edge             | 1.241  | **1.230** |
| deck field            | 1.145  | **1.142** |
| work band             | 1.102  | **1.108** |
| body text on the deck | 10.53  | **10.50** |

Same architecture, measured the same way, with the colour taken out of it.

**Violet did not leave, it stopped being the floor.** It is in the nebula, in
the light at the seam — the deck still opens at a mix of `--iris` — in the
accent, and in the prism on the contact note. That is a better place for the
only hue on a page to live than under every section of it, and on black those
four things are now the only colour there is.

**Components that were carrying the old hue.** The hero sky's vertical gradient
ended on `#05030c` at both ends and had to end on the page's actual ground; its
middle stops kept their violet, because that band _is_ the nebula's atmosphere
and is now the only colour above the fold. The nav capsule was a violet
translucency chosen to sit on a violet page — `rgb(17 9 34 / 0.55)` — and went
neutral, along with its shadow and its opaque reduced-transparency fallback.

The bench caption said "One hue held across values, and a single warm note",
which stopped being true the moment this landed. A palette exhibit that
describes a system the page no longer has is worse than no exhibit.

## Four subtractions

**Supersedes** "Capabilities are an index, not a row of boxes".

**The dot in front of every section label.** A five-pixel accent circle on
`.eyebrow::before`. One of them is a nice detail; five down the page read as
punctuation the sections did not ask for, and the label already says where you
are. The eyebrow is an `inline-block` with no gap now, and `--accent` still has
two users — the work list and the bench — so the token stays honest.

**The capability cards.** Six rounded rectangles under the practice lede,
numbered, gradient-lifted, redesigned once already. The section is the lede and
two paragraphs now, which say the same six things in prose and say them better.

That removed the last reader of `capabilities` in `site.ts`, and with it
`knowsAbout` in the JSON-LD. Structured data describes the page: the page no
longer claims those six disciplines, so neither should the markup describing it
to a crawler. A schema field kept alive by an array nothing renders is a claim
about a page that does not exist.

The bench's Parts panel showed a capability card among its live components. It
now shows the same `.index-list` the studio facts use — still a real component
on a real page, which is the only thing that panel is allowed to contain.

**The Email / Work / Studio row under the contact note.** Three links twenty
pixels above a footer that carries all three. The note itself still reaches the
inbox through "say hello".

**The prism stopped crawling.** The sweep was 28 seconds — slow enough that
nothing appears to be happening, which makes a prism just a multicoloured
paragraph. Ten seconds is where the colour is visibly travelling through the
words without the line you are reading changing underneath you. Verified by
capturing the paragraph 1.5 seconds apart and confirming the frames differ.

## The hero went grey

**Context.** The grounds went black two commits ago and violet stopped being the
floor. The hero kept it: a violet nebula over a violet sky, the one room in a
different colour from the rest of the house.

**Decision.** Grey, everywhere the hero paints.

- `hero/ramp.ts` is a grey ramp — a long exposure in black and white rather
  than a colour plate. Each stop carries a few points more blue than red and
  green, the same bias the black grounds carry, so the nebula and the page read
  as one material.
- The `.sky` gradients, visible before first paint, under reduced motion and
  with scripting off, went grey stop for stop, each matched to the luminance of
  the violet it replaced — the light sits where it did and only the hue is gone.
- The scrim was `rgba(5,3,12)`, a violet black; it is the page's `--void` now.
  The stars were lilac and are white with the same cool bias.
- The wordmark and tagline take `--hero-ink`, scoped to the hero. `--halo` is a
  lilac white — the right ink for the page, faintly purple over a grey plate —
  and the page's ink was not what was asked about, so it stays.
- The seam lift was a 20% mix of `--iris`: a violet rim under a grey hero, which
  reads as a leftover. It is `#1e1e24`, landing the seam edge at 1.229 against
  the void where the violet one sat at 1.230.

**Measured, not eyeballed.** Chroma — the spread between a pixel's highest and
lowest channel — on the rendered hero below the nav: **max 7**. The grey ramp's
stops peak at 8; the violet ramp's ran up to 134. The only pixels in the viewport
above 16 are 238 in a 52×12 box at the bottom edge: the label on the active seam
tab, which is deck ink, not hero.

That measurement also caught a mistake. The first pass read the tagline as
having no colour of its own — a regex looking for `var(--text…)` did not match
the declaration's actual form and reported absence instead of a miss — and the
hero still measured 34. That is exactly `255 − 221`, the lilac itself. The
tagline was set to `--halo` at 62%, and is `--hero-ink` at 62% now.

**`--iris` is retired.** With the seam neutral it had no reader left but its own
swatch in the palette bench, and a palette exhibit that lists a colour the page
does not use is a swatch library. Token and swatch both went.

**The prism now has a history.** Its stops were lifted from the violet ramp,
and three places said so in the present tense — the token's comment, the
accent's comment and the README. The prism kept the colours; the nebula did
not. It is the one place that spectrum survives, and the docs say that instead.

What is still violet above the fold: the call to action in the nav capsule, and
the page's lilac ink wherever deck text shows through at the bottom edge.

## Sizes and spacing, and a rule that went missing

**A regression, found by measuring.** The pass started with a census of every
distinct text size the built page actually renders, and it showed 25 elements
carrying the `label` class — nav links, the call to action, section labels, the
seam tabs, the tagline, the footer — all at the 16.5px body size. The class had
no rule. "Four subtractions" removed the capability cards by cutting everything
between their comment and `.eyebrow`, and `.label`, `.code` and the line opening
`@layer utilities` were in that range. Every label on the site jumped from 13px
to 16.5px, and `.eyebrow` and `.visually-hidden` spent a commit in the wrong
cascade layer. No test asserts label styling, so nothing failed.

Both rules are restored verbatim and the utilities layer is reopened where it
was. That alone took the header from 483×61 to 428×55, and put the contact note
and the footer back at the sizes they were designed at.

**Then the tuning.** The header is 43px tall: 13px type, tighter padding, a
smaller mark. Its lilac went neutral, the call to action a pale neutral pill
with the same sheen the gradient had, on one shared `--neutral-rgb` that the
grey hero also reads now instead of its own copy. Contrast: links 7.3–7.5:1,
the active link 12.6–13.5:1, the pill's text 13.0–17.2:1.

Section padding is sized from width rather than viewport height. At 11vh a tall
phone got 93px above and below every section; it is
`clamp(56px, 4vw + 20px, 96px)` now.

|                                  | before        | after             |
| -------------------------------- | ------------- | ----------------- |
| header, desktop                  | 428 × 55      | **387 × 43**      |
| section padding, desktop / phone | 99 / 93px     | **78 / 56px**     |
| lede                             | 46.4px        | **38.4px**        |
| work titles                      | 29.6px        | **25.6px**        |
| footer name                      | 28px          | **24px**          |
| contact note, case intro         | 19.2px        | **17.6px**        |
| body                             | 16.5px        | **16px**          |
| distinct sizes, desktop / phone  | 12 / 13       | **11 / 10**       |
| page height, desktop / phone     | 3766 / 4810px | **3499 / 4269px** |

The 15px used by the fact values and the bench's part samples merged into the
14.5px beside it; half a pixel apart, they were one size pretending to be two.
The wordmark was left alone — it is the one element meant to be that large.

## The place line went too

"Written and built remotely, from six desks across Europe." sat under the
contact note. The studio section already says remote, Europe, and six people, a
screen earlier and in facts rather than flourish. The note is the whole section
now: one paragraph, and the footer under it.

## Presentable, and measured

**The README described a site that no longer existed.** It opened on a planet
rendered as a heat map, counted 216 tests, walked through land-mask and
city-table tests, credited Natural Earth coastlines, and mentioned a dot on
every section label and an availability badge — all removed over the weeks
before, none of it reflected. Anyone comparing it with the live page would have
found the two contradicting each other. It is rewritten from the code as it
stands, with every number in it measured the same day.

**Lighthouse, run properly.** The first run on the unchanged build scored 70 on
mobile with 920 ms of blocking time. The next four runs of the same build scored
95 to 99 with blocking time near zero. A single simulated-throttling run is not
a measurement, so every figure published is a median of three.

That lesson arrived twice. A first "after" run appeared to lift mobile
performance from 70 to 96 — but the check had failed on a test, the build step
behind it never ran, and the preview was still serving the old build. The runs
are gated now: nothing is measured unless the check passed and the built page
carries the change being measured.

**An optimisation that was reverted.** On the strength of that first 70, the
hero was changed to start once the page went idle, at a lower density on touch
screens. The baseline showed there was no problem for it to solve, so it came
out. An optimisation without a measured problem is complexity with a story
attached.

**Two accessibility failures, fixed.** `color-contrast` flagged 12 elements: the
dim ink at 4.34–4.39:1 on the darkest grounds, and the faint ink at 2.36:1 under
the footer. The inks were recomputed against every ground they can land on, the
lightest being a hovered card. The floor for 4.5:1 is 0.55 alpha; the three
steps are now 0.8, 0.66 and 0.56, the last at 4.61:1 in the worst case.
`link-name` flagged the call to action on phones: its long label was
`display: none` and its short one `aria-hidden`, which left the link with no
name at all. The long label is visually hidden instead. Accessibility went from
92 and 96 to 100 on both.

**Forced reflows, found and removed.** Lighthouse's forced-reflow insight named
three places in the minified bundle, which mapped back to source like this:

| what                                                       | desktop / mobile | fix                                                           |
| ---------------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| the canvas's draw read its element's size on every frame   | 127 / 153 ms     | size cached on resize; a test fails if a frame reads layout   |
| the bench read a token, wrote it, then read the next       | 71 / 101 ms      | reads batched before writes, and deferred past the next frame |
| the canvas read `--horizon` just after resizing its buffer | 32 / 40 ms       | every read first, then the writes                             |

One remains. In about one run in three, the canvas host's first measurement at
startup forces a single layout — 62 ms and 193 ms in the two runs that showed
it. That is layout the browser has to compute before first paint regardless.
Removing it means sizing the canvas from `ResizeObserver` entries instead of
reading the element, which changes the host's startup order and every test that
constructs one: worth doing, and not worth doing blind in the same pass as
everything above.

**Link previews pointed at a domain that does not exist.** The canonical link,
`og:url`, the sitemap and `robots.txt` all used the studio's fictional address,
and there was no preview image. The deploy build now passes `SITE_URL`, the
plugin exposes it as a `site-url` placeholder, and a 1200 × 630 `og.jpg` ships
with the page. Slot lookup also stopped resolving through the prototype chain,
so a placeholder named `constructor` fails the build instead of calling
`Object`.

**Housekeeping.** `.claude/`, local tooling config, is untracked and ignored.
`package.json` gained `homepage`, `repository`, `bugs` and `keywords`.
`theme-color` was still the violet black from two palettes ago and now matches
`--void`. And this log gained an index, split into what still stands and what
was superseded, generated from the entries' own supersede lines.
