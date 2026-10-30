"""Shared fixtures.

Every test runs against a fresh in-memory SQLite database so the suite never
touches the development PostgreSQL instance and needs no network access. The
neural classifier is the real one, built once per test session from the
dataset and weights shipped in ``app/``.
"""

from __future__ import annotations

import ipaddress
import socket
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import ai_validation, main
from app.database import Base, get_db
from app.models import Categorization, Question

OUTBOUND_NETWORK_GUARD = "outbound network is blocked in tests"


class OutboundNetworkBlocked(BaseException):
    """Raised by the test egress guard.

    It derives from ``BaseException`` so application error mapping cannot turn a
    test that reached the network into a normal ``502`` response.
    """


def _is_loopback_host(host) -> bool:
    if not isinstance(host, str):
        return False
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def _is_loopback(address) -> bool:
    if not isinstance(address, tuple) or len(address) < 2:
        return False
    return _is_loopback_host(address[0])


@pytest.fixture(scope="session", autouse=True)
def block_outbound_network() -> Iterator[None]:
    """Fail any test that opens an outbound socket.

    The validation suite fakes the provider call; a real connection would mean
    the fake is not in place. Loopback stays open because the Windows asyncio
    event loop used by the in-process TestClient creates its self-pipe with a
    local socketpair.
    """
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_create_connection = socket.create_connection
    original_getaddrinfo = socket.getaddrinfo

    def _guard_method(original, message: str):
        def _connect(sock, address):
            if not _is_loopback(address):
                raise OutboundNetworkBlocked(message)
            return original(sock, address)

        return _connect

    def _guard_create_connection(original, message: str):
        def _create(address, *args, **kwargs):
            if not _is_loopback(address):
                raise OutboundNetworkBlocked(message)
            return original(address, *args, **kwargs)

        return _create

    socket.socket.connect = _guard_method(
        original_connect, f"{OUTBOUND_NETWORK_GUARD}: socket.connect"
    )
    socket.socket.connect_ex = _guard_method(
        original_connect_ex, f"{OUTBOUND_NETWORK_GUARD}: socket.connect_ex"
    )
    socket.create_connection = _guard_create_connection(
        original_create_connection, f"{OUTBOUND_NETWORK_GUARD}: socket.create_connection"
    )

    def _guarded_getaddrinfo(host, port, *args, **kwargs):
        if not _is_loopback_host(host):
            raise OutboundNetworkBlocked(f"{OUTBOUND_NETWORK_GUARD}: socket.getaddrinfo")
        return original_getaddrinfo(host, port, *args, **kwargs)

    socket.getaddrinfo = _guarded_getaddrinfo
    try:
        yield
    finally:
        socket.socket.connect = original_connect
        socket.socket.connect_ex = original_connect_ex
        socket.create_connection = original_create_connection
        socket.getaddrinfo = original_getaddrinfo


@pytest.fixture(autouse=True)
def ai_env(monkeypatch) -> None:
    """Keep the developer's real key out of the suite and supply a dummy one."""
    monkeypatch.setattr(ai_validation, "_load_env", lambda: None)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")


@pytest.fixture(autouse=True)
def no_real_ai_provider(monkeypatch) -> None:
    """Fail loudly when a test reaches the provider without installing a fake."""

    def _fail(*args, **kwargs):
        raise AssertionError("the AI provider must be faked in tests")

    monkeypatch.setattr(ai_validation, "_invoke_agent", _fail)


@pytest.fixture
def fake_verdict(monkeypatch):
    """Install a provider fake that returns a chosen status and records prompts."""

    def _set(status: str, reasons: list[str] | None = None, calls: list | None = None) -> None:
        def _invoke(agent, prompt):
            if calls is not None:
                calls.append(prompt)
            return ai_validation.SubmitVerdict(status=status, reasons=reasons or [])

        monkeypatch.setattr(ai_validation, "_invoke_agent", _invoke)

    return _set


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
    options: tuple[str, str, str | None, str | None] = ("A", "B", "C", "D"),
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
