# ADR-002 — pydantic-ai with Gemini for question validation

- **Status**: Accepted
- **Date**: 2026-10-15
- **Change**: `validate-question-with-ai`

## Context

`add-question-authoring` validates a submitted question structurally — non-empty fields, four distinct
options, the correct answer among them, and no duplicate text. It cannot judge whether the question
*makes sense*: whether the stated correct answer is actually correct for that question, or whether the
category fits. It also stores whatever four options the author typed, so a weak author can ship a
question with three throwaway distractors.

`validate-question-with-ai` adds two capabilities on top: a plausibility judgement over
(category, question, correct answer), and generation of three plausible-but-wrong distractors. Both
need a language model.

`openspec/project.md` § Frameworks and libraries declared no LLM client for the request path. Its
existing model tooling — Transformers, PyTorch, the cached Hugging Face model — is offline
classification used by `app.categorize`, not request-time text generation. This is therefore a new
runtime dependency, not a variant of one already present: an approved deviation from the declared
stack, which is why this record exists.

The change's own `design.md` asserted that pydantic-ai was "already available per project context". It
was not: neither `pydantic_ai` nor any Google SDK was installed or declared in `pyproject.toml`. The
claim was corrected against the lockfile before any code was written.

## Decision

We will add **`pydantic-ai-slim[google]`** (resolving to `2.56.0`, pulling `google-genai`, `google-auth`,
and 17 more packages) as a request-path dependency, and use it to call Gemini through a typed agent.

- Provider: Google, via `GoogleProvider(api_key=…)` and `GoogleModel`.
- API key: read from `GEMINI_API_KEY`, never logged, never committed.
- Model: configurable via `GEMINI_MODEL`, defaulting to `gemini-2.5-flash`.
- Configuration source: a minimal, dependency-free loader reads the project `.env` at the service
  boundary and fills any variables not already present in the real environment.
- Structured results: pydantic models define the validation verdict (`plausible`, `status`, `reasons`)
  and the distractor list, so the model is constrained to a typed response rather than free text.
- The service lives in `app/ai_validation.py` and is import-safe and fail-closed: with no API key it
  raises a clear configuration error instead of importing-failing or silently proceeding.

## Alternatives considered

- **Call the Gemini REST API directly with `requests`.** Rejected. `requests` is already a dependency,
  but a direct call returns prose that must be parsed and re-validated by hand. pydantic-ai's typed
  output is the whole reason to take the dependency, and hand-rolled JSON extraction is exactly the
  fragile piece this change should not own.
- **Use the older `google-generativeai` SDK directly.** Rejected. It is the predecessor of the
  `google-genai` client the pydantic-ai google provider already wraps; adopting it would add a second,
  redundant Google client to the tree.
- **Run a local model (Ollama).** Rejected by the user. It also moves a per-question latency of seconds
  onto the author's machine and couples the classroom demo to a second local service.
- **Reuse the existing Transformers classifier.** Rejected. That model does zero-shot *classification*;
  it cannot generate distractors, which is half of what this change is for.
- **Add a config dependency (`python-dotenv`, `pydantic-settings`) to read `.env`.** Rejected. The
  project needs a dozen lines to read its own `.env` at one boundary; a dependency and a lockfile entry
  for that is not worth it, and the loader never overrides variables already set in the real
  environment, so deployment can still inject the key the usual way.

## Consequences

The authoring flow gains a real plausibility check and generated distractors, and the API can reject
questions whose stated answer the model judges wrong.

Three costs are accepted. **Twenty packages** enter the lockfile for a feature that is optional to the
game; the demo still runs without them because the import is guarded and the endpoint fails cleanly
when `GEMINI_API_KEY` is absent. **The request path now depends on a third-party network call**, so the
endpoint is asynchronous in cost and can fail on quota or connectivity; callers must treat a failed
validation as "not validated", never as "valid". **The model output is advisory.** A confident but
wrong judgement can flag a correct question or pass a bad one, so the human author, not the model, owns
the final decision, and the manual `POST /questions` path remains the source of truth.
