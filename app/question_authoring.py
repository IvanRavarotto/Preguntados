from typing import Literal, cast

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models import Categorization, Question
from app.neural_classifier import QuestionClassifier


class QuestionCreate(BaseModel):
    question: str = ""
    option_a: str = ""
    option_b: str = ""
    option_c: str = ""
    option_d: str = ""
    correct_answer: str = ""
    question_type: Literal["multiple_choice", "true_false"] = "multiple_choice"


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


def validate_question(payload: QuestionCreate, db: Session) -> dict[str, str | None]:
    """Validate and normalize a question submission without persisting it.

    The correct answer is matched by exact equality against the trimmed options,
    which is the same representation stored on the record. A true/false question
    uses only options A and B; submitted options C and D are ignored and returned
    as ``None``.
    """
    fields = _collect_fields(payload)
    option_keys = (
        ("option_a", "option_b")
        if payload.question_type == "true_false"
        else ("option_a", "option_b", "option_c", "option_d")
    )

    required = ("question", "correct_answer", *option_keys)
    if any(not fields[key] for key in required):
        raise QuestionValidationError("missing_fields")

    options = [fields[key] for key in option_keys]
    if len(set(options)) != len(options):
        raise QuestionValidationError("options_not_distinct")

    if fields["correct_answer"] not in options:
        raise QuestionValidationError("answer_not_in_options")

    if question_exists(db, fields["question"]):
        raise QuestionValidationError("duplicate_question", status_code=409)

    result: dict[str, str | None] = dict(fields)
    if payload.question_type == "true_false":
        result["option_c"] = None
        result["option_d"] = None
    return result


def create_question(
    db: Session,
    payload: QuestionCreate,
    classifier: QuestionClassifier,
    source: str = "user_input",
) -> tuple[Question, Categorization]:
    """Validate the question, let the network pick its category, persist both, and return them."""
    fields = validate_question(payload, db)
    question_text = cast(str, fields["question"])
    result = classifier.classify(question_text)
    question = Question(
        question=question_text,
        option_a=fields["option_a"],
        option_b=fields["option_b"],
        option_c=fields["option_c"],
        option_d=fields["option_d"],
        answer=fields["correct_answer"],
        category=result.category_name,
        source=source,
    )
    categorization = Categorization(
        question=question,
        category_name=result.category_name,
        confidence_score=result.confidence_score,
        is_automatic=True,
    )
    db.add_all([question, categorization])
    db.commit()
    db.refresh(question)
    db.refresh(categorization)
    return question, categorization
