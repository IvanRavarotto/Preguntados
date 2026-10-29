# question-authoring Specification

## Purpose
Allow users to add a new question from the start screen, validate it server-side, and persist it so it becomes available in the game.

## Requirements

### Requirement: User can add a question from the start screen

The system SHALL allow a user to add a new question from the start screen by providing the question
text, the options that match the selected question type, and the correct answer. The submission SHALL
carry an optional `question_type` whose accepted values are `multiple_choice` (the default when the
field is absent) and `true_false`. A `multiple_choice` question SHALL provide four distinct non-empty
options. A `true_false` question SHALL provide exactly two distinct non-empty options in `option_a`
and `option_b`; any `option_c` and `option_d` in the request SHALL be ignored and stored as `NULL`.
The correct answer SHALL equal exactly one of the options the selected type defines. The category
SHALL be assigned by the neural network, not chosen by the user. The success response SHALL remain
`{id, category, confidence_score}` with status `201`.

#### Scenario: Adding a valid question

- **GIVEN** the authoring form has four distinct non-empty options and one of them marked correct
- **WHEN** the user submits it without a `question_type`
- **THEN** the request SHALL be treated as `multiple_choice`
- **AND** the system SHALL persist the question with all four options and the network's category
- **AND** the response SHALL be `201` with exactly `id`, `category`, and `confidence_score`
- **AND** a subsequent fetch for that category SHALL include the question

*Provenance: `[PRESERVE]` — the living behavior in `app/question_authoring.py:61-72` and
`tests/test_authoring.py:14-35`, plus the response shape in `app/main.py:51-55`. The scenario name is
kept because a MODIFIED block replaces the whole requirement.*

#### Scenario: Rejecting invalid question

- **GIVEN** a submission as `multiple_choice` or `true_false`
- **WHEN** the correct answer is not among the type's options, an option is missing, or two options
  are equal
- **THEN** the system SHALL reject the submission with `400` and the matching `detail` code
- **AND** no question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` — existing behavior (`app/question_authoring.py:61-69`), extended to cover
both question types by the scenarios below. The scenario name is kept because a MODIFIED block
replaces the whole requirement.*

#### Scenario: Adding a valid true/false question

- **GIVEN** a submission with `question_type` `true_false`, `option_a` `Verdadero`, `option_b`
  `Falso`, and `correct_answer` equal to one of them
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `201` with exactly `id`, `category`, and `confidence_score`
- **AND** the stored record SHALL keep the submitted two options and answer
- **AND** the category SHALL be the one the network assigned to the question text
- **AND** a subsequent fetch for that category SHALL include the question

*Provenance: `[AUTHORED]` from the approved change intent. The classifier owns category assignment
today (`app/question_authoring.py:85`, ADR-004), and this change does not alter that path.*

#### Scenario: A true/false record has no options C or D

- **GIVEN** a `true_false` submission that also carries non-empty `option_c` and `option_d`
- **WHEN** the question is accepted and read back through `GET /questions/{id}` and through
  `GET /questions/category/{category_name}`
- **THEN** `option_c` and `option_d` SHALL both be `null` in both responses
- **AND** the stored record SHALL have `NULL` in both database columns

*Provenance: `[AUTHORED]`, matching the dataset shape (`openspec/project.md`: true/false rows have
`NULL` C/D; `tests/test_questions.py:48-59`). Measurable: both response fields are `null`.*

#### Scenario: A true/false answer must be one of its two options

- **GIVEN** a `true_false` submission whose `correct_answer` is neither `option_a` nor `option_b`,
  including a value that appears only in the ignored `option_c` or `option_d`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `answer_not_in_options`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[AUTHORED]` from the prescribed validation rule. The positive control is the valid
true/false scenario above: the same endpoint accepts the same payload when the answer is one of the
two options.*

#### Scenario: A true/false question requires both options

- **GIVEN** a `true_false` submission with an empty `option_a` or `option_b`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `missing_fields`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[AUTHORED]` from the prescribed validation rule. This reuses the existing
`missing_fields` code rather than inventing one.*

#### Scenario: A true/false question requires two distinct options

- **GIVEN** a `true_false` submission whose `option_a` equals `option_b`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `options_not_distinct`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[AUTHORED]` from the prescribed validation rule. This reuses the existing
`options_not_distinct` code.*

#### Scenario: Multiple-choice validation and error codes are unchanged

- **GIVEN** a submission with no `question_type` or with `question_type` `multiple_choice`
- **WHEN** a field is empty, two options are equal, the answer is outside the four options, or the
  normalized question text duplicates an existing question
- **THEN** the endpoint SHALL return `400` `missing_fields`, `400` `options_not_distinct`,
  `400` `answer_not_in_options`, or `409` `duplicate_question`, respectively
- **AND** no other detail code SHALL replace any of those four for a multiple-choice payload

*Provenance: `[PRESERVE]` — `app/question_authoring.py:61-72` and `tests/test_authoring.py:44-71`.
Measurable: status plus `detail` string for each of the four cases.*

#### Scenario: An unsupported question type is rejected without persisting

- **GIVEN** an otherwise valid payload whose `question_type` is neither `multiple_choice` nor
  `true_false`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `422` and the question statistics SHALL remain unchanged
- **AND** the same payload with `question_type` `true_false` SHALL be accepted, proving the text
  itself is authorable

*Provenance: `[AUTHORED]`; the 422 is FastAPI request validation of a Pydantic `Literal` field, read
from a local probe on FastAPI `0.141.1` and Pydantic `2.13.5` — an unsupported value returned `422`
with a list `detail`, while the valid value and the absent value were accepted (the latter defaulted
to `multiple_choice`). The positive control prevents a green result that only proves the endpoint
rejects everything.*

### Requirement: Questions are persisted
The system SHALL persist new questions in the database and associate them with the category assigned by the network so they appear in category fetches.

#### Scenario: Persisted question appears
- WHEN a question is successfully added
- THEN a subsequent fetch for its assigned category SHALL include it

### Requirement: Server-side duplicate detection

The system SHALL reject a question whose text, ignoring case and repeated whitespace, matches an
existing question. The rule SHALL apply identically to `multiple_choice` and `true_false` submissions.

#### Scenario: Detecting duplicate question

- **GIVEN** an existing question with the text under test
- **WHEN** a user submits a question whose normalized text matches it
- **THEN** the system SHALL respond `409` with detail `duplicate_question`
- **AND** no new question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` — `app/question_authoring.py:46-50`, `:71-72`; `tests/test_authoring.py:65-71`.*

#### Scenario: A duplicate true/false question is rejected by the same rule

- **GIVEN** an existing question whose text matches a pending `true_false` submission
- **WHEN** the user submits the true/false question
- **THEN** the system SHALL respond `409` with detail `duplicate_question`
- **AND** the status and detail SHALL be the same as for a duplicate multiple-choice submission

*Provenance: `[AUTHORED]` — the new type must not create a duplicate-detection bypass. Measurable:
status `409` and detail `duplicate_question`; the multiple-choice duplicate test is the control.*

### Requirement: The start-screen form offers a question type

The start-screen authoring form SHALL offer a question-type selector with `multiple_choice` selected
by default and `true_false` available. The form SHALL stay inside the existing collapsed
`<details>` secondary block, SHALL require no framework, bundler, or build step, and SHALL add no
media query. When `multiple_choice` is selected, the four option rows and their radio controls SHALL
behave exactly as today. When `true_false` is selected, the form SHALL fix `option_a` to `Verdadero`
and `option_b` to `Falso` as read-only values, hide the C and D rows, and leave the existing radio
group to choose the correct answer among the two visible options. The request SHALL carry
`question_type`, and the error status copy SHALL refer to two options for `true_false` and four
options for `multiple_choice`.

#### Scenario: Multiple choice is the default and behaves as before

- **GIVEN** the authoring form is opened for the first time
- **WHEN** the user inspects the form
- **THEN** the type selector SHALL show `multiple_choice`
- **AND** all four option rows SHALL be visible, editable, and radio-selectable
- **AND** submitting four distinct options SHALL succeed exactly as before

*Provenance: `[PRESERVE]` — `frontend/index.html:590-618`, `:989-1039`.*

#### Scenario: Selecting true/false fixes the two options

- **GIVEN** the authoring form is open with text in any option row
- **WHEN** the user selects `true_false`
- **THEN** the A and B fields SHALL contain exactly `Verdadero` and `Falso` and SHALL be read-only but
  still submitted (the `readonly` attribute, not `disabled`)
- **AND** the C and D rows SHALL be hidden and their text values cleared
- **AND** if a C or D radio was selected, no radio SHALL remain selected until the user marks A or B
- **AND** only the A and B radios SHALL be visible and selectable

*Provenance: `[AUTHORED]` from the approved form behavior. Measurable: the two values, the inputs'
`readOnly` property, the C/D rows' `hidden` state, and the checked radio.*

#### Scenario: A true/false submission carries the type and the two options

- **GIVEN** the user selected `true_false`, marked `Verdadero` or `Falso`, and entered a question
- **WHEN** the form is submitted
- **THEN** the request body SHALL carry `question_type: "true_false"`, `option_a: "Verdadero"`,
  `option_b: "Falso"`, empty `option_c` and `option_d`, and `correct_answer` equal to the marked value
- **AND** on success the status SHALL name the assigned category and its confidence, using the same
  response contract as a multiple-choice submission

*Provenance: `[AUTHORED]`; reuses the payload builder at `frontend/index.html:989-1002` and the status
handler at `:1015-1039`. Measurable: the JSON body and the success text.*

#### Scenario: Returning to multiple choice restores the four-option form

- **GIVEN** the form is in `true_false` state
- **WHEN** the user selects `multiple_choice`
- **THEN** the C and D rows SHALL be visible and editable again
- **AND** the A and B fields SHALL be editable and SHALL no longer contain the fixed labels
- **AND** all four radios SHALL be visible and selectable

*Provenance: `[AUTHORED]`; the form must not strand a user in the two-option state.*

#### Scenario: Error copy matches the selected type

- **GIVEN** a submission has failed with `missing_fields` or `options_not_distinct`
- **WHEN** the status message is shown
- **THEN** for `true_false` it SHALL refer to two options and SHALL NOT say four
- **AND** for `multiple_choice` it SHALL still refer to four options

*Provenance: `[AUTHORED]` from the approved "status messages adapt" requirement. The current mapping
is at `frontend/index.html:977-987`. Measurable: the rendered status text names the type's option
count.*

#### Scenario: True/false authoring is usable on a phone and adds no breakpoint

- **GIVEN** the start screen with the authoring form open in `true_false` state at `320x568`,
  `360x640`, `390x844`, `844x390`, and `1440x900`
- **WHEN** the type selector, the two option fields, the two radios, and the submit control are used
- **THEN** every one of them SHALL be reachable and operable, scrolling the start panel internally
  where needed
- **AND** the document SHALL NOT scroll and the page SHALL NOT overflow horizontally
- **AND** the stylesheet's declared media queries SHALL remain exactly the existing `768px`, `1024px`,
  and wheel-only `640px` tiers

*Provenance: `[PRESERVE]` — `openspec/project.md`: "The frontend must remain usable at desktop and
mobile viewport sizes"; `openspec/specs/game-presentation/spec.md` fixes the breakpoint set and the
`mobile-layout-overflow` delta established the panel's internal scrolling. `[IMPL]` —
`#screen-start { overflow-y: auto }` at `frontend/index.html:150` and the existing `select` styling at
`:176-184`.*
