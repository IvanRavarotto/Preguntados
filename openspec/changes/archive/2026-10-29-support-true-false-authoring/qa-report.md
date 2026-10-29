# QA report — `support-true-false-authoring`

| | |
|---|---|
| Change | `support-true-false-authoring` |
| Branch / commit | `feature/support-true-false-authoring` / `3d0e5e0` |
| Date | 2026-10-29 |
| Verdict | **PASS** |

## Environment

- New code served locally at `http://127.0.0.1:8001` with `poetry run uvicorn app.main:app`
  against the Docker PostgreSQL 15 instance. The live Docker demo on port 8000 was not touched.
- Browser: Microsoft Edge `--headless=new`, driven over CDP by Node 24.
- Test questions were created with unique timestamped texts and deleted afterwards; the dataset is
  back to 5000 questions.

## Quality gates

| Gate | Command | Result |
|---|---|---|
| Tests + coverage | `poetry run pytest --cov=app --cov-fail-under=80` | 64 passed, 100% (287/287) |
| Lint | `poetry run ruff check .` | All checks passed |
| Format | `poetry run ruff format --check .` | 16 files already formatted |
| Types | `poetry run mypy app` | Success: no issues in 8 source files |

## API checks

| Criterion | Result |
|---|---|
| True/false creation returns `201` with `{id, category, confidence_score}` | PASS |
| `GET /questions/{id}` returns the two options, the answer, and `option_c`/`option_d` `null` | PASS |
| Supplied C/D on a true/false payload are ignored and stored `null` | PASS |
| Unknown `question_type` returns `422` without persisting | PASS |
| Multiple-choice with four options still creates and stores all four | PASS |
| Rejections (`missing_fields`, `options_not_distinct`, `answer_not_in_options`, `duplicate_question`) | PASS — covered by the suite; matrix in `tests/test_authoring.py` |

## Browser checks

Runner: `openspec/changes/support-true-false-authoring/checks/check_authoring_form.mjs`, run with
`--url http://127.0.0.1:8001`. Output: `AUTHORING_CHECK_PASS` (27 assertions).

| Area | Result |
|---|---|
| Default state: `multiple_choice`, four editable rows, four radios | PASS |
| True/false: A/B exactly `Verdadero`/`Falso`, `readOnly`, C/D hidden and cleared | PASS |
| True/false: only A/B radios visible; a previously selected C/D radio is cleared | PASS |
| Payload: `question_type`, fixed A/B, empty C/D, `correct_answer` from the checked radio | PASS |
| Success message names id, category label and confidence; form resets to `multiple_choice` | PASS |
| Error copy says "dos opciones" for true/false and "cuatro opciones" for multiple choice | PASS |
| Switching back restores four editable rows and clears the fixed labels | PASS |
| No uncaught page exception | PASS |
| Media queries remain exactly `1024px`, `768px`, `640px` | PASS |
| No horizontal overflow and controls rendered at `320x568`, `390x844`, `844x390`, `1440x900` | PASS |
| An authored true/false question renders as exactly the two options `Verdadero`/`Falso` | PASS |

## Not run in this pass

- The live Gemini validation: it belongs to the follow-up Track 2 change, not this delta.
- A physical-handset pass; viewports are emulated.
- A pixel/visual review of the glass surfaces; the checks are behavioral and geometric.
