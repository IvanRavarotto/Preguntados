## ADDED Requirements

### Requirement: A failed turn announces the next player before the turn starts

When the active player loses the turn — an incorrect answer, a timeout, or a final second-attempt
failure — the question screen SHALL show a **turn-change notice** that names the **next** player, with
a visible countdown of `5` seconds and a start control.

The notice SHALL read exactly `Turno de <next player's name>`. It SHALL **replace** the behaviour of
the existing `#q-next` "Siguiente turno" control rather than add a second control: `#q-next` SHALL
remain the only start control, SHALL read `Empezar turno` in this state, and SHALL carry the accessible
name `Empezar turno de <next player's name>`.

The countdown and the auto-advance SHALL derive from one constant, `TURN_NOTICE_SECONDS = 5`. The
countdown SHALL be a visible indicator that drains from full to empty over the full five seconds and
SHALL publish its remaining seconds to assistive technology on a `role="progressbar"` element's
`aria-valuenow`. It SHALL NOT render the remaining seconds as text, because the living "Type pairing is
preserved without webfonts" requirement forbids a numeric countdown on the question screen.

If the start control is pressed, the next turn SHALL begin immediately and the pending auto-advance
SHALL be cancelled. If the notice is untouched, the next turn SHALL begin automatically when the
countdown reaches zero. The manual and automatic paths SHALL share one idempotent exit, so a manual
start SHALL NOT be followed by a second advance.

The notice SHALL NOT appear on a correct answer or on a crown claim. On a failure the feedback strip
SHALL still reveal the stored correct answer. A pending notice timer SHALL be cleared by surrender,
rematch, the winner screen, and the rendering of a new question.

The notice SHALL NOT change the 20-second turn timer, scoring, crowns, jokers, surrender, rematch,
question non-reuse, or turn order, and SHALL add no request, asset, dependency, or fifth panel.

> `[AUTHORED]` The notice is the human's requested behaviour; no `stitch/DESIGN.md` section describes
> a turn-change notice, so its existence and wording are this project's judgment rather than a design
> source. **The countdown is a draining indicator rather than digits, and that is a conflict
> resolution, not a stylistic preference.** The living "Type pairing is preserved without webfonts"
> requirement says "No numeric countdown SHALL be added to the question screen", and its scenario
> searches the whole question panel for an element that renders the remaining seconds as text. Visible
> `5, 4, 3, 2, 1` digits would fail that scenario literally. A bar that empties over five seconds, with
> the seconds published on `aria-valuenow` exactly as the 20-second timer already publishes them
> (`frontend/index.html:643`, written at `:1608` and `:1620`), satisfies "visible countdown" without
> contradicting the living spec. If the human wants digits on screen, the living requirement must be
> amended by a `MODIFIED` delta at Gate B; that amendment is deliberately **not** smuggled in here.

#### Scenario: The notice names the next player and shows a five-second countdown

- **GIVEN** the active player loses the turn with a wrong answer
- **WHEN** the failure feedback is rendered
- **THEN** the turn-change notice is visible and its text is exactly `Turno de <other player's name>`
- **AND** `#q-next` is visible, reads `Empezar turno`, and its accessible name is
  `Empezar turno de <other player's name>`
- **AND** the countdown indicator is visible when the notice appears, its rendered length decreases
  monotonically, and it reaches zero `5.0s` after the notice appears, within `±0.5s`
- **AND** the countdown's `role="progressbar"` element reads `aria-valuenow="5"` when the notice
  appears and `aria-valuenow="0"` when the countdown ends
- **AND** no element in the question panel renders the remaining seconds as text
- **AND** a copy of the file that arms the countdown before the notice is unhidden FAILS this scenario,
  because its bar has no running transition when it becomes visible

*Provenance: `[AUTHORED]` for the notice, its text, and the five-second duration. `[IMPL]` — the turn
is flipped before the feedback is drawn (`resolveFailure` at `frontend/index.html:1751–1760`, flip at
`:1757`, `showFeedback` at `:1758`), so `player()` already names the next player; the reused control is
`#q-next` at `:661`, styled by `.next-btn` at `:376`. `[PRESERVE]` — the no-digits clause is the living
"Type pairing" requirement; its `aria-valuenow` allowance is the same mechanism the 20-second timer uses
at `:1608` and `:1620`. Measurable: the notice's text, the control's visible and accessible names, the
bar's rendered length across the five seconds, and the two `aria-valuenow` readings. The `±0.5s` window
and the monotonic drain are runtime observations, not read from source; the source-read check can only
assert that the transition and the timeout both interpolate `TURN_NOTICE_SECONDS`.*

#### Scenario: Pressing start begins the turn at once and cancels the auto-advance

- **GIVEN** the notice is visible with time remaining on its countdown
- **WHEN** the start control is pressed once
- **THEN** the wheel screen is shown immediately and the wheel's turn chip names the next player
- **AND** no second advance occurs when the original five seconds elapse: after waiting a further six
  seconds the wheel screen is still shown for that same player, with no new question
- **AND** the spin control is enabled exactly once and no question is requested after the press
- **AND** a copy of the file whose button path does not clear the pending timer FAILS this scenario

*Provenance: `[AUTHORED]` for the exactly-once requirement. `[IMPL]` — `#q-next` already binds to
`nextTurn` (`frontend/index.html:957`), and `nextTurn` returns to the wheel at `:2519–2536`, `:2535`.
Measurable: the visible screen, the turn chip's name, the spin control's state, and the absence of a
second advance after six seconds. The "no double advance" half is a runtime observation; the
source-read check can only assert that `nextTurn` calls `clearTurnNotice()` before its branches.*

#### Scenario: An untouched notice starts the turn automatically at five seconds

- **GIVEN** the notice is visible and no control is touched
- **WHEN** the countdown reaches zero
- **THEN** the wheel screen is shown at `5.0s` after the notice appeared, within `±0.5s`
- **AND** the wheel's turn chip names the next player
- **AND** exactly one advance occurs, and the 20-second question clock is not running
- **AND** a copy of the file whose auto-advance fires from a second, unrelated duration FAILS this
  scenario

*Provenance: `[AUTHORED]` for the auto-advance. `[IMPL]` — the question clock is stopped when the
failure resolves (`finishQuestion` calls `stopTurnClock` at `frontend/index.html:1682`, definition at
`:1625–1629`), and `nextTurn` shows the wheel at `:2535`. Measurable: the time from the notice's first
visible frame to the wheel screen, the turn chip's name, and the question clock's stopped state. The
timing is a runtime observation; the source-read check asserts that the timeout uses `TURN_NOTICE_MS`.*

#### Scenario: No notice on a correct answer or a crown claim

- **GIVEN** a correct answer, and separately a correct answer that claims a crown
- **WHEN** the feedback is rendered
- **THEN** the turn-change notice is hidden and no countdown starts
- **AND** `#q-next` reads `Siguiente turno`, or `Reclamar corona` when a crown is pending
- **AND** on the sixth crown the winner screen is shown and no advance occurs five seconds later
- **AND** a copy of the file that unhides the notice in the `ok` branch FAILS this scenario

*Provenance: `[IMPL]` — the correct path calls `showFeedback("ok", q)` at `frontend/index.html:1739`,
the pending-crown label is written at `:1747`, and the sixth crown ends the match at `:1741–1743`
through `finishMatch` (`:2500–2517`). `[PRESERVE]` — a crown is never awarded without its question.
Measurable: the notice's hidden state, the button's label, and the screen shown after five seconds.*

#### Scenario: The stored correct answer stays visible on a failure

- **GIVEN** one question answered incorrectly and a second question allowed to time out
- **WHEN** each failure resolves
- **THEN** the feedback strip's text contains `Respuesta correcta: <stored answer>`
- **AND** the option card whose text equals the stored answer carries the `right` class
- **AND** the strip's state class is `ko` for the wrong answer and `timeout` for the timeout
- **AND** the notice is visible in both cases

*Provenance: `[IMPL]` — the answer text is built at `frontend/index.html:1817` and written for `ko` and
`timeout` at `:1821–1822`; `finishQuestion` marks the stored answer `right` at `:1687`; the three state
classes are at `:373–375`. `[PRESERVE]` — `openspec/project.md` requires visible feedback for correct,
incorrect, and timed-out answers, and the living "Correct, incorrect, and timed-out feedback" requirement
requires the timeout to reveal the answer. Measurable: the strip's text and class, the marked card, and
the notice's visibility.*

#### Scenario: The twenty-second timer, scores, crowns, and turn rules are unchanged

- **GIVEN** a match played through wrong answers, timeouts, and a second-attempt failure
- **WHEN** the timer, the scores, the crowns, and the turn are read after each failure
- **THEN** the question timer still runs for `20` seconds and `TURN_NOTICE_SECONDS` is `5`, and neither
  constant reads the other
- **AND** a failure adds zero points to either player and preserves both crown counts
- **AND** the turn alternates exactly once per failure
- **AND** no question is reused within a category during the match
- **AND** the 20-second bar's transition and its timeout still derive from `TIMER_SECONDS`

*Provenance: `[PRESERVE]` — `openspec/project.md` § Game and API contract and § Conventions, plus the
living "Timer module" and "Question non-reuse" requirements. `[IMPL]` — `TIMER_SECONDS = 20` at
`frontend/index.html:721`, `TURN_MS` at `:724`, and both timer derivations at `:1601–1623`. Measurable:
the two constants and their independence, both score totals, both crown counts, the active player after
each failure, and the absence of a repeated question id.*

#### Scenario: Surrender, rematch, and the winner screen clear a pending notice

- **GIVEN** the notice is visible with time remaining on its countdown
- **WHEN** a surrender is confirmed before the countdown ends
- **THEN** the winner screen is shown and remains shown when the original five seconds elapse
- **AND** no wheel screen or question appears afterwards
- **AND** when rematch is chosen, the wheel is shown and no stale notice advances the turn five seconds
  later
- **AND** a new question rendered while a notice was pending shows no notice and starts no countdown

*Provenance: `[AUTHORED]` for the clearing requirement. `[IMPL]` — `confirmSurrender` at
`frontend/index.html:2484–2498` calls `stopTurnClock` at `:2494` and `finishMatch` at `:2497`;
`finishMatch` at `:2500–2517` shows the winner screen at `:2511`; `resetMatchState` at `:1102–1127`
runs for rematch at `:1194` and for a new match at `:1178`; `renderQuestion` at `:1631–1678` resets the
question card. Measurable: the screen shown after five seconds in each flow, and the notice's hidden
state on a freshly rendered question. The "no stale advance" behaviour is a runtime observation; the
source-read check asserts the clearing calls are present in all three functions.*

#### Scenario: The notice adds no control, request, dependency, or fifth panel

- **GIVEN** the served document and a full match played through a failure
- **WHEN** the question card and the network log are inspected
- **THEN** `#q-next` is the only start control, there is exactly one element with that id, and the
  notice contains no `<button>`, `<a>`, or `<input>`
- **AND** the only requested paths are `/`, `/categories`, and
  `/questions/category/{category_name}?limit=200`
- **AND** exactly four elements with class `panel` exist, and no `@font-face`, external URL, image, or
  audio asset was added
- **AND** the change adds no build step, bundler, or runtime dependency

*Provenance: `[PRESERVE]` — the living "No external requests", "Fixed single-screen shell", and
"Gameplay behavior survives the restyle" requirements, and `openspec/project.md` § Conventions.
`[AUTHORED]` — the "only start control" clause. Measurable: the control count and ids, the request-path
set, the panel count, and the document's reference set.*
