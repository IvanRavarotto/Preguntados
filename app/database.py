import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_DATABASE_URL = "postgresql+psycopg2://admin:admin123@localhost:5432/questions_db"


def normalize_database_url(url: str) -> str:
    """Accept the ``postgres://`` scheme used by some hosting platforms."""
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


DATABASE_URL = normalize_database_url(os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL))

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
