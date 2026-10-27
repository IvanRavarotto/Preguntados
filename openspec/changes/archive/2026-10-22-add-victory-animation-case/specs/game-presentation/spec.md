# Spec Delta

## ADDED Requirements

### Requirement: Victory case-opening roulette

When a match ends, the presentation SHALL offer a **case-opening control** on the winner screen and
SHALL NOT start a celebration animation on its own. The control SHALL open a modal overlay, placed
inside the winner panel and never a fifth `.panel`, containing a horizontal roulette **reel** with one
cell per victory effect — the catalog repeated to fill the track — and a fixed centre pointer. The reel
SHALL animate and stop with the chosen effect under the pointer. The victory-effect set SHALL be exactly
these eight stable ids: `confetti`, `fireworks`, `gunfire`, `fire`, `lightning`, `nuclear`, `money`, and
`flash`. Each reel cell SHALL carry a label and an inline `<svg>` glyph. On stop, the effect whose cell
is under the pointer SHALL be the effect played full-screen on the effect canvas, and the effect's name
SHALL be announced in a polite live region. Using the control SHALL add **zero** external requests, SHALL
NOT scroll the page, and SHALL honor the `prefers-reduced-motion` user preference by shortening the reel
and the effect.

#### Scenario: The overlay stays hidden until the case-opening control is used

- **GIVEN** a match that has just been won and the winner panel is shown
- **WHEN** the winner panel appears
- **THEN** the case-opening overlay is `hidden` and no celebration canvas is animating
- **AND** the winner's name, final score, and podium are visible as before
- **AND** activating the case-opening control reveals the overlay

#### Scenario: The reel holds exactly the eight named effects, each with an inline glyph

- **GIVEN** the case-opening overlay is open
- **WHEN** the reel cells and the effect catalog are read
- **THEN** every reel cell carries one of the catalog ids and each catalog id repeats the same number of
  times across the track
- **AND** the set of unique cell ids is exactly `confetti`, `fireworks`, `gunfire`, `fire`, `lightning`,
  `nuclear`, `money`, and `flash`
- **AND** every cell contains an inline `<svg>` glyph and a non-empty label
- **AND** no `@font-face`, external stylesheet, image, or font URL is present in the document

#### Scenario: The effect under the pointer is the effect that plays

- **GIVEN** the case-opening overlay with its eight-cell reel
- **WHEN** the case is opened eight times, once per target effect
- **THEN** for each opening the cell the user sees under the pointer and the effect then played are the
  same, because the track is translated from the target cell's measured layout position — 8 of 8
- **AND** the announced effect name matches the played effect's label
- **AND** a reel that derives the played effect from anything other than the pointed cell fails this
  agreement, which is the control that shows the check has teeth

#### Scenario: Reduced motion shortens the celebration

- **GIVEN** the user agent reports `prefers-reduced-motion: reduce`
- **WHEN** the case-opening control is used
- **THEN** the reel resolves without the long travel and an effect still plays
- **AND** the landed effect's name is still announced

#### Scenario: The case opening adds no request and no fifth panel

- **GIVEN** a full match played through to opening the case
- **WHEN** the network log and the panel set are inspected
- **THEN** the only paths requested are `/`, `/categories`, and
  `/questions/category/{category_name}?limit=200`
- **AND** exactly four elements with class `panel` exist and the document does not scroll
