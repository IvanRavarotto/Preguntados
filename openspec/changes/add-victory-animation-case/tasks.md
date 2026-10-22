# Tasks

Branch when authorized: `feature/add-victory-animation-case`. One file changes:
`frontend/index.html`. No API, schema, dependency, or backend change.

## 1. Markup and styles

- [x] 1.1 Add `#case-open` ("Abrir caja") to `.winner-actions` on `#screen-winner`, the `#fx` effect
      canvas, and the hidden `#case-overlay` modal with its reel window, pointer, `#case-result`
      live region, and "Girar de nuevo" / "Cerrar" buttons. **Verify**: the four `.panel` elements are
      unchanged and the overlay is `hidden` on load.
- [x] 1.2 Style the overlay, reel window, `.case-cell`, pointer, and actions with the existing obsidian
      and neon tokens, low radii, glass surfaces, and no drop shadow, matching `.crown-overlay`.
      **Verify**: no new external `url()`, `@import`, or font reference is introduced.

## 2. Catalog and reel

- [x] 2.1 Define `CASE_EFFECTS` with the eight ids (`confetti`, `fireworks`, `gunfire`, `fire`,
      `lightning`, `nuclear`, `money`, `flash`), each with a label and an inline SVG glyph, and build the
      reel cells from it. **Verify**: the reel holds one cell per catalog entry.
- [x] 2.2 Add the DOM-free pure function `chooseEffectIndex(count, rng)`, derive the landing from the
      target cell's measured layout position (`offsetLeft`/`clientWidth`), and expose
      `window.__case.getEffects()` and `getLandedId()`. **Verify**: `chooseEffectIndex` reads no DOM.
- [x] 2.3 Wire `openCase()`: show the overlay, pick the index, run the `4s` ease-out track transition,
      resolve on `transitionend` (with a `setTimeout` fallback and a spin token), and set `#case-result`.
      **Verify**: the cell under the pointer equals the chosen target for all eight indices.

## 3. Victory effects

- [x] 3.1 Add the animation-loop manager and `stopEffect()` over `#fx`, sizing for
      `devicePixelRatio` and clearing on stop. **Verify**: a second spin never stacks two effects.
- [x] 3.2 Implement `drawConfetti` by refactoring the existing `startConfetti` body onto the shared
      context. **Verify**: the confetti effect still renders when it is the landed effect.
- [x] 3.3 Implement `drawFireworks`, `drawGunfire`, `drawFire`, `drawLightning`, `drawNuclear`,
      `drawMoney`, and `drawFlash`. **Verify**: each runs for a bounded lifetime and then stops.

## 4. Behavior, motion, and accessibility

- [x] 4.1 Replace the unconditional `startConfetti(w.accent)` in `finishMatch()` with showing the
      "Abrir caja" control. **Verify**: winning no longer starts a canvas animation on its own.
- [x] 4.2 Honor `prefers-reduced-motion`: zero-duration reel and a short effect. **Verify**: with the
      media query forced on, opening the case resolves without the long travel.
- [x] 4.3 Make the overlay a focus-managed `role="dialog"`: focus into it on open, restore to `#case-open`
      on close, announce the result via `aria-live`, and close on Escape. **Verify**: tab focus does not
      escape the open overlay.

## 5. Verification

- [x] 5.1 Add a Node sandbox check over the shipped `frontend/index.html` asserting the eight effect ids,
      the overlay starts hidden, the button reveals it, and the cell under the pointer equals the played
      effect under an adversarial 129px-advance layout. **Verify**: the script exits non-zero on failure.
- [x] 5.2 Demonstrate the mutation control: unlinking the played effect from the pointed cell must fail
      5.1. **Verify**: the mutated copy goes red (pointed vs played mismatch).
- [x] 5.3 Run `node --check` on the extracted script and `openspec validate
      "add-victory-animation-case" --strict`. **Verify**: both pass.
- [x] 5.4 Human browser pass at desktop and mobile widths: open the case, confirm the reel stops on the
      named effect, the effect plays, "Girar de nuevo" re-rolls, Escape/close restores focus. **Verify**:
      recorded as a human step; no effect scrolls the page or makes a network request.

## Evidence

- `node --check` on the extracted script: exit 0.
- `node openspec/changes/add-victory-animation-case/checks/check_victory_case.mjs`:
  `VICTORY_CASE_CHECK_PASS {"effects":["confetti","fireworks","gunfire","fire","lightning","nuclear","money","flash"],"pointed":5,"played":5,"mutantPointed":7,"mutantPlayed":0}`
  (the pointed/played pair is random per run; the mutation's pair is always a mismatch).
- `openspec validate "add-victory-animation-case" --strict`: valid.
