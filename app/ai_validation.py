from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

DEFAULT_MODEL = "gemini-3.5-flash"
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

_VALIDATION_INSTRUCTIONS = (
    "You review trivia questions for a quiz game played in Spanish. "
    "Given a category, a question and the answer the author marked as correct, decide whether the "
    "answer is factually correct and unambiguous, and whether the question fits the category. "
    "Set plausible to true only when the answer is correct beyond reasonable doubt. "
    "Use status 'valid' when plausible, 'implausible' when the answer is wrong or the category does "
    "not fit, and 'uncertain' when you cannot decide. Keep each reason short."
)

_DISTRACTOR_INSTRUCTIONS = (
    "You write wrong answer options for a trivia question played in Spanish. "
    "Given a category, a question and its correct answer, produce exactly three plausible but "
    "incorrect alternatives. Write them in the same language and style as the correct answer. "
    "They must be distinct from each other and must not repeat or paraphrase the correct answer."
)


class AIValidationError(RuntimeError):
    """Raised when AI validation cannot run or returns unusable output.

    Carries the machine-readable ``detail`` code and the HTTP status the caller
    should map it to, so the rule lives here and not in the transport layer.
    """

    def __init__(self, detail: str, status_code: int = 503):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ValidationResult(BaseModel):
    plausible: bool = Field(
        description="True when the category, question and marked answer are consistent and the answer is correct."
    )
    status: Literal["valid", "implausible", "uncertain"] = Field(
        description="'valid' when plausible, 'implausible' when the answer is wrong, 'uncertain' when undecidable."
    )
    reasons: list[str] = Field(
        default_factory=list, description="Short human-readable reasons for the verdict."
    )


class DistractorSet(BaseModel):
    distractors: list[str] = Field(
        description="Exactly three plausible but incorrect answer options."
    )


def _load_env() -> None:
    """Fill os.environ from the project .env without overriding real variables."""
    if not _ENV_PATH.exists():
        return
    for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#") or "=" not in entry:
            continue
        key, _, value = entry.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def get_api_key() -> str:
    """Return the configured Gemini API key or raise a clear config error."""
    _load_env()
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise AIValidationError("gemini_api_key_missing", status_code=503)
    return key


def get_model_name() -> str:
    """Return the Gemini model name, defaulting to the configured floor."""
    _load_env()
    return os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL


def _build_agent(model_name: str, output_type, instructions):
    from pydantic_ai import Agent
    from pydantic_ai.models.google import GoogleModel
    from pydantic_ai.providers.google import GoogleProvider

    model = GoogleModel(model_name, provider=GoogleProvider(api_key=get_api_key()))
    return Agent(model, output_type=output_type, instructions=instructions)


_FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]


def _model_candidates() -> list[str]:
    """Configured model first, then the fallback models, without duplicates."""
    ordered: list[str] = []
    for name in [get_model_name(), *_FALLBACK_MODELS]:
        if name and name not in ordered:
            ordered.append(name)
    return ordered


def _run(output_type, instructions, prompt):
    """Run the agent, falling back across models when the provider is unavailable.

    The free tier returns transient 503s under load, so a single model name is not
    reliable enough for the request path.
    """
    last_error: Exception | None = None
    for model_name in _model_candidates():
        try:
            agent = _build_agent(model_name, output_type, instructions)
            return agent.run_sync(prompt).output
        except AIValidationError:
            raise
        except Exception as exc:
            last_error = exc
    raise AIValidationError("ai_provider_error", status_code=502) from last_error


def _validation_prompt(category: str, question: str, answer: str) -> str:
    return (
        f"Categoria: {category}\n"
        f"Pregunta: {question}\n"
        f"Respuesta marcada como correcta: {answer}"
    )


def validate_content(category: str, question: str, answer: str) -> ValidationResult:
    """Judge whether (category, question, answer) is plausible and internally consistent."""
    return _run(
        ValidationResult,
        _VALIDATION_INSTRUCTIONS,
        _validation_prompt(category, question, answer),
    )


def _clean_distractors(raw: list[str], answer: str) -> list[str]:
    target = answer.strip().casefold()
    seen: list[str] = []
    for item in raw:
        text = item.strip()
        if not text or text.casefold() == target or text.casefold() in [s.casefold() for s in seen]:
            continue
        seen.append(text)
    return seen


def generate_distractors(category: str, question: str, answer: str, attempts: int = 2) -> list[str]:
    """Generate exactly three distinct distractors, retrying once if the model underdelivers."""
    prompt = _validation_prompt(category, question, answer)
    for _ in range(attempts):
        result = _run(DistractorSet, _DISTRACTOR_INSTRUCTIONS, prompt)
        cleaned = _clean_distractors(result.distractors, answer)
        if len(cleaned) == 3:
            return cleaned
    raise AIValidationError("ai_distractors_invalid", status_code=502)


def assess_question(category: str, question: str, answer: str) -> dict:
    """Validate a question and, when plausible, generate three distractors."""
    validation = validate_content(category, question, answer)
    distractors: list[str] = []
    if validation.plausible:
        distractors = generate_distractors(category, question, answer)
    return {
        "plausible": validation.plausible,
        "status": validation.status,
        "reasons": validation.reasons,
        "distractors": distractors,
    }
