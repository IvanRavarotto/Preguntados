# Spec Delta

## ADDED Requirements

### Requirement: Semantic validation endpoint

The system SHALL expose `POST /questions/validate`, which accepts the same body as `POST /questions`:
`question_type`, `question`, `option_a` to `option_d`, and `correct_answer`. On a successful check it
SHALL return `200` with exactly three keys: `plausible` (boolean), `status` (`valid`, `implausible`, or
`uncertain`), and `reasons` (array of strings). `plausible` SHALL be `true` if and only if `status` is
`valid`. `reasons` SHALL contain at least one entry whenever `status` is not `valid`, and its entries
SHALL be short, human-readable, Spanish sentences. The endpoint SHALL NOT persist a question, create a
categorization, or assign a category, and its response SHALL NOT contain a `distractors` key or a
category.

The provider verdict SHALL judge all of the following, for both question types:

- the question text is clear, well formed, and answerable on its own;
- every option is relevant to the question;
- every distractor is plausible, factually incorrect, distinct from the other options, and not a
  paraphrase of the marked answer;
- the marked answer is factually correct and is the only defensible option;
- for `question_type` `true_false`, the statement's truth value matches the marked option.

The provider SHALL NOT be asked to judge the question's category.

#### Scenario: A valid multiple-choice question

- **GIVEN** a structurally valid `multiple_choice` payload
- **WHEN** `POST /questions/validate` receives it and the provider returns `status` `valid`
- **THEN** the response SHALL be `200` with `plausible` `true`, `status` `valid`, and `reasons` an array
- **AND** the created-question count and the categorization count in `GET /categories/stats` SHALL be
  the same after the call as before it
- **AND** no question from the payload SHALL appear in `GET /questions` or in its would-be category

*Provenance: `[AUTHORED]` from the approved intent, and `[PRESERVE]` for the response shape of the
removed endpoint (`git show 2fc4407:app/main.py`, `POST /questions/validate`). Measurable: the three
keys, the boolean, the unchanged counts.*

#### Scenario: An implausible question blocks on the verdict and explains why

- **GIVEN** a structurally valid payload whose marked answer is factually wrong
- **WHEN** the provider returns `status` `implausible` with at least one reason
- **THEN** the response SHALL be `200` with `plausible` `false`, `status` `implausible`, and a
  non-empty `reasons` array
- **AND** the reason text SHALL be shown to the author by the form (see the `question-authoring` delta)
- **AND** nothing SHALL be persisted

*Provenance: `[AUTHORED]` from the approved intent. Measurable: status, `plausible`, a non-empty
`reasons` array, and unchanged stats. The positive control is the valid scenario above: the same
endpoint returns `valid` for a payload the provider accepts, so a blanket `implausible` implementation
does not pass.*

#### Scenario: An uncertain verdict is distinguishable from both other verdicts

- **GIVEN** a structurally valid payload on which the provider cannot decide beyond reasonable doubt
- **WHEN** the provider returns `status` `uncertain`
- **THEN** the response SHALL be `200` with `plausible` `false`, `status` `uncertain`, and at least
  one reason
- **AND** nothing SHALL be persisted

*Provenance: `[AUTHORED]` from the approved save-on-uncertain rule. Measurable: `status` is the
literal `uncertain` and `plausible` is `false`. The `question-authoring` delta distinguishes this from
`implausible` by the save outcome.*

#### Scenario: Irrelevant options are flagged

- **GIVEN** a structurally valid `multiple_choice` payload whose options are unrelated to the question
  text
- **WHEN** the endpoint is called against the real provider
- **THEN** the verdict SHALL be `status` `implausible`
- **AND** at least one reason SHALL refer to the options or the distractors

*Provenance: `[AUTHORED]` from the approved prompt criteria. This is a live verification, not an
offline test: the suite fakes the provider, so it cannot assert what the model judges. QA runs this
case with a real key and records the response. Measurable: the literal status and one reason that
names the options. Out of scope: a deterministic offline oracle for semantic quality.*

#### Scenario: A false statement marked true is implausible

- **GIVEN** a `true_false` payload whose statement is false and whose `correct_answer` is the option
  meaning "true"
- **WHEN** the endpoint is called against the real provider
- **THEN** the verdict SHALL be `status` `implausible`
- **AND** at least one reason SHALL refer to the statement's truth value

*Provenance: `[AUTHORED]` from the approved true/false criterion. Live verification by QA, as above.
Positive control: the same statement with the option meaning "false" marked SHALL return `valid`.*

#### Scenario: Both question types are accepted

- **GIVEN** one `multiple_choice` payload with four options and one `true_false` payload with two
  options, both structurally valid
- **WHEN** each is posted to `POST /questions/validate`
- **THEN** each SHALL return `200` with the three-key verdict shape
- **AND** the `true_false` call SHALL be evaluated on options A and B only

*Provenance: `[AUTHORED]` from the approved scope. The `true_false` shape and its ignored C/D are the
living contract at `openspec/specs/question-authoring/spec.md`.*

---

### Requirement: Structural validation precedes the provider

`POST /questions/validate` SHALL apply the existing structural rules before it calls the provider, with
the same `detail` codes and HTTP statuses as `POST /questions`: `400` `missing_fields`, `400`
`options_not_distinct`, `400` `answer_not_in_options`, and `409` `duplicate_question`. A structurally
invalid payload SHALL NOT reach the provider. When both a structural defect and a missing or failing
provider are present, the structural error SHALL win.

#### Scenario: Structural codes are unchanged

- **GIVEN** a payload that violates exactly one structural rule
- **WHEN** `POST /questions/validate` receives it
- **THEN** the response SHALL carry that rule's `detail` code and its mapped status
- **AND** no verdict body SHALL be returned

*Provenance: `[PRESERVE]` for the codes and statuses (`app/question_authoring.py:71-83`), extended to
the validation route by this change.*

#### Scenario: A duplicate is rejected without a provider call

- **GIVEN** an existing question and a payload whose normalized text matches it
- **WHEN** `POST /questions/validate` receives it with `GEMINI_API_KEY` unset
- **THEN** the response SHALL be `409` with detail `duplicate_question`
- **AND** it SHALL NOT be `503` or `502`

*Provenance: `[AUTHORED]` from decision 2 of the proposal. Measurable: the exact status. This scenario
is the ordering guard: if the provider call moved above the structural check, it should redden with
`503`. The complementary case, a non-duplicate payload with the same unset key, should return `503`,
which is the positive control for the key path.*

#### Scenario: Structural errors from the validator block the save

- **GIVEN** the authoring form submits a payload that the validator rejects as `400` or `409`
- **WHEN** the form receives that response
- **THEN** it SHALL NOT call `POST /questions`
- **AND** the question count SHALL be unchanged
- **AND** it SHALL show the existing message for that code

*Provenance: `[AUTHORED]`; the form's copy table is in the `question-authoring` delta. The same
structural rule is also enforced by `POST /questions`, so this criterion is about the wasted call and
the message, not about data integrity.*

---

### Requirement: Provider configuration and failure mapping

The provider SHALL be Google Gemini, reached through `pydantic-ai` with the `google` extra. The API key
SHALL be read from `GEMINI_API_KEY`. The model name SHALL be read from `GEMINI_MODEL`, defaulting to
`gemini-3.5-flash`, and SHALL be tried first, followed by `gemini-3.8-flash` and `gemini-flash-latest`,
with duplicates removed. A missing or blank key SHALL return `503` with detail
`gemini_api_key_missing` before any provider call. A model attempt SHALL count as failed when the
provider raises (transport, timeout, quota, HTTP error, or a safety block) or when its output does not
validate as the verdict schema, including an out-of-enum `status`. An empty `reasons` list SHALL NOT
count as a failure: it SHALL be normalized to a fallback reason and returned with the verdict. When
every model attempt fails, the endpoint SHALL return `502` with detail `ai_provider_error`. The
endpoint SHALL NOT return `200` when no verdict was produced, SHALL NOT downgrade a failed attempt to
`uncertain`, and the key SHALL NOT appear in any response body.

#### Scenario: Missing key returns 503 and never calls the provider

- **GIVEN** `GEMINI_API_KEY` is unset or blank and the payload is structurally valid
- **WHEN** `POST /questions/validate` receives it
- **THEN** the response SHALL be `503` with detail `gemini_api_key_missing`
- **AND** the provider call seam SHALL NOT have been invoked

*Provenance: `[PRESERVE]` from the removed implementation (`git show 2fc4407:app/ai_validation.py`,
`get_api_key`) and the approved intent. The negative assertion has a positive control: with the key set
and the same payload, the seam is invoked. Without that control, the assertion would pass in a build
where the route never calls the provider at all.*

#### Scenario: Every model failing returns 502

- **GIVEN** a structurally valid payload and a key, with the provider call failing for every candidate
- **WHEN** `POST /questions/validate` receives it
- **THEN** the response SHALL be `502` with detail `ai_provider_error`
- **AND** the provider call seam SHALL have been invoked once per candidate, in the order configured
- **AND** the response SHALL NOT contain `plausible`, `status`, or `reasons`

*Provenance: `[AUTHORED]` from the approved intent, reusing the `ai_provider_error` code from the
removed implementation. Measurable: the status, the detail, the call count, and the absence of a
verdict. The call count is the control that proves the fallback loop ran rather than a single attempt.*

#### Scenario: The configured model is tried first

- **GIVEN** `GEMINI_MODEL` is set to a non-default name and `GEMINI_API_KEY` is set
- **WHEN** the provider is invoked
- **THEN** the first attempted model SHALL be the configured name
- **AND** the attempted names SHALL contain no duplicates

*Provenance: `[PRESERVE]` from `git show 2fc4407:app/ai_validation.py`, `_model_candidates`. Measurable
through the recorded calls of the test fake.*

#### Scenario: An unusable model response falls back rather than becoming a verdict

- **GIVEN** the first candidate returns output that does not match the verdict schema and a later
  candidate returns a valid verdict
- **WHEN** `POST /questions/validate` receives a structurally valid payload
- **THEN** the response SHALL be `200` with the later candidate's verdict
- **AND** the response SHALL NOT expose which model produced it

*Provenance: `[AUTHORED]` from the approved fallback behavior. Measurable: a `200` verdict after a
first-attempt failure.*

#### Scenario: The key never leaves the process

- **GIVEN** `GEMINI_API_KEY` is set to a distinctive value
- **WHEN** the endpoint returns `200`, `502`, or `503`
- **THEN** that value SHALL NOT appear in the response body
- **AND** the error detail SHALL be the stable code, not provider exception text

*Provenance: `[AUTHORED]` from `openspec/project.md` § Secrets. Measurable: substring search of the
response body for the key value, and equality of the detail code.*
