# Proposal

- **Change**: `apply-neon-obsidian-theme`
- **Branch when authorized**: `feature/apply-neon-obsidian-theme`
- **Owner role**: `dev`
- **Track**: 1 (Light) — proposal, spec delta, tasks. No `design.md`.
- **Capability**: `game-presentation` (new)
- **Depends on**: None

## Why

The game renders as a bright cartoon landscape — sky gradient, clouds, sun, mountains, trees, hard
`0 8px 0` drop shadows, `24px` radii, pill buttons. None of it is load-bearing, and most of it is dead
weight: the decorative markup at lines 156–165 sits behind four fixed panels and is never seen. A
designed direction already exists in `stitch/` ("Obsidian Lumina"), and the project has no way to
state it: `openspec/specs/` is empty, so nothing describes how the game is *supposed* to look. This
change makes the designed presentation the real one and, for the first time, writes it down as a
specification rather than a screenshot.

## What Changes

- Replaces the light cartoon theme with the Obsidian Lumina treatment in `frontend/index.html`:
  obsidian canvas, glassmorphic panels, glow elevation, neon category palette, `Outfit`/`Space Mono`
  type pairing.
- Reassigns all six category colours and replaces the emoji icon set.
- Restyles all four panels, the derived wheel, the answer options, the timer, the scoreboard, the
  inputs, and the winner screen.
- Adds a visible timed-out state that the design never specified and the game already had.
- Replaces the single `420px` breakpoint with the design's `768px` and `1024px` breakpoints.
- Deletes the dead decorative markup and its CSS.
- **Creates** the `game-presentation` capability — the project's first spec.
- Records `docs/adr/ADR-001-neon-category-palette.md`.

No API, database, schema, dependency, build step, or gameplay-rule change.

## Capabilities

### New Capabilities

- `game-presentation`: how the game surface looks and behaves as a presentation — the canvas and
  glass tokens, the category palette and icons, the wheel, the feedback states, the timer, the panel
  shell, responsiveness, and the no-external-requests constraint. Named for behaviour, not for
  `frontend/`: a second surface would extend this capability rather than fork a "ui-styling" one.

### Modified Capabilities

None. `openspec list --specs` returns nothing, so there is no existing capability to modify.

## Overrides a declared project rule

`openspec/project.md` stated the wheel has "the established color/icon treatment" (§ Game and API
contract, line 46) and requires preserving the six-category wheel "unless the product scope is
changed" (§ Conventions, line 119). This change **reassigns all six colours and all six icons**:

| Category | Colour |
|---|---|
| `historia` | `#FFD000` |
| `geografia` | `#00F0FF` |
| `arte` | `#FF2A6D` |
| `deportes` | `#FF6B00` |
| `ciencia` | `#05FFA1` |
| `entretenimiento` | `#BD00FF` |

The six categories and the six-segment structure are preserved. The treatment is not. This is a
deliberate, human-approved override and it is recorded as `docs/adr/ADR-001-neon-category-palette.md`.

**Escalation resolved.** `docs/adr/README.md` and the `stack-conventions` skill require that an
approved deviation be recorded in an ADR *and* that `openspec/project.md` be amended in the same
change. Both are now done: the ADR is `docs/adr/ADR-001-neon-category-palette.md`, and
`openspec/project.md` line 46 has been amended in this change to state that the wheel uses the
current neon category palette defined in that ADR and the `game-presentation` spec. Line 119 is
**not** amended, and the earlier ask for that was wrong: line 119 governs the scope of the game —
six-category wheel, turn alternation, 20-second timer, four options, first-to-10 — and every one of
those is preserved here, so it creates no conflict. Nothing about this is pending a human.

## Conflicts inside the design source, and how they are settled

`stitch/DESIGN.md` contradicts itself and its own generated export in four places. Each is resolved
here so the next change does not re-litigate it. The frontmatter token set governs throughout.

1. **Canvas and text.** Prose says canvas `#090A10`, surfaces `#11131F`/`#1A1D2E`, text pure white
   `#FFFFFF`. Frontmatter says `background`/`surface` `#121319` and `on-surface` `#e3e1eb`. *Resolved:
   the frontmatter wins.* `#090A10` survives only as the on-fill ink for a high-saturation button,
   and `#FFFFFF` only as uppercase wheel-sector labels and button text sitting on saturated neon —
   both are ink-on-neon cases, not canvas.
2. **Radii.** Frontmatter declares `rounded.full: 9999px`. The export's Tailwind config maps
   `rounded-full` to `0.75rem` and shifts the whole scale one step. *Resolved: the frontmatter wins;
   the export's radius scale is rejected as a Stitch artifact.* `9999px` only for true circles, every
   other surface in the `0.25rem`–`0.5rem` band.
3. **Blur radius.** Prose says `blur(16px)`; the export uses `backdrop-blur-md` (12px) and
   `-xl` (24px). *Resolved: the prose wins — 16px.*
4. **Elevation.** Prose says glow blurs "rather than traditional drop shadows", but the export still
   carries seven default Tailwind drop shadows (`shadow-xl`×4, `shadow-md`×1, `shadow-sm`×2) because
   its config defines no `boxShadow` key — verified: the string `boxShadow` does not occur in
   `stitch/code.html`. *Resolved: the prose wins. Zero drop shadows.* The existing
   `--shadow: 0 8px 0 rgba(0,0,0,0.18)` hard-shadow idiom is deleted, not restyled.

One more conflict, inside the live code: `.question-text` is `clamp(17px, 4.5vw, 24px)`, whose floor
is below the design's own "primary trivia prompts must never drop below 18px on mobile". The delta
raises the floor to 18px.

### Divergences from the design, accepted and not pinned

Two elements in the frozen `frontend/index.html` render differently from their design sentences, and
neither is covered by a requirement in this delta. The governing decision — accept and record, rather
than write a requirement to match the file — is stated here so a reviewer does not have to infer it
from the absence of a clause. Both were open decisions in the spec pass and both were settled the same
way: **no requirement invented, no `dev` task owed, divergence recorded.** The third open decision in
that pass, `.turn-chip`'s `0.85` backplate, went the other way and *is* pinned, because R1 already
fixed a value that the chip contradicted; the asymmetry is deliberate and is explained below.

1. **`.opt .letra` — the index tag is opaque, where the design says an inset translucent pill.**
   `stitch/DESIGN.md:204`: the tag is "encased in a `rgba(255, 255, 255, 0.05)` **inset** pill with
   active color mirroring". Shipped, it is `background: var(--surface-high)` — `#292930`, fully opaque
   (`frontend/index.html:15`, used at `:277`) — with no `rgba(255,255,255,0.05)` fill and no `inset` in
   the rule (`:273–279`).
   *Decision: accepted, and the requirement's own wording is flagged rather than left to mislead.*
   R10's operative sentence asks for "an index tag in an inset pill", and the shipped tag is not one,
   so that word describes nothing the file supports. This is a defect in the **sentence** as much as
   in the CSS, and the pass does not fix it by weakening the sentence to match. The alternatives are
   to amend the requirement to say "opaque low-radius tag", or to change the CSS to the design's
   translucent inset treatment. **Neither is done here** — the first is a weakening, the second is a
   visual change nobody asked for. Escalated for the human with both options and their costs.
2. **`.q-cat` — the category chip is full-alpha and unfilled, where the design says `40%` on a
   `0.03` surface.** `stitch/DESIGN.md:209`: the chip's surface is `rgba(255, 255, 255, 0.03)` "with a
   `1px` solid border colored directly by the category neon token at **40% alpha**". Shipped,
   `.q-cat` declares **no background at all** and `border: 1px solid var(--accent)` at full alpha
   (`frontend/index.html:241–248`).
   *Decision: accepted.* No requirement in this delta governs the chip's fill or its border alpha, so
   pinning either would manufacture a new obligation out of an observation. The parts that *are*
   governed are satisfied and stay pinned: the chip's radius is `--r-md`/`0.375rem` (`:243`) inside
   R1's closed set, and the leading dot matches the design's "6px glowing geometric dot of the exact
   neon accent" at `0.375rem` with `border-radius: var(--r-pill)` and an accent glow (`:248`) — 6px is
   `0.375rem`, so that sentence is met exactly. Escalated for the human.

**Why `.turn-chip` is the exception to the exception.** Its `0.85` backplate is pinned, as a named
exception in R1's glass scenario, while these two are not. The difference is not severity; it is
whether a requirement already exists that the file contradicts. R1 states "a translucent backplate of
`#121319` at `0.7` alpha", `.turn-chip` reads `0.85`, and a tester comparing them finds an apparent
violation with no way to tell it is intended — so a sentence is owed. `.q-cat` and `.letra` sit in
values no requirement touches, where an unstated observation creates no confusion to correct. The rule
this yields: **an unguarded exception needs a sentence; an ungoverned value needs a record.**

## A human played the built game, and two findings came back

1. **The option index letters are wanted in fixed slots — a product decision, not a defect.** The
   shipped `renderQuestion` (`frontend/index.html:699`) shuffles `{text, letter}` pairs *together*,
   so a letter never detaches from its own text and there is no mismatch bug. What the human objected
   to is that the **letters** land in a different slot each question. Decision: `A`, `B`, `C`, `D`
   always read top-to-bottom in that fixed order, while the four option **texts** are still shuffled
   across those four fixed slots. A letter therefore no longer identifies its stored
   `option_a`…`option_d` source, and correctness is decided by the option's text, not its letter. The
   answers remain shuffle-random, so `openspec/project.md`'s "4 opciones barajadas" still holds and
   `project.md` needs no amendment. Written into the delta as the rewritten R10/S19 clause, and into
   `tasks.md` § 8.
2. **The wheel sector labels come out upside-down after a spin — a real defect.** `.seg-label` is a
   child of `#wheel`, which carries `transform: rotate(<accumulated wheelRotation>)`
   (`frontend/index.html:616`–`623`), and the label's own transform (`:202`) cancels only the sector's
   own centre angle `--a`, not the ancestor rotation. After the first spin every label reads at the
   wheel's accumulated angle and the lower ones are upside down. Decision: labels read **upright
   relative to the page** at any rotation, while still sitting inside their own sector. Written into
   the delta as the appended R15. The mockup is not a literal reference here — `stitch/code.html`
   rotates each label group by its sector centre angle (`:241`, `:252`, `:263`, `:274`, `:285`,
   `:296`) — so upright-relative-to-page is the human's decision, stated as such in R15's provenance.

Neither finding changes an API, a schema, a route, or a gameplay rule. Both change
`frontend/index.html` only, and both are additive to this change rather than a new one.

## Alternatives considered

- **Adopt `stitch/code.html` as the frontend.** Rejected. It is a generated export carrying
  `cdn.tailwindcss.com`, three Google Fonts links, a `<meta content="web_standard"
  name="shell-type"/>` artifact, an inlined `tailwind.config` blob, and two remote
  `lh3.googleusercontent.com` avatars. It also declares its six sectors as static SVG and reorders its
  own JS `categories` array (`code.html:472–479`) so its selection maths at line 511 lands. Copying it
  would hardcode a category list the database may disagree with, break the declared rule that the
  frontend must survive an unavailable category request, and add four third-party requests to a game
  that currently makes none. Its tokens and geometry are a reference; its markup is not.
- **Material Symbols glyphs for the icons.** Rejected — the webfont is an external request, and
  decision 1 forbids it.
- **Keep the emoji set (`ICON_BY_NAME`, `frontend/index.html:234`).** Rejected. It is the only
  zero-asset alternative, and it stays offline, but emoji render in the platform's own colour font and
  cannot be tinted by CSS, so a category icon would be the one element on the surface that ignores its
  category's colour — the exact thing the neon treatment exists to prevent. On a `#121319` glass
  ground the saturated emoji also read as the cartoonish register `DESIGN.md` opens by rejecting.
- **Extract the frontend to a build step or a framework.** Rejected. `openspec/project.md` keeps the
  frontend a static asset unless a change proposal introduces a build system, and this one does not.

## Out of scope

Nine mockup features are excluded by name — `"Sincronizado • Servidor Neon-04"` and `"SALA #CY-9021"`
(remote lobby; no auth, no remote multiplayer); `"TIEMPO DE TURNO: 00:45"` (the fixed 20-second rule
wins); `"MULTIPLICADOR: x1.5 XP"` (fixed 1 point wins); `"Dominio de Temas"` percentages (needs
persistence); the `1v1 RANKED` / `Supervivencia` / `Reto Diario` mode selector (new modes); `"Racha
Activa x4"` (new scoring rule); `"Misiones Diarias"` and coin/XP rewards (progression); the
`lh3.googleusercontent.com` avatars (a new outbound call and a third-party tracking surface in a game
that makes none); `"LATENCIA 18ms"` and the `v2.4.0-neon` footer (decorative, and the version string is
a false claim).

Also out: the scrolling three-column dashboard layout and the footer — rejected, the fixed
single-screen shell stays; any API change or new route; any `docker-compose.yml` edit; any schema or
data change; any build step, bundler, or new runtime dependency; any change to `TIMER_SECONDS`,
`WIN_POINTS`, scoring, turn order, question selection, or the no-reuse-within-category rule; any
`fetch` beyond the three the frontend already makes; any git commit or push.

**Deferred, not rejected**: `prefers-reduced-motion`. The neon treatment adds a 4s spin, a pulsing
node, and glow transitions, and nothing in `DESIGN.md` or the brief covers motion sensitivity. It is
left out rather than absorbed, and belongs in its own change.

*Scope rule: if it is not in the acceptance criteria, it is not in this change.*

## Fidelity: what the reviewer can and cannot check

`stitch/screen.png` is the only rendering of the design, **and no agent in this fleet can read
images**. The visual result is therefore unreviewed by machine. Fidelity here is derived from
`DESIGN.md` prose plus `stitch/code.html` markup, and **no claim is made that the result matches the
screenshot**. A human must eyeball it.

Only one of four panels has a mockup: `stitch/code.html` is the wheel screen. `screen-start`,
`screen-question` and `screen-winner` have prose only, and the question screen is the busiest of the
four with the least visual reference. **Low fidelity on the question screen is expected and is not
sloppiness** — reviewers should expect it to need iteration and should judge it against the tokens and
the acceptance criteria, not against the PNG.

## Risks

- **No git baseline — no revert path.** The human chose not to commit the current state, so
  `frontend/index.html` is untracked (`git status` shows `?? frontend/`) and there is no
  `git revert` for this change. Rollback is the file copy the orchestrator holds outside the repo.
  Recovery means restoring that copy by hand, not a git command. Stated plainly because the usual
  safety net is genuinely absent.
- **A wrong-category bug no screenshot catches.** The live game derives the wheel from
  `GET /categories`; the mockup hardcodes six sectors into SVG. Treating the neon design as static
  markup would make the game display categories the database does not agree with. This is the reason
  the delta requires the rotation→sector computation to be a DOM-free pure function and carries a
  criterion for it.
- **Question-screen fidelity is unreviewable by the fleet** (above). Mitigation: explicit criteria,
  and a human eyeball at Gate C.
- **No coverage percentage is reported.** None exists to report; inventing one for a single file with
  no test framework would be fiction. The bar is the two machine checks plus a recorded manual pass.
- **The `project.md` line 46 amendment is done in this change**, so the deviation and the declaration
  agree by the time this archives. Recorded here so a later reader does not have to re-derive it.

## Impact

- `frontend/index.html` only — CSS block, decorative markup, and the small amount of JS that builds
  labels, the timer, and the feedback states. No other production file changes.
- `docs/adr/ADR-001-neon-category-palette.md` added.
- `openspec/changes/apply-neon-obsidian-theme/specs/game-presentation/spec.md` added; no existing spec
  touched.
- `app/main.py` is unaffected: it serves the file with `FileResponse` per request
  (`app/main.py:22`), so **no Uvicorn restart is needed** — only browser cache is a staleness risk.
