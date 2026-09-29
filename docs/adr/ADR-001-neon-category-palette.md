# ADR-001 — Neon category palette

- **Status**: Accepted
- **Date**: 2026-09-25
- **Change**: `apply-neon-obsidian-theme`

## Context

`openspec/project.md` states, in § Game and API contract, that the wheel "has six segments and the
established color/icon treatment for `arte`, `ciencia`, `deportes`, `entretenimiento`, `geografia`, and
`historia`", and in § Conventions that the six-category wheel is to be preserved "unless the product
scope is changed". The current treatment is a bright cartoon palette — `#4fc3f7`, `#c39a6b`, `#81c784`,
`#f06292`, `#ffb74d`, `#ba68c8` — assigned positionally by array index, with emoji glyphs.

A design was produced for this game, "Obsidian Lumina" (`stitch/DESIGN.md`), built on
minimalist glassmorphism with high-contrast neon accents. Its premise is that a category's colour is
its identity: the same hex drives the wheel sector, the chip, the border, the glow, and the state
indicator. That premise cannot hold with a palette chosen for contrast against a sky gradient, and it
cannot hold with emoji icons, which render in the platform's own colour font and cannot be tinted by
CSS at all.

This is a decision rather than an obvious step because it is a deliberate override of a written
project rule. The override was granted explicitly by the human, not inferred.

## Decision

We will reassign all six category accents to the neon palette, keyed by category **name** rather than
by position in any array:

| Category | Accent |
|---|---|
| `historia` | `#FFD000` |
| `geografia` | `#00F0FF` |
| `arte` | `#FF2A6D` |
| `deportes` | `#FF6B00` |
| `ciencia` | `#05FFA1` |
| `entretenimiento` | `#BD00FF` |

Each category will carry a hand-authored monochrome inline SVG glyph filled with `currentColor` in
that accent, replacing the emoji set. No icon webfont, no sprite sheet, and no image file is
introduced.

The six categories and the six-segment wheel structure are unchanged. What is overridden is the
*treatment* — the colours and the icons.

## Alternatives considered

- **Keep the existing colour/icon treatment and restyle only the surfaces.** Rejected. The design's
  central claim is that colour carries category recognition; keeping a palette chosen against a sky
  gradient would leave the one part of the design that earns its place undone, and the old colours
  would read as arbitrary against a `#121319` obsidian canvas.
- **Adopt only the subset of accents that fit the current background, and leave the rest.** Rejected.
  A partial override is harder to reason about than a clean one: the next reader cannot tell whether a
  category's colour is a decision or an oversight.
- **Keep the emoji icons and change only the colours.** Rejected. Emoji are the only zero-asset icon
  option and they do stay offline, but they cannot be tinted by CSS, so an emoji icon would be the one
  element on the surface that ignores its category's colour. On a dark glass ground the saturated
  emoji also read as the cartoonish register the design explicitly rejects.
- **Adopt the Material Symbols glyphs the mockup uses.** Rejected. That webfont is an external
  request, and this project has no outbound call to any third-party host and is not acquiring one for
  a decoration.
- **Adopt `stitch/code.html` wholesale, including its static six-sector SVG.** Rejected, and this is
  the alternative most likely to be proposed again. That file hardcodes the six sectors, colours,
  labels, and icons into SVG and separately reorders its own JS `categories` array so its selection
  arithmetic lands on the right sector. Copying the markup while keeping array-indexed selection would
  make the game display a category the database does not agree with, on every spin, with nothing in a
  screenshot to reveal it. The neon treatment belongs on the wheel derived from `GET /categories`.

## Consequences

The game gains a coherent visual identity in which a category's colour is consistent across the
wheel, the chip, the borders, and the glow, and it loses nothing: the palette is six hex values and
the icons are inline SVG, so the document still makes zero external requests.

The wheel's categories remain derived from the API at runtime. That constraint is now load-bearing in
a way it was not before, and it is enforced by two checks that bind the **rendered** sector geometry
to the array-indexed selection, so a hardcoded wheel is red rather than plausibly green. Both are
named rather than described, so a reader can go and run them: `AT-2b`, the machine-executable
rendered-geometry binding, and `SM-21`, the browser step, in `test-plan.md` § 4 of the change that
produced this record. `AT-2b` exists because the browser step is the only one of the two that
observes a rendered pixel, and it is therefore the one that will still be running years from now — the
machine check reads what the code wrote into the DOM, which is one layer short of appearance. Neither
replaces the human eyeball, and no claim is made about it.

Worth recording precisely, because the obvious cheap guard does not work. A `node -e` check over 42
spin/rotation pairs is **not** that guard, though it was originally described here as one. The
rotation function and an independent oracle both read the same `categories` array, so the array's
order cancels out: measured against the real script, the live `/categories` order agrees 42 of 42 and
the mockup's reordered array *also* agrees 42 of 42. Hardcoding the wheel leaves that check green.
The rotation check therefore survives only as a regression guard on the maths, and the
rendered-geometry binding named above is what protects this decision.

Colour is no longer assigned by array position, so a category the API returns that is not one of the
six no longer inherits a neighbour's colour. That is a deliberate robustness gain, not a side effect.

Two costs are accepted. The SVG glyphs are hand-authored approximations of the Material Symbols
outlines in the mockup, not those outlines, so they are less refined than a real icon set. And a
category's accent can no longer be tuned for contrast against a bright background, because there is no
bright background any more — the two feedback hues `#05FFA1` and `#FF2A6D` now also serve as the
correct and incorrect accents for `ciencia` and `arte`, so a correct answer in `arte` and an incorrect
answer in `ciencia` are the same coral. This is a known ambiguity in the design's palette, inherited
unchanged, and it is why the answer feedback is carried by surface treatment and revealed text rather
than by hue alone.

Finally, this ADR and the spec delta together supersede the "established color/icon treatment" wording
in `openspec/project.md`. **That file has now been amended, in the same change that produced this
record:** line 46 states that the wheel uses the current neon category palette defined in this ADR and
the `game-presentation` spec. Line 119 needed no amendment — it governs game scope, which this change
preserves — and the declaration and this ADR no longer conflict.
