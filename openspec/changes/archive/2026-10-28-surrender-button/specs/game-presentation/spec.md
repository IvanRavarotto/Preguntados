# Spec Delta

## ADDED Requirements

### Requirement: The surrender control and its confirmation

The presentation SHALL offer a **surrender control** on the wheel screen and on the question
screen, and every surrender control SHALL be bound to **one named player** and SHALL always
surrender that player.

On the wheel screen, where both players are listed, each player SHALL have their own surrender
control. On the question screen, where one turn is presented at a time, the control SHALL belong to
the **active** player. Each control's accessible name SHALL identify the player it surrenders.

The surrender control is a **destructive** action and SHALL read as one: it SHALL use the palette's
existing failure accent `#FF2A6D` and SHALL NOT compete with the screen's primary control — the
wheel screen's spin button and the question screen's answer options. It SHALL introduce no new
colour, no new radius outside the `0.25rem`–`0.5rem` band, no drop shadow, and no external
resource.

The confirmation SHALL be a **dialog overlay**, not a fifth panel: the four panel ids
`screen-start`, `screen-wheel`, `screen-question` and `screen-winner` SHALL remain exactly those, and
the overlay SHALL reuse the existing `.crown-overlay` / `.crown-modal` pattern. The dialog SHALL have
`role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` pointing at a title that **names the
player being surrendered**. It SHALL contain exactly two controls: a confirm control and a cancel
control.

Opening the dialog SHALL move focus into it; the **confirm control SHALL NOT** be the element that
receives focus when the dialog opens. Escape and the cancel control SHALL dismiss it, and dismissal
SHALL restore focus to the control that opened it. A dismissed dialog SHALL leave the match
untouched.

> `[AUTHORED]` Two decisions are recorded here rather than left to the implementation. (1) **The
> dialog is an overlay, not a panel.** The living "Fixed single-screen shell" requirement fixes
> exactly four panels, and `#crown-picker` and `#case-overlay` already establish the overlay pattern
> — so the surrender dialog follows the house pattern rather than inventing a fifth container.
> (2) **The confirm control is not focused on open.** A destructive action that grabs the keyboard
> focus is one keystroke away from firing; the cancel control receives the focus instead, so the
> shortest path out of the dialog is the safe one.

#### Scenario: Both screens offer a surrender control bound to a named player

- **GIVEN** a match in progress
- **WHEN** the wheel screen and the question screen are inspected
- **THEN** each carries at least one surrender control
- **AND** every surrender control's accessible name names the player it surrenders
- **AND** on the wheel screen there is one surrender control per player
- **AND** on the question screen the surrender control names the active player

*Provenance: `[AUTHORED]` — the shared-device decision in `proposal.md`. Measurable: the control's
count per screen and the player named in each control's accessible name, read against the active
player on the question screen.*

#### Scenario: The confirmation is a dialog, and the shell still has four panels

- **GIVEN** the surrender control pressed
- **THEN** an element with `role="dialog"` and `aria-modal="true"` is shown
- **AND** that element's `aria-labelledby` points at a title element that names the player
- **AND** it contains exactly two controls: the confirm control and the cancel control
- **AND** the document still has exactly four elements with class `panel`, with the four ids
  `screen-start`, `screen-wheel`, `screen-question` and `screen-winner`
- **AND** the dialog element does **not** carry the class `panel`

*Provenance: `[PRESERVE]` — the living "Fixed single-screen shell" requirement fixes the four panel
ids. `[AUTHORED]` — the dialog's attributes and its two controls. Measurable: the `role`, the
`aria-modal`, the resolved `aria-labelledby` target's text, the control count, and the panel count.*

#### Scenario: The dialog can be dismissed without changing the match

- **GIVEN** the confirmation dialog open
- **WHEN** it is dismissed with Escape, and again in a second match with the cancel control
- **THEN** the dialog is hidden both times
- **AND** focus returns to the surrender control that opened it
- **AND** the match is unchanged both times: the same turn, the same crowns, the same pending
  question

*Provenance: `[AUTHORED]` — the double confirmation. Measurable: the dialog's hidden state, the
focused element, and the match state before and after each dismissal.*

#### Scenario: The confirm control does not take the focus

- **GIVEN** the confirmation dialog opened from the surrender control
- **WHEN** the focused element is read
- **THEN** it is inside the dialog
- **AND** it is **not** the confirm control

*Provenance: `[AUTHORED]` — a destructive action must not be the keyboard's first stop. Measurable:
the focused element's identity.*

#### Scenario: The surrender control introduces no new visual token

- **GIVEN** the surrender control and the dialog's confirm control
- **WHEN** their computed colours, border radii and shadows are read
- **THEN** the failure accent used is `#FF2A6D`, from the existing palette
- **AND** every radius is within the `0.25rem`–`0.5rem` band
- **AND** no drop shadow with a non-zero offset is introduced
- **AND** no new external reference of any kind appears in the document

*Provenance: `[PRESERVE]` — the living "Obsidian canvas and glass surface tokens",
"Neon category palette" and "No external requests" requirements. Measurable: the computed values
and the document's reference set.*
