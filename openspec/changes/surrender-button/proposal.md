# Proposal

- **Change**: `surrender-button`
- **Branch when authorized**: `feature/surrender-button`
- **Owner role**: `dev`
- **Track**: 1 (Light) — frontend-only, one file (`frontend/index.html`) plus a verification script
  under the change's `checks/` folder
- **Capability**: `gameplay` (the rule) and `game-presentation` (the control and its confirmation)
- **Depends on**: `add-victory-animation-case` must be **archived** first (see "Sequencing" below);
  no functional dependency on the other three changes of this cycle.

## Why

A 1v1 match on one shared device has no exit. If a player wants out, the only ways out are to reload
the page and lose the scoreboard silently, or to keep playing a match they have abandoned. The human
asked for a "Me rindo" control with a double confirmation: one tap to open, one deliberate tap to
confirm.

The double confirmation is the whole feature. A single-tap surrender is a foot-gun in a game where
the same button area carries the spin control and the answer options.

## What Changes

- Add a **surrender control** that ends the match in the rival's favour. It appears on the wheel
  screen and on the question screen.
- Add a **confirmation dialog** with two controls — confirm and cancel. Confirming ends the match
  immediately; cancelling leaves the match exactly as it was.
- Make the winner screen **distinguish a surrender** from a six-crown win, and name the player who
  surrendered.
- Keep the crowns each player already earned. A surrender awards no crown and moves none.

## The rule that had to be settled before writing anything

Two people share one device, so "the player who surrenders" is not a given. A single control that
always surrendered **the active player** would let the player who is *waiting* end their rival's
game by tapping it — handing themselves the win by accident. That is not a corner case; it is the
normal state of the wheel screen.

**Decision: every surrender control is bound to one named player, and it always surrenders that
player.** On the wheel screen each player has their own control; on the question screen the control
belongs to the active player, who is the one on the clock. The confirmation names the player it is
about to surrender, so the tap is never ambiguous.

## Out of scope

A surrender by the **waiting** player during the other player's question (the wheel screen offers it
to both, the question screen offers it to the active player only); any timer, score, crown or joker
rule other than "the match ends"; any audio for the surrender; any change to the API, the schema, or
the dependency set; any change to the four panel ids; a match-history or persistence feature.

## Conflicts found in the living specs, surfaced rather than silently resolved

1. **`game-presentation` → "Declared gameplay rules are unchanged" enumerates "the first player to
   `10` points winning".** That clause is **stale**: the `gameplay` capability replaced points with
   crowns and its win condition is the sixth crown. The two living specs already disagree with each
   other, and this change is not the one that caused it. It is **not repaired here** — a stale clause
   is corrected by a change of its own, not as a side effect of a surrender feature. **Recommended
   follow-up: a `fix/stale-rules-clause` change that corrects that enumeration.**
2. **`game-presentation` → "Fixed single-screen shell" fixes exactly four panels.** The confirmation
   dialog is therefore **an overlay, not a fifth panel**, reusing the existing `.crown-overlay` /
   `.crown-modal` pattern that `#crown-picker` and `#case-overlay` already use.
3. **`game-presentation` → "Neon category palette" and "Obsidian canvas and glass surface tokens".**
   The surrender control and the confirm button use the palette's existing failure accent
   `#FF2A6D` and the existing glass tokens, so no new colour, radius, or shadow is introduced.

## Sequencing

`add-victory-animation-case` is implemented and merged but **not archived**, and it modifies
`finishMatch()` — the same function this change modifies. Two open deltas against the same
capability collide at archive time. **The victory-animation change must be closed and archived before
this change lands.** Its only open task is a human browser pass, which is a Gate C item.

## Alternatives considered

- **A single control that surrenders whoever is active.** Rejected: in a shared-device 1v1 it lets
  the waiting player tap their way into the win.
- **A control per player on the question screen too.** Rejected for this track: the question screen
  shows one turn at a time, and adding the waiting player's control to it adds a second destructive
  button to a screen whose other controls are the four answer options.
- **No confirmation.** Rejected by the human, and rightly: the control sits next to other buttons.
- **Surrendering as a *crown* rule** — for example, the winner gains the loser's crowns. Rejected:
  it changes the crown rules, which the `gameplay` capability owns, and it rewards the loser of the
  match.
