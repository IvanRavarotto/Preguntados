# Proposal

- **Change**: `improve-wheel-audio`
- **Branch**: `feature/improve-wheel-audio`
- **Owner role**: `dev`
- **Track**: 1 (Light) — one presentation file, no API, schema, dependency, or asset change.
- **Capability**: `game-presentation`

## Why

The wheel spin is synthesised, but it is mixed below the answer cues and its whir is thin. At the
current levels the spin bus peaks at `0.3`, each ratchet click at `0.1`, and the noise bed at
`0.055`, so the event the players are waiting for is the quietest thing in the mix. The three
answer cues reach `0.18`/`0.14`/`0.14`, and the spin has no mechanical body or settle impact.

## What Changes

- Raise the spin mix so it is clearly the loudest single event: bus peak `0.6`, click peak `0.24`,
  whir `0.12`, settle thunk `0.18`. The combined bus output stays at `0.324` worst case, below the
  clipping ceiling.
- Add a resonant body filter to the whir and a short low settle thunk at the end of the spin, so the
  wheel sounds like a mechanical object rather than filtered noise.
- Expose the four mix values through the existing `window.__audio.getState()` test seam so a check can
  pin the levels.
- Keep the synthesis asset-free, the rate mapping pure and decelerating, the graph lifetime, the
  answer cues, and the game flow untouched.

## Decisions

- **Synthesise, do not ship a file.** The living audio requirement forbids `.mp3`/`.wav`/data URIs
  and any new dependency. A louder, better-designed synth is the only in-spec route.
- **No volume or mute control.** The original audio change proposed a mute toggle and the human
  declined it; this change is about the mix, not a new control.
- **Moderate boost.** The peak stays below `0.35` at the bus output so the clicks and the thunk cannot
  clip, and the answer cues remain distinguishable without being drowned.

## Impact

- `frontend/index.html` — the audio constants, `playSpin`, and the `__audio` state.
- `openspec/specs/game-presentation/spec.md` — via this delta; folded at archive.
- `openspec/changes/improve-wheel-audio/checks/check_wheel_mix.mjs` — new measurable check.

## Out of Scope

Audio files or data URIs, a mute/volume control, changes to the answer cues, the wheel timing or
easing, the rate mapping, gameplay rules, and any backend or dependency change.
