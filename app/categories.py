"""
Definición centralizada de las categorías disponibles para clasificación.

Cada categoría tiene:
- name: identificador interno (snake_case)
- label: nombre legible para mostrar al usuario
- description: texto que la IA usa para entender el significado de la categoría

Las categorías están alineadas con el dataset trivia_latam_argentina.csv
(trivia en español) y son mutuamente excluyentes. El dataset y la red neuronal
usan etiquetas legibles con tildes ("Geografía"); la API usa el name sin tildes.
"""

import unicodedata

CATEGORIES: list[dict[str, str]] = [
    {
        "name": "arte",
        "label": "Arte y Cultura",
        "description": (
            "Preguntas sobre pintura, escultura, arquitectura, museos, artistas "
            "famosos, obras de arte, literatura y cine."
        ),
    },
    {
        "name": "ciencia",
        "label": "Ciencia",
        "description": (
            "Preguntas sobre biología, química, física, matemáticas, astronomía, "
            "inventos, descubrimientos y científicos."
        ),
    },
    {
        "name": "deportes",
        "label": "Deportes",
        "description": (
            "Preguntas sobre fútbol, tenis, básquet, atletismo y otras disciplinas, "
            "jugadores, equipos, estadios, torneos y récords deportivos."
        ),
    },
    {
        "name": "entretenimiento",
        "label": "Entretenimiento",
        "description": (
            "Preguntas sobre música, series, películas, videojuegos, juegos de mesa, "
            "celebridades, programas de televisión y cultura pop."
        ),
    },
    {
        "name": "geografia",
        "label": "Geografía",
        "description": (
            "Preguntas sobre países, capitales, ciudades, ríos, montañas, océanos, "
            "banderas, continentes y datos geográficos del mundo."
        ),
    },
    {
        "name": "historia",
        "label": "Historia",
        "description": (
            "Preguntas sobre eventos históricos, personajes del pasado, guerras, "
            "civilizaciones, fechas importantes y hechos de la humanidad."
        ),
    },
]


def get_category_names() -> list[str]:
    """Retorna una lista con los nombres (name) de todas las categorías."""
    return [category["name"] for category in CATEGORIES]


def get_category_labels() -> list[str]:
    """Retorna una lista con los labels legibles de todas las categorías."""
    return [category["label"] for category in CATEGORIES]


def get_category_descriptions() -> list[str]:
    """Retorna una lista con las descripciones de todas las categorías."""
    return [category["description"] for category in CATEGORIES]


def find_category_by_name(name: str) -> dict | None:
    """Busca y retorna una categoría por su nombre. Retorna None si no existe."""
    for category in CATEGORIES:
        if category["name"] == name:
            return category
    return None


def category_name_for_label(label: str) -> str:
    """Convierte una etiqueta del dataset ("Geografía") en el name de la API ("geografia")."""
    decomposed = unicodedata.normalize("NFKD", label.strip())
    name = "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()
    if find_category_by_name(name) is None:
        raise ValueError(f"Categoría desconocida en el dataset: {label!r}")
    return name
