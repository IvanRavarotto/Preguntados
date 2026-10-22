import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))

from app.categories import get_category_names

API_BASE = os.environ.get("PREGUNTADOS_API", "http://localhost:8000")
REQUIRED_FIELDS = {
    "id",
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "answer",
    "category",
    "confidence_score",
    "is_automatic",
}


def get_json(path: str):
    with urlopen(f"{API_BASE}{path}", timeout=5) as response:
        return response.status, json.load(response)


def main() -> None:
    status, categories = get_json("/categories")
    assert status == 200
    category_names = [category["name"] for category in categories]
    assert category_names == get_category_names()

    status, stats = get_json("/categories/stats")
    assert status == 200
    assert stats["total_questions"] == 300
    assert stats["categorized"] == 300
    assert stats["uncategorized"] == 0
    assert stats["by_category"] == {name: 50 for name in get_category_names()}

    for category_name in get_category_names():
        status, questions = get_json(f"/questions/category/{quote(category_name)}?limit=50")
        assert status == 200
        assert len(questions) == 50
        assert questions
        for question in questions:
            assert set(question) == REQUIRED_FIELDS
            options = [question[f"option_{letter}"] for letter in "abcd"]
            assert all(options)
            assert len(set(options)) == 4
            assert question["answer"] in options
            assert question["category"] == category_name

    status, unavailable = get_json("/questions/category/no-existe?limit=50")
    assert status == 200
    assert unavailable == []

    try:
        get_json("/questions/1")
    except (HTTPError, URLError) as error:
        raise AssertionError(f"La ruta existente /questions/1 no responde: {error}") from error

    print("API_CHECK_PASS", {"categories": category_names, "stats": stats})


if __name__ == "__main__":
    main()
