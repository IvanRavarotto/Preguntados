import pytest

QUESTION_FIELDS = {
    "id",
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "category",
    "confidence_score",
    "is_automatic",
    "dataset_category",
    "source",
}


def test_list_questions_paginates_in_id_order(client, seed_question):
    records = [seed_question(question=f"Pregunta {index}", category="arte") for index in range(3)]

    response = client.get("/questions", params={"skip": 1, "limit": 1})

    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [records[1].id]


def test_get_question_returns_the_record(client, seed_question):
    record = seed_question(question="¿Capital de Francia?", category="geografia")

    body = client.get(f"/questions/{record.id}").json()

    assert body["id"] == record.id
    assert body["question"] == "¿Capital de Francia?"
    assert body["category"] == "geografia"


def test_get_question_returns_404_when_missing(client):
    response = client.get("/questions/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "question_not_found"


@pytest.mark.parametrize("path", ["/questions", "/questions/category/arte", "/questions/{id}"])
def test_question_payloads_share_one_shape_without_the_answer(client, seed_question, path):
    record = seed_question(question="¿Quién pintó el Guernica?", category="arte", answer="A")

    body = client.get(path.format(id=record.id)).json()
    question = body if isinstance(body, dict) else body[0]

    assert set(question) == QUESTION_FIELDS
    assert "answer" not in question


def test_category_is_the_networks_in_every_route(client, seed_question):
    record = seed_question(
        question="Verdadero o falso: Shakira nació en Colombia.",
        category="historia",
        dataset_category="entretenimiento",
    )

    single = client.get(f"/questions/{record.id}").json()
    listed = client.get("/questions").json()[0]
    batch = client.get("/questions/category/historia").json()[0]

    for body in (single, listed, batch):
        assert body["category"] == "historia"
        assert body["dataset_category"] == "entretenimiento"


def test_list_by_category_joins_categorization(client, seed_question):
    seed_question(question="A", category="arte")
    seed_question(question="B", category="ciencia")

    rows = client.get("/questions/category/arte").json()

    assert len(rows) == 1
    assert rows[0]["question"] == "A"
    assert rows[0]["category"] == "arte"
    assert rows[0]["confidence_score"] == 0.9
    assert rows[0]["is_automatic"] is True


def test_list_by_category_is_empty_for_a_known_category_without_questions(client, seed_question):
    seed_question(question="A", category="arte")

    rows = client.get("/questions/category/historia").json()

    assert rows == []


def test_list_by_category_returns_404_for_an_unknown_category(client):
    response = client.get("/questions/category/matematica")

    assert response.status_code == 404
    assert response.json()["detail"] == "category_unknown"


def test_category_batches_are_random_samples(client, seed_question):
    for index in range(20):
        seed_question(question=f"Pregunta {index}", category="arte")

    batches = {
        tuple(row["id"] for row in client.get("/questions/category/arte?limit=5").json())
        for _ in range(10)
    }

    assert len(batches) > 1


def test_a_large_limit_returns_the_whole_category(client, seed_question):
    for index in range(12):
        seed_question(question=f"Pregunta {index}", category="arte")

    rows = client.get("/questions/category/arte?limit=1000").json()

    assert len(rows) == 12


@pytest.mark.parametrize(
    ("path", "params"),
    [
        ("/questions", {"limit": -1}),
        ("/questions", {"limit": 0}),
        ("/questions", {"limit": 1001}),
        ("/questions", {"skip": -1}),
        ("/questions/category/arte", {"limit": -1}),
        ("/questions/category/arte", {"limit": 1001}),
    ],
)
def test_out_of_range_pagination_is_rejected(client, path, params):
    response = client.get(path, params=params)

    assert response.status_code == 422


def test_true_false_question_is_served_without_options_c_and_d(client, seed_question):
    seed_question(
        question="Verdadero o falso: el Aconcagua está en Mendoza.",
        category="geografia",
        answer="Verdadero",
        options=("Verdadero", "Falso", None, None),
    )

    rows = client.get("/questions/category/geografia").json()

    assert rows[0]["option_c"] is None
    assert rows[0]["option_d"] is None
