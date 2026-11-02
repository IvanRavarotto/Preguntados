# Test plan — `improve-wheel-audio`

| | |
|---|---|
| Change | `improve-wheel-audio` |
| Branch | `feature/improve-wheel-audio` |
| Track | 1 (Light) |
| Capability | `game-presentation` |
| Surface | `frontend/index.html` only |

## Checks

| Criterion (delta) | Check | Pass bar |
|---|---|---|
| Bus `>= 0.5`, click `>= 0.2`, whir `>= 0.1` | `checks/check_wheel_mix.mjs` reads the four constants | all three bounds |
| Spin louder than the correct cue (`0.18`) | the same script computes `bus * (click + whir)` | `> 0.18` |
| No clipping | the same script computes `bus * (click + whir + thunk)` | `< 0.35` |
| Whir has a body filter | source scan for `type = "peaking"` on the whir path | present |
| Settle thunk | source scan for `SPIN_THUNK_GAIN` and the scheduled low oscillator | present |
| Still asset-free | source scan for `<audio`, `new Audio(`, audio extensions, `data:audio/` | zero matches |
| Graph lifetime, one graph, cues, no exception | archived `check_audio.mjs --url <base>` | `AUDIO_CHECK_PASS` |
| Rate mapping unchanged | archived `check_audio_mapping.mjs` | pass |
| Inline script parses | Node `new vm.Script` over the extracted script | one script, parses |

## Negative controls

- Set the bus back to `0.3`: the loudness check must fail.
- Remove the peaking filter: the body check must fail.
- Remove the thunk: the settle-impact check must fail.
- Add an audio URL: the asset check must fail.

## Demo path

1. Rebuild the Docker API and open the game.
2. Start a match and spin; the spin should be clearly audible over the answer cues, with a mechanical
   whir and a final thunk, and it must still stop with the wheel.
3. Answer correctly, incorrectly, and let a timeout run; the three cues must stay distinguishable.

## Not tested

- A subjective "sounds better" judgement; the check pins levels and structure, and the human listens.
- A physical handset and non-Chromium browsers.
