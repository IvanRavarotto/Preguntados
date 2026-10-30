"""
Carga el dataset propio (trivia_latam_argentina.csv) en la base de datos.

Cada pregunta se guarda con sus opciones y su respuesta, y la red neuronal le
asigna la categoría con la que se sirve en el juego. La categoría original del
CSV queda en ``Question.category`` para poder comparar contra la de la red.

Uso:
    python -m app.load_dataset              # recarga todo desde cero
    python -m app.load_dataset --if-missing # solo carga si el dataset no está
"""

import argparse
import json
from pathlib import Path

import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.categories import category_name_for_label
from app.database import Base, SessionLocal, engine
from app.models import Categorization, Question
from app.neural_classifier import QuestionClassifier, get_classifier

DATASET_PATH = Path(__file__).resolve().parent / "trivia_latam_argentina.csv"
SOURCE_NAME = DATASET_PATH.name
VALID_OPTION_COUNTS = {2, 4}


def read_dataset(path: Path = DATASET_PATH) -> list[dict]:
    """Lee el CSV y valida que cada fila tenga 2 o 4 opciones con la respuesta entre ellas."""
    rows = []
    for line_number, record in enumerate(pd.read_csv(path).to_dict("records"), start=2):
        options = [str(option).strip() for option in json.loads(record["choices"])]
        answer = str(record["answer"]).strip()
        if len(options) not in VALID_OPTION_COUNTS or len(set(options)) != len(options):
            raise ValueError(f"Fila {line_number}: se esperaban 2 o 4 opciones distintas")
        if answer not in options:
            raise ValueError(f"Fila {line_number}: la respuesta no está entre las opciones")
        rows.append(
            {
                "question": str(record["question"]).strip(),
                "options": options,
                "answer": answer,
                "category": category_name_for_label(str(record["category"])),
            }
        )
    return rows


def store_dataset(db: Session, rows: list[dict], classifier: QuestionClassifier) -> int:
    """Guarda las preguntas con la categoría predicha por la red y devuelve cuántas coinciden con el CSV."""
    results = classifier.classify_batch([row["question"] for row in rows])
    matches = 0
    for row, result in zip(rows, results):
        options = row["options"] + [None] * (4 - len(row["options"]))
        question = Question(
            question=row["question"],
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
            answer=row["answer"],
            category=row["category"],
            source=SOURCE_NAME,
        )
        db.add(question)
        db.add(
            Categorization(
                question=question,
                category_name=result.category_name,
                confidence_score=result.confidence_score,
                is_automatic=True,
            )
        )
        matches += result.category_name == row["category"]
    db.commit()
    return matches


def dataset_is_loaded(db: Session) -> bool:
    count = db.query(func.count(Question.id)).filter(Question.source == SOURCE_NAME).scalar()
    return bool(count)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument(
        "--if-missing",
        action="store_true",
        help="no recargar si la base ya tiene las preguntas del dataset",
    )
    args = parser.parse_args(argv)

    if args.if_missing:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            if dataset_is_loaded(db):
                print("El dataset ya está cargado; no se recarga.")
                return

    # La carga reemplaza el esquema completo: así una base creada con el esquema
    # anterior (opciones C y D obligatorias) queda alineada con el modelo actual.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    rows = read_dataset()
    with SessionLocal() as db:
        matches = store_dataset(db, rows, get_classifier())
    print(
        f"Cargadas {len(rows)} preguntas. La red coincide con la categoría del CSV "
        f"en {matches} ({matches / len(rows):.1%})."
    )


if __name__ == "__main__":
    main()
