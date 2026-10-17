# ADR-003 — pytest, Ruff, and mypy as the quality toolchain

- **Status**: Accepted
- **Date**: 2026-10-16
- **Change**: `add-quality-toolchain`

## Context

`openspec/project.md` § Runtime and language declared the test, lint, and type-check commands as
**not configured**, and § Known baseline constraints recorded that there was no automated behavioral
suite, no lint command, no type-check command, and no coverage threshold. Verification before this
change was `poetry run python -m compileall -q app`, ad-hoc HTTP smoke checks, and the pre-demo script
`scripts/smoke-demo.ps1`. Nothing ran on every change, so a regression in the API contract surfaced
only when a person happened to exercise the affected path.

That is an acceptable risk for an ungraded classroom demo and an unacceptable one for the graded
deliverable. The project needed the three gates a Python service is expected to carry — tests, lint,
and types — and a coverage floor to keep the suite honest.

The suite must not depend on the development PostgreSQL container being up, must not require the seeded
300-question dataset, and must never mutate the demo database. It must also run without the
`GEMINI_API_KEY` and without a network call, because the AI path is the one part of the request surface
that is neither local nor deterministic.

Adding these tools introduces five new dependencies and one new dependency group, none of which the
declared stack named. That expansion of the declared stack is the reason this record exists.

## Decision

We will add a **development-only** toolchain and the commands that enforce it.

- **Dependencies** (`[dependency-groups].dev`, never in the runtime path): `pytest`, `pytest-cov`,
  `httpx` (the transport FastAPI's `TestClient` is built on), `ruff`, and `mypy`. The demo still runs
  from `poetry install --only main`.
- **Hermetic tests**: `tests/` drives the FastAPI app through `TestClient` against a per-test
  in-memory SQLite engine, bound by overriding the app's own `get_db` seam. The SQLAlchemy models use
  only portable column types, so they create cleanly on SQLite. The AI service is stubbed by
  monkeypatching the name imported into `app.main`.
- **Coverage**: `poetry run pytest --cov=app --cov-fail-under=80`, measured over the API-owned modules.
  The offline command-line tools — `app/load_data.py`, `app/categorize.py`, `app/classifier.py`, and
  `app/human_review.py` — are omitted and named, not silently excluded.
- **Lint and format**: `poetry run ruff check .` and `poetry run ruff format --check .`, with Ruff
  configured in `pyproject.toml`. `E501` is disabled because `ruff format` owns line width; long string
  literals the formatter cannot wrap are therefore allowed.
- **Types**: `poetry run mypy app` under a non-strict configuration that still checks untyped function
  bodies and ignores missing third-party stubs.
- **Declaration**: `openspec/project.md` now names these commands, the 80% bar, and the omission set,
  replacing the "Not configured" placeholders.

## Alternatives considered

- **`unittest` from the standard library, no new dependency.** Rejected. FastAPI's test ergonomics —
  `TestClient`, fixtures, `monkeypatch`, parametrization — are built around pytest; reproducing the
  fixtures the suite needs on `unittest` costs more than the dependency does.
- **Test against the development PostgreSQL database.** Rejected. It would make the suite depend on
  Docker, on the seeded dataset, and on a live connection, and it would let tests mutate the demo
  database. The `get_db` override plus in-memory SQLite keeps the suite hermetic and is the seam the app
  already exposes.
- **Mock the AI call at the HTTP boundary with `respx`/`responses`.** Rejected. It adds a dependency to
  intercept a call the suite does not need to make; monkeypatching the symbol imported into `app.main`
  is simpler and asserts the same mapping.
- **A `black` + `flake8` + `isort` combination instead of Ruff.** Rejected. Ruff replaces all three in
  one pinned tool and one config block, which is one fewer moving part on a small project.
- **Set the coverage bar to 100%.** Rejected. Reaching it would force tests of the guarded import and
  error branches of the offline tools; 80% over the API-owned modules is a floor the suite meets today
  while those modules are explicitly omitted and named.
- **Run mypy in strict mode across `tests/` and `scripts/` too.** Rejected for now. Strict mode on the
  application is a larger, separate change; the gate here is a clean `mypy app`, and widening it is its
  own decision.

## Consequences

Every behavior change can now end in one command that runs the HTTP contract, the lint rules, and the
type checker, and the 80% floor keeps the suite from silently thinning. The suite is hermetic: it passes
with the database down and `GEMINI_API_KEY` unset, which is also what makes it safe to run in CI later.

Four costs are accepted. **Five dev dependencies and their lockfile entries** enter the project; they
never reach the runtime path, but they are one more thing to keep current. **The coverage bar carries a
named blind spot**: the offline tools are omitted, so a defect introduced there is not caught by
`pytest` — the pre-demo smoke script and the tools' own command-line checks remain their only guard.
**Adding a formatter reformatted the existing application modules** in this change, so its diff is larger
than the behavior it changes; that is a one-time normalization, and `ruff format --check` holds the line
from here. **`requires-python` was normalized from Poetry's caret form `^3.14` to the standard
`>=3.14,<4.0`**, because Ruff could not parse the caret form; the meaning is unchanged. Finally, the
gates depend on the developer running them — this project has no CI pipeline yet, so a skipped command
is a gate that did not happen.
