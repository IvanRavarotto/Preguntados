# Tasks

## 1. Backend: Add POST /questions endpoint
- [x] 1.1 Define Pydantic request model (category, question, options A-D, correct_answer)
- [x] 1.2 Add validation: all fields non-empty, correct_answer in options, 4 distinct options
- [x] 1.3 Duplicate detection: case-insensitive normalized comparison
- [x] 1.4 Persist Question and Categorization
- [x] 1.5 Return created question id and success response

## 2. Frontend: Add form to start screen
- [x] 2.1 Add form UI on frontend/index.html (start screen section) with fields: category, question, options A-D, correct answer
- [x] 2.2 Add minimal JS to submit to POST /questions
- [x] 2.3 Show success/error messages; clear form on success

## 3. Testing
- [x] 3.1 Test valid submission -> HTTP 201, `{"id": <n>}`
- [x] 3.2 Test invalid (wrong correct answer -> 400 `answer_not_in_options`; duplicate -> 409 `duplicate_question`)
- [x] 3.3 Verify question appears in category fetches (`GET /questions/category/{name}` includes it, `is_automatic=false`)

## 4. Validation
- [x] 4.1 Run `poetry run python -m compileall -q app` (OK) and HTTP smoke test against the running server
- [x] 4.2 No lint/typecheck command is configured in `openspec/project.md`; gap recorded as a baseline constraint

## Evidence
- `app/question_authoring.py` (`create_question`, `validate_question`)
- `app/main.py` (`POST /questions`, status 201)
- `frontend/index.html` (`#authoring-form`, `initAuthoring`, `submitAuthoring`)
- Smoke test 2026-10-15: 201 id=8203; 400 `answer_not_in_options`; 409 `duplicate_question`; category fetch includes created row (id=8204); test rows deleted, DB back to 300/300
