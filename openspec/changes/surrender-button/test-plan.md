# Test plan — `surrender-button`

## Scope

Two capabilities (`gameplay` for the rule, `game-presentation` for the control), one file under test
(`frontend/index.html`). No API, schema, or dependency change.

## Environments

| | |
|---|---|
| Browser | Chromium via headless DevTools Protocol (Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, honouring `CHROME_PATH`). |
| API | `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`, PostgreSQL 15 up (`docker compose up -d`). |
| Runner | `openspec/changes/surrender-button/checks/check_surrender.mjs` (Node 24). No frontend test runner is added; it is not in `openspec/project.md`. |

## Criteria → checks

| Criterion (from the deltas) | Check | Pass bar |
|---|---|---|
| Each screen carries at least one surrender control | DOM query on the wheel and the question screens | **>= 1** each |
| Every control's accessible name names the player it surrenders | the control's accessible name read against the player's name | the name is present in the control's accessible name |
| One control per player on the wheel screen | the wheel screen's controls counted and mapped to players | **2**, one per player |
| The question screen's control names the active player | the control's accessible name against the active player | match |
| The dialog has `role="dialog"` and `aria-modal="true"` | attribute read | both present |
| `aria-labelledby` resolves to a title naming the player | the referenced element's text | contains the player's name |
| The dialog holds exactly two controls | the dialog's focusable controls counted | **2** |
| Exactly four panels, with the four ids | DOM query | **4**, ids `screen-start`, `screen-wheel`, `screen-question`, `screen-winner` |
| The dialog is not a panel | the dialog's class list | does not contain `panel` |
| Focus moves into the dialog and is not on the confirm control | `document.activeElement` read on open | inside the dialog, **not** the confirm control |
| Escape dismisses and restores focus | `activeElement` and the dialog's `hidden` after `Escape` | dialog hidden; focus back on the opener |
| Cancel dismisses and restores focus | the same, after clicking cancel | dialog hidden; focus back on the opener |
| A dismissal leaves the match untouched | the active player, both crown counts, the pending question and the clock read before and after | all four equal |
| Confirming ends the match with the rival as the winner | the winner screen's winner name | the rival's name |
| Both crown counts are unchanged by the surrender | the crown counts read before and after | equal |
| The countdown stopped | the clock's state read after the surrender | stopped |
| A post-surrender answer awards nothing | the crown counts and the score after clicking an option | unchanged |
| The winner screen tells the two endings apart | the winner screen's text | names the resigned player and states the surrender |
| A six-crown win is unchanged by the refactor | the winner screen on a six-crown win: winner name, crown glyph, podium | identical to the pre-change behaviour |
| Rematch after a surrender clears the state | the visible screen and both crown sets | the name screen; both crown sets empty |
| No new visual token | the controls' computed colours and radii, and the stylesheet's shadow declarations | accent `rgb(255, 42, 109)`; radii in the band; no non-zero-offset drop shadow |
| No uncaught exception | `Runtime.exceptionThrown` across the whole run | **0** |

## Negative controls (required)

| Mutated copy | Must fail |
|---|---|
| the confirm control takes the focus when the dialog opens | the focus check |
| the surrender awards a crown | the crown-count check |
| the cancel control removed | the control-count check |
| the countdown left running after a surrender | the clock check |

## Demo path (human integration test)

1. Start a match with two names.
2. On the wheel screen, find each player's surrender control and confirm that each names its own
   player.
3. Press one, read the dialog, and cancel: the match must be untouched.
4. Press it again and confirm: the match must end, the rival must win, and the winner screen must
   say that the match ended by surrender.
5. Repeat from the question screen, mid-question, with the clock running.
6. Choose rematch and confirm that the name screen comes back with both crown sets cleared.

## Not tested, and why

- **No assertion on the dialog's wording in Spanish.** The wording is the human's call at Gate C;
  the machine checks that the title *names the player*, not how it reads.
- **No test of the surrender during the waiting player's turn.** That case is explicitly out of scope
  for this change.
- **No persistence test.** A surrendered match is not stored anywhere.
- **No cross-browser matrix.** Chromium only.
