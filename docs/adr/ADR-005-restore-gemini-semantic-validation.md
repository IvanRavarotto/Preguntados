# ADR-005 — Gemini validates authored questions before the save

- **Status**: Accepted
- **Date**: 2026-10-29
- **Change**: `restore-gemini-question-validation`
- **Branch**: `feature/restore-gemini-question-validation`
- **Supersedes**: the Gemini-removal clause of ADR-004, for semantic validation only. The rest of
  ADR-004 stands.

## Context

`ADR-004` replaced the zero-shot classifier with the project's own MLP and removed Gemini in the same
step. That was two decisions in one record. The MLP predicts one of six categories from the question
text, and it does that well: 98.5% on the held-out split. It cannot tell whether a question is well
written, whether its four options relate to it, whether the distractors are plausible or actually
wrong, or whether the option the author marked as correct is true.

The authoring endpoint enforces structure only. Four distinct non-empty strings, an answer among them,
and no duplicate text (`app/question_authoring.py:71-83`). A question with a false marked answer is
accepted and served to the game, where it awards a crown for the wrong answer.

The human approved restoring Gemini as a pre-save semantic check, keeping the MLP as the categorizer,
and allowing the save when the provider is unavailable. The removed implementation
(`git show 2fc4407:app/ai_validation.py`) already carried a verdict and a distractor generator. Only
the verdict returns.

This is a request-path dependency on an external service and a new secret. `openspec/project.md` has no
LLM client on the request path, so this record is also the approved exception.

## Decision

We will add `POST /questions/validate` and an adapted `app/ai_validation.py`, backed by
`pydantic-ai-slim[google] (>=2.56.0,<3.0.0)` and Google Gemini.

- The route runs the existing structural validation first, then asks Gemini. It persists nothing and
  assigns no category.
- The verdict is `{plausible, status, reasons}` with `status` one of `valid`, `implausible`, or
  `uncertain`. `plausible` is derived from `status` on the server; the model produces only `status` and
  `reasons`.
- The prompt judges question clarity, option relevance, distractor plausibility and correctness, the
  marked answer's factual correctness, and, for true/false, the statement's truth value against the
  marked option. It does not judge the category.
- The key comes from `GEMINI_API_KEY`; the model from `GEMINI_MODEL`, defaulting to
  `gemini-3.5-flash`, then `gemini-3.8-flash`, then `gemini-flash-latest`. Each attempt has a 10 second
  timeout.
- A missing key is `503 gemini_api_key_missing`. Every model attempt failing is
  `502 ai_provider_error`. Neither is a verdict.
- The form keeps one submit control. `implausible` blocks the save and shows the reasons; `uncertain`
  and `502`/`503` save with a visible note; `valid` saves.
- Distractor generation does not return.

## Alternatives considered

- **Human review of every authored question.** Rejected by the product scope. There is no review queue,
  no reviewer role, and no place for one to keep state. A local two-player demo cannot carry a
  moderation workflow, and the store already accepts dataset questions with no review.
- **A local verifier.** Rejected. Answering "is this marked answer factually correct" needs factual
  knowledge the six-category MLP does not have, and a second local model would need training data the
  project does not hold. An LLM is the commodity that answers this, and the class demo already accepted
  a network dependency once (`ADR-002`).
- **Keep the current behavior.** Rejected by the approved intent. Structure-only validation lets a
  wrong answer into the game and gives the author no feedback. The cost of the wrong answer lands on the
  two players.
- **Validate inside `POST /questions`.** Rejected. It would make every save depend on the provider and
  change the existing 201 contract for callers that never asked for a check. A separate route lets the
  form show reasons before a row exists.
- **Block the save on `uncertain`.** Rejected. Model indecision is not evidence of a bad question, and
  blocking on it makes the provider's confidence the author's problem.
- **Keep the old distractors.** Rejected as out of scope. Rewriting the author's options is a different
  product decision and was not approved.

## Consequences

- **External dependency on the authoring path.** Authoring now depends on Google's availability. The
  game does not: it never calls Gemini.
- **A second secret.** `GEMINI_API_KEY` must reach the API process and the `api` container. Local use
  reads it from the environment or the gitignored `.env`; Compose passes it through. It must never be
  logged, returned, or committed, and the test suite runs without a real key by neutralizing the
  `.env` loader and faking the provider call.
- **Free-tier 503s.** Gemini's free tier returns transient `503 UNAVAILABLE` under load. Three model
  attempts absorb some of it; the rest becomes `502` and a save-with-note for the author.
- **Latency.** A verdict is a network round trip. The bound is three attempts at 10 seconds each, about
  30 seconds worst case, during which the submit button is disabled and the form says it is verifying.
  The common case is one attempt of a few seconds.
- **The answer is advisory.** A confident wrong verdict can flag a good question or pass a bad one. The
  author still owns the decision, and the block only applies to `implausible`, never to `uncertain` or
  an outage.
- **Mocked tests.** The suite cannot call Google. It replaces the provider call below the key check and
  below the fallback loop, so the suite stays hermetic while the 503 and 502 paths remain real code.
  The cost is that no automated test asserts the model's semantic judgement; QA verifies that with a
  live key, and the result is recorded rather than pinned.
- **Save on failure.** An outage can let an unchecked question into the store. That is the approved
  trade against blocking all authoring when Google is down, and the note is the visible signal.
- **Reversal.** Removing the feature is a route deletion, a module deletion, a dependency removal, and
  a frontend branch removal. No schema, no data migration.

## Relationship to ADR-004

ADR-004 decided two things: the MLP categorizes every question, and Gemini is removed. This record
keeps the first and reverses the second, only for semantic validation.

The category still comes from `MLPClassifier` and `app/modelo.pth` at save time. This change does not
pass a category to Gemini, does not ask Gemini to judge one, and does not alter `POST /questions` or
the `question-classification` capability. A reader who needs to know why the category is the MLP's
should read ADR-004. A reader who needs to know why Gemini is back should read this record and ADR-002,
whose pydantic-ai decision is revived in part. ADR-002's distractor half stays dead.
