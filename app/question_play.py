"""
Resolución de jugadas en el servidor.

El cliente nunca recibe la respuesta correcta junto con la pregunta: la conoce
solo cuando el servidor corrige una respuesta, la revela por un tiempo agotado o
por el comodín "Seleccionar correcta".
"""

import random

from pydantic import BaseModel

from app.models import Question

ELIMINATED_OPTIONS = 2


class PlayError(ValueError):
    """Jugada inválida, con el código y el estado HTTP que corresponden."""

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class AnswerSubmission(BaseModel):
    """Opción elegida (o ``None`` si se agotó el tiempo) y si revelar la correcta."""

    answer: str | None = None
    reveal: bool = True


def check_answer(question: Question, submission: AnswerSubmission) -> dict:
    """Corrige la respuesta; con ``reveal`` en falso no expone la opción correcta."""
    options = question.options()
    if submission.answer is not None and submission.answer not in options:
        raise PlayError("answer_not_in_options")
    return {
        "correct": submission.answer == question.answer,
        "correct_answer": question.answer if submission.reveal else None,
    }


def reveal_answer(question: Question) -> dict:
    return {"correct_answer": question.answer}


def eliminate_options(question: Question, rng: random.Random | None = None) -> dict:
    """Elige al azar dos opciones incorrectas de una pregunta de cuatro opciones."""
    wrong = [option for option in question.options() if option != question.answer]
    if len(wrong) < ELIMINATED_OPTIONS + 1:
        raise PlayError("not_enough_options", status_code=409)
    return {"eliminated": (rng or random).sample(wrong, ELIMINATED_OPTIONS)}
