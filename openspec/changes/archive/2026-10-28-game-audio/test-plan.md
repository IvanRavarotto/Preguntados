# Test plan — `game-audio`

## Scope

One capability (`game-presentation`), one file under test (`frontend/index.html`). No API, schema, or
dependency change. The audio itself cannot be heard by an agent, so every criterion below is checked
through a **machine-observable proxy**; what the sounds actually sound like is the human's call at
Gate C.

## Environments

| | |
|---|---|
| Browser | Chromium via headless DevTools Protocol (Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, honouring `CHROME_PATH`). `Network.requestWillBeSent` and `Runtime.exceptionThrown` are subscribed. |
| API | `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`, PostgreSQL 15 up. |
| Runner | Node 24 scripts under this change's `checks/` folder. No frontend test runner is added; it is not in `openspec/project.md`. |

## Criteria → checks

| Criterion (from the delta) | Check | Pass bar |
|---|---|---|
| An audio context exists and a graph starts inside the click handler | `openspec/changes/game-audio/checks/check_audio.mjs` — the context is created while a click gesture is active; the graph's node count is read after the spin starts | context present; node count `> 0` |
| The graph stops within 200ms of the wheel settling | the graph's live-node count is read at the settle and 200ms later | **0** live nodes at the settle |
| A second spin leaves exactly one live graph | the same read after the second spin | **1** live graph, not 2 |
| The rate mapping is monotonic and positive | `openspec/changes/game-audio/checks/check_audio_mapping.mjs` — the DOM-free mapping evaluated at `0%`, `25%`, `50%`, `75%`, `100%` | strictly non-decreasing; all values finite and `> 0` |
| The mapping ends no earlier than the spin's duration | the mapping's last event time against `SPIN_MS` | `>= SPIN_MS` |
| No exception escapes when audio is unavailable | `Runtime.exceptionThrown` subscribed across a spin and the three outcomes | **0** uncaught exceptions |
| The game progresses normally with audio present | the spin completes, the turn advances, the feedback strip appears | all three observed |
| No audio asset is loaded | `Network.requestWillBeSent` over a full match, filtered for audio extensions and `blob:`/`data:` media | **0** audio requests |
| No `<audio>` element and no `new Audio(...)` | source inspection of the served document | **0** matches each |
| The three outcome cues are distinguishable | the synthesis parameter set recorded for each of the three cues | the three parameter sets are pairwise different |
| Each outcome starts exactly one cue | the cue count read after each of the three outcomes | **1** each |

## Negative controls (required)

| Mutated copy | Must fail |
|---|---|
| the spin sound's teardown removed | the "graph stops at the settle" check |
| the cue fired on the wrong outcome path | the "exactly one cue per outcome" check |
| an audio file loaded from a URL | the "no audio asset is loaded" check |

## Demo path (human integration test)

The one thing the fleet cannot check: **does it sound right**. A human plays a match and confirms
that the wheel's spin has an audible rumble whose rate slows down as the wheel slows, that a correct
answer, a wrong answer and a timeout each sound different from each other, that the sound stops when
the wheel stops, and that a second spin does not leave the first one playing. This is the human's
judgement at Gate C and the plan states it as such rather than pretending a script covers it.

## Not tested, and why

- **No assertion on perceived loudness, timbre or pleasantness.** No agent can hear. The gain ceiling
  is specified in the delta as a value, and the machine check confirms the graph's parameters, not the
  experience.
- **No cross-browser audio matrix.** Chromium only. Web Audio is Baseline, but this change does not
  claim to have verified other engines.
- **No test for the audio behaviour when the tab is backgrounded.** Browsers suspend the context;
  the game is local and foreground, so the case is out of the product's scope.
