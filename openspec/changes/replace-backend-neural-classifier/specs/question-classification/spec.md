# Spec Delta

## ADDED Requirements

### Requirement: Questions are categorized by the project's neural network

The system SHALL assign every question one of the six categories — `arte`, `ciencia`, `deportes`,
`entretenimiento`, `geografia`, `historia` — using the `MLPClassifier` network whose weights are in
`app/modelo.pth`, applied to the TF-IDF vector of the question text. The vectorizer SHALL be the one the
weights were trained with, loaded from `app/vectorizador.joblib`, and the system SHALL refuse to start classifying when the weights' input size
does not match the vectorizer's vocabulary.

#### Scenario: Classifying a question

- **WHEN** a client sends `POST /classify` with a non-empty `question`
- **THEN** the response SHALL contain the predicted `category`, its `confidence_score`, and a
  `scores` object with one probability per category that sum to 1

#### Scenario: Rejecting an empty question

- **WHEN** a client sends `POST /classify` with an empty or blank `question`
- **THEN** the response SHALL be `400` with detail `missing_question`

#### Scenario: Accuracy on the held-out split

- **WHEN** the network classifies the 20% of the dataset held out during training
- **THEN** at least 95% of its predictions SHALL match the dataset's category

### Requirement: The game is served from the project's own dataset

The system SHALL load `app/trivia_latam_argentina.csv` into the database, keeping each question's
options (two for true/false questions, four otherwise), its answer, and its dataset category, and SHALL
store the network's category and probability as the question's categorization. The game SHALL fetch
questions by the network's category.

#### Scenario: Loading the dataset

- **WHEN** the API container starts against a database that does not hold the dataset
- **THEN** all 5000 questions SHALL be stored, each with an automatic categorization

#### Scenario: True/false questions

- **WHEN** a true/false question is fetched
- **THEN** `option_c` and `option_d` SHALL be `null`, and the game SHALL show only two options
