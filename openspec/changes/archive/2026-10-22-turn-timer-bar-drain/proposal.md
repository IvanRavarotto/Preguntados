# Proposal

- **Change**: `turn-timer-bar-drain`
- **Branch when authorized**: `fix/turn-timer-bar-drain`
- **Owner role**: `dev`
- **Track**: 1 (Light) — frontend-only, one file (`frontend/index.html`), no API, schema, or dependency change.
- **Capability**: `game-presentation`
- **Depends on**: None
- **Decision reference**: none (no new stack; the timer module is already specified)

## Why

The turn timer's bar never drains. The player sees the countdown number change colour and the bar
stays empty for the whole 20 seconds, so the one element that communicates "how much time is left"
communicates nothing.

The cause is an ordering defect, verified against the real DOM with a headless-Chrome probe rather
than inferred. `pickQuestionAsync` calls `renderQuestion(q)` (`frontend/index.html:1241`) before
`show("screen-question")` (`:1242`). `renderQuestion` arms the bar's CSS width transition inside
`startTurnClock` (`:1318-1345`), but at that moment the question panel is still `display: none`
(`.panel` at `:89`; `.panel.active` at `:95`; `show()` toggles `.active` at `:800`). A CSS transition
armed inside a `display: none` subtree never starts, so the bar is laid out directly at its final
`width: 0%`. Measured: with the current order the bar has **zero** running transitions and a rendered
width of **0px** against a **499.8px** track; with the panel shown first, a `width` transition exists.

Two further divergences from the living spec are corrected in the same change, because both live in
the same code and both make the timer unreadable:

- The numeric readout (`#tnum`) is forbidden by the living spec — *"No numeric countdown SHALL be
  added to the question screen"* — but is present. It arrived as WIP inside the authoring snapshot
  (`5d6d4c4`) and the spec that forbids it was archived afterwards (`7a1778f`), so the spec is
  deliberate rather than stale. The seconds it carried stay available to assistive technology
  through `aria-valuenow` on the `role="progressbar"` element.
- The bar's colour walks a continuous green→orange→red gradient, so at 19% remaining it computes
  `rgb(255, 67, 68)` instead of the specified `#FF2A6D`, and the specified 20% urgency threshold is
  never a threshold at all.

## What Changes

- Show the question panel **before** the turn clock is armed, so the bar's width transition starts on
  a rendered element and the bar drains.
- Remove the numeric countdown element `#tnum` and its CSS and its updates.
- Replace the continuous colour walk with the specified proportional rule: the active category's
  accent colour until less than `20%` of the countdown remains, then exactly `#FF2A6D`. The
  threshold stays expressed as a proportion of the timer (`TIMER_URGENT_RATIO`), never as seconds.
- Keep the bar's transition duration and the expiry timeout derived from the same single constant.

## Out of scope

The question flow, the wheel, the answer rules, the audio, the surrender control, the mobile layout,
any API route, any dependency. The seconds' exposure to assistive technology is unchanged.

## Depends on

None. This is the first of the four changes in this cycle and the only one that is not blocked by
another.

## Alternatives considered

- **Arm the clock from the panel's `transitionend` instead of reordering the two calls.** Rejected:
  it couples the timer to an entrance animation that the spec does not guarantee, and the entrance
  animation is skipped under reduced motion.
- **Drive the bar's width from the JS tick instead of a CSS transition.** Rejected: the tick runs at
  100ms, so the bar would visibly step, and the existing requirement that the transition duration
  and the timeout share one constant would lose its meaning.
- **Keep the numeric readout and amend the spec.** Rejected: the spec was written after the readout
  existed and forbids it explicitly; the readout is not the defect the player reported.
- **Keep the continuous gradient and amend the spec.** Rejected: the specified proportional rule is
  a threshold the code can honour exactly, and the gradient cannot produce `#FF2A6D` at 19%.
