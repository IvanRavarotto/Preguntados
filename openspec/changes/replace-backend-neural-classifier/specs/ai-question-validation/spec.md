# Spec Delta

## REMOVED Requirements

### Requirement: AI validation of question content
**Reason**: The back end no longer calls Gemini; categorization is done by the project's own neural network.
**Migration**: `POST /questions/validate` is gone; clients call `POST /questions` directly, or `POST /classify` to preview the category.

### Requirement: AI-generated distractors
**Reason**: Removed together with the Gemini integration.
**Migration**: Authors type the four options themselves.

### Requirement: Secrets and configuration
**Reason**: No external AI service remains, so `GEMINI_API_KEY` and `GEMINI_MODEL` are no longer read.
**Migration**: Remove those variables from local `.env` files.
