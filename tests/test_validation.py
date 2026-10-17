def payload(**overrides) -> dict:
    body = {
        "category": "arte",
        "question": "¿Quién pintó la Mona Lisa?",
        "correct_answer": "Leonardo da Vinci",
    }
    body.update(overrides)
    return body


def test_validate_returns_stubbed_verdict(client, stub_ai_ok):
    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 200
    body = response.json()
    assert body["plausible"] is True
    assert body["status"] == "valid"
    assert body["distractors"] == ["d1", "d2", "d3"]


def test_validate_maps_missing_key_to_503(client, stub_ai_error):
    stub_ai_error(503)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 503
    assert response.json()["detail"] == "forced"


def test_validate_maps_provider_error_to_502(client, stub_ai_error):
    stub_ai_error(502)

    response = client.post("/questions/validate", json=payload())

    assert response.status_code == 502
