import pytest

from app import ai_validation
from app.models import Categorization, Question


def payload(**overrides) -> dict:
    body = {
        "question": "¿Quién pintó la Mona Lisa?",
        "option_a": "Leonardo da Vinci",
        "option_b": "Pablo Picasso",
        "option_c": "Vincent van Gogh",
        "option_d": "Claude Monet",
        "correct_answer": "Leonardo da Vinci",
    }
    body.update(overrides)
    return body


def true_false_payload(**overrides) -> dict:
    body = {
        "question": "¿El Sol es una estrella?",
        "option_a": "Verdadero",
        "option_b": "Falso",
        "option_c": "",
        "option_d": "",
        "correct_answer": "Verdadero",
        "question_type": "true_false",
    }
    body.update(overrides)
    return body


def stats(client) -> dict:
    return client.get("/categories/stats").json()


def recording_fake(monkeypatch, verdict=None) -> list[str]:
    calls: list[str] = []

    def _invoke(agent, prompt):
        calls.append(prompt)
        if verdict is not None:
            return verdict
        return ai_validation.SubmitVerdict(status="valid")

    monkeypatch.setattr(ai_validation, "_invoke_agent", _invoke)
    return calls


def test_validate_returns_a_valid_verdict(client, fake_verdict):
    before = stats(client)
    fake_verdict("valid")

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 200
    assert response.json() == {"plausible": True, "status": "valid", "reasons": []}
    assert set(response.json()) == {"plausible", "status", "reasons"}
    assert stats(client) == before


def test_validate_returns_implausible_reasons(client, fake_verdict):
    before = stats(client)
    reason = "La respuesta marcada es incorrecta."
    fake_verdict("implausible", [reason])

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 200
    assert response.json() == {
        "plausible": False,
        "status": "implausible",
        "reasons": [reason],
    }
    assert stats(client) == before


def test_validate_returns_uncertain(client, fake_verdict):
    before = stats(client)
    reason = "La pregunta admite más de una respuesta defendible."
    fake_verdict("uncertain", [reason])

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 200
    assert response.json() == {
        "plausible": False,
        "status": "uncertain",
        "reasons": [reason],
    }
    assert stats(client) == before


@pytest.mark.parametrize(
    ("body", "detail"),
    [
        (payload(option_c=""), "missing_fields"),
        (payload(option_b="Leonardo da Vinci"), "options_not_distinct"),
        (payload(correct_answer="Miguel Ángel"), "answer_not_in_options"),
    ],
)
def test_validate_requires_the_structural_fields(client, monkeypatch, body, detail):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    calls = recording_fake(monkeypatch)

    response = client.post("/questions/validate", json=body)

    assert response.status_code == 400
    assert response.json() == {"detail": detail}
    assert calls == []


def test_validate_rejects_a_duplicate_before_the_provider(client, monkeypatch, seed_question):
    seed_question(question="¿Quién pintó la Mona Lisa?", category="arte")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    calls = recording_fake(monkeypatch)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 409
    assert response.json() == {"detail": "duplicate_question"}
    assert calls == []


@pytest.mark.parametrize("value", [None, "   "])
def test_validate_requires_an_api_key(client, monkeypatch, value):
    if value is None:
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    else:
        monkeypatch.setenv("GEMINI_API_KEY", value)
    calls = recording_fake(monkeypatch)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 503
    assert response.json() == {"detail": "gemini_api_key_missing"}
    assert calls == []

    # Positive control: restoring the key reaches the fake with the same payload.
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    accepted = client.post("/questions/validate", json=payload())
    assert accepted.status_code == 200
    assert len(calls) == 1


def test_validate_maps_a_provider_failure(client, monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    calls: list[str] = []

    def _invoke(agent, prompt):
        calls.append(prompt)
        raise RuntimeError("provider down")

    monkeypatch.setattr(ai_validation, "_invoke_agent", _invoke)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 502
    assert response.json() == {"detail": "ai_provider_error"}
    assert len(calls) == len(ai_validation._model_candidates())
    assert len(calls) == 3


def test_validate_falls_back_to_a_later_candidate(client, monkeypatch):
    calls: list[str] = []

    def _invoke(agent, prompt):
        calls.append(prompt)
        if len(calls) == 1:
            return ai_validation.SubmitVerdict(status="bogus")
        return ai_validation.SubmitVerdict(status="uncertain", reasons=["La IA no pudo decidir."])

    monkeypatch.setattr(ai_validation, "_invoke_agent", _invoke)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 200
    assert response.json() == {
        "plausible": False,
        "status": "uncertain",
        "reasons": ["La IA no pudo decidir."],
    }
    assert len(calls) == 2
    assert "gemini-" not in response.text


def test_validate_accepts_true_false(client, fake_verdict):
    calls: list[str] = []
    fake_verdict("valid", calls=calls)

    multiple_choice = client.post("/questions/validate", json=payload())
    true_false = client.post(
        "/questions/validate",
        json=true_false_payload(option_c="Tal vez", option_d="No sé"),
    )

    assert multiple_choice.status_code == 200
    assert true_false.status_code == 200
    assert set(multiple_choice.json()) == {"plausible", "status", "reasons"}
    assert set(true_false.json()) == {"plausible", "status", "reasons"}
    assert len(calls) == 2

    multiple_choice_prompt, true_false_prompt = calls
    assert "Tipo: multiple_choice" in multiple_choice_prompt
    assert "A: Leonardo da Vinci" in multiple_choice_prompt
    assert "B: Pablo Picasso" in multiple_choice_prompt
    assert "C: Vincent van Gogh" in multiple_choice_prompt
    assert "D: Claude Monet" in multiple_choice_prompt
    assert "Respuesta marcada como correcta: Leonardo da Vinci" in multiple_choice_prompt
    assert "Tipo: true_false" in true_false_prompt
    assert "A: Verdadero" in true_false_prompt
    assert "B: Falso" in true_false_prompt
    assert "Tal vez" not in true_false_prompt
    assert "No sé" not in true_false_prompt
    assert "C:" not in true_false_prompt
    assert "D:" not in true_false_prompt


def test_validate_prompt_uses_normalized_fields(client, fake_verdict):
    calls: list[str] = []
    fake_verdict("valid", calls=calls)

    response = client.post(
        "/questions/validate",
        json=true_false_payload(
            question="  ¿El Sol es una estrella?  ",
            option_a=" Verdadero ",
            option_b=" Falso ",
            correct_answer=" Verdadero ",
        ),
    )

    assert response.status_code == 200
    prompt = calls[0]
    assert "Pregunta: ¿El Sol es una estrella?" in prompt
    assert "A: Verdadero" in prompt
    assert "B: Falso" in prompt
    assert "Respuesta marcada como correcta: Verdadero" in prompt
    assert "category" not in prompt.casefold()


def test_validate_never_persists(client, session, monkeypatch):
    before = stats(client)
    verdicts = [
        ai_validation.SubmitVerdict(status="valid"),
        ai_validation.SubmitVerdict(status="implausible", reasons=["La respuesta es falsa."]),
        ai_validation.SubmitVerdict(status="uncertain", reasons=["La pregunta es ambigua."]),
    ]

    for verdict in verdicts:
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        monkeypatch.setattr(ai_validation, "_invoke_agent", lambda agent, prompt, v=verdict: v)
        response = client.post("/questions/validate", json=payload())
        assert response.status_code == 200
        assert stats(client) == before

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    missing_key = client.post("/questions/validate", json=payload())
    assert missing_key.status_code == 503
    assert stats(client) == before

    def _raise(agent, prompt):
        raise RuntimeError("provider down")

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_validation, "_invoke_agent", _raise)
    provider_failure = client.post("/questions/validate", json=payload())
    assert provider_failure.status_code == 502
    assert stats(client) == before

    assert session.query(Question).count() == 0
    assert session.query(Categorization).count() == 0


def test_validate_does_not_echo_the_key(client, monkeypatch, caplog):
    key = "distinctive-secret-key-987654"
    monkeypatch.setenv("GEMINI_API_KEY", key)
    monkeypatch.setattr(
        ai_validation,
        "_invoke_agent",
        lambda agent, prompt: ai_validation.SubmitVerdict(status="valid"),
    )

    accepted = client.post("/questions/validate", json=payload())
    assert accepted.status_code == 200
    assert key not in accepted.text

    def _raise(agent, prompt):
        raise RuntimeError(f"provider rejected {key}")

    monkeypatch.setattr(ai_validation, "_invoke_agent", _raise)
    failed = client.post("/questions/validate", json=payload())
    assert failed.status_code == 502
    assert failed.json() == {"detail": "ai_provider_error"}
    assert key not in failed.text

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    unconfigured = client.post("/questions/validate", json=payload())
    assert unconfigured.status_code == 503
    assert unconfigured.json() == {"detail": "gemini_api_key_missing"}
    assert key not in unconfigured.text
    assert key not in caplog.text


def test_validate_rejects_an_unsupported_question_type(client, monkeypatch):
    calls = recording_fake(monkeypatch)

    rejected = client.post("/questions/validate", json=true_false_payload(question_type="boolean"))
    assert rejected.status_code == 422
    assert calls == []

    accepted = client.post("/questions/validate", json=true_false_payload())
    assert accepted.status_code == 200
    assert len(calls) == 1


def test_validate_does_not_make_the_text_a_duplicate(client, monkeypatch):
    calls = recording_fake(monkeypatch)

    first = client.post("/questions/validate", json=payload())
    second = client.post("/questions/validate", json=payload())

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(calls) == 2

    saved = client.post("/questions", json=payload())
    duplicate = client.post("/questions", json=payload())

    assert saved.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "duplicate_question"}
