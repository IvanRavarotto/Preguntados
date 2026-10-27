FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

RUN pip install --no-cache-dir "poetry>=2.2,<3"

WORKDIR /srv
COPY pyproject.toml poetry.lock poetry.toml ./
RUN poetry install --only main --no-root && rm -rf /root/.cache

COPY app ./app
COPY frontend ./frontend

FROM base AS test
RUN poetry install --only dev --no-root && rm -rf /root/.cache
COPY tests ./tests
CMD ["pytest", "--cov=app", "--cov-fail-under=80"]

FROM base AS runtime
EXPOSE 8000
CMD ["sh", "-c", "python -m app.load_dataset --if-missing && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
