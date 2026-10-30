# Tasks

## 1. Model and dataset

- [x] 1.0 Load the exported vectorizer from `app/vectorizador.joblib`, re-exported with scikit-learn
      1.9.1 by `scripts/export_vectorizer.py` and verified identical to the original 1.6.1 export.
- [x] 1.1 Rebuild the training-time TF-IDF vectorizer from `app/trivia_latam_argentina.csv` (80/20
      stratified split, seed 42, `max_features=5000`, English stop words) and confirm its vocabulary
      matches the 3360 inputs of `app/modelo.pth`.
- [x] 1.2 Add `app/neural_classifier.py` with `MLPClassifier(nn.Module)` and `QuestionClassifier`;
      refuse weights whose input size does not match the vocabulary.
- [x] 1.3 Add `app/load_dataset.py`; store every question with the network's category and probability.

## 2. API and schema

- [x] 2.1 Make `option_c` and `option_d` nullable; the loader recreates the schema.
- [x] 2.2 Remove `POST /questions/validate` and the Gemini module.
- [x] 2.3 Let the network assign the category in `POST /questions`; add `POST /classify`.
- [x] 2.4 Read `DATABASE_URL` from the environment.

## 3. Frontend

- [x] 3.1 Render two-option (true/false) questions and disable "Eliminar dos" on them.
- [x] 3.2 Remove the category selector and the AI verification step from the authoring form.

## 4. Packaging and checks

- [x] 4.1 Add the `Dockerfile` (runtime and test targets) and the `api`/`tests` Compose services.
- [x] 4.2 Drop the unused dependencies and regenerate `poetry.lock` (CPU-only torch).
- [x] 4.3 `pytest` with coverage, `ruff check`, `ruff format --check`, `mypy app` in the test image.
- [x] 4.4 Smoke-check the running stack: `/`, `/categories/stats`, `/questions/category/{name}`,
      `/classify`, `POST /questions`, and a turn in the browser.
