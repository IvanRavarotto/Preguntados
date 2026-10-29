# Proposal

- **Change**: `support-true-false-authoring`
- **Branch when authorized**: `feature/support-true-false-authoring`
- **Owner role**: `dev`
- **Track**: 1 (Light) — extends one existing endpoint and one existing form in a single capability;
  no new interface, route, dependency, schema, or migration.
- **Capability**: `question-authoring`
- **Depends on**: none. The two-option data shape already exists on `main`: `Question.option_c` and
  `Question.option_d` are nullable (`app/models.py:16-17`), the loader accepts two or four options
  (`app/load_dataset.py:27`, `:56`), and the game already renders two-option questions
  (`openspec/specs/gameplay/spec.md`, "True/false questions keep only the correct-option joker").
  No active OpenSpec change exists.

## Why

The dataset contains 1,950 true/false questions whose two options live in `option_a`/`option_b` and
whose `option_c`/`option_d` are `NULL`, and the game already plays them. The start-screen authoring
form cannot create one: `validate_question` requires all four option fields non-empty and four distinct
values (`app/question_authoring.py:61-66`), so every manually authored question is forced into the
four-option shape. A user cannot author the type of question the game already supports.

The gap is narrow. The database accepts `NULL` C/D today, the game already handles two options, and
the form's stylesheet already has a rule for `.auth-field select` (`frontend/index.html:176`) with no
control using it. Only the request contract, the validator, and the form need the new case.

## What Changes

- **API.** `QuestionCreate` gains an optional `question_type`, defaulting to `multiple_choice` and
  accepting `true_false`. For `true_false`, `option_a` and `option_b` must be distinct and non-empty
  and `correct_answer` must equal one of them; any submitted `option_c`/`option_d` are ignored and
  stored as `NULL`. The success response stays exactly `{id, category, confidence_score}`, and the
  existing `missing_fields`, `options_not_distinct`, `answer_not_in_options`, and
  `duplicate_question` codes keep their current statuses (400/400/400/409).
- **Frontend.** Add a type selector as the first field of `#authoring-form`. When `true_false` is
  selected, options A and B are fixed to `Verdadero` and `Falso` and made read-only, the C and D rows
  are hidden, and the existing radio group chooses the correct answer among the two visible options.
  The payload carries `question_type`; the status copy names two options instead of four for
  true/false. The form stays inside the collapsed `<details>` and remains usable on a phone with no
  new media query, framework, or build step.
- **Tests.** Permanent pytest coverage in `tests/test_authoring.py` for the new path and for the
  unchanged multiple-choice path.

## Key decisions (for Gate B)

1. **The API validates structure, not the literal Spanish labels.** The prescribed direction is
   "exactly two distinct non-empty options and the answer among them"; enforcing
   `option_a == "Verdadero"` would add a new rejection case and a new error code that the direction
   does not ask for. The **form** is what guarantees the dataset's `Verdadero`/`Falso` labels. A direct
   API caller may author any two distinct options, which is still a valid two-option question.
2. **Submitted C/D are ignored, not rejected, for `true_false`.** The form hides those rows, and the
   server stores `NULL` regardless. Rejecting a non-empty C/D would make a stale hidden value a
   submission failure for no product benefit.
3. **Invalid `question_type` values are rejected by the request schema.** The field is a `Literal`, so
   an unsupported value yields FastAPI's documented 422 without persisting anything. This avoids
   inventing a new machine error code alongside the four stable ones.
4. **Option C/D radios are cleared, and A/B text is cleared on the way back to multiple choice.**
   Entering true/false clears C/D text and any C/D radio selection so no hidden value can be
   submitted; returning to multiple choice clears the fixed `Verdadero`/`Falso` text so it cannot be
   mistaken for four authored options. A/B text typed before switching to true/false is not restored.
5. **One endpoint, one form.** No `/questions/true-false` route and no second form. The type is a
   property of the submission, and the response shape is unchanged.

## Alternatives considered and rejected

- **Reject a `true_false` payload that carries non-empty C/D.** Rejected: it turns a hidden UI detail
  into a server error and adds a failure mode the product does not need. Ignoring is simpler and the
  persistence guarantee is identical.
- **Enforce the literal labels server-side.** Rejected for this change (see decision 1). If the human
  wants label enforcement, it is a one-line extra check and one extra test, but it must be approved at
  Gate B because it is a stricter contract than the one requested.
- **A boolean `is_true_false` field.** Rejected: a named type reads clearly in the payload and in
  tests, and leaves room for another type without adding a second boolean.
- **A separate endpoint.** Rejected: it duplicates validation, duplicate detection, and
  classification, and adds an API surface for a single field.
- **Store `Verdadero`/`Falso` in `option_c`/`option_d` instead of `NULL`.** Rejected: it contradicts
  the dataset shape, the loader's two-option rows, and the existing true/false serving test
  (`tests/test_questions.py:48`), and would make the game render four options.
- **Show the C/D rows disabled rather than hidden.** Rejected: a visitor would see four controls for
  a two-option question. Hidden rows keep the form's shape matching the question's shape.
- **A new media query for the added selector.** Rejected: the living `game-presentation` spec fixes the
  declared breakpoints, and the start panel already scrolls internally when its content does not fit.

## Impact

- `app/question_authoring.py` — request schema and validator; persistence already accepts `NULL` C/D.
- `frontend/index.html` — type selector, conditional option rows, payload, status copy.
- `tests/test_authoring.py` — new coverage; no existing test changes.
- `openspec/specs/question-authoring/spec.md` — via this change's delta; folded at archive.
- No change to `app/models.py`, `app/main.py`, `app/load_dataset.py`, the database schema, the
  dependency set, or any other route. No migration is required: the columns are already nullable and
  the check is application-level.

## Out of Scope

Any schema or migration change; editing, deleting, or listing authored questions; a new API route;
enforcing the literal `Verdadero`/`Falso` labels server-side; changing duplicate detection,
classification, or the `missing_fields`/`options_not_distinct`/`answer_not_in_options`/
`duplicate_question` codes; changing the multiple-choice four-option form; frontend frameworks,
bundlers, or build steps; new media queries; player-name or gameplay behavior; the `POST /classify`
endpoint.
