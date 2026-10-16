# Tasks

## 1. Configuration and setup
- [ ] 1.1 Ensure .env has GEMINI_API_KEY (document regeneration/rotation; never commit)
- [ ] 1.2 Add config for GEMINI_MODEL (optional) via env
- [ ] 1.3 Add pydantic-ai usage guidance if needed (it's already installed)

## 2. AI validation service
- [ ] 2.1 Create pp/ai_validation.py with Pydantic models for validation result (plausible, reasons, status)
- [ ] 2.2 Implement validation using pydantic-ai with Gemini (provider google)
- [ ] 2.3 Implement distractor generation (exactly 3 distinct, plausible, different from correct)
- [ ] 2.4 Handle missing API key with clear error

## 3. API endpoints
- [ ] 3.1 Add POST /questions/validate that returns validation + generated distractors
- [ ] 3.2 Optionally integrate validation into add-question flow (flag implausible cases)
- [ ] 3.3 Return structured errors

## 4. Frontend integration
- [ ] 4.1 Add UI in start screen to use AI validation/generate distractors (optional if manual path exists)
- [ ] 4.2 Handle loading/errors

## 5. Testing & validation
- [ ] 5.1 Manual smoke test with valid/invalid cases
- [ ] 5.2 Verify no secrets logged
- [ ] 5.3 Run lint/typecheck if available
