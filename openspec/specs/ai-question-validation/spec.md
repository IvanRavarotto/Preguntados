# ai-question-validation Specification

## Purpose
Use pydantic-ai with Gemini to validate that the provided category, question text, and correct answer are plausible, and to generate three plausible incorrect distractors when adding a question.

## Requirements

### Requirement: AI validation of question content
The system SHALL use pydantic-ai with Gemini (provider: google, model configurable via environment variable) to validate that the category, question text, and correct answer are plausible.

#### Scenario: Validating plausible content
- WHEN a question is submitted for AI validation
- THEN the system SHALL return a structured validation result indicating plausibility

#### Scenario: Flagging implausible content
- WHEN the AI determines the category, question, or correct answer is implausible
- THEN the system SHALL include reasons and a validation status in the result

### Requirement: AI-generated distractors
The system SHALL generate exactly three plausible but incorrect distractors for the question using pydantic-ai with Gemini.

#### Scenario: Generating distractors
- WHEN a question is valid
- THEN the system SHALL generate three distinct distractors that are plausible but incorrect

#### Scenario: Ensuring distractor quality
- WHEN distractors are generated
- THEN they SHALL be distinct from each other and from the correct answer

### Requirement: Secrets and configuration
The system SHALL read the Gemini API key from the GEMINI_API_KEY environment variable and allow configuring the model via environment variables.

#### Scenario: Missing API key
- WHEN the GEMINI_API_KEY is not configured
- THEN the system SHALL fail gracefully with a clear configuration error
