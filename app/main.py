from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import Base, Question, Categorization
from app.categories import CATEGORIES

app = FastAPI(title="Questions API", version="1.0.0")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")


@app.get("/questions")
def list_questions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    questions = db.query(Question).offset(skip).limit(limit).all()
    return questions


@app.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return {"error": "Pregunta no encontrada"}
    return question


@app.get("/questions/category/{category_name}")
def list_by_category(category_name: str, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """
    Retorna las preguntas categorizadas con una categoría específica.
    """
    results = (
        db.query(Question, Categorization)
        .join(Categorization, Categorization.question_id == Question.id)
        .filter(Categorization.category_name == category_name)
        .order_by(Question.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": question.id,
            "question": question.question,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "answer": question.answer,
            "category": categorization.category_name,
            "confidence_score": categorization.confidence_score,
            "is_automatic": categorization.is_automatic,
        }
        for question, categorization in results
    ]


@app.get("/categories")
def list_categories():
    """Retorna la lista de categorías disponibles."""
    return CATEGORIES


@app.get("/categories/stats")
def category_stats(db: Session = Depends(get_db)):
    """Retorna estadísticas de categorización."""
    total_questions = db.query(func.count(Question.id)).scalar()
    categorized = db.query(func.count(func.distinct(Categorization.question_id))).scalar()
    automatic = db.query(func.count(Categorization.id)).filter(Categorization.is_automatic.is_(True)).scalar()
    manual = db.query(func.count(Categorization.id)).filter(Categorization.is_automatic.is_(False)).scalar()

    by_category_rows = (
        db.query(Categorization.category_name, func.count(Categorization.id))
        .group_by(Categorization.category_name)
        .order_by(func.count(Categorization.id).desc())
        .all()
    )

    return {
        "total_questions": total_questions,
        "categorized": categorized,
        "uncategorized": total_questions - categorized,
        "automatic": automatic,
        "manual": manual,
        "by_category": {category_name: count for category_name, count in by_category_rows},
    }