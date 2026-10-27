# Tasks

## 1. Configuration and setup
- [x] 1.1 Ensure .env has GEMINI_API_KEY (document regeneration/rotation; never commit)
- [x] 1.2 Add config for GEMINI_MODEL (optional) via env
- [x] 1.3 Add pydantic-ai usage guidance if needed (recorded in project.md and ADR-002)

## 2. AI validation service
- [x] 2.1 Create app/ai_validation.py with Pydantic models for validation result (plausible, reasons, status)
- [x] 2.2 Implement validation using pydantic-ai with Gemini (provider google)
- [x] 2.3 Implement distractor generation (exactly 3 distinct, plausible, different from correct)
- [x] 2.4 Handle missing API key with clear error

## 3. API endpoints
- [x] 3.1 Add POST /questions/validate that returns validation + generated distractors
- [x] 3.2 Optionally integrate validation into add-question flow (flag implausible cases)
- [x] 3.3 Return structured errors

## 4. Frontend integration
- [x] 4.1 Add UI in start screen to use AI validation/generate distractors (optional if manual path exists)
- [x] 4.2 Handle loading/errors

## 5. Testing & validation
- [x] 5.1 Manual smoke test with valid/invalid cases
- [x] 5.2 Verify no secrets logged
- [x] 5.3 Run lint/typecheck if available

## Evidence

Phase 1:
- `.env` `GEMINI_API_KEY` present (39 chars, git-ignored); `GEMINI_MODEL` override via `get_model_name`, default `gemini-3.5-flash`.

Phase 2:
- `poetry add pydantic-ai-slim[google]` (^2.56.0) pulled `google-genai` 2.31.0; recorded in `openspec/project.md` and `docs/adr/ADR-002-pydantic-ai-gemini-validation.md`.
- `validate_content` returns `ValidationResult(plausible, status, reasons)`; `generate_distractors` returns exactly three distinct distractors; `assess_question` composes both.
- Missing key raises `AIValidationError("gemini_api_key_missing", 503)`.

Phase 3:
- `POST /questions/validate` maps `AIValidationError` to `HTTPException(exc.status_code, exc.detail)`; `POST /questions` behavior unchanged.
- Frontend `submitAuthoring` calls the validate endpoint first, blocks the save on `plausible=false`, and falls through to the manual save with a note when the AI is unreachable (502/503).

Phase 4:
- Start-screen form verifies the question with the AI before saving; status line shows "Verificando con IA…", the implausible reasons, and the per-case result.

Phase 5:
- `poetry run python -m compileall -q app` → OK; `import app.main` → OK; embedded JS syntax check via `vm.Script` → OK.
- Live smoke (service): implausible case → `plausible=false`, correct reasons ("La capital de Francia es París, no Madrid", category mismatch); plausible case (HDMI / cable de video) → `plausible=true`, `status=valid`.
- Live smoke (HTTP, uvicorn on :8001): `GET /openapi.json` lists `/questions/validate`; `POST /questions/validate` with an implausible question → `{plausible:false, status:"implausible", reasons:[...], distractors:[]}`.
- No secrets logged: the key is only read into the provider config and never printed or returned.

Notes:
- The Gemini free tier returns intermittent `503 UNAVAILABLE` under load; `_run` retries across `GEMINI_MODEL` plus fallback models (`gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-flash-latest`) and maps total failure to `ai_provider_error` (502). A 502/503 during authoring does not block the manual save.
- Lint/typecheck are not configured in this project (per `project.md`); syntax and import checks stand in for them.
