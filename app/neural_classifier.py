"""
Clasificador de preguntas basado en una red neuronal multicapa (MLP).
"""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import joblib
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from torch import nn

from app.categories import get_category_names

APP_DIR = Path(__file__).resolve().parent
WEIGHTS_PATH = APP_DIR / "modelo.pth"
VECTORIZER_PATH = APP_DIR / "vectorizador.joblib"

# El LabelEncoder del entrenamiento ordena las etiquetas alfabéticamente, y
# quitar las tildes ("Geografía" -> "geografia") no altera ese orden.
CLASS_NAMES = sorted(get_category_names())


class MLPClassifier(nn.Module):
    """Red multicapa: entrada TF-IDF -> 256 -> 64 -> una salida por categoría."""

    def __init__(self, input_dim: int, num_classes: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


@dataclass
class ClassificationResult:
    """Categoría asignada por la red, su probabilidad y la de todas las categorías."""

    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class QuestionClassifier:
    """Carga el vectorizador y los pesos entrenados y clasifica textos de preguntas."""

    def __init__(self, vectorizer_path: Path = VECTORIZER_PATH, weights_path: Path = WEIGHTS_PATH):
        self.vectorizer = joblib.load(vectorizer_path)
        if not isinstance(self.vectorizer, TfidfVectorizer):
            raise TypeError(f"{vectorizer_path.name} no contiene un TfidfVectorizer")

        state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
        input_dim = state_dict["network.0.weight"].shape[1]
        vocabulary_size = len(self.vectorizer.vocabulary_)
        if input_dim != vocabulary_size:
            raise ValueError(
                f"Los pesos esperan {input_dim} términos TF-IDF y el vectorizador "
                f"tiene {vocabulary_size}"
            )

        self.category_names = CLASS_NAMES
        self.model = MLPClassifier(input_dim=input_dim, num_classes=len(self.category_names))
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def classify_batch(self, texts: list[str]) -> list[ClassificationResult]:
        if not texts:
            return []
        features = torch.tensor(self.vectorizer.transform(texts).toarray(), dtype=torch.float32)
        with torch.no_grad():
            probabilities = torch.softmax(self.model(features), dim=1)

        results = []
        for row in probabilities.tolist():
            all_scores = dict(zip(self.category_names, row))
            best = max(all_scores, key=all_scores.__getitem__)
            results.append(
                ClassificationResult(
                    category_name=best,
                    confidence_score=all_scores[best],
                    all_scores=all_scores,
                )
            )
        return results

    def classify(self, text: str) -> ClassificationResult:
        return self.classify_batch([text])[0]


@lru_cache(maxsize=1)
def get_classifier() -> QuestionClassifier:
    """Instancia única del clasificador, creada la primera vez que se necesita."""
    return QuestionClassifier()
