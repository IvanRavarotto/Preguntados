# Test Plan: `add-turn-change-notice`

## Header

| Field | Value |
|---|---|
| Change | `add-turn-change-notice` |
| Branch | `feature/add-turn-change-notice` |
| Track | 1 (Light) |
| Capability | `game-presentation` |
| Surface | `frontend/index.html` (presentation only). No API/schema/dependency/asset changes. |
| Delta spec | `openspec/changes/add-turn-change-notice/specs/game-presentation/spec.md` |
| Proposal | `openspec/changes/add-turn-change-notice/proposal.md` |
| Tasks | `openspec/changes/add-turn-change-notice/tasks.md` |
| Source check | `openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs` (to be implemented by dev per tasks) |

## Criterion → Check mapping

Every acceptance criterion from the delta spec is mapped below. Checks are either (1) source-read check (`check_turn_notice.mjs`), (2) browser runtime observation (manual), or (3) both as indicated. Pass bars are explicit.

| Delta scenario / requirement clause | Check type | Concrete check | Pass bar |
|---|---|---|---|
| **Scenario: The notice names the next player and shows a five-second countdown** (GIVEN wrong answer WHEN feedback rendered THEN notice text `Turno de <other player's name>`, `#q-next` reads `Empezar turno` with accessible name `Empezar turno de <other player's name>`, bar drains monotonically over 5s reaching 0 at 5.0s ±0.5s, `role="progressbar"` has `aria-valuenow="5"` at appear and `aria-valuenow="0"` at end, no element in question panel renders remaining seconds as text, copy that arms countdown before notice unhidden fails) | Source-read + Browser runtime | **Source**: assert `TURN_NOTICE_SECONDS=5`, `TURN_NOTICE_MS` derived from it, timeout uses `TURN_NOTICE_MS`, bar transition interpolates `${TURN_NOTICE_SECONDS}`, no literal `5000` in notice code; `#turn-notice` exists with `hidden`; `#turn-notice` contains no `<button>`, `<a>`, or `<input>`; exactly one `id="q-next"`. **Browser**: observe notice appears, text exact, button label + accessible name, bar drains monotonically, `aria-valuenow` 5→0, inspect question panel for numeric text (digits). | Source assertions all pass. Runtime: notice visible with exact text; button labeled `Empezar turno` with accessible name including next player; bar visible draining monotonically; reaches 0 at 5.0s ±0.5s; `aria-valuenow` 5 at appear, 0 at end; no numeric countdown text found in question panel. Negative control (arm before unhide) produces red result. |
| **Scenario: Pressing start begins the turn at once and cancels the auto-advance** (GIVEN notice visible with time remaining WHEN start pressed once THEN wheel shown immediately, turn chip names next player, no second advance after waiting 6s, spin enabled once, no question requested after press; copy whose button path does not clear pending timer fails) | Source-read + Browser runtime | **Source**: assert `nextTurn` calls `clearTurnNotice()` before branches; `#q-next` binds to `nextTurn`. **Browser**: press `Empezar turno` once while notice visible → wheel appears immediately, turn chip correct, spin enabled once. Wait 6s after press → still on wheel for same player, no new question requested. | Source: `clearTurnNotice()` called before branches. Runtime: immediate transition to wheel, correct turn chip, no second advance within +6s window, spin enabled once, no question request after press. Negative control (no clear in button path) fails. |
| **Scenario: An untouched notice starts the turn automatically at five seconds** (GIVEN notice visible no touch WHEN countdown reaches zero THEN wheel shown at 5.0s ±0.5s, turn chip names next player, exactly one advance occurs, 20-second question clock not running; copy whose auto-advance fires from unrelated duration fails) | Source-read + Browser runtime | **Source**: assert auto-advance timeout uses `TURN_NOTICE_MS`; `TURN_NOTICE_SECONDS` is single source. **Browser**: do not touch notice → wheel appears at 5.0s ±0.5s from notice first visible frame, turn chip correct, exactly one advance, `startTurnClock`/20s timer not running. | Source: timeout uses `TURN_NOTICE_MS` derived from `TURN_NOTICE_SECONDS`. Runtime: wheel at 5.0s ±0.5s, correct turn chip, single advance, 20s question clock stopped/not running. Negative control (unrelated duration) fails. |
| **Scenario: No notice on a correct answer or a crown claim** (GIVEN correct answer and separately correct answer claiming crown WHEN feedback rendered THEN notice hidden, no countdown starts, `#q-next` reads `Siguiente turno` or `Reclamar corona` when pending, on sixth crown winner screen shown no advance 5s later; copy that unhides notice in `ok` branch fails) | Source-read + Browser runtime | **Source**: assert notice started only in `ko`/`timeout` branch of `showFeedback`, `ok` branch does not call `startTurnNotice()`. **Browser**: correct answer → no notice, button label correct (`Siguiente turno` or `Reclamar corona` if pending). Claim crown correctly → no notice. Sixth crown → winner screen shown, wait 5s → no advance. | Source: `ok` branch has no `startTurnNotice()`, notice only in `ko`/`timeout`. Runtime: no notice/countdown on correct/crown claim; correct labels; sixth crown ends match with no advance after 5s. Negative control (unhide in `ok` branch) fails. |
| **Scenario: The stored correct answer stays visible on a failure** (GIVEN wrong answer and separately timeout WHEN failure resolves THEN feedback strip contains `Respuesta correcta: <stored answer>`, option card with stored answer has `right` class, strip class `ko` for wrong/`timeout` for timeout, notice visible in both cases) | Browser runtime (source already implies) | **Browser**: wrong answer → strip text contains `Respuesta correcta: <answer>`, correct option card has class `right`, strip has class `ko`, notice visible. Timeout → strip contains answer, correct option marked `right`, strip has class `timeout`, notice visible. | Feedback strip text correct, correct option marked `right`, classes correct per state, notice visible in both failure cases. (Source-read not primary; behavior must hold.) |
| **Scenario: The twenty-second timer, scores, crowns, and turn rules are unchanged** (GIVEN match through wrong answers/timeouts/second-attempt failure WHEN timer/scores/crowns/turn read THEN `TIMER_SECONDS=20`, `TURN_NOTICE_SECONDS=5`, different constants; failure adds 0 points, preserves crowns, turn alternates once per failure, no question reused in category; 20s bar/timeout derive from `TIMER_SECONDS`) | Source-read + Browser runtime | **Source**: assert `TIMER_SECONDS = 20` unchanged; `TURN_NOTICE_SECONDS` different constant; no literal `5000` in notice code tied to timer. **Browser**: play through failures → timer runs 20s, scores unchanged by failures, crown counts unchanged, turn alternates once per failure, no repeated question id in same category during match. | Source: constants independent and values correct. Runtime: 20s timer behavior unchanged, scoring/crowns/turn rules unchanged, no question reuse observed. |
| **Scenario: Surrender, rematch, and the winner screen clear a pending notice** (GIVEN notice visible with time remaining WHEN surrender confirmed before countdown ends THEN winner screen shown and remains when 5s elapse (no wheel/question after); when rematch chosen wheel shown no stale notice advances turn 5s later; new question rendered while notice pending shows no notice and starts no countdown) | Source-read + Browser runtime | **Source**: assert `clearTurnNotice()` called in `resetMatchState`, `confirmSurrender`, `finishMatch`. **Browser**: fail → notice visible, confirm surrender before 5s → winner screen shown, wait 5s → stays on winner screen, no wheel/question. Do rematch → wheel shown, wait 5s → no stale notice advances turn. Render new question while notice pending → no notice, no countdown starts. | Source: clearing calls present in all three functions. Runtime: all three flows clear pending notice; no stale advance occurs after 5s in any flow. |
| **Scenario: The notice adds no control, request, dependency, or fifth panel** (GIVEN served doc + full match through failure WHEN inspect question card and network log THEN `#q-next` only start control, exactly one `id="q-next"`, notice contains no `<button>`, `<a>`, or `<input>`, only requests `/`, `/categories`, `/questions/category/{category_name}?limit=200`, exactly four elements with class `panel`, no `@font-face`, external URL, image, audio asset added, no build step/bundler/runtime dependency added) | Source-read + Browser runtime/network inspection | **Source**: assert exactly one `id="q-next"`, `#turn-notice` contains no button/a/input, exactly four elements with class `panel`, no new fetch/script/src/@import/url to external host, no audio element/asset extension added. **Browser/Network**: inspect DOM and network log during match. | Source assertions pass. Runtime: only `#q-next` as start control, no extra controls in notice, exactly 4 panels, request paths limited to allowed set, no external assets/dependencies added. |

## Negative controls (required by delta)

The plan explicitly requires these negative controls and states what each must redden:

| Negative control | What it must redden | Verification |
|---|---|---|
| **Button path does not clear the timer** | Scenario "Pressing start begins the turn at once and cancels the auto-advance" — manual start followed by second advance after original 5s. | Source-read: `nextTurn` must call `clearTurnNotice()` before branches. Mutant without `clearTurnNotice()` in button path fails the assertion; runtime test shows second advance occurs. |
| **Auto-advance uses an unrelated duration** | Scenario "An untouched notice starts the turn automatically at five seconds" — auto-advance fires at wrong time or from different constant. | Source-read: timeout must use `TURN_NOTICE_MS` derived from `TURN_NOTICE_SECONDS`; no literal `5000` in notice code. Mutant using literal `5000` or different duration fails assertion. |
| **Notice unhidden in the `ok` branch** | Scenario "No notice on a correct answer or a crown claim" — notice appears on correct answer/crown claim. | Source-read: notice started only in `ko`/`timeout` branch of `showFeedback`; `ok` branch must not call `startTurnNotice()`. Mutant unhiding notice in `ok` branch fails assertion. |
| **Countdown armed before the notice is visible** | Scenario "The notice names the next player and shows a five-second countdown" — bar has no running transition when visible (transition not armed after unhide). | Source-read/runtime: `startTurnNotice()` must unhide `#turn-notice` before arming anything, set bar to `width:100%` with `transition:none`, force reflow (`void bar.offsetWidth`), then set transition and `width:0%`. Mutant arming countdown before unhide fails scenario (bar has no running transition when visible). Source-check should assert this order/sequence. |

The source-read check (`check_turn_notice.mjs`) must implement `--self-test` mode that mutates source three times (a) literal `5000` in timeout/`4s` in transition (b) `clearTurnNotice()` removed from `nextTurn` (c) `#turn-notice` unhidden in `ok` branch — and assert those mutants go red while real file passes.

## End-to-end demo path

Execute in order against running stack (`docker compose up -d --build`, open `http://localhost:8000`). Record pass/fail for each step.

| Step | Action | Expected | Viewports |
|---|---|---|---|
| **1. Start match** | Enter different player names, click `¡A JUGAR!` | Wheel screen shown, turn chip names first player, scoreboard visible. | 320x568, 844x390 |
| **2. Wrong answer** | Spin, get question, answer incorrectly. | Feedback strip reads `Respuesta correcta: <answer>`, correct option marked `right`, strip has class `ko`. Notice appears: reads `Turno de <other player>`, `#q-next` reads `Empezar turno` with accessible name `Empezar turno de <other player>`. Bar drains, `aria-valuenow` 5→0, reaches 0 at 5.0s ±0.5s. No numeric countdown text in question panel. | 320x568, 844x390 |
| **3. Timeout** | Spin, let 20s timer expire with no answer. | Timeout strip (`#FFD000`) appears with answer revealed (`Respuesta correcta: <answer>`), correct option marked `right`, strip class `timeout`. Notice appears same as wrong answer. 20s timer behavior unchanged. | 320x568, 844x390 |
| **4. Second-attempt failure** | Use `Segundo intento` joker, answer wrong once (no notice, strip explains retry), then answer wrong again. | Notice appears only after final wrong answer. Feedback/answer revelation correct. | 320x568, 844x390 |
| **5. Correct answer** | Answer correctly. | No notice, no countdown. `#q-next` reads `Siguiente turno`. No changes to turn/scores from failure rules. | 320x568, 844x390 |
| **6. Crown claim** | Build to crown-pending state, answer correctly to claim crown. | No notice. `#q-next` may read `Reclamar corona` if pending. Crown awarded correctly. | 320x568, 844x390 |
| **7. Surrender (with pending notice)** | Fail to get notice visible with time remaining, confirm surrender before 5s elapse. | Winner screen shown immediately on confirm. Wait 5s → still on winner screen, no wheel/question appears. Choose rematch → wheel shown, wait 5s → no stale notice advances turn. | 320x568, 844x390 |
| **8. Rematch** | From winner screen click `Revancha`. | Returns to wheel/start flow as appropriate; no stale notice; state cleared. | 320x568, 844x390 |
| **9. Reachability (viewports)** | Test at 320x568 and 844x390 through steps above. | Notice, bar, feedback strip, `Empezar turno` button all reachable (inside viewport or by scrolling panel only). Document does not scroll. Exactly 4 panels. | 320x568, 844x390 (required) |

## Not tested

The following cannot be proven by source-read checks or by an automated agent run; they require human observation/instrumentation:

| Item | Why not provable | Required instrument |
|---|---|---|
| **Rendered timing within ±0.5s** | Source-read checks string patterns/constants; actual animation/timeout timing depends on browser event loop, repaint, and environment. | Human with stopwatch/browser timing (or manual observation) at demo time. Record first visible frame of notice and moment bar reaches zero. |
| **Subjective feel (legibility, overlap, appearance)** | No agent can read rendered pixels/visual layout quality. | **Human eyeball at Gate C** (per tasks 4.10). Check notice reads as part of glass card, text legible, bar visibly draining, nothing overlaps options/button. |
| **Non-Chromium browsers** | Testing environment is not specified as cross-browser; only local Chromium-based testing assumed. | Not tested in this plan. Would require manual testing in Firefox/Safari. |
| **Screen-reader announcement** | Accessibility announcement behavior depends on browser/AT; source can assert `role="status"` on text and `role="progressbar"` with `aria-valuenow`, but actual announcement timing/content requires AT testing. | Not fully verifiable by source-read alone. Basic ARIA presence checked by source-read; full SR testing is out of scope for automated agent verification. |

**Note on timing**: Source-read check can assert timeout uses `TURN_NOTICE_MS` and transition interpolates `TURN_NOTICE_SECONDS` (proving coupling), but cannot prove wall-clock timing is 5.0s ±0.5s - this is runtime observation only.

## Gate B decision (countdown format)

**CRITICAL - Gate B decision required:**

The countdown is a **draining bar with `aria-valuenow`**, not visible digits, because the living "Type pairing is preserved without webfonts" requirement **forbids a numeric countdown on the question screen**. 

- The delta spec explicitly states (lines 17-18, 35-42): "It SHALL NOT render the remaining seconds as text, because the living \"Type pairing is preserved without webfonts\" requirement forbids a numeric countdown on the question screen." Its scenario searches the whole question panel for an element that renders remaining seconds as text and will fail if digits are present.
- The bar uses `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="5"`, `aria-valuenow` updating (matching how the 20-second timer publishes seconds at `frontend/index.html:643, 1608, 1620`).
- **If the human wants digits on screen, this plan must say a MODIFIED delta is required first.** The delta does *not* smuggle in digits - that would violate the living requirement. Any change to show visible `5, 4, 3, 2, 1` digits requires amending the living "Type pairing is preserved without webfonts" requirement via a `MODIFIED` delta at Gate B before implementation.

## Coverage summary

- **Delta scenarios in spec**: 8 scenarios (The notice names the next player and shows a five-second countdown; Pressing start begins the turn at once and cancels the auto-advance; An untouched notice starts the turn automatically at five seconds; No notice on a correct answer or a crown claim; The stored correct answer stays visible on a failure; The twenty-second timer, scores, crowns, and turn rules are unchanged; Surrender, rematch, and the winner screen clear a pending notice; The notice adds no control, request, dependency, or fifth panel)
- **All mapped**: Yes - every scenario and its clauses are mapped to at least one check (source-read and/or browser runtime). The criterion-to-check table covers all acceptance criteria.
- **Negative controls**: All 4 required controls named with what each must redden and how verified.
- **Demo path**: Complete end-to-end path covering start match through rematch, including 320x568 and 844x390 reachability.
- **Not tested**: Explicitly documented with rationale and required instruments.
- **Gate B decision**: Explicitly noted about digits requiring MODIFIED delta.

## Verification commands (for reference)

- Source check: `node openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs --self-test` (must pass with all 3 mutants failing)
- OpenSpec validation: `openspec validate add-turn-change-notice`
- Quality commands (no backend changes expected): `poetry run ruff check .`, `poetry run ruff format --check .`, `poetry run mypy app`, `poetry run pytest --cov=app --cov-fail-under=80`
