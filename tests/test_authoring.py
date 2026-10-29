import pytest

from app.models import Question


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


def test_create_question_is_categorized_by_the_network(client):
    response = client.post("/questions", json=payload())

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["category"] == "arte"
    assert 0 < body["confidence_score"] <= 1

    stats = client.get("/categories/stats").json()
    assert stats["total_questions"] == 1
    assert stats["automatic"] == 1
    assert stats["manual"] == 0
    assert stats["by_category"] == {"arte": 1}


def test_created_question_is_served_in_its_predicted_category(client):
    created = client.post("/questions", json=payload()).json()

    rows = client.get(f"/questions/category/{created['category']}").json()

    assert [row["id"] for row in rows] == [created["id"]]


def test_create_question_ignores_a_client_supplied_category(client):
    response = client.post("/questions", json=payload(category="deportes"))

    assert response.json()["category"] == "arte"


def test_create_question_missing_fields(client):
    response = client.post("/questions", json=payload(question=""))

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_fields"


def test_create_question_options_not_distinct(client):
    response = client.post("/questions", json=payload(option_b="Leonardo da Vinci"))

    assert response.status_code == 400
    assert response.json()["detail"] == "options_not_distinct"


def test_create_question_answer_not_in_options(client):
    response = client.post("/questions", json=payload(correct_answer="Miguel Ángel"))

    assert response.status_code == 400
    assert response.json()["detail"] == "answer_not_in_options"


def test_create_question_duplicate(client, seed_question):
    seed_question(question="¿Quién pintó la Mona Lisa?", category="arte")

    response = client.post("/questions", json=payload())

    assert response.status_code == 409
    assert response.json()["detail"] == "duplicate_question"


@pytest.mark.parametrize("field", ["option_c", "option_d"])
def test_multiple_choice_missing_options(client, field):
    response = client.post("/questions", json=payload(**{field: ""}))

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_fields"
    assert client.get("/categories/stats").json()["total_questions"] == 0


@pytest.mark.parametrize("answer", ["Vincent van Gogh", "Claude Monet"])
def test_multiple_choice_answer_may_be_any_option(client, answer):
    response = client.post("/questions", json=payload(correct_answer=answer))

    assert response.status_code == 201
    row = client.get(f"/questions/{response.json()['id']}").json()
    assert row["answer"] == answer


def test_true_false_question_is_created(client):
    response = client.post("/questions", json=true_false_payload())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "category", "confidence_score"}
    assert isinstance(body["id"], int)
    assert body["category"] in {
        "arte",
        "ciencia",
        "deportes",
        "entretenimiento",
        "geografia",
        "historia",
    }
    assert 0 < body["confidence_score"] <= 1


def test_true_false_question_persists_two_options(client, session):
    response = client.post("/questions", json=true_false_payload())
    assert response.status_code == 201
    created = response.json()

    row = client.get(f"/questions/{created['id']}").json()
    assert row["question"] == "¿El Sol es una estrella?"
    assert row["option_a"] == "Verdadero"
    assert row["option_b"] == "Falso"
    assert row["option_c"] is None
    assert row["option_d"] is None
    assert row["answer"] in {"Verdadero", "Falso"}

    stored = session.get(Question, created["id"])
    assert stored.option_c is None
    assert stored.option_d is None


def test_true_false_question_category_fetch_has_null_c_d(client):
    response = client.post("/questions", json=true_false_payload())
    assert response.status_code == 201
    created = response.json()

    rows = client.get(f"/questions/category/{created['category']}?limit=200").json()
    row = next(item for item in rows if item["id"] == created["id"])
    assert row["option_a"] == "Verdadero"
    assert row["option_b"] == "Falso"
    assert row["option_c"] is None
    assert row["option_d"] is None
    assert row["answer"] in {"Verdadero", "Falso"}
    assert row["category"] == created["category"]
    assert row["confidence_score"] == created["confidence_score"]


def test_true_false_with_supplied_c_d(client, session):
    response = client.post(
        "/questions",
        json=true_false_payload(option_c="Tal vez", option_d="No sé"),
    )

    assert response.status_code == 201
    created = response.json()

    row = client.get(f"/questions/{created['id']}").json()
    assert row["option_c"] is None
    assert row["option_d"] is None

    rows = client.get(f"/questions/category/{created['category']}?limit=200").json()
    fetched = next(item for item in rows if item["id"] == created["id"])
    assert fetched["option_c"] is None
    assert fetched["option_d"] is None

    stored = session.get(Question, created["id"])
    assert stored.option_c is None
    assert stored.option_d is None


def test_true_false_accepts_omitted_c_d(client):
    body = true_false_payload()
    del body["option_c"]
    del body["option_d"]

    response = client.post("/questions", json=body)

    assert response.status_code == 201
    row = client.get(f"/questions/{response.json()['id']}").json()
    assert row["option_c"] is None
    assert row["option_d"] is None


@pytest.mark.parametrize("field", ["question", "option_a", "option_b", "correct_answer"])
@pytest.mark.parametrize("blank", ["", "   "])
def test_true_false_missing_fields(client, field, blank):
    response = client.post("/questions", json=true_false_payload(**{field: blank}))

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_fields"
    assert client.get("/categories/stats").json()["total_questions"] == 0


def test_true_false_options_not_distinct(client):
    response = client.post("/questions", json=true_false_payload(option_b="Verdadero"))

    assert response.status_code == 400
    assert response.json()["detail"] == "options_not_distinct"
    assert client.get("/categories/stats").json()["total_questions"] == 0


def test_true_false_options_not_distinct_after_trimming(client):
    response = client.post("/questions", json=true_false_payload(option_b="  Verdadero  "))

    assert response.status_code == 400
    assert response.json()["detail"] == "options_not_distinct"
    assert client.get("/categories/stats").json()["total_questions"] == 0


def test_true_false_answer_not_in_options(client):
    invalid_payloads = (
        true_false_payload(correct_answer="Tal vez"),
        true_false_payload(correct_answer="Tal vez", option_c="Tal vez", option_d="No sé"),
    )
    for body in invalid_payloads:
        response = client.post("/questions", json=body)
        assert response.status_code == 400
        assert response.json()["detail"] == "answer_not_in_options"

    accepted = client.post("/questions", json=true_false_payload(correct_answer="Falso"))
    assert accepted.status_code == 201
    assert client.get("/categories/stats").json()["total_questions"] == 1


def test_true_false_duplicate(client, seed_question):
    seed_question(question="¿El Sol es una estrella?", category="ciencia")

    response = client.post("/questions", json=true_false_payload())

    assert response.status_code == 409
    assert response.json()["detail"] == "duplicate_question"
    assert client.get("/categories/stats").json()["total_questions"] == 1


def test_unknown_question_type_rejected(client):
    response = client.post("/questions", json=true_false_payload(question_type="boolean"))

    assert response.status_code == 422
    assert client.get("/categories/stats").json()["total_questions"] == 0

    accepted = client.post("/questions", json=true_false_payload())
    assert accepted.status_code == 201
    assert client.get("/categories/stats").json()["total_questions"] == 1


def test_multiple_choice_default_unchanged(client):
    response = client.post("/questions", json=payload())

    assert response.status_code == 201
    assert set(response.json()) == {"id", "category", "confidence_score"}

    row = client.get(f"/questions/{response.json()['id']}").json()
    assert [row["option_a"], row["option_b"], row["option_c"], row["option_d"]] == [
        "Leonardo da Vinci",
        "Pablo Picasso",
        "Vincent van Gogh",
        "Claude Monet",
    ]
    assert row["answer"] == "Leonardo da Vinci"
    assert row["category"] == "arte"


def test_multiple_choice_explicit_type_unchanged(client):
    response = client.post("/questions", json=payload(question_type="multiple_choice"))

    assert response.status_code == 201
    assert set(response.json()) == {"id", "category", "confidence_score"}

    row = client.get(f"/questions/{response.json()['id']}").json()
    assert [row["option_a"], row["option_b"], row["option_c"], row["option_d"]] == [
        "Leonardo da Vinci",
        "Pablo Picasso",
        "Vincent van Gogh",
        "Claude Monet",
    ]
    assert row["answer"] == "Leonardo da Vinci"
    assert row["category"] == "arte"
