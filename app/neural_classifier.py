"""
Clasificador de preguntas basado en una red neuronal multicapa (MLP).

La red se entrenó sobre vectores TF-IDF de las preguntas de
``trivia_latam_argentina.csv`` y sus pesos están en ``modelo.pth``. El archivo
de pesos no incluye el vectorizador, así que se reconstruye exactamente igual
que en el entrenamiento: la misma partición 80/20 estratificada con semilla 42
y el mismo ``TfidfVectorizer`` ajustado solo sobre la parte de entrenamiento.
"""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import pandas as pd
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from torch import nn

from app.categories import category_name_for_label

APP_DIR = Path(__file__).resolve().parent
DATASET_PATH = APP_DIR / "trivia_latam_argentina.csv"
WEIGHTS_PATH = APP_DIR / "modelo.pth"

TEST_SIZE = 0.2
RANDOM_STATE = 42
MAX_FEATURES = 5000


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
    """Carga los pesos entrenados y clasifica textos de preguntas en una categoría."""

    def __init__(self, dataset_path: Path = DATASET_PATH, weights_path: Path = WEIGHTS_PATH):
        dataset = pd.read_csv(dataset_path)
        label_encoder = LabelEncoder()
        labels = label_encoder.fit_transform(dataset["category"])
        train_texts, _, _, _ = train_test_split(
            dataset["question"].values,
            labels,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=labels,
        )

        self.vectorizer = TfidfVectorizer(max_features=MAX_FEATURES, stop_words="english")
        self.vectorizer.fit(train_texts)
        self.category_names = [category_name_for_label(label) for label in label_encoder.classes_]

        state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
        input_dim = state_dict["network.0.weight"].shape[1]
        vocabulary_size = len(self.vectorizer.vocabulary_)
        if input_dim != vocabulary_size:
            raise ValueError(
                f"Los pesos esperan {input_dim} términos TF-IDF y el vectorizador "
                f"reconstruido tiene {vocabulary_size}"
            )

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
