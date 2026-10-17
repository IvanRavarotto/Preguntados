"""Shared fixtures.

Every test runs against a fresh in-memory SQLite database so the suite never
touches the development PostgreSQL instance and needs no network access.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.database import Base, get_db
from app.models import Categorization, Question


@pytest.fixture
def engine() -> Iterator:
    """A per-test in-memory SQLite engine with the application schema created."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def session_factory(engine) -> sessionmaker:
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def session(session_factory) -> Iterator[Session]:
    db = session_factory()
    yield db
    db.close()


@pytest.fixture
def client(engine, session_factory, monkeypatch) -> Iterator[TestClient]:
    """A TestClient bound to the in-memory database via the ``get_db`` seam."""
    monkeypatch.setattr(main, "engine", engine)

    def override_get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


def _make_question(
    db: Session,
    *,
    question: str,
    category: str,
    answer: str = "A",
    options: tuple[str, str, str, str] = ("A", "B", "C", "D"),
    automatic: bool = True,
    categorize: bool = True,
) -> Question:
    record = Question(
        question=question,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3],
        answer=answer,
        category=category if categorize else None,
        source="test",
    )
    db.add(record)
    db.flush()
    if categorize:
        db.add(
            Categorization(
                question_id=record.id,
                category_name=category,
                confidence_score=0.9,
                is_automatic=automatic,
            )
        )
    db.commit()
    db.refresh(record)
    return record


@pytest.fixture
def seed_question(session):
    """Insert a question (and by default its categorization); return the record."""

    def _seed(**kwargs) -> Question:
        return _make_question(session, **kwargs)

    return _seed


@pytest.fixture
def stub_ai_ok(monkeypatch):
    """Stub ``assess_question`` with a fixed plausible verdict."""

    def fake_assess(category: str, question: str, answer: str) -> dict:
        return {
            "plausible": True,
            "status": "valid",
            "reasons": [],
            "distractors": ["d1", "d2", "d3"],
        }

    monkeypatch.setattr(main, "assess_question", fake_assess)
    return fake_assess


@pytest.fixture
def stub_ai_error(monkeypatch):
    """Install an ``assess_question`` stub that raises ``AIValidationError``."""

    def install(status_code: int):
        from app.ai_validation import AIValidationError

        def fake_assess(category: str, question: str, answer: str) -> dict:
            raise AIValidationError("forced", status_code=status_code)

        monkeypatch.setattr(main, "assess_question", fake_assess)

    return install
