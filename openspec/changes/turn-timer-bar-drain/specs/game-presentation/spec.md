# Spec Delta

## MODIFIED Requirements

### Requirement: Timer module

The countdown SHALL run for `20` seconds and SHALL NOT become configurable. The bar's transition
duration and the timeout that fires the timed-out state SHALL derive from the same single constant, so
a restyle cannot desynchronize the bar from the outcome. The bar SHALL be **visible for the whole
countdown** and SHALL drain continuously from full to empty, reaching empty at the moment the
timed-out state fires. The bar SHALL shift to `#FF2A6D` when less than **20%** of the countdown
remains, expressed as a proportion of the timer rather than as an absolute number of seconds; at or
above that threshold the bar SHALL carry the active category's accent colour.

> `[AUTHORED]` The visibility and drain clause is new. The previous wording tied the bar's *duration*
> to the outcome but said nothing about the bar being on screen, so an implementation that rendered it
> at zero width for the entire countdown satisfied every clause it could be checked against. The
> clause is written against the failure rather than the mechanism: what must hold is that the bar is
> visible and empties, not that some particular call is ordered before another.

#### Scenario: The bar and the outcome stay synchronized

- **GIVEN** a freshly rendered question
- **WHEN** the bar's transition duration and the scheduled timeout are both read
- **THEN** both derive from the same constant, both equal `20s`, and the bar reaches empty at the
  moment the timed-out state fires
- **AND** no second value for the turn duration appears anywhere in the presentation

*Provenance: `[IMPL]` — both already derive from `TIMER_SECONDS` at `frontend/index.html:682, 684`;
this requirement keeps them coupled through a restyle. `[DESIGN]` for the 20% urgency threshold.
Measurable: the two durations are equal, and 20% of 20s is `4s`.*

#### Scenario: The bar is visible and drains across the countdown

- **GIVEN** a freshly rendered question
- **WHEN** the question screen becomes visible and the countdown starts
- **THEN** the bar element has a running `width` transition at the moment the screen becomes visible
- **AND** its rendered width decreases monotonically across the countdown and reaches zero at expiry
- **AND** the bar's rendered width is greater than zero at the start of the countdown
- **AND** a copy of the file that arms the clock before the question panel is shown FAILS this
  scenario

*Provenance: `[AUTHORED]`, against a defect measured on the shipped file: zero running transitions
and a `0px` rendered width against a `499.8px` track. Measurable: the transition's presence on the
bar element, and the rendered width sampled across the countdown. The negative control is required —
a check that passes on a file whose bar never drains has no teeth.*

#### Scenario: The bar's colour shifts at the urgency threshold

- **GIVEN** a freshly rendered question
- **WHEN** the remaining proportion of the countdown is at or above 20%, and then again below 20%
- **THEN** the bar's computed background colour is the active category's accent colour at or above
  the threshold
- **AND** it is exactly `rgb(255, 42, 109)` below the threshold
- **AND** the threshold is expressed as a proportion of the timer, so a copy of the file with
  `TIMER_SECONDS` changed to any other value moves the threshold with it
- **AND** a copy of the file that walks a continuous green-to-orange-to-red gradient FAILS this
  scenario

*Provenance: `[DESIGN]` for the `#FF2A6D` urgency hue and the proportional rule; `[AUTHORED]` for the
exact-value clause below the threshold. Measurable: the computed `background` colour of the bar at
both sides of the threshold, compared as an exact RGB triple. The negative control is required.*

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

#### Scenario: Readouts are monospaced and the question never drops below 18px

- **GIVEN** the question screen at a `320px` viewport width
- **WHEN** the computed `font-family` is read on the score readout (`.spoints`), the category tag
  (`.q-cat`), the turn chip (`.q-player`), the option index markers (`.opt .letra`), and the wheel
  sector labels (`.seg-label .lb`), and the computed `font-size` of the question text is read
- **THEN** all five readouts resolve to one and the same family string, that string is not the
  `font-family` computed on `body`, and the winner screen's score readout (`.wscore`) resolves to the
  same one
- **AND** the question text computes to at least `18px`
- **AND** the four option index markers are exactly `A`, `B`, `C`, and `D`, one per card, in that
  fixed top-to-bottom order, independent of the shuffle — the shuffle moves the option texts across
  the four fixed slots and never permutes the letters
- **AND** the timer carries no text node, and the seconds remaining are published on `#q-timer`'s
  `aria-valuenow`

*Provenance: `[DESIGN]` § Typography, including the 18px mobile floor and the monospace-for-readouts
rule, and § Dynamic Linear & Radial Timers for the timer as a track-and-bar module. `[IMPL]` — the
current `.question-text` floor is `clamp(17px, 4.5vw, 24px)`, which is **below** the design's own
floor; this requirement raises it. `[AUTHORED]` — the timer's removal from the role list, per the note
above. Measurable: five `font-family` reads plus one on the winner screen, their agreement with each
other and their difference from `body`, one `font-size` read taken at `320px` and not at desktop
width, and the absence of a text node under `#q-timer`.*

#### Scenario: The question screen shows no numeric countdown

- **GIVEN** a question is on screen
- **WHEN** the served document is searched for an element that renders the remaining seconds as text
- **THEN** no such element exists in the question panel
- **AND** the `role="progressbar"` element's `aria-valuenow` still carries the remaining seconds and
  decreases as the countdown runs
- **AND** no `font-family` change is required for the removal

*Provenance: `[AUTHORED]` — this scenario makes an already-written requirement checkable. The
requirement text already forbade a numeric countdown; nothing enforced it, so a readout shipped
alongside it and the defect was the silence, not the value. Measurable: the absence of the readout
element, and the value of `aria-valuenow` over the countdown.*
