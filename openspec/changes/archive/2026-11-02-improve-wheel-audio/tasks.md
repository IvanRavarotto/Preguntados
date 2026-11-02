# Tasks

## 1. Raise and enrich the spin mix

- [x] 1.1 In `frontend/index.html`, add `SPIN_BUS_GAIN = 0.6`, `SPIN_WHIR_GAIN = 0.12`,
      `SPIN_CLICK_GAIN = 0.24`, and `SPIN_THUNK_GAIN = 0.18` next to the audio state.
- [x] 1.2 Use those constants in `playSpin`; add a `peaking` filter on the whir path and a short
      low-frequency oscillator that decays near the end of the spin. Keep the existing bus fade,
      graph lifetime, click scheduling, and rate mapping.
- [x] 1.3 Expose the four mix values as `spinMix` in `window.__audio.getState()`.

## 2. Make the change checkable

- [x] 2.1 Add `checks/check_wheel_mix.mjs`: read the constants and assert the loudness, the
      non-clipping product, the peaking filter, the settle thunk, and the absence of audio assets.
- [x] 2.2 Add the browser-side graph-lifetime/mix assertions by running the archived
      `check_audio.mjs` against a local server that serves the changed frontend.
- [x] 2.3 Run the inline-script parse check and the existing Python gates; no backend change is
      expected.

## 3. Verify and record

- [x] 3.1 `node openspec/changes/improve-wheel-audio/checks/check_wheel_mix.mjs` passes.
- [x] 3.2 The archived `check_audio.mjs` and `check_audio_mapping.mjs` still pass.
- [x] 3.3 Rebuild the Docker API, listen to a spin, and record the result in a short QA report.
