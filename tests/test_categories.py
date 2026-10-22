from app.categories import (
    get_category_descriptions,
    get_category_labels,
    get_category_names,
)


def test_list_categories_returns_six_entries(client):
    response = client.get("/categories")

    assert response.status_code == 200
    categories = response.json()
    assert len(categories) == 6
    assert {"name", "label", "description"} <= set(categories[0])


def test_category_list_helpers_cover_the_catalog():
    assert get_category_names() == [
        "arte",
        "ciencia",
        "deportes",
        "entretenimiento",
        "geografia",
        "historia",
    ]
    assert "Arte y Cultura" in get_category_labels()
    assert all(get_category_descriptions())


def test_stats_on_empty_database(client):
    body = client.get("/categories/stats").json()

    assert body["total_questions"] == 0
    assert body["categorized"] == 0
    assert body["uncategorized"] == 0
    assert body["automatic"] == 0
    assert body["manual"] == 0
    assert body["by_category"] == {}


def test_stats_reports_counts_and_breakdown(client, seed_question):
    seed_question(question="Q1", category="arte", automatic=True)
    seed_question(question="Q2", category="arte", automatic=True)
    seed_question(question="Q3", category="ciencia", automatic=False)
    seed_question(question="Q4", category="ciencia", categorize=False)

    body = client.get("/categories/stats").json()

    assert body["total_questions"] == 4
    assert body["categorized"] == 3
    assert body["uncategorized"] == 1
    assert body["automatic"] == 2
    assert body["manual"] == 1
    assert body["by_category"] == {"arte": 2, "ciencia": 1}
