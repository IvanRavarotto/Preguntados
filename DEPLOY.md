# Deploy the full game

This deploys the complete app: the FastAPI API, PostgreSQL, the 5000-question dataset and the
PyTorch MLP classifier. The frontend is served by the same FastAPI process, so there is **no CORS
setup**. The container entrypoint runs `python -m app.load_dataset --if-missing` before starting
uvicorn, so the first boot fills the database and later boots reuse it.

Repository: `https://github.com/IvanRavarotto/Preguntados` (branch `main`).

## Option A - Render Blueprint (one click)

The repository includes `render.yaml`, which provisions the web service and a PostgreSQL database.

1. In Render: **New +** -> **Blueprint**.
2. Connect the `Preguntados` repository and apply the blueprint.
3. Render creates `preguntados-db` and the `preguntados` web service, injects `DATABASE_URL`, and
   runs the Dockerfile.
4. Open the web service URL when the deploy finishes. The first boot loads the 5000 questions.

Free-plan caveats:

- The free web instance has 512 MB of RAM. Loading torch + pandas + scikit-learn + the model can be
  tight; if the service runs out of memory or the first boot times out, move the web service to the
  **Starter** plan (2 GB).
- Free web services sleep after inactivity; the first request can take 30-60 seconds.
- Free Render databases have a limited lifetime. For a permanent deployment, create a free
  PostgreSQL at Neon or Supabase and set `DATABASE_URL` manually on the web service.

## Option B - Railway

1. **New Project** -> **Deploy from GitHub** -> select `Preguntados`.
2. Add **PostgreSQL** to the project.
3. In the web service, add a variable `DATABASE_URL` with the value
   `${{Postgres.DATABASE_URL}}` (Railway's reference syntax).
4. **Settings** -> **Networking** -> **Generate Domain**.
5. Deploy. The first boot loads the dataset.

Railway gives more memory than Render's free plan; 1 GB is a comfortable target.

## Option C - Fly.io

```bash
fly auth login
fly launch --dockerfile Dockerfile --name preguntados --region gru
fly postgres create --name preguntados-db --region gru
fly postgres attach preguntados-db -a preguntados
fly scale memory 1024
fly deploy
```

`fly postgres attach` sets `DATABASE_URL`. If the generated `fly.toml` uses a different internal
port, set `PORT` to the same value:

```toml
[env]
  PORT = "8080"
```

## Option D - Hugging Face Spaces + Neon (free, more RAM)

This is the easiest way to get 16 GB of RAM for free, at the cost of using two services.

1. Create a free PostgreSQL at Neon and copy its connection string.
2. Create a **Docker** Space on Hugging Face and push this repository to the Space remote.
3. In the Space settings, add `DATABASE_URL` (Neon) and `PORT=7860`.
4. Hugging Face may require the container to run as a non-root user; if it rejects the image, add a
   `USER 1000` stage and make `/srv` writable by that user.

## Vercel

Vercel is a good host for a **static frontend only**. The full backend is a poor fit: the function
bundle would include torch, pandas, scikit-learn, the 3.5 MB model and the CSV, and Vercel has no
persistent PostgreSQL. If you only need a playable demo, the dataset can be exported to JSON and the
frontend served statically; that is a separate deployment and drops live authoring/classification.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | in production | `postgresql://user:pass@host:5432/db`; `postgres://` is also accepted and normalized. |
| `PORT` | no | The container defaults to `8000`; platforms that inject `PORT` are honoured. |

## Post-deploy checklist

- `GET /` serves the game.
- `GET /categories/stats` returns `"total_questions": 5000`.
- `POST /classify` with a question returns a category and confidence.
- A turn can be played: spin, answer, use a joker, surrender, rematch.
- The authoring form saves a new question and shows the predicted category.

## Public-demo notes

- The authoring form is open. On a public URL, anyone can add questions. If that is not desired,
  hide `<details id="authoring">` for the demo or add an environment flag.
- The database is shared by every player. It survives restarts on a managed database, but deleting
  the database recreates it on the next boot.
- `load_dataset` is a CLI command, not an HTTP endpoint; it is not exposed to visitors.
