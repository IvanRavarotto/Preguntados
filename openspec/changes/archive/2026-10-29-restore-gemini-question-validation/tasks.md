# Tasks

One branch, one PR: `feature/restore-gemini-question-validation`. Each section leaves the tree green
and the suite hermetic. Tests ship with the step that introduces the behavior, not in a final step.

## 1. Dependency and configuration

- [x] 1.1 Add `"pydantic-ai-slim[google] (>=2.56.0,<3.0.0)"` to `[project].dependencies` in
      `pyproject.toml`, run `poetry lock` and `poetry install`, and commit `pyproject.toml` and
      `poetry.lock`. Confirm the resolved `google-genai` and `httpx2` versions. `poetry run pytest`
      must still pass unchanged.
- [x] 1.2 Pass the provider configuration into the container. In `docker-compose.yml`, under the `api`
      service's `environment`, add `GEMINI_API_KEY: ${GEMINI_API_KEY:-}` and
      `GEMINI_MODEL: ${GEMINI_MODEL:-}`. No Dockerfile change. `docker compose config` shows both keys.
      With no `.env`, they resolve to empty and the API behaves as unconfigured.

## 2. The validation service

- [x] 2.1 Create `app/ai_validation.py` with the constants, `_load_env`, `get_api_key`,
      `get_model_name`, `_model_candidates`, `_build_agent`, `_invoke_agent`, `_run`,
      `AIValidationError`, `SubmitVerdict`, the prompt renderer, and `validate_question_content`, as
      specified in `design.md` § Frozen contract and § Prompt. Delete the distractor path; do not port
      it. Keep the Gemini imports inside `_build_agent`.
- [x] 2.2 Add `tests/test_ai_validation.py` at the unit level: `_model_candidates` order and dedupe
      with and without `GEMINI_MODEL`; `get_api_key` raising 503 on unset and blank; `_run` mapping a
      fake failure to 502 after one call per candidate; `_run` returning the first valid output;
      reason normalization (empty reasons on `implausible` become the fallback sentence, more than five
      are capped), and a prompt-content pin that the frozen instruction keeps one clause per semantic
      check. These tests fake `_invoke_agent` and touch no network. `poetry run pytest`,
      `poetry run ruff check .`, `poetry run ruff format --check .`, and `poetry run mypy app` stay
      green.

## 3. The route

- [x] 3.1 Add `POST /questions/validate` to `app/main.py` exactly as sketched in `design.md`: body
      `QuestionCreate`, `db` dependency, `validate_question` first, then
      `validate_question_content`, two `except` clauses, response `{plausible, status, reasons}`. No
      classifier dependency, no persistence, no category.
- [x] 3.2 Add the autouse fixtures and the `fake_verdict` helper to `tests/conftest.py`. The fixtures
      neutralize `app.ai_validation._load_env` (the repo-root `.env` holds a live key on the dev
      machine), set a dummy `GEMINI_API_KEY`, and raise `AssertionError` if any test reaches the real
      call. Add `tests/test_question_validation.py` with the ten cases in `design.md` § Test design.
      Add the session-wide egress guard and its positive control from the approved `test-plan.md`
      (Q-06). Every case asserts the question count through `GET /categories/stats` is unchanged.
- [x] 3.3 Run the full gate: `poetry run pytest --cov=app --cov-fail-under=80`,
      `poetry run ruff check .`, `poetry run ruff format --check .`, `poetry run mypy app`. Fix at the
      source, not with suppressions.

## 4. The frontend

- [x] 4.1 Rewrite `submitAuthoring` in `frontend/index.html` to validate first and save second, using
      the exact copy and the decision table in `design.md` § Frontend. Keep one submit control, keep
      the button disabled across both requests, keep the existing structural error mapping, keep
      `form.reset()` and `syncAuthoringType()` on a successful save. Do not touch the type selector or
      the option rows.
- [x] 4.2 Confirm the inline script parses: extract the script block and run it through
      `new vm.Script(...)` under Node 24, the check used for the earlier frontend changes. Confirm the
      form still has exactly one `.auth-submit` control.
- [x] 4.3 Exercise all six branches in a browser: valid, uncertain, implausible, 502, 503, and a
      structural 409. Use both question types. Repeat at `320x568` and `1440x900`, and confirm the
      status note wraps without a new media query and without horizontal overflow.

## 5. Documentation alignment

- [x] 5.1 Verify `openspec/project.md` matches what shipped: the framework entry, the secret entry,
      the service-boundary row for Google, the observability note, the known constraint, and the
      recorded exception. Correct drift before archive; if the implementation departs from this
      design, stop and escalate rather than rewriting the plan to match.
- [x] 5.2 Verify `docs/adr/ADR-005-restore-gemini-semantic-validation.md` cites the real change name
      and branch and that its decision matches the code.

## 6. Verification and evidence

- [x] 6.1 `docker compose --profile test run --rm tests` passes (it runs the coverage command). Record
      the output.
- [x] 6.2 `docker compose up -d --build`, then a live probe with a real `GEMINI_API_KEY`:
      a valid question, a question with a clearly wrong marked answer, and an ambiguous question.
      Record the three response bodies. Also record a true/false statement marked with the wrong truth
      value, and an unrelated-options case.
- [x] 6.3 Record the two failure paths: start the API with `GEMINI_API_KEY` unset and post a valid
      payload (expect `503 gemini_api_key_missing`), then with a key set but egress blocked or an
      invalid key (expect `502 ai_provider_error`). Confirm the response never contains the key.
- [x] 6.4 Regression: the game still loads questions, plays a multiple-choice turn and a true/false
      turn, and `POST /questions` still returns `201` with `{id, category, confidence_score}`.
- [x] 6.5 Demonstrate the mutations and record each observed failure in the PR. Each is a hypothesis
      until the output is pasted:
      - return a fixed `valid` verdict without calling the provider: the implausible test should
        redden;
      - compute `plausible` as `True` always: the uncertain test should redden;
      - move the provider call above `validate_question`: the duplicate-with-no-key test should
        redden with `503`;
      - save on `status == "implausible"` in the form: the browser block check should redden;
      - remove the autouse fake: a validation test should fail with the guard message, not hang or hit
        the network.
- [x] 6.6 `openspec validate restore-gemini-question-validation --strict` passes. Put the command
      output and the PR link in the PR body, with the change name.
