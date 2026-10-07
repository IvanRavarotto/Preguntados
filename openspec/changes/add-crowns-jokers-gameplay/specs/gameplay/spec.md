# Spec Delta

## ADDED Requirements

### Requirement: Six-crown 1v1 match

The browser SHALL run a match for exactly two players. Each player SHALL have at most one crown for each of `historia`, `geografia`, `arte`, `ciencia`, `deportes`, and `entretenimiento`; a crown SHALL remain earned for the rest of the match. The match SHALL end immediately when one player owns all six crowns, without a final question, tie-breaker, point tally, or first-to-10 condition.

#### Scenario: Sixth crown ends the match

- **GIVEN** a player owns five distinct crowns
- **WHEN** that player answers the pending category's mandatory crowning question correctly
- **THEN** the sixth crown is added exactly once
- **AND** the winner screen is shown without another question or spin

*Provenance: [AUTHORED] from the approved six-crown rule.*

### Requirement: Ordinary streak and mandatory crowning question

Three consecutive ordinary correct answers SHALL enable the active player to choose one pending category. The selected category SHALL then require exactly one crowning question; no crown SHALL be awarded before that question is answered correctly. A correct answer SHALL keep the turn. A wrong answer or timeout SHALL reset ordinary progress to zero, pass the turn, and preserve all existing crowns.

#### Scenario: Three ordinary answers enable a crown

- **GIVEN** the active player has fewer than three consecutive ordinary correct answers
- **WHEN** the player answers ordinary questions correctly until the count reaches three
- **THEN** the UI enables selection of a pending category
- **AND** no crown is awarded until the mandatory crowning question is answered correctly

*Provenance: [AUTHORED] from the approved ordinary-progress rule.*

#### Scenario: Failed question changes turn without removing crowns

- **GIVEN** the active player has existing crowns and any ordinary progress
- **WHEN** an ordinary or crowning question is answered incorrectly or times out
- **THEN** ordinary progress becomes zero
- **AND** existing crowns remain unchanged
- **AND** the other player becomes active

*Provenance: [AUTHORED] from the approved turn and reset rule.*

### Requirement: Crown sector bypasses progress but not the question

The wheel SHALL render six API-derived category sectors plus exactly one visually distinct `corona` sector. Selecting `corona` SHALL bypass the three-ordinary-correct requirement, allow the active player to choose a pending category, and present the mandatory crowning question for that category. It SHALL never award a crown without that question and SHALL never call the category endpoint with `corona` as a category name. The sector SHALL have no usage limit or crown counter.

#### Scenario: Crown sector starts a mandatory challenge

- **GIVEN** the active player has at least one pending category and fewer than three ordinary consecutive correct answers
- **WHEN** the player selects the `corona` sector and chooses a pending category
- **THEN** one crowning question from that category is presented
- **AND** a correct answer awards the category while a failure resets progress and changes turn

*Provenance: [AUTHORED] from the approved crown-sector rule.*

#### Scenario: Seven sectors do not overlap

- **GIVEN** the six required categories are returned by `GET /categories`
- **WHEN** the wheel is rendered at desktop and mobile sizes
- **THEN** exactly seven sectors are visible
- **AND** each label and icon remains inside its sector without overlapping a neighbor, divider, or pin
- **AND** selection remains bound to the returned category name

*Provenance: [AUTHORED] from the approved visual-overlap resolution and [PRESERVE] from ADR-001.*

### Requirement: Question non-reuse

A question SHALL be marked used when presented and SHALL not be selected again in the same match for either player, including ordinary questions, crowning questions, and second attempts. A new match or rematch SHALL clear used-question state. If a category has no unused question, the UI SHALL return to the wheel with an explicit message and no duplicate selection or crash.

#### Scenario: Retry does not consume another question

- **GIVEN** a question is currently displayed and a second attempt is active
- **WHEN** the player selects the second answer
- **THEN** the same question is resolved
- **AND** no new question identifier is selected or marked used

*Provenance: [PRESERVE] existing no-reuse behavior, extended to crowning questions.*

### Requirement: Per-player joker inventory

Each player SHALL start with two uses of each of exactly three joker types: `eliminar-dos`, `segundo-intento`, and `seleccionar-correcta`. A player SHALL be able to activate at most one joker for a question, and a used joker type SHALL decrement only that player's counter. Counters SHALL reset for both players on rematch. The crown sector SHALL not affect joker counters.

`eliminar-dos` SHALL disable exactly two incorrect options. `segundo-intento` SHALL allow exactly one additional answer after the first incorrect answer without revealing the answer. On a final correct answer the turn SHALL remain; on a final incorrect answer or timeout the turn SHALL change. `seleccionar-correcta` SHALL select the stored correct option and resolve as a correct answer.

#### Scenario: Two uses per player and one joker per question

- **GIVEN** both players start a new match
- **WHEN** either player activates a joker
- **THEN** only that player's selected joker counter increases toward two
- **AND** a second joker activation for the same question is rejected
- **AND** each player may independently use that joker type twice before a third use is rejected

*Provenance: [AUTHORED] from the approved per-player joker rule.*

#### Scenario: Second attempt resolves the turn

- **GIVEN** the active player has activated `segundo-intento` and selected a wrong option
- **WHEN** the next selection is correct
- **THEN** the question resolves as correct and the same player remains active
- **WHEN** the next selection is wrong or time expires
- **THEN** the question resolves as failed, ordinary progress resets, and the other player becomes active

*Provenance: [AUTHORED].*

### Requirement: Canonical 300-question dataset

The importer SHALL accept exactly 300 valid questions, with exactly 50 in each of the six canonical categories, four distinct non-empty options per row, and an answer belonging to those options. Normalized question text and complete duplicate rows SHALL be rejected before database mutation. Valid imports SHALL replace the local question and categorization rows transactionally and be idempotent; invalid imports SHALL leave existing counts unchanged. The SQLAlchemy schema and API routes SHALL remain unchanged.

#### Scenario: Repeated valid import is stable

- **GIVEN** the canonical source contains 300 valid unique rows
- **WHEN** the importer runs twice with that source
- **THEN** the database contains 300 questions and 300 categorizations
- **AND** each category contains 50 questions
- **AND** the second run does not append a duplicate copy

*Provenance: [AUTHORED] from Gate A's approved dataset scope.*

#### Scenario: Invalid source is atomic

- **GIVEN** a source has a duplicate, invalid answer, missing category, or non-50 category count
- **WHEN** validation runs
- **THEN** the importer exits non-zero before destructive mutation
- **AND** existing question and categorization counts remain unchanged

*Provenance: [AUTHORED].*

## OUT OF SCOPE

Authentication, accounts, remote multiplayer, persisted matches or results, new API routes, database schema changes or migrations, points, first-to-10 scoring, final questions, tie-breakers, additional joker types, a shared/global joker budget, and visual changes unrelated to seven-sector overlap are excluded from this delta.
