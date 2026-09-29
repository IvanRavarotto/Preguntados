"""
Script principal de categorización.

Orquesta todo el flujo:
1. Carga las preguntas sin categorizar de la BD
2. Para cada pregunta, la clasifica con la IA
3. Si el score >= threshold → guarda automáticamente
4. Si el score < threshold → pide revisión humana
5. Guarda el resultado en la tabla categorizations
"""
from tqdm import tqdm

from app.database import SessionLocal
from app.models import Question, Categorization
from app.categories import CATEGORIES, get_category_names, get_category_labels
from app.classifier import AIClassifier
from app.human_review import display_question_context, ask_human_for_category, confirm_ai_suggestion


# Umbral de confianza (70%)
CONFIDENCE_THRESHOLD = 0.70


def get_uncategorized_questions(db) -> list:
    """
    Obtiene todas las preguntas que aún no tienen una categorización.
    """
    categorized_ids = db.query(Categorization.question_id)
    return db.query(Question).filter(~Question.id.in_(categorized_ids)).all()


def save_categorization(db, question_id: int, category_name: str, confidence_score: float, is_automatic: bool) -> None:
    """Guarda una categorización en la base de datos."""
    try:
        categorization = Categorization(
            question_id=question_id,
            category_name=category_name,
            confidence_score=confidence_score,
            is_automatic=is_automatic,
        )
        db.add(categorization)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error al guardar categorización de pregunta {question_id}: {e}")


def categorize_all(batch_size: int = 32, threshold: float = CONFIDENCE_THRESHOLD) -> None:
    """Función principal que ejecuta el flujo completo de categorización."""
    db = SessionLocal()
    try:
        questions = get_uncategorized_questions(db)
        classifier = AIClassifier()
        candidate_labels = get_category_names()

        print("\n" + "=" * 50)
        print("  Categorizador de Preguntas con IA")
        print("=" * 50)
        print(f"  Preguntas pendientes: {len(questions)}")
        print(f"  Categorías: {len(candidate_labels)}")
        print(f"  Umbral de confianza: {threshold:.0%}")
        print("=" * 50 + "\n")

        automatic = 0
        manual = 0
        skipped = 0
        total = 0

        for question in tqdm(questions, desc="Categorizando"):
            total += 1
            result = classifier.classify(question.question, candidate_labels)

            if result.confidence_score >= threshold:
                save_categorization(
                    db,
                    question_id=question.id,
                    category_name=result.category_name,
                    confidence_score=result.confidence_score,
                    is_automatic=True,
                )
                automatic += 1
                continue

            display_question_context(question.question, result.category_name, result.confidence_score, result.all_scores)

            if confirm_ai_suggestion(result.category_name, result.confidence_score):
                save_categorization(
                    db,
                    question_id=question.id,
                    category_name=result.category_name,
                    confidence_score=result.confidence_score,
                    is_automatic=False,
                )
                manual += 1
                continue

            category_name = ask_human_for_category(CATEGORIES)
            if category_name is None:
                skipped += 1
                continue

            save_categorization(
                db,
                question_id=question.id,
                category_name=category_name,
                confidence_score=0.0,
                is_automatic=False,
            )
            manual += 1

        print("\n" + "=" * 50)
        print("  RESUMEN DE CATEGORIZACIÓN")
        print("=" * 50)
        print(f"  Total procesadas:    {total}")
        print(f"  Automáticas (IA):    {automatic} ({automatic / total:.0%})" if total else "  Automáticas (IA):    0")
        print(f"  Manuales (humano):   {manual}")
        print(f"  Omitidas (skip):     {skipped}")
        print("=" * 50)
    finally:
        db.close()


if __name__ == "__main__":
    categorize_all()