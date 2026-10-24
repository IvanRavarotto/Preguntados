def test_list_questions_paginates(client, seed_question):
    for index in range(3):
        seed_question(question=f"Pregunta {index}", category="arte")

    response = client.get("/questions", params={"skip": 1, "limit": 1})

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_question_returns_the_record(client, seed_question):
    record = seed_question(question="¿Capital de Francia?", category="geografia")

    body = client.get(f"/questions/{record.id}").json()

    assert body["id"] == record.id
    assert body["question"] == "¿Capital de Francia?"
    assert body["category"] == "geografia"


def test_get_question_returns_error_body_when_missing(client):
    body = client.get("/questions/999999").json()

    assert body == {"error": "Pregunta no encontrada"}


def test_list_by_category_joins_categorization(client, seed_question):
    seed_question(question="A", category="arte")
    seed_question(question="B", category="ciencia")

    rows = client.get("/questions/category/arte").json()

    assert len(rows) == 1
    assert rows[0]["question"] == "A"
    assert rows[0]["category"] == "arte"
    assert rows[0]["confidence_score"] == 0.9
    assert rows[0]["is_automatic"] is True


def test_list_by_category_returns_empty_for_unused_category(client, seed_question):
    seed_question(question="A", category="arte")

    rows = client.get("/questions/category/historia").json()

    assert rows == []
