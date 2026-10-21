# Test plan — `turn-timer-bar-drain`

## Scope

One capability (`game-presentation`), one file under test (`frontend/index.html`), observed through a
running instance of the game. No API, schema, or dependency change, so no Python behaviour is in
scope.

## Environments

| | |
|---|---|
| Browser | Chromium via headless DevTools Protocol (Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, honouring `CHROME_PATH`). The frontend is a single static document with no browser-specific APIs beyond the CSS and Web platform APIs it already uses. |
| API | `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000` with PostgreSQL 15 up (`docker compose up -d`). The game fetches `/categories` and `/questions/category/{name}?limit=200` from the same origin. |
| Viewport | Desktop `1440x900`, emulated with `Emulation.setDeviceMetricsOverride` (the timer is viewport-independent; the mobile sweep is the `mobile-layout-overflow` change's plan). |
| Runner | Node 24 scripts under this change's `checks/` folder. The repo has no frontend test runner and this change does not add one — it is not in `openspec/project.md`. |

## Criteria → checks

| Criterion (from the delta) | Check | Pass bar |
|---|---|---|
| The bar has a running `width` transition when the screen becomes visible | `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs` — `getAnimations()` on the bar element sampled immediately after the question panel becomes visible | the transition list contains an animation whose `transitionProperty` is `width`; **1 or more** |
| The bar drains monotonically and reaches zero at expiry | sampled `getBoundingClientRect().width` at ~0ms, ~50%, ~90% and at expiry | strictly non-increasing, `width(0) > 0`, `width(expiry) <= 1px` |
| The bar's colour is the category accent at or above 20% remaining | computed `background` of the bar at 80% remaining | exact RGB triple of the category's accent |
| The bar's colour is exactly `#FF2A6D` below 20% remaining | computed `background` of the bar at 19% remaining | exactly `rgb(255, 42, 109)` |
| The threshold is a proportion of the timer | source inspection: the urgency constant is referenced as a ratio, and no absolute-seconds variant exists | the only urgency threshold in the file is the ratio constant |
| No numeric countdown in the question panel | DOM query for an element in `#screen-question` whose text is the remaining seconds | **0** matches |
| `aria-valuenow` still tracks the remaining seconds | attribute read on `#q-timer` at three points | non-increasing integers, `20` at the start, `0` at expiry |
| The bar's duration and the expiry timeout share one constant | source inspection | exactly one turn-duration constant is referenced by both |

## Negative controls (required — a check that cannot fail has no teeth)

| Mutated copy | Must fail |
|---|---|
| `renderQuestion(q)` moved back **before** `show("screen-question")` | the running-transition check and the drain check |
| the continuous green→orange→red walk restored | the exact-colour check at 19% remaining |
| the `#tnum` readout restored | the no-numeric-countdown check |

Each control is a copy of the file with a single edit; the check is run against the copy and the
failure is recorded in `tasks.md` § 4.2.

## Demo path (human integration test)

1. Open `http://127.0.0.1:8000/`, enter two different names, start the match, spin the wheel.
2. Watch the question screen: the bar must be visible, full, and draining from the first frame — not
   appearing after a delay and not sitting empty.
3. Watch the bar's colour: it holds the category's accent, then turns exactly `#FF2A6D` in the last
   four seconds.
4. Confirm no number is displayed next to the bar.
5. Let the clock run out: the bar empties as the timed-out state fires, and the correct answer is
   revealed.

## Not tested, and why

- **No human-listening test** — no audible change is involved in this change.
- **No cross-browser matrix** — Chromium only. The properties under test are CSS transitions and
  custom properties, which are Baseline in every engine the project targets, but this change does not
  claim to have verified that.
- **No visual regression on the bar's glow** — the `box-shadow` colour follows `--time-color`, which
  this change alters; the exact glow rendering is checked by the human at Gate C, not by a pixel
  comparison.
