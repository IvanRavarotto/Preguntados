# Proposal

- **Change**: `harden-question-api`
- **Branch**: `docs/session-2026-10-22` — named by the human for this work; rename to
  `fix/harden-question-api` before any PR.
- **Owner role**: `dev`
- **Track**: 1 (Light) — API contract and the frontend code that consumes it; no schema change and no
  new dependency. The human listed the four defects and asked for them to be fixed directly.
- **Capability**: `question-api` (new)
- **Depends on**: `replace-backend-neural-classifier`

## Why

The back-end report found four defects in the contract between the API and the game, all reproduced
against the running stack:

1. **Catalog saturation.** `GET /questions/category/{name}` orders by `id`, and the game asks for 200,
   so every match draws from the same 1200 of 5000 questions; questions added from the form never
   appear.
2. **The answer travels to the browser.** Every question payload includes `answer`, so it is visible in
   the developer tools and the browser decides correctness.
3. **Validation.** `limit=-1` returns 500 from PostgreSQL; an unknown question id or category returns
   200.
4. **`category` means two things.** It is the CSV label in `/questions` and `/questions/{id}`, and the
   network's category in the game route; they differ for 15 questions.

## What changes

- The category route returns a random sample, so successive batches cover the whole category; the game
  fetches a fresh batch when the current one is used up.
- No question payload carries `answer`. Three routes resolve play on the server:
  `POST /questions/{id}/answer`, `POST /questions/{id}/reveal` and `POST /questions/{id}/eliminate`.
  The frontend uses them for answering, timeouts and the three jokers.
- `skip` and `limit` are validated (422 when out of range); unknown ids and categories return 404.
- Every question payload has one shape: `category` is always the network's, and the CSV label is
  `dataset_category`.

## Out of scope

- Server-side match state. Without it the server cannot tell whether a reveal or an elimination was
  earned, so a determined player can still call those routes from the developer tools. Closing that
  needs game sessions, which the product scope excludes today.
- Changing the `/categories/stats` contract.
