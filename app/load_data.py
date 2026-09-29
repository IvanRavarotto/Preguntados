import pandas as pd
from app.database import SessionLocal, engine
from app.models import Base, Question

CSV_PATH = "preguntas_preguntados.csv"

LETRA_A_COLUMNA = {
    "a": "opcion_a",
    "b": "opcion_b",
    "c": "opcion_c",
    "d": "opcion_d",
}


def load_questions():
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv(CSV_PATH)
    print(f"Columnas disponibles: {list(df.columns)}")
    print(f"Filas: {len(df)}")
    print(df.head(3))

    session = SessionLocal()
    try:
        for _, row in df.iterrows():
            letra = str(row["respuesta_correcta"]).strip().lower()
            columna_correcta = LETRA_A_COLUMNA[letra]
            question = Question(
                question=row["pregunta"],
                option_a=row["opcion_a"],
                option_b=row["opcion_b"],
                option_c=row["opcion_c"],
                option_d=row["opcion_d"],
                answer=row[columna_correcta],
                category=row["categoria"],
                source="preguntados.csv",
            )
            session.add(question)

        session.commit()
        print(f"Se insertaron {len(df)} preguntas correctamente.")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    load_questions()