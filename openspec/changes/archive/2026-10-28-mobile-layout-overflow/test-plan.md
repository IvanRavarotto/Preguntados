# Test plan — `mobile-layout-overflow`

## Scope

One capability (`game-presentation`), one file under test (`frontend/index.html`), plus the
verification script under `scripts/`. No API, schema, or dependency change.

## Environments

| | |
|---|---|
| Browser | Chromium via headless DevTools Protocol (Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, honouring `CHROME_PATH`). `Emulation.setDeviceMetricsOverride` supplies each viewport with `deviceScaleFactor: 2`. |
| API | `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`, PostgreSQL 15 up (`docker compose up -d`). |
| Viewports | `320x568`, `360x640`, `390x844`, `414x896`, `768x1024`, `844x390`, `1440x900`, `1920x1080` — the closed list from the delta. |
| Runner | Node 24 scripts under this change's `checks/` folder. No frontend test runner is added; it is not in `openspec/project.md`. |

## Criteria → checks

| Criterion (from the delta) | Check | Pass bar |
|---|---|---|
| Exactly one `.panel active`, one of the four ids | `openspec/changes/mobile-layout-overflow/checks/check_layout.mjs` — DOM query at every viewport | **1** matching element, id in the allowed set |
| The document never scrolls | `document.documentElement.scrollHeight` against `window.innerHeight` at every viewport | equal, or not greater |
| `body` computes `overflow: hidden`; the container computes `position: fixed` | computed-style read | `hidden`; `fixed` with `inset: 0` |
| A panel that fits its viewport is not scrollable | `scrollHeight` against `clientHeight` on each panel | equal when the content fits |
| No panel clips content it cannot scroll to | deepest rendered descendant's bottom against `window.innerHeight`, per panel, plus the panel's `scrollHeight` | overflow is **0**, or the panel's `scrollHeight` covers the deepest descendant |
| The authoring form's controls are reachable | the form's submit control's bounding box against the viewport, and the panel's scroll reach | inside the viewport, or within the panel's scrollable range |
| The question screen's options, feedback and next-turn control are reachable | bounding boxes of the rendered option buttons, the feedback strip and the next-turn control | inside the viewport, or within the panel's scrollable range |
| The question text renders at 18px or larger | computed `font-size` of the question text | `>= 18` |
| The options stay in one column below `768px` | the rendered option buttons' bounding boxes at `390x844` | **1** column — one row per rendered option, same `x` |
| The declared breakpoint set is unchanged | the stylesheet's `@media` conditions collected | exactly `768px`, `1024px`, `640px` — **no fourth** |
| The wheel is fully visible at `844x390` | bounding boxes of the wheel and the spin button | fully inside the viewport |
| The wheel's size is unchanged on a tall desktop | the wheel's box at `1440x900` | equal to the pre-change size |
| Seven sectors, none overlapping | the seven sector labels' and dividers' bounding boxes | **7** sectors; no two labels' boxes intersect |
| No element's own content overflows its box | `scrollHeight - clientHeight` on every element that is not meant to scroll | `<= 1` |

## Negative controls (required)

| Mutated copy | Must fail |
|---|---|
| the authoring form restored to its current height | the start-screen check at `320x568` |
| the options forced into two columns at `320px` | the one-column check |
| a fourth media query added | the breakpoint-set check |
| the panel's internal overflow removed | every viewport where the content exceeds the viewport |
| a sector label translated out of its sector | the seven-sectors check |

## Demo path (human integration test)

1. Open the game on a phone-sized viewport (or a desktop browser's device emulation) at `390x844`.
2. On the start screen, scroll to the manual-authoring form and use it — every control must be
   operable.
3. Start a match and spin: the whole wheel and the spin button must be visible.
4. Answer a question: the four options, the feedback strip and the next-turn control must be
   reachable without the page scrolling.
5. Rotate the device to landscape (`844x390`) and repeat steps 2 to 4 — nothing may be cut off.

## Not tested, and why

- **No pixel comparison.** The checks are geometric, not visual; the rendering of the glass surfaces
  and the neon glow at mobile sizes is a human eyeball matter at Gate C.
- **No real-device run.** Viewports are emulated, not measured on physical handsets. The delta's
  viewport list is the contract; a real device may report a different size, and the internal-scroll
  safety net is what covers the difference.
- **No cross-browser matrix.** Chromium only; the properties under test are Baseline flex and
  overflow behaviour.
- **The `#wheel` rotated bounding box is not a defect** and is excluded from the checks by design:
  the element is a circle inside a 269px box and all seven labels fit. The check compares sector
  *labels* and the wheel's *box*, never the rotated element's axis-aligned bounding box.
