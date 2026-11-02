# Spec Delta

## ADDED Requirements

### Requirement: The wheel spin mix is loud and mechanical

The wheel spin SHALL be the loudest single event in the game's audio mix. Its bus peak SHALL be at
least `0.5`, each ratchet click SHALL peak at at least `0.2`, and the noise bed SHALL reach at least
`0.1`. The combined bus output of the noise bed, one click, and the settle thunk SHALL stay below
`0.35`, so the mix cannot clip. The spin SHALL remain louder than the correct-answer cue at `0.18`.

The whir SHALL carry a resonant body emphasis rather than a plain low-passed noise bed, and a short
low settle thunk SHALL mark the end of the spin.

The spin SHALL still be synthesised in the browser without loading an audio asset, SHALL still
decelerate along the wheel's easing curve, SHALL still stop with the wheel, and SHALL still leave at
most one live graph.

#### Scenario: The spin is louder than the answer cues

- **GIVEN** the shipped audio synthesis constants
- **WHEN** the spin bus, click, whir and thunk peaks are read
- **THEN** the bus is at least `0.5`, the click at least `0.2`, and the whir at least `0.1`
- **AND** the bus output of the whir plus one click exceeds the correct-answer cue's `0.18`
- **AND** the bus output of the whir, one click and the thunk stays below `0.35`

*Provenance: `[AUTHORED]` from the observed mix in `frontend/index.html:1323-1389` and the cue gains
at `:1394-1402`. Measurable: the four constants and the two products.*

#### Scenario: The wheel has a body and a settle impact

- **GIVEN** the spin synthesis
- **WHEN** the graph is inspected
- **THEN** the whir passes through a peaking filter before its gain stage
- **AND** a short low-frequency thunk is scheduled near the end of the spin
- **AND** the thunk is part of the same graph that stops with the wheel

*Provenance: `[AUTHORED]` from the user's report that the current spin is thin. Measurable: the
filter type and the thunk oscillator's scheduled start relative to the spin duration.*

#### Scenario: The louder mix keeps the asset and lifetime rules

- **GIVEN** the louder spin
- **WHEN** the document is scanned for audio assets and a spin is played
- **THEN** no `.mp3`, `.wav`, `.ogg`, data URI, `<audio>` element or `new Audio(...)` exists
- **AND** the graph is stopped with the wheel and a second spin leaves exactly one live graph
- **AND** the rate mapping still increases monotonically from `0%` to `100%`

*Provenance: `[PRESERVE]` — the living "Synthesised game audio" requirement. Measurable: the existing
`check_audio.mjs` and `check_audio_mapping.mjs` checks still pass.*
