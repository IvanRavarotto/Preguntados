import random

import pytest

from app.question_play import eliminate_options

FOUR_OPTIONS = ("Seis", "Cinco", "Siete", "Once")
TRUE_FALSE = ("Verdadero", "Falso", None, None)


@pytest.fixture
def volley(seed_question):
    return seed_question(
        question="¿Cuántos jugadores tiene un equipo de vóley en cancha?",
        category="deportes",
        answer="Seis",
        options=FOUR_OPTIONS,
    )


@pytest.fixture
def true_false(seed_question):
    return seed_question(
        question="Verdadero o falso: el Aconcagua está en Mendoza.",
        category="geografia",
        answer="Verdadero",
        options=TRUE_FALSE,
    )


def answer(client, question_id, **body):
    return client.post(f"/questions/{question_id}/answer", json=body)


def test_a_correct_answer_is_confirmed_and_revealed(client, volley):
    body = answer(client, volley.id, answer="Seis").json()

    assert body == {"correct": True, "correct_answer": "Seis"}


def test_a_wrong_answer_reveals_the_correct_one(client, volley):
    body = answer(client, volley.id, answer="Once").json()

    assert body == {"correct": False, "correct_answer": "Seis"}


def test_a_hidden_first_attempt_does_not_reveal_the_answer(client, volley):
    body = answer(client, volley.id, answer="Once", reveal=False).json()

    assert body == {"correct": False, "correct_answer": None}


def test_a_timeout_is_an_answer_of_null(client, volley):
    body = answer(client, volley.id, answer=None).json()

    assert body == {"correct": False, "correct_answer": "Seis"}


def test_an_answer_outside_the_options_is_rejected(client, volley):
    response = answer(client, volley.id, answer="Doce")

    assert response.status_code == 400
    assert response.json()["detail"] == "answer_not_in_options"


def test_true_false_answers_are_checked_against_two_options(client, true_false):
    assert answer(client, true_false.id, answer="Verdadero").json()["correct"] is True
    assert answer(client, true_false.id, answer="Falso").json()["correct"] is False


def test_reveal_returns_the_correct_answer(client, volley):
    response = client.post(f"/questions/{volley.id}/reveal")

    assert response.json() == {"correct_answer": "Seis"}


def test_eliminate_returns_two_distinct_wrong_options(client, volley):
    eliminated = client.post(f"/questions/{volley.id}/eliminate").json()["eliminated"]

    assert len(eliminated) == 2
    assert len(set(eliminated)) == 2
    assert set(eliminated) <= {"Cinco", "Siete", "Once"}


def test_eliminate_varies_which_wrong_options_it_picks(volley):
    picks = {
        frozenset(eliminate_options(volley, random.Random(seed))["eliminated"])
        for seed in range(20)
    }

    assert len(picks) > 1


def test_eliminate_refuses_a_two_option_question(client, true_false):
    response = client.post(f"/questions/{true_false.id}/eliminate")

    assert response.status_code == 409
    assert response.json()["detail"] == "not_enough_options"


@pytest.mark.parametrize("action", ["answer", "reveal", "eliminate"])
def test_play_routes_return_404_for_a_missing_question(client, action):
    response = client.post(f"/questions/999999/{action}", json={"answer": None})

    assert response.status_code == 404
    assert response.json()["detail"] == "question_not_found"
