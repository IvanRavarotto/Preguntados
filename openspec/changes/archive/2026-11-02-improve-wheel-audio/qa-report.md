# QA report — `improve-wheel-audio`

| | |
|---|---|
| Change | `improve-wheel-audio` |
| Branch | `feature/improve-wheel-audio` |
| Date | 2026-10-29 |
| Verdict | **PASS** |

## Checks

| Check | Command | Result |
|---|---|---|
| Mix levels and timbre | `node openspec/changes/improve-wheel-audio/checks/check_wheel_mix.mjs` | 10/10 PASS, `WHEEL_MIX_PASS` |
| Audio contract | `node openspec/changes/archive/2026-10-28-game-audio/checks/check_audio.mjs --url http://127.0.0.1:8007` | 16/16 PASS, `AUDIO_CHECK_PASS` |
| Rate mapping | `node openspec/changes/archive/2026-10-28-game-audio/checks/check_audio_mapping.mjs` | `AUDIO_MAPPING_PASS` |
| Inline script parses | Node `vm.Script` over the extracted block | one script, parses |
| No asset added | `check_wheel_mix.mjs` scans the document | zero audio elements, URLs, or data URIs |

## What changed

- Spin bus `0.3 -> 0.6`, click `0.1 -> 0.24`, whir `0.055 -> 0.12`, plus a `0.18` settle thunk.
- The whir now passes through a `peaking` body filter at `180 Hz`; a low `140 -> 70 Hz` thunk marks the
  settle. The graph lifetime, click rate mapping, and answer cues are unchanged.
- `window.__audio.getState().mix` exposes the four values for checks.

## Mutation evidence

- Setting the bus back to `0.3` reddened `the spin bus is at least 0.5` and
  `the spin is louder than the 0.18 correct cue` (`peak 0.108`); restored to `0.6` and the check
  passed again.

## Deployment

- Rebuilt the `api` image and recreated the container on port 8000. The served document contains
  `SPIN_BUS_GAIN = 0.6`, `SPIN_THUNK_GAIN = 0.18`, and the `peaking` filter.
- The human listen is the remaining acceptance step: start a match and spin.

## Not tested

- Subjective sound quality; no agent can hear it. The levels and structure are pinned, and the human
  judges the result.
- Physical handsets and non-Chromium browsers.
