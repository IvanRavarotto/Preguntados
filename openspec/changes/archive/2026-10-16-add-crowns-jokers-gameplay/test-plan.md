# Test plan — `add-crowns-jokers-gameplay`

| | |
|---|---|
| Change | `add-crowns-jokers-gameplay` |
| Branch | `feature/add-crowns-jokers-gameplay` |
| Track | 2 (Full), porque cambia reglas de juego, estado de partida, ruleta y carga de datos |
| Capability | `gameplay` |
| Delta bajo prueba | `openspec/changes/add-crowns-jokers-gameplay/specs/gameplay/spec.md` |
| Artefactos consultados | `proposal.md`, `design.md`, `tasks.md`, `openspec/project.md` |
| Superficies inspeccionadas | `app/main.py`, `app/load_data.py`, `app/models.py`, `app/categories.py`, `frontend/index.html` |
| Responsable | `qa-manager` |
| Estado | Plan previo a implementación; no se ejecutaron todavía los casos de comportamiento del cambio |

## 1. Alcance

### Incluido

- Dataset canónico de 300 preguntas: seis categorías, 50 por categoría, unicidad e importación idempotente.
- Rechazo atómico de fuentes inválidas o duplicadas.
- Integridad y estabilidad de las respuestas y rutas HTTP existentes.
- Estado local 1v1 con coronas, rachas, desafíos, turnos y victoria inmediata.
- Ruleta de siete sectores, incluyendo el sector de corona ilimitado y su enrutamiento.
- No reutilización de preguntas durante una partida y reinicio al comenzar una revancha.
- Los tres comodines, inventario compartido y límite de dos activaciones.
- Frontend estático servido por FastAPI, flujo local para dos jugadores y regresión visual básica en escritorio y móvil.

### Fuera de alcance

- Autenticación, multiplayer remoto, matchmaking, persistencia de partidas, historial de puntuaciones y nuevos modos.
- Cambios de esquema o migraciones; la prueba debe confirmar que no son necesarios.
- Nuevas rutas HTTP, puntos, primera persona a 10, pregunta final, comodines adicionales y despliegue.
- Pruebas de carga, auditoría completa de accesibilidad, compatibilidad cross-browser y cobertura porcentual: no hay criterio ni herramienta configurada para ellos.

## 2. Limitaciones y estrategia

`openspec/project.md` declara que el repositorio no tiene framework automatizado de tests, lint, type-check ni umbral de cobertura. Por tanto, este plan no inventa una dependencia ni presenta checks manuales como una suite automatizada.

Se usarán tres niveles:

| Nivel | Instrumento | Propósito |
|---|---|---|
| Automatizable | `poetry run python -m compileall -q app`; extracción de `<script>` y `node --check`; checks DOM-free con `node -e`/`node:vm` y herramientas estándar disponibles | Sintaxis Python/JavaScript y transiciones puras de dataset/estado cuando existan funciones o seams ejecutables |
| HTTP/DB smoke | FastAPI en `localhost:8000`, PostgreSQL 15 en Docker, consultas SQL y `curl.exe`/PowerShell | Contrato de rutas, conteos, categorías, forma de respuesta, atomicidad e integración API-DB |
| Demo manual | Chrome o Edge en Windows 11, DevTools y viewport desktop/mobile | Flujo completo 1v1, interacción real de ruleta, controles, turnos, ganador y regresión visual |

Los casos automatizables que enumeren elementos deben demostrar primero que encontraron elementos reales: categorías no vacías, casos de gameplay no vacíos, sectores renderizados y respuestas cargadas. Un resultado verde con cero elementos es fallo de control, no éxito.

Toda aserción negativa externa debe tener control positivo. Ejemplos: probar que el tercer comodín se rechaza después de haber consumido exactamente dos; probar que una fuente inválida falla después de demostrar que la fuente válida sí carga; probar que la corona no llama a una pseudo-categoría mientras se verifica que sí llama a una categoría real.

## 3. Entornos y provisioning

### Entorno declarado

| Componente | Versión/forma | Provisioning |
|---|---|---|
| Sistema | Windows 11 Pro, PowerShell 5.1 | Equipo local declarado por el proyecto |
| Python/API | Python 3.14.7, Poetry, FastAPI y Uvicorn declarados en `pyproject.toml` | `poetry install` desde la raíz |
| JavaScript | Node.js 24, ES2020-compatible | Instalación local ya declarada para `node --check` |
| Base de datos | PostgreSQL `postgres:15` | `docker compose up -d` desde la raíz |
| API | Uvicorn, puerto `8000` | `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Navegador | Chrome o Edge actual | Sesión local, misma máquina y misma ventana para ambos jugadores |

### Forma de credenciales

La conexión debe usar la misma forma que la aplicación y Compose, no una base con trust authentication ni una URL sin contraseña:

`postgresql+psycopg2://admin:admin123@localhost:5432/questions_db`

- Usuario: `admin`.
- Contraseña: `admin123`.
- Base: `questions_db`.
- Puerto: `5432`.
- Volumen: `postgres_data`.
- API: `http://localhost:8000`.

Son credenciales de desarrollo local únicamente. No deben copiarse a fixtures, logs, documentación de despliegue ni entornos externos.

### Precondición de datos

Antes de cualquier caso de navegador, comprobar que la API responde y que la base no está vacía. Para el estado final esperado del cambio:

```powershell
curl.exe -s http://localhost:8000/categories/stats
```

El smoke debe observar `total_questions=300`, `categorized=300`, `uncategorized=0` y seis entradas de categoría con valor `50`. Si la precondición no se cumple, el caso se marca como bloqueado; no se interpreta como fallo del flujo de juego.

## 4. Entrada y salida

### Criterios de entrada

- El cambio y sus escenarios están aprobados en Gate B.
- `poetry install` termina correctamente.
- PostgreSQL 15 está disponible en `localhost:5432` con la forma de credenciales anterior.
- FastAPI arranca en `localhost:8000`.
- Existe una fuente válida de 300 filas para los casos positivos y copias temporales controladas para los negativos.
- Los checks automatizables no reciben listas vacías ni datos silenciosamente omitidos.

### Criterios de salida

- Todos los escenarios de la sección 6 tienen resultado Pass o un fallo registrado con reproducción y severidad.
- Las invariantes de datos pasan después de una importación y después de dos importaciones idénticas.
- La fuente inválida devuelve resultado no cero y deja sin cambios los conteos previamente observados.
- Los endpoints existentes mantienen código HTTP y forma JSON esperados.
- El demo 1v1 pasa en desktop y mobile sin error de consola, bloqueo de UI ni desbordamiento visual básico.
- No quedan puntos/`WIN_POINTS` ni condición primero-a-10 en el flujo de juego.
- Todo lo no ejecutado queda explícitamente registrado como no ejecutado; no se declara cobertura porcentual.

## 5. Comandos de verificación

Comandos compatibles con `openspec/project.md`:

```powershell
poetry install
poetry run python -m compileall -q app

docker compose up -d
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

El smoke HTTP debe usar las rutas existentes, no introducir `/question/{id}`:

```powershell
curl.exe -i http://localhost:8000/
curl.exe -s http://localhost:8000/categories
curl.exe -s "http://localhost:8000/categories/stats"
curl.exe -s "http://localhost:8000/questions/category/arte?limit=50"
curl.exe -s "http://localhost:8000/questions/1"
curl.exe -i "http://localhost:8000/questions/category/no-existe?limit=50"
```

Para la sintaxis JavaScript, extraer el contenido del `<script>` inline de `frontend/index.html` a un archivo temporal y ejecutar:

```powershell
node --check .\ruta\temporal\preguntados-inline.js
```

La extracción debe fallar si no encuentra un bloque inline o si no contiene marcadores reales del juego como `categories`, `buildWheel` y `beginMatch`. Ejecutar además un control positivo deliberado: una copia temporal con un error de sintaxis debe hacer que `node --check` termine con código distinto de cero. Un archivo vacío o solo de comentarios con salida cero no constituye validación.

Las consultas SQL de los smoke checks deben comprobar `questions` y `categorizations` en la misma base `questions_db`, respetando el orden de borrado `categorizations` antes de `questions` cuando se inspeccione la sustitución transaccional.

## 6. Matriz de requisitos y escenarios

### 6.1 Dataset canónico e integridad API/DB

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| DATA-01 | Exactamente 300 preguntas | Tras una importación válida, `COUNT(*)` de `questions` debe ser `300`; repetir después de la segunda importación | DB smoke automatizable |
| DATA-02 | Exactamente 50 por `arte`, `historia`, `deportes`, `ciencia`, `geografia`, `entretenimiento` | `GROUP BY` debe devolver exactamente esas seis categorías y cada conteo debe ser `50`; el conjunto de nombres debe coincidir, sin faltantes ni extras | DB smoke automatizable |
| DATA-03 | Unicidad de pregunta normalizada | Consultar `LOWER` sobre texto recortado y normalizado Unicode según la misma regla del loader; `COUNT(*)` debe igualar `COUNT(DISTINCT normalized_question)` y ser `300` | DB/script de datos |
| DATA-04 | No hay filas completas duplicadas | Comparar la tupla normalizada de pregunta, cuatro opciones, respuesta, categoría y fuente; no debe haber grupo con `COUNT(*) > 1` | DB/script de datos |
| DATA-05 | Idempotencia | Ejecutar el loader dos veces con la misma fuente; al terminar la segunda, conservar `300`, `300` textos normalizados distintos, seis categorías y `50` por categoría, sin incremento de IDs lógicos/registros | DB smoke |
| DATA-06 | Fuente inválida rechazada atómicamente | Crear una copia temporal con pregunta normalizada repetida, fila completa repetida, categoría ausente o conteo distinto de `50`; el proceso debe terminar no cero e identificar la invariante | Automatizable/CLI |
| DATA-07 | Sin mutación tras validación fallida | Capturar conteos y hashes/identificadores de registros antes del caso DATA-06 y repetirlos después; no se elimina ni inserta ninguna `Question` o `Categorization` | DB smoke |
| DATA-08 | Integridad de respuestas | Para las 300 respuestas de `GET /questions/category/{category}`, cada objeto debe contener `id`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `answer`, `category`, `confidence_score`, `is_automatic`; `answer` debe ser exactamente una de las cuatro opciones y los cuatro textos no deben estar vacíos | HTTP/DB smoke |
| DATA-09 | APIs de categorías y estadísticas | `GET /categories` debe exponer las seis categorías; cada endpoint de categoría devuelve 50 preguntas; `/categories/stats` coincide con 300/300/0 y los seis conteos | HTTP/DB smoke |
| DATA-10 | API estable y ausencia de nuevas rutas | `GET /`, `/questions/{id}`, `/questions/category/{name}`, `/categories` y `/categories/stats` responden en sus formas actuales; la prueba no exige ni espera una ruta singular nueva; verificar que `/docs` sigue cargando | HTTP smoke |
| DATA-11 | Categoría no disponible | Solicitar una categoría inexistente y observar respuesta no exitosa o lista vacía según el comportamiento implementado, sin traceback ni caída del servidor; el frontend debe volver al flujo jugable sin crashear | HTTP + manual |

### 6.2 Estado de coronas, racha y turnos

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| GAME-01 | Estado inicial 1v1 | Iniciar con dos nombres distintos y verificar dos jugadores, `crowns` vacías, `streak=0`, categorías pendientes completas, jugador activo y comodines inicializados | DOM/manual o state check |
| GAME-02 | Tres aciertos ordinarios | Resolver tres preguntas ordinarias correctas; la racha sube hasta `3`, la UI anuncia elegibilidad y no añade ninguna corona antes del desafío | DOM-free + manual |
| GAME-03 | Desafío de corona | Con racha `3`, seleccionar una categoría pendiente; debe mostrarse exactamente una pregunta de esa categoría sin tres preguntas ordinarias previas y solo el acierto añade esa corona una vez | Manual + HTTP spy |
| GAME-04 | Fallo, timeout o segundo intento fallido | En ordinaria y desafío, provocar respuesta incorrecta, timeout y fallo final de segundo intento; la racha vuelve a `0` y el rival queda activo | State check + manual |
| GAME-05 | Conservación de coronas | Preparar un jugador con al menos una corona y fallar un desafío; la lista previa queda idéntica, no se duplica ni se borra ninguna corona, y el turno pasa | State check + manual |
| GAME-06 | Éxito de desafío | Responder correctamente al desafío; la categoría se agrega exactamente una vez, la racha vuelve a `0` y el mismo jugador continúa salvo que haya ganado | State check + manual |
| GAME-07 | Victoria inmediata con seis | Otorgar la sexta categoría distinta; aparece la pantalla de ganador sin otra pregunta, giro, punto, desempate ni pregunta final; comprobar que no se solicita otra respuesta | Browser manual + request log |
| GAME-08 | Sin puntos/primero-a-10 | Inspección automatizada del script y revisión visual no deben encontrar `WIN_POINTS`, contadores `points` ni copy de primera persona a 10 en el camino de juego; la condición de fin debe depender de seis coronas | Node/text smoke + manual |
| GAME-09 | Acierto conserva turno | Resolver una pregunta ordinaria correctamente; al regresar a la ruleta el jugador activo es el mismo | Manual |
| GAME-10 | Fallo o timeout cambia turno | Resolver incorrectamente o dejar expirar el tiempo; al regresar a la ruleta el jugador activo es el rival | Manual |
| GAME-11 | Segundo intento exitoso conserva turno | Activar `second-chance`, fallar primero y acertar después; la pregunta resuelve correcta, avanza la racha/flujo y el jugador activo no cambia | State check + manual |
| GAME-12 | Segundo intento fallido cambia turno | Activar `second-chance`, fallar ambos intentos o dejar expirar el segundo; racha `0`, respuesta fallida y rival activo | State check + manual |

### 6.3 Ruleta de siete sectores

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| WHEEL-01 | Siete sectores exactos | Con las seis categorías reales cargadas, inspeccionar el DOM: exactamente siete sectores, seis categorías y un único sector `corona`; no hay sector extra ni categoría pseudo `corona` en la API | DOM smoke + manual |
| WHEEL-02 | Geometría consistente | Verificar que gradiente, divisores, etiquetas, selección y cálculo de aterrizaje usan el mismo `sectorCount=7`; ejecutar un conjunto no vacío de índices y rotaciones | Node state check |
| WHEEL-03 | Selección por nombre | Un aterrizaje en cada sector de categoría debe pedir `/questions/category/{nombre-real}` correspondiente, independiente de la posición; validar las seis categorías | Browser request log |
| WHEEL-04 | Sector corona no es categoría | Al seleccionar corona, no debe llamarse `/questions/category/corona`; debe mostrar selección de categoría pendiente y pedir la categoría real elegida | Browser request log + manual |
| WHEEL-05 | Corona omite racha | Seleccionar corona con racha menor, igual o mayor que `3`; se presenta directamente un único desafío pendiente, sin tres preguntas ordinarias | Manual + state check |
| WHEEL-06 | Corona ilimitada | Repetir selección del sector corona varias veces en una partida; debe permanecer disponible y no tener contador/uso asociado. La prueba positiva debe demostrar al menos tres selecciones aceptadas cuando existan categorías pendientes | Manual |
| WHEEL-07 | Categoría agotada | Agotar artificialmente el pool de una categoría; una selección posterior no repite pregunta ni rompe la página, vuelve a la ruleta con feedback y pasa el turno según el diseño | State check + manual |

### 6.4 No reutilización

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| REUSE-01 | Marcar al presentar | El ID se registra antes de resolver la pregunta; un segundo intento de la misma pregunta no crea otro ID ni consume otra pregunta | State check |
| REUSE-02 | No reutilizar entre spins | Con dos selecciones de la misma categoría, el segundo ID debe ser distinto al primero; ejecutar el caso con un conjunto de preguntas no vacío | State check + manual |
| REUSE-03 | No reutilizar entre desafíos | Presentar una pregunta ordinaria y luego pedir la misma categoría como desafío; el ID del desafío debe estar fuera del conjunto usado, incluso entre jugadores | State check |
| REUSE-04 | Reinicio en partida/revancha | Comenzar nueva partida y comprobar que el conjunto de IDs usados queda vacío; la misma pregunta puede volver a elegirse solo en la nueva partida | State check + manual |
| REUSE-05 | Sin datos disponibles | Cuando no queden preguntas, verificar recuperación explícita, sin duplicado, excepción no controlada ni pantalla bloqueada | Browser manual + console |

### 6.5 Comodines compartidos

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| JOKER-01 | Inventario inicial exacto | Al iniciar partida existen exactamente `eliminate-two`, `second-chance` y `auto-correct`, disponibles, con contador compartido `0` y máximo `2` | State check + manual |
| JOKER-02 | `eliminate-two` | En una pregunta activa, exactamente dos opciones incorrectas quedan deshabilitadas; las dos restantes incluyen la correcta; no se revela el texto correcto por el comodín | State check + manual |
| JOKER-03 | `second-chance` | Tras primera selección incorrecta, la pregunta sigue activa y permite una nueva selección sin revelar la respuesta; cubrir éxito y fallo en GAME-11/12 | State check + manual |
| JOKER-04 | `auto-correct` | Selecciona/resuelve usando la respuesta almacenada, marca el resultado como correcto, revela la respuesta y conserva el turno | State check + manual |
| JOKER-05 | Límite compartido de dos | Activar dos tipos cualesquiera en cualquier orden entre los dos jugadores; `usedCount=2`, el tercer intento de cualquier tipo es rechazado y no cambia la pregunta | State check + manual negativo |
| JOKER-06 | Reinicio del límite | Tras revancha, los tres tipos vuelven a estar disponibles y `usedCount=0` | State check + manual |
| JOKER-07 | Restricciones por pregunta | Un comodín no se puede activar tras resolver ni dos veces en la misma pregunta; demostrar primero una activación válida y luego la activación inválida rechazada | State check + manual |
| JOKER-08 | Corona no consume comodines | Activar el sector corona antes/después de usos de comodín; el contador compartido permanece igual y el sector sigue disponible | Manual + state check |

### 6.6 Frontend 1v1 local y regresión visual básica

| ID | Requisito/escenario | Verificación concreta | Nivel |
|---|---|---|---|
| UI-01 | Flujo local completo | En una única pestaña, iniciar con dos nombres diferentes, alternar entre ambos jugadores, girar, responder, mostrar feedback y reiniciar; no se requiere sesión, login ni segundo dispositivo | Demo manual |
| UI-02 | Desktop | Ejecutar demo en viewport aproximado 1280x800; verificar que scoreboard, turno, rueda de siete sectores, pregunta, opciones y feedback no se superponen ni se cortan | Regresión visual manual |
| UI-03 | Mobile | Repetir en viewport aproximado 390x844; verificar que nombres, sectores/etiquetas, botones, opciones, timer y winner screen son utilizables sin overflow horizontal o texto superpuesto | Regresión visual manual |
| UI-04 | Feedback existente | Verificar feedback visible y distinguible para acierto, fallo y timeout; el timer se detiene al resolver y no dispara doble resolución | Demo manual + consola |
| UI-05 | Entrega estática | `GET /` devuelve HTML jugable y el frontend no requiere bundler, assets remotos ni API nueva; DevTools no muestra excepciones durante el camino feliz | HTTP + manual |
| UI-06 | Reintento visual y ganador | El segundo intento mantiene la pregunta visible; la sexta corona muestra winner screen sin paso intermedio; revancha vuelve al formulario y limpia el estado | Demo manual |

## 7. Ruta de demo humano end-to-end

1. Levantar PostgreSQL y FastAPI, ejecutar el pre-check de `categories/stats` y abrir `http://localhost:8000/`.
2. En desktop, introducir dos nombres distintos y comenzar; confirmar dos jugadores, seis coronas pendientes y los tres comodines compartidos.
3. Verificar la ruleta con siete sectores. Girar un sector de categoría, confirmar que se pide una categoría real y responder correctamente: el mismo jugador conserva turno.
4. Repetir hasta una racha de tres; comprobar que no hay corona automática. Elegir una categoría pendiente y acertar el desafío: aparece una corona, la racha vuelve a cero y el jugador continúa.
5. Seleccionar el sector corona sin racha y confirmar que salta directamente al desafío. Repetir el sector varias veces sin que aparezca contador ni bloqueo.
6. Usar `eliminate-two`, `second-chance` y `auto-correct` en preguntas distintas. Consumir exactamente dos usos compartidos, intentar un tercero y observar rechazo; usar corona y confirmar que el contador no cambia.
7. Forzar un fallo, un timeout y un segundo intento fallido: en cada caso la racha se reinicia y el turno pasa al rival. Completar un segundo intento correcto y confirmar que el turno se conserva.
8. Preparar seis coronas para un jugador y conceder la sexta: la pantalla de ganador aparece inmediatamente, sin nueva pregunta ni puntos.
9. Pulsar revancha: formulario inicial, IDs usados vacíos, coronas y racha reiniciadas y los tres comodines disponibles con contador cero.
10. Repetir el camino esencial en mobile y revisar consola, overflow y texto cortado. Registrar cualquier desviación como fallo de regresión visual o de comportamiento.

## 8. Riesgos, gaps y evidencia requerida

- No existe framework automatizado completo ni cobertura estable; el gap debe quedar escalado antes de release si el cambio no incorpora checks ejecutables adicionales.
- El loader actual inspeccionado en `app/load_data.py` agrega preguntas y no crea categorizaciones; DATA-05 a DATA-07 son gates de alto riesgo.
- La API inspeccionada en `app/main.py` depende de `Categorization` para el endpoint por categoría; un dataset de 300 `Question` sin 300 categorizaciones no satisface este plan.
- El frontend inspeccionado en `frontend/index.html` usa actualmente seis sectores, puntos y `WIN_POINTS=10`; WHEEL-01, GAME-08 y la regresión visual deben demostrar que no queda camino antiguo activo.
- No se prescribe una migración ni cambios en `app/`, `frontend/` o `docker-compose.yml` desde QA. Este artefacto es el único archivo creado por este trabajo.
- Los controles de mutación del plan son hipótesis hasta que el implementador los ejecute: una copia con error sintáctico debe producir rojo en `node --check`; una fuente inválida debe producir salida no cero; un intento de tercer comodín debe ser rechazado después de probar dos activaciones válidas. La PR de implementación debe conservar esa evidencia.

## 9. Registro de resultados

La ejecución posterior debe completar para cada ID: fecha, entorno, versión/commit, resultado `Pass`/`Fail`/`Blocked`, evidencia (salida de comando, respuesta HTTP, consulta, captura o vídeo breve), y defecto asociado cuando corresponda. Este plan no afirma que los casos hayan sido ejecutados.

## QA manager addendum (Gate B / Track 2)

### Criterio de decisión y bloqueo

Un caso es **Pass** solo con evidencia reproducible (salida de comando, log HTTP/DOM o captura manual) y con un conjunto de datos no vacío. Un caso con aserción incumplida es **Fail**; una dependencia ausente es **BLOCKED**, nunca Pass. Registrar ID, commit/branch, fecha, comando, código de salida, esperado, actual y severidad para cada Fail.

El ambiente declarado es Windows 11 Pro/PowerShell 5.1, Python 3.14.7 + Poetry, Node 24, PostgreSQL `postgres:15` en Docker Compose, FastAPI/Uvicorn en `0.0.0.0:8000`, y Chrome/Edge con viewports `1280x800` y `390x844`. La precondición UI es `/categories/stats` con `300/300/0` y seis categorías de 50. Sin Docker quedan bloqueados DATA-01..07, DATA-09..11, el smoke HTTP dependiente de datos y la demo integrada; sí pueden ejecutarse compileall, sintaxis Node, checks DOM-free y revisión estática. Sin navegador quedan bloqueados los casos manuales UI/WHEEL/JOKER.

### Comandos y controles

Desde la raíz, sin escribir en `/tmp` (usar `.qa-work\` dentro del proyecto para copias controladas y limpiarlo al terminar):

```powershell
poetry install
poetry run python -m compileall -q app
docker compose up -d
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
poetry run python openspec/changes/add-crowns-jokers-gameplay/checks/check_data.py
poetry run python openspec/changes/add-crowns-jokers-gameplay/checks/check_api.py
node openspec/changes/add-crowns-jokers-gameplay/checks/check_frontend.mjs
node openspec/changes/add-crowns-jokers-gameplay/checks/check_gameplay.mjs
```

El control de JS debe extraer el `<script>` inline no vacío de `frontend/index.html`: `node --check` pasa con la fuente válida y falla con una copia deliberadamente inválida; un archivo vacío no cuenta. Smoke mínimo: `curl.exe -i http://localhost:8000/`, `/categories`, `/categories/stats`, cada `/questions/category/{name}?limit=50`, `/questions/1`, `/questions/category/no-existe?limit=50` y `/docs`. No se prueba ni se agrega `/question/{id}`.

### Trazabilidad completa de criterios

| ID | Criterio y observación requerida | Nivel / salida |
|---|---|---|
| DATA-01..04 | 300 preguntas; exactamente seis categorías (arte, historia, deportes, ciencia, geografia, entretenimiento), 50 cada una; 300 preguntas normalizadas distintas; ninguna fila completa duplicada. | `check_data.py` + SQL; Pass si todos los conteos/grupos son exactos. |
| DATA-05..07 | Ejecutar loader dos veces y comparar filas/conteos; fuente con pregunta/fila repetida, categoría ausente y conteo distinto de 50 debe terminar no cero y no cambiar `questions` ni `categorizations`. | DB/CLI; Pass si idempotencia y atomicidad quedan demostradas. |
| DATA-08..11 | En las 300 respuestas: cuatro opciones no vacías/distintas, `answer` pertenece a ellas y forma JSON exacta; seis endpoints, stats, `/`, `/questions/{id}`, `/docs` estables; categoría inexistente no tumba API/UI. | `check_api.py` + HTTP/manual. |
| GAME-01..03 | Inicio con dos jugadores, `crowns=[]`, `streak=0`, seis pendientes y comodines; tres aciertos llevan racha a 3 sin corona; la coronación exige elegir pendiente y acertar una única pregunta. | State check + demo; Pass si no hay corona prematura. |
| GAME-04..06 | Fallo, timeout y desafío fallido (incluido segundo intento fallido) ponen racha en 0 y pasan turno; coronas previas se conservan; desafío correcto agrega categoría una vez, resetea racha y mantiene turno. | State check + demo. |
| GAME-07..10 | Sexta corona muestra ganador inmediatamente, sin pregunta/request/spin final ni puntos; acierto conserva turno y fallo/timeout lo cambia; no existe `WIN_POINTS`, `points` ni primero-a-10. | Request log + `check_gameplay.mjs` + demo. |
| WHEEL-01..05 | DOM tiene seis sectores de API + exactamente un sector corona; geometría/landing usan el mismo `n=7`; cada sector pide por nombre; corona nunca pide `/questions/category/corona`, elige pendiente y salta la racha. | DOM/state + request log. |
| WHEEL-06..07 | Sector corona se acepta al menos tres veces sin contador/límite; pool agotado no repite, no crashea y vuelve a rueda con feedback. | Manual + state check. |
| REUSE-01..05 | ID se marca al presentar; no se repite entre spins, jugadores ni ordinaria/desafío; retry no crea ID; revancha limpia IDs/coronas/rachas; categoría agotada se recupera. | State check + demo. |
| JOKER-01..03 | Inventario único con exactamente `eliminate-two`, `second-chance`, `auto-correct`, flags disponibles, `usedCount=0`, `maxUses=2`; `eliminate-two` deshabilita exactamente dos incorrectas sin revelar; primer fallo de `second-chance` mantiene pregunta. | DOM/state + demo. |
| JOKER-04..06 | Segundo acierto conserva turno y avanza flujo; segundo fallo/timeout resuelve fallo, racha 0 y pasa turno; `auto-correct` selecciona la opción de `answer`, resuelve correcto y conserva turno. | State check + demo. |
| JOKER-07..10 | Dos usos en cualquier orden/entre jugadores fijan `usedCount=2`; tercero y activación tras resolver/doble uso por pregunta se rechazan; revancha restaura tres flags y 0; corona no consume presupuesto. | Negative controls + demo. |
| E2E-01..06 | Una pestaña: start, acierto, fallo, timeout, tres aciertos, desafío, corona, los tres comodines, tercer rechazo, sexta corona, rematch; repetir desktop/mobile sin errores de consola, solape u overflow. | Demo end-to-end + capturas/logs. |

### Guion de demo y salida

1. Levantar Compose/API, ejecutar DATA-09 y abrir `http://localhost:8000/`.
2. Ingresar dos nombres, verificar seis pendientes, coronas en cero y tres comodines.
3. Confirmar continuidad con acierto, cambio de turno con fallo/timeout, racha de tres y desafío correcto.
4. Repetir corona sin racha, comprobar tres selecciones y request únicamente a categoría real.
5. Ejecutar los tres comodines según JOKER-02..06, consumir dos, rechazar tercero y comprobar presupuesto neutral de corona.
6. Conceder sexta corona, comprobar winner sin request posterior y pulsar revancha para validar reinicio.
7. Repetir en `390x844`; adjuntar capturas, consola y request log.

La salida QA requiere Pass de DATA-01..11, GAME-01..10, WHEEL-01..07, REUSE-01..05, JOKER-01..10 y E2E-01..06, o excepciones aceptadas con riesgo explícito. Finalizar con:

```powershell
openspec validate add-crowns-jokers-gameplay
```
