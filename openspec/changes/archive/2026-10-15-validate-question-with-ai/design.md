# Design

## Overview
Adds AI-assisted validation and distractor generation using pydantic-ai with Gemini (provider: google). Provides a reusable service to validate (category, question, correct answer) for plausibility and to generate 3 plausible incorrect distractors. Also exposes an endpoint to validate/generate (or integrates into the add-question flow).

## Architecture
- Dependency: pydantic-ai (already available per project context). Provider google (Gemini). API key from GEMINI_API_KEY env var.
- Service: pp/ai_validation.py (or similar) defining Pydantic models for validation result and distractors using pydantic-ai.
- Endpoint: POST /questions/validate or integrate into POST /questions flow. Keep modular so both manual and AI-assisted paths work.
- Configuration: model name via env (e.g., GEMINI_MODEL default reasonable for free tier), temperature/config as needed.
- Security: never log API key; read from env only.

## Alternatives considered
- Use local models (Ollama): rejected by user preference.
- Use transformers classifier only: rejected because we need to validate plausibility and generate distractors (text generation), not just zero-shot classification.
- Call Gemini REST directly: rejected in favor of pydantic-ai for typed responses.

## Dependencies
- Depends on: dd-question-authoring (endpoint/persistence).
- External: pydantic-ai (present). Gemini API key required in .env.

## Migration
None.

## Notes
- Duplicate detection is separate (handled in add-question-authoring). AI focuses on plausibility and distractor generation.
- If GEMINI_API_KEY missing, return clear config error.
