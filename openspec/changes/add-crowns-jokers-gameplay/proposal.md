# Proposal

- **Change**: `add-crowns-jokers-gameplay`
- **Branch when authorized**: `feature/add-crowns-jokers-gameplay`
- **Owner role**: `dev`
- **Track**: 2 (Full) — cambia reglas de juego, estado de partida, interacción de ruleta y el dataset canónico.
- **Capability**: `gameplay`
- **Depends on**: None
- **Decision reference**: `docs/adr/ADR-001-neon-category-palette.md`

## Goal

Entregar el modo local 1v1 de Preguntados con seis coronas, una por cada categoría (`historia`, `geografia`, `arte`, `ciencia`, `deportes`, `entretenimiento`), y tres comodines por jugador. La partida termina cuando un jugador reúne las seis coronas.

## What changes

- Reemplazar puntos y la condición primero-a-10 por seis coronas por jugador.
- Requerir tres aciertos ordinarios consecutivos para habilitar una categoría pendiente y luego formular siempre una pregunta obligatoria de coronación.
- Mantener el sector corona como atajo a la pregunta de coronación: salta los tres aciertos, pero nunca salta la pregunta ni permite ganar una corona sin responderla correctamente.
- Mantener el turno después de cualquier acierto resuelto; un fallo o timeout cambia de jugador y reinicia la racha ordinaria a cero sin quitar coronas.
- Dar a cada jugador dos usos de cada uno de estos tres comodines: `eliminar-dos`, `segundo-intento` y `seleccionar-correcta`. Se permite como máximo un comodín por pregunta y los usos son independientes por jugador y por tipo.
- Mantener las rutas y el schema actuales; no añadir autenticación, persistencia de partida ni rutas nuevas.
- Conservar dentro de este cambio el dataset canónico de exactamente 300 preguntas, 50 por categoría, con importación validada e idempotente.
- Resolver el solapamiento visual de los siete sectores sin cambiar la paleta ni la identidad definida por `ADR-001`.

## Turn and crown rules

Una respuesta correcta, ordinaria o de coronación, deja activo al mismo jugador. Un fallo, timeout o segundo intento fallido reinicia únicamente la racha ordinaria y pasa el turno al rival. Las coronas ya ganadas son permanentes durante la partida. Tres aciertos ordinarios consecutivos habilitan la elección de una categoría pendiente; el desafío siempre presenta una pregunta y solo una respuesta correcta añade esa corona. El sector corona habilita directamente esa elección, independientemente de la racha. Al añadir la sexta corona se muestra inmediatamente la victoria.

## Out of scope

Autenticación, cuentas, multiplayer remoto, persistencia de partidas o resultados, cambios de schema/migraciones, nuevas rutas API, nuevos modos, ronda final o desempate, puntos/primero-a-10, comodines adicionales, un presupuesto global compartido de comodines y cambios visuales ajenos al solapamiento de los siete sectores quedan fuera de alcance.

