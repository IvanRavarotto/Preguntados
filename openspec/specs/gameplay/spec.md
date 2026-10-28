# gameplay Specification

## Purpose
Defines the rules of a Preguntados 1v1 match played by two people in one browser: how crowns are
earned per category, how the crowning question and the seven-sector wheel drive turn flow, and how
each player's jokers are spent and reset. It fixes the win condition (all six crowns) and the
no-reuse and rematch behavior a match must honor.

## Requirements

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

`eliminar-dos` SHALL disable exactly two incorrect options. `segundo-intento` SHALL allow exactly one additional answer after the first incorrect answer without revealing the answer. On a final correct answer the turn SHALL remain; on a final incorrect answer or timeout the turn SHALL change. `seleccionar-correcta` SHALL select the stored correct option and resolve as a correct answer. On a true/false question with only two options, `eliminar-dos` and `segundo-intento` SHALL be unavailable; only `seleccionar-correcta` SHALL remain available.

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

#### Scenario: True/false questions keep only the correct-option joker

- **GIVEN** a true/false question is active with two options
- **WHEN** the joker controls are shown
- **THEN** `eliminar-dos` and `segundo-intento` are disabled
- **AND** `seleccionar-correcta` remains available while the active player has uses left

*Provenance: [AUTHORED] from the two-option questions in the 5000-row dataset.*

### Requirement: Rematch keeps the players

The winner screen SHALL offer a rematch that keeps both player names and starts a fresh match with empty crowns, zeroed streaks and counters, restored jokers, and cleared used-question state, landing on the wheel screen. The separate new-game control SHALL discard the players and return to the name screen.

#### Scenario: Rematch starts from zero with the same names

- **GIVEN** a finished match between two named players
- **WHEN** a player chooses rematch
- **THEN** both names are preserved and the wheel is shown
- **AND** both players have no crowns, zero streaks and counters, and full joker uses
- **AND** choosing new game instead returns to the name screen with no players

*Provenance: [AUTHORED] from the 2026-10-28 rematch feedback.*

### Requirement: Project dataset import

The importer SHALL load `app/trivia_latam_argentina.csv` (5000 rows) transactionally. Each row SHALL have two or four distinct non-empty options and an answer among them; invalid rows SHALL be rejected before any database mutation, leaving the existing questions and categorizations unchanged. A valid import SHALL replace the local question and categorization rows, store each question's dataset category, and store the neural network's predicted category and confidence as its automatic categorization. Re-running the import SHALL be idempotent.

#### Scenario: Valid import replaces the dataset

- **GIVEN** the canonical source has 5000 valid rows
- **WHEN** the importer runs
- **THEN** the database contains 5000 questions and 5000 automatic categorizations
- **AND** true/false rows store `null` in `option_c` and `option_d`
- **AND** each question exposes the network's category to the game

#### Scenario: Invalid source is atomic

- **GIVEN** a source row has an invalid option count, duplicate option, or an answer outside the options
- **WHEN** the importer runs
- **THEN** it exits non-zero before mutating the database
- **AND** existing question and categorization counts remain unchanged

*Provenance: [AUTHORED] from the 2026-10-22 neural-classifier change and the 2026-10-28 integration review.*
