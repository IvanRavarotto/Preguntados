# Tasks

Ordered so that every task leaves the tree green. The frontend has no test runner; the checks named
here are the scripts under this change's `checks/` folder specified in `test-plan.md`.

## 1. Pin the constraint and the mapping

- [x] 1.1 Add `openspec/changes/game-audio/checks/check_audio.mjs` — a headless-Chrome DevTools Protocol driver that opens the
      served game, starts a match, spins, and asserts via the `Network.requestWillBeSent` event that
      **no** request for an audio resource is made over a full match, that the served document
      contains no `<audio>` element and no `new Audio(...)` call, and that the game completes a spin,
      a correct answer, an incorrect answer and a timeout with no uncaught exception. Locates Edge or
      Chrome automatically, honours `CHROME_PATH`, and exits with a distinct code and a clear message
      when no Chromium binary is found.
- [x] 1.2 Add the DOM-free rate mapping as a pure function, exported for Node, and add
      `openspec/changes/game-audio/checks/check_audio_mapping.mjs` — a Node script that asserts the mapping is monotonic across
      `0%`, `25%`, `50%`, `75%` and `100%` of the spin, that it is finite and positive at every
      sample, and that it ends no earlier than the spin's duration.
- [ ] 1.3 Record the baseline: the shipped file makes no audio request today, so the asset
      constraint check passes trivially before the change — record that it must still pass after.

## 2. Build the audio layer

- [x] 2.1 Add the audio layer in `frontend/index.html`: create or resume the `AudioContext` inside
      the spin control's click handler, and expose a small surface for the two sound families.
- [x] 2.2 Implement the spin sound: a filtered noise bed plus a ratchet of clicks, both scheduled on
      the audio clock from the pure rate mapping, following the wheel's `SPIN_MS` and easing. The
      graph SHALL stop when the wheel settles, and a second spin SHALL tear the previous graph down
      rather than stack one.
- [x] 2.3 Implement the three answer cues, one per outcome, each with its own synthesis parameters
      so the three are distinguishable. Fire them from `resolveCorrect`, `resolveFailure` and
      `onTimeout`.
- [x] 2.4 Fail soft everywhere: if the Web Audio API is missing, or the context cannot be created or
      resumed, or a node throws, the game continues unchanged and no exception escapes.

## 3. Verify

- [x] 3.1 Run `openspec/changes/game-audio/checks/check_audio.mjs` and `openspec/changes/game-audio/checks/check_audio_mapping.mjs`; record the output.

  Recorded: `AUDIO_MAPPING_PASS` (samples 18.0, 99.6, 123.1, 128.5, 130.0 ms; 47 clicks, last 4105.3 ms, next 4235.2 ms) and `AUDIO_CHECK_PASS` (context created on the gesture, one graph during the spin, zero at settle, one after the second spin, one cue per outcome, no audio request, no exception).
- [ ] 3.2 Record the negative controls: a copy of the file with the spin sound's teardown removed
      MUST leave a live graph after the wheel settles; a copy that plays a cue on the wrong outcome
      MUST fire two cues for one outcome; a copy that loads an audio file MUST make an audio request
      and MUST fail the asset check. A check that comes back green on a mutated file has no teeth.
- [ ] 3.3 Run the full check set: `openspec/changes/game-audio/checks/check_audio.mjs`, `openspec/changes/game-audio/checks/check_audio_mapping.mjs`,
      `openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs`, `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs`, `poetry run pytest`,
      `poetry run ruff check .`, `poetry run ruff format --check .`, `poetry run mypy app`. All green.
- [ ] 3.4 Record the measured evidence in this file: the request log for a full match, the mapping's
      five samples, the live-graph counts before and after the second spin, the negative-control
      failures, and the command output of each check.
