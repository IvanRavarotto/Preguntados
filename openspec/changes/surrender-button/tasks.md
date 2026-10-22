# Tasks

Ordered so that every task leaves the tree green. The frontend has no test runner; the checks named
here are the scripts under this change's `checks/` folder specified in `test-plan.md`.

## 0. Precondition

- [ ] 0.1 `add-victory-animation-case` is closed and archived, so that only one open delta touches
      `game-presentation` and only one change owns `finishMatch()`. **Verify**: `openspec list` shows
      no open change other than this one for that capability, and the archived change's delta is
      folded into the living spec.

## 1. Markup

- [ ] 1.1 Add the surrender control to the wheel screen: one per player, each bound to its player,
      each with an accessible name that names that player. Place it so it does not compete with the
      spin button.
- [ ] 1.2 Add the surrender control to the question screen, bound to the **active** player, with an
      accessible name that names the active player.
- [ ] 1.3 Add the confirmation overlay as a sibling of `#crown-picker`, reusing the `.crown-overlay`
      / `.crown-modal` classes: `role="dialog"`, `aria-modal="true"`,
      `aria-labelledby="surrender-title"`, a title naming the player, a cancel control and a confirm
      control. **Verify**: the document still has exactly four `.panel` elements with the four
      expected ids, and the overlay does not carry the class `panel`.

## 2. Styles

- [ ] 2.1 Style the surrender controls with the existing ghost-button treatment plus the palette's
      failure accent `#FF2A6D`, and the confirm control with the same accent. **Verify**: no new hex
      value, no radius outside `0.25rem`–`0.5rem`, and no drop shadow with a non-zero offset is
      introduced.
- [ ] 2.2 Add no media query and no new font or external reference. **Verify**: the stylesheet's
      media-query set is unchanged, and the document's reference set is unchanged.

## 3. Behaviour

- [ ] 3.1 Wire the surrender control to open the dialog: show the overlay, set the title to name the
      player, move focus into the dialog onto the **cancel** control, and remember the control that
      opened it. **Verify**: the focused element is inside the dialog and is not the confirm
      control.
- [ ] 3.2 Wire the cancel control and `Escape` to dismiss the dialog and restore focus to the
      control that opened it. **Verify**: the match's turn, crowns and pending question are
      unchanged after a dismissal.
- [ ] 3.3 Wire the confirm control to end the match: stop the countdown, show the winner screen with
      the **rival** as the winner, keep both players' crowns unchanged, and state that the match ended
      by surrender and name the player who surrendered. **Verify**: the winner's identity, both
      crown counts, and the winner screen's text.
- [ ] 3.4 Refactor `finishMatch()` (`frontend/index.html:2162`) to take the winner and the loser
      explicitly, keeping the existing six-crown call site's behaviour byte-for-byte equivalent. The
      surrender path passes the rival as the winner. **Verify**: a six-crown win still shows the same
      winner screen, the same crown glyph and the same podium.
- [ ] 3.5 Make the pending question unanswerable after a surrender, and make the post-surrender
      answer award nothing. **Verify**: clicking an option after the surrender adds no crown and
      changes no score.
- [ ] 3.6 Keep the rematch path working after a surrender. **Verify**: rematch returns to the
      player-name screen with both crown sets cleared.

## 4. Verification

- [ ] 4.1 Add `openspec/changes/surrender-button/checks/check_surrender.mjs` — a headless-Chrome
      DevTools Protocol driver that plays a match, opens the surrender control on the wheel screen
      and on the question screen, and asserts: the control's accessible name names the right player;
      the dialog has `role="dialog"`, `aria-modal="true"` and a title naming the player; the dialog
      holds exactly two controls; focus lands inside the dialog and not on the confirm control;
      Escape and cancel dismiss it and restore focus; confirming ends the match with the rival as
      the winner, both crown counts unchanged, and the winner screen naming the resigned player;
      the four `.panel` ids are unchanged; and no uncaught exception is raised. Locates Edge or
      Chrome automatically, honours `CHROME_PATH`, and exits with a distinct code and a clear message
      when no Chromium binary is found.
- [ ] 4.2 Record the negative controls: a copy whose confirm focus lands on the confirm control MUST
      fail; a copy whose surrender awards a crown MUST fail; a copy whose cancel button is missing
      MUST fail; a copy that leaves the countdown running after a surrender MUST fail. A check that
      comes back green on a mutated file has no teeth.
- [ ] 4.3 Run the full check set: `check_surrender.mjs`, the three earlier changes' checks,
      `poetry run pytest`, `poetry run ruff check .`, `poetry run ruff format --check .`,
      `poetry run mypy app`. All green.
- [ ] 4.4 Record the measured evidence in this file: the dialog's attributes and control count, the
      focused element before and after each dismissal, the winner and both crown counts after a
      surrender, the winner screen's text, the negative-control failures, and the command output of
      each check.

## 5. Human step

- [ ] 5.1 A human plays a match and surrenders from the question screen and from the wheel screen,
      and confirms that the dialog reads correctly in Spanish, that the cancel path is obvious, and
      that the winner screen's wording tells the two endings apart. Recorded as a human step; this is
      the only instrument for wording and legibility.
