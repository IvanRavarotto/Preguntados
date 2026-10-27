# Tasks

Branch when authorized: `test/add-quality-toolchain`. The change touches build configuration, adds a
`tests/` package, and provisions a dev dependency group; it changes no production behavior.

## 1. Declare the toolchain

- [x] 1.1 Add the dev dependency group to `pyproject.toml` (`pytest`, `pytest-cov`, `httpx`, `ruff`,
      `mypy`) and refresh `poetry.lock` with `poetry install`. **Verify**: `poetry run pytest --version`,
      `poetry run ruff --version`, and `poetry run mypy --version` each print a version and exit 0.
- [x] 1.2 Add `[tool.pytest.ini_options]`, `[tool.ruff]`, `[tool.ruff.lint]`, `[tool.mypy]`,
      `[tool.coverage.run]`, and `[tool.coverage.report]` to `pyproject.toml`. **Verify**: the config
      parses — `poetry run pytest --collect-only` and `poetry run ruff check .` both run without a
      configuration error.

## 2. Hermetic test harness

- [x] 2.1 Create `tests/conftest.py` with a per-test in-memory SQLite engine (`StaticPool`,
      `check_same_thread=False`), `Base.metadata.create_all`, a `TestClient` fixture, and a
      `get_db` dependency override. **Verify**: a trivial test that issues `GET /categories` passes and
      the development database is never opened.
- [x] 2.2 Add an AI fixture that monkeypatches `app.main.assess_question` to a fixed verdict, and
      helpers to raise `AIValidationError(503)` and `AIValidationError(502)`. **Verify**: the validate
      tests pass with no network access.

## 3. API contract tests

- [x] 3.1 `tests/test_root.py`: `GET /` returns 200, `text/html`, and a document containing `<html`.
      **Verify**: assert status, content-type, and body marker.
- [x] 3.2 `tests/test_categories.py`: `GET /categories` returns six dicts with `name` and `label`;
      `GET /categories/stats` returns the expected keys and correct counts for a seeded fixture.
- [x] 3.3 `tests/test_questions.py`: `GET /questions` paginates; `GET /questions/{id}` returns the
      record for an existing id and the `{"error": ...}` body for a missing one; `GET
      /questions/category/{name}` joins on `Categorization` and returns only that category.
- [x] 3.4 `tests/test_authoring.py`: `POST /questions` returns 201 with an `id` on success and
      persists both a `Question` and a `Categorization`; one test per validation code asserts the
      status and `detail` (`missing_fields` 400, `category_unknown` 404, `options_not_distinct` 400,
      `answer_not_in_options` 400, `duplicate_question` 409).
- [x] 3.5 `tests/test_validation.py`: `POST /questions/validate` returns the stubbed verdict; an
      `AIValidationError(503)` maps to HTTP 503 and `(502)` to HTTP 502.
- [x] 3.6 `tests/test_unit.py`: `normalize_question_text`, `question_exists`, `find_category_by_name`,
      and `_clean_distractors` behave as specified. **Verify**: a duplicate differing only by case and
      inner whitespace is detected.

## 4. Gates and declaration

- [x] 4.1 Run `poetry run pytest --cov=app --cov-fail-under=80` and record the coverage total.
      **Verify**: exit 0 and coverage at or above 80%.
- [x] 4.2 Run `poetry run ruff check .` and `poetry run ruff format --check .`; fix or format so both
      exit 0. **Verify**: both exit 0.
- [x] 4.3 Run `poetry run mypy app`; resolve findings so it exits 0 under the declared config.
      **Verify**: exit 0.
- [x] 4.4 Amend `openspec/project.md` § Runtime and language, § Frameworks, § Known baseline
      constraints, and § Recorded exceptions to declare the new commands, the coverage bar, and the
      toolchain's arrival. **Verify**: no row reads "Not configured" and the exception row is updated.
- [x] 4.5 Run `openspec validate "add-quality-toolchain" --strict` and `scripts/smoke-demo.ps1` against
      the running API. **Verify**: both pass.

## 5. Record the decision

- [x] 5.1 Write `docs/adr/ADR-003-pytest-ruff-mypy-toolchain.md` recording the dev-only dependency
      addition and the SQLite-isolation choice. **Verify**: the file follows the ADR template and is
      referenced from the change.
