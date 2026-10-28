# Tasks

Ordered so that every task leaves the tree green. The frontend has no test runner; the checks named
here are the scripts under this change's `checks/` folder specified in `test-plan.md`.

## 1. Make the measurement reproducible

- [x] 1.1 Add `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs` — a headless-Chrome DevTools Protocol driver that opens the
      served game at each of the eight viewports (`320x568`, `360x640`, `390x844`, `414x896`,
      `768x1024`, `844x390`, `1440x900`, `1920x1080`), forces each of the four panels active in
      turn, and for every rendered descendant compares the bounding box against the viewport. It
      SHALL fail when a panel clips a descendant it cannot scroll to, and SHALL report the offending
      element. Locates Edge or Chrome automatically, honours `CHROME_PATH`, and exits with a distinct
      code and a clear message when no Chromium binary is found.
- [ ] 1.2 Run it against the shipped file and record the failures it reports: the start screen at
      every phone size and at `1440x900`, the question screen at `320x568` and `844x390`, and the
      wheel screen at `844x390`.

## 2. Stop clipping content

- [x] 2.1 Give the panel a bounded internal overflow so that content exceeding the viewport stays
      reachable, while the document still never scrolls. Keep `body { overflow: hidden }` and the
      panel container's `position: fixed; inset: 0` exactly as they are. A panel that fits its
      viewport SHALL NOT become scrollable.
- [x] 2.2 Re-run `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs` and record which findings remain.

## 3. Make the layouts fit rather than scroll

- [x] 3.1 Start screen: compact the manual-authoring form so it fits a `320x568` viewport without
      scrolling — the option rows, the category control and the submit control — without removing
      any control or changing the `question-authoring` behaviour.
- [x] 3.2 Question screen: recover the vertical budget with **fluid sizing** — `clamp()` on the
      heading, the card's padding, the option cards' padding and the gaps, and the question text's
      box — so the four options, the feedback strip and the next-turn control fit a `320x568`
      viewport. The question text SHALL still render at `18px` or larger. The design's stacking rule
      (one option per row below `768px`) SHALL NOT be changed, and **no media query SHALL be added**:
      the stylesheet's declared breakpoints stay exactly `768px`, `1024px` and the wheel-only `640px`
      tier.
- [x] 3.3 Wheel screen: make the wheel's size fluid in the viewport's **height** — the smaller of
      the current size and a `vh` share — and tighten the scoreboard and the turn chip, so the whole
      wheel and the spin control fit `844x390`. The wheel's size on a tall desktop viewport SHALL NOT
      change. The seven sectors SHALL stay visible and SHALL NOT overlap, and no media query SHALL
      be added.
- [x] 3.4 Re-run `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs` and record that every viewport in the list now passes.

  Recorded: `LAYOUT_CHECK_PASS` across `320x568`, `360x640`, `390x844`, `414x896`, `768x1024`, `844x390`, `1440x900` and `1920x1080`; the three width breakpoints are unchanged (`1024px`, `768px`, `640px`).

## 4. Negative controls and regression

- [ ] 4.1 Record the negative controls: a copy of the file with the authoring form's original height
      restored MUST fail at `320x568`; a copy with the options forced back to one column at `320px`
      MUST fail; a copy with the panel's internal overflow removed MUST fail wherever the content
      exceeds the viewport. A check that comes back green on a mutated file has no teeth.
- [ ] 4.2 Run the full check set: `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs`, `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs`,
      `poetry run pytest`, `poetry run ruff check .`, `poetry run ruff format --check .`,
      `poetry run mypy app`. All green.
- [ ] 4.3 Record the measured evidence in this file: the before and after overflow table for the
      eight viewports, the negative-control failures, and the command output of each check.
