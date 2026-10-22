# Design

- **Change**: `add-victory-animation-case`
- **Track**: 1 (Light)

## Placement and shell rules

The overlay is a **modal inside `#screen-winner`**, modeled on the existing `.crown-overlay` /
`.crown-modal` pair (`frontend/index.html:385–436`, `:596–602`). It is not a `.panel`, so the
`game-presentation` "exactly four panels" rule still holds. It is `position: absolute; inset: 0` over the
winner panel, and the panel already carries `overflow: hidden`, so the overlay cannot introduce page
scroll.

DOM added to `#screen-winner`:

- `<button id="case-open">` — "Abrir caja", placed in `.winner-actions` beside the existing buttons.
- `<canvas id="fx" class="fx" aria-hidden="true">` — the single effect canvas, `pointer-events: none`,
  layered above the podium and below the overlay chrome.
- `<div id="case-overlay" hidden>` containing `.case-modal`:
  - `.case-reel-window` with `.case-pointer` (the fixed centre marker) and `#case-reel` (the moving
    track holding the eight `.case-cell` elements).
  - `#case-result` — an `aria-live="polite"` line that announces the landed effect's name.
  - `.case-actions` with `#case-again` and `#case-close`.

Every added glyph is an inline `<svg fill="currentColor">`, consistent with the category icon set, so the
zero-external-request rule is preserved.

## Effect catalog

A single source of truth drives the reel, the result line, and the player:

```js
const CASE_EFFECTS = [
  { id: "confetti",  label: "Confeti",              draw: drawConfetti },
  { id: "fireworks", label: "Fuegos artificiales",  draw: drawFireworks },
  { id: "gunfire",   label: "Metralletas al aire",  draw: drawGunfire },
  { id: "fire",      label: "Fuego",                draw: drawFire },
  { id: "lightning", label: "Rayos",                draw: drawLightning },
  { id: "nuclear",   label: "Explosión nuclear",    draw: drawNuclear },
  { id: "money",     label: "Lluvia de guita",      draw: drawMoney },
  { id: "flash",     label: "Flash de cámara",      draw: drawFlash },
];
```

The reel is built from `CASE_EFFECTS`, so the cell count and the catalog cannot drift.

## Reel mechanics and the pure seam

- The reel shows each effect several times (the catalog is repeated so the track is longer than the
  window). `.case-cell` carries a `data-effect` id, so the landing is read straight from the DOM. A spin
  sets the track's `transform: translateX(...)` and lets a CSS transition with a `cubic-bezier` ease-out
  run for **4s** (aligned with the wheel spin's duration band), then the `transitionend` handler resolves
  the spin (with a `setTimeout` fallback and a spin token so a stale event cannot resolve a newer spin).
- The index is chosen **before** the transition, by a DOM-free pure function `chooseEffectIndex(count, rng)`
  returning an integer in `[0, count)`. The target is a cell in a **later repetition**
  (`cells[index + loops * count]`) so the track travels several laps.
- The offset that lands the chosen cell under the pointer is measured from the **target cell's layout
  metrics**: `offset = window.clientWidth / 2 - (target.offsetLeft + target.offsetWidth / 2)`.
  Layout metrics are independent of ancestor transforms, so the overlay's entry animation cannot skew
  them (a live `getBoundingClientRect()` measured mid-animation would). Measuring the live layout — rather
  than a closed-form `cellWidth * index` — is what makes the cell the winner *sees* under the pointer
  exactly the effect that then plays, whatever the box model, borders, or responsive cell width turn out
  to be. (A closed-form offset drifts once the real cell advance differs from the reported width.)
- `window.__case` exposes `getEffects()` (the catalog ids/labels), `getLandedId()` (the `data-effect` of
  the last target cell) and `chooseEffectIndex`, without reaching into private state.


## Effect player

One `requestAnimationFrame` loop manager owns `#fx`:

- `playEffect(id)` sizes the canvas to `devicePixelRatio`, clears the previous effect, looks up
  `CASE_EFFECTS`, and starts its `draw(ctx, frame, t)` update.
- Each effect is a self-contained particle system with a fixed lifetime (about 3–4s) after which the
  manager clears the canvas and stops the loop; `stopEffect()` cancels the loop and clears the canvas so
  effects never stack.
- `drawConfetti` is the current `startConfetti` body, refactored to take the canvas context from the
  manager (`frontend/index.html:1522–1565`).

The effects are deliberately simple Canvas 2D sketches: `fireworks` (rising rockets that burst radially),
`gunfire` (two machine-gun silhouettes firing upward from the lower corners — muzzle flashes, rising
tracers, ejecting brass, and muzzle smoke), `fire` (rising flame tongues with flicker),
`lightning` (zig-zag bolts plus a full-screen flash), `nuclear` (blinding white flash, fireball core,
billowing mushroom cloud with turbulent cooling puffs, ground shockwave and dust, warm ambient glow), `money` (falling bills and coins), `flash` (camera flashes and a shutter blink).

## Reduced motion

`const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches` is read per spin. When true:
the reel transition duration is `0s` (the result appears immediately) and the chosen effect draws a short
static-ish form (one burst, no long travel). The effect name is still announced.

## Accessibility

The overlay is `role="dialog"` `aria-modal="true"` with an `aria-labelledby` heading; focus moves to the
"Girar de nuevo" button when it opens and returns to "Abrir caja" when it closes; `#case-result` is
`aria-live="polite"` and names the landed effect; the canvas is `aria-hidden`. Escape closes the overlay.

## Testing seam

No browser runs in this fleet, so the automated check is a Node sandbox over the shipped
`frontend/index.html` (the pattern the archived `checks/*.mjs` use). The stub models a **realistic but
adversarial layout**: cells advance 129px while each reports a 128px width — the box-model mismatch that
made a closed-form offset drift off the pointed cell. It then:

- asserts `window.__case.getEffects()` lists exactly the eight ids and every effect has a label;
- reads the applied `translateX(...)`, computes which cell the real 129px layout puts under the pointer,
  and asserts that cell's id equals `getLandedId()` — the effect the winner sees is the effect that plays;
  the app measures `offsetLeft`/`clientWidth`, which the stub also models as transform-independent;
- asserts the overlay starts `hidden`, pressing "Abrir caja" reveals it and switches it to the `played`
  phase, and the win path no longer starts a canvas effect on its own;
- mutation control: unlinking the played effect from the pointed cell (returning `CASE_EFFECTS[(index+1)%count]`)
  must fail the agreement, so the check is shown to have teeth.

