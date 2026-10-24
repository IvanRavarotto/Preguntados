# Design

## Overview
This change adds:
1. A form on the start screen (rontend/index.html) to add a new question (category, question text, 4 options, correct answer).
2. A backend endpoint POST /questions (FastAPI) that validates input (non-empty, correct answer among options, distinct options), checks for duplicates, and persists to the database. New questions are also associated with a Categorization entry so they appear in category fetches.
3. Server-side persistence uses SQLAlchemy sessions and existing models (Question, Categorization).

Notes from user context:
- The user may later switch the database to HuggingFace (keep data access abstracted).
- AI validation/generation is handled by a separate change (alidate-question-with-ai) that depends on this endpoint; the endpoint should be callable in both manual and AI-assisted flows.

## Architecture
- Frontend: add a small form on the start screen, minimal JS to submit to POST /questions and show success/error.
- Backend: pp/main.py (or new router) adds POST /questions with Pydantic request model for validation. Response returns created question id.
- Data layer: reuse existing get_db, Question, Categorization models. Duplicate detection by normalized question text.
- Data abstraction: consider a small repository/service to allow swapping storage to HuggingFace later (interface over DB access).

## Alternatives considered
- Storing questions only client-side: rejected (not persisted across sessions; doesn't integrate with game).
- Adding in-memory endpoint only: rejected (doesn't match existing persistence model).

## Dependencies
- Depends on: econcile-project-declaration (done as Direct edit to openspec/project.md).
- New external deps: none (uses existing FastAPI/Pydantic/SQLAlchemy).

## Migration
No schema migration required beyond what Base.metadata.create_all already does (models unchanged).
