# Proposal

- **Change**: `add-turn-change-notice`
- **Branch**: `feature/add-turn-change-notice`
- **Owner role**: `dev`
- **Track**: 1 (Light) — one static presentation file, no API, schema, dependency, asset, or new request, so no `design.md`.
- **Capability**: `game-presentation`

## Why

Today a failed turn ends with the same "Siguiente turno" button a correct answer uses, and the handoff
to the other player is implicit: the button names no one, waits indefinitely, and sits below a strip
that already shows the stored answer. On a shared device that produces two failures — the waiting
player does not notice the turn is theirs, and a match that should keep moving stalls until someone
touches the screen.

The turn already flips before the feedback is drawn (`resolveFailure`,
`frontend/index.html:1751–1760`, flip at `:1757`, `showFeedback` at `:1758`), so the screen has
everything it needs to name the next player at the moment of failure. This change uses that state.

## What Changes

- Add `TURN_NOTICE_SECONDS = 5` and `TURN_NOTICE_MS` beside `TIMER_SECONDS`
  (`frontend/index.html:721–724`). The countdown's transition and the auto-advance timeout both derive
  from that one constant, mirroring how the 20-second timer keeps its bar and its outcome coupled.
- Add a **turn-change notice** to the question card above `#q-next` (`frontend/index.html:648–662`):
  the text `Turno de <next player>`, a countdown indicator that drains over exactly 5 seconds, and
  `#q-next` reused as the start control, relabelled "Empezar turno". No second button, no fifth panel.
- Make `showFeedback` (`frontend/index.html:1815–1827`) start the notice only for `ko` and `timeout`;
  `ok` keeps today's "Siguiente turno" and "Reclamar corona" behaviour.
- Make `nextTurn` (`frontend/index.html:2519–2536`) clear the notice first, so the button press and the
  auto-advance share one idempotent exit and a manual start cannot be followed by a second advance.
- Clear a pending notice from `resetMatchState` (`:1102–1127`), `confirmSurrender` (`:2484–2498`),
  `finishMatch` (`:2500–2517`), `renderQuestion` (`:1631–1678`), `showFeedbackMessage` (`:1829–1835`),
  and `showFlowError` (`:1838–1852`).
- Add `openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs`, a Node source-read check
  with a `--self-test` mode that proves three mutants go red.

## Decisions

1. **`#q-next` is reused, not duplicated.** The requirement is to replace the button's behaviour, not
   add a control. The element already performs the correct action (`$("q-next").addEventListener(
   "click", nextTurn)` at `frontend/index.html:957`), so the notice only relabels it for the failure
   state and lets `nextTurn` cancel the pending timer.
2. **The countdown is a draining indicator, not digits.** The living "Type pairing is preserved
   without webfonts" requirement forbids a numeric countdown on the question screen, and its scenario
   searches the question panel for an element that renders the remaining seconds as text. A bar that
   drains over 5 seconds plus `role="progressbar"` / `aria-valuenow` satisfies "visible 5-second
   countdown" without contradicting that requirement. If the human wants visible digits, that needs a
   `MODIFIED` delta against the living requirement and is a Gate B decision — it is **not** taken here.
3. **The notice stays on the question screen.** The stored answer must remain visible on a failure
   (`frontend/index.html:1817`, `:1821–1822`), and moving the player to another screen would discard
   that context before they have read it.
4. **One start path, one guard.** A `turnNoticePending` flag plus `clearTurnNotice()` means the button
   and the timeout both call the same exit; the second call is a no-op. This is what makes "no double
   advance" a property of the code rather than a timing accident.
5. **No new colour or radius token.** The notice uses `--surface-low`, `--stroke`, `--r-sm`, `--text`,
   and `--mono`; the bar is tinted with the next player's existing seat accent (`player().accent`).
   `--r-sm` is deliberate: the living radius requirement's `9999px` set is closed and does not include
   this element.
6. **No audio cue.** The existing incorrect/timeout cues already mark the failure
   (`resolveFailure` at `frontend/index.html:1752`), and the audio mix is out of scope.
7. **No ADR.** No stack, boundary, datastore, or dependency decision changes.

## Impact

- `frontend/index.html` — notice markup and CSS, the two constants, `showFeedback`, `nextTurn`,
  `renderQuestion`, `showFeedbackMessage`, `showFlowError`, `resetMatchState`, `confirmSurrender`,
  `finishMatch`, and two new timer handles beside `timerId`/`tickId` (`:828–829`).
- `openspec/specs/game-presentation/spec.md` — via this delta; folded at archive.
- `openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs` — new source-read check.
- No API route, JSON contract, database schema, Docker Compose file, `fetch`, asset, or dependency
  change. No `design.md` at Track 1.

`improve-wheel-audio` is archived (`openspec/changes/archive/2026-11-02-improve-wheel-audio/`), and
`openspec list` reports no active changes, so no other `game-presentation` delta is open and this one
cannot collide at archive.

## Out of Scope

Visible countdown digits or a `TIEMPO DE TURNO` clock; a pause, "wait", or dismiss control; any change
to the 20-second timer, scoring, crowns, jokers, surrender, rematch, turn order, or question non-reuse;
a sound for the notice; a fifth panel; changes to the correct-answer path's button labels; backend,
persistence, API, schema, Compose, or dependency changes; a build step or bundler; and any ADR.
