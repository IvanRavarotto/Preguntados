import json

import pytest

from app import load_dataset as loader
from app.categories import get_category_names
from app.models import Categorization, Question
from app.neural_classifier import get_classifier


def write_csv(path, rows):
    lines = ["question,answer,choices,category"]
    for question, answer, choices, category in rows:
        encoded = json.dumps(choices, ensure_ascii=False).replace('"', '""')
        lines.append(f'"{question}","{answer}","{encoded}",{category}')
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def test_read_dataset_reads_the_whole_shipped_csv():
    rows = loader.read_dataset()

    assert len(rows) == 5000
    assert {row["category"] for row in rows} == set(get_category_names())
    assert {len(row["options"]) for row in rows} == {2, 4}


def test_read_dataset_rejects_answer_outside_the_options(tmp_path):
    path = write_csv(tmp_path / "bad.csv", [("¿P?", "Z", ["A", "B"], "Arte")])

    with pytest.raises(ValueError, match="Fila 2"):
        loader.read_dataset(path)


def test_read_dataset_rejects_three_options(tmp_path):
    path = write_csv(tmp_path / "bad.csv", [("¿P?", "A", ["A", "B", "C"], "Arte")])

    with pytest.raises(ValueError, match="2 o 4 opciones"):
        loader.read_dataset(path)


def test_store_dataset_saves_questions_with_network_categories(session):
    rows = loader.read_dataset()[:60]

    matches = loader.store_dataset(session, rows, get_classifier())

    assert session.query(Question).count() == 60
    automatic = session.query(Categorization).filter(Categorization.is_automatic.is_(True))
    assert automatic.count() == 60
    assert matches >= 55
    true_false = session.query(Question).filter(Question.option_c.is_(None)).first()
    assert true_false is not None
    assert true_false.option_d is None
    assert loader.dataset_is_loaded(session) is True


def test_dataset_is_not_loaded_on_an_empty_database(session):
    assert loader.dataset_is_loaded(session) is False


@pytest.fixture
def small_load(monkeypatch, engine, session_factory):
    rows = loader.read_dataset()[:12]
    monkeypatch.setattr(loader, "engine", engine)
    monkeypatch.setattr(loader, "SessionLocal", session_factory)
    monkeypatch.setattr(loader, "read_dataset", lambda: rows)
    return rows


def test_main_reloads_the_dataset_from_scratch(small_load, session, capsys):
    loader.main([])
    loader.main([])

    assert session.query(Question).count() == len(small_load)
    assert "Cargadas 12 preguntas" in capsys.readouterr().out


def test_main_if_missing_skips_an_already_loaded_database(small_load, session, capsys):
    loader.main(["--if-missing"])
    loader.main(["--if-missing"])

    assert session.query(Question).count() == len(small_load)
    assert "ya está cargado" in capsys.readouterr().out
