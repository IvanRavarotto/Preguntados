# Project declaration

## What this system is

Preguntados 1v1 is a local web quiz game for two people sharing one browser. FastAPI serves the game and exposes question data backed by PostgreSQL; the browser owns the game state, the classic six-color wheel, turn order, timer, answers, and score. The MVP must keep two players on the same device, show one playable turn at a time, and never award a point for an answer different from the stored answer.

The initial product is a local demonstration, not an authenticated or persistent multiplayer service. Player names are display labels only, and game state is lost on refresh.

## Runtime and language

| | |
|---|---|
| Language and version | Python 3.14.7 for the API and data tools; browser JavaScript is ES2020-compatible and is checked with Node.js 24 |
| Pinned by | `pyproject.toml` and `poetry.lock`; PostgreSQL is pinned to `postgres:15` in `docker-compose.yml` |
| One command to build | `docker compose build` (API image from `Dockerfile`; locally, `poetry install` also works). The frontend has no bundling or compilation step |
| One command to test | `docker compose --profile test run --rm tests` (or `poetry run pytest`) — a hermetic suite over the HTTP contract, run against an in-memory SQLite database with the real neural classifier |
| One command to lint and format | `poetry run ruff check .` and `poetry run ruff format --check .` (Ruff, configured in `pyproject.toml`) |
| One command to type-check | `poetry run mypy app` (mypy, configured in `pyproject.toml`) |
| Coverage bar | `poetry run pytest --cov=app --cov-fail-under=80` — 80% of statements across every module in `app/` (the `tests` Compose service runs exactly this) |

Test, lint, format, and type-check commands are provided by the `quality-toolchain` capability
(see `docs/adr/ADR-003-pytest-ruff-mypy-toolchain.md`). A change that adds or changes behavior must run
these commands, or explicitly escalate the gap before implementation.

## Frameworks and libraries

- **Web / API**: FastAPI `>=0.141.1,<0.142.0` owns HTTP routing, request validation, JSON serialization, and the root static-page response. Uvicorn `>=0.53.0,<0.54.0` runs the ASGI application on port `8000`.
- **Data access**: SQLAlchemy `>=2.1.0,<3.0.0` owns ORM models and sessions; `psycopg2-binary` `>=2.9.13,<3.0.0` is the PostgreSQL driver. The API owns database reads and startup table creation.
- **Question classification**: PyTorch `>=2.14.0,<3.0.0` (CPU-only wheel from the `pytorch-cpu` Poetry source) runs `MLPClassifier(nn.Module)` in `app.neural_classifier`, with the trained weights in `app/modelo.pth`. scikit-learn `>=1.9.1,<1.10.0` rebuilds the training-time TF-IDF vectorizer from `app/trivia_latam_argentina.csv` at start-up; it is pinned to the minor version the weights were trained with. The network assigns the category of every loaded and every authored question. See `docs/adr/ADR-004-mlp-question-classifier.md`.
- **Background work**: There is no server-side worker or scheduler. `app.load_dataset` is the one-off loader; the API container runs it with `--if-missing` before Uvicorn starts.
- **Frontend**: `frontend/index.html` is a static HTML document with embedded CSS and vanilla JavaScript. It has no framework, bundler, or generated asset pipeline. The frontend owns the wheel animation, player names, turn indicator, 20-second timer, shuffled options, score, winner screen, and rematch flow.
- **Testing**: pytest `>=9.1.1,<10.0.0` and `pytest-cov` back `tests/`, which drives the FastAPI app through `TestClient` against an isolated in-memory SQLite database and uses the real classifier, so the suite needs no network and no API key. `httpx` provides the test-client transport, `ruff` the lint/format gate, and `mypy` the type-check gate — all dev-only dependencies. Pandas reads the dataset CSV for the loader and the classifier, not for the game UI.

The dataset is `app/trivia_latam_argentina.csv`: 5000 questions, about 833 per category, 3050 with four options and 1950 true/false questions with two (`option_c` and `option_d` are `NULL`). Every question has one automatic categorization produced by the network. The answer is stored as the correct option text.

## Datastores

| Store | Holds | Migrations run by |
|---|---|---|
| PostgreSQL 15 database `questions_db` in Docker Compose | `questions` with question/options/answer/source data and `categorizations` with category, confidence, automatic/manual flag, and timestamp | SQLAlchemy `Base.metadata.create_all` during FastAPI startup. `python -m app.load_dataset` drops and recreates both tables before loading; no Alembic or other migration tool is configured |

The API reads its connection URL from `DATABASE_URL` (Compose sets it to the `db` service); without it the default is `postgresql+psycopg2://<user>:<password>@localhost:5432/questions_db`. The database port is exposed on `localhost:5432`; the API uses port `8000`. Any schema change requires an explicit migration decision and must not be silently treated as a startup-only change.

## Game and API contract

- The game is played by two people in the same browser session.
- Names are trimmed, must be different from each other, and are limited by the current input controls.
- The first player is selected randomly. Players alternate turns.
- The wheel has six segments and uses the current neon category palette defined in `docs/adr/ADR-001-neon-category-palette.md` and the `game-presentation` spec for `arte`, `ciencia`, `deportes`, `entretenimiento`, `geografia`, and `historia`.
- A spin selects a category, then the game obtains a question and presents its options (four, or two for true/false) for 20 seconds.
- A correct answer advances progress toward claiming a crown; collecting six crowns wins. An incorrect answer or timeout adds zero points and may change turn. The exact crown and joker rules are defined by the `gameplay` capability.
- A question is not reused within a category during the current match. A rematch returns to the player-name screen and clears the current game state.
- The canonical existing route is plural: `GET /questions/{question_id}`. The singular `/question/{id}` path in the initial request is not the route currently implemented and must not be introduced without an approved API change.
- The current frontend obtains a category batch from `GET /questions/category/{category_name}?limit=200`; it also uses `GET /categories` and `GET /categories/stats`.
- `POST /questions` creates an authored question (text, four options, correct answer); the network assigns its category and the response is `{id, category, confidence_score}`. `POST /classify` returns the network's `category`, `confidence_score` and per-category `scores` for a `question` without storing it.
- The API root `GET /` serves the game. Interactive API documentation is available at `GET /docs`.

Verified response from `GET http://localhost:8000/questions/category/geografia?limit=1`:

```json
[{
  "id": 6,
  "question": "¿Cuál es la capital de Cuba?",
  "option_a": "Bogotá",
  "option_b": "Caracas",
  "option_c": "La Habana",
  "option_d": "Santiago",
  "answer": "La Habana",
  "category": "geografia",
  "confidence_score": 0.9999750852584839,
  "is_automatic": true
}]
```

`Question.category` holds the dataset's own label and `Categorization.category_name` the network's; the game uses the network's. They differ for 15 of the 5000 questions, so clients must not assume they are interchangeable.

## Identity and authorization

- **How a request proves who it is**: It does not. The MVP has no accounts, sessions, tokens, or authenticated browser identity.
- **Where the authorization check happens**: Nowhere yet, because the API is intended for local development only. There is no role or permission model.
- **Acting as the user versus as the service**: The browser is an untrusted client for rendering and input; FastAPI is the service that reads PostgreSQL. The client must not be trusted to decide scores, correctness, or authorization.
- **What gets audited, and where the event is emitted**: Nothing is audited. Scores, turns, and answers are client-side state and are not persisted.

Authentication, remote multiplayer, accounts, and durable score history are outside the initial scope.

## Secrets

- **Where they live**: Development database credentials are defined by the local Docker Compose configuration and are currently consumed by the local SQLAlchemy connection. The application uses no other secret; the neural network runs locally.
- **How a process obtains one**: Docker Compose supplies the local PostgreSQL configuration to the database container. The API container receives `DATABASE_URL` from Compose; production deployment must replace this local/static configuration with environment-backed secret injection or a managed secret store.
- **Never**: production credentials, tokens, or private model credentials in source, logs, errors, test fixtures, manifests, or build artifacts. Local development credentials must never be reused outside this machine.

The current local credential arrangement is a development-only exception and must be recorded as an ADR before any deployment beyond the classroom/local setup.

## Service boundaries

| Service | Owns | Talks to | Over |
|---|---|---|---|
| Browser game (`frontend/index.html`) | Player names, wheel, turns, timer, options, score, winner and rematch state | FastAPI API | HTTP to `localhost:8000` |
| FastAPI application (`app/main.py`, Docker service `api`) | Routes, request validation, JSON responses, static frontend delivery, startup table creation, question classification with the MLP network | PostgreSQL through SQLAlchemy | HTTP/JSON on port `8000`; SQL on port `5432` |
| PostgreSQL 15 (`questions_db`) | Questions, options, answers, source metadata, and categorization records | Docker volume `postgres_data` | PostgreSQL protocol on `localhost:5432` |
| Dataset loader (`app.load_dataset`) | Loading `app/trivia_latam_argentina.csv` and storing the network's categories | PostgreSQL | Run by the `api` container at start-up, or `docker compose exec api python -m app.load_dataset`; not a web service |

## Deployment

- **Target**: Windows 11 Pro with Docker Desktop: PostgreSQL 15 and the FastAPI/Uvicorn API, both as Compose services, the API listening on `0.0.0.0:8000` for same-network browser testing.
- **Pipeline**: No CI/CD pipeline is configured. The local startup is `docker compose up -d --build`; the API waits for the database health check, loads the dataset if it is missing, then starts Uvicorn.
- **Artifact signing**: Not applicable to the current local-only workflow. It becomes required before publishing a deployable artifact.
- **Infrastructure as code**: `Dockerfile` builds the API (`runtime` target) and the test runner (`test` target); `docker-compose.yml` defines the `db`, `api` and `tests` (profile `test`) services and the persistent volume. No cloud infrastructure is declared.
- **Rollback bar**: Code-only changes should be reversible from Git without rebuilding the database. Database schema and data changes have no automated rollback path and require a separately reviewed plan.

## Observability

- **Log shape**: The loader summary, Uvicorn access logs and application errors go to the `api` container's console (`docker compose logs api`).
- **Metrics**: No operational metrics collector is configured. `GET /categories/stats` exposes product/data counts only and must not be treated as infrastructure monitoring.
- **Correlation id**: None. A request or game-session correlation id must be added before structured logging or multi-user deployment is introduced.

## Conventions this project has settled

- Python modules live under `app/`; use `snake_case` names and import them through the `app` package.
- Run Python entry points with `poetry run python -m app.<module>` from the project root.
- Keep API route names and JSON field names stable unless an approved OpenSpec change explicitly changes the contract.
- Use SQLAlchemy sessions through the existing `get_db` dependency; do not create ad hoc database connections in route handlers.
- Keep the frontend as a static asset unless a change proposal introduces a build system or framework.
- Preserve the two-player same-browser scope, six-category wheel, turn alternation, 20-second timer, four-option question format, and crown-based win condition (six crowns) unless the product scope is changed.
- The frontend must remain usable at desktop and mobile viewport sizes and must provide visible feedback for correct, incorrect, and timed-out answers.
- API and database availability are prerequisites for loading questions; the frontend must handle an unavailable category request without crashing the page.
- Do not modify the local Docker Compose database contract as an incidental part of frontend work.

## Known baseline constraints

- There is no authentication, remote multiplayer, matchmaking, persistence, or deployment pipeline.
- Automated test, lint, format, and type-check commands and an 80% coverage bar are provided by the `quality-toolchain` capability; the offline data tools are excluded from coverage by design.
- The current local database connection is development-oriented and must be replaced with environment-backed configuration before production use.
- The current API route is `/questions/{id}`, not the initially suggested singular `/question/{id}` route.

## Recorded exceptions

| Deviation | Approved | ADR |
|---|---|---|
| Local Windows/Docker deployment with development database credentials | Local classroom baseline only; production use is not approved | Must be recorded before deployment |
| No authentication, persistence, or remote multiplayer | Initial MVP scope | Must be recorded if the scope changes |
| Automated lint, type-check, behavioral-test, and coverage toolchain added as dev-only dependencies | Approved by the `add-quality-toolchain` change | `docs/adr/ADR-003-pytest-ruff-mypy-toolchain.md` |
| Existing plural API route differs from the initially suggested singular route | Preserve the verified existing route; adding an alias requires a change proposal | Must be recorded before an API contract change |
