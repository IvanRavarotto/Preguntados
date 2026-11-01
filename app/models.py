from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=True)
    option_d = Column(Text, nullable=True)
    answer = Column(Text, nullable=False)
    # Etiqueta original del dataset; la categoría con la que se juega está en Categorization.
    # La columna conserva su nombre para no migrar bases ya cargadas.
    dataset_category = Column("category", String(100), nullable=True)
    source = Column(String(255), nullable=True)

    def options(self) -> list[str]:
        """Opciones presentes, en orden: dos en verdadero o falso, cuatro en el resto."""
        candidates = (getattr(self, f"option_{letter}") for letter in "abcd")
        return [option for option in candidates if option is not None]


class Categorization(Base):
    """
    Registra la categorización de cada pregunta.
    Guarda la categoría que asignó la red neuronal y su probabilidad.
    """

    __tablename__ = "categorizations"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    category_name = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    is_automatic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    question = relationship("Question", backref="categorizations")
