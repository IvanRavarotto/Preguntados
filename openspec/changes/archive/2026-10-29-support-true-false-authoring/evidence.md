# Evidence — `support-true-false-authoring`

| | |
|---|---|
| Branch | `feature/support-true-false-authoring` |
| State | Committed as `3d0e5e0`; QA artifacts and the checked task list are added in the follow-up commit. |
| Track | 1 (Light) |
| Scope | Code-review fixes B1, B2, N1, N2, N3 plus the repeated quality and mutation gates |

## Working-tree files

Modified:

- `app/question_authoring.py`
- `frontend/index.html`
- `tests/test_authoring.py`

Change package (untracked): `openspec/changes/support-true-false-authoring/`, including this evidence
file and the checked-off tasks. The proposal, spec delta, and test plan were not edited.

## Review findings resolved

- **B1** — added the multiple-choice pin: blank `option_c` and blank `option_d` are parametrized to
  `400 missing_fields` with `total_questions == 0`, and a parametrized valid case pins `correct_answer`
  as option C and as option D.
- **B2** — parametrized the true/false `missing_fields` test over blank (`""`) and whitespace-only
  (`"   "`) `question`, `option_a`, `option_b`, and `correct_answer`; every case asserts `400
  missing_fields` and `total_questions == 0`.
- **N1** — added a true/false case that omits `option_c`/`option_d` (Pydantic defaults, `NULL`
  persisted) and a whitespace-only A/B case that must return `400 options_not_distinct` after trimming.
- **N2** — replaced the `assert question_text is not None` narrowing with
  `cast(str, fields["question"])`, so `python -O` cannot change behavior.
- **N3** — the two tests that read `created["id"]` now assert `status_code == 201` first.

## Quality gates

Run from the repo root against the restored working tree.

| Gate | Command | Result |
|---|---|---|
| Tests + coverage | `poetry run pytest --cov=app --cov-fail-under=80` | Exit `0`; **64 passed**; coverage **100.00%** (287 statements, 0 missed); 80% bar reached |
| Lint | `poetry run ruff check .` | Exit `0`; `All checks passed!` |
| Format | `poetry run ruff format --check .` | Exit `0`; `16 files already formatted` |
| Types | `poetry run mypy app` | Exit `0`; `Success: no issues found in 8 source files` |

The two pre-existing FastAPI `on_event` deprecation warnings remain; they are not caused by this
change.

## Mutation evidence

Each mutation was applied to `app/question_authoring.py`, the targeted tests were run, the file was
restored, and the full gate set was re-run green.

### Mutation 1 — store supplied `option_c`/`option_d` for `true_false`

Removed the two assignments that set `result["option_c"]` and `result["option_d"]` to `None`.

```
poetry run pytest tests/test_authoring.py -q -k "supplied_c_d"
```

Observed red:

```
FAILED tests/test_authoring.py::test_true_false_with_supplied_c_d
E       AssertionError: assert 'Tal vez' is None
tests\test_authoring.py:173: AssertionError
```

1 failed. Restored.

### Mutation 2 — remove the `true_false` branch

Replaced the type-dependent `option_keys` with the four-option tuple, so `true_false` requires C/D.

```
poetry run pytest tests/test_authoring.py -q -k "true_false_question_is_created or true_false_question_persists_two_options"
```

Observed red:

```
FAILED tests/test_authoring.py::test_true_false_question_is_created
E       assert 400 == 201

FAILED tests/test_authoring.py::test_true_false_question_persists_two_options
E       assert 400 == 201
```

2 failed. Restored.

## Post-restore verification

The four gate commands above were re-run after both restorations: 64 passed, 100.00% coverage, Ruff
lint and format clean, mypy clean.

## QA pass

`qa-report.md` records the PASS verdict: the four gates above were re-run; the API was exercised on a
separate local server at `127.0.0.1:8001` against the Docker PostgreSQL; and
`checks/check_authoring_form.mjs` printed `AUTHORING_CHECK_PASS` across the form states, payloads,
error copy, media queries, four viewports, and the two-option game render. Test rows were deleted
afterwards, leaving the dataset at 5000 questions. The live Docker demo on port 8000 was not touched.
