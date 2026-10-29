# Tasks

Ordered so every task leaves the tree green. Track 1 (Light): no `design.md`. Tests belong to the
task that introduces the behavior, not to a final task.

## 1. Accept `true_false` in the API

- [x] 1.1 In `app/question_authoring.py`, add
      `question_type: Literal["multiple_choice", "true_false"] = "multiple_choice"` to
      `QuestionCreate` (import `Literal`). Leave every existing field and its default untouched, so a
      payload without `question_type` keeps today's behavior.
- [x] 1.2 In `validate_question`, branch on `payload.question_type`:
      - `multiple_choice`: the current four-option logic, unchanged — same order of checks and same
        `missing_fields` / `options_not_distinct` / `answer_not_in_options` codes.
      - `true_false`: require `question` and `correct_answer` non-empty plus `option_a` and `option_b`
        non-empty and distinct; require `correct_answer` to equal one of the two; ignore any submitted
        `option_c`/`option_d` and set both to `None` in the returned fields.
      - Run the existing duplicate check last, for both types.
      Adjust the return annotation to `dict[str, str | None]` and the docstring so it states that
      C/D are ignored for `true_false`. Do not change `create_question`, `main.py`, the models, the
      response shape, or any status code.
- [x] 1.3 In `tests/test_authoring.py`, add permanent coverage for the accepting path:
      - a valid `true_false` payload returns `201` with exactly `id`, `category`, `confidence_score`;
      - `GET /questions/{id}` shows the submitted `option_a`/`option_b`/answer and `null` for
        `option_c` and `option_d`;
      - `GET /questions/category/{category}` includes it with both C/D `null`;
      - a `true_false` payload that also sends non-empty `option_c`/`option_d` still stores `null` in
        both.
      Run `poetry run pytest tests/test_authoring.py -q`.
- [x] 1.4 Add the rejecting and compatibility cases to `tests/test_authoring.py`:
      - `true_false` with empty `option_b` → `400 missing_fields`;
      - `true_false` with `option_a == option_b` → `400 options_not_distinct`;
      - `true_false` with `correct_answer` outside A/B (including a value that only appears in
        submitted C/D) → `400 answer_not_in_options`;
      - `true_false` duplicate text → `409 duplicate_question`;
      - unsupported `question_type` → `422`, then the same payload with `true_false` → `201` (the
        positive control), with `GET /categories/stats` showing only the accepted record;
      - a multiple-choice payload with no `question_type` still stores all four options, and the four
        existing multiple-choice error tests stay untouched and green.
      Run `poetry run pytest tests/test_authoring.py -q`.

## 2. Make the start-screen form author both types

- [x] 2.1 In `frontend/index.html`, inside `#authoring-form`, add a type selector as the first
      `.auth-field`, above the question textarea. Give it `id="q-type"` and two options:
      `multiple_choice` ("Múltiple opción", selected) and `true_false` ("Verdadero / Falso"). Reuse
      the existing `.auth-field select` styling; add no CSS and no media query. Add ids to the C and D
      option rows (for example `option-row-c` / `option-row-d`) so they can be hidden as rows.
- [x] 2.2 Add a `syncAuthoringType()` function and call it from `initAuthoring()` and on the
      selector's `change` event:
      - `multiple_choice`: show the C/D rows, remove `readonly` from A/B, and clear the fixed labels.
      - `true_false`: set A/B to `Verdadero`/`Falso`, set `readonly` (not `disabled`, so the values
        still submit), hide the C/D rows, clear their text values, and uncheck a C/D radio if one was
        selected.
      After a successful submission, reset the form and re-apply the `multiple_choice` state.
- [x] 2.3 Update the payload builder and status copy:
      - `authoringPayload` always sends `question_type` from `#q-type`; for `true_false` the hidden
        C/D values are sent as empty strings and `correct_answer` comes from the checked A/B radio.
      - `authoringMessage` takes the type into account: for `true_false`, `missing_fields` and
        `options_not_distinct` refer to two options; for `multiple_choice` they keep referring to
        four. The success message, the saving message, and the network-failure message stay as they
        are apart from the option count.
      Verify the page loads with no console error and that a multiple-choice submission is unchanged.

## 3. Verify

- [x] 3.1 Run the declared gates: `poetry run pytest --cov=app --cov-fail-under=80`,
      `poetry run ruff check .`, `poetry run ruff format --check .`, `poetry run mypy app`. All green;
      no existing test edited to accommodate the change.
- [x] 3.2 Demonstrate the guards in the PR (mutations are hypotheses until shown):
      - temporarily storing the submitted `option_c`/`option_d` for `true_false` **should** redden
        the C/D-ignored test;
      - removing the `true_false` branch **should** redden the valid true/false persistence test.
      Restore both mutations and record the observed failures in the PR body.
- [ ] 3.3 Browser/QA pass at `320x568`, `360x640`, `390x844`, `844x390`, and `1440x900`, with the
      authoring form open: submit one true/false question and one multiple-choice question, confirm
      each succeeds, confirm the true/false question is served in its category with two options and
      the game renders two options, and confirm every control is reachable with no horizontal
      overflow. Confirm the stylesheet's media queries are still exactly `768px`, `1024px`, and
      `640px`.
