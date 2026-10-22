# Proposal

- **Change**: `mobile-layout-overflow`
- **Branch when authorized**: `fix/mobile-layout-overflow`
- **Owner role**: `dev`
- **Track**: 1 (Light) — frontend-only, one file (`frontend/index.html`) plus a verification script
  under this change's `checks/` folder, no API, schema, or dependency change.
- **Capability**: `game-presentation`
- **Depends on**: `turn-timer-bar-drain` (the first of this cycle's four changes; it must land first
  because it removes an element from the question panel whose box this change re-measures)

## Why

The game is not usable on a phone, and the defect is measurable rather than arguable. The start
screen, the question screen and the wheel screen all place content outside the viewport, and because
`body { overflow: hidden }` and `.panel { position: fixed; inset: 0 }` are both required by the
living spec, that content is **silently clipped with no way to scroll to it**.

Measured with a deep DOM probe (every rendered descendant's bounding box against
`window.innerHeight`, per panel):

| Viewport | Panel | Overflow | Unreachable |
|---|---|---|---|
| 320x568 | start | **355px** | the bottom of the manual-authoring form |
| 360x640 | start | **284px** | the bottom of the manual-authoring form |
| 390x844 | start | 71px | the bottom of the manual-authoring form |
| 414x896 | start | 1px | the bottom of the manual-authoring form |
| 844x390 | start | **526px** | the bottom of the manual-authoring form |
| 1440x900 | start | 21px | **desktop fails too** |
| 320x568 | question | **150px** | the options, the feedback strip and "Siguiente turno" |
| 844x390 | question | 93px | the options, the feedback strip and "Siguiente turno" |
| 844x390 | wheel | 47px | the base of the wheel is cut off |

`openspec/project.md` requires that "the frontend must remain usable at desktop and mobile viewport
sizes". It is not, and one of the failures is on a desktop viewport as well.

The cause is structural: the panels are flex columns, so their children are flex items that **shrink**
instead of overflowing, and the panel itself has no overflow rule — so content that does not fit is
painted outside the viewport and clipped by `body { overflow: hidden }`. The manual-authoring form
added to the start screen made that screen taller than the viewport; the question screen was already
over-budget on a 320px phone.

## What Changes

- Give the panels a bounded internal overflow so that content that genuinely exceeds the viewport
  stays **reachable** instead of being clipped: a panel scrolls internally when its content does not
  fit, while the **document** still never scrolls and the panel container stays
  `position: fixed; inset: 0`. The living spec's "Fixed single-screen shell" requirement is amended
  accordingly, in its own words, in the delta.
- Tighten the layout so that at the common phone sizes **nothing needs to scroll**: a compact
  authoring form, a fluid vertical rhythm on the question screen, and a wheel whose size follows the
  viewport's height on landscape phones. The fitting is done with `clamp()`, `min()` and `vh` units
  and adds **no media query**, and the design's single-column option grid below `768px` is
  preserved.
- Commit a reproducible layout-measurement script under `openspec/changes/mobile-layout-overflow/checks/` so the mobile criteria are
  checked by a machine and not by eye.

## Out of scope

The timer, the audio, the surrender control, the wheel's sectors and their geometry, the neon
palette, the glass tokens, the radii, the typography scale below 18px, any API route, any dependency,
any change to `body { overflow: hidden }` or to the four panel ids.

## Depends on

`turn-timer-bar-drain`. It removes the numeric countdown from the question panel, and this change
re-measures that panel's box; measuring first and removing second would mean measuring a box that is
about to change.

## Alternatives considered

- **Let the document scroll.** Rejected: the living spec requires `body { overflow: hidden }` and a
  fixed panel container, and the game is designed as a single screen with panels swapped in place.
- **Collapse the authoring form by default.** Rejected for now: it changes the behaviour of the
  `question-authoring` capability's UI, which is a separate concern from layout. The internal-scroll
  safety net makes the form reachable without changing what the form is.
- **Scale the whole game down with a CSS `transform`.** Rejected: it blurs text, breaks the
  `backdrop-filter` glass surfaces, and the spec fixes the question text at no less than 18px.
- **Treat the `#wheel` reading at 320px as a defect.** Rejected, and recorded so it is not
  re-investigated: the probe reports the element's axis-aligned bounding box, which grows when the
  square is rotated. The wheel is a circle inside a 269px box (26..294) and all seven sector labels
  fit (`labelOverflow: 0`). There is no defect.
