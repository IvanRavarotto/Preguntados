"""
Módulo de clasificación de texto usando IA.

Este módulo provee una estrategia de clasificación:
1. Zero-shot classification con transformers (más preciso, más lento)
"""
from dataclasses import dataclass


@dataclass
class ClassificationResult:
    """
    Resultado de una clasificación.

    Atributos:
        category_name: nombre de la categoría asignada
        confidence_score: score de confianza (0.0 a 1.0)
        all_scores: diccionario con los scores de todas las categorías
    """
    category_name: str
    confidence_score: float
    all_scores: dict[str, float]


class AIClassifier:
    """
    Clasificador de texto basado en IA.

    Usa el pipeline zero-shot-classification de Hugging Face para asignar
    una categoría a un texto dado.
    """

    def __init__(self, model_name: str = "facebook/bart-large-mnli"):
        """Carga el modelo de Hugging Face y prepara el pipeline zero-shot."""
        from transformers import pipeline

        print(f"Cargando modelo de IA ({model_name})... (puede tardar la primera vez)")
        self.model_name = model_name
        device = -1
        try:
            import torch

            if torch.cuda.is_available():
                device = 0
        except ImportError:
            pass
        self.pipeline = pipeline(
            "zero-shot-classification",
            model=model_name,
            device=device,
        )
        print(f"Modelo cargado: {model_name}")

    def classify(self, text: str, candidate_labels: list[str]) -> ClassificationResult:
        """
        Clasifica un texto individual contra una lista de categorías candidatas.

        Args:
            text: el texto a clasificar (ej. una pregunta)
            candidate_labels: lista de categorías posibles

        Returns:
            ClassificationResult con la categoría ganadora, su score, y todos los scores.
        """
        result = self.pipeline(text, candidate_labels=candidate_labels, multi_label=False)
        all_scores = dict(zip(result["labels"], result["scores"]))
        return ClassificationResult(
            category_name=result["labels"][0],
            confidence_score=float(result["scores"][0]),
            all_scores=all_scores,
        )

    def classify_batch(self, texts: list[str], candidate_labels: list[str]) -> list[ClassificationResult]:
        """
        Clasifica múltiples textos contra las mismas categorías candidatas.

        Args:
            texts: lista de textos a clasificar
            candidate_labels: lista de categorías posibles

        Returns:
            Lista de ClassificationResult, uno por cada texto.
        """
        results = self.pipeline(texts, candidate_labels=candidate_labels, multi_label=False)
        parsed = []
        for result in results:
            all_scores = dict(zip(result["labels"], result["scores"]))
            parsed.append(
                ClassificationResult(
                    category_name=result["labels"][0],
                    confidence_score=float(result["scores"][0]),
                    all_scores=all_scores,
                )
            )
        return parsed