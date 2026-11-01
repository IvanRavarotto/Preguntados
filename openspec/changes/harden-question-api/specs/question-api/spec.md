# Spec Delta

## ADDED Requirements

### Requirement: Question payloads have one shape and never include the answer

Every route that returns questions SHALL return the same fields: `id`, `question`, `option_a`,
`option_b`, `option_c`, `option_d` (`null` for true/false questions), `category`, `confidence_score`,
`is_automatic`, `dataset_category` and `source`. `category` SHALL always be the category assigned by the
neural network; `dataset_category` SHALL be the dataset's own label, or `null` for questions added from
the form. No route that returns questions SHALL include the correct answer.

#### Scenario: The game batch hides the answer

- **WHEN** a client requests `GET /questions/category/{name}`, `GET /questions` or
  `GET /questions/{id}`
- **THEN** no returned question contains an `answer` field

#### Scenario: Category means the same in every route

- **GIVEN** a question whose network category differs from its dataset label
- **WHEN** it is fetched through `GET /questions/{id}` and through `GET /questions/category/{name}`
- **THEN** both report the network's category as `category` and the dataset label as
  `dataset_category`

### Requirement: Category batches are random samples

`GET /questions/category/{name}` SHALL return up to `limit` questions of that category in random order,
so that repeated requests draw from the whole category. The game SHALL request a new batch when every
question of its current batch has been used in the match.

#### Scenario: Repeated batches differ

- **GIVEN** a category with more questions than `limit`
- **WHEN** the batch is requested twice
- **THEN** the two batches are not the same sequence of questions

### Requirement: Answers, reveals and eliminations are resolved by the server

`POST /questions/{id}/answer` SHALL take `{answer, reveal}` and return `{correct, correct_answer}`;
`correct_answer` SHALL be `null` when `reveal` is `false`, so a second attempt does not expose the
answer. `answer` SHALL be one of the question's options or `null`. `POST /questions/{id}/reveal` SHALL
return `{correct_answer}`. `POST /questions/{id}/eliminate` SHALL return two distinct incorrect options
of a four-option question, and SHALL answer `409 not_enough_options` for a two-option question.

#### Scenario: Checking an answer

- **WHEN** a client submits one of the options with `reveal: true`
- **THEN** the response says whether it is correct and names the correct option

#### Scenario: A hidden first attempt

- **WHEN** a client submits a wrong option with `reveal: false`
- **THEN** `correct` is `false` and `correct_answer` is `null`

#### Scenario: An option that does not belong to the question

- **WHEN** a client submits an answer that is not one of the question's options
- **THEN** the response is `400` with detail `answer_not_in_options`

### Requirement: Invalid requests are rejected with the right status

`skip` SHALL be `0` or greater and `limit` SHALL be between `1` and `1000`; values outside those
ranges SHALL be answered with `422`. A question id that does not exist SHALL be answered with `404`
`question_not_found`, and a category name outside the six SHALL be answered with `404`
`category_unknown`.

#### Scenario: A negative limit

- **WHEN** a client requests `GET /questions?limit=-1`
- **THEN** the response is `422`, not `500`

#### Scenario: Missing resources

- **WHEN** a client requests a question id that does not exist, or a category that does not exist
- **THEN** the response is `404`
