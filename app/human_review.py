"""
Módulo de revisión humana por consola.

Cuando la IA no tiene suficiente confianza (score < threshold),
este módulo le pregunta al usuario por terminal qué categoría corresponde.
"""


def display_question_context(question_text: str, ai_suggestion: str, confidence: float, all_scores: dict[str, float]) -> None:
    """Muestra al usuario la pregunta, la sugerencia de la IA, y los scores."""
    separator = "=" * 68
    print("\n" + separator)
    print("REVISIÓN MANUAL REQUERIDA (confianza < 70%)")
    print(separator)
    print(f"\nPregunta: {question_text}\n")
    print(f"Sugerencia de la IA: {ai_suggestion} (confianza: {confidence:.0%})\n")
    print("Scores de todas las categorías:")
    for i, (category, score) in enumerate(sorted(all_scores.items(), key=lambda item: item[1], reverse=True), start=1):
        print(f"  {i}. {category:<20} -> {score:.0%}")
    print(separator + "\n")


def ask_human_for_category(categories: list[dict[str, str]]) -> str | None:
    """
    Le pide al usuario que elija una categoría por consola.

    Returns:
        El "name" de la categoría elegida, o None si el usuario eligió skip.
    """
    while True:
        print("\nOpciones:")
        for i, category in enumerate(categories, start=1):
            print(f"  {i}. {category['label']}")
        print("  S. Skip (omitir esta pregunta)")
        choice = input("\nElegí una opción: ").strip().lower()

        if choice in ("s", "skip"):
            return None

        try:
            index = int(choice) - 1
            if 0 <= index < len(categories):
                return categories[index]["name"]
        except ValueError:
            pass

        print("Opción inválida. Intentá de nuevo.")


def confirm_ai_suggestion(ai_suggestion: str, confidence: float) -> bool:
    """Pregunta al usuario si acepta la sugerencia de la IA."""
    while True:
        answer = input(f'¿Aceptás la sugerencia "{ai_suggestion}" ({confidence:.0%})? [S/n]: ').strip().lower()
        if answer in ("", "s", "si", "yes", "y"):
            return True
        if answer in ("n", "no"):
            return False
        print("Respondé S (sí) o N (no).")