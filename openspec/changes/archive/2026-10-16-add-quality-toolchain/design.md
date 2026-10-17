# Design

- **Change**: `add-quality-toolchain`
- **Track**: 2 (Full)

## New dependencies

| Dependency | Version range | Why it is here |
|---|---|---|
| `pytest` | `>=9.1.1,<10.0.0` | Test discovery, fixtures, parametrization, `monkeypatch`. |
| `pytest-cov` | `>=7.1.0,<8.0.0` | `--cov` / `--cov-fail-under` integrate with the single pytest command. |
| `httpx` | `>=0.28.1,<0.29.0` | FastAPI's `TestClient` is built on httpx; it is not a runtime dependency of the app. |
| `ruff` | `>=0.17.1,<0.18.0` | Lint and format in one tool; fast enough to run on every change. |
| `mypy` | `>=2.4.0,<3.0.0` | Static type checking for the `app` package. |

All five are **dev-only** dependencies (`[tool.poetry.group.dev.dependencies]`). None enters the
runtime path; the demo still runs with `poetry install --only main`.

## Test isolation

The application builds one module-level engine from a hardcoded development URL in
`app/database.py`. Tests must not touch that database, and the suite must be independent of Docker.

**Contract:** tests override the FastAPI `get_db` dependency with a session bound to an **in-memory
SQLite** engine, created per test. The models in `app/models.py` use only portable column types
(`Integer`, `String`, `Text`, `Float`, `DateTime`, `Boolean`, `ForeignKey`), so they create cleanly on
SQLite. `Base.metadata.create_all()` runs against the test engine and is torn down after each test.

- The `app` module under test is imported unchanged; only the dependency is swapped, through
  `app.dependency_overrides[get_db]`, which is the same seam the app already exposes.
- SQLite enforces foreign keys only when asked; the suite does not rely on that enforcement, so no
  `PRAGMA` is needed.
- The in-memory engine uses a `StaticPool` and `check_same_thread=False` so the single connection is
  shared across the request thread `TestClient` uses.

## AI service stub

`app/main.py` imports `assess_question` into its own namespace. Tests monkeypatch
`app.main.assess_question`:

- The happy path returns a fixed verdict dict (`plausible`, `status`, `reasons`, `distractors`).
- The failure paths raise `AIValidationError` with `status_code` 503 (missing key) and 502 (provider
  error) to assert the HTTP mapping.

The unit helpers in `app/ai_validation.py` (`get_api_key`, `get_model_name`, `_model_candidates`,
`_clean_distractors`) are tested directly; `_run` is never executed, so no network call is made.

## Coverage scope

`--cov=app` measures the whole package, but four modules are **omitted** and named rather than
silently excluded: `app/load_data.py`, `app/categorize.py`, `app/classifier.py`, and
`app/human_review.py`. They are offline command-line tools that import Transformers/torch and are not
part of the web request path; covering them is out of scope for this change. The remaining modules —
`main`, `models`, `database`, `categories`, `question_authoring`, `ai_validation` — carry the 80% bar.

## Configuration

Added to `pyproject.toml`:

- `[tool.pytest.ini_options]` — `testpaths = ["tests"]`, `pythonpath = ["."]` so the `app` package
  imports when pytest runs from the project root, and `addopts = "-q"`.
- `[tool.ruff]` — line length 100, target `py313`, with `extend-exclude` for the non-product trees
  (`openspec`, `.opencode`, `.claude`, `harness`, `stitch`, `docs`, `.check-temp`) and all Markdown, so
  Ruff neither lints archived change scripts nor rewrites Python blocks inside docs.
- `[tool.ruff.lint]` — default `E`, `F` plus `I` (import order); `E501` is ignored because
  `ruff format` owns line width and cannot wrap long string literals.
- `[tool.mypy]` — `python_version = "3.14"`, `ignore_missing_imports = true`, `check_untyped_defs = true`.
- `[tool.coverage.run]` / `[tool.coverage.report]` — omit the four offline modules.

## Prescribed mutations (conditional — this is what *should* redden)

- If the coverage bar is removed from `addopts`/CLI, `--cov-fail-under` should report the tree under
  the threshold only when a module drops below 80%; with the current suite it should stay green, so
  the bar is a floor, not the pass signal.
- If the `get_db` override is removed, the suite should fail on connection to the development
  database, not pass quietly — evidence that the override is what makes the suite hermetic.
- If `app.main.assess_question` is not stubbed, `POST /questions/validate` should attempt a network
  call and fail without a key, not return a canned verdict.
