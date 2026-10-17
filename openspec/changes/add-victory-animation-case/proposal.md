# Proposal

- **Change**: `add-victory-animation-case`
- **Branch when authorized**: `feature/add-victory-animation-case`
- **Owner role**: `dev`
- **Track**: 1 (Light) — frontend-only presentation, one file (`frontend/index.html`), no API, schema, or dependency change.
- **Capability**: `game-presentation`
- **Depends on**: None
- **Decision reference**: none (the `game-presentation` capability already authorizes presentation work; no new stack is introduced)

## Why

When a match ends, `finishMatch()` shows the winner panel and plays a single, fixed confetti burst
(`frontend/index.html:1567–1580`). It is the same every time a player wins, so the most celebratory
moment in the game is also the most predictable one. The human asked for a Counter-Strike: Global
Offensive-style **case-opening roulette** that spins across several victory animations and lands on one,
so each win can feel different and the winner can re-roll for fun.

## What Changes

- Add an **"Abrir caja"** button to the winner screen. The case-opening overlay stays hidden until the
  button is pressed.
- Add a hidden overlay with a **horizontal roulette reel**, a fixed centre pointer, and one cell per
  victory effect. The reel decelerates and stops with the chosen effect under the pointer.
- Implement **eight victory effects**, each drawn on a `<canvas>` with Canvas 2D and/or CSS: `confetti`
  (the existing burst, reused), `fireworks`, `gunfire` (machine guns firing upward), `fire`, `lightning`,
  `nuclear`, `money` (bills and coins), and `flash` (camera flash).
- On stop, play the landed effect full-screen behind the winner info, and announce its name.
- Offer **"Girar de nuevo"** and **"Cerrar"** once a spin resolves.
- Honor `prefers-reduced-motion`: skip the reel travel and play a short, calm version of the effect.
- Replace the automatic confetti on win with the button-driven case opening; `confetti` survives as one
  of the eight effects rather than as an unconditional animation.

## Out of scope

Any change to the game rules, scoring, crowns, turn order, or the win condition; any new API route,
database change, or dependency; any external asset, webfont, image, video, or sound; a fifth `.panel`
(the overlay is a modal inside the winner panel, like the crown picker); and persistence of which effect
was drawn.

## Depends on

None.

## Alternatives considered

- **Spin automatically on win, no button.** Rejected by the human in favor of a button, so the winner
  chooses when to open the case and can re-roll deliberately.
- **CSS-only reel with a separate animation element per effect.** Rejected. Eight bespoke DOM/CSS
  animations are harder to keep consistent and to test than one canvas effect player with one reel.
- **One `<canvas>` per effect.** Rejected. One shared canvas that the active effect draws on keeps a
  single animation loop and one teardown path, so effects cannot stack or leak between spins.
- **Import an animation library (e.g. a particles or confetti package).** Rejected. `game-presentation`
  requires zero external requests and no added runtime dependency; the effects are a few dozen lines of
  Canvas 2D each.
- **Keep the automatic confetti and add the case on top.** Rejected. Two overlapping celebration systems
  fight for the same canvas and the same moment; the case opening subsumes the burst.
