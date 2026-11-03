# Tasks

Every task below is meant to fit one focused PR and to leave the tree green on its own. No new
framework, bundler, dependency, asset, or backend call is introduced anywhere in this change.

## 1. Notice markup and style

- [x] 1.1 In `frontend/index.html`, inside `.question-card` immediately above `#q-next`
      (`frontend/index.html:648–662`), add the notice block and keep `#q-next` where it is:
      `<div id="turn-notice" hidden>` containing `<p id="turn-notice-text" role="status"></p>`,
      a `<div id="turn-notice-timer" role="progressbar" aria-label="Tiempo para el próximo turno"
      aria-valuemin="0" aria-valuemax="5" aria-valuenow="5">`, and `<div id="turn-notice-bar">`.
      The notice contains no `<button>`, `<a>`, or `<input>`; `#q-next` remains the only control.
      The block is `hidden`, so the page is unchanged until task 2 wires it.
- [x] 1.2 Add the notice CSS next to `.next-btn` (`frontend/index.html:376`) using only existing
      tokens: `--surface-low` (`:19`), `--stroke` (`:27`), `--r-sm` (`:52`), `--text` (`:23`), and
      `--mono` (`:65`). No drop shadow, no `--r-pill` (the living radius requirement's `9999px` set is
      closed and does not include this element), and no new colour. The bar fills with
      `var(--tn-accent, var(--accent))` and is `0.25rem` high with `--r-sm` on both the track and the
      bar.
- [x] 1.3 Beside `TIMER_SECONDS` (`frontend/index.html:721–724`) add
      `const TURN_NOTICE_SECONDS = 5;` and `const TURN_NOTICE_MS = TURN_NOTICE_SECONDS * 1000;`.
      Leave `TIMER_SECONDS`, `TIMER_URGENT_RATIO`, `TURN_MS`, `startTurnClock` (`:1601–1623`), and
      `stopTurnClock` (`:1625–1629`) untouched. Confirm no second duration value exists for the
      notice.

## 2. Wire the notice into the failure path

- [x] 2.1 Beside `timerId` and `tickId` (`frontend/index.html:828–829`) add `turnNoticeId`,
      `turnNoticeTickId`, and `turnNoticePending`. Keep them separate from the 20-second timer's
      handles so `stopTurnClock` and `clearTurnNotice` cannot clobber each other.
- [x] 2.2 Add `startTurnNotice()`: set `#turn-notice-text` to ``Turno de ${player().name}``; set
      `--tn-accent` on `#turn-notice` from `player().accent`; unhide `#turn-notice` **before** arming
      anything; set the bar to `width: 100%` with `transition: none`; force a reflow with
      `void bar.offsetWidth`; then set `transition = \`width ${TURN_NOTICE_SECONDS}s linear\`` and
      `width: 0%`. Arm `turnNoticeId = setTimeout(..., TURN_NOTICE_MS)` and a one-second interval that
      writes `aria-valuenow` from `5` to `0`. Set `turnNoticePending = true`. If a notice is already
      pending, clear it first so a second call cannot stack timers.
- [x] 2.3 Add `clearTurnNotice()`: `clearTimeout(turnNoticeId)`, `clearInterval(turnNoticeTickId)`,
      null both handles, set `turnNoticePending = false`, hide `#turn-notice`, and reset the bar's
      width and transition. It must be safe to call when nothing is pending.
- [x] 2.4 In `showFeedback` (`frontend/index.html:1815–1827`), branch on `state`. For `ok`: call
      `clearTurnNotice()`, keep `#q-next` visible with its existing label, and remove any failure
      `aria-label`. For `ko` and `timeout`: keep the existing answer text (`:1817`, `:1821–1822`),
      set `#q-next`'s text to `Empezar turno` and its `aria-label` to
      ``Empezar turno de ${player().name}``, then call `startTurnNotice()`. Do not change the strip's
      class or text.
- [x] 2.5 At the top of `nextTurn` (`frontend/index.html:2519–2536`), call `clearTurnNotice()` before
      the `crownPending` and `crown-selection` branches. Keep those branches and the return to
      `screen-wheel` (`:2535`) unchanged. The existing click binding
      (`$("q-next").addEventListener("click", nextTurn)`, `:957`) now serves as the start control, and
      the timeout callback calls the same `nextTurn`, so both paths are idempotent.
- [x] 2.6 Call `clearTurnNotice()` and restore `#q-next`'s default text and `aria-label` in
      `renderQuestion` (`frontend/index.html:1673–1674`), `showFeedbackMessage` (`:1829–1835`, which
      already hides `#q-next` at `:1834`), and `showFlowError` (`:1838–1852`, which writes the button
      at `:1849–1850`). No notice may survive a new question, a joker message, or a flow error.
- [x] 2.7 Call `clearTurnNotice()` in `resetMatchState` (`frontend/index.html:1102–1127`),
      `confirmSurrender` (`:2484–2498`), and `finishMatch` (`:2500–2517`). Rematch and new match reach
      `resetMatchState` through `startRematch` (`:1194`) and `beginMatch` (`:1178`); the sixth-crown
      ending reaches `finishMatch` directly.
- [x] 2.8 Manual pass in a browser: the failure notice appears, the button starts the turn, the
      untouched notice auto-starts at five seconds, and a correct answer still shows
      `Siguiente turno`. This is the first point at which the tree is behaviourally complete.

## 3. Source-read check and its negative controls

- [x] 3.1 Add `openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs`, modelled on
      `openspec/changes/archive/2026-11-02-improve-wheel-audio/checks/check_wheel_mix.mjs`: read
      `frontend/index.html` (overridable by `argv[2]`), print one `PASS`/`FAIL` line per assertion, and
      exit `0` when all pass, `1` when any fails, `2` when the file cannot be read. No dependency.
      Assert at minimum:
      - `TURN_NOTICE_SECONDS = 5` and `TURN_NOTICE_MS` derived from it exist; the notice timeout uses
        `TURN_NOTICE_MS`; the bar transition interpolates `${TURN_NOTICE_SECONDS}`; no literal `5000`
        appears in the notice code.
      - `#turn-notice` exists with `hidden`; exactly one `id="q-next"`; `#turn-notice` contains no
        `<button>`, `<a>`, or `<input>`; exactly four elements with class `panel`.
      - the notice is started only in the `ko`/`timeout` branch of `showFeedback`, and the `ok` branch
        does not call `startTurnNotice`.
      - `nextTurn` calls `clearTurnNotice()` before its branches; `resetMatchState`,
        `confirmSurrender`, and `finishMatch` each call it.
      - `#q-next` still binds to `nextTurn`; the feedback strip still writes
        `Respuesta correcta: ${q.answer}`; `TIMER_SECONDS = 20` is unchanged.
      - no new `fetch(`, `<script src=`, `@import`, `url(` to an external host, audio element, or
        asset extension was introduced.
- [x] 3.2 Add a `--self-test` mode to the same file. It must mutate an in-memory copy of the source
      three times and assert the matching check goes red: (a) a copy that uses a literal `5000` in the
      timeout and `4s` in the transition — the single-source assertion must fail; (b) a copy with
      `clearTurnNotice()` removed from `nextTurn` — the manual-cancel assertion must fail; (c) a copy
      that unhides `#turn-notice` in the `ok` branch — the not-on-correct assertion must fail.
      `--self-test` exits `0` only when the real file passes **and** all three mutants fail.
- [x] 3.3 Run `node openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs --self-test`
      and record the output. A green run without the three red mutants is not evidence.

## 4. Browser demo path (human)

The source-read check cannot prove runtime behaviour, so these steps are required and their results
must be recorded as pass/fail. Start the stack with `docker compose up -d --build` and open
`http://localhost:8000`.

- [x] 4.1 Wrong answer: the strip still reads `Respuesta correcta: <answer>`, the correct option is
      marked, the notice reads `Turno de <other player>`, the bar drains, and `Empezar turno` is
      visible. Record the notice's first visible frame and the bar's zero moment: `5.0s ± 0.5s`.
- [x] 4.2 Press `Empezar turno` once: the wheel appears immediately, the turn chip names the next
      player, and the spin control is enabled. Wait a further six seconds and confirm no second
      advance — the same wheel and the same player, with no question appearing.
- [x] 4.3 Repeat and leave the notice untouched: the wheel appears at `5.0s ± 0.5s` and names the next
      player.
- [x] 4.4 Timeout: let the 20-second clock expire. The `#FFD000` timeout strip still reveals the
      answer and the notice appears exactly as on a wrong answer.
- [x] 4.5 Second attempt: use `segundo-intento`, answer wrong once (no notice; the strip explains the
      retry), then wrong again. The notice appears only after the final wrong answer.
- [x] 4.6 Correct answer: no notice, no countdown, `#q-next` reads `Siguiente turno`; at a three-answer
      streak it reads `Reclamar corona` instead.
- [x] 4.7 Crown claim: claim a crown and answer correctly. No notice appears. On the sixth crown the
      winner screen is shown, and nothing advances five seconds later.
- [x] 4.8 Pending notice + surrender: fail, then confirm the surrender before five seconds. The winner
      screen stays put and no wheel or question appears when the five seconds elapse. Choose rematch:
      the wheel is shown and no stale notice advances the turn.
- [x] 4.9 Viewports `320x568` and `844x390`: the notice, its bar, the feedback strip, and
      `Empezar turno` are reachable (inside the viewport or by scrolling the panel only), and the
      document does not scroll.
- [x] 4.10 Appearance, human-only: the notice reads as part of the glass card, its text is legible,
      the bar is visibly draining, and nothing overlaps the options or the button. No agent in this
      fleet can read a rendered pixel, so this is recorded as a human observation, not a test result.

## 5. Gates and record

- [x] 5.1 Run the declared quality commands: `poetry run ruff check .`,
      `poetry run ruff format --check .`, `poetry run mypy app`, and
      `poetry run pytest --cov=app --cov-fail-under=80`. No backend file is expected to change; record
      the result either way.
- [x] 5.2 Run `openspec validate add-turn-change-notice` and record the result.
- [x] 5.3 Record the demo results (pass/fail per step) and name anything not run in the PR body. Do not
      mark this change done before Gate C.

## What the source-read check cannot prove

`check_turn_notice.mjs` reads source text. It cannot prove that the notice is visible, that the bar
actually animates or drains monotonically, that the countdown ends at five seconds, that a button press
advances exactly once, that the auto-advance does not fire after a manual start, that the notice is
cleared at runtime, or that the 20-second timer and the scores are unaffected at runtime. It also
cannot see layout, colour, overlap, or the stored answer's legibility. Those are proven only by the
browser demo in section 4, and the appearance half only by a human. The check's job is narrower and
still useful: it prevents the wiring from being deleted, duplicated, desynchronized, or reintroduced on
the correct-answer path without a red result.
