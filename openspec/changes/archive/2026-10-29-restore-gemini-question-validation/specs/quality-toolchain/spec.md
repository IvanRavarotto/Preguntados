# Spec Delta

## MODIFIED Requirements

### Requirement: Automated behavioral test suite

The project SHALL provide a single command, `poetry run pytest`, that discovers and runs an automated
suite under `tests/`. The suite SHALL exercise the HTTP contract through FastAPI's `TestClient`
against an isolated database. The suite SHALL fake the AI provider at the call seam inside
`app.ai_validation` that sits below the API-key check and below the model fallback loop, so it runs
with no network call and without a real `GEMINI_API_KEY`, while the missing-key branch and the
fallback-to-`502` mapping stay covered by real code. Tests that need a key to reach the faked call
SHALL set a dummy value; the missing-key test SHALL remove it. A test that reaches the validation
endpoint without installing a fake SHALL fail with the guard's message before any outbound request,
rather than reach Google. The suite SHALL NOT read from or write to the development PostgreSQL
database.

#### Scenario: Suite runs green on the current tree

- **GIVEN** a clean checkout with dev dependencies installed
- **WHEN** `poetry run pytest` is run
- **THEN** the suite is discovered, executes, and exits with status 0

#### Scenario: Suite is hermetic

- **GIVEN** the development database is not running and `GEMINI_API_KEY` is unset
- **WHEN** `poetry run pytest` is run
- **THEN** the suite still executes and exits with status 0
- **AND** no test SHALL open a connection to a Google host

*Provenance: `[PRESERVE]` from the living spec, with the outbound assertion added by this change. The
faking is what makes the claim true; before this change the spec described a stub for a service the
tree did not have.*

#### Scenario: The fake sits below the key check

- **GIVEN** `GEMINI_API_KEY` is unset and the provider call seam is faked
- **WHEN** a structurally valid payload is posted to `POST /questions/validate`
- **THEN** the response SHALL be `503` with `gemini_api_key_missing`
- **AND** the fake SHALL NOT have been invoked

*Provenance: `[AUTHORED]`. The point is that a fake at the route level would bypass the code this test
exists to cover. The positive control is the sibling test with the key set, where the fake is invoked.*

#### Scenario: An unfaked call fails instead of reaching the network

- **GIVEN** the autouse fake is removed from a validation test
- **WHEN** that test runs
- **THEN** it SHOULD fail with the guard's message before any provider request
- **AND** the failure SHALL name the fake, so the cause is obvious from the output

*Provenance: `[AUTHORED]`; a plan, not a demonstrated red. The dev demonstrates this mutation once and
records the failure in the PR. If the fake is implemented so that an unfaked call succeeds, this
should redden.*

---

### Requirement: API contract coverage

The suite SHALL assert the observable contract of `GET /`, `GET /categories`, `GET /questions`,
`GET /questions/{id}`, `GET /questions/category/{name}`, `GET /categories/stats`,
`POST /questions`, and `POST /questions/validate`. Every authoring validation code
(`missing_fields`, `category_unknown`, `options_not_distinct`, `answer_not_in_options`,
`duplicate_question`) SHALL have at least one test that asserts its HTTP status and `detail` code.
The suite SHALL also assert `503` `gemini_api_key_missing` and `502` `ai_provider_error` from
`POST /questions/validate`, and the three verdict values with their `plausible` value. Coverage SHALL
be measured over the API-owned modules and SHALL meet a bar of 80% of statements.

#### Scenario: Coverage bar is enforced

- **GIVEN** the suite and the coverage configuration are in place
- **WHEN** `poetry run pytest --cov=app --cov-fail-under=80` is run
- **THEN** the command exits with status 0

#### Scenario: Validation codes are asserted

- **GIVEN** a `POST /questions` request that violates exactly one authoring rule
- **WHEN** the request is sent
- **THEN** the response carries that rule's `detail` code and its mapped HTTP status

#### Scenario: AI failure codes and verdicts are asserted

- **GIVEN** a structurally valid payload on each of the five validation outcomes: `valid`,
  `implausible`, `uncertain`, missing key, and every model failing
- **WHEN** the suite runs
- **THEN** each case SHALL assert the status code and, for the two failures, the exact `detail` code
- **AND** the three verdict cases SHALL assert the exact `status` value and its paired `plausible`
  value
- **AND** every case SHALL assert that the question count is unchanged

*Provenance: `[AUTHORED]` from the endpoint contract. The "count unchanged" assertion is the control
that separates "the endpoint returns a verdict" from "the endpoint saved a row and returned a verdict".*
