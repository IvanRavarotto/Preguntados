# Spec Delta

## MODIFIED Requirements

### Requirement: User can add a question from the start screen
The system SHALL allow a user to add a new question from the start screen by providing the question text, four options, and the correct answer. The category SHALL be assigned by the neural network, not chosen by the user.

#### Scenario: Adding a valid question
- WHEN a user submits a valid question with four distinct options and the correct answer among them
- THEN the system SHALL persist the question and the category the network assigned to it
- AND return that category and its probability
- AND make it available for future matches

#### Scenario: Rejecting invalid question
- WHEN a user submits a question where the correct answer is not in the provided options or options are missing
- THEN the system SHALL reject the submission with a clear error

### Requirement: Questions are persisted
The system SHALL persist new questions in the database and associate them with the category assigned by the network so they appear in category fetches.

#### Scenario: Persisted question appears
- WHEN a question is successfully added
- THEN a subsequent fetch for its assigned category SHALL include it

## REMOVED Requirements

### Requirement: Server-side validation of duplicates and plausibility
**Reason**: Plausibility was judged by Gemini, which is removed. Duplicate detection is kept and moves to the requirement below.
**Migration**: None for clients; `POST /questions` still answers `409 duplicate_question`.

## ADDED Requirements

### Requirement: Server-side duplicate detection
The system SHALL reject a question whose text, ignoring case and repeated whitespace, matches an existing question.

#### Scenario: Detecting duplicate question
- WHEN a user submits a question that is a duplicate of an existing question
- THEN the system SHALL reject the submission with an error indicating the duplicate
