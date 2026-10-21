# Tasks

Ordered so that every task leaves the tree green. The frontend has no test runner; the checks named
here are the scripts under this change's `checks/` folder specified in `test-plan.md`.

Branch when authorized: `fix/turn-timer-bar-drain`.

## 1. Reproduce and pin the defect

- [x] 1.1 Add `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs` — a headless-Chrome DevTools Protocol driver that opens the
      served game, starts a match, spins, and asserts on the question screen that (a) the bar element
      has a running `width` transition at the moment the screen became visible, (b) the rendered bar
      width decreases across the countdown and reaches zero at expiry, (c) the computed background
      colour is the category accent at or above 20% remaining and exactly `rgb(255, 42, 109)` below
      it, (d) no element in the question panel renders the remaining seconds as text, and (e)
      `aria-valuenow` still tracks the remaining seconds. Exit non-zero on any failure. Locates Edge
      or Chrome automatically; honours a `CHROME_PATH` override; exits with a distinct code and a
      clear message when no Chromium binary is found.
- [x] 1.2 Run it against the shipped file and record the failure: **0 running transitions, `0px`
      rendered bar width against a `499.8px` track, the numeric readout present, and the bar's colour
      at 19% remaining equal to `rgb(255, 67, 68)` rather than `rgb(255, 42, 109)`**.

## 2. Make the bar drain

- [x] 2.1 In `frontend/index.html`, show the question panel before the turn clock is armed, so the
      width transition is armed on a rendered element. Keep the two writes to the wheel's rotation
      property and its inline transform together — they are one operation (`applyWheelRotation`,
      `:1183-1186`).
- [x] 2.2 Re-run `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs` and record the pass. The check must fail on a copy of the
      file with the original ordering restored — record that failure too.

## 3. Conform the timer to the spec

- [x] 3.1 Replace the continuous colour walk (`timerColor`, `:1302`; `applyTimerColor`, `:1314`) with
      the proportional rule: the active category's accent at or above `TIMER_URGENT_RATIO` remaining,
      exactly `#FF2A6D` below it. Keep the threshold expressed as a proportion of the timer.
- [x] 3.2 Remove the numeric countdown: the `#tnum` element (`:619`), the `.timer-num` CSS
      (`:306-312`), and every write to it in `startTurnClock` (`:1331`, `:1341`) and `onTimeout`
      (`:1432`). Keep `aria-valuenow` on `#q-timer` (`:616`) updated with the remaining seconds, and
      keep the `--time-color` custom property driving the bar's `background` and `box-shadow`.
- [x] 3.3 Re-run `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs`, including the negative controls: a copy that restores the
      old colour walk and a copy that restores the numeric readout must each fail.

## 4. Regression and archive

- [x] 4.1 Run the full check set: `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs`, `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs` if present,
      `poetry run pytest`, `poetry run ruff check .`, `poetry run ruff format --check .`,
      `poetry run mypy app`. All green.
- [x] 4.2 Record the measured evidence in this file: the transition's presence, the sampled widths,
      the two colours, the negative-control failures, and the command output of each check.

## Evidence

**Before** (measured on the shipped file, Chromium headless over the served game):

| Reading | Value |
|---|---|
| running transitions on `#tbar` | **0** |
| rendered bar width | **0px** against a `499.8px` track |
| colour at 19% remaining | `rgb(255, 67, 68)` — the gradient's red, not `rgb(255, 42, 109)` |
| numeric readout | `#tnum` present in the question panel |

**After** — `node openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs`, exit **0**:

| Assertion | Result |
|---|---|
| the question screen appears | PASS |
| the bar has a running width transition | PASS — `CSSTransition`, `transitionProperty: "width"` |
| the bar starts wider than empty | PASS |
| the bar's colour is the category accent while the turn is healthy | PASS — `rgb(255, 208, 0)` (`#FFD000`, the `historia` accent the wheel selected) |
| the bar drains across the countdown | PASS — `547.33px` at the question, `522.66px` a second later |
| the published remaining time decreases | PASS — `aria-valuenow` `20` → `19` |
| the published remaining time stays within the turn | PASS |
| the bar shifts to the failure accent below a fifth of the turn | PASS — `rgb(255, 42, 109)` with `aria-valuenow` `4` and a `109.75px` bar |
| the question screen carries no numeric countdown | PASS |
| the urgency threshold is a proportion of the timer | PASS — the comparison reads `TIMER_URGENT_RATIO` |

**Negative controls** — each mutated copy served by the check's own `--file` proxy, each failing for
its own reason:

| Mutant | Result |
|---|---|
| the ordering restored (`renderQuestion` before `show`) | **exit 1** — "the question panel never became active with a visible bar" (the bar renders at `0px`, the transition never arms) |
| the green-to-orange-to-red gradient restored | **exit 1** — 3 assertions failed: the accent colour (`rgb(5, 255, 161)`), the failure colour (`rgb(255, 68, 66)`), and the proportional threshold |
| the numeric readout restored (markup, CSS and every write) | **exit 1** — "the question screen carries no numeric countdown" |

**Quality gate**

```
poetry run pytest --cov=app --cov-fail-under=80   ->  39 passed, coverage 100.00% (bar: 80%)
poetry run ruff check .                            ->  All checks passed!
poetry run ruff format --check .                   ->  18 files already formatted
poetry run mypy app                                ->  Success: no issues found in 11 source files
openspec validate "turn-timer-bar-drain" --strict  ->  valid
```
