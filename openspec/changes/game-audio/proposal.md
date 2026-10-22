# Proposal

- **Change**: `game-audio`
- **Branch when authorized**: `feature/game-audio`
- **Owner role**: `dev`
- **Track**: 1 (Light) — frontend-only, one file (`frontend/index.html`), no API, schema, or dependency
  change.
- **Capability**: `game-presentation`
- **Depends on**: `mobile-layout-overflow` (it must land before this one so the audio work is done
  against the final layout; it has no functional dependency on it)

## Why

The game is silent. The wheel spins for 4.2 seconds with no sound at all, and the three outcomes
that decide a turn — correct, incorrect, timed out — are announced only visually. A two-player
game played on one device gets no aural feedback about the thing the players are waiting for.

The human approved two sounds: the wheel spin, and the three answer-feedback cues. A mute toggle was
proposed and declined.

## What Changes

- Synthesise a wheel-spin sound with the **Web Audio API**: a filtered noise bed whose rate and
  brightness decelerate along the same curve the wheel's rotation follows, plus a ratchet of clicks
  whose spacing follows the same curve.
- Synthesise three short answer cues: correct, incorrect and timed out, each distinguishable from
  the others.
- Create or resume the audio context inside the spin click handler, so the browser's autoplay policy
  never blocks it — the spin is already driven by a real user gesture.
- Make the rate mapping a **DOM-free pure function**, so it can be unit-tested in Node against the
  easing curve without a browser.
- Fail soft: if the Web Audio API is missing, the context is blocked, or the device is muted, the
  game behaves exactly as it does today and no exception escapes.

## Out of scope

A mute toggle, ambience or music, any audio file or data-URI blob, any audio library, any new
dependency, any change to the wheel's timing or easing, any change to the answer rules, and any
change to the "no external requests" requirement.

## Depends on

`mobile-layout-overflow`. No functional dependency — the sound does not care about the layout — but
the audio work is done against the final layout, so it lands second.

## Alternatives considered

- **Ship an `.mp3` of a real roulette wheel.** Rejected: the `game-presentation` spec forbids any
  `src`/`href`/`url()` that is not absent or a fragment/data URI, so an asset file would violate the
  no-external-requests requirement; a base64 blob would bloat the document for no benefit.
- **Use a CSS animation to fake the sound.** Rejected: it is not sound.
- **Use the Web Audio API but schedule the clicks with a `setInterval` in JS.** Rejected: the click
  spacing would drift against the wheel's deceleration and would keep running if the tab is
  throttled. The clicks are scheduled on the audio clock from the easing curve.
- **Gate the sound on `prefers-reduced-motion`.** Rejected: reduced motion is a preference about
  movement, and the wheel's motion is the thing that preference governs; silencing the audio as
  well removes feedback that has no visual equivalent, and there is no `prefers-reduced-sound`
  feature to ask about. The decision is recorded in the delta so it is a choice rather than an
  oversight.
