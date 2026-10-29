# Test plan — `support-true-false-authoring`

| | |
|---|---|
| Change | `support-true-false-authoring` |
| Branch (expected, per AGENTS §2) | `feature/support-true-false-authoring` |
| Track | 1 (Light) — one existing endpoint, one existing form, one capability; no schema or route change |
| Capability | `question-authoring` |
| Delta under test | `openspec/changes/support-true-false-authoring/specs/question-authoring/spec.md` — reconciled against `proposal.md`, the delta, and `tasks.md`; `openspec validate support-true-false-authoring` passes |
| Surfaces under test | `app/question_authoring.py`, `frontend/index.html`, `tests/test_authoring.py`, `tests/conftest.py` |
| Status | Reconciled plan, ready for Gate B. No dev work starts before approval. |

## Scope

**Included**

- `POST /questions` accepts `question_type` with the exact values `multiple_choice` (default when
  absent) and `true_false`.
- A true/false submission persists exactly two distinct non-empty options in `option_a`/`option_b`,
  stores any submitted `option_c`/`option_d` as `NULL`, and stores an answer equal to one of the two.
- Category and single-question reads return the authored true/false row with `option_c`/`option_d`
  `null`.
- True/false validation: both options required, options distinct, answer among A/B, duplicate text,
  unsupported type rejected by the request schema.
- Multiple-choice behavior is unchanged: four options required, the existing validation codes and
  statuses unchanged, the existing response shape unchanged.
- The start-screen form: type selector, `true_false` fixed read-only A/B, hidden and cleared C/D rows,
  cleared C/D radio, radio-driven `correct_answer`, `question_type` in the payload, type-aware error
  copy, return to multiple choice, reset to multiple choice after success, mobile usability, and no
  new breakpoint.
- The four declared quality gates, plus the dev task's required mutation evidence.

**Excluded**

- Any schema or migration change. `Question.option_c` and `Question.option_d` are already nullable
  (`app/models.py`), which is the data shape this change uses. A persisted `question_type` column is
  outside the proposal.
- A new route, a new interface, or server-side enforcement of the literal `Verdadero`/`Falso` labels.
  The API validates structure; the form supplies the labels.
- Editing, deleting, or listing authored questions; classification; duplicate-rule changes; gameplay,
  jokers, timers, or scoring changes.
- Concurrent duplicate submission (two requests racing on the same text). Duplicate detection remains
  read-then-insert; the product is a local single-user demonstration.
- Cross-browser behavior, real-device measurements, pixel review, and a full accessibility audit.

## Environments and provisioning

| Environment | Provisioning and shape | Used by |
|---|---|---|
| Hermetic API suite | Poetry environment, Python 3.14.7, pytest 9 + pytest-cov, FastAPI `TestClient`. `tests/conftest.py` gives each test a fresh in-memory SQLite database (`StaticPool`) and the real classifier built from the shipped weights. No PostgreSQL, no network, no API key. Run from the repo root with `poetry run pytest ...`. | A-01 to A-16, Q-01 to Q-04 |
| Local API and PostgreSQL | `docker compose up -d` for PostgreSQL 15 (`db`) with the persistent volume. API on `http://localhost:8000`, started by Compose or by `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`. Connection shape is the Compose-shaped local URL `postgresql+psycopg2://admin:admin123@localhost:5432/questions_db` (user `admin`, password `admin123`, database `questions_db`, port `5432`). These are local development credentials only; do not copy them into fixtures, logs, or artifacts. The dataset is loaded by the API container at start-up, or with `python -m app.load_dataset --if-missing` before the API starts. | Demo path and browser checks (served by the API or a file proxy) |
| Browser | Chromium through the DevTools Protocol, Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` (honouring `CHROME_PATH`), driven by Node 24. Viewports: `320x568`, `360x640`, `390x844`, `844x390`, `1440x900`. The document is the shipped `frontend/index.html`, served either by `GET /` or by a check's file proxy. No frontend test framework is added; none is declared in `openspec/project.md`. | F-01 to F-12 |
| Quality gates | The same local Poetry environment and Python 3.14.7. Run each exact command from the repo root. | Q-01 to Q-04 |

**Pass/fail bar.** A check passes only when its command exits `0` and every assertion in it is true.
A skipped case, a selector that matched zero elements, an empty request log, or an unavailable
dependency is **BLOCKED**, never Pass. Record command, exit code, expected result, observed result,
and the commit/branch for every case. The browser checks must prove they found real controls before
asserting anything about them.

## Resolved contract (from proposal and delta)

These six points are settled; the plan no longer carries open reconciliation questions.

1. **Response shape.** A successful submission returns `201` with exactly `{id, category,
   confidence_score}` for both types.
2. **Unsupported type.** `question_type` is a Pydantic `Literal["multiple_choice", "true_false"]`;
   an unsupported value returns `422` and persists nothing. The same payload with `true_false` must
   return `201`, proving the text itself is authorable.
3. **Submitted C/D on true/false.** Non-empty `option_c`/`option_d` are ignored and stored as `NULL`
   (`201`), not rejected.
4. **Option texts.** The API accepts any two distinct non-empty texts; it does not enforce
   `Verdadero`/`Falso`. The form is what fixes those labels.
5. **Form transitions.** Entering `true_false` clears C/D text and any C/D radio; returning to
   `multiple_choice` clears the fixed A/B labels. After a successful submission the form resets to
   `multiple_choice` with four rows. A/B text typed before switching to true/false is not restored.
6. **No client-side submit blocking.** The form keeps `novalidate`; a no-radio submit sends
   `correct_answer: ""` and the server answers `400 missing_fields`.

No delta criterion is unmappable. Every requirement scenario has at least one check in the coverage
table below.

## Scenario coverage

| Requirement | Scenario | Checks |
|---|---|---|
| User can add a question from the start screen | Adding a valid question | A-10, A-11, A-13, F-01 |
| User can add a question from the start screen | Rejecting invalid question | A-05, A-06, A-07, A-12, A-09, F-08 |
| User can add a question from the start screen | Adding a valid true/false question | A-01, A-02, A-04, A-16 |
| User can add a question from the start screen | A true/false record has no options C or D | A-02, A-03, A-04, A-15 |
| User can add a question from the start screen | A true/false answer must be one of its two options | A-05 |
| User can add a question from the start screen | A true/false question requires both options | A-06 |
| User can add a question from the start screen | A true/false question requires two distinct options | A-07 |
| User can add a question from the start screen | Multiple-choice validation and error codes are unchanged | A-10, A-11, A-12 |
| User can add a question from the start screen | An unsupported question type is rejected without persisting | A-14 |
| Server-side duplicate detection | Detecting duplicate question | A-08 |
| Server-side duplicate detection | A duplicate true/false question is rejected by the same rule | A-08 |
| The start-screen form offers a question type | Multiple choice is the default and behaves as before | F-01, F-05, F-06 |
| The start-screen form offers a question type | Selecting true/false fixes the two options | F-02 |
| The start-screen form offers a question type | A true/false submission carries the type and the two options | F-03, F-04, F-06 |
| The start-screen form offers a question type | Returning to multiple choice restores the four-option form | F-05 |
| The start-screen form offers a question type | Error copy matches the selected type | F-07 |
| The start-screen form offers a question type | True/false authoring is usable on a phone and adds no breakpoint | F-09 |

F-10 and F-11 are cross-cutting guards (no uncaught exception; the check reads the shipped form).
F-12 is the task-3.3 regression guard that the authored two-option row still renders as two options in
the game.

## Criteria → checks

### API checks

All API cases are HTTP-contract integration cases. They belong to QA's integration level, even when
they live beside the dev's unit tests in `tests/test_authoring.py`. Unit coverage of the new branch is
the dev's task. The pytest function names below are planned labels; if the dev names them differently,
the PR must state the mapping so QA runs the same cases.

| ID | Requirement / scenario (delta) | Check (instrument) | Pass bar |
|---|---|---|---|
| A-01 | User can add a question from the start screen — Adding a valid true/false question | `test_true_false_question_is_created` — POST a valid `true_false` payload with `Verdadero`/`Falso` | `201`; body keys exactly `{id, category, confidence_score}`; `id` is an `int`; `category` is one of `arte`, `ciencia`, `deportes`, `entretenimiento`, `geografia`, `historia`; `0 < confidence_score <= 1` |
| A-02 | Adding a valid true/false question; A true/false record has no options C or D | `test_true_false_question_persists_two_options` — POST, then `GET /questions/{id}` and read the `Question` row through the test session on the same in-memory engine | `GET /questions/{id}` returns the submitted `option_a`/`option_b` and answer; both C/D are `null`; the database row has `option_c is None` and `option_d is None`; `answer` equals A or B |
| A-03 | A true/false record has no options C or D | `test_true_false_question_accepts_omitted_and_blank_c_d` — one POST with C/D omitted, one with `option_c: ""` and `option_d: ""` | both `201`; both rows have `option_c is None` and `option_d is None`; neither returns `missing_fields` |
| A-04 | Adding a valid true/false question; A true/false record has no options C or D | `test_true_false_question_category_fetch_has_null_c_d` — POST, then `GET /questions/category/{body["category"]}?limit=200` | the new id is present; `option_a`/`option_b` non-empty and distinct; `option_c is None`; `option_d is None`; `answer` is A or B; `category` and `confidence_score` match creation |
| A-05 | A true/false answer must be one of its two options | `test_true_false_answer_not_in_options` — one case with a third text, one with `correct_answer` equal to a value that appears only in submitted `option_c`/`option_d`; positive controls with answer = A and answer = B | the two invalid cases return `400` with `detail == "answer_not_in_options"` and persist nothing; the two valid cases return `201` |
| A-06 | A true/false question requires both options; Rejecting invalid question (question and answer required) | `test_true_false_missing_fields` — empty `option_a`, empty `option_b`, whitespace-only variants, plus blank `question` and blank `correct_answer` | every case returns `400` with `detail == "missing_fields"` and creates no row |
| A-07 | A true/false question requires two distinct options | `test_true_false_options_not_distinct` — equal A/B, and values differing only by surrounding whitespace | `400`; `detail == "options_not_distinct"`; no row created |
| A-08 | Server-side duplicate detection — Detecting duplicate question; A duplicate true/false question is rejected by the same rule | `test_true_false_duplicate` — seed an existing question with the same normalized text, then submit true/false; the existing multiple-choice duplicate test is the control; also submit across types | `409`; `detail == "duplicate_question"`; no row created; the true/false and multiple-choice duplicate responses have the same status and detail |
| A-09 | Rejecting invalid question, and every "no persistence" clause in the rejection scenarios | `test_true_false_rejections_persist_nothing` — run the 400/409 matrix and compare `GET /categories/stats` plus row counts before and after | both counts equal; no partial `Question` or `Categorization` |
| A-10 | User can add a question from the start screen — Adding a valid question | The existing `tests/test_authoring.py` suite plus `test_multiple_choice_default_unchanged` — four-option POST with no `question_type` | existing suite passes; the new POST is `201` with exactly `{id, category, confidence_score}`; the row and category fetch have four non-empty options and the answer among them |
| A-11 | Multiple-choice validation and error codes are unchanged | `test_multiple_choice_explicit_type_unchanged` — the A-10 payload plus `question_type: "multiple_choice"` | `201` with exactly `{id, category, confidence_score}`; persisted/fetched row matches A-10 |
| A-12 | Rejecting invalid question; Multiple-choice validation and error codes are unchanged | `test_multiple_choice_missing_options` plus the existing `missing_fields`, `options_not_distinct`, and `answer_not_in_options` tests | missing C or D -> `400 missing_fields`; duplicate options -> `400 options_not_distinct`; answer outside the four -> `400 answer_not_in_options`; no other detail code replaces any of the four |
| A-13 | Adding a valid question; Adding a valid true/false question | A-01 asserts the true/false key set; A-10 and A-11 assert the multiple-choice key set | exactly `{id, category, confidence_score}` for both types; no extra key and no missing key |
| A-14 | An unsupported question type is rejected without persisting | `test_unknown_question_type_rejected` — an otherwise valid payload with `question_type: "boolean"`, then the same payload with `true_false` | unsupported value: `422`; `GET /categories/stats` unchanged; then `true_false`: `201`; stats show exactly the accepted record; the positive control prevents a check that only proves rejection |
| A-15 | A true/false record has no options C or D (non-empty submitted C/D) | `test_true_false_with_supplied_c_d` — send non-empty `option_c`/`option_d` | `201`; the stored row and both `GET /questions/{id}` and `GET /questions/category/{category_name}` return `null` for C/D; the submitted C/D values are not persisted |
| A-16 | Adding a valid true/false question (API accepts any two distinct texts) | `test_true_false_accepts_arbitrary_pair` — use `Sí`/`No` instead of `Verdadero`/`Falso` | `201`; stored and fetched options are exactly `Sí`/`No`; no literal-label enforcement |

### Frontend checks

Planned runners:

- `openspec/changes/support-true-false-authoring/checks/check_authoring_form.mjs` (Node 24,
  Chromium via CDP, modelled on the archived
  `openspec/changes/archive/2026-10-28-mobile-layout-overflow/checks/check_layout.mjs`). It takes
  `--file <html>` to serve a controlled copy and `--url <base>` to proxy API calls, and defaults to
  the shipped `frontend/index.html` served by the API. It opens `details#authoring`, stubs
  `window.fetch` to record requests and return controlled responses, and reads rendered geometry with
  `getClientRects()`/`offsetParent`.
- `openspec/changes/support-true-false-authoring/checks/check_authored_tf_render.mjs` for F-12. It
  starts a match, stubs the category endpoint with the authored two-option row, spins the wheel, and
  reads the question screen. It uses the same CDP harness and the shipped document.

The form contract uses the ids the task declares: `#q-type`, `#q-option-a` to `#q-option-d`,
`#option-row-c`, `#option-row-d`, and `syncAuthoringType()`. No new id is invented here.

| ID | Requirement / scenario (delta) | Check (instrument) | Pass bar |
|---|---|---|---|
| F-01 | The start-screen form offers a question type — Multiple choice is the default and behaves as before | `check_authoring_form.mjs` initial state at `1440x900` and `390x844`; open the form and submit four distinct options through the fetch stub | `#q-type` exists as the first `.auth-field` in `#authoring-form` and its value is `multiple_choice`; exactly four visible, enabled, editable text inputs (`#q-option-a` to `#q-option-d`); exactly four visible radios; `#option-row-c` and `#option-row-d` visible; the submit returns the stubbed `201` and the captured body still carries four options and `question_type: "multiple_choice"` |
| F-02 | Selecting true/false fixes the two options | `check_authoring_form.mjs`: type text into A to D, select the C radio, then set `#q-type` to `true_false` and dispatch `change` so `syncAuthoringType()` runs | `#q-option-a` value is exactly `Verdadero`; `#q-option-b` exactly `Falso`; both `readOnly === true` and `disabled === false`; `#option-row-c.hidden === true` and `#option-row-d.hidden === true` (and neither row renders); C/D text values are `""`; no radio remains checked; only A and B radios are visible and selectable; exactly two option rows are visible |
| F-03 | A true/false submission carries the type and the two options (radio → answer) | capture the next POST while clicking the A radio and submitting; repeat with the B radio | captured `correct_answer` is exactly `Verdadero` for A and `Falso` for B; it is never hardcoded; exactly one POST per submit |
| F-04 | A true/false submission carries the type and the two options (payload) | inspect the captured JSON body in both modes | true/false body: `question_type == "true_false"`, `option_a == "Verdadero"`, `option_b == "Falso"`, `option_c == ""`, `option_d == ""`, `correct_answer` equals the checked value; multiple-choice body: `question_type == "multiple_choice"` and all four option values present; the body never carries stale hidden C/D text |
| F-05 | Returning to multiple choice restores the four-option form | `check_authoring_form.mjs`: from the `true_false` state set `#q-type` back to `multiple_choice`, then type four distinct values and submit | `#option-row-c`/`#option-row-d` visible and editable; A/B editable, `readOnly === false`, and no longer contain `Verdadero`/`Falso`; all four radios visible and selectable; captured `option_a` to `option_d` equal the typed values; no fixed label remains |
| F-06 | A true/false submission carries the type and the two options (success status); task 2.2 reset | stub `201 {id: 123, category: "arte", confidence_score: 0.91}`, submit in true/false mode | status visible with the success class; text names the category and its confidence (and `#123`); after success `#q-type` is `multiple_choice`; four rows, including C/D, are visible; all text fields are empty; no radio is checked; A/B are editable again; the submit control is enabled |
| F-07 | Error copy matches the selected type | stub `400 {detail: "missing_fields"}` and `400 {detail: "options_not_distinct"}` in true/false and in multiple-choice mode | true/false messages name the count as two (either `2` or `dos`) and do **not** name four (`4` or `cuatro`); multiple-choice messages name four; inputs keep their values; submit is re-enabled; no success state; the raw detail code is not shown |
| F-08 | Rejecting invalid question (no-radio submission) | no radio checked; submit with the fetch stub (or the real API) returning `400 missing_fields` | because the form keeps `novalidate`, exactly one request is sent with `correct_answer: ""`; no client-side blocking; the status shows the error; no success message and no form reset |
| F-09 | True/false authoring is usable on a phone and adds no breakpoint | `check_authoring_form.mjs` at `320x568`, `360x640`, `390x844`, `844x390`, and `1440x900`: open the form, switch to true/false, use both option fields, both radios, and submit | every control is reachable and operable, scrolling the start panel internally where needed; `document.documentElement.scrollHeight <= window.innerHeight`; `documentElement.scrollWidth <= clientWidth + 1`; no visible control has a zero-width or zero-height rendered box; the stylesheet's media queries are exactly `768px`, `1024px`, and `640px` — no fourth |
| F-10 | All frontend scenarios — no uncaught exception | CDP `Runtime.exceptionThrown` subscribed for the whole form run; request log for submit calls | `0` uncaught exceptions; exactly one `/questions` request per submit; no unexplained failed request |
| F-11 | All frontend scenarios — the check reads the shipped frontend | the script defaults to the shipped `frontend/index.html` served by the API or its file proxy; before interacting it asserts `#authoring-form`, `#q-type`, and the four option rows exist | it fails if the form, selector, or rows are absent; it never passes with zero controls; the pre-change-document negative control must fail |
| F-12 | Task 3.3 regression guard (the authored true/false row renders in the game) | `check_authored_tf_render.mjs` — start a match, stub `/questions/category/*` with a two-option authored row, spin, and read the question screen | exactly two option buttons render with `Verdadero`/`Falso`; no C/D option renders; the correct button triggers the existing correct-answer path; no console exception |

### Quality gates

These are the exact commands declared by `openspec/project.md` and the `quality-toolchain`
capability.

| ID | Gate | Command | Pass bar |
|---|---|---|---|
| Q-01 | Behavioral suite and coverage | `poetry run pytest --cov=app --cov-fail-under=80` | exit `0`; no failures or errors; coverage `>= 80%`; no new test skipped. `docker compose --profile test run --rm tests` runs the same suite and has the same bar |
| Q-02 | Lint | `poetry run ruff check .` | exit `0`; `0` findings |
| Q-03 | Format | `poetry run ruff format --check .` | exit `0`; no file would be reformatted |
| Q-04 | Types | `poetry run mypy app` | exit `0`; `0` errors |

## Task traceability

| Task | Check coverage |
|---|---|
| 1.1 `question_type: Literal[...] = "multiple_choice"` on `QuestionCreate` | A-10 (absent defaults to multiple choice), A-11 (explicit multiple choice), A-14 (unsupported value is `422`) |
| 1.2 Validator branch for both types, C/D ignored for true/false, duplicate check last | A-01 to A-09, A-12, A-15, A-16 |
| 1.3 Accepting-path pytest cases, including `GET /questions/{id}` and category fetch | A-01, A-02, A-03, A-04, A-15 |
| 1.4 Rejecting and compatibility pytest cases, including the `422` positive control | A-05, A-06, A-07, A-08, A-10, A-11, A-12, A-13, A-14 |
| 2.1 `#q-type`, `option-row-c`/`option-row-d` ids, no CSS or media query | F-01, F-02, F-09 |
| 2.2 `syncAuthoringType()` on init and `change`; true/false transitions; reset after success | F-02, F-05, F-06 |
| 2.3 Payload always carries `question_type`; C/D empty for true/false; type-aware `authoringMessage` | F-03, F-04, F-07 |
| 3.1 Four declared gates, no existing test edited | Q-01 to Q-04; A-10 and A-12 keep the existing multiple-choice tests untouched |
| 3.2 Mutation evidence for stored C/D and the removed true/false branch | Negative controls 1 and 2 |
| 3.3 Browser/QA pass at five viewports, game renders two options, no horizontal overflow, no new breakpoint | F-09, F-12, demo path |

## Entry and exit criteria

**Entry**

- The delta exists at the path above, `openspec validate support-true-false-authoring` exits `0`, and
  this plan is approved at Gate B.
- `poetry install` has completed in the declared environment.
- For A-01 to A-16 and Q-01 to Q-04, no external service is required; the hermetic suite owns its
  database.
- For the browser checks and the demo, PostgreSQL is healthy, the dataset is loaded, and the API
  answers `GET /categories` and `GET /questions/category/arte?limit=1`.
- The baseline quality gates and the existing `tests/test_authoring.py` are green before the change,
  or pre-existing failures are recorded and excluded explicitly.
- Unique question texts (a timestamp or UUID suffix) are prepared so repeated runs do not collide with
  the duplicate rule.
- The browser scripts find `#authoring-form`, `#q-type`, and the option rows; otherwise the browser
  cases are BLOCKED, not Pass.

**Exit**

- Every A and F case has a recorded Pass, or a bug with reproduction steps and severity.
- Q-01 to Q-04 all exit `0`; coverage is at or above the declared bar.
- The human demo path below has been completed on desktop and mobile.
- No uncaught browser exception and no unexplained skipped/unrun case remains.
- Every delta scenario remains mapped to at least one check, and every check has an observed result.
- `openspec validate support-true-false-authoring` still exits `0`.

## Initial test cases (execution order)

1. **Baseline and multiple-choice regression** — run the existing `tests/test_authoring.py` and the
   four quality gates. Covers A-10 to A-13, Q-01 to Q-04.
2. **True/false happy path** — POST a valid two-option question, read it through
   `GET /questions/{id}`, fetch its category, and post with arbitrary `Sí`/`No`. Covers A-01 to A-04,
   A-15, A-16.
3. **True/false validation matrix** — one case per row below. Covers A-05 to A-09, A-14.

   | Submission change | Expected |
   |---|---|
   | valid, answer = `Verdadero` | `201` |
   | valid, answer = `Falso` | `201` |
   | `option_a` or `option_b` blank or whitespace-only | `400 missing_fields` |
   | `question` or `correct_answer` blank or whitespace-only | `400 missing_fields` |
   | `option_a == option_b` (including whitespace-only difference) | `400 options_not_distinct` |
   | answer outside A/B, including a value that appears only in submitted C/D | `400 answer_not_in_options` |
   | normalized duplicate of an existing question | `409 duplicate_question` |
   | `option_c` / `option_d` omitted | `201`, both stored `NULL` |
   | `option_c` / `option_d` empty strings | `201`, both stored `NULL` |
   | non-empty `option_c` / `option_d` | `201`, both stored `NULL`, values not persisted |
   | arbitrary pair `Sí` / `No` with answer among them | `201`, stored exactly |
   | `question_type: "boolean"` | `422`, stats unchanged |
   | the same payload with `question_type: "true_false"` after the `422` | `201`, stats show only that record |

4. **Multiple-choice explicit type and argument checks** — Covers A-10 to A-13.
5. **Browser default and multiple-choice submit** — load the shipped document, open `details`, verify
   `#q-type`, four editable rows, and a successful four-option submit through the stub. Covers F-01,
   F-11.
6. **Browser true/false transition** — prefill all rows, select a C radio, switch to true/false.
   Covers F-02.
7. **Browser true/false payload** — click each radio and capture the body. Covers F-03, F-04.
8. **Browser switch-back regression** — return to multiple choice, verify cleared fixed labels and
   four editable rows, type four values. Covers F-05.
9. **Browser success and reset** — stub `201`, verify category/confidence text and reset to
   multiple_choice. Covers F-06.
10. **Browser errors and no-radio submit** — stub `missing_fields` and `options_not_distinct` in both
    types, then submit with no radio. Covers F-07, F-08.
11. **Browser five-viewport sweep and exception check** — `320x568`, `360x640`, `390x844`, `844x390`,
    `1440x900`, plus media-query set. Covers F-09, F-10.
12. **Authored true/false game render** — stub the category endpoint with the two-option row, spin,
    and verify exactly two option buttons. Covers F-12.
13. **Human integration demo** — the path below.

## Negative controls (required)

| Mutated copy or baseline | Must fail |
|---|---|
| Remove the true/false branch from validation so all four options are required | A-01, A-02, A-03 |
| Store the submitted `option_c`/`option_d` for true/false instead of `NULL` | A-02 (row), A-04 (category fetch), A-15 (both reads) |
| Accept a `correct_answer` that is not one of the two true/false options | A-05 |
| Let a duplicate true/false question through | A-08 |
| Drop the four-option requirement for multiple choice | A-12 |
| Remove the `Literal` restriction and accept an unknown `question_type` | A-14 (the `422` half) |
| Leave C/D visible, focusable, or their radio checked in true/false mode | F-02 |
| Send the literal `"Verdadero"` regardless of the selected radio | F-03 (B radio) |
| Omit `question_type` from the frontend payload | F-04 |
| Leave the fixed A/B labels when returning to multiple choice | F-05 |
| Do not reset to multiple choice after a `201` | F-06 |
| Render the raw `detail` code, or keep the four-option wording in true/false | F-07 |
| Run the browser form script against the pre-change `frontend/index.html` (for example `git show HEAD:frontend/index.html` into a temporary copy passed with `--file`) | F-01, F-02, F-04 must fail; a green run means the check is not sensitive to the change |
| Run the new true/false API cases against the pre-change application | A-01 to A-03 must fail; a green run means the cases do not exercise the change |
| Remove the `true_false` branch from `syncAuthoringType()` | F-02, F-05 |

A check that finds no type selector, no option control, or no request body must fail its own
precondition rather than pass vacuously.

## Demo path (human integration test)

This is the end-to-end check that the browser, the API, and PostgreSQL agree. It is a named human
step, not something the automated checks above claim to cover.

1. **Preflight.** Run `docker compose up -d`; start the API on `localhost:8000`; confirm
   `GET /categories` and a category fetch respond. Open `http://localhost:8000/` in Chromium at
   `1440x900`.
2. **Default form.** On the start screen, expand **Agregar una pregunta**. Confirm `#q-type` is on
   multiple choice and four editable option fields are visible.
3. **True/false transition by hand.** Type text into C and D, select the C radio, then switch the
   type to true/false. Confirm A is `Verdadero`, B is `Falso`, both are read-only but still submitted,
   the C/D rows are hidden and their text is gone, and no radio is selected.
4. **Create a true/false question.** Select the `Falso` radio and save a uniquely worded question. The
   success message must name the category and confidence. Read the id from the message, use
   `GET /questions/{id}` to obtain its `category` slug, then check
   `GET /questions/category/{category}?limit=200`: `option_c` and `option_d` must be `null`,
   `answer` must be `Falso`, and the row must be the one just created.
5. **Persistence after reload.** Reload the start page and confirm the saved question is still
   returned by the category fetch.
6. **Return to multiple choice.** Switch back to multiple choice. A/B must be editable and empty, C/D
   must be visible and editable, and all four radios must be usable. Create a uniquely worded
   four-option question and confirm its category fetch has four non-null options.
7. **Duplicate and missing-field messages.** Save the true/false question text again: the form must
   show the duplicate message, keep the typed input, and not show success. Submit a multiple-choice
   question with a missing option and confirm the four-option missing-fields message. Submit a
   true/false question with no radio and confirm the two-option missing-fields message.
8. **Game render.** Start a match and use the authored true/false category until the question screen
   shows the authored row. Confirm exactly two options render and the correct-answer feedback works.
   If the authored row is not reached in the demo window, record that the API row was verified and
   that F-12 covers the two-option render path.
9. **Mobile.** At `320x568`, `360x640`, `390x844`, and `844x390` (desktop already at `1440x900`),
   open the authoring form, switch to true/false, select a radio, and save a uniquely worded question.
   No document scroll, no horizontal overflow, and every control must be reachable. Repeat the
   return to multiple choice and confirm four editable rows.
10. **Close-out.** Record the created ids, the category, the exact commands, the media-query set, and
    the browser console state. Any unexpected 4xx/5xx, console exception, or mismatch between the row
    and the category fetch is a bug for `dev` with the request body and response.

## Not tested, and why

- **No schema or migration test.** The change uses the already-nullable C/D columns; no schema or
  data migration is part of the proposal. A persisted `question_type` column would be a separate
  schema decision.
- **No concurrency test for duplicate detection.** The endpoint reads and then inserts; two
  simultaneous submissions of the same new text could both pass. That race is outside the local
  single-user demonstration scope.
- **No exact Spanish copy assertion beyond the option count.** F-07 machine-checks that true/false
  messages name two options and not four, and that multiple-choice messages name four; the final
  wording is the human's call at Gate C.
- **No cross-browser matrix and no real handset.** The browser checks use Chromium emulation at the
  five named viewports. The game targets a local Windows/Chromium demonstration.
- **No accessibility audit.** F-02 checks that hidden options are not rendered or focusable; it does
  not run a screen reader or a WCAG audit.
- **No load, throughput, or security testing.** There is no authentication, no remote client, and no
  performance criterion in this change.
- **No full gameplay/joker regression.** F-12 and the demo confirm only that the authored two-option
  row renders as two options; scoring, jokers, timers, and turn order are existing behavior outside
  this change.
