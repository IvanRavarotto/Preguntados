# question-authoring Specification

## Purpose
Allow users to add a new question from the start screen, validate it server-side, and persist it so it becomes available in the game.

## Requirements

### Requirement: User can add a question from the start screen
The system SHALL allow a user to add a new question from the start screen by providing a category, the question text, four options, and the correct answer.

#### Scenario: Adding a valid question
- WHEN a user submits a valid question with a category, four distinct options, and the correct answer among them
- THEN the system SHALL persist the question and its categorization
- AND make it available for future matches

#### Scenario: Rejecting invalid question
- WHEN a user submits a question where the correct answer is not in the provided options or options are missing
- THEN the system SHALL reject the submission with a clear error

### Requirement: Server-side validation of duplicates and plausibility
The system SHALL validate that the question is not a duplicate and that the category, question, and correct answer are plausible.

#### Scenario: Detecting duplicate question
- WHEN a user submits a question that is a duplicate of an existing question
- THEN the system SHALL reject the submission with an error indicating the duplicate

#### Scenario: Detecting implausible category/question/answer
- WHEN the AI validation determines the category, question, or correct answer is implausible
- THEN the system SHALL reject or flag the submission accordingly

### Requirement: Questions are persisted
The system SHALL persist new questions in the database and associate them with the selected category so they appear in category fetches.

#### Scenario: Persisted question appears
- WHEN a question is successfully added
- THEN a subsequent fetch for its category SHALL include it
