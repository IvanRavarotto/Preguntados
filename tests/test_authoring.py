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
