import csv
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))

from sqlalchemy import func

from app.database import SessionLocal
from app.categories import get_category_names
from app.load_data import load_questions, normalize_text, read_and_validate
from app.models import Categorization, Question


SOURCE = ROOT / "preguntas_preguntados.csv"


def dataset_facts() -> tuple[int, int, int, dict[str, int], tuple[tuple, ...]]:
    session = SessionLocal()
    try:
        category_counts = {
            category: count
            for category, count in session.query(Categorization.category_name, func.count(Categorization.id))
            .join(Question, Question.id == Categorization.question_id)
            .group_by(Categorization.category_name)
            .all()
        }
        rows = tuple(
            sorted(
                (
                    normalize_text(question.question),
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                    question.answer,
                    categorization.category_name,
                    question.source,
                )
                for question, categorization in session.query(Question, Categorization)
                .join(Categorization, Categorization.question_id == Question.id)
                .all()
            )
        )
        normalized_count = len({row[0] for row in rows})
        return (
            session.query(Question).count(),
            session.query(Categorization).count(),
            normalized_count,
            category_counts,
            rows,
        )
    finally:
        session.close()


def main() -> None:
    rows = read_and_validate(SOURCE)
    assert len(rows) == 300
    load_questions(SOURCE)
    load_questions(SOURCE)
    expected_categories = {name: 50 for name in get_category_names()}
    facts = dataset_facts()
    assert facts[:4] == (300, 300, 300, expected_categories)
    assert not any(count > 1 for count in Counter(facts[4]).values())

    before = facts
    source_rows = list(csv.reader(SOURCE.open(encoding="utf-8")))
    source_rows.append(source_rows[1])
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", newline="", encoding="utf-8", delete=False) as target:
        csv.writer(target).writerows(source_rows)
        invalid_source = Path(target.name)
    try:
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "from pathlib import Path; import sys; "
                "from app.load_data import load_questions; "
                "load_questions(Path(sys.argv[1]))",
                str(invalid_source),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode != 0, "La fuente inválida fue aceptada"
    finally:
        invalid_source.unlink()
    assert dataset_facts() == before
    print("DATA_CHECK_PASS", before[:4])


if __name__ == "__main__":
    main()