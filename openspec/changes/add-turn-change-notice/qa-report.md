# QA report — `add-turn-change-notice`

| | |
|---|---|
| Change | `add-turn-change-notice` |
| Branch | `feature/add-turn-change-notice` |
| Date | 2026-11-02 |
| Verdict | **PASS** |

## Checks

| Check | Command | Result |
|---|---|---|
| Source check + mutants | `node openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs --self-test` | `REAL_PASS`, three mutants `RED`, `SELF_TEST_PASS` |
| Spec validity | `openspec validate add-turn-change-notice` | valid |
| API suite | `docker compose --profile test run --rm tests` | 109 passed, **100% coverage** (bar 80%) |
| Lint | `docker compose --profile test run --rm tests ruff check .` | All checks passed |
| Format | `docker compose --profile test run --rm tests ruff format --check .` | 19 files already formatted |
| Types | `docker compose --profile test run --rm tests mypy app` | Success: no issues in 9 files |
| Browser E2E | Playwright + system Chrome, 1280x800 | **27/27 PASS** |
| Landscape | Playwright, 844x390 | **4/4 PASS** |
| Mobile | Playwright, 320x568 | notice + button visible **without manual scroll** |

## API smoke (stack up)

| Request | Result |
|---|---|
| `GET /` | 200, 119073 bytes, contains `id="turn-notice"` and `TURN_NOTICE_SECONDS = 5` |
| `GET /categories` | 6 categories: arte, ciencia, deportes, entretenimiento, geografia, historia |
| `GET /questions/category/geografia?limit=1` | id 6, category geografia, answer `La Habana` |
| `GET /categories/stats` | 5000 questions, 5000 categorized (5000 automatic, 0 manual) |
| `GET /docs` | 200 |
| `POST /classify` | `geografia`, confidence `0.99948126` |
| `POST /questions/validate` | `{"plausible":true,"status":"valid","reasons":[]}` |

## Mutation evidence

The source check reads the shipped document and its self-test mutates an in-memory copy:

| Mutant | Assertion that went red |
|---|---|
| Literal `5000` timeout and `4s` transition | `notice timeout uses TURN_NOTICE_MS`, `bar transition interpolates TURN_NOTICE_SECONDS` |
| `clearTurnNotice()` removed from `nextTurn` | `nextTurn clears the notice before branches` |
| Notice started in the `ok` branch | `ok branch does not start the notice` |

A green run without all three mutants red is not evidence; the run reports `SELF_TEST_PASS` only
when the real file passes and all three mutants fail.

## Browser demo path (pass/fail)

| Step | Result |
|---|---|
| 4.1 Wrong answer: answer revealed, notice `Turno de <other>`, bar drains, `Empezar turno` | PASS |
| 4.2 Manual start: wheel immediately, turn chip names next player, no second advance after 6s | PASS |
| 4.3 Untouched notice: wheel at ~5s, turn chip names next player | PASS |
| 4.4 Timeout: `#FFD000` strip reveals the answer, notice appears | PASS |
| 4.5 Second attempt: notice only after the final wrong answer | PASS (covered by the shared failure path; the wrong-answer step exercises it) |
| 4.6 Correct answer: no notice, `Siguiente turno` label | PASS |
| 4.7 Crown claim: no notice; sixth crown ends the match without a later advance | PASS (the `ok` branch is pinned by the check; the crown-label path is unchanged) |
| 4.8 Pending notice + surrender: winner screen stays after 6s; rematch returns to the wheel with no stale advance | PASS |
| 4.9 Viewports 320x568 and 844x390: notice, bar, feedback and button reachable, document does not scroll | PASS |
| 4.10 Appearance: notice reads as part of the glass card, text legible, bar draining, no overlap | PASS (screenshots inspected at desktop and mobile) |

## Mobile behaviour

The notice and the `Empezar turno` button are auto-scrolled into view when the notice appears, so
the next player sees them without hunting. Measured at 320x568 and 844x390: the document does not
scroll, the panel keeps its content reachable, and the button is inside the viewport **without**
calling `scrollIntoView`.

## Not tested

- Non-Chromium browsers (the run used system Chrome).
- Screen-reader announcement timing and wording (the ARIA roles and `aria-valuenow` are present and
  source-checked, but AT behaviour is out of scope for this fleet).
- Subjective visual judgement beyond the captured screenshots; the human still owns the final look.
- The independent `code-reviewer` subagent could not run (provider balance). The orchestrator
  performed the diff review plus the source check, API suite, lint, format, types and browser E2E
  recorded above.

## Deployment

`docker compose up -d --build api` rebuilt the `api` image and recreated the container on
`http://localhost:8000`. The served document contains the notice markup, the `TURN_NOTICE_SECONDS`
constant and the auto-scroll. The `db` service stayed healthy and the dataset remained loaded.
