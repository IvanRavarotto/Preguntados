# Design

## Boundaries and existing contracts

La implementación permanece dentro de FastAPI, SQLAlchemy, PostgreSQL 15, `app/load_data.py` y el HTML/JavaScript ES2020 de `frontend/index.html`. `app/main.py` conserva `GET /questions`, `GET /questions/{question_id}`, `GET /questions/category/{category_name}`, `GET /categories` y `GET /categories/stats`; `app/models.py` no cambia. La partida sigue siendo estado efímero del navegador. No se agregan dependencias, servicios, llamadas externas, rutas, autenticación ni migraciones.

Las seis categorías canónicas se obtienen de `app/categories.py` y son `historia`, `geografia`, `arte`, `ciencia`, `deportes` y `entretenimiento`. La rueda conserva la paleta e iconografía nombradas por categoría en `docs/adr/ADR-001-neon-category-palette.md`.

## Match state

El estado del navegador tendrá dos jugadores y distinguirá la racha ordinaria de las coronas:

```js
{
  players: [
    {
      name,
      crowns: [],
      ordinaryStreak: 0,
      jokers: {
        eliminateTwo: { used: 0, max: 2 },
        secondChance: { used: 0, max: 2 },
        selectCorrect: { used: 0, max: 2 }
      }
    }
  ],
  turn: 0,
  pendingCategories: [],
  currentQuestion: null,
  currentFlow: null,              // ordinary | crown-challenge
  usedQuestionIds: { [category]: Set<number> },
  jokerUsedOnCurrentQuestion: false
}
```

`pendingCategories` se deriva como las seis categorías menos las coronas del jugador activo. Las coronas no se eliminan al cambiar de turno, fallar o reiniciar una racha. Un rematch reconstruye todo el estado y devuelve los seis comodines de cada jugador a `used: 0`.

## Wheel and visual overlap

La rueda se construye con seis sectores de categoría derivados de `GET /categories` y un séptimo sector estable `corona`. Toda la geometría, divisores, etiquetas, selección y cálculo de aterrizaje usa el mismo `sectorCount = 7`; la corona no se envía como nombre de categoría a la API.

Para resolver el solapamiento visual, las etiquetas se distribuyen en el centro angular de su sector, con un radio interior y una caja de etiqueta limitada al arco disponible; el icono y el texto de la corona usan una variante compacta y no se superponen con el pin, los divisores ni los sectores vecinos. El ajuste debe ser responsive en dimensiones desktop y mobile y conservar la paleta del ADR. La selección sigue siendo por `category.name`, nunca por una paleta posicional.

## Question flow

1. Un sector de categoría obtiene una pregunta no usada de esa categoría y abre un flujo `ordinary`.
2. Un acierto ordinario incrementa `ordinaryStreak` hasta 3 y mantiene el turno. Al llegar a 3, el jugador queda habilitado para elegir una categoría pendiente.
3. La elección habilitada o el sector `corona` abre exactamente una pregunta `crown-challenge` de una categoría pendiente. El desafío es obligatorio: no se puede conceder una corona sin presentar y resolver esa pregunta. El sector corona omite únicamente la exigencia de los tres aciertos.
4. Un acierto de coronación añade la categoría una sola vez, reinicia la racha a cero y mantiene el turno. La sexta corona termina la partida inmediatamente, sin pregunta final ni giro extra.
5. Un fallo o timeout en cualquier flujo reinicia la racha a cero y cambia el turno. Las coronas anteriores permanecen intactas.
6. La pregunta se marca usada al seleccionarse, antes de mostrarla. Un segundo intento reutiliza la misma pregunta y no consume otra. Si no quedan preguntas, se informa el estado y se vuelve a la rueda sin duplicar ni romper la página.

## Jokers

Cada jugador dispone de dos usos independientes de cada tipo. En una pregunta resuelta no puede activarse ningún comodín y una pregunta acepta como máximo uno, aunque el primer uso no resuelva la pregunta. `eliminar-dos` deshabilita exactamente dos opciones incorrectas; `segundo-intento` mantiene la pregunta tras el primer fallo y permite una única respuesta adicional sin revelar la correcta; `seleccionar-correcta` elige automáticamente la respuesta almacenada y resuelve como acierto. El joker activo pertenece al jugador cuyo turno está en curso. El sector corona no consume usos.

## Dataset and importer

El CSV canónico de esta change contiene exactamente 300 filas: 50 por cada una de las seis categorías, cuatro opciones no vacías y distintas por fila, y una respuesta que pertenece a esas opciones. `app/load_data.py` valida columnas, categorías, cantidades, unicidad normalizada y filas completas antes de abrir una mutación; luego reemplaza en una transacción las categorizaciones y preguntas locales, en ese orden, y vuelve a comprobar los conteos. Una fuente inválida deja la base intacta y dos importaciones válidas no duplican registros. No se cambia el schema.

## Verification and rollback

Los checks existentes de Node, Python, HTTP y datos se amplían para cubrir cada regla observable: 300 preguntas, siete sectores sin solapamiento, coronación obligatoria, victoria con seis coronas, continuidad de turno, reset de racha, no reutilización y los seis contadores de comodines (tres tipos por dos jugadores). Los controles negativos deben producir un fallo observado y los checks deben probar un conjunto no vacío antes de afirmar ausencia de violaciones.

El rollback de código es un revert de Git. El reemplazo de datos es local y transaccional; después de un commit exitoso, restaurar el dataset anterior requiere un snapshot externo porque no hay migraciones ni persistencia de partida.
