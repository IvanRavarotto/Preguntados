# Proposal

- **Change**: `restore-gemini-question-validation`
- **Branch when authorized**: `feature/restore-gemini-question-validation`
- **Owner role**: `dev`
- **Track**: 2 (Full). The change adds a request-path runtime dependency, a new outbound service
  boundary to Google, a new route, a new capability spec, and a trust-boundary decision about
  untrusted question text entering a model prompt. It does not add a schema or a migration.
- **Capability**: `ai-question-validation` (new), plus deltas to `question-authoring` and
  `quality-toolchain`
- **Depends on**: none active. The changes this builds on are already merged into `main` at `aabe35a`:
  `support-true-false-authoring` (the `question_type` contract and the two-option form) and
  `replace-backend-neural-classifier` (the MLP as the only categorizer). `openspec list` reports no
  active change.

## Why

`ADR-004` removed Gemini and left the MLP as the only automated check on an authored question. The MLP
predicts a category from the question text and does nothing else. It does not know whether the question
is well written, whether the four options relate to it, whether the distractors are plausible or
actually wrong, or whether the option the author marked as correct is correct. Today a save is accepted
on structure alone: four distinct non-empty strings and an answer among them. An author can store a
question whose marked answer is false, and the game will score it.

The human approved restoring Gemini as a semantic check before the save, with the MLP still assigning
the category, and with the save allowed when the provider is unavailable.

## What Changes

- **New route.** `POST /questions/validate` takes the same body as `POST /questions`, runs the existing
  structural validation (`missing_fields`, `options_not_distinct`, `answer_not_in_options`,
  `duplicate_question`), then asks Gemini for a verdict. It persists nothing and assigns no category.
  Success is `200` with `{plausible, status, reasons}`.
- **Semantic criteria.** The prompt judges question clarity, option relevance, distractor plausibility
  and correctness, the marked answer's factual correctness and unambiguity, and, for `true_false`, the
  statement's truth value against the marked option. It does not judge the category; that stays with
  the MLP.
- **Provider contract.** Key from `GEMINI_API_KEY`, model from `GEMINI_MODEL` with the default and
  fallback chain carried over from the removed implementation. Missing key is `503`
  `gemini_api_key_missing`; every model attempt failing is `502` `ai_provider_error`.
- **Frontend.** One submit control. The form validates first: `valid` saves, `uncertain` saves with a
  note, `implausible` blocks and shows the reasons, `502`/`503` saves with a note that it could not be
  verified, other statuses block with the existing copy. Applies to both question types.
- **Dependency.** `pydantic-ai-slim[google] (>=2.56.0,<3.0.0)` returns to `[project].dependencies`, and
  an adapted `app/ai_validation.py` returns with the distractor path deleted.
- **Tests.** The suite fakes the provider call, so it runs with no key and no network, while still
  exercising the missing-key branch and the fallback-to-502 branch.
- **Docs.** New `docs/adr/ADR-005-restore-gemini-semantic-validation.md`, and `openspec/project.md`
  updated for the framework, secret, service boundary, observability, constraint, and exception rows.

## Decisions

1. **The verdict, not the boolean, drives the frontend.** `plausible` is derived on the server from
   `status`: true if and only if `status` is `valid`. The model is asked for `status` and `reasons`
   only. That removes the class of output where a model returns `plausible: true` with
   `status: uncertain`, which the old frontend would have treated differently from the new rule.
2. **Structural validation runs before the provider.** A duplicate or a missing option never costs a
   network call, keeps its existing status and code, and cannot degrade to `503` because the key is
   missing. This is observable: a duplicate payload with no key still returns `409`.
3. **`uncertain` saves, `implausible` blocks.** A model that cannot decide should not be a wall
   between an author and a save. A model that has decided the question is broken should be.
4. **An unavailable provider saves, with a visible note.** `502` and `503` are not verdicts. Treating
   them as "not validated" is the behavior the human approved and the behavior the removed frontend
   already had.
5. **The AI does not see or judge the category.** The old prompt received a category from the user and
   judged fit. The category is now the MLP's decision (`ADR-004`), so passing a category would reintroduce
   a choice the user no longer makes.
6. **No distractor generation.** The removed module also generated three distractors. That path, its
   second output model, and its retry logic are out of scope; the form keeps the author's own options.
7. **Bounded latency.** Each attempt uses a 10 second client timeout, and the fallback chain has at
   most three model names. Worst case is about 30 seconds, during which the submit button is disabled
   and the status line says the question is being verified.

## Impact

- **Files**: `pyproject.toml`, `poetry.lock`, `app/ai_validation.py` (new), `app/main.py`,
  `frontend/index.html`, `docker-compose.yml` (environment passthrough), `tests/conftest.py`,
  `tests/test_question_validation.py` (new), `openspec/project.md`, `docs/adr/ADR-005-...`.
  `app/question_authoring.py` and the `POST /questions` contract do not change.
- **Runtime**: the API image grows by `pydantic-ai-slim` and `google-genai`. Startup is unchanged;
  the Gemini imports stay inside `_build_agent`, so an unconfigured or offline process still starts.
- **Secrets**: `GEMINI_API_KEY` becomes the second secret the local process reads. It must reach the
  `api` container, which currently receives only `DATABASE_URL`.
- **Failure modes**: a slow or quota-limited Gemini adds latency to authoring and can turn a save into
  a save-with-note. The game itself never calls Gemini.
- **Tests**: no new test dependency. The fake replaces `_invoke_agent`, below the key check and the
  fallback loop.
- **Privacy**: the question, its options, and the marked answer leave the machine for Google. This is
  local, non-personal content, but it is new egress and is recorded in `openspec/project.md`.

## Out of Scope

- Distractor generation, automatic option rewriting, or any editing help.
- AI judgement of the category, or a second categorization opinion.
- Persisting verdicts, caching them, or showing them after the save.
- Rate limiting, retries at the HTTP layer, or a queue for validation.
- Authenticating the validation endpoint. It inherits the local-only, unauthenticated boundary that
  every other route has.
- Changing `POST /questions`, the database schema, or the game flow.
- A second save control, a "save anyway" confirmation, or a bypass that skips verification.
