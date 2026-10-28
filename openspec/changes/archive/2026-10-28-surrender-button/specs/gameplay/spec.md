# Spec Delta

## ADDED Requirements

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
