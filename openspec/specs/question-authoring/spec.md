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

The start-screen form SHALL keep a single submit control. On submit it SHALL first call
`POST /questions/validate` with the same payload, then decide whether to call `POST /questions`:

- `status` `valid`: save, and show the assigned category and confidence with no AI note;
- `status` `uncertain`: save, and append a note that the AI could not confirm the question;
- `status` `implausible`: do not save, and show the returned reasons;
- validator unavailable (`502` or `503`): save, and append a note that the question could not be
  verified with AI;
- any other validator response: do not save, and show the existing error copy for that status.

These rules SHALL apply to `multiple_choice` and `true_false` alike. The form SHALL NOT offer a second
control that saves without verification, and it SHALL NOT offer a retry that skips it.

#### Scenario: Adding a valid question

- **GIVEN** the authoring form has four distinct non-empty options and one of them marked correct
- **WHEN** the user submits it without a `question_type`
- **THEN** the request SHALL be treated as `multiple_choice`
- **AND** the system SHALL persist the question with all four options and the network's category
- **AND** the response SHALL be `201` with exactly `id`, `category`, and `confidence_score`
- **AND** a subsequent fetch for that category SHALL include the question

*Provenance: `[PRESERVE]` from the living spec, the behavior in `app/question_authoring.py:92-121` and
`tests/test_authoring.py:14-35`, plus the response shape in `app/main.py:41-55`. The scenario name is
kept because a MODIFIED block replaces the whole requirement.*

#### Scenario: Rejecting invalid question

- **GIVEN** a submission as `multiple_choice` or `true_false`
- **WHEN** the correct answer is not among the type's options, an option is missing, or two options
  are equal
- **THEN** the system SHALL reject the submission with `400` and the matching `detail` code
- **AND** no question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` from the living spec and `app/question_authoring.py:71-83`. The scenario name
is kept because a MODIFIED block replaces the whole requirement.*

#### Scenario: Adding a valid true/false question

- **GIVEN** a submission with `question_type` `true_false`, `option_a` `Verdadero`, `option_b`
  `Falso`, and `correct_answer` equal to one of them
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `201` with exactly `id`, `category`, and `confidence_score`
- **AND** the stored record SHALL keep the submitted two options and answer
- **AND** the category SHALL be the one the network assigned to the question text
- **AND** a subsequent fetch for that category SHALL include the question

*Provenance: `[PRESERVE]` from the living spec. The classifier owns category assignment
(`app/question_authoring.py:101`, ADR-004), and this change does not alter that path.*

#### Scenario: A true/false record has no options C or D

- **GIVEN** a `true_false` submission that also carries non-empty `option_c` and `option_d`
- **WHEN** the question is accepted and read back through `GET /questions/{id}` and through
  `GET /questions/category/{category_name}`
- **THEN** `option_c` and `option_d` SHALL both be `null` in both responses
- **AND** the stored record SHALL have `NULL` in both database columns

*Provenance: `[PRESERVE]` from the living spec, matching the dataset shape. Measurable: both response
fields are `null`.*

#### Scenario: A true/false answer must be one of its two options

- **GIVEN** a `true_false` submission whose `correct_answer` is neither `option_a` nor `option_b`,
  including a value that appears only in the ignored `option_c` or `option_d`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `answer_not_in_options`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` from the living spec. The positive control is the valid true/false scenario
above.*

#### Scenario: A true/false question requires both options

- **GIVEN** a `true_false` submission with an empty `option_a` or `option_b`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `missing_fields`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` from the living spec.*

#### Scenario: A true/false question requires two distinct options

- **GIVEN** a `true_false` submission whose `option_a` equals `option_b`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `400` with detail `options_not_distinct`
- **AND** no question or categorization SHALL be persisted

*Provenance: `[PRESERVE]` from the living spec.*

#### Scenario: Multiple-choice validation and error codes are unchanged

- **GIVEN** a submission with no `question_type` or with `question_type` `multiple_choice`
- **WHEN** a field is empty, two options are equal, the answer is outside the four options, or the
  normalized question text duplicates an existing question
- **THEN** the endpoint SHALL return `400` `missing_fields`, `400` `options_not_distinct`,
  `400` `answer_not_in_options`, or `409` `duplicate_question`, respectively
- **AND** no other detail code SHALL replace any of those four for a multiple-choice payload

*Provenance: `[PRESERVE]` from the living spec and `tests/test_authoring.py:44-71`. Measurable: status
plus `detail` string for each of the four cases.*

#### Scenario: An unsupported question type is rejected without persisting

- **GIVEN** an otherwise valid payload whose `question_type` is neither `multiple_choice` nor
  `true_false`
- **WHEN** `POST /questions` receives it
- **THEN** the response SHALL be `422` and the question statistics SHALL remain unchanged
- **AND** the same payload with `question_type` `true_false` SHALL be accepted, proving the text
  itself is authorable

*Provenance: `[PRESERVE]` from the living spec. The 422 is FastAPI request validation of a Pydantic
`Literal` field.*

#### Scenario: Multiple choice is the default and behaves as before

- **GIVEN** the authoring form is opened for the first time
- **WHEN** the user inspects the form
- **THEN** the type selector SHALL show `multiple_choice`
- **AND** all four option rows SHALL be visible, editable, and radio-selectable
- **AND** submitting four distinct options SHALL succeed exactly as before

*Provenance: `[PRESERVE]` from the living spec; `frontend/index.html:590-624`, `:979-1000`.*

#### Scenario: Selecting true/false fixes the two options

- **GIVEN** the authoring form is open with text in any option row
- **WHEN** the user selects `true_false`
- **THEN** the A and B fields SHALL contain exactly `Verdadero` and `Falso` and SHALL be read-only but
  still submitted (the `readonly` attribute, not `disabled`)
- **AND** the C and D rows SHALL be hidden and their text values cleared
- **AND** if a C or D radio was selected, no radio SHALL remain selected until the user marks A or B
- **AND** only the A and B radios SHALL be visible and selectable

*Provenance: `[PRESERVE]` from the living spec. Measurable: the two values, the inputs' `readOnly`
property, the C/D rows' `hidden` state, and the checked radio.*

#### Scenario: A true/false submission carries the type and the two options

- **GIVEN** the user selected `true_false`, marked `Verdadero` or `Falso`, and entered a question
- **WHEN** the form is submitted
- **THEN** the request body SHALL carry `question_type: "true_false"`, `option_a: "Verdadero"`,
  `option_b: "Falso"`, empty `option_c` and `option_d`, and `correct_answer` equal to the marked value
- **AND** on success the status SHALL name the assigned category and its confidence, using the same
  response contract as a multiple-choice submission

*Provenance: `[PRESERVE]` from the living spec; the payload builder at `frontend/index.html:1021-1036`
and the status handler at `:1049-1074`. Measurable: the JSON body and the success text.*

#### Scenario: Returning to multiple choice restores the four-option form

- **GIVEN** the form is in `true_false` state
- **WHEN** the user selects `multiple_choice`
- **THEN** the C and D rows SHALL be visible and editable again
- **AND** the A and B fields SHALL be editable and SHALL no longer contain the fixed labels
- **AND** all four radios SHALL be visible and selectable

*Provenance: `[PRESERVE]` from the living spec; the form must not strand a user in the two-option
state.*

#### Scenario: Error copy matches the selected type

- **GIVEN** a submission has failed with `missing_fields` or `options_not_distinct`
- **WHEN** the status message is shown
- **THEN** for `true_false` it SHALL refer to two options and SHALL NOT say four
- **AND** for `multiple_choice` it SHALL still refer to four options

*Provenance: `[PRESERVE]` from the living spec; the mapping is at `frontend/index.html:1008-1019`.
Measurable: the rendered status text names the type's option count.*

#### Scenario: True/false authoring is usable on a phone and adds no breakpoint

- **GIVEN** the start screen with the authoring form open in `true_false` state at `320x568`,
  `360x640`, `390x844`, `844x390`, and `1440x900`
- **WHEN** the type selector, the two option fields, the two radios, and the submit control are used
- **THEN** every one of them SHALL be reachable and operable, scrolling the start panel internally
  where needed
- **AND** the document SHALL NOT scroll and the page SHALL NOT overflow horizontally
- **AND** the stylesheet's declared media queries SHALL remain exactly the existing `768px`, `1024px`,
  and wheel-only `640px` tiers

*Provenance: `[PRESERVE]` from the living spec and `openspec/project.md`. `[IMPL]`:
`#screen-start { overflow-y: auto }` at `frontend/index.html:150` and the `select` styling at
`:176-184`. The verification note text added by this change SHALL wrap inside the same status line
without changing the breakpoint set.*

#### Scenario: A valid verdict saves in one submit

- **GIVEN** the authoring form holds a structurally valid payload
- **WHEN** the user presses the single submit control and the validator returns `status` `valid`
- **THEN** the form SHALL call `POST /questions` exactly once
- **AND** the question count SHALL increase by one
- **AND** the success text SHALL name the assigned category and confidence and SHALL NOT contain an AI
  warning note

*Provenance: `[AUTHORED]` from the approved single-submit flow. Measurable: one save request, one new
row, and the absence of the note strings. The positive control for the absence is the `uncertain` and
unavailable scenarios below, where the same status line does contain a note.*

#### Scenario: An implausible verdict blocks the save and shows the reasons

- **GIVEN** the validator returns `status` `implausible` with reasons `["La respuesta marcada es
  incorrecta."]`
- **WHEN** the form receives that response
- **THEN** it SHALL NOT call `POST /questions`
- **AND** the question count SHALL be unchanged
- **AND** the status line SHALL contain the returned reason text
- **AND** the submit control SHALL be enabled again

*Provenance: `[AUTHORED]` from the approved block rule. The reason text is echoed rather than
rephrased, so the criterion is a substring check on the rendered status. This mutation should redden
it: make the form save on `implausible`.*

#### Scenario: An uncertain verdict saves with a note

- **GIVEN** the validator returns `status` `uncertain`
- **WHEN** the form receives that response
- **THEN** it SHALL call `POST /questions` once
- **AND** the question count SHALL increase by one
- **AND** the success text SHALL contain the note `La IA no pudo confirmarla.`
- **AND** the note SHALL be followed by `Motivos: ` and the returned reasons

*Provenance: `[AUTHORED]` from the approved save-on-uncertain rule, reusing the removed frontend's
note (`git show feature/validate-question-with-ai:frontend/index.html`, `submitAuthoring`) and adding
the reasons so the author sees why the AI hesitated. Measurable: the note substring, the reasons
substring, and the incremented count. The note text is distinct from the unavailable note, so a test
can tell the two save branches apart.*

#### Scenario: An unavailable validator saves with a note

- **GIVEN** the validator returns `502` with `ai_provider_error` or `503` with
  `gemini_api_key_missing`
- **WHEN** the form receives that response
- **THEN** it SHALL call `POST /questions` once
- **AND** the question count SHALL increase by one
- **AND** the success text SHALL contain the note `No se pudo verificar con IA; se guardó igual.`
- **AND** neither error code SHALL be shown as a failure

*Provenance: `[AUTHORED]` from the approved save-on-unavailable rule (`git show
feature/validate-question-with-ai:frontend/index.html`, the `unverified` branch). Measurable: both
error codes produce the same note and one saved row. This mutation should redden it: treat `503` as a
blocking error.*

#### Scenario: Both question types follow the same verdict rules

- **GIVEN** the form is in `true_false` state with `Verdadero` or `Falso` marked, and separately in
  `multiple_choice` state
- **WHEN** each is submitted and the validator returns `implausible`, then `uncertain`, then `valid`
- **THEN** each state SHALL block, save, and save respectively, exactly as the scenarios above describe
- **AND** the request sent to `POST /questions/validate` SHALL carry the selected `question_type`

*Provenance: `[AUTHORED]` from the approved "applies to both types" scope. Measurable: the request
bodies recorded by the test double and the per-case save count.*

#### Scenario: The form has no unverified save path

- **GIVEN** the start screen with the authoring form open
- **WHEN** the form's controls are inspected
- **THEN** there SHALL be exactly one submit control inside `#authoring-form`
- **AND** no control, keyboard shortcut, or state SHALL call `POST /questions` without first calling
  `POST /questions/validate`

*Provenance: `[AUTHORED]` from the approved single-submit rule. Measurable: the submit-control count
and the call order recorded by the test double. The current form has one button at
`frontend/index.html:621`.*

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
