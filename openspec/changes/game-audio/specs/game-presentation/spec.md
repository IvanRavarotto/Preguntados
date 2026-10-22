# Spec Delta

## ADDED Requirements

### Requirement: Synthesised game audio

The presentation SHALL produce sound for the wheel spin and for the three answer outcomes, and it
SHALL produce that sound **without loading any audio asset**: no `.mp3`, `.wav`, `.ogg` or data-URI
blob, no `<audio>` element, no audio library, and no new runtime dependency. The sound SHALL be
synthesised in the browser with the Web Audio API.

This is a direct consequence of the "No external requests" requirement, which forbids any `src`,
`href`, `url()`, `@import` or `background-image` reference that is not absent or a fragment/data URI,
and of `openspec/project.md`'s rule that the frontend has no bundling or compilation step.

The audio context SHALL be created or resumed **inside a user gesture** — the spin control's click
handler — so that the browser's autoplay policy never suspends it.

The spin sound SHALL start when the spin starts and SHALL stop when the wheel settles. Its
perceived rate SHALL decelerate along the same curve the wheel's rotation follows, so the sound and
the wheel decelerate together. A second spin SHALL NOT leave a second live sound graph behind it, and
no sound SHALL outlive the spin it belongs to.

The three answer cues SHALL be **distinguishable from each other**: correct, incorrect and timed out
SHALL each have their own character, matching the three visually distinct feedback states the
presentation already defines.

The game SHALL behave **exactly as it does without audio** when the Web Audio API is unavailable,
when the audio context is blocked or suspended, or when the device is muted. No exception may escape
into the game flow, and no gameplay outcome may depend on a sound having played.

Sound SHALL NOT be gated on `prefers-reduced-motion`. That preference is about movement, and the
wheel's movement is what it governs; there is no `prefers-reduced-sound` feature to ask about, and
silencing the audio as well would remove feedback that has no visual equivalent.

> `[AUTHORED]` The rate mapping SHALL be a **DOM-free pure function** so that it can be checked
> without a browser. This is the one piece of the sound that is worth testing exactly, and it can
> only be tested exactly if it does not touch the DOM.

#### Scenario: The spin sounds and stops with the wheel

- **GIVEN** the wheel screen
- **WHEN** the spin control is pressed and the wheel settles
- **THEN** an audio context exists and a sound graph is started inside the click handler
- **AND** the graph is stopped within `200ms` of the wheel settling
- **AND** a second spin leaves exactly one live graph

*Provenance: `[IMPL]` — the spin is `spinWheel` (`frontend/index.html:1188`), driven by
`$("spin").addEventListener("click", spinWheel)` (`:913`); the wheel's duration is `SPIN_MS = 4200`
and its settle timeout `SPIN_SETTLE_MS` (`:686-688`). `[AUTHORED]` for the graph lifetime. Measurable:
the number of live audio nodes and the graph's stop time relative to the settle.*

#### Scenario: The sound decelerates with the wheel

- **GIVEN** the spin's easing curve and its duration
- **WHEN** the pure rate mapping is evaluated at `0%`, `25%`, `50%`, `75%` and `100%` of the spin
- **THEN** the mapped interval between events increases monotonically across those samples
- **AND** the mapped value at `0%` is smaller than the mapped value at `100%`

*Provenance: `[DESIGN]` for the export's `duration-[4000ms] cubic-bezier` (`stitch/code.html:201`).
Measurable: the mapping's output at the five samples, with the monotonicity check. The mapping is
DOM-free and is unit-tested in Node.*

#### Scenario: The game is unaffected when audio is unavailable

- **GIVEN** a browser where `AudioContext` is undefined, or where the context cannot be created
- **WHEN** a match is played through a spin, a correct answer, an incorrect answer and a timeout
- **THEN** no exception escapes into the game flow
- **AND** the wheel spins, the answer resolves and the turn changes exactly as they do with audio

*Provenance: `[PRESERVE]` — the game must not depend on a sound having played. Measurable: the
absence of an uncaught exception, and the game's normal progression.*

#### Scenario: The presentation loads no audio asset

- **GIVEN** the served document
- **WHEN** every `src`, `href`, `url()`, `@import` and `background-image` reference is collected
- **THEN** none of them points at an audio file
- **AND** the network panel records no audio request over a full match
- **AND** the document contains no `<audio>` element and no `new Audio(...)` call

*Provenance: `[PRESERVE]` — the "No external requests" requirement. Measurable: the reference set and
the network log. The absence of a request is the observable; a sound that was synthesised is
invisible to the network panel by construction.*

#### Scenario: The three answer cues are distinguishable

- **GIVEN** three separate questions in one match
- **WHEN** the first is answered correctly, the second incorrectly, and the third times out
- **THEN** each outcome starts exactly one cue
- **AND** the three cues differ from each other in their synthesis parameters, so no two are the
  same sound

*Provenance: `[AUTHORED]` — no agent in this fleet can hear, so the criterion is the difference
between the three synthesis parameter sets rather than a judgement about the sounds. The three
outcome paths are `resolveCorrect` (`frontend/index.html:1444`), `resolveFailure` (`:1469`) and
`onTimeout` (`:1428`).*
