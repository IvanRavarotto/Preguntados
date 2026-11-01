# Tasks

## 1. API

- [x] 1.1 One response model for every question route, without `answer`; `category` is the network's
      and `dataset_category` the CSV label (ORM attribute renamed, database column unchanged).
- [x] 1.2 Random order in `GET /questions/category/{name}`.
- [x] 1.3 Validate `skip`/`limit`; 404 for unknown question ids and categories.
- [x] 1.4 `POST /questions/{id}/answer`, `/reveal` and `/eliminate`.

## 2. Frontend

- [x] 2.1 Check answers, timeouts and the three jokers through the new routes.
- [x] 2.2 Fetch a fresh random batch when the current one is used up; treat a non-OK response as an
      empty batch.

## 3. Checks

- [x] 3.1 Tests for every requirement scenario; `pytest --cov`, `ruff`, `mypy` in Docker.
- [x] 3.2 Reproduce the four defects as fixed against the running stack and play turns in the browser.
