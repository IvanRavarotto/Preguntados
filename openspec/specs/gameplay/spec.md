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

### Requirement: A surrender ends the match in the rival's favour

A player SHALL be able to surrender **their own** game. Confirming a surrender SHALL end the match
immediately, SHALL award **no** crown, SHALL transfer **no** crown, and SHALL leave the rival as the
winner. Every crown each player had already earned SHALL be preserved and SHALL be shown on the
winner screen.

The match SHALL end by surrendering as well as by the sixth crown, and the winner screen SHALL
**distinguish** the two: it SHALL state that the match ended by surrender and SHALL name the player
who surrendered.

A surrendered match SHALL be rematchable exactly like any other finished match: rematch returns to
the player-name screen and clears the current game state.

> `[AUTHORED]` **Which player surrenders is settled here, because two people share one device.**
> A control that always surrendered "the active player" would let the player who is *waiting* end
> their rival's game by tapping it — an accident that hands the tappers the win. The rule is
> therefore: **a surrender control is bound to one named player and always surrenders that player**,
> and the confirmation names that player. This is a gameplay rule because it decides *who* loses, not
> only how the control looks.

#### Scenario: Confirming a surrender ends the match in the rival's favour

- **GIVEN** a match in progress, with player A having earned two crowns and player B none
- **WHEN** player A confirms a surrender
- **THEN** the match ends immediately, with no further question and no further spin
- **AND** player B is the winner
- **AND** player A still holds exactly two crowns and player B none
- **AND** no crown was awarded for the surrender and no crown changed owner

*Provenance: `[AUTHORED]` — the rule the human asked for. Measurable: the winner's identity, both
crown counts before and after, and the absence of a crown award.*

#### Scenario: The winner screen tells the two kinds of ending apart

- **GIVEN** a match ended by a surrender
- **WHEN** the winner screen is shown
- **THEN** it states that the match ended by surrender and names the player who surrendered
- **AND** it differs from the six-crown ending, which states that the winner completed the six
  crowns

*Provenance: `[AUTHORED]` — a match that ends by surrender and a match that ends with six crowns
are different events and must not read identically. Measurable: the winner screen's text.*

#### Scenario: Cancelling a surrender leaves the match untouched

- **GIVEN** a match in progress
- **WHEN** the surrender control is pressed and then the confirmation is cancelled
- **THEN** the match continues: the same turn, the same crowns, the same pending question and the
  same remaining time
- **AND** no surrender is recorded

*Provenance: `[AUTHORED]` — the double confirmation the human asked for. Measurable: the turn, the
crowns, the pending question and the clock all unchanged after a cancel.*

#### Scenario: A surrender stops the clock and the pending question

- **GIVEN** a question on screen with time remaining
- **WHEN** the surrender is confirmed
- **THEN** the countdown stops
- **AND** the question cannot be answered afterwards, and answering it awards nothing

*Provenance: `[PRESERVE]` — a timeout awards zero points, and a surrendered match is over; the
outcome of a question after the match ended would be a point in a match that no longer exists.
Measurable: the clock's state and the outcome of a post-surrender answer.*

#### Scenario: A rematch after a surrender starts a clean match

- **GIVEN** a match ended by a surrender
- **WHEN** rematch is chosen
- **THEN** the player-name screen is shown
- **AND** the game state is cleared, including both players' crowns

*Provenance: `[PRESERVE]` — `openspec/project.md`: "a rematch returns to the player-name screen and
clears the current game state". Measurable: the visible screen and the cleared state.*
