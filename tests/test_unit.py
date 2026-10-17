import os
from types import SimpleNamespace

import pytest

from app import ai_validation as av
from app.categories import find_category_by_name
from app.database import get_db
from app.question_authoring import normalize_question_text, question_exists


def test_normalize_question_text_collapses_whitespace_and_case():
    assert normalize_question_text("  ¿Quién   Pintó  ") == "¿quién pintó"


def test_find_category_by_name_found_and_missing():
    assert find_category_by_name("arte")["label"] == "Arte y Cultura"
    assert find_category_by_name("matematica") is None


def test_question_exists_matches_normalized_text(session, seed_question):
    seed_question(question="¿Quién pintó la Mona Lisa?", category="arte")

    assert question_exists(session, "  ¿quién   pintó LA mona lisa? ") is True
    assert question_exists(session, "Pregunta distinta") is False


def test_get_db_yields_a_session_and_closes():
    generator = get_db()
    db = next(generator)

    assert db is not None

    generator.close()


def test_get_api_key_missing(monkeypatch):
    monkeypatch.setattr(av, "_load_env", lambda: None)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(av.AIValidationError) as excinfo:
        av.get_api_key()

    assert excinfo.value.status_code == 503


def test_get_api_key_present(monkeypatch):
    monkeypatch.setattr(av, "_load_env", lambda: None)
    monkeypatch.setenv("GEMINI_API_KEY", "secret")

    assert av.get_api_key() == "secret"


def test_get_model_name_defaults_and_override(monkeypatch):
    monkeypatch.setattr(av, "_load_env", lambda: None)

    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    assert av.get_model_name() == av.DEFAULT_MODEL

    monkeypatch.setenv("GEMINI_MODEL", "custom-model")
    assert av.get_model_name() == "custom-model"


def test_load_env_reads_file(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# comment\n\nGEMINI_TEST_A=hello\nGEMINI_TEST_B='quoted'\nnot-an-entry\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(av, "_ENV_PATH", env_file)
    monkeypatch.delenv("GEMINI_TEST_A", raising=False)
    monkeypatch.delenv("GEMINI_TEST_B", raising=False)

    av._load_env()

    assert os.environ["GEMINI_TEST_A"] == "hello"
    assert os.environ["GEMINI_TEST_B"] == "quoted"


def test_load_env_ignores_missing_file(monkeypatch, tmp_path):
    monkeypatch.setattr(av, "_ENV_PATH", tmp_path / "absent.env")

    av._load_env()


def test_model_candidates_are_unique_and_lead_with_configured(monkeypatch):
    monkeypatch.setattr(av, "get_model_name", lambda: "gemini-3.5-flash")

    candidates = av._model_candidates()

    assert candidates[0] == "gemini-3.5-flash"
    assert len(candidates) == len(set(candidates))


def test_clean_distractors_removes_answer_empty_and_duplicates():
    cleaned = av._clean_distractors(["  ", "A", "a", "B", "C"], "a")

    assert cleaned == ["B", "C"]


def test_validate_content_delegates_to_run(monkeypatch):
    result = av.ValidationResult(plausible=True, status="valid", reasons=["ok"])
    monkeypatch.setattr(av, "_run", lambda *args: result)

    assert av.validate_content("arte", "q", "a") is result


def test_generate_distractors_returns_three(monkeypatch):
    monkeypatch.setattr(
        av,
        "_run",
        lambda *args: av.DistractorSet(distractors=["a", "b", "c", "a"]),
    )

    assert av.generate_distractors("arte", "q", "z") == ["a", "b", "c"]


def test_generate_distractors_retries_then_raises(monkeypatch):
    calls = {"count": 0}

    def fake_run(*args):
        calls["count"] += 1
        return av.DistractorSet(distractors=["a", "a"])

    monkeypatch.setattr(av, "_run", fake_run)

    with pytest.raises(av.AIValidationError) as excinfo:
        av.generate_distractors("arte", "q", "z", attempts=2)

    assert excinfo.value.status_code == 502
    assert calls["count"] == 2


def test_assess_question_plausible_includes_distractors(monkeypatch):
    monkeypatch.setattr(
        av,
        "validate_content",
        lambda *args: av.ValidationResult(plausible=True, status="valid", reasons=["r"]),
    )
    monkeypatch.setattr(av, "generate_distractors", lambda *args: ["x", "y", "z"])

    result = av.assess_question("arte", "q", "a")

    assert result["plausible"] is True
    assert result["distractors"] == ["x", "y", "z"]


def test_assess_question_implausible_skips_distractors(monkeypatch):
    monkeypatch.setattr(
        av,
        "validate_content",
        lambda *args: av.ValidationResult(plausible=False, status="implausible", reasons=["bad"]),
    )

    result = av.assess_question("arte", "q", "a")

    assert result["plausible"] is False
    assert result["distractors"] == []


def test_run_returns_agent_output(monkeypatch):
    class FakeAgent:
        def run_sync(self, prompt):
            return SimpleNamespace(output="RESULT")

    monkeypatch.setattr(av, "_model_candidates", lambda: ["m1"])
    monkeypatch.setattr(av, "_build_agent", lambda *args: FakeAgent())

    assert av._run(dict, "instructions", "prompt") == "RESULT"


def test_run_reraises_configuration_error(monkeypatch):
    def raising_build(*args):
        raise av.AIValidationError("missing", status_code=503)

    monkeypatch.setattr(av, "_model_candidates", lambda: ["m1"])
    monkeypatch.setattr(av, "_build_agent", raising_build)

    with pytest.raises(av.AIValidationError) as excinfo:
        av._run(dict, "instructions", "prompt")

    assert excinfo.value.status_code == 503


def test_run_falls_back_across_models_then_raises_502(monkeypatch):
    seen: list[str] = []

    def failing_build(model_name, *args):
        seen.append(model_name)
        raise RuntimeError("provider down")

    monkeypatch.setattr(av, "_model_candidates", lambda: ["m1", "m2"])
    monkeypatch.setattr(av, "_build_agent", failing_build)

    with pytest.raises(av.AIValidationError) as excinfo:
        av._run(dict, "instructions", "prompt")

    assert excinfo.value.status_code == 502
    assert seen == ["m1", "m2"]


def test_build_agent_constructs_an_agent(monkeypatch):
    monkeypatch.setattr(av, "get_api_key", lambda: "test-key")

    agent = av._build_agent(av.DEFAULT_MODEL, av.ValidationResult, "instructions")

    assert agent is not None
