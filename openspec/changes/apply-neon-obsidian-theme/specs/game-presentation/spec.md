# Spec Delta

## Purpose

Defines how the Preguntados 1v1 game surface is presented: the obsidian canvas and glass tokens, the
neon category palette and icon set, the derived category wheel, the three answer-feedback states, the
timer module, the fixed single-screen shell, and the offline and responsive constraints that a
presentation change must not break.

Provenance tags on every scenario: `[DESIGN]` from `stitch/DESIGN.md` or `stitch/code.html`;
`[PRESERVE]` from `openspec/project.md`; `[IMPL]` from the current `frontend/index.html`;
`[AUTHORED]` written by the architect to fill a gap or settle a conflict, and therefore this
project's judgment rather than a stakeholder's requirement.

## ADDED Requirements

### Requirement: Obsidian canvas and glass surface tokens

The presentation SHALL use the `stitch/DESIGN.md` **frontmatter** token set, which governs over the
prose and over the generated export wherever they disagree. The canvas SHALL be `#121319` and primary
text SHALL be `#e3e1eb`. The prose's darker canvas (`#090A10`, `#11131F`, `#1A1D2E`) and its pure-white
body text SHALL NOT be used as canvas or body text. `#090A10` is retained only as the ink on a
high-saturation filled button, and `#FFFFFF` only as text on a saturated neon fill. That enumeration is
narrower than the earlier wording implied, and the file is what fixes it: on disk `#FFFFFF` reaches
exactly **one** wheel sector label, `entretenimiento`'s, and every other sector label **and** the
primary button label is `#090A10` — which is what `stitch/DESIGN.md:212` asks for, "a high-saturation
fill with black text (`#090A10`)". The prohibition above is unchanged; only the illustrative
parenthetical is corrected, from "wheel sector labels, primary button labels" to this.

Primary surfaces SHALL be glass: a translucent backplate of `#121319` at `0.7` alpha, unprefixed
`backdrop-filter: blur(16px)`, and a `1px` inner stroke of `rgba(255, 255, 255, 0.08)`. The two
player-name inputs are the design's separate § Input Fields component and **not** a glass backplate:
they take a solid surface fill with no `backdrop-filter`, and their own unfocused stroke is `1px`
white at **`10%`** alpha, a different value from the glass backplate's. Where the two components'
strokes are compared, the input's own value governs the input, and the glass value above is never
read as the input's. Card radius SHALL fall in the `0.25rem`–`0.5rem` band. Elevation SHALL be
produced by chromatic outer glow and inner stroke; the presentation SHALL contain **no drop shadow**
of the form `<offset>x <offset>y <blur> <color>` with a non-zero offset, and the existing
`0 8px 0 rgba(0,0,0,0.18)` hard-shadow idiom SHALL be absent.

> `[AUTHORED]` The prose specifies the glass backplate as `rgba(17, 19, 31, 0.7)` — a colour that is
> not in the authoritative frontmatter token set. The alpha (`0.7`) and the blur (`16px`) are taken
> from the prose, which the frontmatter does not address; the colour is re-derived as `#121319` at
> that alpha. Answer option cards use the same derivation at `0.8` alpha.

#### Scenario: Canvas and text colours are the frontmatter values

- **GIVEN** the game is served from `GET /`
- **WHEN** the computed background colour of `body` and of `.panel` are read, and the computed
  `color` of the question text are read
- **THEN** the background colour is `rgb(18, 19, 25)` (`#121319`) on both
- **AND** the question text colour is `rgb(227, 225, 235)` (`#e3e1eb`)
- **AND** no rule in the stylesheet declares `background-color: #090A10` on `body` or on a panel

*Provenance: `[DESIGN]` (frontmatter `background`, `surface`, `on-surface`) with `[AUTHORED]`
resolution of the prose conflict. Measurable: exact RGB triples.*

#### Scenario: Glass surfaces blur, stroke, and cast no drop shadow

- **GIVEN** the four panels, and the two player-name inputs on the start panel
- **WHEN** the computed `backdrop-filter`, `border` width, and `box-shadow` of the question card are
  read, and then each name input's computed `border` colour is read while that input is unfocused
- **THEN** `backdrop-filter` contains `blur(16px)` and is unprefixed
- **AND** the computed border width is `1px` with colour `rgba(255, 255, 255, 0.08)`
- **AND** no `box-shadow` declaration in the stylesheet has a non-zero `x` or `y` offset, and for
  that comparison `inset` is read as the keyword it is rather than as an offset: in
  `inset 0 0 12px rgba(...)` the two offsets following the keyword are the `x` and the `y`, and both
  are `0`, so the layer satisfies this clause rather than failing it
- **AND** each name input's unfocused `border-color` computes to white at `10%` alpha,
  `rgba(255, 255, 255, 0.10)`
- **AND** the three elements that read `--stroke-strong` are still `.wheel` (its rim), `.q-player`
  (the question screen's turn chip), and `.feedback` (the feedback strip), which is the whole of its
  consumer set; the wheel screen's own `.turn-chip` is **not** one of them and borders with
  `var(--p-accent)` by design, so a tester finding a category-glow border there is reading the
  specified state and must not correct it
- **AND** the wheel screen's `.turn-chip` is this requirement's one **named exception** on backplate
  alpha: it reads `--glass-strong: rgba(18, 19, 25, 0.85)` (`frontend/index.html:52`, used at
  `:158`), which is the **ceiling** of the `60% to 85%` glassmorphism band in `stitch/DESIGN.md:151`
  and is named here so that a tester comparing it against the `0.7` above reads an exception rather
  than a defect

*Provenance: `[DESIGN]` § Elevation & Depth, § Foundational Canvas & Glass Tokens, and § Input
Fields for the input's own `1px` white stroke at `10%` opacity. Measurable:
`backdrop-filter: blur(16px)` unprefixed is Baseline 2024 — supported unprefixed in Chrome/Edge 120+,
Firefox 103+, Safari 18+. `[IMPL]` — the input carries its own `--stroke-input` token at
`frontend/index.html:23` and reads it at `:124`, so this value is **already implemented** and the
scenario passes on the value today; the note below records what this delta adds over that. `[AUTHORED]`
— the isolation control, the `inset`-keyword reading, and the placement of a form field in a
glass-and-stroke scenario, per the note below.*

> `[AUTHORED]` The input's `10%` stroke is **required, not waived**, and it is pinned here for two
> reasons, one of which corrects the earlier version of this note. First, `stitch/DESIGN.md:219` states
> it without ambiguity: "Unfocused inputs retain a `1px` white stroke at 10% opacity, snapping to
> category glow on active focus." Second, no clause in this delta previously mentioned the input's
> stroke at all, so the design sentence was **ungoverned** — nothing in the spec would have caught a
> regression in it, and the defect was the silence, not the value. The earlier note also called the
> sentence "unimplemented", and that half was **false**: the input already has its own
> `--stroke-input: rgba(255, 255, 255, 0.10)` (`frontend/index.html:23`) and reads it at `:124`. The
> value was never owed by `dev`; what was owed was a clause to hold it in place, and it passes on the
> value today. The focus half of the same sentence is implemented too (`caret-color: var(--geografia)`
> at `:125`, the `--geografia` border at `:131` and ring at `:132`) and is deliberately **not**
> required here, because the design says "category glow" while the start screen has no category; that
> half is a design ambiguity this delta does not resolve, and it is recorded in `proposal.md` as a
> follow-up rather than silently pinned to cyan.
>
> **The value is not the difficulty; the shared token is.** `--stroke-strong` is
> `rgba(255, 255, 255, 0.15)` (`frontend/index.html:22`) and has exactly **three** consumers: the
> wheel rim at `:185`, `.q-player`'s border at `:251`, and the feedback strip's at `:287`. The earlier
> note said "four users" and listed the input among them; that was a miscount against an older
> revision of the file, and on the frozen file the input is not a consumer, which is why the clause
> above names three. Lowering the shared token to `0.10` would restyle all three to a dimmer stroke
> than the design gives them, so the isolation control is the load-bearing half of this scenario: it
> fails a reviewer who reaches for the shared token instead of adding an input-local one.
>
> **The two chips are different elements, and the clause now says so.** The wheel screen's `.turn-chip`
> (`frontend/index.html:155–162`, `border: 1px solid var(--p-accent)` at `:158`, over
> `--glass-strong` at `52`) never read `--stroke-strong` at all, and the earlier clause called it one of
> the three. That was wrong in a way a tester could act on: it asked them to verify a white `15%`
> stroke on an element the design specifies with a category glow. `.q-player` (`:249–254`) is the chip
> on the question screen and *is* a consumer. The set is closed, and `--glass-strong` has no other
> consumer than `.turn-chip`.
>
> **`.turn-chip`'s `0.85` backplate is pinned as a named R1 exception, and this was the third open
> decision in the pass.** R1's text says "a translucent backplate of `#121319` at `0.7` alpha", and
> `.turn-chip` reads `0.85`. Three things settled it rather than leaving it ambiguous. (1) The design
> does not forbid it: § Foundational Canvas & Glass Tokens specifies "Structural base with **60% to
> 85% alpha** for glassmorphism" (`stitch/DESIGN.md:151`), so `0.85` is the band's own ceiling and
> `0.7` is an interior value, not a bound. (2) R1's `0.7` sentence governs **primary surfaces** — the
> panels and the question card — and a chip is neither; a chip over the wheel must sit on a denser
> backplate than a full panel, or the six neon sectors read straight through it. (3) The colour half is
> identical: `--glass-strong` is the same `#121319` at a different alpha, so there is no second glass
> *colour* in the file, which is the thing R1 is actually protecting. Pinning the value rather than
> leaving it to inference matters because an unguarded exception is indistinguishable from an
> oversight, and a reviewer comparing the chip to the `0.7` clause has to be told which one they are
> looking at. The value was already correct; what was missing was the sentence saying so.
>
> **`inset` is a keyword, and the reason it is written out.** The design's Focused/Selected Answer
> layer is `box-shadow: 0 0 20px rgba(var(--neon-rgb), 0.35), inset 0 0 12px rgba(var(--neon-rgb),
> 0.15)` (`stitch/DESIGN.md:192`), so this delta now requires an `inset` layer on the option cards
> and that layer is subject to the zero-offset clause above. A checker that splits a `box-shadow` on
> whitespace and reads the first token as the `x` offset reads the keyword `inset` as a non-numeric
> offset and reports a false failure against a conforming file. `qa-manager` hit exactly that while
> building this scenario's harness. The clause now states the reading instead of leaving the
> interpretation to whoever writes the check, because an unsatisfiable-looking clause is how a
> correct file gets recorded as a defect.

#### Scenario: Radii stay low, and the full radius is spent on a closed, named set

- **GIVEN** every card, option, input, button, chip, and progress element in the presentation
- **WHEN** computed border radii are collected and each is matched against the two sets below
- **THEN** each radius is one of `0.25rem`, `0.375rem`, `0.5rem`, or `9999px`
- **AND** a `9999px` radius appears **only** on an element in the closed allowed set: the category
  indicator dot (`.q-cat .dot`), the timer track and its bar (`.timer`, `.timer-bar`), the wheel and
  its vignette (`.wheel`, `.wheel::before`), and the wheel-hub spin button (`.spin-btn`, `#spin`)
- **AND** every element outside that set sits in the `0.25rem`–`0.5rem` band, and these four mappings
  are exact rather than indicative: `.q-cat` → `--r-md` (`0.375rem`), `.q-player` → `--r-md`,
  `.turn-chip` → `--r-md`, and `.score-card .slot` → `--r-sm` (`0.25rem`)
- **AND** no radius in the stylesheet equals the `0.75rem` value that the generated export assigns to
  its `rounded-full`

*Provenance: `[DESIGN]` frontmatter `rounded` and § Shapes. `[IMPL]` — the six `--r-pill` sites at
`frontend/index.html:184, 189, 214, 230, 234, 248` and their intended tokens.
`[AUTHORED]` — the closed-set rule, the withdrawal of the shape description, the four exact token
mappings, and the timer-track/slot asymmetry. Measurable: the four allowed values, membership of the
allowed set, the four exact mappings, and the export's one-step-shifted scale rejected.*

> `[AUTHORED]` Three things were unresolved in the earlier wording of this scenario. They are settled
> here so that neither a reviewer nor a smoke test has to interpret them. The requirement is not
> weakened by this amendment; in two places it is made checkable.
>
> **The named set is normative; the shape description is withdrawn as a test.** The earlier text said
> `9999px` appears "only on a shape that is circular in both axes: the category dot, the timer track,
> and the wheel". The timer track is a wide flat bar, not a circle, so the description and the list
> contradicted each other and a tester could fail a correct implementation by applying the
> description. The list governs and the test is membership. The description survives only as the reason
> most of the list is on it.
>
> **The wheel-hub button joins the set, and it is a genuine circle.** `.spin-btn` is `width: 30%` with
> `aspect-ratio: 1` (`frontend/index.html:210–217`, the two declarations at `:212`) — a square box made
> circular by radius, in both axes like the dot and the wheel. `stitch/code.html:313` renders the same
> control as `w-32 h-32 rounded-full`, which is what the frontmatter's `rounded.full: 9999px` exists
> for. Its absence from the earlier list was a gap in the list, not a defect in the code.
>
> **Chips and progress segments take the low band, each with one exact token.** `DESIGN.md` § Shapes
> governs: "Surfaces utilize low-radius (`0.25rem` to `0.5rem`) soft edges to echo professional
> simulation terminals, rejecting overly round or playful bubble aesthetics. Category indicator dots,
> status nodes, and countdown rings maintain pure Euclidean circular geometry (`50%`), balancing the
> hard-angled structural architecture of cards and choice buttons." A chip is a *surface*, not a dot, a
> status node, or a countdown ring, so the low band is what § Shapes gives it. § Category Chips &
> Badges specifies the chip's typography, surface fill, and border and is silent on radius, so nothing
> in it contradicts this. The three chips share `--r-md` so that the two chips on the question screen's
> top row and the wheel screen's turn chip read as one class of element; the progress slot takes
> `--r-sm` because at `0.625rem` tall it is the one element where the band's upper bound would still
> read as a bubble.
>
> **The counter-evidence is recorded, not hidden.** The generated export puts `rounded-full` on two
> badge-shaped containers (`stitch/code.html:9` and `:169`) and on its progress bars (`:54–55` and
> `:410–411`), which reads against this resolution. Neither badge is a category chip: `:9` is the
> remote-lobby status pill the proposal already excludes by name, and `:169` is a round/mode label
> inside the scrolling dashboard layout this delta also rejects. This delta has additionally already
> rejected the export's radius scale outright as a Stitch artifact (`proposal.md`, "Conflicts inside
> the design source"). The conflict is therefore settled in favour of § Shapes, and the export's usage
> is written down so the next change does not re-derive it.
>
> **One asymmetry in this set is `[AUTHORED]` and a reviewer may reopen it.** The timer track and the
> scoreboard slots are the same kind of element — a thin progress bar — and this scenario keeps the
> first at `9999px` and moves the second to `--r-sm`. The track stays because the earlier set named it
> and § Dynamic Linear & Radial Timers presents the countdown as a capsule; the slots move because a
> `9999px` radius on a row of ten discrete segments is a bubble register that no design sentence asks
> for. No design sentence separates the two, so the separation is the architect's judgment.

### Requirement: Neon category palette

Each of the six categories SHALL carry exactly one neon accent, keyed by the category **name** the API
returns and not by its position in any array: `historia` `#FFD000`, `geografia` `#00F0FF`, `arte`
`#FF2A6D`, `deportes` `#FF6B00`, `ciencia` `#05FFA1`, `entretenimiento` `#BD00FF`.

This reassigns all six colours of the previous treatment and therefore **overrides** the
"established color/icon treatment" in `openspec/project.md`. The six categories and the six-segment
wheel structure are preserved; the colours are not. Recorded in
`docs/adr/ADR-001-neon-category-palette.md`.

#### Scenario: Every category renders in its assigned accent

- **GIVEN** the game has loaded its six categories
- **WHEN** each category's accent is read from the rendered wheel sector, the category chip on the
  question screen, and the palette lookup
- **THEN** all three agree for each of the six categories
- **AND** the six accents are exactly the six hex values above, each appearing once

*Provenance: `[DESIGN]` § Category Accent Tokens, with `[PRESERVE]` for the six categories. Source of
the override: `docs/adr/ADR-001-neon-category-palette.md`.*

#### Scenario: A seventh category name does not take a neighbour's colour

- **GIVEN** the category list the API returns is not one of the six known names
- **WHEN** the presentation resolves that category's accent
- **THEN** the lookup is by name and the category is not silently assigned another category's accent
  by array position

*Provenance: `[IMPL]` — the current code assigns colours positionally via
`COLORS[i % 6]` (`frontend/index.html:256`), which is exactly the coupling this removes.*

### Requirement: Category icon set

Each of the six categories SHALL carry a **hand-authored inline SVG glyph**, monochrome, filled with
`currentColor` and sized to fit a wheel sector label and a category chip. Glyphs SHALL be embedded in
`frontend/index.html`; no icon webfont, sprite sheet, or image file SHALL be introduced. A category
name with no glyph SHALL fall back to a generic marker, as the emoji map does today.

> `[AUTHORED]` Decision. Emoji (the current `ICON_BY_NAME`, `frontend/index.html:234`) were rejected
> and SVG chosen: emoji render in the platform's own colour font and cannot be tinted by CSS, so an
> emoji icon would be the one element on the surface that ignores its category's colour — the thing
> the neon treatment exists to prevent. The cost is real and accepted: these are approximations of
> the Material Symbols outlines in `stitch/code.html`, not those outlines, because the webfont is an
> external request that decision 1 forbids.

#### Scenario: Icons render offline, in a legible category-derived ink

- **GIVEN** the game running with no network beyond the local API
- **WHEN** the six wheel sector labels are inspected, and each glyph's resolved fill is read
  together with the accent that its own sector is painted in
- **THEN** all six icons are inline `<svg>` elements present in the document source
- **AND** no `@font-face` rule and no external stylesheet or font URL appears in the document
- **AND** each glyph's resolved fill equals the `on` of the `ACCENT_BY_NAME` entry that declares the
  accent its **own** sector is painted in — `#090a10` for `historia`, `geografia`, `arte`,
  `deportes`, and `ciencia` — resolved through that sector's own accent and never
  through the glyph's position in the wheel
- **AND** that mapping is not satisfiable with a single ink: `entretenimiento`'s glyph resolves to a
  value **different** from the other five, compared by exact value and not by luminance, so a
  presentation that paints all six glyphs `#090a10` fails this scenario
- **AND** for **all six** the WCAG 2.2 contrast ratio between the glyph's resolved fill and its own
  sector's accent is at least `3:1`
- **AND** the glyph and its sector label resolve to the **same** colour, so one palette entry tints
  both from a single source
- **AND** the category chip's marker is a dot painted in the category's accent, not a glyph

*Provenance: `[AUTHORED]` decision, the conflict resolution below, and the two-ink control. `[DESIGN]`
§ Category Chips & Badges for the chip's accent dot. `[IMPL]` — the per-accent `on` ink in
`ACCENT_BY_NAME` (`frontend/index.html:385–392`), resolved at `:479` and set on the label at `:544`,
over the solid `conic-gradient` sector at `:533`. Measurable: the `on` lookup for each of the six
sectors, the all-one-ink control, the contrast ratio computed for each of the six, the glyph/label
colour agreement, and the chip's dot; the six values are in the note below.*

> `[AUTHORED]` Resolution of a contradiction **inside this delta**. The requirement text and the
> earlier wording of this scenario disagreed about what "in the category's accent" means, and the
> scenario was wrong. The requirement text governs; the scenario is amended to agree with it.
>
> **`currentColor` is the mechanism; the ink is the value it resolves to.** The requirement mandates
> each glyph be "monochrome, filled with `currentColor`" — that is the *tinting mechanism*, and it
> holds: every glyph is inline SVG whose `fill` is `currentColor` (`frontend/index.html:205`), and
> the label containing it is given a colour (`:544`), so the glyph resolves to whatever the palette
> says is legible on that sector. What `currentColor` *resolves to* is a separate question, and the
> earlier scenario answered it wrongly.
>
> **A glyph in the category's own accent is not achievable on a sector painted in that accent, and
> this delta forbids it twice over.** A colour's rendered contrast ratio against itself is exactly
> `1.00:1`, so an accent glyph would be invisible inside its own sector — measured control below.
> And R2's S4 already pins every sector to the accent hex itself ("the six accents are exactly the
> six hex values above"), so an accent glyph is not merely unattractive, it is **unsatisfiable against
> another requirement of the same delta**. Only the scenario's phrase "rendered fill **matches** its
> category's accent" was in error: it confused *tintable by* with *painted in*.
>
> **The contrast bar, and the six values behind it.** The bar is `3:1`, the WCAG 2.2 non-text
> contrast threshold, so a tester computes it rather than judging it by eye. Glyph fill against its
> own sector accent: `historia` `#090a10` on `#FFD000` **13.43:1**; `geografia` `#090a10` on `#00F0FF`
> **14.03:1**; `arte` `#090a10` on `#FF2A6D` **5.46:1**; `deportes` `#090a10` on `#FF6B00` **6.92:1**;
> `ciencia` `#090a10` on `#05FFA1` **14.89:1**; `entretenimiento` `#FFFFFF` on `#BD00FF` **4.56:1**.
> Minimum **4.56:1**, so the bar holds with headroom on all six, and the rejected alternative scores
> **1.00:1** (`#FFD000` against `#FFD000`). *These seven figures are my computation* from the hexes on
> disk using the WCAG 2.x relative-luminance formula; they are not a browser measurement, and `qa`
> should recompute rather than trust them. The six **resolved label colours** they rest on are
> independently verified — `tasks.md` § Verification record reads them off the shipped script as
> `#090a10 #090a10 #090a10 #FFFFFF #090a10 #090a10`.
>
> **The ratio is the floor, not the proof, and the two are now separate clauses.** The earlier
> wording paired the substantive claim ("the ink its category declares") with the measurable one
> (the `3:1` ratio) inside a single bullet, and on this palette the measurable half does not imply
> the substantive half. `[QA]` Finding 8 measured why: painting **all six** glyphs the dark ink
> `#090a10` clears `3:1` against **every** accent in the palette — worst case **4.34:1** on
> `entretenimiento` — while `#FFFFFF`, the ink the palette declares for `entretenimiento` alone,
> scores **1.33:1** on `ciencia` and fails on four of six. A wheel that ignored the per-category `on`
> entirely would pass a literal reading of the old bullet while being exactly the defect the scenario
> exists to prevent. That is a property of the palette, not of the requirement: `#090a10` is simply
> dark enough to clear the non-text bar on all six neons. Both clauses are kept; they are now
> separate, so neither can stand in for the other.
>
> **The control is "not all one ink", not "six distinct inks", because the palette declares two.**
> `ACCENT_BY_NAME` (`frontend/index.html:385–392`) gives `#090a10` to five categories and
> `#FFFFFF` to `entretenimiento` — **two** distinct values, not six. A clause demanding six mutually
> distinct inks would be unsatisfiable against the very palette R2 declares in this same delta, and
> demanding a bijection onto six would fail a conforming file. So the scenario pins the lookup
> itself — the accent a sector is painted in resolves to the `ACCENT_BY_NAME` entry declaring that
> accent, and that entry's `on` is the glyph's resolved fill — and adds the one control that
> discriminates: `entretenimiento` must differ from the other five. One sentence, no new
> measurement, and the all-ink wheel fails.
>
> **Compared by exact value, deliberately not by luminance.** The two inks sit close together in
> relative luminance — which is exactly why the `3:1` bar cannot separate them — and far apart in
> hue: `#090a10` is a very dark, faintly blue black, and `#FFFFFF` is achromatic. A control written
> as "the six inks differ in luminance" would be *satisfied* by the failing implementation, since
> `#090a10` and `#FFFFFF` do differ in luminance. What has to be compared is the rendered **value**
> against the declared one, so the clause says exact value and names the category whose ink is the
> odd one out.
>
> **The counter-evidence is recorded, not hidden, because the mockup does the opposite and looks
> good doing it.** `stitch/code.html:239–277` paints each sector with the accent gradient, lays an
> `rgba(0,0,0,0.18)` scrim over it, and then sets the accent glyph **inside a `#121319` disc at `0.88`
> opacity** — that glyph is legible because it sits on a dark chip, not on the accent. That is the
> one way an accent glyph could work on an accent sector, and this delta does not adopt it: the disc
> is in neither § Category Accent Tokens nor this requirement, and it is markup from the export's
> sector block, which S7's note already forbids pasting. A reviewer weighing it should also weigh that
> it breaks S4 **twice** — the scrim means the sector no longer renders the exact accent, and the
> disc means the glyph no longer sits on the accent. A later change may adopt it; it would need its
> own requirement and would have to amend S4 to be honest.
>
> **Two smaller facts, recorded so the next change does not re-derive them.** (a) The requirement text
> says the glyphs are "sized to fit a wheel sector label and a category chip"; that describes the
> glyph's *scale capability*, not the chip's content, because § Category Chips & Badges specifies a
> "leading 6px glowing geometric dot of the exact neon accent" and no glyph — which is why this
> scenario checks a dot on the chip. The requirement text is not amended, because narrowing it would
> be a weakening.
>
> (b) **R1's saturated-fill ink parenthetical is now amended, and the correction is the shipped
> black text.** R1 permits `#090A10` as "the ink on a high-saturation filled button" and then listed
> the `#FFFFFF` sites in a parenthetical as "wheel sector labels, primary button labels". On disk it is
> the other way round: the filled primary button label is `var(--ink)`, i.e. `#090a10`
> (`frontend/index.html:20` and `.btn`'s `color` at `:103`), and five of the six sector labels are
> `#090a10`, with only `entretenimiento` on `#FFFFFF` — `ACCENT_BY_NAME` at `:385–392`, resolved
> through `on: (ACCENT_BY_NAME[name] || {}).on || INK` at `:479` and written by
> `label.style.color = cat.on` at `:544`. The parenthetical is therefore **narrowed in the
> requirement text** to the single white site, and R1's operative clause is untouched: it is a
> prohibition, neither hex as canvas or body text, and the code does not violate it. The earlier
> revision declined to amend that parenthetical and escalated it here instead; that was over-caution
> in one direction and wrong in another, because leaving an enumeration that the file contradicts
> invites a reviewer to "fix" correct code. **Amending it is a clarification, not a weakening** — the
> requirement still forbids both hexes as canvas and body text, and it still names `#090A10` as the
> ink on a high-saturation fill.
>
> **Why the shipped black text is the design-conformant reading, not a deviation.**
> `stitch/DESIGN.md:212` sets out two button treatments: "Solid high-contrast white `#FFFFFF` text
> against a filled category-colored background" as the general primary case, and "For high-impact
> triggers (e.g., "Ready", "Submit"), use a high-saturation fill with black text (`#090A10`) for sheer
> visual dominance" as the accent case. This game's primary trigger is the start and spin control —
> a high-saturation cyan-to-green gradient fill — and every sector label sits on a fully saturated
> category hex, so both are the second case, not the first. The source comment above the palette
> says the same thing and is verified rather than trusted: "the dark ink carries every hue except the
> entertainment violet" (`:383–384`), which matches `entretenimiento` being the lone `#FFFFFF` entry at
> `:391`. The one judgment a reviewer may still reopen is whether the **start/spin** button counts as
> a "high-impact trigger" — the design gives "Ready" and "Submit" as examples, and this project's
> equivalents are "Empezar" and "Girar" — but R1's text does not require the mapping, and inventing a
> per-button obligation is not this delta's business.
>
> **The contradictory source comment is closed, and the task is retired.** An earlier revision of
> this delta carried an open `dev` task for a comment above `GLYPH_BY_NAME` that asserted the old
> behaviour, and pointed here for the write-up. The comment now reads as the code behaves —
> "The wheel hands the label the category's contrast ink rather than its accent, because the sector
> behind it is already that accent and an accent-on-accent glyph would disappear"
> (`frontend/index.html:383–384`). Nothing is owed, and the comment is verified against the
> `label.style.color = cat.on` assignment at `:544` rather than taken on trust. Both citations were
> wrong in the earlier revision of this note (`:391–393` and `:543`) and are corrected here, because
> a "verified against" claim whose pointer misses is worse than one with no pointer at all.

### Requirement: The wheel is derived from the live category list, and its sector maths is testable

The wheel's sectors, colours, labels, and icons SHALL be built at runtime from the categories the API
returns, or from the fallback list when that request fails. The neon treatment SHALL be applied to
that **derived** wheel. A static, hardcoded six-sector wheel SHALL NOT replace it.

The rotation→sector computation SHALL be reachable as **DOM-free pure functions**: one that returns the
rotation delta needed to bring a chosen sector under the pointer, and one that returns the sector
index under the pointer for a given rotation. Neither SHALL read or write the DOM, and both SHALL take
the sector count as an argument rather than reading a global.

#### Scenario: The named category, the sector under the pointer, and the requested category are the same

- **GIVEN** a loaded game with six categories
- **WHEN** the wheel is spun to each of the six categories in turn, from at least seven different
  prior rotation values
- **THEN** for every one of those spins the sector under the pointer, the category named on screen,
  and the category whose questions are then requested are the same
- **AND** this holds for all 6 targets across 7 prior rotations, which is 42 of 42 pairs

*Provenance: `[IMPL]` — the derived wheel in `buildWheel` at `frontend/index.html:529–548`, the
`FALLBACK` table at `426–433`, the index pick at `613` and the delta at `616`. `[PRESERVE]` —
`openspec/project.md` requires the frontend to handle an unavailable category request without
crashing. This is the criterion that covers the failure mode the mockup would introduce:
`stitch/code.html:238–308` hardcodes six sectors
into SVG and `472–479` reorders its JS array, so pasting that markup while keeping array-indexed
selection names a different category than the pointer shows in **every** sector — index 0 names
`ciencia` while the pointer shows `historia`, and so on for all six, which is 0 of 6 sectors bound.*

> Correction, measured against the real script. An earlier revision of this note claimed the failure
> measured "0 of 42" at the level of a pure rotation check. That was wrong about the layer, not the
> number. Both the implementation and an independent oracle read the **same** `categories` array, so
> the array's order cancels out and the rotation check reports **42 of 42** for the live order *and* for
> the mockup's reordered array. A rotation-only check therefore cannot catch this scenario and must
> not be cited as its guard. The discriminating measurement binds the **rendered** sector geometry to
> the array-indexed selection: 6 of 6 for a derived wheel, 0 of 6 for the mockup's static SVG. The
> rotation check stays as a regression guard on the maths; the rendered-geometry binding is what
> verifies this scenario.
>
> **That binding is now specified as a machine check, `AT-2b`, and it is specified here because
> nothing enforced the sentence above until this amendment.** Two facts made it necessary rather than
> tidy. First, the only check in the plan that reads rendered geometry is `SM-21`, and **as written it
> cannot run**: its Layer 1 snippet calls `ACCENT[c.name]`, and the page exports no `ACCENT` — it
> exports `ACCENT_BY_NAME` and `getAccent`. The snippet throws `ReferenceError` before it reaches its
> first assertion, so the highest-value guard on this change was neither run nor runnable. Second, the
> guard this scenario had been leaning on was **proved by mutation not to guard it**: rendering the
> sector labels in the mockup's hardcoded order, and hardcoding the gradient stops in that order, each
> leave the 42-pair check at **42/42 PASS** while the rendered binding drops to **0 of 6** on the
> mutated layer. `qa-manager` owns the identifier fix in `SM-21`; `dev` owns landing `AT-2b` beside
> `AT-2`, per `tasks.md`.
>
> **`AT-2b`, specified so `dev` implements it without designing it.** It is the `tasks.md` 1.4 sandbox
> with one addition and three layers of assertions; there is no new harness, no new file, and no
> framework, and the file it reads is the shipped `frontend/index.html`.
>
> - **Stub addition, the only change to the harness.** The element stub's `createElement` and
>   `getElementById` must return elements that *record* what the script writes to them — `style` as an
>   object whose `setProperty` and property assignments are stored, `textContent`/`innerHTML` as stored
>   strings, and `appendChild` that pushes onto a per-parent `children` list — and `getElementById`
>   must return the **same** object each time for a given id, so the node the script appends to and
>   the node the assertions read are one node. Everything else in the stub stays as it is: the callable
>   no-op for unknown keys, the two-tick `setImmediate` wait, the getter epilogue, and the rule about
>   not installing a swallowing `unhandledRejection` handler. The one recording fact required is that
>   `#wheel`'s `style.background` holds the `conic-gradient(...)` string, and that `#wheel` has **6**
>   children carrying `wheel-divider` and **6** carrying `seg-label`.
> - **The oracle side must be the harness's own arithmetic, never the script's.** For `n = 6` the
>   harness computes `span = 360 / n`, the centre angle `i * span + 180 / n`, the divider rotation
>   `i * span + 180`, and the label text expected at index `i`. Those three formulas are not guesses:
>   `sectorCenterAngle` is literally `sectorIndex * 360 / sectorCount + 180 / sectorCount` (`:488–490`)
>   and the divider is `i * span + 180` (`:537`), so the harness reproduces the intended geometry from
>   the written rule instead of reading it back out of the function under test. It must **not** call
>   `sectorCenterAngle`, `rotationDeltaForSector`, or `sectorUnderPointer`: reusing them would make the
>   check circular in exactly the way `AT-2`'s independent oracle exists to avoid. The category list
>   itself is read through the existing `getCategories()` **getter** after the chain has settled, and
>   each expected accent is read through the existing `getAccent(name)` accessor (`:456–459`), so the
>   assertion is against the live name-keyed lookup rather than a table typed into the harness.
> - **Layer 1 — gradient stops to names, 6 of 6.** Parse the six stops out of `#wheel`'s recorded
>   `background`, which is one `conic-gradient(...)` string of the form
>   `` `${c.fill} ${i*span}deg ${(i+1)*span}deg` `` joined with commas (`buildWheel`, `:533`). For
>   each `i`, the stop covering `[i*span, (i+1)*span)` must equal `getAccent(categories[i].name)`,
>   compared as an `r, g, b` triple with alpha — and it will, because the mapper builds
>   `fill: toRgba(getAccent(name), 1)` (`:473`, `:478`), so the harness may compare either side
>   directly. **6/6 or fail.**
> - **Layer 2 — label centres to indices, 6 of 6.** The `i`-th recorded `.seg-label` in document order
>   must carry `--a` equal to the harness's own centre angle for `i`. The text is **not** on the label
>   node: `buildWheel` sets `label.innerHTML` to `<span class="ic">…</span><span class="lb">…</span>`
>   (`:545`), so the stub must record `innerHTML` and the assertion reads the text inside the `.lb`
>   span, which must equal `categories[i].label`. **6/6 or fail.**
> - **Layer 3 — dividers to indices, 6 of 6.** `buildWheel` writes
>   `divider.style.transform = \`rotate(${i*span + 180}deg)\`` (`:537`), so the `i`-th recorded
>   `.wheel-divider` must carry exactly that string. **6/6 or fail.**
> - **Controls, in this order, and all three abort on failure.** (a) **Non-empty first:** the
>   recorded wheel must hold exactly 6 categories, 6 dividers, 6 labels and 6 stops; until all four
>   hold, report `CONTROL FAILED` and exit non-zero, because a check that enumerates nothing passes by
>   enumerating nothing. (b) **Run both paths**, the `/categories` payload and the rejecting `fetch`
>   that exercises `FALLBACK`, since R4 requires the derived wheel on either; 6/6 on each. (c) **A
>   layer that cannot be read counts as a failure, not a skip** — the same rule R1's glass scenario
>   states for the `inset` keyword, because a guard that gives up is a guard that cannot fail.
> - **Two negative controls, and both must go red.** A copy of the file whose `buildWheel` renders the
>   labels in `stitch/code.html`'s order must fail **Layer 2** at 0/6; a copy whose gradient stops are
>   hardcoded in that same order must fail **Layer 1** at 0/6. Either control coming back green means
>   the check has no teeth, and the change is not done.
> - **What it still cannot do, stated so no one over-reads it.** It asserts what the code *wrote* into
>   the DOM under a stub. It does not observe layout, compositing, or appearance, because no agent in
>   this fleet can read an image and no browser runs in it. It therefore **complements** `SM-21` and
>   does not replace it, and the human eyeball at Gate C remains the only instrument for appearance.
>   `SM-21` stays in the demo path for the opposite reason: a browser runs for years, a stub does not.

#### Scenario: An unavailable category request still yields a playable wheel

- **GIVEN** `GET /categories` fails or returns a non-array or an empty array
- **WHEN** the wheel screen is reached
- **THEN** the wheel renders six sectors from the fallback list, each with a label, an icon, and an
  accent
- **AND** the page does not throw, and a spin still selects a category and loads a question

*Provenance: `[PRESERVE]` — `openspec/project.md`: "the frontend must handle an unavailable category
request without crashing the page". `[IMPL]` — `.catch` branch at `frontend/index.html:518`.*

#### Scenario: An unavailable question request does not crash the page

- **GIVEN** a selected category whose `GET /questions/category/{name}?limit=200` request fails
- **WHEN** the response is handled
- **THEN** the page remains interactive and the match advances to the next turn

*Provenance: `[PRESERVE]` — same `project.md` rule. `[IMPL]` — `pickQuestionAsync` at
`frontend/index.html:638–650`, empty cache then `quiz()` returns null then `nextTurn()` (`646–647`).*

#### Scenario: The wheel settles with the pointer over the selected sector

- **GIVEN** the wheel screen
- **WHEN** a spin completes
- **THEN** the wheel's transition duration and the timeout that advances the game are both between
  `3.5s` and `4.5s`, and within `300ms` of each other
- **AND** the pointer at the top of the wheel rests over the sector whose category is then named

*Provenance: `[DESIGN]` — the export's `duration-[4000ms] cubic-bezier` at `stitch/code.html:201` and
its `setTimeout(..., 4000)` at 521. `[IMPL]` — the current `4.2s` transition and `4300` timeout at
`frontend/index.html:376, 377`. Measurable: the duration band, and the coupling window.*

### Requirement: Correct, incorrect, and timed-out feedback are three distinct visible states

Answering SHALL produce visible feedback in one of three states, each visually distinct from the
other two at a glance:

- **Correct** — accent `#05FFA1` on a `20%` alpha tint, per `DESIGN.md`.
- **Incorrect** — accent `#FF2A6D` on a `20%` alpha tint, per `DESIGN.md`.
- **Timed out** — `[AUTHORED]`. `DESIGN.md` defines the first two and a timer-urgency hue, but no
  timed-out *state*. It SHALL use the design's own third functional hue, `#FFD000`, on a `20%` alpha
  tint with a `1px` `#FFD000` border at `40%` alpha, and its text on `#e3e1eb` at full contrast. It
  SHALL NOT reuse `#FF2A6D`, which the design assigns specifically to *failure/incorrect* — a timeout
  is not a wrong answer, and sharing the hue would make the two states indistinguishable. It SHALL
  NOT reuse `#05FFA1`, which means a point was scored.

On a timeout the correct answer SHALL still be revealed, as it is on any other answer. The
`#FFD000` feedback strip and the `#05FFA1` revealed option therefore appear together and SHALL remain
distinguishable from each other.

#### Scenario: The three states are visibly different from each other

- **GIVEN** three separate questions in one match
- **WHEN** the first is answered correctly, the second is answered incorrectly, and the third is
  allowed to time out
- **THEN** each produces a distinct visible treatment: `#05FFA1`, `#FF2A6D`, and `#FFD000`
- **AND** a player shown only the third state identifies it as a timeout rather than a wrong answer

*Provenance: `[DESIGN]` § Functional Feedback States for correct and incorrect. `[PRESERVE]` —
`openspec/project.md` requires visible feedback for correct, incorrect, **and timed-out** answers.
`[AUTHORED]` — the timeout treatment itself; no design source specifies one.*

#### Scenario: A timeout reveals the correct answer without scoring

- **GIVEN** the 20 seconds elapse with no answer selected
- **WHEN** the timeout is handled
- **THEN** the option matching the stored answer is marked correct and visible as such
- **AND** the active player's score is unchanged
- **AND** the feedback strip states the time ran out

*Provenance: `[IMPL]` — the `onTimeout` path at `frontend/index.html:743` calls `finishQuestion` at
722, which marks the stored answer `right` at 728, and the existing message at 760. `[PRESERVE]` — a
timeout adds zero points.*

#### Scenario: A point is awarded only for the stored answer

- **GIVEN** any question
- **WHEN** any option other than the one whose text equals the stored answer is selected
- **THEN** no point is added to either player's score
- **AND** when the stored answer is selected, exactly one point is added

*Provenance: `[PRESERVE]` — `openspec/project.md`: "never award a point for an answer different from
the stored answer".*

### Requirement: Timer module

The countdown SHALL run for `20` seconds and SHALL NOT become configurable. The bar's transition
duration and the timeout that fires the timed-out state SHALL derive from the same single constant, so
a restyle cannot desynchronize the bar from the outcome. The bar SHALL shift to `#FF2A6D` when less
than **20%** of the countdown remains, expressed as a proportion of the timer rather than as an
absolute number of seconds.

> `[AUTHORED]` Resolution of a conflict inside `DESIGN.md`: § Functional Feedback States says
> "under 5 seconds", § Dynamic Linear & Radial Timers says "less than 20% of the countdown remains".
> The proportional rule governs, because it survives a change to `TIMER_SECONDS` while an absolute
> figure silently disagrees with it. On a 20-second timer the two readings differ by one second.

#### Scenario: The bar and the outcome stay synchronized

- **GIVEN** a freshly rendered question
- **WHEN** the bar's transition duration and the scheduled timeout are both read
- **THEN** both derive from the same constant, both equal `20s`, and the bar reaches empty at the
  moment the timed-out state fires
- **AND** no second value for the turn duration appears anywhere in the presentation

*Provenance: `[IMPL]` — both already derive from `TIMER_SECONDS` at `frontend/index.html:372, 374`;
this requirement keeps them coupled through a restyle. `[DESIGN]` for the 20% urgency threshold.
Measurable: the two durations are equal, and 20% of 20s is `4s`.*

### Requirement: Fixed single-screen shell

The game SHALL remain a single non-scrolling screen. `body` SHALL keep `overflow: hidden` and the
panel container SHALL keep `position: fixed; inset: 0`. Exactly four panels SHALL exist, with the ids
`screen-start`, `screen-wheel`, `screen-question`, and `screen-winner`, and the existing
`show(id)` mechanism that activates one by class SHALL continue to switch between them.

The scrolling three-column dashboard layout and the footer of `stitch/code.html` SHALL NOT be adopted.

> Decision, not an open question. Recorded in `proposal.md`.

#### Scenario: Four panels, one visible, no scrolling

- **GIVEN** the game at any moment
- **WHEN** the visible panel is identified
- **THEN** exactly one element with class `panel active` exists
- **AND** its id is one of the four above
- **AND** the document does not scroll at viewport heights from `320px` to `1200px`

*Provenance: `[IMPL]` — `body { overflow: hidden }` at `frontend/index.html:70`, `.panel` at 82,
the four `id`s at 313/332/344/361, and `show` at 753. `[DESIGN]` for the rejected layout.*

#### Scenario: Dead decorative markup is gone

- **GIVEN** the served document
- **WHEN** the DOM is searched for `.cloud`, `.sun`, `.mountain`, `.ground`, and `.tree`
- **THEN** zero elements match
- **AND** no stylesheet rule targets any of those five class names
- **AND** the `drift` keyframes and every `animation` declaration that referenced them are gone

*Provenance: `[IMPL]` — the markup at `frontend/index.html:156–165` and the CSS at 29–53, which sit
behind four fixed panels and are never visible. The `drift` keyframes are named here as well as in
`tasks.md` 4.6, because the keyframes outlive the elements that animated them: removing the five
class names alone leaves an orphaned keyframe block behind.*

### Requirement: No external requests

The served document SHALL make **zero** requests to any host other than the local API. It SHALL
declare no external stylesheet, no webfont, no icon font, no CDN script, and no remote image. The
presentation SHALL add no `fetch` beyond the three the frontend already makes:
`GET /categories`, `GET /questions/category/{name}?limit=200`, and — declared in `project.md`, though
not currently called by the game — `GET /categories/stats`.

> Decision 1. `stitch/code.html` is a reference for tokens and geometry only; it carries
> `cdn.tailwindcss.com`, three Google Fonts links, an inlined `tailwind.config` blob, a
> `<meta content="web_standard" name="shell-type"/>` artifact, and two `lh3.googleusercontent.com`
> avatars. None of that ships.

#### Scenario: The document is fully self-contained

- **GIVEN** the served document
- **WHEN** every `src`, `href`, `url()`, `@import`, and `background-image` reference is collected
- **THEN** every one is either absent or a fragment/data URI
- **AND** the network panel records no request to any host other than the local API, over a full match
  from the name screen to the winner screen

*Provenance: decision 1. `[IMPL]` — the current document has no external references at all; this
requirement holds that line while adding a designed look. Measurable: zero non-local requests.*

### Requirement: Type pairing is preserved without webfonts

The two type **roles** SHALL be preserved: a geometric sans for structural text, and a monospace for
data readouts — scores, category tags, turn chips, the `A`/`B`/`C`/`D` index markers, and the wheel
sector labels. Both SHALL be realized from system font stacks, since the design's `Outfit` and
`Space Mono` are Google Fonts and therefore external requests.

The turn timer is not one of those roles. It is a pure graphic with no text node, so no
`font-family` governs any glyph inside it; the seconds it has left are published to assistive
technology on the `role="progressbar"` element's `aria-valuenow`, and its urgency is carried by the
bar's remaining width and its phase colour. **No numeric countdown SHALL be added to the question
screen**, and the mockup's fixed `TIEMPO DE TURNO: 00:45` clock stays out — `proposal.md`,
§ Out of scope.

Letter-spacing SHALL follow the design: `-0.02em` to `-0.03em` on display sizes, `0.05em` to `0.1em`
on uppercase labels. The primary question text SHALL NOT render below `18px` on mobile.

> `[AUTHORED]` The substitution is acceptable because the design's stated reason for `Space Mono` is
> "to eliminate optical shifting during dynamic countdown ticks" — a role any monospace stack fills,
> since the property that matters is the fixed advance width, not the typeface.

> `[AUTHORED]` The timer is struck from the monospace role list, and a reviewer may reopen it. The
> design contradicts itself here. § Typography places "data readouts, **timers**, point allocations"
> in `Space Mono` and justifies it as eliminating "optical shifting during dynamic countdown ticks",
> which presupposes ticking digits. § Dynamic Linear & Radial Timers — the section that actually
> specifies the timer module — describes "the track" and "the active bar" and no digits at all. The
> component section governs, being the more specific of the two, and R6 already realizes it: the
> countdown is a `0.5rem` capsule track whose inner bar animates `width` from `100%` to `0%`
> (`frontend/index.html:228–238`, `:652–670`). A bar that draws no glyph has nothing for a typeface
> to govern, so the earlier demand to read a computed `font-family` off the timer was **unsatisfiable**
> rather than merely unmet, and a tester following it would have recorded a failure for a correct
> file. Satisfying it would have required inventing exactly the numeric readout the proposal excludes.
> Removing it changes no rendered pixel and weakens no behaviour; what it removes is a criterion that
> could only be met by breaking the proposal's out-of-scope list. `dev` may reopen this: if a visible
> countdown is ever wanted, that is a product decision and a new requirement, not a styling fix.

#### Scenario: Readouts are monospaced and the question never drops below 18px

- **GIVEN** the question screen at a `320px` viewport width
- **WHEN** the computed `font-family` is read on the score readout (`.spoints`), the category tag
  (`.q-cat`), the turn chip (`.q-player`), the option index markers (`.opt .letra`), and the wheel
  sector labels (`.seg-label .lb`), and the computed `font-size` of the question text is read
- **THEN** all five readouts resolve to one and the same family string, that string is not the
  `font-family` computed on `body`, and the winner screen's score readout (`.wscore`) resolves to the
  same one
- **AND** the question text computes to at least `18px`
- **AND** the option index markers are the letters `A`, `B`, `C`, and `D` in that order of the shuffled
  set
- **AND** the timer carries no text node, and the seconds remaining are published on `#q-timer`'s
  `aria-valuenow`

*Provenance: `[DESIGN]` § Typography, including the 18px mobile floor and the monospace-for-readouts
rule, and § Dynamic Linear & Radial Timers for the timer as a track-and-bar module. `[IMPL]` — the
current `.question-text` floor is `clamp(17px, 4.5vw, 24px)`, which is **below** the design's own
floor; this requirement raises it. `[AUTHORED]` — the timer's removal from the role list, per the note
above. Measurable: five `font-family` reads plus one on the winner screen, their agreement with each
other and their difference from `body`, one `font-size` read taken at `320px` and not at desktop
width, and the absence of a text node under `#q-timer`.*

### Requirement: Answer option cards carry an index tag and a category chip

Each option SHALL render as a glass card with a monospaced `A`/`B`/`C`/`D` index tag in an inset pill,
low radius, and no drop shadow. While the turn is still open, hovering or keyboard-focusing the card
SHALL take its border to the active category's accent and SHALL apply the design's focused/selected
glow in that same accent as **two** layers, both with zero `x` and `y` offset: an **outer** bloom and
an **`inset`** layer at `15%` alpha. This is the design's focused/selected treatment; it introduces
**no selected-but-unresolved state**, and on the click itself the border becomes the correct or
incorrect feedback hue rather than the category accent. The question screen SHALL render a category
chip in uppercase monospace with a glowing dot in the category's accent.

> `[AUTHORED]` "Selection" is **relocated, not added**, and a reviewer may reopen it. `DESIGN.md`
> § Elevation & Depth names **one** treatment, "Focused/Selected Answer", and § Answer Option Cards
> says "On selection, the border shifts to the active category's hex code, accompanied by a targeted
> `0 0 16px` neon glow". The game has no interval in which a card is selected but unresolved: a click
> calls `finishQuestion`, which sets `answered = true`, disables every option, and writes `right` or
> `wrong` in the same frame (`frontend/index.html:722–741`). An accent border written at click time is
> overwritten before it can be seen, so the earlier wording — "On selection the card's border SHALL
> take the active category's accent" — demanded a frame the interaction model does not have, and the
> card that receives the click legitimately shows a **feedback** hue instead. `openspec/project.md`
> describes no answer-confirmation delay, and inventing one would change interaction timing and add
> behaviour nobody asked for, so **a lock delay is not authorized here**. If a human wants a genuine
> selected-but-unresolved state, that is a product decision with its own requirement; it is flagged
> for Gate C rather than settled in this delta.
>
> **Why both hover and focus, and not focus alone.** The design pairs the two in a single label, and
> the instrument has to be reachable from the primary input device: Chromium does not match
> `:focus-visible` on a mouse click, so a focus-only requirement would be invisible to a mouse player
> and would fail a mouse-driven test for the right reason. Both selectors are therefore named
> explicitly — `.opt:hover:not(:disabled)` and `.opt:focus-visible` — and both are pre-lock, so
> neither creates the deferred state this note withdraws.
>
> **The glow radius is deliberately not pinned, while the layer count and the inset's alpha are.**
> § Answer Option Cards says `0 0 16px` and § Elevation & Depth says `0 0 20px`; the design disagrees
> with itself about the outer radius and this delta does not pick a side. R1 already constrains the
> shape — zero `x` and `y` offset — and the correct and incorrect treatments in the code use
> `1.25rem`, so both radii are left for a later change to settle rather than invented here. The two
> points the design does **not** hedge are therefore pinned instead, and they are the ones the
> previous wording had collapsed into a single unnamed "glow": that the treatment is a **pair** of
> layers, outer plus `inset`, and that the `inset` sits at `15%` alpha
> (`box-shadow: 0 0 20px rgba(var(--neon-rgb), 0.35), inset 0 0 12px rgba(var(--neon-rgb), 0.15)`,
> `stitch/DESIGN.md:192`). Requiring one layer would have been a weakening chosen to fit the file,
> which is the opposite of what this note exists to prevent.
>
> **`[IMPL]` — both halves are closed, and the `dev` task that owed the second is retired.** The
> earlier revision of this note recorded two defects in the file: `.opt:hover:not(:disabled)` raised
> only the stroke to `--stroke-strong` and added no glow, and `.opt:focus-visible` hard-coded
> `var(--geografia)` and a literal `rgba(0, 240, 255, 0.35)`. `[QA]` Finding 10 confirms both were
> real when written and both are now fixed, and it independently reached the same conclusion from the
> other side — that the note was "describing a state the file is not in, and a reviewer who reads the
> delta and then the stylesheet will conclude the change is half-done" — leaving the correction to the
> architect, which is the note you are reading. **The two quoted defect descriptions above are kept
> verbatim and must not be tidied away:** SM-17's negative case in `test-plan.md` is built on that
> pre-fix rule text, so the rewrite is what keeps that check discriminating. The note is rewritten
> rather than deleted for the same reason — a stale `[IMPL]` claim here would lead a reviewer to
> conclude the change is half-done when it is not.
>
> - **The accent half, closed.** Both rules read `border-color: var(--accent)` with the outer bloom
>   drawn from `var(--accent-glow)` (`frontend/index.html:270–271`), and `renderQuestion` publishes
>   `--accent`, `--accent-soft`, `--accent-glow` and `--accent-glow-inset` on `#screen-question` at
>   `:686–689`, with `--accent-glow` defaulting to `rgba(0, 240, 255, 0.35)` at `:33` and
>   re-derived per category at `:688`.
> - **The `inset` half, also closed — this paragraph is the correction.** The previous revision of
>   this note stated that both rules "currently carry a single outer layer" and that "`dev` adds the
>   `inset` layer to both rules". On the frozen file that is **false**: `--accent-glow-inset:
>   rgba(0, 240, 255, 0.15)` is declared at `:34`, hover carries `inset 0 0 12px
>   var(--accent-glow-inset)` at `:270` and focus-visible the same at `:271`, and the token is
>   re-derived per category at `:689`. So the `15%` alpha the requirement pins, the `12px` blur it
>   names, and the second layer it counts are all present, and **nothing is owed**. The gap was real
>   when the note was written and has since been closed in the file; the note outlived the gap.
> - **The one thing left deliberately alone, as before.** The focus rule's `1px` accent ring is a
>   third, non-design layer (`:271`, `0 0 0 1px var(--accent)`) that this delta neither requires nor
>   forbids, and the correct/incorrect treatments at `:280` and `:282` carry a single outer layer by
>   design, since they are post-click **feedback** rather than the focused/selected treatment this
>   requirement governs. Adding an `inset` there is out of scope, and a tester who expects one is
>   reading this requirement too widely.
> - **What this makes load-bearing.** Because the `inset` layer is genuinely present, the `inset`
>   keyword reading in R1's glass scenario (a naive offset parse that reads `inset 0 0 12px` as
>   `x = inset` fails the requirement) is now exercised by real declarations rather than only by the
>   scenario's worked example. That reading is the reason a regex-based auditor must be given the
>   layer list, not a substring search.
>
> **Two places the file diverges from the design, and why neither is pinned here.** These were the
> other two of the three open decisions in this pass. Both are recorded in `proposal.md` as accepted
> divergences rather than written into a requirement, and the asymmetry with `.turn-chip` above is
> deliberate: `.turn-chip` sat inside a value R1 had already fixed, so the exception needed a sentence
> in the spec to stop it reading as a defect; these two sit in values **no requirement of this delta
> governs**, so pinning them would mean inventing a new obligation to match the file, which is the
> move this pass exists to prevent.
>
> - **`.opt .letra`, the index tag, is opaque where the design says inset-translucent.**
>   `stitch/DESIGN.md:204` calls for the tag "encased in a `rgba(255, 255, 255, 0.05)` **inset** pill
>   with active color mirroring". Shipped, it is `background: var(--surface-high)` — `#292930`, fully
>   opaque (`frontend/index.html:15`, used at `:277`) — with no `rgba(255,255,255,0.05)` fill and no
>   `inset` anywhere in the rule (`:273–279`). It still satisfies what R10's operative text requires
>   ("a monospaced `A`/`B`/`C`/`D` index tag in an inset pill, low radius, and no drop shadow") in the
>   sense that matters here — it is a monospaced `A`–`D` tag, low radius, no drop shadow — but the
>   word "inset" in that sentence is doing no work the file supports, and **that is a defect in the
>   sentence, not only in the CSS.** The honest reading is that the design's "inset" describes a
>   recessed treatment, and the shipped opaque fill is a flat treatment; the requirement is not
>   weakened to bless the flat fill, and no change is owed by `dev` under this delta. Both the
>   divergence and the loose wording are handed to the human in `proposal.md`, where the choice is
>   between amending the sentence and changing the CSS.
> - **`.q-cat`, the category chip, is full-alpha and unfilled where the design says `40%` and `0.03`.**
>   `stitch/DESIGN.md:209` specifies the chip's "Surface" as `rgba(255, 255, 255, 0.03)` "with a `1px`
>   solid border colored directly by the category neon token at **40% alpha**", plus "a leading 6px
>   glowing geometric dot of the exact neon accent". Shipped, `.q-cat` declares **no background at
>   all** and `border: 1px solid var(--accent)` at full alpha (`frontend/index.html:241–248`). The
>   design's dot clause, by contrast, **is** met: `.q-cat .dot` is `0.375rem` square — which is
>   exactly the design's "leading 6px" at the default `16px` root — with `border-radius: var(--r-pill)`
>   and a `0 0 0.5rem var(--accent)` glow at `:248`. So the chip conforms on its dot and on its
>   radius (`--r-md`, `0.375rem`, at `:243`), and diverges only on the fill and the border alpha.
>   Nothing in this delta requires either, so nothing here is pinned; the divergence is in
>   `proposal.md`.

#### Scenario: The index tag is always A, B, C, or D and never an ordinal

- **GIVEN** any question, at any viewport, with its turn still open
- **WHEN** the four option cards are rendered; then one card is hovered, then another is
  keyboard-focused, and then one card is clicked
- **THEN** their index tags are exactly `A`, `B`, `C`, and `D`, one each
- **AND** the letters follow the shuffled presentation order, not the stored `option_a`…`option_d`
  order
- **AND** the category chip names the selected category and carries its accent
- **AND** while the turn is open, hovering an option card and keyboard-focusing an option card each
  give that card a `border-color` equal to the active category's accent, and a `box-shadow` carrying
  **two** layers whose colours both derive from that accent and whose `x` and `y` offsets are both
  `0` on every layer — an **outer** bloom and an **`inset`** layer, and the `inset` one is at `15%`
  alpha of that accent, with both blur radii deliberately unpinned
- **AND** no option card ever carries a `selected` class, and once a card has resolved its border is
  `#05FFA1` or `#FF2A6D` rather than the category accent

*Provenance: `[DESIGN]` § Answer Option Cards and § Category Chips & Badges, with § Elevation &
Depth for the two-layer `Focused/Selected Answer` shadow. **The `0.375rem` in this line's earlier
revision was misattributed, and is corrected here**: `stitch/DESIGN.md:202` gives `0.375rem` as the
**card's** corner radius — "a `1px` border of `rgba(255, 255, 255, 0.08)`, and `0.375rem` corner
radius" — and the shipped card honours it exactly, reading `var(--r-md)` at
`frontend/index.html:264`. The **index tag** is a different element and a different sentence:
`stitch/DESIGN.md:204` describes it as "a fixed monospaced letter prefix (`A`, `B`, `C`, `D`) encased
in a `rgba(255, 255, 255, 0.05)` inset pill with active color mirroring", and specifies no radius of
its own. The shipped `.letra` uses `var(--r-sm)`, i.e. `0.25rem` (`:46`, used at `:276`), which
satisfies § Shape Philosophy's `0.25rem` to `0.5rem` band (`stitch/DESIGN.md:197`) and R1's closed
radius set. The tag's fill and its `inset` treatment are **not** what the design describes, and that
divergence is recorded in `proposal.md` rather than pinned here, per the note below. `[IMPL]` — the
existing shuffle-and-tag at `frontend/index.html:699–713`, which already emits `A`–`D` after
shuffling; this requirement makes it checkable. The earlier revision cited `:381–390` for this, which
on the frozen file is `NEUTRAL_ACCENT` and `ACCENT_BY_NAME`, not the tag. `[AUTHORED]` — the
pre-lock affordance, per the note above, which added the hover/focus clause and the no-`selected`-class
clause that R10's state-change sentence previously lacked; this amendment added the two-layer
requirement inside that same hover/focus clause. The **scenario title was left as it is** even though it
now names only the index-tag clause: the `S19` key in `test-plan.md` § 6 resolves by position, and
retitling for a third time would force a re-map for no gain. A later change may retitle it. Measurable:
the four index tags, the chip's accent, the `border-color` and `box-shadow` readings under both
selectors including the layer count and the `inset` layer's alpha, and a `document.querySelectorAll`
for `.opt.selected` that must return zero.*

### Requirement: Responsive behavior at the design's breakpoints, and the wheel's compact tier

The presentation SHALL respond at `768px` and `1024px`, replacing the current single `420px` breakpoint.
Below `768px` the answer options SHALL stack vertically with `0.75rem` between them. Between `768px`
and `1024px` they SHALL form a 2×2 grid. Above `1024px` the gameplay hub SHALL cap at `840px` of
width.

Those two are the design's breakpoints and the only two `DESIGN.md` fixes. A third, **compact** tier
SHALL apply at `640px` and below, and it SHALL touch the wheel and its sector labels only: the wheel's
own size SHALL shrink, each label's radial offset SHALL pull inward, the label box SHALL narrow, and
the label's icon and type SHALL reduce, so that **no sector label box crosses the wheel's rim** at any
viewport width down to `320px`. Deleting the tier reintroduces that overflow, so it is authorized here
rather than left as an undeclared rule in the stylesheet.

> `[AUTHORED]` The compact tier is the architect's own decision, and `640px` is the architect's own
> number. `DESIGN.md` § Layout & Spacing fixes `768px` and `1024px` and says nothing about a third
> tier; no stakeholder asked for one, and nothing in `openspec/project.md` requires or forbids it. It
> is here because the default geometry cannot be kept at narrow widths: `.seg-label` is placed at a
> fixed fraction of the wheel size while its box is a fixed `5.75rem` wide, so what decides whether a
> label's corner crosses the rim is the ratio of box to wheel and not either value alone, and that
> ratio inverts below roughly `500px` of viewport width. (Reasoned from the declarations at
> `frontend/index.html:55` and `:195–202`, **not measured in a browser**; the scenario below is where
> the measurement lives.) `640px` is deliberately set above that threshold rather than at it, to leave
> headroom for a longer category label wrapping to more lines than the reference label.
>
> `[AUTHORED]` Consequence, restated so it is checked rather than discovered: raising the stacking
> threshold from `420px` to `768px` means a viewport between `421px` and `767px` now stacks vertically
> where it previously showed a 2×2 grid. That is the design's mobile rule applied honestly. QA must
> exercise a `600px` viewport, where the option grid has no rule of its own — it stacks under the
> `768px` rule — while the `640px` compact tier is also in force, so that one width exercises both.

#### Scenario: The option grid changes shape at the design's breakpoints, and no sector label crosses the wheel

- **GIVEN** the question screen and the wheel screen
- **WHEN** the question screen is viewed at `600px`, `900px`, and `1280px` of viewport width
- **THEN** at `600px` the four options are in a single column
- **AND** at `900px` and at `1280px` they are in two columns of two
- **AND** at `1280px` the gameplay hub does not exceed `840px` of width
- **AND** the stylesheet declares `768px` and `1024px`, declares no `420px`, and declares exactly one
  further breakpoint, `640px`, whose effect is confined to the wheel and its sector labels
- **AND** the wheel screen is viewed at `320px` and at `639px` of viewport width
- **AND** at both of those widths the bounding rectangle of each of the six `.seg-label` elements is
  contained within the wheel's bounding rectangle, with no clipping and no horizontal document overflow
- **AND** at `641px` and above, each sector label's radial offset is the default fraction of the wheel
  size and its box is at its full width

*Provenance: `[DESIGN]` § Layout & Spacing for `768px`, `1024px`, the `840px` cap, and the option
grid. `[IMPL]` — the baseline's single breakpoint is `@media (max-width: 420px)`, replaced by this
change; the compact tier, as implemented, is `@media (max-width: 640px)` at `:302–309` of the same
file, and it overrides exactly two declarations, the default `--wheel-size` at `:55` (consumed at
`:165` and `:198`, and overridden at `:305`) and the default `--seg-r` at `:198` (consumed at `:202`
and overridden at `:306`), which is what confines it to the wheel. `[AUTHORED]` — the tier itself and
the `640px` threshold; see the requirement's note. Measurable: the three viewport widths, the `840px`
cap, the declared breakpoint set, and rectangle containment at `320px` and `639px`.*

### Requirement: Declared gameplay rules are unchanged

The restyle SHALL NOT change: two players in one browser session; names trimmed, different from each
other, and limited by the existing input controls; the first player chosen randomly; alternating
turns; six wheel segments; a spin selecting a category and four options being presented for 20
seconds; one point for a correct answer and zero for an incorrect answer or a timeout; the first
player to `10` points winning; a question not being reused within a category during the current match;
a rematch returning to the player-name screen and clearing the current game state.

#### Scenario: A full match still plays to a winner under the new theme

- **GIVEN** two different names entered
- **WHEN** a match is played to a first player reaching 10 points
- **THEN** turns alternate, each turn is 20 seconds, scores only ever increase by 1, and the first
  player to 10 wins
- **AND** no question repeats within a category during that match
- **AND** choosing rematch returns to the name screen with both scores reset to 0

*Provenance: `[PRESERVE]` — `openspec/project.md` § Game and API contract and § Conventions. The
twenty-second rule also overrides the mockup's `TIEMPO DE TURNO: 00:45`; the fixed 1 point overrides
`MULTIPLICADOR: x1.5 XP`.*

### Requirement: Document identity is preserved

The served document SHALL keep `lang="es"` and the title `¡Preguntados 1v1!`.

#### Scenario: Language and title are unchanged

- **GIVEN** the served document
- **WHEN** the `lang` attribute of the root element and the document title are read
- **THEN** the language is `es` and the title is exactly `¡Preguntados 1v1!`

*Provenance: `[IMPL]` — `frontend/index.html:2` and `:6`.*

### Requirement: Gameplay behavior survives the restyle

The restyle SHALL NOT change `TIMER_SECONDS`, `WIN_POINTS`, scoring, turn order, question selection,
or the no-reuse-within-category rule; it SHALL add no `fetch` beyond the three already made; it SHALL
change no API route, no database schema, and no Docker Compose contract; and it SHALL add no build
step, bundler, or runtime dependency.

#### Scenario: The API surface and the request count are unchanged

- **GIVEN** a full match played under the new theme
- **WHEN** the network log is inspected
- **THEN** the only paths requested are `/`, `/categories`, and
  `/questions/category/{category_name}?limit=200`
- **AND** `GET /questions/{question_id}` and `GET /categories/stats` are unchanged and still available
- **AND** no route, schema, or Compose file was modified

*Provenance: `[PRESERVE]` — `openspec/project.md` § Service boundaries and § Game and API contract.
Measurable: the request-path set, and the SHA-256 baseline recorded in `test-plan.md` § 3 showing the
ten protected files — `app/main.py`, `app/database.py`, `app/models.py`, `app/categories.py`,
`app/load_data.py`, `app/categorize.py`, `app/human_review.py`, `docker-compose.yml`, `pyproject.toml`,
and `poetry.lock` — byte-identical after the change. `git status` is **not** the instrument for that
claim: every file in this repository is untracked, so it prints the same output whether a file is
untouched or was never committed. It remains a useful read-only containment check for unexpected
paths, and nothing more.*
