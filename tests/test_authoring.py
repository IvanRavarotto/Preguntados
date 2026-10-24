def payload(**overrides) -> dict:
    body = {
        "category": "arte",
        "question": "¿Quién pintó la Mona Lisa?",
        "option_a": "Leonardo da Vinci",
        "option_b": "Pablo Picasso",
        "option_c": "Vincent van Gogh",
        "option_d": "Claude Monet",
        "correct_answer": "Leonardo da Vinci",
    }
    body.update(overrides)
    return body


def test_create_question_persists_question_and_categorization(client):
    response = client.post("/questions", json=payload())

    assert response.status_code == 201
    assert isinstance(response.json()["id"], int)

    stats = client.get("/categories/stats").json()
    assert stats["total_questions"] == 1
    assert stats["manual"] == 1
    assert stats["by_category"] == {"arte": 1}


def test_create_question_missing_fields(client):
    response = client.post("/questions", json=payload(question=""))

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_fields"


def test_create_question_category_unknown(client):
    response = client.post("/questions", json=payload(category="matematica"))

    assert response.status_code == 404
    assert response.json()["detail"] == "category_unknown"


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
