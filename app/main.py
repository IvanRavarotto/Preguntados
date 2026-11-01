from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.categories import CATEGORIES, find_category_by_name
from app.database import engine, get_db
from app.models import Base, Categorization, Question
from app.neural_classifier import QuestionClassifier, get_classifier
from app.question_authoring import QuestionCreate, QuestionValidationError, create_question
from app.question_play import (
    AnswerSubmission,
    PlayError,
    check_answer,
    eliminate_options,
    reveal_answer,
)

app = FastAPI(title="Questions API", version="3.0.0")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
MAX_LIMIT = 1000


class QuestionOut(BaseModel):
    """Pregunta tal como la ve un cliente: sin la respuesta correcta."""

    id: int
    question: str
    option_a: str
    option_b: str
    option_c: str | None
    option_d: str | None
    category: str | None
    confidence_score: float | None
    is_automatic: bool | None
    dataset_category: str | None
    source: str | None


def to_question_out(question: Question, categorization: Categorization | None) -> QuestionOut:
    return QuestionOut.model_validate(
        {
            "id": question.id,
            "question": question.question,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "category": categorization.category_name if categorization else None,
            "confidence_score": categorization.confidence_score if categorization else None,
            "is_automatic": categorization.is_automatic if categorization else None,
            "dataset_category": question.dataset_category,
            "source": question.source,
        }
    )


def questions_with_categorization(db: Session):
    return db.query(Question, Categorization).outerjoin(
        Categorization, Categorization.question_id == Question.id
    )


def get_question_or_404(question_id: int, db: Session = Depends(get_db)) -> Question:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="question_not_found")
    return question


def resolve_play(play, *args):
    try:
        return play(*args)
    except PlayError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    get_classifier()


@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")


@app.get("/questions", response_model=list[QuestionOut])
def list_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    rows = questions_with_categorization(db).order_by(Question.id).offset(skip).limit(limit)
    return [to_question_out(question, categorization) for question, categorization in rows]


class ClassifyRequest(BaseModel):
    question: str = ""


@app.post("/questions", status_code=201)
def add_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    classifier: QuestionClassifier = Depends(get_classifier),
):
    try:
        question, categorization = create_question(db, payload, classifier)
    except QuestionValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    return {
        "id": question.id,
        "category": categorization.category_name,
        "confidence_score": categorization.confidence_score,
    }


@app.post("/classify")
def classify_question(
    payload: ClassifyRequest, classifier: QuestionClassifier = Depends(get_classifier)
):
    """Predice con la red neuronal la categoría de una pregunta, sin guardarla."""
    text = payload.question.strip()
    if not text:
        raise HTTPException(status_code=400, detail="missing_question")
    result = classifier.classify(text)
    return {
        "category": result.category_name,
        "confidence_score": result.confidence_score,
        "scores": result.all_scores,
    }


@app.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question: Question = Depends(get_question_or_404), db: Session = Depends(get_db)):
    categorization = (
        db.query(Categorization).filter(Categorization.question_id == question.id).first()
    )
    return to_question_out(question, categorization)


@app.post("/questions/{question_id}/answer")
def answer_question(
    submission: AnswerSubmission, question: Question = Depends(get_question_or_404)
):
    """Corrige la opción elegida; ``answer`` en null representa un tiempo agotado."""
    return resolve_play(check_answer, question, submission)


@app.post("/questions/{question_id}/reveal")
def reveal_question_answer(question: Question = Depends(get_question_or_404)):
    """Revela la opción correcta (tiempo agotado o comodín "Seleccionar correcta")."""
    return reveal_answer(question)


@app.post("/questions/{question_id}/eliminate")
def eliminate_question_options(question: Question = Depends(get_question_or_404)):
    """Comodín "Eliminar dos": dos opciones incorrectas elegidas al azar."""
    return resolve_play(eliminate_options, question)


@app.get("/questions/category/{category_name}", response_model=list[QuestionOut])
def list_by_category(
    category_name: str,
    limit: int = Query(10, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    """Muestra al azar de preguntas a las que la red asignó esta categoría."""
    if find_category_by_name(category_name) is None:
        raise HTTPException(status_code=404, detail="category_unknown")
    rows = (
        questions_with_categorization(db)
        .filter(Categorization.category_name == category_name)
        .order_by(func.random())
        .limit(limit)
    )
    return [to_question_out(question, categorization) for question, categorization in rows]


@app.get("/categories")
def list_categories():
    """Retorna la lista de categorías disponibles."""
    return CATEGORIES


@app.get("/categories/stats")
def category_stats(db: Session = Depends(get_db)):
    """Retorna estadísticas de categorización."""
    total_questions = db.query(func.count(Question.id)).scalar()
    categorized = db.query(func.count(func.distinct(Categorization.question_id))).scalar()
    automatic = (
        db.query(func.count(Categorization.id))
        .filter(Categorization.is_automatic.is_(True))
        .scalar()
    )
    manual = (
        db.query(func.count(Categorization.id))
        .filter(Categorization.is_automatic.is_(False))
        .scalar()
    )

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
