# QA report — `restore-gemini-question-validation`

| | |
|---|---|
| Change | `restore-gemini-question-validation` |
| Branch / commits | `feature/restore-gemini-question-validation`; `51b223c` plus this QA pass |
| Date | 2026-10-29 |
| Verdict | **PASS** |

## Environment

- Local API instances on `127.0.0.1:8001` through `:8006` against the Docker PostgreSQL 15
  database, each started for one probe and stopped afterwards. The V/F-era server on `:8001` served
  the current frontend file and was used for the browser checks with a stubbed AI.
- Docker `api` service rebuilt from the working tree and served on `http://localhost:8000`;
  `db` healthy; the dataset was already loaded, so the start-up loader skipped.
- Browser: Microsoft Edge `--headless=new` over CDP, Node 24.
- No question was persisted by the probes; `/questions/validate` writes nothing.

## Quality gates

| Gate | Command | Result |
|---|---|---|
| Tests + coverage (local) | `poetry run pytest --cov=app --cov-fail-under=80` | 109 passed, 100% (379/379), exit 0 |
| Tests + coverage (Compose) | `docker compose --profile test run --rm tests` | 109 passed, 100%, exit 0 |
| Lint | `poetry run ruff check .` | All checks passed |
| Format | `poetry run ruff format --check .` | 19 files already formatted |
| Types | `poetry run mypy app` | Success: no issues in 9 source files |
| OpenSpec | `openspec validate restore-gemini-question-validation --strict` | valid |

## Browser checks

Runner: `openspec/changes/restore-gemini-question-validation/checks/check_ai_authoring.mjs`
(`AI_AUTHORING_CHECK_PASS`, 21 assertions). `/questions/validate` and `/questions` are stubbed in the
page, so no Gemini call and no saved row.

| Area | Result |
|---|---|
| Exactly one submit control | PASS |
| `valid`: validate then save; no note; form resets to `multiple_choice` | PASS |
| `implausible`: no save; shows the model's reasons; keeps the input | PASS |
| `uncertain`: saves with `La IA no pudo confirmarla. Motivos: …` | PASS |
| `502`: saves with `No se pudo verificar con IA; se guardó igual.` | PASS |
| `503`: saves with the same unverified note | PASS |
| `400`: no save; existing four-option message | PASS |
| `409`: no save; duplicate message | PASS |
| True/false: validates first; payload has `question_type`, fixed A/B, empty C/D, radio answer | PASS |
| True/false `400`: copy says two options, not four | PASS |
| No uncaught page exception | PASS |
| `320x568`, `390x844`, `1440x900`: no horizontal overflow; note renders | PASS |

## Live probes (real Gemini key, never printed)

| Case | Result |
|---|---|
| No key (`GEMINI_API_KEY` blank) | `503 {"detail": "gemini_api_key_missing"}` |
| Invalid key | `502 {"detail": "ai_provider_error"}` after the fallback chain |
| Valid multiple-choice (Mona Lisa / Leonardo) | `200 {"plausible": true, "status": "valid", "reasons": []}` |
| Wrong marked answer (Mona Lisa / Pablo Picasso) | `200 {"plausible": false, "status": "implausible", "reasons": ["La respuesta marcada como correcta es Pablo Picasso, pero la Mona Lisa fue pintada por Leonardo da Vinci."]}` |
| True/false marked with the wrong truth value (Sol es una estrella / Falso) | `200 {"plausible": false, "status": "implausible", …}` with a reason explaining the statement is true |
| Irrelevant options (Mona Lisa with banana/table/chair) | `200 {"plausible": false, "status": "implausible", …}` because the distractors are not plausible |
| Container `POST /questions/validate` (valid and wrong answer) | Same 200 valid/implausible bodies as the local probes |

## Mutation evidence

- Removed the frontend `implausible` block and re-ran the browser check: the
  `implausible: shows the reason` assertion reddened with the generic message; restored the block and
  re-ran to `AI_AUTHORING_CHECK_PASS`.
- The dev recorded the other required mutations: always-valid reddens the implausible route test;
  hard-coded `plausible` reddens the uncertain test; provider-before-structure reddens the
  duplicate-with-no-key test to 503; removing the autouse fake fails at the egress guard instead of
  reaching Google.

## Regression

- `GET /` returns the game with both `#q-type` (true/false authoring) and the validate call.
- `GET /categories` and `GET /questions/category/{category}` answer normally.
- `POST /questions` is unchanged and the existing authoring suite stays green.
- The game never calls Gemini; only the authoring validate path does.

## Security note

During development, one `docker compose config` invocation printed the local `GEMINI_API_KEY` to a
console transcript. No key is present in the repository, the tests, the responses, or the logs, and
the suite neutralizes the `.env` loader. **Rotate the local key if that transcript was retained or
shared.**

## Not tested

- The model's judgement beyond the probes above; its semantic answers are not deterministic and are
  not pinned by the suite.
- A physical handset; viewports are emulated.
- Load, rate limiting, and cost controls; the API remains local-only and unauthenticated.
