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


def validate_question(payload: QuestionCreate, db: Session) -> dict[str, str]:
    """Validate and normalize a question submission without persisting it.

    The correct answer is matched by exact equality against the trimmed options,
    which is the same representation stored on the record.
    """
    fields = _collect_fields(payload)

    if any(not value for value in fields.values()):
        raise QuestionValidationError("missing_fields")

    options = [fields["option_a"], fields["option_b"], fields["option_c"], fields["option_d"]]
    if len(set(options)) != 4:
        raise QuestionValidationError("options_not_distinct")

    if fields["correct_answer"] not in options:
        raise QuestionValidationError("answer_not_in_options")

    if question_exists(db, fields["question"]):
        raise QuestionValidationError("duplicate_question", status_code=409)

    return fields


def create_question(
    db: Session,
    payload: QuestionCreate,
    classifier: QuestionClassifier,
    source: str = "user_input",
) -> tuple[Question, Categorization]:
    """Validate the question, let the network pick its category, persist both, and return them."""
    fields = validate_question(payload, db)
    result = classifier.classify(fields["question"])
    question = Question(
        question=fields["question"],
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
