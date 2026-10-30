# Test plan — `restore-gemini-question-validation`

| | |
|---|---|
| Change | `restore-gemini-question-validation` |
| Branch (per AGENTS §2) | `feature/restore-gemini-question-validation` |
| Track | 2 (Full) — new route, new request-path dependency, new outbound service boundary, new secret, frontend flow |
| Capabilities | `ai-question-validation` (new), `question-authoring` (modified), `quality-toolchain` (modified) |
| Deltas under test | `openspec/changes/restore-gemini-question-validation/specs/ai-question-validation/spec.md`, `…/specs/question-authoring/spec.md`, `…/specs/quality-toolchain/spec.md`; reconciled against `proposal.md`, `design.md`, `tasks.md` |
| Surfaces under test | `app/ai_validation.py` (new), `app/main.py` (`POST /questions/validate`), `frontend/index.html` (`submitAuthoring`), `tests/conftest.py`, `tests/test_question_validation.py` (new), `tests/test_ai_validation.py` (new), `docker-compose.yml`, `pyproject.toml` / `poetry.lock` |
| Status | Reconciled plan, ready for Gate B. No dev work and no suite run before approval |

## Scope

**Included**

- `POST /questions/validate`: the `QuestionCreate` body, structural validation first, then the provider,
  then `200 {plausible, status, reasons}` with `plausible == (status == "valid")`.
- Structural codes and statuses unchanged: `400 missing_fields`, `400 options_not_distinct`,
  `400 answer_not_in_options`, `409 duplicate_question`; `422` for an unsupported `question_type`.
- Structural errors win over a missing or failing provider; a duplicate with no key is `409`, not `503`.
- `503 gemini_api_key_missing` (missing or blank key, before any provider call);
  `502 ai_provider_error` (every candidate failed, after one call per candidate).
- Model selection: `GEMINI_MODEL` first, then `gemini-3.5-flash`, `gemini-3.8-flash`,
  `gemini-flash-latest`, deduplicated; `retries=0`; 10 s per candidate; at most three attempts.
- Provider failure boundary: transport/DNS/TLS, timeout, HTTP error including quota and safety block,
  schema-invalid output including an out-of-enum `status`, and any build-or-run exception.
- Verdict normalization: strip and drop empty reasons, cap at 5, truncate each at 300 characters,
  fallback `La IA no explicó el veredicto.` when a non-`valid` verdict has no usable reason.
- The prompt: the five semantic checks, `true_false` rendered with A and B only, no category, and
  untrusted-input framing.
- No persistence, no categorization, no category in the response, no `distractors` key.
- The authoring form: one submit control, validate-then-save, the six-branch decision table, the exact
  copy, the in-flight copy, the button disabled across both requests, reset only on a save.
- The suite: faked at `_invoke_agent`, dummy key for the 200/502 paths, key removed for the 503 test,
  `_load_env` neutralized, unfaked calls guarded, egress guarded.
- The four declared quality gates plus the hermetic run and the Docker test service.

**Excluded**

- Distractor generation, option rewriting, or editing help.
- Model judgement of the category; any second categorization.
- Persisting, caching, or displaying verdicts after the save.
- Rate limiting, HTTP-layer retries, authentication of the endpoint.
- Any change to `POST /questions`, the schema, the migration path, or the game flow.
- A second submit control, a "save anyway" control, or a bypass that skips validation.
- A deterministic offline oracle for semantic quality (see L-01 and L-02).

## Environments and provisioning

| Environment | Provisioning and credential shape | Used by |
|---|---|---|
| Hermetic pytest (primary) | Poetry environment, Python 3.14.7, pytest 9 + pytest-cov, FastAPI `TestClient`, per-test in-memory SQLite (`tests/conftest.py`, `StaticPool`), real MLP from the shipped weights. Credential shape, per the frozen contract: `_load_env` is monkeypatched to a no-op, so the repo-root `.env` — which holds a live key on this machine — never enters the process; the autouse fixture sets `GEMINI_API_KEY="test-key"` for the tests that need a key; the 503 test deletes it for its own request; `_invoke_agent` is replaced with a raiser, so an unfaked call fails with `the AI provider must be faked in tests` before any request. A session-wide egress guard blocks outbound sockets, with a control test that proves it fires. Run from the repo root: `poetry run pytest …`. | A-01 to A-23, Q-01 to Q-09, Q-11 |
| Docker test service (independent check) | `docker compose --profile test run --rm tests`. The `test` stage copies `app`, `frontend`, `tests` only; task 1.2 passes `GEMINI_API_KEY`/`GEMINI_MODEL` to the `api` service only, so this service still receives neither. The suite supplies its own dummy. Same 80% bar. | Q-10 |
| Local API + PostgreSQL (demo and live probes) | PostgreSQL 15 via `docker compose up -d`; `docker compose up -d --build` for the API on `http://localhost:8000`, with `GEMINI_API_KEY` and `GEMINI_MODEL` supplied from the shell or Compose's `.env` (Compose interpolates `${GEMINI_API_KEY:-}` into the `api` service). Local Compose-shaped database URL `postgresql+psycopg2://admin:admin123@localhost:5432/questions_db`; local development credentials only. The key is never written to a committed file, a fixture, a log, or this plan. | Demo path, L-01, L-02 |
| Browser | Chromium (Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, honouring `CHROME_PATH`) headless over the DevTools Protocol, Node 24, modelled on `openspec/changes/archive/2026-10-29-support-true-false-authoring/checks/check_authoring_form.mjs`. `window.fetch` is stubbed per URL — `/questions/validate` and `/questions` answer from independent queues — so the form never persists and never calls a provider. Viewports `320x568`, `360x640`, `390x844`, `844x390`, `1440x900`. | F-01 to F-17 |
| Quality gates | The same local Poetry environment and Python 3.14.7, exact commands from `openspec/project.md`. | Q-01 to Q-04 |

**Pass/fail bar.** A case passes only when its command exits `0` and every assertion in it is true.
A skipped case, a selector that matched zero elements, an empty provider call log, an empty fetch
log, a guard that was never proven to fire, or an unavailable dependency is **BLOCKED**, never Pass.
Record command, exit code, expected, observed, and commit for every case. Every "not called" or "not
persisted" assertion names the positive control, in the same run, that proves the observable was
reachable.

## Frozen contract (resolved from proposal, design, and the three deltas)

1. **Verdict.** `200` with exactly `{plausible, status, reasons}`. `plausible` is computed by the route
   as `status == "valid"`; the model never supplies it, so they cannot disagree.
2. **Structural order.** `validate_question(payload, db)` first, provider second, including the key
   check. A duplicate with the key unset is `409`, not `503`.
3. **Provider errors.** Missing or blank key after structural validation → `503`
   `gemini_api_key_missing`, before any attempt. Every candidate failing → `502` `ai_provider_error`
   after one call per candidate, in configured order, deduplicated. Never downgraded to `uncertain`.
4. **Boundaries.** A failed attempt is transport/DNS/TLS, the 10 s timeout, an HTTP error (quota `429`,
   free-tier `503`), a safety block, schema-invalid output (out-of-enum `status`, non-list `reasons`,
   missing field), or any build-or-run exception. `retries=0`, at most three candidates.
5. **Reasons.** Empty `reasons` on a non-`valid` verdict is normalized to
   `La IA no explicó el veredicto.`, not treated as a failure. Strip, drop empty, cap at 5, truncate
   each at 300 characters. `valid` reasons may be empty.
6. **No writes.** No `Question`, no `Categorization`, no category, no `distractors` key. The route takes
   `db` but not the classifier.
7. **Prompt.** The frozen instruction block in `design.md` § Prompt; the user prompt is
   `Tipo/Pregunta/Opciones/Respuesta marcada como correcta`; `true_false` renders A and B only; the
   category is absent.
8. **Frontend.** One `.auth-submit` inside `#authoring-form`, one `#authoring-status`. In-flight copy
   `Verificando con IA…`. Decision table: `valid` saves with no note; `uncertain` saves with
   `La IA no pudo confirmarla. Motivos: {reasons}`; `implausible` blocks with
   `La IA marcó la pregunta como implausible: {reasons}`; `502`/`503` save with
   `No se pudo verificar con IA; se guardó igual.`; `400`/`409`/other block with
   `authoringMessage(status, detail, type)`; a fetch exception blocks with
   `No se pudo contactar al servidor. Verificá la conexión.`
9. **Test seam.** `app.ai_validation._invoke_agent(agent, prompt)`. It sits below `get_api_key` and
   below `_model_candidates`, so the 503 path is real code, the 502 path is the real loop, and the
   rendered prompt is observable. `_build_agent` still runs.
10. **Success text.** `Pregunta agregada (#{id}) en {label} ({confidence}% de confianza).{note}`;
    `form.reset()` and `syncAuthoringType()` only on a save.

## Scenario coverage — every delta scenario

Every scenario in the three deltas appears below. Check IDs are defined in the next section.

### `ai-question-validation` — Requirement: Semantic validation endpoint

| Scenario (delta) | Checks |
|---|---|
| A valid multiple-choice question | A-01, A-05 |
| An implausible question blocks on the verdict and explains why | A-02, A-05, F-02 |
| An uncertain verdict is distinguishable from both other verdicts | A-03, A-05, F-03 |
| Irrelevant options are flagged | **L-01** (live only) |
| A false statement marked true is implausible | **L-02** (live only) |
| Both question types are accepted | A-04, A-17 |

### `ai-question-validation` — Requirement: Structural validation precedes the provider

| Scenario (delta) | Checks |
|---|---|
| Structural codes are unchanged | A-06, A-20 |
| A duplicate is rejected without a provider call | A-07 |
| Structural errors from the validator block the save | F-06, F-07 |

### `ai-question-validation` — Requirement: Provider configuration and failure mapping

| Scenario (delta) | Checks |
|---|---|
| Missing key returns 503 and never calls the provider | A-08, Q-07 |
| Every model failing returns 502 | A-09, A-23 |
| The configured model is tried first | A-10 |
| An unusable model response falls back rather than becoming a verdict | A-11, A-13 |
| The key never leaves the process | A-12, Q-11 |

### `question-authoring` — Requirement: User can add a question from the start screen

| Scenario (delta) | Checks |
|---|---|
| Adding a valid question | A-21, F-01 |
| Rejecting invalid question | A-06, A-21 |
| Adding a valid true/false question | A-04, A-21 |
| A true/false record has no options C or D | A-21 |
| A true/false answer must be one of its two options | A-06, A-21 |
| A true/false question requires both options | A-06, A-21 |
| A true/false question requires two distinct options | A-06, A-21 |
| Multiple-choice validation and error codes are unchanged | A-06, A-21 |
| An unsupported question type is rejected without persisting | A-20, A-21 |
| Multiple choice is the default and behaves as before | F-16 |
| Selecting true/false fixes the two options | F-16 |
| A true/false submission carries the type and the two options | F-12, F-16 |
| Returning to multiple choice restores the four-option form | F-16 |
| Error copy matches the selected type | F-06, F-16 |
| True/false authoring is usable on a phone and adds no breakpoint | F-14, F-16 |
| A valid verdict saves in one submit | F-01, F-17, A-21 |
| An implausible verdict blocks the save and shows the reasons | F-02, F-17, A-05 |
| An uncertain verdict saves with a note | F-03, F-17 |
| An unavailable validator saves with a note | F-04, F-05, F-17 |
| Both question types follow the same verdict rules | F-09 |
| The form has no unverified save path | F-10, F-15 |

### `quality-toolchain` — Requirements: Automated behavioral test suite; API contract coverage

| Scenario (delta) | Checks |
|---|---|
| Suite runs green on the current tree | Q-05 |
| Suite is hermetic | Q-06, Q-09, Q-11 |
| The fake sits below the key check | Q-07, A-08 |
| An unfaked call fails instead of reaching the network | Q-08 |
| Coverage bar is enforced | Q-01 |
| Validation codes are asserted | A-06, A-07, Q-01 |
| AI failure codes and verdicts are asserted | A-01, A-02, A-03, A-05, A-08, A-09 |

## Criteria → checks

### API checks

HTTP-contract cases live in `tests/test_question_validation.py`; unit cases in
`tests/test_ai_validation.py`. Names in the design's table are quoted exactly; cases the design does
not name are marked **new** and the dev records the real function name in the PR so QA runs the same
case. Every API case fakes `_invoke_agent`; none reaches the network.

| ID | Scenario / contract point | Check (instrument) | Pass bar |
|---|---|---|---|
| A-01 | A valid multiple-choice question | `test_validate_returns_a_valid_verdict` — fake returns `SubmitVerdict(status="valid", reasons=[])` | `200`; `set(body) == {"plausible","status","reasons"}`; `body["plausible"] is True`; `status == "valid"`; `reasons == []`; `GET /categories/stats` totals identical before/after; no `distractors`, `category`, `id`, or model name |
| A-02 | An implausible question blocks on the verdict | `test_validate_returns_implausible_reasons` — fake returns one reason | `200`; `plausible is False`; `status == "implausible"`; the reason text is echoed unchanged; counts unchanged. Positive control for "not just a blanket implausible": A-01 in the same file |
| A-03 | An uncertain verdict is distinguishable from both others | `test_validate_returns_uncertain` | `200`; `plausible is False`; `status == "uncertain"`; `len(reasons) >= 1`; counts unchanged |
| A-04 | Both question types are accepted | `test_validate_accepts_true_false` — one four-option and one `true_false` payload, fake `valid` | both `200` with the three-key body; the true/false call is evaluated on A and B only (see A-17) |
| A-05 | No persistence, no categorization (every verdict and failure) | `test_validate_never_persists` — run all five outcomes (valid, implausible, uncertain, 503, 502) and compare `GET /categories/stats` and direct `Question`/`Categorization` counts | every counter identical for every outcome; no row, no categorization; the positive control is A-21, where `POST /questions` does increment the count |
| A-06 | Structural codes are unchanged | `test_validate_requires_the_structural_fields` — one payload per rule, plus A-21's matrix | `400` with `missing_fields`, `400 options_not_distinct`, `400 answer_not_in_options`; no verdict body; appliable to both types; the fake is not called |
| A-07 | A duplicate is rejected without a provider call | `test_validate_rejects_a_duplicate_before_the_provider` — seeded question, dummy key **removed** | `409`, `detail == "duplicate_question"`; **not** `503`/`502`; the fake is not invoked (it would raise `AssertionError` if it were) |
| A-08 | Missing key returns 503 and never calls the provider | `test_validate_requires_an_api_key` — remove the dummy key for one request; also blank `"   "` | `503`, `detail == "gemini_api_key_missing"`; no verdict keys; the fake not invoked. Positive control in the same case: restore the key and the same payload reaches the fake — without it, the zero-call assertion passes in a build that never calls the provider |
| A-09 | Every model failing returns 502 | `test_validate_maps_a_provider_failure` — fake raises for every candidate | `502`, `detail == "ai_provider_error"`; `plausible`/`status`/`reasons` absent; the fake called exactly `len(_model_candidates())` times, in order; no key fragment, no exception text |
| A-10 | The configured model is tried first | **new** unit case in `tests/test_ai_validation.py` — `_model_candidates()` with `GEMINI_MODEL` set, unset, and set to a fallback name | configured name first; no duplicates; unset gives exactly `["gemini-3.5-flash","gemini-3.8-flash","gemini-flash-latest"]`; a configured duplicate is not repeated |
| A-11 | An unusable response falls back | **new** route case — the fake raises for candidate 1 and returns a verdict for candidate 2 | `200` with the later verdict; exactly two calls; the body does not name the model |
| A-12 | The key never leaves the process | `test_validate_does_not_echo_the_key` — set a distinctive key value | that value is absent from the `200`, `502`, and `503` bodies; each `detail` is the stable code; the key is absent from the stderr/log line of the request |
| A-13 | Schema-invalid output is an attempt failure | **new** unit case — out-of-enum `status`, non-list `reasons`, missing `status`, and a raised `ValidationError` from the agent | each raises, each falls through to the next candidate; none is turned into a `200` verdict |
| A-14 | Empty reasons on a non-valid verdict | **new** unit case — `implausible` with `[]`, `[""]`, and `["  "]` | `["La IA no explicó el veredicto."]`; status unchanged; `valid` with `[]` stays `[]` |
| A-15 | Reason normalization | **new** unit case — six reasons, one blank, one 400 characters, surrounding whitespace | at most 5; blanks dropped; each `<= 300` characters; trimmed; order preserved |
| A-16 | The five checks reach the model | `test_instructions_pin_the_five_checks` | the instruction template contains one clause for clarity, one for option relevance, one for distractor quality, one for answer correctness, one for true/false truth; and the untrusted-data sentence |
| A-17 | The rendered prompt carries the payload, type-appropriately | asserted inside `test_validate_accepts_true_false` | the prompt contains the normalized question, each option, and the marked answer; for `true_false` it contains `Verdadero`/`Falso` and **not** the submitted C/D values; for `multiple_choice` it contains all four; the category never appears |
| A-18 | The prompt is built from normalized fields | **new** case — a payload with surrounding whitespace and blank C/D for a true/false question | the prompt carries the trimmed text (identical to what `POST /questions` stores), not the raw body; no `category` key or value |
| A-19 | Error body shape | **new** case — `400`, `409`, `502`, `503` | body is exactly `{"detail": "<slug>"}`; no provider exception text, URL, key, or traceback |
| A-20 | Unsupported `question_type` | **new** case — `question_type: "boolean"`, then `true_false` | `422` on the first, and the fake is not called; `200` on the second, proving the text is validatable and that the endpoint is not rejecting everything |
| A-21 | `POST /questions` unchanged, and it is still the save | the existing `tests/test_authoring.py`, untouched; then validate and save the same payload | existing suite green, including the `missing_fields`, `options_not_distinct`, `answer_not_in_options`, `duplicate_question`, true/false C/D, and `422` cases; save is `201` with exactly `{id, category, confidence_score}`; the MLP's category is stored and served |
| A-22 | Validate does not make the text a duplicate | **new** case — validate the same text twice | both reach the fake and return `200`; then the first `POST /questions` is `201` and a second is `409` — the positive control that the duplicate rule is alive and that validate wrote nothing |
| A-23 | Bounded attempts | **new** unit case — capture the `Agent(...)` and provider arguments built by `_build_agent` | `retries == 0`; the client timeout is 10 s; the candidate list is at most three and unique; with the fake raising, the loop stops after `len(_model_candidates())` attempts and does not retry |

### Frontend checks

Runner: `openspec/changes/restore-gemini-question-validation/checks/check_validate_flow.mjs` — Node 24,
Chromium over CDP, same harness as `check_authoring_form.mjs`. It serves the shipped
`frontend/index.html` (or a `--file` copy), opens `details#authoring`, stubs `window.fetch` with
independent response queues for `/questions/validate` and `/questions`, records `{url, body, order}`
for every call, subscribes to `window.onerror` and `unhandledrejection`, and reads the real
`#authoring-form`, `.auth-submit`, `#authoring-status`, `#q-type`, `#q-question`, `#q-option-a`,
`#q-option-b`, `#q-option-c`, `#q-option-d`, `#correct-a`, `#correct-b`, `#correct-c`, `#correct-d`,
`#option-row-c`, `#option-row-d`, and `#screen-start`. No id is invented here.

| ID | Scenario / contract point | Check | Pass bar |
|---|---|---|---|
| F-01 | A valid verdict saves in one submit | one multiple-choice payload; validate `200 {plausible:true,status:"valid",reasons:[]}`, save `201 {id:999,category:"arte",confidence_score:0.9}` | request log exactly `["/questions/validate","/questions"]`; **1** of each; the two JSON bodies are deep-equal; the status contains `Pregunta agregada (#999)` and `Arte y Cultura` and `90%`; it contains **none** of `La IA pudo`, `La IA no pudo`, `No se pudo verificar con IA`, `implausible`; the status carries the success class |
| F-02 | An implausible verdict blocks and shows the reasons | validate `200 {plausible:false,status:"implausible",reasons:["La respuesta marcada es incorrecta."]}` | exactly **1** request total (**0** saves); status text starts with `La IA marcó la pregunta como implausible: ` and contains the reason verbatim; it does not contain `Pregunta agregada`; inputs keep their values; `.auth-submit` is enabled again; no reset |
| F-03 | An uncertain verdict saves with a note | validate `200 {plausible:false,status:"uncertain",reasons:["r1","r2"]}`; save `201` | 2 requests in order; status contains `Pregunta agregada (#999)`, the note `La IA no pudo confirmarla.`, ` Motivos: `, and both reasons joined by a space; it does **not** contain `No se pudo verificar con IA`; reset happened |
| F-04 | An unavailable validator saves with a note — 502 | validate `502 {detail:"ai_provider_error"}`; save `201` | 2 requests in order; status contains `Pregunta agregada (#999)` and `No se pudo verificar con IA; se guardó igual.`; it does **not** contain `ai_provider_error`, `La IA no pudo`, or an error class; reset happened |
| F-05 | An unavailable validator saves with a note — 503 | validate `503 {detail:"gemini_api_key_missing"}`; save `201` | identical to F-04, with the same note; `gemini_api_key_missing` is never shown; one saved request; reset happened |
| F-06 | Structural errors from the validator block the save; error copy matches the type | validate `400 {detail:"missing_fields"}` in `true_false` and in `multiple_choice`; then `400 {detail:"options_not_distinct"}` in both | 1 request each, **0** saves; true/false copy names two options and not four, multiple-choice names four; the raw `detail` code is not rendered; inputs preserved; no reset |
| F-07 | A validator `409` blocks the save | validate `409 {detail:"duplicate_question"}` | 1 request; 0 saves; status contains `Ya existe una pregunta igual.`; no success text; no reset |
| F-08 | A validate fetch rejection blocks | make the validate fetch reject, and separately return a non-JSON body | 1 attempted validate; 0 saves; status contains `No se pudo contactar al servidor. Verificá la conexión.`; no uncaught exception; submit enabled again |
| F-09 | Both question types follow the same verdict rules | `true_false` state with `Falso` marked, run implausible, then uncertain, then valid; repeat the three-run sequence in `multiple_choice` | block, save, save in each type; each validate body carries the selected `question_type`, `Verdadero`/`Falso` and empty C/D for true/false; per-run save counts are 0, 1, 1 |
| F-10 | The form has no unverified save path | inspect and drive `#authoring-form`; hold the validate response and press submit again; then simulate a click on every control in the form | exactly **1** `.auth-submit` inside `#authoring-form`; no control, shortcut, or state produces a `/questions` call before a `/questions/validate` response; a second press while the button is disabled adds no request; `Enter` in a field does not bypass the flow |
| F-11 | The in-flight copy | hold the validate response open, read the status | `#authoring-status` text is exactly `Verificando con IA…` and `.auth-submit.disabled === true` while the request is in flight; the button is re-enabled on every terminal branch (F-02 to F-08) |
| F-12 | The payload is complete and identical in both calls | `true_false` and `multiple_choice` submissions | each body has exactly `question`, `question_type`, `option_a`–`option_d`, `correct_answer`; true/false sends `Verdadero`/`Falso`, empty C/D, and the checked answer; multiple choice sends all four typed options and the checked answer; the validate body and save body are deep-equal |
| F-13 | No uncaught exception on any branch | `window.onerror` + `unhandledrejection` across F-01 to F-12 | **0** uncaught exceptions; no duplicated request from a double-bound handler; exactly one validate per submit and at most one save |
| F-14 | Mobile and no new breakpoint | F-02, F-04, and F-16 at `320x568`, `360x640`, `390x844`, `844x390`, `1440x900` | the form, type selector, option fields, radios, submit control, and the status text are reachable (inside the viewport or the panel's scroll range); `documentElement.scrollWidth <= clientWidth + 1`; `scrollHeight <= innerHeight`; the notes wrap inside `#authoring-status` without clipping; the stylesheet's media queries are exactly `768px`, `1024px`, `640px` — no fourth |
| F-15 | The check reads the shipped document | preconditions before interacting; then run the flow against `git show HEAD:frontend/index.html` in a temp file | `#authoring-form`, `.auth-submit`, `#authoring-status`, `#q-type`, and the four option rows exist; the shipped document issues `/questions/validate` first (proved by F-01); the pre-change document **fails** F-01 and F-02 |
| F-16 | Existing form behavior unchanged | the archived check's assertions, re-run on the shipped document: default state, true/false transition, switch-back, one control | `#q-type` is `multiple_choice` with four visible editable rows and four visible radios; switching to `true_false` sets `Verdadero`/`Falso`, `readOnly === true` and `disabled === false`, hides and clears C/D, clears a C/D radio, leaves A/B selectable; switching back restores four editable rows and clears the fixed labels; exactly one `.auth-submit` |
| F-17 | Reset only on a save | one run per branch, checking the form state after the status settles | after F-01, F-03, F-04, F-05: `#q-type` is `multiple_choice`, four rows visible and empty, no radio checked; after F-02, F-06, F-07, F-08: the typed values and the checked radio are still there |

### Quality gates

| ID | Scenario / gate | Command or instrument | Pass bar |
|---|---|---|---|
| Q-01 | Coverage bar is enforced | `poetry run pytest --cov=app --cov-fail-under=80` | exit `0`; no failures, errors, or new skips; statements `>= 80%` |
| Q-02 | Lint | `poetry run ruff check .` | exit `0`; 0 findings |
| Q-03 | Format | `poetry run ruff format --check .` | exit `0`; nothing would be reformatted |
| Q-04 | Types | `poetry run mypy app` | exit `0`; 0 errors |
| Q-05 | Suite runs green on the current tree | `poetry run pytest` | exit `0`; every test discovered and executed |
| Q-06 | Suite is hermetic | `GEMINI_API_KEY` unset in the shell and the development database stopped; then `poetry run pytest` | exit `0`; the autouse dummy supplies the key where needed; the 503 test still removes it for its own request; nothing skipped because of the absence |
| Q-07 | The fake sits below the key check | A-08's instrument, read as a quality case: fake installed, key removed | `503`; the fake not invoked; with the key restored the fake is invoked — the two directions in one test |
| Q-08 | An unfaked call fails instead of reaching the network | **mutation**, per the delta: disable the autouse `no_real_ai_provider` fixture for one validation test and run it | that test fails with `the AI provider must be faked in tests`, before any request; it does not hang and does not reach Google; the failure names the fake. Dev records the observed red in the PR |
| Q-09 | Egress guard and its control | a session-wide autouse fixture replaces `socket.socket.connect`/`connect_ex` and `socket.create_connection` with a raiser; plus a control test that calls `socket.create_connection(("example.com", 443))` | the whole suite exits `0` under the guard; the control **raises** under the guard — without it the guard proves nothing; no test opts out |
| Q-10 | The declared one test command | `docker compose --profile test run --rm tests` | exit `0`; 80% bar met; no `.env` in the image and no key in the `tests` service |
| Q-11 | No real key enters the suite | assert `ai_validation.get_api_key() == "test-key"` under the autouse fixture, and run the A-12 leak test with a distinctive value | the effective key is the dummy; the repo `.env` value never appears in any body, environment read, or log; `_load_env` is a no-op for the session |

### Live probes (real key, recorded evidence)

These two delta scenarios are declared as live verifications in the spec itself: the suite fakes the
provider, so it cannot assert what the model judges. They are QA runs with a real key, recorded in the
change's evidence, not automated cases.

| ID | Scenario (delta) | Procedure | Pass bar |
|---|---|---|---|
| L-01 | Irrelevant options are flagged | `POST /questions/validate` with a clear question and four options unrelated to it, against the real provider | `status == "implausible"`; at least one reason refers to the options or the distractors; the response body is recorded |
| L-02 | A false statement marked true is implausible | a `true_false` payload whose statement is false and whose `correct_answer` is `Verdadero`; then the same statement with `Falso` | first is `implausible` with a reason about the truth value; second is `valid` (the positive control); both bodies recorded |

## Measurable bars and their instruments

| Bar | Instrument |
|---|---|
| Verdict shape: exactly three keys; `plausible == (status == "valid")` | A-01, A-02, A-03 |
| Provider calls: 0 on structural failure and missing key; 1 per candidate on failure; 1 on a verdict | A-07, A-08, A-09, A-11, Q-07 |
| Attempts bounded: at most 3 unique candidates, `retries=0`, 10 s client timeout | A-10, A-23; the ~30 s wall-clock bound follows from these two and is not measured (see Not tested) |
| Reasons: `>= 1` when `status != "valid"`; `<= 5`; each `<= 300` chars; fallback sentence exact | A-14, A-15, A-02, A-03 |
| No writes | A-05, A-22 |
| No key in any body or log | A-12, Q-11 |
| Frontend request counts and order | F-01 to F-13 fetch log |
| Exact copy per branch | F-01 to F-08 substring assertions; the absence in F-01 is controlled by F-03/F-04/F-05 where the same strings are present |
| Breakpoint set unchanged | F-14 |
| Zero egress | Q-09, with the control proving the guard fires |
| Coverage 80% of statements | Q-01, exit code |

## Entry and exit criteria

**Entry**

- The three deltas exist, `openspec validate restore-gemini-question-validation --strict` exits `0`,
  and this plan is approved at Gate B.
- `poetry install` has completed with `pydantic-ai-slim[google]` locked; the dev has confirmed the
  constructor arguments listed under `design.md` § Assumptions.
- `tests/conftest.py` provides the autouse pair (`ai_env`, `no_real_ai_provider`), the `fake_verdict`
  helper, and the egress guard with its control.
- The baseline suite and the four gates are green before the change, or pre-existing failures are
  recorded by name.
- For browser and live cases: PostgreSQL healthy, dataset loaded, `GET /categories` answers, and a
  working key for L-01/L-02; no key in any recorded artifact.
- Unique question texts (timestamp or UUID suffix) are prepared for live saves.

**Exit**

- Every A, F, Q, and L case has a recorded Pass, or a bug with reproduction and severity. Anything not
  run is named as not run.
- Q-01 to Q-11 all exit `0`; coverage at or above the bar; Q-08's mutation is demonstrated and pasted.
- Every delta scenario is covered by the table above, and L-01/L-02 have recorded bodies.
- The demo path is completed on desktop and mobile.
- No uncaught browser exception; no unexplained skip.
- `openspec validate restore-gemini-question-validation --strict` still exits `0`.

## Initial test cases (execution order)

1. **Baseline** — the existing `tests/test_authoring.py`, `tests/test_questions.py`, `tests/test_unit.py`,
   and Q-01 to Q-04, before any new case is trusted. Covers A-21, Q-01 to Q-04.
2. **Hermeticity** — Q-06, Q-09 (with its control), Q-11, Q-10, then Q-08's mutation. Covers the
   `quality-toolchain` deltas except Q-07.
3. **Unit seam** — `tests/test_ai_validation.py`: candidates and dedupe (A-10), fallback loop and call
   count (A-09, A-23), schema-invalid output (A-13), reason normalization (A-14, A-15), prompt pin
   (A-16), key check (A-08's unit half). Run before the route cases so a failure points at the module.
4. **Verdict matrix** — the three fakes on a structural-valid multiple-choice payload. Covers A-01 to
   A-03 and A-05.
5. **Both types and the prompt** — `true_false` and `multiple_choice`, prompt contents, normalized
   fields, no category. Covers A-04, A-17, A-18.
6. **Ordering** — structural matrix, duplicate with the key removed, `422`, and the twice-validated
   payload. Covers A-06, A-07, A-20, A-22.
7. **Failure mapping** — missing key with the positive control, all-candidates-failed, fallback after
   an unusable first output, error body shape, key leakage. Covers A-08, A-09, A-11, A-12, A-19.
8. **Browser valid and in-flight** — request order, body identity, success copy with no note, reset,
   `Verificando con IA…`, disabled button. Covers F-01, F-10, F-11, F-12, F-17.
9. **Browser verdict branches** — implausible, uncertain, 502, 503, with the exact copy. Covers F-02 to
   F-05, F-17.
10. **Browser error and transport branches** — `400` in both types, `409`, fetch rejection, non-JSON.
    Covers F-06 to F-08, F-13.
11. **Browser both types and regression** — true/false × implausible/uncertain/valid; then the existing
    form assertions. Covers F-09, F-16.
12. **Browser shipped-document control and mobile** — F-15 against the pre-change document, then the
    five-viewport sweep. Covers F-14, F-15.
13. **Live probes** — L-01, L-02, with a real key; record the bodies.
14. **Human demo** — the path below.

## Negative controls (required)

Each is applied to a throwaway copy, the named check is run, and the observed failure is recorded in
the PR. A mutation that leaves its check green means the check does not exercise the change.

| Mutated copy | Must fail |
|---|---|
| Return a fixed `valid` verdict without calling the provider | A-02, A-03 |
| Compute `plausible` as `True` always | A-03 (and A-02) |
| Move the provider call above `validate_question` | A-07 (a `503` instead of `409`) |
| Save on `status == "implausible"` in the form | F-02, F-17 |
| Remove the `/questions/validate` call and save directly | F-01, F-02, F-10 |
| Drop the true/false context from the rendered prompt (type, or the two-option set) | A-04, A-17, F-09 |
| Show the plain success on `502`/`503` (no note) | F-04, F-05 |
| Show the uncertain note on `502` | F-04 |
| Persist the question inside validate | A-05, A-22 |
| Return `503`/`502` before the structural check | A-06, A-07 |
| Echo the provider exception or key in `detail` | A-12, A-19 |
| Add `id`, `category`, `confidence_score`, or `distractors` to the verdict | A-01, A-04 |
| Skip reason normalization (keep blanks, exceed 5, exceed 300) | A-14, A-15 |
| Leave `reasons` empty on `implausible` | A-14, A-02 |
| Remove `retries=0` or the 10 s timeout | A-23 |
| Try only one candidate | A-09 (call count) |
| Remove the autouse `no_real_ai_provider` fixture | Q-08 |
| Remove the egress guard's control test | Q-09 (the case becomes unproven, not green) |
| Read the key at import time instead of per request | A-08, Q-06, Q-11 |
| Run the A cases against the pre-change application | all A cases (404 on the route) |
| Run the F flow against `git show HEAD:frontend/index.html` | F-01, F-02 (F-15) |

## Demo path (human integration test)

The end-to-end check that browser, API, PostgreSQL, and the real provider agree. Steps 5 and 6 are
also L-01 and L-02.

1. **Preflight.** `docker compose up -d --build` with `GEMINI_API_KEY` supplied to the `api` service;
   confirm `GET /categories` and a category fetch answer; open `http://localhost:8000/` at `1440x900`.
   Confirm `GET /docs` lists `POST /questions/validate`.
2. **Valid.** Expand **Agregar una pregunta**. Submit a plainly true multiple-choice question with four
   real options and the correct one marked. The status must show `Verificando con IA…`, then
   `Pregunta agregada (#… ) en … (…% de confianza).` with no AI note. The form must reset to multiple
   choice. Confirm the row and its category fetch.
3. **Implausible.** Submit a question whose marked answer is obviously wrong. The form must **not** save
   and must show `La IA marcó la pregunta como implausible: ` followed by the reasons. `GET
   /categories/stats` must be unchanged; the typed values must still be there.
4. **Uncertain, if reached.** Submit an ambiguous question. If the verdict is `uncertain`, the save must
   succeed and the status must carry `La IA no pudo confirmarla. Motivos: …`. If the live model returns
   `valid` or `implausible`, record which verdict occurred and note that F-03 covers the branch
   deterministically.
5. **L-01 — unrelated options.** Submit a clear question with four unrelated options. Expect
   `implausible` with a reason about the options. Record the body.
6. **L-02 — true/false truth value.** Submit a false statement marked `Verdadero`; expect
   `implausible` with a reason about the statement's truth. Then mark `Falso` on the same statement;
   expect `valid`. Record both bodies.
7. **Missing key.** Start the API with `GEMINI_API_KEY` unset. A valid submission must save and show
   `No se pudo verificar con IA; se guardó igual.`; a direct `POST /questions/validate` must be `503`
   `gemini_api_key_missing`. Confirm neither code appears in the form.
8. **Provider error.** Start with a syntactically valid but revoked key. A direct call must be `502`
   `ai_provider_error`; the form must save with the same note. Confirm the response contains no key
   fragment.
9. **Structural and transport.** Submit a duplicate (the form must show `Ya existe una pregunta
   igual.` and save nothing), a missing option in each type (the type-aware copy), and stop the API to
   confirm `No se pudo contactar al servidor. Verificá la conexión.`
10. **Mobile.** At `320x568`, `360x640`, `390x844`, and `844x390`, submit one implausible and one valid
    question. The reasons and the note must wrap inside `#authoring-status`; no page scroll, no
    horizontal overflow, no new breakpoint; the true/false rows must still behave.
11. **Regression.** Start a match, play one multiple-choice turn and one true/false turn, and confirm
    `POST /questions` still returns `201` with `{id, category, confidence_score}`.
12. **Close-out.** Record the created ids, the verdicts observed, the exact commands, and the console
    state. Any unexpected `4xx`/`5xx`, console exception, or mismatch between the success text and the
    stored row is a bug for `dev` with the request body and the response.

## Not tested, and why

- **The 30-second wall clock.** The bound follows from three candidates × a 10 s client timeout, and
  A-10/A-23 assert those two facts, but no case holds a provider open for 10 s. Measuring it needs a
  slow fake clock, which would test the framework's timer rather than this route.
- **Whether Gemini's verdicts are semantically right beyond L-01/L-02.** There is no labelled corpus,
  so no accuracy bar exists. L-01 and L-02 are single recorded probes with positive controls, not a
  measurement. The automated cases prove the plumbing, not the judgement.
- **Provider-side model drift.** `GEMINI_MODEL` selects the model; a provider-side update can change
  verdicts with no code change. Detecting that needs the corpus above.
- **Prompt injection.** The question text reaches the model. The design mitigates it with the
  untrusted-data instruction and a schema-constrained output, and the verdict can at worst be wrong;
  no criterion measures resistance, and the route persists nothing that an injection could corrupt.
- **A false `implausible` with no override.** The form blocks and the author must reword. That is the
  approved rule, so the tests assert the block; whether it is acceptable UX is the human's call.
- **Concurrent duplicate submissions.** The duplicate check is read-then-insert, unchanged; two
  simultaneous validates can both pass, and a save-time `409` is still possible. The design accepts it
  and the existing copy handles it.
- **Database outage during the duplicate check.** The existing `500` path, unchanged; no criterion.
- **The final Spanish wording beyond the frozen strings.** F-01 to F-08 assert the design's exact
  substrings. F-14 asserts only reachability and wrapping. Prose outside those strings is a Gate C
  judgement.
- **Cross-browser, real handset, screen reader, WCAG audit.** Chromium emulation at the five named
  viewports only.
- **Load, cost, and rate limiting.** No rate limit is added; the endpoint inherits the local-only,
  unauthenticated boundary. Denial-of-cost is out of scope by the proposal.
- **Full gameplay regression.** A-21 and the demo check the save and two turns; scoring, jokers,
  timers, and the wheel are untouched.

## Task traceability

| Task | Checks |
|---|---|
| 1.1 dependency, lock, install | Q-01, Q-05, A-23 |
| 1.2 Compose passthrough | Q-10, demo step 7 |
| 2.1 `app/ai_validation.py` | A-10, A-13, A-14, A-15, A-16, A-17, A-23 |
| 2.2 `tests/test_ai_validation.py` | A-09 (unit half), A-10, A-13, A-14, A-15, A-16, A-23, Q-02 to Q-04 |
| 3.1 route | A-01 to A-09, A-11, A-12, A-17 to A-22 |
| 3.2 fixtures and `tests/test_question_validation.py` | A-01 to A-09, A-11, A-12, A-21, A-22, Q-06 to Q-09, Q-11 |
| 3.3 full gate | Q-01 to Q-04 |
| 4.1 `submitAuthoring` | F-01 to F-12, F-17 |
| 4.2 script parses, one `.auth-submit` | F-10 |
| 4.3 six branches in a browser, both types, two viewports | F-01 to F-09, F-13, F-14, F-16 |
| 5.1 `openspec/project.md` alignment | gate evidence; no check of its own |
| 5.2 `ADR-005` | gate evidence; no check of its own |
| 6.1 Docker test service | Q-10 |
| 6.2 live probes | L-01, L-02, demo steps 2 to 6 |
| 6.3 failure paths | A-08, A-09, A-12, demo steps 7 and 8 |
| 6.4 regression | A-21, demo step 11 |
| 6.5 mutations | the negative-control table, all rows |
| 6.6 `openspec validate --strict` | entry and exit |

## Notes for the dev

- **Copy join.** The success template ends `…de confianza).{note}` while the note strings carry no
  leading space, so as written the rendered text runs the sentence and the note together. The checks
  assert the note as a substring and will pass either way; add the separator the human approves rather
  than letting the copy ship glued.
- **`valid` reasons may be empty.** A-01 asserts `[]`, not "non-empty", because the delta only
  requires a reason when the status is not `valid`.
- **The 502 case must assert the call count.** Without it, a single-attempt implementation passes.
  A-09 and A-23 are the pair.
- **The 503 case must assert the positive control.** With the key restored, the same payload reaches
  the fake. Without it, a route that never calls the provider passes the zero-call assertion.
- **Read the key per request.** `get_api_key` must run inside `_run`, not at import, or A-08 cannot
  remove it for one request.
