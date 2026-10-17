from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.categories import find_category_by_name
from app.models import Categorization, Question


class QuestionCreate(BaseModel):
    category: str = ""
    question: str = ""
    option_a: str = ""
    option_b: str = ""
    option_c: str = ""
    option_d: str = ""
    correct_answer: str = ""


class QuestionValidationError(ValueError):
    """Raised when a submitted question fails validation.

    Carries the machine-readable ``detail`` code and the HTTP status the caller
    should map it to, so the rule lives here and not in the transport layer.
    """

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def normalize_question_text(text: str) -> str:
    """Collapse internal whitespace and case-fold, for duplicate comparison."""
    return " ".join(text.split()).casefold()


def _collect_fields(payload: QuestionCreate) -> dict[str, str]:
    return {
        "category": payload.category.strip(),
        "question": payload.question.strip(),
        "option_a": payload.option_a.strip(),
        "option_b": payload.option_b.strip(),
        "option_c": payload.option_c.strip(),
        "option_d": payload.option_d.strip(),
        "correct_answer": payload.correct_answer.strip(),
    }


def question_exists(db: Session, question_text: str) -> bool:
    """Return True when an existing question normalizes to the same text."""
    target = normalize_question_text(question_text)
    existing_texts: list[tuple[str]] = db.query(Question.question).all()
    return any(normalize_question_text(row[0]) == target for row in existing_texts)


def validate_question(payload: QuestionCreate, db: Session) -> dict[str, str]:
    """Validate and normalize a question submission without persisting it.

    The correct answer is matched by exact equality against the trimmed options,
    which is the same representation stored on the record.
    """
    fields = _collect_fields(payload)

    if any(not value for value in fields.values()):
        raise QuestionValidationError("missing_fields")

    if find_category_by_name(fields["category"]) is None:
        raise QuestionValidationError("category_unknown", status_code=404)

    options = [fields["option_a"], fields["option_b"], fields["option_c"], fields["option_d"]]
    if len(set(options)) != 4:
        raise QuestionValidationError("options_not_distinct")

    if fields["correct_answer"] not in options:
        raise QuestionValidationError("answer_not_in_options")

    if question_exists(db, fields["question"]):
        raise QuestionValidationError("duplicate_question", status_code=409)

    return fields


def create_question(db: Session, payload: QuestionCreate, source: str = "user_input") -> Question:
    """Validate, persist the question and its categorization, and return it."""
    fields = validate_question(payload, db)
    question = Question(
        question=fields["question"],
        option_a=fields["option_a"],
        option_b=fields["option_b"],
        option_c=fields["option_c"],
        option_d=fields["option_d"],
        answer=fields["correct_answer"],
        category=fields["category"],
        source=source,
    )
    db.add(question)
    db.flush()
    db.add(
        Categorization(
            question_id=question.id,
            category_name=fields["category"],
            confidence_score=1.0,
            is_automatic=False,
        )
    )
    db.commit()
    db.refresh(question)
    return question
