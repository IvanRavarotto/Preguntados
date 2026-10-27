# Spec Delta

## Purpose

Defines the automated quality gates the project runs on every change: a hermetic behavioral test
suite over the HTTP contract, a lint gate, a type-check gate, and a coverage bar. It exists so a
regression in the API is caught by a command rather than by a human remembering to exercise it.

## ADDED Requirements

### Requirement: Automated behavioral test suite

The project SHALL provide a single command, `poetry run pytest`, that discovers and runs an automated
suite under `tests/`. The suite SHALL exercise the HTTP contract through FastAPI's `TestClient`
against an isolated database, and SHALL stub the AI validation service so it runs with no network
call and no `GEMINI_API_KEY`. The suite SHALL NOT read from or write to the development PostgreSQL
database.

#### Scenario: Suite runs green on the current tree

- **GIVEN** a clean checkout with dev dependencies installed
- **WHEN** `poetry run pytest` is run
- **THEN** the suite is discovered, executes, and exits with status 0

#### Scenario: Suite is hermetic

- **GIVEN** the development database is not running and `GEMINI_API_KEY` is unset
- **WHEN** `poetry run pytest` is run
- **THEN** the suite still executes and exits with status 0

### Requirement: API contract coverage

The suite SHALL assert the observable contract of `GET /`, `GET /categories`, `GET /questions`,
`GET /questions/{id}`, `GET /questions/category/{name}`, `GET /categories/stats`,
`POST /questions`, and `POST /questions/validate`. Every authoring validation code
(`missing_fields`, `category_unknown`, `options_not_distinct`, `answer_not_in_options`,
`duplicate_question`) SHALL have at least one test that asserts its HTTP status and `detail` code.
Coverage SHALL be measured over the API-owned modules and SHALL meet a bar of 80% of statements.

#### Scenario: Coverage bar is enforced

- **GIVEN** the suite and the coverage configuration are in place
- **WHEN** `poetry run pytest --cov=app --cov-fail-under=80` is run
- **THEN** the command exits with status 0

#### Scenario: Validation codes are asserted

- **GIVEN** a `POST /questions` request that violates exactly one authoring rule
- **WHEN** the request is sent
- **THEN** the response carries that rule's `detail` code and its mapped HTTP status

### Requirement: Lint gate

The project SHALL provide `poetry run ruff check .` and `poetry run ruff format --check .`, both of
which SHALL exit with status 0 on a tree that conforms to the configured rules.

#### Scenario: Conforming tree passes

- **GIVEN** the current tree conforms to the configured ruff rules
- **WHEN** `poetry run ruff check .` is run
- **THEN** it exits with status 0

#### Scenario: The gate can fail

- **GIVEN** a Python file containing an undefined name
- **WHEN** `poetry run ruff check` is run on it
- **THEN** it reports the violation and exits with a non-zero status

### Requirement: Type-check gate

The project SHALL provide `poetry run mypy app`, which SHALL exit with status 0 under the
configuration declared in `pyproject.toml`.

#### Scenario: Application package type-checks

- **GIVEN** the `app` package and the declared mypy configuration
- **WHEN** `poetry run mypy app` is run
- **THEN** it exits with status 0

### Requirement: Declared quality commands

`openspec/project.md` SHALL declare the one build command, the one test command, the one lint and
format command, the one type-check command, and the coverage bar. A change that adds or alters
observable behavior SHALL run these commands, or explicitly escalate the gap before implementation.

#### Scenario: The declaration replaces the placeholders

- **GIVEN** `openspec/project.md` after this change
- **WHEN** its § Runtime and language table is read
- **THEN** the test, lint, and type-check rows name the pytest, ruff, and mypy commands and no row
  reads "Not configured"
