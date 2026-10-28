# Proposal

- **Change**: `replace-backend-neural-classifier`
- **Branch**: `docs/session-2026-10-22` — named by the human for this work; it does not follow the
  `<type>/<change-name>` rule and must be renamed before any PR is opened.
- **Owner role**: `dev`
- **Track**: 2 (Full) — replaces the dataset, the categorization model, the schema, two API routes and
  the runtime packaging. Gates were not run as separate stops: the human set the goal directly and asked
  for the work to proceed without pausing. Gate C (merge) and Gate D (deploy) remain open.
- **Capabilities**: `question-classification` (new), `question-authoring` (modified),
  `ai-question-validation` (removed)
- **Decision reference**: `docs/adr/ADR-004-mlp-question-classifier.md`

## Why

The previous back end served 300 hand-curated questions whose categories were assigned offline by a
zero-shot Hugging Face pipeline, and validated authored questions against Gemini through
`pydantic-ai`. The project now owns its dataset — `app/trivia_latam_argentina.csv`, 5000 Spanish
trivia questions balanced across the six categories — and its own model: a multilayer perceptron
(`MLPClassifier(nn.Module)`) trained on TF-IDF vectors of those questions, whose weights are in
`app/modelo.pth`. The back end should serve that dataset and let that network decide each question's
category, with no external AI service in the loop.

## What changes

- **Removed**: `app/ai_validation.py` (Gemini), `app/classifier.py` and `app/categorize.py`
  (zero-shot), `app/human_review.py`, `app/load_data.py`, `preguntas_preguntados.csv`, the
  `POST /questions/validate` route, and the `transformers`, `sentence-transformers`,
  `pydantic-ai-slim`, `requests`, `tqdm` and `pyarrow` dependencies.
- **Added**: `app/neural_classifier.py` (the `MLPClassifier` network and a `QuestionClassifier` that
  rebuilds the training-time TF-IDF vectorizer and loads the weights), `app/load_dataset.py` (loads the
  CSV and stores the network's category for each question), and `POST /classify`.
- **Modified**: `POST /questions` no longer takes a category; the network assigns it and the response
  returns it with its probability. `option_c`/`option_d` become nullable because 1950 questions are
  true/false with two options. The frontend drops the category selector and the Gemini step, renders
  two-option questions, and disables "Eliminar dos" on them.
- **Packaging**: the API now runs in Docker next to PostgreSQL (`Dockerfile`, `api` and `tests`
  services in `docker-compose.yml`); `DATABASE_URL` is read from the environment.

## Out of scope

- Retraining the network or changing its architecture; the shipped weights are used as they are.
- Correcting the dataset rows the network disagrees with (15 of 5000).
- Persisting the fitted vectorizer as an artifact; it is rebuilt deterministically at start-up.
