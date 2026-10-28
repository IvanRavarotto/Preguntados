from app.categories import find_category_by_name
from app.database import get_db, normalize_database_url
from app.question_authoring import normalize_question_text, question_exists


def test_normalize_question_text_collapses_whitespace_and_case():
    assert normalize_question_text("  ¿Quién   Pintó  ") == "¿quién pintó"


def test_find_category_by_name_found_and_missing():
    assert find_category_by_name("arte")["label"] == "Arte y Cultura"
    assert find_category_by_name("matematica") is None


def test_question_exists_matches_normalized_text(session, seed_question):
    seed_question(question="¿Quién pintó la Mona Lisa?", category="arte")

    assert question_exists(session, "  ¿quién   pintó LA mona lisa? ") is True
    assert question_exists(session, "Pregunta distinta") is False


def test_get_db_yields_a_session_and_closes():
    generator = get_db()
    db = next(generator)

    assert db is not None

    generator.close()


def test_normalize_database_url_accepts_platform_schemes():
    assert (
        normalize_database_url("postgres://user:pass@host/db") == "postgresql://user:pass@host/db"
    )
    assert (
        normalize_database_url("postgresql://user:pass@host/db") == "postgresql://user:pass@host/db"
    )
    assert normalize_database_url("postgresql+psycopg2://user:pass@host/db") == (
        "postgresql+psycopg2://user:pass@host/db"
    )
