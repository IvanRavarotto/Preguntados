# Proposal: true-false-jokers

## Why

The project dataset now includes true/false questions with only two options. On those
questions, removing two wrong options or buying a second attempt distorts the question:
`eliminar-dos` would leave only the answer visible, and `segundo-intento` changes the
single-decision shape of a true/false question. Only `seleccionar-correcta` still fits.

## What Changes

- On a two-option question, `eliminar-dos` and `segundo-intento` are disabled.
- `seleccionar-correcta` stays available while the active player has uses left.
- The rule lives in `jokerFitsQuestion` and is pinned by a permanent check that reads the
  shipped `frontend/index.html`.

## Impact

- `frontend/index.html`
- `openspec/specs/gameplay/spec.md` (rule folded into the living spec)
- `openspec/changes/true-false-jokers/checks/check_true_false_jokers.mjs`

## Out of Scope

Changing the joker inventory, the two uses per type, or the per-player counters.
