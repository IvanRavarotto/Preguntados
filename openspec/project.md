# Project declaration

## What this system is

Preguntados 1v1 is a local web quiz game for two people sharing one browser. FastAPI serves the game and exposes question data backed by PostgreSQL; the browser owns the game state, the classic six-color wheel, turn order, timer, answers, and score. The MVP must keep two players on the same device, show one playable turn at a time, and never award a point for an answer different from the stored answer.

The initial product is a local demonstration, not an authenticated or persistent multiplayer service. Player names are display labels only, and game state is lost on refresh.

## Runtime and language

| | |
|---|---|
| Language and version | Python 3.14.7 for the API and data tools; browser JavaScript is ES2020-compatible and is checked with Node.js 24 |
| Pinned by | `pyproject.toml` and `poetry.lock`; PostgreSQL is pinned to `postgres:15` in `docker-compose.yml` |
| One command to build | `poetry install` (the frontend has no bundling or compilation step) |
| One command to test | `poetry run python -m compileall -q app` for Python syntax; behavioral checks are HTTP smoke checks against a running server |
| One command to lint and format | Not configured; no Ruff, Black, or equivalent tool is installed |
| One command to type-check | Not configured; no mypy or pyright command is installed |
| Coverage bar | Not established; there is currently no automated test suite |

The missing lint, type-check, behavioral-test, and coverage commands are explicit pre-release gaps. A change that adds or changes game behavior must either add the relevant checks or explicitly escalate the gap before implementation.

## Frameworks and libraries

- **Web / API**: FastAPI `>=0.141.1,<0.142.0` owns HTTP routing, request validation, JSON serialization, and the root static-page response. Uvicorn `>=0.53.0,<0.54.0` runs the ASGI application on port `8000`.
- **Data access**: SQLAlchemy `>=2.1.0,<3.0.0` owns ORM models and sessions; `psycopg2-binary` `>=2.9.13,<3.0.0` is the PostgreSQL driver. The API owns database reads and startup table creation.
- **Background work**: There is no server-side worker or scheduler. `app.load_data`, `app.categorize`, and `app.human_review` are one-off local command-line tools. Transformers, PyTorch, and the cached Hugging Face model are used by the offline categorization workflow, not by the web request path.
- **Frontend**: `frontend/index.html` is a static HTML document with embedded CSS and vanilla JavaScript. It has no framework, bundler, or generated asset pipeline. The frontend owns the wheel animation, player names, turn indicator, 20-second timer, shuffled options, score, winner screen, and rematch flow.
- **Testing**: No automated test framework is configured. Verification currently consists of Python syntax/import checks, Node syntax checking of the embedded script, database queries, and HTTP smoke checks. Pandas is used by the CSV loader, not by the game UI.

The current dataset contains 300 questions and 300 categorization records, 50 per category across the six categories. Question records contain four option fields and an answer stored as the correct option text.

## Datastores

| Store | Holds | Migrations run by |
|---|---|---|
| PostgreSQL 15 database `questions_db` in Docker Compose | `questions` with question/options/answer/source data and `categorizations` with category, confidence, automatic/manual flag, and timestamp | SQLAlchemy `Base.metadata.create_all` during FastAPI startup; no Alembic or other migration tool is configured |

The local connection shape is `postgresql+psycopg2://<user>:<password>@localhost:5432/questions_db`. The database port is exposed on `localhost:5432`; the API uses port `8000`. Any schema change requires an explicit migration decision and must not be silently treated as a startup-only change.

## Game and API contract

- The game is played by two people in the same browser session.
- Names are trimmed, must be different from each other, and are limited by the current input controls.
- The first player is selected randomly. Players alternate turns.
- The wheel has six segments and uses the current neon category palette defined in `docs/adr/ADR-001-neon-category-palette.md` and the `game-presentation` spec for `arte`, `ciencia`, `deportes`, `entretenimiento`, `geografia`, and `historia`.
- A spin selects a category, then the game obtains a question and presents four options for 20 seconds.
- A correct answer adds one point; an incorrect answer or timeout adds zero points. The first player to reach 10 points wins.
- A question is not reused within a category during the current match. A rematch returns to the player-name screen and clears the current game state.
- The canonical existing route is plural: `GET /questions/{question_id}`. The singular `/question/{id}` path in the initial request is not the route currently implemented and must not be introduced without an approved API change.
- The current frontend obtains a category batch from `GET /questions/category/{category_name}?limit=200`; it also uses `GET /categories` and `GET /categories/stats`.
- The API root `GET /` serves the game. Interactive API documentation is available at `GET /docs`.

Verified response from `GET http://localhost:8000/questions/1`:

```json
{
  "question": "¿Quién pintó \"La Gioconda\"?",
  "option_c": "Leonardo da Vinci",
  "option_a": "Miguel Ángel",
  "answer": "Leonardo da Vinci",
  "source": "preguntados.csv",
  "id": 1,
  "option_b": "Rafael",
  "option_d": "Caravaggio",
  "category": "arte"
}
```

The API currently returns both the source category on `Question.category` and the selected categorization category on `Categorization.category_name`; clients must not assume those values are interchangeable.

## Identity and authorization

- **How a request proves who it is**: It does not. The MVP has no accounts, sessions, tokens, or authenticated browser identity.
- **Where the authorization check happens**: Nowhere yet, because the API is intended for local development only. There is no role or permission model.
- **Acting as the user versus as the service**: The browser is an untrusted client for rendering and input; FastAPI is the service that reads PostgreSQL. The client must not be trusted to decide scores, correctness, or authorization.
- **What gets audited, and where the event is emitted**: Nothing is audited. Scores, turns, and answers are client-side state and are not persisted.

Authentication, remote multiplayer, accounts, and durable score history are outside the initial scope.

## Secrets

- **Where they live**: Development database credentials are defined by the local Docker Compose configuration and are currently consumed by the local SQLAlchemy connection. The Hugging Face model cache is local under the user profile.
- **How a process obtains one**: Docker Compose supplies the local PostgreSQL configuration to the database container. The current application uses a local SQLAlchemy URL; production deployment must replace local/static configuration with environment-backed secret injection or a managed secret store.
- **Never**: production credentials, tokens, or private model credentials in source, logs, errors, test fixtures, manifests, or build artifacts. Local development credentials must never be reused outside this machine.

The current local credential arrangement is a development-only exception and must be recorded as an ADR before any deployment beyond the classroom/local setup.

## Service boundaries

| Service | Owns | Talks to | Over |
|---|---|---|---|
| Browser game (`frontend/index.html`) | Player names, wheel, turns, timer, options, score, winner and rematch state | FastAPI API | HTTP to `localhost:8000` |
| FastAPI application (`app/main.py`) | Routes, request validation, JSON responses, static frontend delivery, startup table creation | PostgreSQL through SQLAlchemy | HTTP/JSON on port `8000`; SQL on port `5432` |
| PostgreSQL 15 (`questions_db`) | Questions, options, answers, source metadata, and categorization records | Docker volume `postgres_data` | PostgreSQL protocol on `localhost:5432` |
| Local data tools (`app.load_data`, `app.categorize`, `app.human_review`) | CSV loading and offline categorization/review | PostgreSQL, local CSV, Hugging Face cache | Local process invocation; not a web service |

## Deployment

- **Target**: Windows 11 Pro with PowerShell 5.1, Docker Desktop, local PostgreSQL 15, and a local FastAPI/Uvicorn process listening on `0.0.0.0:8000` for same-network browser testing.
- **Pipeline**: No CI/CD pipeline is configured. The local startup sequence is Docker Compose for PostgreSQL, then `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- **Artifact signing**: Not applicable to the current local-only workflow. It becomes required before publishing a deployable artifact.
- **Infrastructure as code**: `docker-compose.yml` defines the local PostgreSQL service and persistent volume. No cloud infrastructure is declared.
- **Rollback bar**: Code-only changes should be reversible from Git without rebuilding the database. Database schema and data changes have no automated rollback path and require a separately reviewed plan.

## Observability

- **Log shape**: Uvicorn access and application errors go to the process console. The current local background launch redirects output to `%TEMP%\opencode\uvicorn-resume.log`.
- **Metrics**: No operational metrics collector is configured. `GET /categories/stats` exposes product/data counts only and must not be treated as infrastructure monitoring.
- **Correlation id**: None. A request or game-session correlation id must be added before structured logging or multi-user deployment is introduced.

## Conventions this project has settled

- Python modules live under `app/`; use `snake_case` names and import them through the `app` package.
- Run Python entry points with `poetry run python -m app.<module>` from the project root.
- Keep API route names and JSON field names stable unless an approved OpenSpec change explicitly changes the contract.
- Use SQLAlchemy sessions through the existing `get_db` dependency; do not create ad hoc database connections in route handlers.
- Keep the frontend as a static asset unless a change proposal introduces a build system or framework.
- Preserve the two-player same-browser scope, six-category wheel, turn alternation, 20-second timer, four-option question format, and first-to-10 scoring rule unless the product scope is changed.
- The frontend must remain usable at desktop and mobile viewport sizes and must provide visible feedback for correct, incorrect, and timed-out answers.
- API and database availability are prerequisites for loading questions; the frontend must handle an unavailable category request without crashing the page.
- Do not modify the local Docker Compose database contract as an incidental part of frontend work.

## Known baseline constraints

- There is no authentication, remote multiplayer, matchmaking, persistence, or deployment pipeline.
- There is no configured automated behavioral test suite, lint command, type-check command, or coverage threshold.
- The current local database connection is development-oriented and must be replaced with environment-backed configuration before production use.
- The current API route is `/questions/{id}`, not the initially suggested singular `/question/{id}` route.

## Recorded exceptions

| Deviation | Approved | ADR |
|---|---|---|
| Local Windows/Docker deployment with development database credentials | Local classroom baseline only; production use is not approved | Must be recorded before deployment |
| No authentication, persistence, or remote multiplayer | Initial MVP scope | Must be recorded if the scope changes |
| No automated lint, type-check, behavioral-test, or coverage toolchain | Known baseline gap; escalation required before release | Must be recorded before adding production release gates |
| Existing plural API route differs from the initially suggested singular route | Preserve the verified existing route; adding an alias requires a change proposal | Must be recorded before an API contract change |
