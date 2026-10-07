import csv
import unicodedata
from collections import Counter
from pathlib import Path

from sqlalchemy import delete, func, select

from app.database import SessionLocal, engine
from app.categories import get_category_names
from app.models import Base, Categorization, Question

CSV_PATH = Path("preguntas_preguntados.csv")
SOURCE_NAME = "preguntados.csv"

LETRA_A_COLUMNA = {
    "a": "opcion_a",
    "b": "opcion_b",
    "c": "opcion_c",
    "d": "opcion_d",
}


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).strip().casefold().split())


def read_and_validate(source_path: Path) -> list[dict[str, str]]:
    required_columns = {
        "categoria",
        "pregunta",
        "opcion_a",
        "opcion_b",
        "opcion_c",
        "opcion_d",
        "respuesta_correcta",
    }
    with source_path.open(newline="", encoding="utf-8") as source_file:
        reader = csv.DictReader(source_file)
        if reader.fieldnames is None or set(reader.fieldnames) != required_columns:
            raise ValueError(f"Columnas requeridas inválidas: {reader.fieldnames}")
        rows = list(reader)

    expected_categories = set(get_category_names())
    if len(rows) != 300:
        raise ValueError(f"Se requieren exactamente 300 filas; se recibieron {len(rows)}")

    category_counts = Counter(row["categoria"].strip() for row in rows)
    if set(category_counts) != expected_categories or any(count != 50 for count in category_counts.values()):
        raise ValueError(f"Cada categoría debe tener 50 filas: {dict(category_counts)}")

    normalized_questions = set()
    full_rows = set()
    validated_rows = []
    for row_number, row in enumerate(rows, start=2):
        category = row["categoria"].strip()
        question_text = row["pregunta"].strip()
        options = [row[column].strip() for column in LETRA_A_COLUMNA.values()]
        answer_letter = row["respuesta_correcta"].strip().lower()
        if not question_text or any(not option for option in options) or len(set(options)) != 4:
            raise ValueError(f"Fila {row_number}: pregunta u opciones inválidas")
        if answer_letter not in LETRA_A_COLUMNA:
            raise ValueError(f"Fila {row_number}: respuesta correcta inválida")
        answer = row[LETRA_A_COLUMNA[answer_letter]].strip()
        if answer not in options:
            raise ValueError(f"Fila {row_number}: la respuesta no pertenece a las opciones")

        normalized_question = normalize_text(question_text)
        full_row = (normalized_question, *options, answer, category, SOURCE_NAME)
        if normalized_question in normalized_questions:
            raise ValueError(f"Fila {row_number}: pregunta duplicada después de normalizar")
        if full_row in full_rows:
            raise ValueError(f"Fila {row_number}: fila completa duplicada")
        normalized_questions.add(normalized_question)
        full_rows.add(full_row)
        validated_rows.append(
            {
                "question": question_text,
                "option_a": options[0],
                "option_b": options[1],
                "option_c": options[2],
                "option_d": options[3],
                "answer": answer,
                "category": category,
                "source": SOURCE_NAME,
            }
        )
    return validated_rows


def load_questions(source_path: Path = CSV_PATH) -> None:
    rows = read_and_validate(source_path)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        with session.begin():
            session.execute(delete(Categorization))
            session.execute(delete(Question))
            for row in rows:
                question = Question(
                    question=row["question"],
                    option_a=row["option_a"],
                    option_b=row["option_b"],
                    option_c=row["option_c"],
                    option_d=row["option_d"],
                    answer=row["answer"],
                    category=row["category"],
                    source=row["source"],
                )
                session.add(question)
                session.flush()
                session.add(
                    Categorization(
                        question_id=question.id,
                        category_name=row["category"],
                        confidence_score=1.0,
                        is_automatic=True,
                    )
                )

            session.flush()
            question_count = session.scalar(select(func.count(Question.id)))
            categorization_count = session.scalar(select(func.count(Categorization.id)))
            category_counts = dict(
                session.execute(
                    select(Categorization.category_name, func.count(Categorization.id))
                    .group_by(Categorization.category_name)
                ).all()
            )
            if question_count != 300 or categorization_count != 300 or any(
                category_counts.get(category) != 50 for category in get_category_names()
            ):
                raise RuntimeError(
                    "La revalidación de la importación no coincide con el dataset canónico: "
                    f"preguntas={question_count}, categorizaciones={categorization_count}, "
                    f"categorías={category_counts}"
                )
    finally:
        session.close()
    print(f"Se reemplazaron {len(rows)} preguntas y sus categorizaciones correctamente.")


if __name__ == "__main__":
    load_questions()