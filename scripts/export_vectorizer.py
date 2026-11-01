"""
Exporta el vectorizador TF-IDF con el que se entrenó app/modelo.pth.
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

APP_DIR = Path(__file__).resolve().parent.parent / "app"

dataset = pd.read_csv(APP_DIR / "trivia_latam_argentina.csv")
train_texts, _ = train_test_split(
    dataset["question"].values,
    test_size=0.2,
    random_state=42,
    stratify=dataset["category"],
)
vectorizer = TfidfVectorizer(max_features=5000, stop_words="english").fit(train_texts)
joblib.dump(vectorizer, APP_DIR / "vectorizador.joblib")
print(f"Vocabulario: {len(vectorizer.vocabulary_)} términos")
