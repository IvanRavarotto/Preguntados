# Proposal

- **Change**: `add-quality-toolchain`
- **Branch when authorized**: `test/add-quality-toolchain`
- **Owner role**: `dev`
- **Track**: 2 (Full) - adds a new dependency toolchain, configures build gates, and touches the whole `app` package.
- **Capability**: `quality-toolchain`
- **Depends on**: None
- **Decision reference**: `docs/adr/ADR-003-pytest-ruff-mypy-toolchain.md`

## Why

`openspec/project.md` § Runtime and language declares the test, lint, and type-check commands as **not configured**, and § Known baseline constraints records that there is no automated behavioral test suite, no lint command, no type-check command, and no coverage threshold. Verification today is `compileall`, ad-hoc HTTP smoke checks, and the pre-demo script `scripts/smoke-demo.ps1`. Nothing runs on every change, so a regression in the API contract is caught only when a human happens to exercise it.

That gap is an accepted pre-release risk for a classroom demo and an unacceptable one for the graded deliverable. This change pays it down with a real automated suite plus the two static gates the project has never had.

## What Changes

- Add **pytest** and **pytest-cov** as dev dependencies, plus **httpx** for FastAPI's `TestClient`.
- Add **ruff** for lint and formatting and **mypy** for static type checking, all as dev dependencies.
- Add a `tests/` suite that exercises the HTTP contract through `TestClient` against an isolated in-memory SQLite database, with the AI service stubbed so it needs no network and no API key.
- Set a coverage bar: `poetry run pytest --cov=app --cov-fail-under=80`, measured over the API-owned modules.
- Add `[tool.pytest.ini_options]`, `[tool.ruff]`, `[tool.mypy]`, and `[tool.coverage.*]` configuration to `pyproject.toml`.
- Amend `openspec/project.md` to declare the one build, test, lint, and type-check commands and the coverage bar, and to move the "no toolchain" gap out of the known baseline.

## Out of scope

Adding tests for the offline tools (`app/load_data.py`, `app/categorize.py`, `app/human_review.py`) and for the network-bound path of `app/ai_validation.py`; adding CI/CD; adding a browser/JS test runner for `frontend/index.html`; and changing any API route, response shape, or game behavior. Those stay as-is; the frontend keeps its existing `node --check` and `node:vm` checks.

## Depends on

None.

## Alternatives considered

- **Add only the test suite and leave lint/type-check unconfigured.** Rejected. `ruff` and `mypy` are the cheapest part of this change and catch a class of defect tests cannot, and the project already lists them as missing gates.
- **Use `unittest` from the standard library with no new dependency.** Rejected. FastAPI's test ergonomics (`TestClient`, fixtures, parametrization) are built around pytest, and pytest is the de facto standard for this stack; re-implementing fixtures on `unittest` costs more than the dependency.
- **Test against the development PostgreSQL database.** Rejected. Tests must not depend on Docker being up, must not require a seeded dataset, and must never mutate the demo database. An isolated in-memory SQLite session with the same SQLAlchemy models keeps the suite hermetic.
- **Mock at the HTTP boundary with `responses`/`respx` for the AI call.** Rejected. The AI module is imported into the route module, so a direct monkeypatch of the imported symbol is simpler and needs no extra dependency.
- **Set coverage to 100%.** Rejected. It would force tests of the guarded import and error branches of the offline tools, which are out of scope; 80% over the API-owned modules is a bar the suite meets while leaving those modules explicitly omitted and named.
