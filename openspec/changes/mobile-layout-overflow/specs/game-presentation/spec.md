# Spec Delta

## MODIFIED Requirements

### Requirement: Fixed single-screen shell

The game SHALL remain a single non-scrolling screen. `body` SHALL keep `overflow: hidden` and the
panel container SHALL keep `position: fixed; inset: 0`. Exactly four panels SHALL exist, with the ids
`screen-start`, `screen-wheel`, `screen-question`, and `screen-winner`, and the existing
`show(id)` mechanism that activates one by class SHALL continue to switch between them.

**The document SHALL NOT scroll.** A panel whose content exceeds the viewport MAY scroll **internally**
so that no content is ever unreachable; this is the one sanctioned exception to "single screen" and it
is bounded to the panel's own box. Internal scrolling SHALL NOT be used to shorten a panel that
fits: a panel that fits its viewport SHALL NOT be scrollable.

The scrolling three-column dashboard layout and the footer of `stitch/code.html` SHALL NOT be adopted.

> Decision, not an open question. Recorded in `proposal.md`.

> `[AUTHORED]` Why the requirement is amended rather than satisfied as written. The previous wording
> forbade scrolling without saying what a panel does with content that does not fit, and the
> implemented answer was *clip it*: `body { overflow: hidden }` plus a fixed panel plus flex children
> that shrink means the overflow is painted outside the viewport and cannot be reached. Measured
> overflow on the shipped file: 355px on the start screen at 320x568, 150px on the question screen at
> 320x568, 47px on the wheel screen at 844x390, and 21px on the start screen at 1440x900 — the last
> one on a desktop viewport. A "no scrolling" rule that produces unreachable content is not a
> constraint the project can keep; the honest rule is that the **document** does not scroll and the
> **panel** keeps its content reachable.

#### Scenario: Four panels, one visible, no scrolling

- **GIVEN** the game at any moment
- **WHEN** the visible panel is identified
- **THEN** exactly one element with class `panel active` exists
- **AND** its id is one of the four above
- **AND** the document does not scroll at viewport heights from `320px` to `1200px`
- **AND** `body` computes `overflow: hidden` and the panel container computes `position: fixed`
  with `inset: 0`
- **AND** a panel whose content fits its viewport is not scrollable

*Provenance: `[IMPL]` — `body { overflow: hidden }` at `frontend/index.html:77`, `.panel` at 89, the
four `id`s at 550/601/613/638, and `show` at 800. `[DESIGN]` for the rejected layout. `[AUTHORED]` for
the internal-scrolling clause and for the rule that a fitting panel is not scrollable.*

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

## ADDED Requirements

### Requirement: No content is unreachable on a phone

The presentation SHALL remain **usable** at phone viewports: every control on every panel SHALL be
reachable and operable, and no panel SHALL clip content that it cannot also scroll to.

The following viewport sizes SHALL all be supported: `320x568`, `360x640`, `390x844`, `414x896`,
`768x1024`, `844x390` (landscape phone), `1440x900` and `1920x1080`.

Concretely, at each of those sizes:

- the manual-authoring form on the start screen SHALL be reachable and every one of its controls
  operable;
- the question screen's four options, its feedback strip and its "next turn" control SHALL be
  reachable;
- the wheel and its spin control SHALL be fully visible, and no sector SHALL be cut off;
- the question text SHALL render at `18px` or larger;
- the seven wheel sectors SHALL remain visible and SHALL NOT overlap.

The implementation SHALL add **no media query**. The stylesheet's declared breakpoints SHALL stay
exactly `768px`, `1024px` and the wheel-only `640px` compact tier, and the fitting SHALL be done
with fluid sizing — `clamp()`, `min()`, `vh`/`dvh` and flexbox — so that one rule covers every
viewport instead of a new breakpoint per problem.

The design's option-grid rule SHALL be preserved: below `768px` every answer option SHALL keep
stacking in a single column with `0.75rem` between them, whether the question has four options or the
two of a true/false question. Fitting a phone screen SHALL NOT be bought by turning the options into
two narrow columns.

> `[AUTHORED]` The viewport list is the set the project actually has to survive, taken from the
> shortest and the most common phone sizes, the shortest common landscape size, a tablet, and two
> desktop sizes. It is a closed list so that "usable on a phone" is a checkable claim rather than a
> mood.
>
> `[AUTHORED]` The two implementation constraints are not stylistic preferences; each one closes a
> door that the living spec already holds open. **No media query**: the living "Responsive behavior
> at the design's breakpoints" requirement fixes the declared breakpoint set at `768px`, `1024px` and
> the wheel-only `640px` tier, and a tester reads that scenario literally — a fourth breakpoint
> fails it. **One column below `768px`**: the same requirement says the options stack vertically
> below `768px`, and two narrow columns of long Spanish answers on a 320px phone is a worse game,
> not a fitting one. The height is recovered from the vertical rhythm instead: the heading, the
> card's padding, the option cards' padding and gaps, and the question text's box all become fluid.

#### Scenario: Nothing is clipped beyond reach on the start screen

- **GIVEN** the start screen at `320x568`
- **WHEN** the deepest rendered descendant of the panel is compared against the viewport height
- **THEN** either the deepest descendant's bottom is within the viewport, or the panel is
  internally scrollable and its scroll height covers that descendant
- **AND** the authoring form's submit control is reachable at `320x568`, `360x640`, `390x844`,
  `844x390` and `1440x900`

*Provenance: `[PRESERVE]` — `openspec/project.md`: "The frontend must remain usable at desktop and
mobile viewport sizes". `[IMPL]` — the measured `355px` / `284px` / `21px` overflow on the shipped
file, and the authoring form's height. Measurable: deepest-descendant bottom against
`window.innerHeight`, and the panel's `scrollHeight` against `clientHeight`.*

#### Scenario: Nothing is clipped beyond reach on the question screen

- **GIVEN** a question on screen at `320x568` and at `844x390`
- **WHEN** the rendered options, the feedback strip and the next-turn control are measured
- **THEN** each of them is within the viewport or reachable by scrolling the panel
- **AND** the question text's computed font size is at least `18px`
- **AND** every rendered option is still in a single column below `768px`

*Provenance: `[PRESERVE]` as above, plus the question-text floor from the "Type pairing" requirement
and the option-grid rule from "Responsive behavior at the design's breakpoints". Measurable: the
measured `150px` and `93px` overflows on the shipped file, and the options' column count.*

#### Scenario: The wheel is fully visible in landscape

- **GIVEN** the wheel screen at `844x390`
- **WHEN** the wheel and the spin control are measured
- **THEN** the wheel's box and the spin control are both fully within the viewport
- **AND** no sector label is clipped
- **AND** the wheel's size on a tall desktop viewport is unchanged from its pre-change size, so the
  fitting is bought on short viewports only

*Provenance: `[IMPL]` — the measured `47px` overflow and the `#wheel` box overflowing its own content
by `24px` at `844x390` on the shipped file. `[PRESERVE]` — the `gameplay` capability's "Seven sectors
do not overlap" requirement, which is checked at mobile sizes as well as desktop ones.*
