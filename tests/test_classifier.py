import pytest
import torch
from sklearn.model_selection import train_test_split

from app.categories import category_name_for_label, get_category_names
from app.load_dataset import read_dataset
from app.neural_classifier import (
    RANDOM_STATE,
    TEST_SIZE,
    MLPClassifier,
    QuestionClassifier,
    get_classifier,
)


def test_classify_endpoint_returns_category_and_probabilities(client):
    response = client.post(
        "/classify", json={"question": "¿Qué planeta es conocido como el planeta rojo?"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "ciencia"
    assert set(body["scores"]) == set(get_category_names())
    assert sum(body["scores"].values()) == pytest.approx(1.0, abs=1e-4)
    assert body["confidence_score"] == max(body["scores"].values())


def test_classify_endpoint_rejects_blank_question(client):
    response = client.post("/classify", json={"question": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_question"


@pytest.mark.parametrize(
    ("question", "category"),
    [
        ("¿Qué club ganó la Copa Libertadores de América de 2023?", "deportes"),
        ("¿Cuál de estas ciudades se encuentra en República Dominicana?", "geografia"),
        ("¿Qué navegante llegó al Río de la Plata en 1516?", "historia"),
    ],
)
def test_classifier_recognises_typical_questions(question, category):
    assert get_classifier().classify(question).category_name == category


def test_classifier_keeps_its_accuracy_on_the_held_out_split():
    rows = read_dataset()
    labels = [row["category"] for row in rows]
    _, test_rows = train_test_split(
        rows, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=labels
    )

    results = get_classifier().classify_batch([row["question"] for row in test_rows])
    hits = sum(result.category_name == row["category"] for result, row in zip(results, test_rows))

    assert hits / len(test_rows) >= 0.95


def test_classify_batch_of_nothing_is_empty():
    assert get_classifier().classify_batch([]) == []


def test_weights_that_do_not_match_the_vocabulary_are_rejected(tmp_path):
    weights = tmp_path / "wrong.pth"
    torch.save(MLPClassifier(input_dim=10, num_classes=6).state_dict(), weights)

    with pytest.raises(ValueError, match="10 términos"):
        QuestionClassifier(weights_path=weights)


def test_dataset_labels_map_to_api_category_names():
    assert category_name_for_label("Geografía") == "geografia"
    assert category_name_for_label(" Entretenimiento ") == "entretenimiento"
    with pytest.raises(ValueError):
        category_name_for_label("Matemática")
