# EXERCISE — Paso a Paso Práctico

Guía secuencial para construir el proyecto completo desde cero.

---

## Requisitos previos

- Python 3.10+
- Docker y Docker Compose instalados

Verificá con:

```bash
python --version
docker --version
docker compose version
```

---

## Paso 1: Instalar Poetry

### Linux / macOS / WSL

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### Windows (PowerShell)

```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

Verificá:

```bash
poetry --version
```

> Si el comando no se encuentra, agregá `$HOME/.local/bin` (o `%APPDATA%\Python\Scripts` en Windows) al `PATH`.

---

## Paso 2: Inicializar el proyecto

```bash
cd "C:\Users\Iván\Desktop\Trabajos\[01] - Practica Profesionalizante II\full-app-ai-scenario"
poetry init --name "fastapi-questions" --description "Juego de preguntados con FastAPI, PostgreSQL y dataset local" --python "^3.10" --no-interaction
```

> **Nota:** el CSV `preguntas_preguntados.csv` con las 200 preguntas ya está en esta carpeta. El proyecto se crea acá mismo, así el CSV queda en la raíz del proyecto.

Esto genera el archivo `pyproject.toml`.

---

## Paso 3: Agregar dependencias

```bash
poetry add fastapi uvicorn sqlalchemy psycopg2-binary pandas pyarrow requests
```

Opcional (para testing):

```bash
poetry add --group dev pytest httpx
```

---

## Paso 4: Levantar la base de datos con Docker Compose

Ya creamos `docker-compose.yml`. Ahora levantala:

```bash
docker compose up -d
```

Verificá que esté corriendo:

```bash
docker compose ps
```

Probá la conexión (opcional):

```bash
docker compose exec db psql -U admin -d questions_db -c "\dt"
```

Para frenar la base de datos cuando termines:

```bash
docker compose down
```

Agregá `-v` al final si querés borrar también el volumen (los datos):

```bash
docker compose down -v
```

---

## Paso 5: Configurar la conexión a la base de datos

Creá la carpeta `app/` con los siguientes archivos.

### `app/__init__.py`

```python
```

(Archivo vacío para que Python trate `app/` como un paquete.)

### `app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://admin:admin123@localhost:5432/questions_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Paso 6: Definir el modelo de datos

### `app/models.py`

```python
from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    source = Column(String(255), nullable=True)
```

> **Nota:** al estilo "preguntados", cada pregunta tiene 4 opciones (`option_a` a `option_d`). En `answer` guardamos el **texto** de la opción correcta (quitamos la letra), para que el juego solo tenga que comparar la opción elegida por el jugador contra `answer`. La columna `source` indica el origen de los datos (ej. `preguntados.csv`).

---

## Paso 7: Cargar datos desde el CSV local

> **Contexto:** el profe pidió que eventualmente los datos vengan de Hugging Face. Por ahora, para arrancar sin dolores de cabeza, cargamos el CSV local `preguntas_preguntados.csv`. Más adelante se migra a un dataset de Hugging Face (ver la nota al final del paso).

### `app/load_data.py`

```python
import pandas as pd
from app.database import SessionLocal, engine
from app.models import Base, Question

CSV_PATH = "preguntas_preguntados.csv"

LETRA_A_COLUMNA = {
    "a": "option_a",
    "b": "option_b",
    "c": "option_c",
    "d": "option_d",
}


def load_questions():
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv(CSV_PATH)
    print(f"Columnas disponibles: {list(df.columns)}")
    print(f"Filas: {len(df)}")
    print(df.head(3))

    session = SessionLocal()
    try:
        for _, row in df.iterrows():
            letra = str(row["respuesta_correcta"]).strip().lower()
            columna_correcta = LETRA_A_COLUMNA[letra]
            question = Question(
                question=row["pregunta"],
                option_a=row["opcion_a"],
                option_b=row["opcion_b"],
                option_c=row["opcion_c"],
                option_d=row["opcion_d"],
                answer=row[columna_correcta],
                category=row["categoria"],
                source="preguntados.csv",
            )
            session.add(question)

        session.commit()
        print(f"Se insertaron {len(df)} preguntas correctamente.")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    load_questions()
```

Ejecutá el script (desde la raíz del proyecto, donde está el CSV):

```bash
poetry run python app/load_data.py
```

> **Nota (hoja de ruta a Hugging Face):** el CSV tiene 200 filas fijas y una estructura simple (`categoria,pregunta,opcion_a..d,respuesta_correcta`). Para migrar luego, solo habría que reemplazar el `pd.read_csv(CSV_PATH)` por la lectura de un Parquet remoto (como en la versión original) dejando intacta la lógica de `LETRA_A_COLUMNA`. Buscá un dataset de trivias/QA con formato Parquet en https://huggingface.co/datasets.

---

## Paso 8: Crear la API con FastAPI

### `app/main.py`

```python
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import Base, Question

app = FastAPI(title="Questions API", version="1.0.0")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Questions API funcionando", "endpoints": ["/questions", "/questions/{id}"]}


@app.get("/questions")
def list_questions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    questions = db.query(Question).offset(skip).limit(limit).all()
    return questions


@app.get("/questions/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return {"error": "Pregunta no encontrada"}
    return question
```

---

## Paso 9: Correr la API

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visitá en el navegador:

| URL | Qué hace |
|---|---|
| `http://localhost:8000` | Mensaje de bienvenida |
| `http://localhost:8000/docs` | Documentación interactiva (Swagger UI) |
| `http://localhost:8000/questions` | Primeras 10 preguntas |
| `http://localhost:8000/questions?skip=10&limit=5` | Preguntas 11 a 15 |
| `http://localhost:8000/questions/1` | Pregunta con ID = 1 |

---

## Paso 10: Probar desde Python (cliente)

Sin cerrar la API, abrí otra terminal y ejecutá:

```bash
poetry run python
```

```python
import requests

r = requests.get("http://localhost:8000/questions", params={"limit": 3})
data = r.json()
for q in data:
    print(f"[{q['id']}] {q['question'][:60]}...")
```

---

## Resumen de comandos útiles

| Acción | Comando |
|---|---|
| Iniciar BD | `docker compose up -d` |
| Detener BD | `docker compose down` |
| Cargar datos | `poetry run python app/load_data.py` |
| Iniciar API | `poetry run uvicorn app.main:app --reload` |
| Abrir Python | `poetry run python` |
| Agregar lib | `poetry add <paquete>` |
| Ver dependencias | `poetry show` |

---

## Para explorar más

1. Agregá un endpoint `GET /questions/category/{category}` que filtre por categoría.
2. Agregá un endpoint `GET /stats` que devuelva cantidad total de preguntas y cantidad por categoría.
3. Migrá la carga de datos del CSV local a un dataset de Hugging Face (reemplazando solo el `pd.read_csv` del Paso 7).
4. Agregá un endpoint POST para crear preguntas nuevas.
5. Escribí tests con `pytest` y `httpx`.
