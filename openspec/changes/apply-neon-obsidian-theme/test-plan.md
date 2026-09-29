# Test plan — `apply-neon-obsidian-theme`

| | |
|---|---|
| Change | `apply-neon-obsidian-theme` |
| Branch when authorized | `feature/apply-neon-obsidian-theme` |
| Track | 1 (Light), per `proposal.md`. No `design.md`. |
| Capability | `game-presentation` (new, the project's first) |
| Delta under test | `openspec/changes/apply-neon-obsidian-theme/specs/game-presentation/spec.md` — 14 requirements, 23 scenarios |
| Other artifacts | `proposal.md`, `tasks.md`, `docs/adr/ADR-001-neon-category-palette.md` |
| Surface | `frontend/index.html`, one file, 800 lines as of this reconciliation |
| Author | `qa-manager` |
| Status | reconciled three times: against the original delta, then against two amendments that rewrote S6, S18 and R10/S19. Ten findings in section 12; eight items recorded-not-adjudicated in section 10. SM-5, SM-16 and SM-17 rewritten in this pass; every new snippet run. |

> **Read this before following any `:NNN` in this plan.** The citations here point at **two different
> files**, because `dev` rewrote the surface while the plan was being written, and the delta's own
> citations were re-based on the rewrite. Pre-existing citations in this plan — `:256` for the old
> positional `COLORS[i % 6]`, `:226-233` for the old `FALLBACK` table, `:125` for the old `420px`
> breakpoint, `:367-368` for the old `pickQuestionAsync` turn-skip, `:123` for the old `17px`
> question floor, and every other `:NNN` that appears in sections 1 to 8 — refer to the
> **pre-change baseline** file, SHA-256
> `BF5FCFC22BDF524EF4DE1BBAEB7B47EAA46484999AB9909CA7AF007E281B4532` (472 lines, recorded in
> section 3). **They must not be used to navigate the current file**, and the current file no longer
> matches that hash. The delta's newer citations, which the delta marks "as implemented", do refer to
> the current file, but they were taken from a snapshot `dev` has since edited again, so treat them
> as approximate too. **Where a current-file location matters, this plan cites the selector and not
> the line number.** Line numbers in the current file drift on every save.
>
> The 800 in the header is the same kind of snapshot: `dev` was editing the file throughout this
> reconciliation and the count moved under it three times - 798, 797, 796, then 800, with the rule
> rewrite landing mid-pass. It is recorded because a wrong count is a defect in the plan, not because
> it is stable.

Every provisional criterion ID from the first draft is gone. Each test below names a real
requirement and a real scenario from the delta, and carries that scenario's provenance tag so a
reviewer can see where the test came from.

## 1. Scope

### Covered

The 23 scenarios of `game-presentation`: canvas and glass tokens, neon palette, icon set, the
derived wheel and its sector maths, the three feedback states, the timer, the fixed shell, the
offline constraint, type roles, option cards, responsiveness, the preserved gameplay rules,
document identity, and the unchanged API surface.

### Not covered, and why

| Excluded | Reason |
|---|---|
| API, database, schema, routes, Docker Compose | Presentation-only. `project.md` forbids incidental changes to the Compose contract during frontend work. |
| Any new test framework or dependency | Out of scope by instruction and by `project.md`. Adding pytest, Ruff, or mypy is a separate change with its own decision. |
| Visual fidelity against `stitch/screen.png` by machine | No agent in this fleet can read images, per `proposal.md`. Human-only, MT-12. |
| Cross-browser rendering | Not in the delta. Chrome/Edge on Windows 11, the declared deployment target. The delta's own `backdrop-filter` note cites Baseline 2024, so the *unprefixed* property is asserted in one engine only. |
| Performance, load, full a11y audit, keyboard navigation, contrast ratios | Not in the delta. Named in section 11 as follow-up work. |
| The nine mockup features the proposal excludes | Lobby and room codes, the `00:45` turn clock, the `x1.5 XP` multiplier, per-category mastery percentages, the mode selector, the `x4` streak multiplier, daily missions, remote avatars, and the `v2.4.0-neon` / latency footer. Out of this change and therefore not tested. |

No git step appears anywhere in this plan. Commit authorization is withheld, `frontend/` is
untracked, and this is the user's professor's repository.

## 2. What this plan does not claim

`openspec/project.md` states there is no test framework, no lint command, no type-check command, and
no coverage threshold, and that a change touching game behavior must either add the relevant checks
or explicitly escalate the gap. The human accepted that escalation for this cycle.

- **No coverage percentage appears anywhere in this plan.** None exists to report.
- Most of this plan is manual or scripted-manual. Calling it a suite would overstate it.
- **Exactly two automated check families exist**, because the delta authorises two instruments and
  adding a third would be inventing a toolchain: `node --check` on the extracted inline script
  (M1, test AT-1), and pure-function assertions through `node -e` / `node:vm` (M2, tests AT-2, AT-3,
  AT-4, AT-6). Between them they cover the rotation maths, the timer constants, and the palette
  lookup. They do not cover layout, colour, or behaviour in the browser.
- Every other case here is human or scripted-manual, including SM-21, the rendered-wheel binding
  check. SM-21 runs a pasted script in the DevTools console; a human pastes it and reads the result.
  It is the most valuable guard in the plan and it is still not a machine check.
- Section 10 names the weak spots, including four items this reconciliation recorded rather than
  adjudicated, and section 12 names seven findings in the delta's own stated measurement recipe.

## 3. Environments and provisioning

One environment. There is no CI, so there is no second environment to match. The shape is recorded
here because the next person otherwise loses a day to it.

### Runtime

| Component | Version and shape | Provisioning |
|---|---|---|
| Node.js | 24 (verified `v24.19.0`) | Already installed, declared in `project.md` for checking the embedded script. No install step. |
| Python | 3.14.7 | `poetry install` from the repo root. |
| PostgreSQL | `postgres:15` in Docker | `docker compose up -d` at the repo root. |
| Browser | Chrome or Edge, current, Windows 11 | Already present. |

### Credential shape

A local dependency has to match the shape the application expects, not merely a matching version. A
connection string missing its password, or a database provisioned with trust authentication, fails
in a way that reads as a product defect.

| | Value | Source |
|---|---|---|
| Database user | `admin` | `docker-compose.yml:5` |
| Database password | `admin123` | `docker-compose.yml:6` |
| Database name | `questions_db` | `docker-compose.yml:7` |
| Port | `5432` published to host | `docker-compose.yml:9` |
| Volume | `postgres_data`, persistent | `docker-compose.yml:10-11` |
| Application URL | `postgresql+psycopg2://admin:admin123@localhost:5432/questions_db` | `app/database.py:4` |

Compose and the application URL match exactly, so the shape is already right. Do not harden one
side. `project.md` (Secrets) forbids reusing these development credentials outside this machine.

### Data precondition, and why it is a control

Verified live at authoring time:

```
GET /categories/stats -> total_questions=201  categorized=201  uncategorized=0
by_category: historia=89  entretenimiento=57  geografia=24  deportes=17  arte=8  ciencia=6
```

**The database must be loaded before any browser test runs.** With an empty database `quiz()`
returns null and `pickQuestionAsync` calls `nextTurn()` (`frontend/index.html:367-368`), so the turn
passes silently, with no message and no question. A tester against an empty database sees a wheel
that spins forever and may score the resilience scenarios as passes when nothing was exercised.

Pre-check, required before every browser run:

```
curl.exe -s http://localhost:8000/categories/stats
```

Require `categorized=201` and `uncategorized=0`. This is the positive control behind every test in
this plan. See also MT-7, where the same supply limit works against the delta in the other
direction.

### Server

```
docker compose up -d
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`GET /` is served by `FileResponse` on every request (`app/main.py:20-22`), so a frontend edit needs
no Uvicorn restart. Confirmed: `GET /` returns `200 text/html`, `content-length: 23094`, and carries
`last-modified` plus `etag` but **no `cache-control`**. With no explicit directive the browser may
apply heuristic freshness and serve a stale document, so the hard refresh in the demo path is
load-bearing.

### Integrity baseline, recorded because there is no git baseline

`frontend/` is untracked and commit authorization is withheld, so there is no revision to diff
against. The delta's last scenario names `git status` as its instrument, and with every file
untracked `git status` cannot distinguish "unchanged" from "never committed". File hashes are the
working instrument, and a pre-change baseline was recorded before dev work began:

| File | SHA-256 (pre-change) |
|---|---|
| `app/main.py` | `4659054BF40F555A2909505DAA4A985194853778833485056B2550E1D1CD092D` |
| `app/database.py` | `3AF2C771658B11A6E46DDA438ED97D260EFFEB188B4927009C00F835C4563112` |
| `app/models.py` | `B352222A337EC4D2B914701379B445496027DCA7EBCA5D4410A5812D5924501B` |
| `app/categories.py` | `E046EA4D7A6400309404B859A919351C8FAC915145B9222BBE2E2D8A2BF555FC` |
| `app/load_data.py` | `A632C8EE939E565A59F898E8AE8BA62C95926D1322EF685533D4B15D99A4543F` |
| `app/categorize.py` | `55FE5F146DE78720C6F73C505A333BF735D6ECE4EA60433E4F8F316FAC2F614D` |
| `app/human_review.py` | `986302503DA9F9732F56B7E1E7514525F91086D83D74BC73C33AC4FB09B87469` |
| `docker-compose.yml` | `BEB42DE0079DFD6DBB7DCA618971A6CD115E110FE68DCBA75E600C1442616DEE` |
| `pyproject.toml` | `F270BE7E6FC8E9FB5EEF9EF303C547886822FB9F5D3AFD1AAD8725FBE530A8DE` |
| `poetry.lock` | `E18C050A51F6B8728A39CD539E63E25DD73BD9509A12E109269588167231D078` |
| `frontend/index.html` (expected to change) | `BF5FCFC22BDF524EF4DE1BBAEB7B47EAA46484999AB9909CA7AF007E281B4532` |

HASH-1 reruns these after the change. The first ten must be byte-identical. The last row is the
pre-change baseline, and it is already known not to match the working file: `dev` is editing
`frontend/index.html` right now. That hash is the anchor for the citation-baseline note in the
header, which explains which `:NNN` references in this plan are pre-change and which are not.

### Tooling hazard on this checkout

The repository path contains `[01]`, a PowerShell wildcard. Passing it through `workdir`,
`Set-Content`, or `Get-ChildItem` without `-LiteralPath` silently resolves elsewhere. Every command
here uses relative paths from the repo root.

## 4. The two automated checks, and the seam they need

Two automated families, M1 and M2, comprising four test cases. Neither needs the server or the
database. SM-21 lives in section 4 too because it shares the seam question, but it is scripted-manual
and is not part of either family.

| Family | Instrument | Cases |
|---|---|---|
| M1 | `node --check` on the extracted inline script | AT-1 |
| M2 | `node -e` / `node:vm` pure-function assertions against the sandbox | AT-2, AT-3, AT-4, AT-6 |

### The required seam

`tasks.md` 1.1 already requires the rotation computation to be extracted into two top-level,
DOM-free functions that take the sector count as an argument. AT-2, AT-3, AT-4, and AT-6 run
against that seam. SM-21 deliberately does not: it reads the rendered wheel, because that is the
only layer at which a pasted static SVG is visible.

| Function | Contract |
|---|---|
| rotation delta for a chosen sector | degrees to add so sector `idx` lands under the pointer |
| sector index under the pointer for a rotation | the inverse, used as the assertion oracle |
| sector center | center angle of sector `idx` among `n` |
| name-keyed accent lookup | `(name) -> hex` |
| name-keyed glyph lookup | `(name) -> inline SVG` |
| timer state | `(elapsedMs) -> { ratio, urgent, expired }` |

Plus module-scope constants readable by name: `TIMER_SECONDS`, `WIN_POINTS`, and the urgency
threshold. Verified readable through the sandbox: `TIMER_SECONDS = 20`, `WIN_POINTS = 10`.

Seam check, run as part of AT-2 and recorded: those bodies must not reference `document`, `window`,
`$`, `fetch`, or `Math.random`. `qa` greps the extracted script.

### Three sandbox facts, verified against the real inline script

These were established by probing `frontend/index.html` in a `node:vm` sandbox while writing this
plan, so nobody rediscovers them.

1. **A top-level `const` in a `vm` script does not land on the sandbox object.** Confirmed:
   `sandbox.FALLBACK` and `sandbox.categories` are both `undefined` after a bare boot. The
   assertion epilogue must be appended to the script text and must re-export the bindings from
   inside the same scope. This is the recipe in `tasks.md` 1.4.
2. **Export getters, not snapshots.** `init()` populates `categories` through a
   `fetch().then().then().catch()` chain, which resolves after the synchronous script body has
   finished. An epilogue that reads `categories` into a snapshot sees **0**, and the non-empty
   control then fails with "walked 0, expected 6". Verified both ways. The epilogue must export
   `getCategories: () => categories`, and the harness must let the chain settle (two `setImmediate`
   ticks) before reading.
3. **`document.createElement` is required, and its absence fails late and quietly.** `buildWheel`
   calls it, and the failure arrives from the `.catch` branch as an **unhandled rejection**, after
   the epilogue has already printed its result. Verified: a sandbox without a `createElement` stub
   returns normally from `vm.runInContext`, prints, and only then dies with
   `TypeError: document.createElement is not a function`. A harness that installs a swallowing
   `unhandledRejection` handler would report the fallback path as passing when it never rendered.
   So the stub is mandatory, the harness must not swallow rejections, and the exit code must be
   checked.

### The oracle is written independently

The assertion computes the sector under the pointer with its own formula, not by calling the
application's. CSS `conic-gradient` sectors run clockwise from 12 o'clock, and `transform: rotate(R)`
moves content clockwise, so the unrotated angle under the top pointer is `(360 - R) mod 360`:

```js
const sectorAtPointer = (rotationDeg, n) => {
  const a = (((360 - (rotationDeg % 360)) % 360) + 360) % 360;
  return Math.min(n - 1, Math.floor(a / (360 / n)));
};
```

Confirmed against the live file: category `i` is painted from `i * 360 / n` to `(i + 1) * 360 / n`
(`frontend/index.html:268`), its label sits at the sector center via
`rotate(center) translate(0,-128px) rotate(-center)` (`:274`), and the pointer is a downward
triangle at `top: -14px; left: 50%` (`:92-94`), so it is at 12 o'clock.

### AT-1: syntax gate on the extracted inline script

`node --check` on the inline `<script>`, binary pass or fail. `tasks.md` 1.3 owns this.

Extraction is required because the script is embedded in HTML, and extraction can silently produce
nothing. **`node --check` on an empty file exits 0**, demonstrated at authoring time, as does a
comment-only file. So the positive control is mandatory and the test fails if it trips.

```powershell
# Run from the repo root.
$html = Get-Content -LiteralPath ".\frontend\index.html" -Raw -Encoding UTF8
# Skip external <script src=...>: a different file, and a finding to raise, not to absorb.
$blocks = [regex]::Matches($html, '(?s)<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>')
if ($blocks.Count -eq 0) { throw "AT-1 VACUOUS: no inline <script> block found" }
$js = ($blocks | ForEach-Object { $_.Groups[1].Value }) -join "`n"
# Positive control: prove the extraction read the game script, not a fragment.
foreach ($m in @('TIMER_SECONDS', 'WIN_POINTS', 'categories')) {
  if (-not $js.Contains($m)) { throw "AT-1 VACUOUS: extracted script lacks '$m'; extraction is wrong, not the code" }
}
$out = Join-Path $env:TEMP "preguntados-inline.js"
[IO.File]::WriteAllText($out, $js)
node --check $out
"AT-1 node --check exit=$LASTEXITCODE"
```

Pass: exit 0 with all three markers present. `tasks.md` 1.3 also requires the negative control, that
it exits non-zero on a copy with one deliberate syntax error. Record both exit codes.

### AT-2: rotation maths, 6 targets × 7 prior rotations, 42 of 42

Covers **R4 / S7** "The named category, the sector under the pointer, and the requested category are
the same" `[IMPL] [PRESERVE]`.

Run against the real shipped script, per `tasks.md` 1.4. The seven prior rotations are
`0, 330, 1800, 12345.5, 3600, 54321, 777.25`. The category array is the one the served
`GET /categories` payload produces, in the API's order, verified live as
`arte, ciencia, deportes, entretenimiento, geografia, historia`. The assertion is written in terms of
`categories[idx].name`, never a hardcoded name-to-sector map, because the order is the API's to
decide.

Order of assertions, and the order matters:

1. **Non-empty control first.** `getCategories().length === 6` and the walked set holds exactly
   `6 × 7 = 42` pairs. Until both hold, report CONTROL FAILED and stop. Without this the check can
   pass by enumerating nothing.
2. Then, for every pair: `sectorAtPointer(rot, n) === idx`, where `rot = start + delta(idx, n, start)`.
3. Then: `Math.abs(((360 - centreOf(idx, n)) % 360) - ((rot % 360 + 360) % 360)) < 1e-9`.

Baseline measured against the **pre-change baseline** file: **42 of 42**. The change is a regression
guard measured from a green baseline. `qa` re-measures it on the current file as part of AT-2, and
that re-measurement is the number of record — this plan's 42 of 42 was not taken against the file
`dev` is now shipping, and the delta's amendment touched neither `rotationDeltaForSector` nor
`sectorUnderPointer`.

**AT-2 is necessary and not sufficient.** It cannot detect a pasted static SVG, for a reason proved
in section 12. SM-21 is the check that does. Running AT-2 alone against this change would be a guard
that reports green on the exact defect the criterion exists to catch.

### AT-3: the fallback path, 42 of 42, and palette agreement between the two paths

Covers **R4 / S8** "An unavailable category request still yields a playable wheel" `[PRESERVE] [IMPL]`,
and exercises the same seam over the fallback list.

Same loop as AT-2, run against the `FALLBACK` table (`frontend/index.html:226-233`) rather than the
API payload. Controls, in order:

1. `fallback.length === 6` and the six `name` values are exactly the six known names as a set. If
   the fallback yields a different count, every sector is a different angle and AT-2's geometry does
   not transfer.
2. The 42 pairs, same assertion.
3. **Palette agreement.** For every category `name`, the accent from the API path and the accent from
   the fallback path must be the same hex.

That third control is a consequence of R2's requirement text, which keys the accent by name "and not
by its position in any array", and it is not a failure that exists only in theory. The two paths
**disagreed** in the pre-change baseline: the API path took `COLORS[i % 6]` (`:256`) and the fallback
took `COLORS[c.c]` (`:257`), and the `c` column assigns `arte` index 5 against the API path's index 0.
Verified fallback colour indices: `arte,ciencia,deportes,entretenimiento,geografia,historia -> 5,0,4,3,2,1`.
A name-keyed palette removes the discrepancy, and this control is what proves it was removed. It is
now a regression guard on a single name-keyed lookup rather than a before-and-after, and the two
paths in the current file share one `getAccent(name)`.

### AT-4: timer and scoring constants, single source, proportional urgency

Covers **R6 / S14** "The bar and the outcome stay synchronized" `[IMPL] [DESIGN] [AUTHORED]`, and
**R12 / S21** for `WIN_POINTS`.

```
TIMER_SECONDS === 20
WIN_POINTS === 10
the bar transition duration and the timeout both read TIMER_SECONDS
the literal turn duration appears as a value exactly once in the whole document
```

The single-source check is a static grep of the extracted script, and it is the part that keeps
working after a restyle. Today both already derive from `TIMER_SECONDS`
(`frontend/index.html:399,401`).

Urgency boundary, from R6's proportional rule, which the delta settled over `DESIGN.md`'s
conflicting "under 5 seconds": the shift fires when **less than 20% of the countdown remains**, and
the delta states why, that the proportional rule survives a change to `TIMER_SECONDS` while an
absolute figure silently disagrees. On a 20s timer 20% is 4s, so urgency begins at 16000ms elapsed.
The boundary pair:

```
timerState(16000).urgent === false    remaining is exactly 20%, not less than 20%
timerState(16001).urgent === true
```

The two readings differ by one second on a 20s timer, so the boundary is worth asserting exactly
rather than approximately.

### SM-21: rendered-geometry binding, the discriminating check

Scripted-manual, not a machine check. A human pastes the two snippets below into the DevTools
console on the wheel screen and reads the printed verdict. It earns this place because it is the
only check in this plan that can fail on a pasted static SVG. It exists because of the finding in
section 12.

Covers **R4 / S7** `[IMPL] [PRESERVE]`.

The three parties R4/S7 binds together are the **rendered** sector under the pointer, the category
named on screen, and the category requested from the API. AT-2 compares only the last two, and it
does so through the same array, so the array's order cancels out. SM-21 reads the first party out of
the rendered wheel.

Two layers, because the wheel may legitimately be either a derived gradient or markup:

**Layer 1, derived gradient.** Read the wheel's computed `backgroundImage` and extract the colour
stop angles. For a six-sector `conic-gradient` the stops are at `0, 60, 120, 180, 240, 300deg`. For
each `i`, the stop covering `[i*60, (i+1)*60)` must be the accent of `categories[i].name`. Assert
6 of 6.

```js
// DevTools console, wheel screen, after /categories resolves.
const bg = getComputedStyle(document.getElementById('wheel')).backgroundImage;
// e.g. "conic-gradient(rgb(255, 208, 0) 0deg 60deg, rgb(0, 240, 255) 60deg 120deg, ...)"
const stops = [...bg.matchAll(/rgba?\([^)]+\)\s*(-?[\d.]+)deg\s*(-?[\d.]+)deg/g)]
  .map(m => ({ from: +m[1], to: +m[2], colour: m[0].match(/rgba?\([^)]+\)/)[0] }));
const hexToRgb = h => { const n = parseInt(h.slice(1), 16);
  return `rgb(${(n>>16)&255}, ${(n>>8)&255}, ${n&255})`; };
const bad = [];
if (stops.length !== 6) { bad.push(`expected 6 sector stops, found ${stops.length}`); }
else categories.forEach((c, i) => {
  const want = hexToRgb(getAccent(c.name));
  const hit  = stops.find(s => s.from <= i * 60 && s.to > i * 60);
  if (!hit || hit.colour.replace(/\s/g, '') !== want.replace(/\s/g, '')) {
    bad.push(`sector ${i} paints ${hit && hit.colour} but ${c.name} is ${want}`);
  }
});
console.log(bad.length ? { FAIL: bad } : { OK: '6/6 sectors bind geometry to name' });
```

The control is the first line: `stops.length !== 6` is a failure, not a skip. A wheel with no
readable stops must not report success.

**Layer 2, rendered label order.** This is the layer that fires on a pasted SVG, where there is no
gradient to read and the geometry lives in hardcoded `<path>` elements.

```js
// DevTools console, wheel screen.
const rendered = [...document.querySelectorAll('#wheel .seg-label, #wheel svg text, #wheel .sector-label')]
  .map(n => n.textContent.trim());
const expected = categories.map(c => c.label);
const sameOrder = JSON.stringify(rendered) === JSON.stringify(expected);
console.log({ rendered, expected, sameOrder, count: rendered.length });
```

Controls: `rendered.length` must be 6, and the sector-bound score must be 6 of 6. A paste of
`stitch/code.html:238-308` fails on both, because its sectors read `HISTORIA`, `GEOGRAFÍA`, `ARTE`,
`DEPORTES`, `CIENCIA`, `SHOW` in the mockup's own order while the API supplies
`Arte y Cultura, Ciencia, Deportes, Entretenimiento, Geografía, Historia`.

**Measured discriminating power**, from the binding analysis in section 12:

| Wheel | Sectors whose rendered geometry binds to the selected name |
|---|---|
| Derived from the API order (what the delta requires) | **6 of 6** |
| Static SVG in the mockup's sector order | **0 of 6** |

SM-21 is the check that turns 0 of 6 into a red.

### AT-6: the palette is keyed by name, not by position

Covers **R2 / S5** "A seventh category name does not take a neighbour's colour" `[IMPL]`.

Call the name-keyed accent lookup through the sandbox epilogue with each of the six known names, and
then with names that are not in the set.

```js
const ACCENT = probe.getAccent();
const six = ["arte","ciencia","deportes","entretenimiento","geografia","historia"]
  .map(n => ({ n, hex: ACCENT(n) }));
// CONTROL: the six known names must all resolve, each to a distinct hex.
if (six.some(s => !s.hex)) throw new Error('AT-6 CONTROL FAILED: a known name resolved to no accent');
if (new Set(six.map(s => s.hex)).size !== 6) throw new Error('AT-6 CONTROL FAILED: accents are not distinct');
// Now the seventh name.
const unknown = ACCENT('mecanica');
console.log({ six, unknown, borrowed: six.some(s => s.hex === unknown) });
```

`borrowed` must be false. The delta's requirement text says a category the API returns that is not
one of the six must not inherit a neighbour's accent by array position, and in the pre-change baseline
it did, because `COLORS[i % 6]` (`:256`) is positional. The current file keys `ACCENT_BY_NAME` by
name, so this is a regression guard on that lookup and not a before-and-after.

Limitation to record: `GET /categories` returns a static Python list (`app/categories.py:13-62`), so
a seventh category cannot be served. It can only be simulated through the lookup, which is why this
test calls the function rather than driving the browser.

## 5. The failure mode this plan exists to catch

**A wrong-category bug that no screenshot can see.**

The live game derives the wheel from `GET /categories` as a `conic-gradient`
(`frontend/index.html:265-284`) with a `FALLBACK` table at `:226-233`, and picks a random index at
`:329` before computing the rotation delta at `:333`. Selection and geometry agree today because
both read the same array.

`stitch/code.html` does not. It hardcodes six sectors into SVG (`:238-308`), reorders its own JS
array (`:472-479`), and selects with its own formula at `:511`. Pasting that markup while keeping
array-indexed selection makes the game name one category and load another's questions, on every spin,
with nothing in a screenshot to reveal it.

Three checks close it, of deliberately different kinds so one failure is not three:

| Check | Kind | What it sees |
|---|---|---|
| AT-2 | Machine, M2, pure, 42 pairs | The rotation maths, given a derived wheel |
| SM-21 | Scripted-manual, rendered DOM, 6 sectors | Whether the wheel is derived at all |
| DP-7 | Human, end to end | Whether the chip on the question screen matches the sector under the pointer |

SM-21 is the one that fires on the defect. Section 12 explains why AT-2 alone would not.

## 6. Requirement-to-test map

All 14 requirements, all 23 scenarios. `[DESIGN]` `[PRESERVE]` `[IMPL]` `[AUTHORED]` are the
delta's own provenance tags.

Re-verified against the amended delta by counting `### Requirement:` and `#### Scenario:` headings
in the delta: **14 and 23**, unchanged. The amendment **retitled** R11, S3, and S20 without moving
any ID, so the map below stays valid by ID and only the three quoted titles were stale; they are now
the amended titles. Every one of S1 to S23 still has at least one test mapped to it, and no scenario
lost its last test — the amendment created no coverage gap. S3's rewrite changed what SM-3 asserts,
not which scenario it asserts, and S20's gained a third breakpoint and a containment half, both inside
SM-18.

### R1 Obsidian canvas and glass surface tokens

| Scenario | Tag | Tests |
|---|---|---|
| S1 Canvas and text colours are the frontmatter values | `[DESIGN]` `[AUTHORED]` | SM-1 |
| S2 Glass surfaces blur, stroke, and cast no drop shadow | `[DESIGN]` | SM-2 |
| S3 Radii stay low, and the full radius is spent on a closed, named set | `[DESIGN]` `[IMPL]` `[AUTHORED]` | SM-3 |

### R2 Neon category palette

| Scenario | Tag | Tests |
|---|---|---|
| S4 Every category renders in its assigned accent | `[DESIGN]` `[PRESERVE]` | SM-4, AT-3 palette control |
| S5 A seventh category name does not take a neighbour's colour | `[IMPL]` | AT-6 |

### R3 Category icon set

| Scenario | Tag | Tests |
|---|---|---|
| S6 Icons render offline, in a legible category-derived ink | `[AUTHORED]` `[DESIGN]` | SM-5, SM-6, SM-7 |

### R4 The wheel is derived from the live category list, and its sector maths is testable

| Scenario | Tag | Tests |
|---|---|---|
| S7 The named category, the sector under the pointer, and the requested category are the same | `[IMPL]` `[PRESERVE]` | AT-2, SM-21, DP-7 |
| S8 An unavailable category request still yields a playable wheel | `[PRESERVE]` `[IMPL]` | AT-3, MT-8 |
| S9 An unavailable question request does not crash the page | `[PRESERVE]` `[IMPL]` | MT-9 |
| S10 The wheel settles with the pointer over the selected sector | `[DESIGN]` `[IMPL]` | SM-8, MT-2 |

### R5 Correct, incorrect, and timed-out feedback are three distinct visible states

| Scenario | Tag | Tests |
|---|---|---|
| S11 The three states are visibly different from each other | `[DESIGN]` `[PRESERVE]` `[AUTHORED]` | SM-9, MT-3, MT-4, MT-5, MT-11, SM-10 |
| S12 A timeout reveals the correct answer without scoring | `[IMPL]` `[PRESERVE]` | SM-10, MT-3 |
| S13 A point is awarded only for the stored answer | `[PRESERVE]` | SM-11, MT-4, MT-5 |

### R6 Timer module

| Scenario | Tag | Tests |
|---|---|---|
| S14 The bar and the outcome stay synchronized | `[IMPL]` `[DESIGN]` `[AUTHORED]` | AT-4, SM-12 |

### R7 Fixed single-screen shell

| Scenario | Tag | Tests |
|---|---|---|
| S15 Four panels, one visible, no scrolling | `[IMPL]` `[DESIGN]` | SM-13 |
| S16 Dead decorative markup is gone | `[IMPL]` | SM-14 |

### R8 No external requests

| Scenario | Tag | Tests |
|---|---|---|
| S17 The document is fully self-contained | `[IMPL]` | SM-7, SM-15 |

### R9 Type pairing is preserved without webfonts

| Scenario | Tag | Tests |
|---|---|---|
| S18 Readouts are monospaced and the question never drops below 18px | `[DESIGN]` `[IMPL]` | SM-16, MT-5 |

### R10 Answer option cards carry an index tag and a category chip

| Scenario | Tag | Tests |
|---|---|---|
| S19 The index tag is always A, B, C, or D and never an ordinal | `[DESIGN]` `[IMPL]` | MT-5, SM-17 |

### R11 Responsive behavior at the design's breakpoints, and the wheel's compact tier

| Scenario | Tag | Tests |
|---|---|---|
| S20 The option grid changes shape at the design's breakpoints, and no sector label crosses the wheel | `[DESIGN]` `[IMPL]` `[AUTHORED]` | SM-18 (halves 1-4), MT-10 |

### R12 Declared gameplay rules are unchanged

| Scenario | Tag | Tests |
|---|---|---|
| S21 A full match still plays to a winner under the new theme | `[PRESERVE]` | DP-1 to DP-12, MT-1, MT-6, MT-7, AT-4 |

### R13 Document identity is preserved

| Scenario | Tag | Tests |
|---|---|---|
| S22 Language and title are unchanged | `[IMPL]` | SM-19 |

### R14 Gameplay behavior survives the restyle

| Scenario | Tag | Tests |
|---|---|---|
| S23 The API surface and the request count are unchanged | `[PRESERVE]` | SM-15, SM-20, HASH-1 |

## 7. Test cases

`AT` automated, `SM` scripted-manual, `MT` manual, `DP` demo path, `HASH` integrity. Unit tests
belong to `dev` inside the task that introduces the behavior.

### AT-1 to AT-4 and AT-6, and SM-21

The four automated cases are specified in section 4, grouped as M1 (AT-1) and M2 (AT-2, AT-3, AT-4,
AT-6). Each records its controls as run, not assumed. SM-21 is scripted-manual, specified in section
4 and listed with the scripted cases below; it is the addition this reconciliation produced, and it
is not a machine check. See section 12.

### SM-1 canvas and text colours
`body` and `.panel` computed `background-color` both `rgb(18, 19, 25)`. Question text computed
`color` `rgb(227, 225, 235)`. Static grep: no rule declares `background-color: #090A10` on `body` or
a panel. `#090A10` survives only as ink on saturated fills and `#FFFFFF` only as text on a saturated
neon fill, so record **where each survives** rather than whether it survives. Controls: both
selectors must resolve; a missing selector is a failure, not a skip. Covers S1.

The two literals were re-located against the current file while reconciling, because this control is
the instrument and an assumed one is worth nothing. `dev` is not changing colours, and the re-check
confirms the control still holds:

| Literal | Where it survives in the current file | Saturated fill it sits on |
|---|---|---|
| `#090a10` (CSS `--ink`, JS `INK`) | `.btn` colour, which is also `.spin-btn` and every other primary button | the `--geografia`→`--ciencia` gradient |
| `#090a10` | `.player-input .pv` colour, both `.pv1` and `.pv2` | `--p1` `#00F0FF`, `--p2` `#BD00FF` |
| `#090a10` | `.opt.right .letra` and `.opt.wrong .letra` colour | `--ok` `#05FFA1`, `--fail` `#FF2A6D` |
| `#090a10` | five of the six `.seg-label` elements, via `label.style.color = cat.on` where `on` is `INK` for every category but one | that sector's own accent |
| `#FFFFFF` | **exactly one** site, the `on` value for `entretenimiento`, applied to that one sector label | `#BD00FF` |

The prohibition half of S1 — neither literal may become canvas or body text — is satisfied. Record
the table above as the result; do not reduce it to "no occurrences".

**Two precision notes, for the reviewer and not for the tester.** R1's parenthetical names
`#FFFFFF` as text on "wheel sector labels, **primary button labels**", but the code puts `--ink` on
the primary button labels and reaches `#FFFFFF` at a wheel sector label only, and only for
`entretenimiento`. That is not a violation — the clause is a prohibition with an illustrative
parenthetical, not an instruction to use `#FFFFFF` at both sites. And `#090a10` also lands on `.pv`
markers and on sector labels, which are spans rather than buttons. Both are recorded here so a
reviewer diffing R1 against the code sees them already found. **No test adjudicates either**, and
none should: they are wording precision, not behavior. `code-reviewer` judges.

### SM-2 glass surfaces
Computed `backdrop-filter` on the question card contains `blur(16px)` and the source carries no
`-webkit-backdrop-filter`. Computed border `1px` in `rgba(255, 255, 255, 0.08)`. **No `box-shadow`
declaration in the stylesheet has a non-zero `x` or `y` offset** — a source-level regex over the style
block, because computed `box-shadow` reports the used value and a glow legitimately has an offset.
That reasoning is load-bearing and survives the amendment: every glow in this presentation is
`0 0 <blur> <colour>` or `0 0 0 1px …`, so a used-value reading would report the offset as `0` for a
legitimately correct glow and the check would pass for the wrong reason.

```js
const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } });
const shadows = css.filter(r => r.style && r.style.boxShadow && r.style.boxShadow !== 'none')
  .map(r => ({ sel: r.selectorText, v: r.style.boxShadow }));
const offset = shadows.filter(s => {
  const nums = s.v.match(/-?[\d.]+px/g) || [];
  return nums.length >= 2 && (parseFloat(nums[0]) !== 0 || parseFloat(nums[1]) !== 0);
});
console.log({ allShadows: shadows, withNonZeroOffset: offset });
```

`withNonZeroOffset` must be empty. Control: the regex must have matched *something* to search, so
first assert the style block was readable and non-empty. Covers S2.

**The prefixed-declaration half is the finding being fixed, and this check is what confirms the fix
landed.** The current file declares `-webkit-backdrop-filter` at exactly **four** sites, on these four
selectors and nowhere else:

| Selector | What it carries |
|---|---|
| `.card` | the primary glass card, `--glass-blur` |
| `.score-card` | each player's scoreboard card, `--glass-blur` |
| `.turn-chip` | the turn chip, `--glass-blur` |
| `.opt` | each answer option card, `--glass-blur` |

`dev` is deleting all four in parallel with this reconciliation. So SM-2 changes status rather than
strength: while they stand the check **fails**, which is the correct reading — the delta's Baseline
2024 note (`unprefixed` supported in Chrome/Edge 120+, Firefox 103+, Safari 18+) makes the unprefixed
declaration the one that must be present, and a redundant `-webkit-` copy is exactly the kind of
surface the delta is replacing. **This check passes only after the deletion lands**, and when it does
that is the evidence the fix landed, not a permanent property. Record the count: four before, zero
after, and a non-zero `withNonZeroOffset` is a separate failure from a non-zero prefixed count — they
are two assertions in one test and both must hold.

The drop-shadow half of the same test has already been satisfied: the old `--shadow: 0 8px 0
rgba(0,0,0,0.18)` token and the `.opt` `0 5px 0 rgba(0,0,0,0.15)` offset are both gone, and every
`box-shadow` now in the file is zero-offset. So this is no longer a before-and-after check on the
shadow half; the prefixed half carries the before-and-after, and the shadow half is a regression
guard.

### SM-3 radii, by membership in a closed set
**Rewritten against the amended S3.** The earlier version of this test asserted the withdrawn rule —
that `9999px` may appear only on a shape circular in both axes: the category dot, the timer track,
and the wheel. That description was **withdrawn as a test** because it contradicts the delta's own
list: the timer track is a wide flat bar, not a circle, so a tester applying the description would
fail a correct implementation. The amended scenario says the **named set is normative and the test is
set membership**. This test now asserts membership against the closed set, and the four exact token
mappings, and nothing about shape.

| | Value |
|---|---|
| The four allowed radii | `0.25rem` (4px), `0.375rem` (6px), `0.5rem` (8px), `9999px` |
| Closed set — the **only** sites a `9999px` radius may appear on | `.wheel`, `.wheel::before`, `.spin-btn`, `.timer`, `.timer-bar`, `.q-cat .dot` — six sites, and the set is closed |
| Exact mapping 1 | `.q-cat` → `--r-md`, `0.375rem` |
| Exact mapping 2 | `.q-player` → `--r-md`, `0.375rem` |
| Exact mapping 3 | `.turn-chip` → `--r-md`, `0.375rem` |
| Exact mapping 4 | `.score-card .slot` → `--r-sm`, `0.25rem` |
| Rejected outright | no radius equals `0.75rem`, the value the generated export gives its `rounded-full` |

The four mappings are **exact rather than indicative**: `--r-md` and `--r-sm` are the named tokens, so
assert the token resolves to the stated rem value, not merely that the value falls somewhere in the
band. `.q-cat .dot` is in the closed set and is not one of the four mappings — a dot is a status node,
not a surface.

```js
// DevTools console. Run once on EACH of the four panels, then read the verdict.
// Only one panel is active at a time, so a single sweep covers one screen and the
// four mappings live on two different screens: .q-cat and .q-player on screen-question,
// .turn-chip and .score-card .slot on screen-wheel. Union the runs.
(() => {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const PILL = 9999, BAND = [0.25, 0.375, 0.5];
  // S3's closed allowed set, as exact tokens matched against each element's id + classes.
  const PILL_OK = new Set(['wheel', 'wheel::before', 'spin-btn', 'timer', 'timer-bar', 'dot']);
  // S3's four exact mappings, keyed by the class the element must carry.
  const EXACT = { 'q-cat': 0.375, 'q-player': 0.375, 'turn-chip': 0.375, 'slot': 0.25 };
  const R2 = n => Math.round(n * 100) / 100;

  window.__radii = window.__radii || [];
  const rows = [];
  for (const el of document.querySelectorAll('.panel *')) {
    if (!el.getClientRects().length) continue;                 // not on screen right now
    const cs = getComputedStyle(el);
    const vals = cs.borderRadius.split(/\s+/);
    if (new Set(vals).size !== 1) { rows.push({ key: '(mixed corners)', raw: cs.borderRadius }); continue; }
    const px = parseFloat(vals[0]);
    const tokens = [el.id, ...el.classList].filter(Boolean);
    rows.push({ key: tokens[0], tokens, raw: cs.borderRadius, px, rem: R2(px / root) });
  }
  // .wheel::before is a pseudo-element: an element sweep can never see it, so read it directly.
  const wb = getComputedStyle(document.getElementById('wheel'), '::before');
  rows.push({ key: 'wheel::before', tokens: ['wheel::before'], raw: wb.borderRadius,
              px: parseFloat(wb.borderRadius), rem: R2(parseFloat(wb.borderRadius) / root) });
  window.__radii.push(...rows);

  const all = window.__radii;
  const pill = all.filter(r => r.px === PILL);
  const offSet = pill.filter(r => !r.tokens.some(t => PILL_OK.has(t)));
  const missing = [...PILL_OK].filter(t => !pill.some(r => r.tokens.includes(t)));
  const offBand = all.filter(r => r.px !== PILL && !BAND.includes(r.rem));
  const threeQuarter = all.filter(r => Math.abs(r.rem - 0.75) < 1e-6);
  const mappings = Object.entries(EXACT).map(([cls, rem]) => {
    const hit = all.filter(r => r.tokens.includes(cls));
    return { cls, want: rem, got: [...new Set(hit.map(r => r.rem))],
             ok: hit.length > 0 && hit.every(r => Math.abs(r.rem - rem) < 1e-6) };
  });
  console.log({
    collected: all.length,                                   // CONTROL: non-empty
    pillSites: pill.length, pillOutOfClosedSet: offSet,      // must be empty
    allowedSitesMissing: missing,                            // CONTROL: the set is not satisfiable by deletion
    outsideBand: offBand, threeQuarterRem: threeQuarter,     // both must be empty
    exactMappings: mappings
  });
})();
```

`pillOutOfClosedSet`, `outsideBand`, and `threeQuarterRem` must all be empty, and every entry of
`exactMappings` must read `ok: true`. Controls, all three load-bearing:

1. **`collected` must be non-empty** before any of it is believed, or "nothing failed" means nothing
   was measured.
2. **`allowedSitesMissing` must be empty.** This is the control that keeps the test from being
   *weakened into passing*: a subset test alone is satisfiable by deleting every `9999px` radius and
   turning the wheel into a square. Requiring all six allowed sites to be present means the pill
   radius has to be spent exactly where the closed set says, no more and no less.
3. **The `collected` list is the record.** A tester pastes the surviving radius per element,
   not a summary, so a reviewer can re-derive the verdict.
4. **A mapping matches by class token on any element carrying it**, and `got` lists every distinct
   value found. If a mapped class ever appears on a second element, both values show up in `got` and
   the entry reads `ok: false` rather than passing on whichever matched. That is deliberate: a
   confusing failure beats a silent one.

The snippet was executed against a stub DOM while writing this, not only read. What that run
established: it reaches a verdict and prints rather than throwing, and it **discriminates** — with the
file's present radii `pillOutOfClosedSet` is non-empty and all four mappings read `ok: false`, and
with the four mappings applied `pillOutOfClosedSet` empties. It also confirmed **control 2 fires**:
deleting every `9999px` radius empties `pillOutOfClosedSet` *and* reports five of the six named sites
missing, so the subset test cannot be satisfied by turning the wheel into a square. The geometry
itself is not verifiable outside a browser; that is the tester's half, and the plan claims nothing
about it here.

**The real before-and-after, and what it now rests on.** The old control was the `24px` card radius,
and it is spent — the card is `--r-lg`, `0.5rem`, in the current file. The replacement is better than
the one it replaces, and it rests on a different thing: **the closed set being closed.** The current
file has exactly ten `--r-pill` consumer declarations, and **four of the ten are outside the closed
set** — `.score-card .slot`, `.turn-chip`, `.q-cat`, and `.q-player`, all four currently `9999px`. Those
four are precisely the four the delta gives exact mappings for, and all four currently hold the wrong
value. So today the test reads: **4 of 10 pill sites out of set, 0 of 4 exact mappings satisfied, 6
of 6 allowed sites present.** A seventh `9999px` anywhere fails, and a deletion of one of the six
fails. The control is no longer "the card radius is wrong"; it is "the list is exhaustive, and four
elements the list does not name are on it." Covers S3.

### SM-4 category accents agree
For each of the six categories, read the accent from three places: the rendered wheel sector, the
category chip on the question screen, and the palette lookup. All three must agree, and the six
accents must be exactly the six hex values in R2, each appearing once. Verify both paths in one
run, the API path and the `FALLBACK` path, per AT-3's third control. Covers S4.

### SM-5 icons are inline, offline, and in the ink their category declares
**Rewritten against the amended S6**, which the previous version of this test could not satisfy and
in fact contradicted. The old S6 required each glyph's fill to *match its category's accent*, but the
wheel paints every sector as a solid saturated accent, so a glyph filled with that same accent
computes to a contrast ratio of exactly **1.00:1** against its own background - invisible on all six
sectors - while the delta's own S4 pins every sector to that exact hex. The old delta contradicted
itself, and this test asserted the contradiction. R3's requirement text now governs: the glyph is
filled with `currentColor` and the wheel hands the label a per-category **contrast ink** from
`ACCENT_BY_NAME[name].on`.

Three assertions, in this order, and the second one is the one the delta's bar cannot do alone.

**1. Structure and offline-ness.** Six inline `<svg>` elements inside the wheel, each with at least
one child, and no `@font-face`, no external stylesheet, no font URL, no image URL. Unchanged from
before and unchanged in strength. **One precision note on "filled with `currentColor`": there is no
`fill="currentColor"` attribute on the `<svg>` elements on disk** - the fill is declared once for all
of them by the rule at `.seg-label .ic svg`. Asserting the attribute would fail a correct file, so
the snippet asserts the **observable** meaning instead: the computed `fill` equals the label's
inherited `colour`. It handles both engine behaviours, in which Chromium either resolves
`currentColor` away to an `rgb()` or leaves the literal token in the computed value, and reports
which path it took in `fillDeclaredAs` so a tester can see it.

**2. The declared ink, which is the requirement's real content.** Each glyph's resolved fill must be
the ink its own category declares - `#090a10` for five categories, `#FFFFFF` for `entretenimiento`.
The snippet derives the chain from the page rather than from a table: the label's own `--a` centre
angle picks its sector out of the wheel's `conic-gradient`, that sector's painted accent identifies
which `ACCENT_BY_NAME` entry declared it, and that entry's `on` is compared against the fill. **This
is paired with a control the 3:1 bar cannot replace, and the reason is measured, not asserted:**
handing every sector the *same* ink still clears 3:1 on all six accents, at a minimum of **4.34:1**,
because `#090a10` happens to be dark enough for every neon in the palette. So a wheel with no
per-category ink at all would pass a literal reading of the amended scenario. The control is that the
six resolved fills must be a bijection onto the six declared inks, which a single global ink cannot
be.

**3. The 3:1 bar, independently.** For **all six**, the WCAG 2.2 contrast ratio between the glyph's
resolved fill and its own sector's painted accent must be at least `3:1`. The delta records six
ratios - `historia` 13.43, `geografia` 14.03, `arte` 5.46, `deportes` 6.92, `ciencia` 14.89,
`entretenimiento` 4.56, minimum 4.56 - and marks them **the architect's own computation, not a
browser measurement**. This test recomputes them from the hexes at run time and **must not** compare
against that table: a hardcoded oracle would keep reporting 4.56 on a file whose glyphs had been
recoloured. The bar is 3:1, and every one of the six is reported so a tester can see the headroom.

**4. The chip.** S6's last clause: the category chip's marker is a **dot** painted in the category's
accent, not a glyph - `.q-cat .dot` exists, its background resolves to the accent, and `.q-cat`
contains no `<svg>`. **The previous version of this test called the absence of a chip glyph a
defect. That was wrong and the clause is dropped rather than inverted:** § Category Chips & Badges
specifies a dot, the code has one, and a chip with a dot is the specified state, not a missing
feature. The clause is now a positive assertion about the dot.

```js
// DevTools console. WHEEL SCREEN - the six .seg-label exist on no other screen.
(() => {
  // The declared palette, read from the page. Never hardcoded here: the architect's
  // six ratios are their own arithmetic, not an oracle this test may compare against.
  const DECL = (typeof ACCENT_BY_NAME === 'object' && ACCENT_BY_NAME) ? ACCENT_BY_NAME : null;
  const wheel = document.getElementById('wheel');
  const labels = [...document.querySelectorAll('.seg-label')];
  const svgs = [...document.querySelectorAll('.seg-label .ic > svg')];

  // CONTROL 1, anti-vacuity, carried over from the previous SM-5: a page with no icons
  // passes "no bad contrast" and "no ligature" trivially, so assert they exist first.
  if (labels.length !== 6 || svgs.length !== 6 || svgs.some(s => !s.children.length)) {
    return { CONTROL_FAILED: { labels: labels.length, svgs: svgs.length,
      emptySvgs: svgs.filter(s => !s.children.length).length },
      why: 'contrast and ligature checks are both vacuous without six non-empty glyphs' };
  }
  if (!DECL) {
    return { CONTROL_FAILED: { declaredPaletteReachable: false },
      why: 'ACCENT_BY_NAME is not reachable here, so the declared inks cannot be checked' };
  }

  // Canonicalise any colour to [r,g,b] through a probe, so a hex and its rgba() twin compare equal.
  const rgbOf = (css) => {
    const p = document.createElement('span');
    p.style.color = css;
    document.body.appendChild(p);
    const m = getComputedStyle(p).color.match(/[\d.]+/g).map(Number);
    p.remove();
    return m.slice(0, 3);
  };
  const lum = ([r, g, b]) => [r, g, b]
    .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');

  // Each sector's own paint, parsed from the wheel's conic-gradient by degree range.
  const stops = [...getComputedStyle(wheel).backgroundImage
    .matchAll(/rgba?\([^)]+\)\s*(-?[\d.]+)deg\s*(-?[\d.]+)deg/g)]
    .map(m => ({ rgb: rgbOf(m[0].slice(0, m[0].indexOf(')') + 1)), from: +m[1], to: +m[2] }));
  if (stops.length !== 6) {
    return { CONTROL_FAILED: { gradientStops: stops.length },
      why: 'the six sector paints could not be read, so "its own sector accent" has no meaning' };
  }

  const per = labels.map((label, i) => {
    const svg = label.querySelector('.ic > svg') || svgs[i];
    const lb = label.querySelector('.lb');

    // The glyph's resolved fill. currentColor may or may not have been computed away.
    const rawFill = getComputedStyle(svg).fill;
    const fillCss = /currentcolor/i.test(rawFill) ? getComputedStyle(label).color : rawFill;
    const fill = rgbOf(fillCss);
    const labelInk = rgbOf(getComputedStyle(label).color);

    // This label's sector, by its own --a centre angle, and the entry that declares that accent.
    const a = parseFloat(getComputedStyle(label).getPropertyValue('--a'));
    const sector = stops.find(s => a >= s.from && a < s.to);
    const decl = Object.entries(DECL).find(([, v]) => String(rgbOf(v.accent)) === String(sector.rgb));

    const declared = decl ? rgbOf(decl[1].on) : null;
    return {
      category: decl ? decl[0] : 'UNRESOLVED',
      sectorAccent: hex(sector.rgb),
      centreAngle: a,
      glyphFill: hex(fill),
      fillDeclaredAs: rawFill,
      labelInk: hex(labelInk),
      declaredInk: declared ? hex(declared) : null,
      sameColourAsLabel: String(fill) === String(labelInk),
      fillIsDeclaredInk: declared ? String(fill) === String(declared) : false,
      ratio: +ratio(fill, sector.rgb).toFixed(2),
      meets3to1: ratio(fill, sector.rgb) >= 3
    };
  });

  // CONTROL 2, the one the 3:1 bar cannot do alone. Handing every sector the same ink
  // still clears 3:1 on all six (minimum 4.34:1), so the ratio check alone would pass a
  // wheel with no per-category ink at all. The declared inks must be a bijection.
  const fills = per.map(p => p.glyphFill);
  const declaredAll = Object.values(DECL).map(v => hex(rgbOf(v.on)));
  const distinctFills = new Set(fills).size;
  const distinctDeclared = new Set(declaredAll).size;

  return {
    per,
    allMeet3to1: per.every(p => p.meets3to1),
    minimumRatio: Math.min(...per.map(p => p.ratio)),
    allSameColourAsLabel: per.every(p => p.sameColourAsLabel),
    allFillIsDeclaredInk: per.every(p => p.fillIsDeclaredInk),
    distinctFillsObserved: distinctFills,
    distinctInksDeclared: distinctDeclared,
    inkIsCategoryDerived: distinctFills === distinctDeclared && per.every(p => p.fillIsDeclaredInk)
  };
})();
```

**How a tester runs it.** Wheel screen, hard refresh, **before any spin** - the wheel's own
`transform: rotate()` does not affect these readings, but a spin does move the labels. Paste the
snippet once. Read the verdict: `allFillIsDeclaredInk` and `inkIsCategoryDerived` must both be
`true`, `allMeet3to1` must be `true`, and `minimumRatio` must be at least `3` (currently 4.56).
`distinctFillsObserved` must be `2` and `distinctInksDeclared` `2` - five categories share one ink and
`entretenimiento` is the other, so two distinct values is correct and **six would mean the sector
accents stopped reaching the labels**. `CONTROL_FAILED` is a failure, not a skip, and says which
precondition was missing.

**This snippet was run, not just written.** Against a stub DOM whose computed values are fed as
pixels, in seven configurations: the real palette passes every bar at a minimum of 4.56; **all-ink
passes 3:1 at 4.34 and is caught only by the declared-ink control**; the old S6's own-accent fill
fails at 1.00; missing glyphs trip the anti-vacuity control; an unreadable gradient and an
unreachable `ACCENT_BY_NAME` each trip their own; and a computed fill left as the literal
`currentcolor` reaches the same verdict through the fallback path. 9 of 9 harness assertions passed.
Covers S6.

### SM-6 no literal ligature name
The mockup writes Material Symbols ligature names as text: `hourglass_top`, `sports_soccer`,
`public`, `palette`, `science`, `movie` (`stitch/code.html:243-299`). If that webfont silently fails
to load, the browser renders the literal string. Static grep for `material-symbols`, `Material Icons`,
`@font-face`, and each of those six names. DOM check for a text node matching `/^[a-z]+(_[a-z0-9]+)+$/`
with no element children. **Control, mandatory:** assert six icon elements exist and are non-empty
first, otherwise "no ligature found" passes trivially on a page with no icons. R3 chose inline SVG, so
the expected form is six `<svg>` elements. Covers S6.

### SM-7 document self-contained
Collect every `src`, `href`, `url()`, `@import`, and `background-image` reference. Each must be
absent, a fragment, or a data URI. Then, with the network panel recording and preserve-log on, play
from the name screen to the winner screen and confirm every request went to the local API.
**Control:** the panel must be shown to be recording, by confirming the document, `/categories`, and
at least one `/questions/category/...` appear in it. Without that, "no external requests" proves
nothing. Covers S17.

### SM-8 spin settle timing
Read the wheel's transition duration and the completion timeout from the source. Both must be
between `3.5s` and `4.5s`, and within `300ms` of each other, per S10. Today they are `4.2s` (`:339`)
and `4300` (`:344`), which pass today, so the check is a regression guard on a value the restyle
touches. Also confirm clicking mid-spin does not start a second spin. Covers S10.

### SM-9 the three feedback states are distinct
Across three questions in one match, one answered correctly, one incorrectly, one timed out, read
the computed treatment of each: `#05FFA1` = `rgb(5, 255, 161)`, `#FF2A6D` = `rgb(255, 42, 109)`, and
`#FFD000` = `rgb(255, 208, 0)`, each on a 20% alpha tint, the timed-out one with a `1px` `#FFD000`
border at 40% alpha and its text on `#e3e1eb` at full contrast. Assert the timed-out treatment uses
neither `#FF2A6D` nor `#05FFA1`, per the delta's reasoning that a timeout is not a wrong answer and
is not a point scored. Control: all three states must actually have been produced, which means one
correct, one wrong, and one timeout each occurred. Covers S11.

### SM-10 the timeout state, specifically
On the timeout question, assert the score is unchanged from before the question, the option matching
the stored answer is marked correct and visible, and the feedback strip states the time ran out. The
stored answer is read from `GET /questions/category/{name}?limit=200` for the current category, which
is what makes this a test rather than an impression. Control: record the score before the question
renders, so "unchanged" is a comparison and not an absence. Covers S12, and the revealed-answer half
of S11.

### SM-11 scoring, exact
For the current question, click each of the three wrong options in three separate replays and the
stored answer in a fourth. Score delta must be 0, 0, 0, and exactly +1. Read `answer` from the API
rather than from the rendered card, since `project.md` warns that `Question.category` and
`Categorization.category_name` are not interchangeable and only `answer` decides the point.
Control: assert a score delta of exactly +1 for the stored answer, not merely "the score went up".
Covers S13.

### SM-12 bar and outcome synchronized
On a live question, record `performance.now()` when the question renders and when the feedback
appears, and sample the bar's colour at expiry. The delta measured must be 20000ms ± 500, and the bar
must already be `#FF2A6D` at that moment, because the shift fires at 16000ms and expiry is at
20000ms. If the bar is still green at expiry, the ticker and the timeout disagree, which no pure
function test can see. Control: the sample must be taken at expiry, not at an arbitrary moment.

```js
const t0 = performance.now();
const obs = new MutationObserver(() => {
  const bar = document.getElementById('tbar');
  console.log('EXPIRED after', Math.round(performance.now() - t0), 'ms; bar colour',
    getComputedStyle(bar).backgroundColor, '/', getComputedStyle(bar).backgroundImage);
  obs.disconnect();
});
obs.observe(document.getElementById('q-feedback'), { childList: true, subtree: true, characterData: true });
```

Covers S14.

### SM-13 fixed single-screen shell
At any moment, exactly one element has class `panel active`, and its id is one of `screen-start`,
`screen-wheel`, `screen-question`, `screen-winner`. Then resize through viewport heights from 320px
to 1200px and confirm `document.documentElement.scrollWidth <= window.innerWidth` at each, and that
`body` keeps `overflow: hidden` and the panel container keeps `position: fixed; inset: 0`. Control:
the active-panel query must be run at least once per panel reached, not once. Covers S15.

### SM-14 dead decorative markup is gone
Zero DOM elements match `.cloud`, `.sun`, `.mountain`, `.ground`, `.tree`, and no stylesheet rule
targets any of those five class names. Also check the `drift` keyframes and its `animation`
declarations, which `tasks.md` 4.6 removes alongside the markup and which S16 does not name. The
**pre-change baseline** file has all five classes at `:156-165` and their CSS at `:29-53`; that is the
before this test was written against, and those are baseline citations, not current ones. The current
file no longer carries any of the five class names or the `drift` keyframes, so **this is now a
regression guard rather than a before-and-after**: a re-added `.cloud` or a re-added `drift` keyframe
fails it, and nothing else does. Controls: assert the query ran against a real document, that the
style block was readable, and that the page still renders. Covers S16.

### SM-15 request-path set over a full match
With the network panel recording, play from the name screen to the winner screen. The only paths
requested must be `/`, `/categories`, and `/questions/category/{category_name}?limit=200`. Then
confirm `GET /questions/{question_id}` and `GET /categories/stats` are unchanged and still available,
which is the delta's plural-route requirement and a check on `app/`, not on the frontend.
Controls: the panel must be shown to be recording, and the set must be compared against the three
declared paths, so a fourth path fails rather than being ignored. Covers S17, S23.

### SM-16 type roles, the 18px floor, and the timer as a graphic
**Rewritten against the amended S18.** The previous version of this test read the computed
`font-family` of **the timer** and required a monospace family. There is no such thing to read:
`#q-timer` is a `<div>` containing only `<div id="tbar">`, `.timer` declares no `font-family` and no
text, and the 20 seconds are a shrinking `width` percentage. The criterion was **unsatisfiable**, and
a tester following it would have filed a failure against a correct file. Satisfying it would have
required adding exactly the numeric readout the proposal excludes. The amended R9 drops the timer from
the monospace role list and forbids a numeric countdown outright, so the assertion is removed rather
than relaxed - it is not a weakened test, because there is no longer any text in the timer to
typeset.

**1. Six named readouts, one family, and it is not `body`'s.** S18 names them with selectors:
`.spoints`, `.q-cat`, `.q-player`, `.opt .letra`, `.seg-label .lb`, and the winner screen's
`.wscore`. All six must resolve to **one** family string, and that string must **not** be what `body`
resolves to. **The scenario's `GIVEN` says "the question screen", and no single screen carries all
six** - `#scoreboard` lives inside the wheel panel, `.seg-label .lb` only exists on the wheel, and
`.wscore` only on the winner. The largest co-resident set is four, on the question panel. The test is
therefore read **per panel**, and the per-panel minima are part of the control: question panel 4,
wheel panel 2, winner panel 1, totalling six distinct selectors. `isSystemStack` must be true, so
the family is a stack of fonts the OS already has - which is what keeps S17's offline clause true.

**2. The question floor.** `.question-text` must compute to at least `18px`. Unchanged, and it is
still a regression guard rather than a before-and-after: the pre-change baseline had a `17px` floor
and the current file reads `clamp(1.125rem, 4.5vw, 1.625rem)`, an `18px` floor. Read it **at a 320px
viewport**, not at desktop width, where any value passes.

**3. The timer is a graphic, and it publishes its seconds.** The new clause, and a real behaviour
check rather than a styling read. `#q-timer` must carry **no text node**, and its `aria-valuenow`
must be **maintained and counting down** across a live turn. The attribute has to be *observed*,
because reading it once at an arbitrary moment cannot distinguish a countdown from a stuck value -
which is the same defect shape SM-12 exists to catch in the bar. The snippet watches the attribute
for a full 20 seconds and reports the series.

```js
// DevTools console. Two functions, because one is instant and the other takes 20 seconds.
function SM16_FONTS() {
  const READOUTS = [['.spoints', 'score readout'], ['.q-cat', 'category tag'],
    ['.q-player', 'turn chip'], ['.opt .letra', 'option index'],
    ['.seg-label .lb', 'sector label'], ['.wscore', 'winner score']];
  const body = getComputedStyle(document.body).fontFamily;
  const screen = [...document.querySelectorAll('.panel.active')].map(p => p.id)[0] || 'none';
  const readouts = READOUTS.map(([sel, role]) => {
    const el = document.querySelector(sel);
    return { sel, role, present: !!el, family: el ? getComputedStyle(el).fontFamily : null };
  });
  const present = readouts.filter(r => r.present && r.family);
  const families = [...new Set(present.map(r => r.family))];

  // CONTROL: zero readouts on this screen would make "all one family" vacuously true.
  // presentCount is the number of record; the per-panel minima are 4, 2 and 1.
  return {
    screen, presentCount: present.length, distinctFamilies: families, bodyFamily: body,
    oneFamily: present.length > 0 && families.length === 1,
    differsFromBody: present.length > 0 && families.length === 1 && families[0] !== body,
    isSystemStack: families.length === 1
      && /Cascadia|Consolas|SF Mono|Menlo|Dejavu Sans Mono|ui-monospace|monospace/i.test(families[0]),
    missingHere: readouts.filter(r => !r.present).map(r => r.sel), readouts
  };
}

function SM16_TIMER() {
  const t = document.getElementById('q-timer');
  if (!t) return console.warn('SM-16 CONTROL FAILED: #q-timer is not in the document');
  // R9: a pure graphic with no text node, so no font-family governs any glyph in it.
  const textNodes = [...t.childNodes]
    .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(s => s !== '');
  const seen = [];
  const read = () => seen.push({ at: Math.round(performance.now()), now: Number(t.getAttribute('aria-valuenow')) });
  read();
  const mo = new MutationObserver(read);
  mo.observe(t, { attributes: true, attributeFilter: ['aria-valuenow'] });
  setTimeout(() => {
    mo.disconnect();
    const distinct = [...new Set(seen.map(s => s.now))];
    const nonIncreasing = distinct.every((v, i) => i === 0 || v <= distinct[i - 1]);
    console.log('SM-16 timer, verdict', JSON.stringify({
      hasTextNode: textNodes.length > 0,
      textNodeContent: textNodes,
      mutationsObserved: seen.length - 1,
      distinctValues: distinct.length,
      first: distinct[0], last: distinct[distinct.length - 1],
      nonIncreasing,
      valuemax: Number(t.getAttribute('aria-valuemax')),
      role: t.getAttribute('role'),
      // CONTROL: fewer than 8 distinct values means it never counted down, whatever
      // the attribute happened to read at the end.
      countedDown: distinct.length >= 8 && nonIncreasing && distinct[0] === 20 && distinct[distinct.length - 1] <= 1,
      series: distinct.join(',')
    }, null, 1));
  }, 21000);
}
```

**How a tester runs it.** Hard refresh. `SM16_FONTS()` three times: on the **start or wheel** panel
for `.spoints`, on the **question** panel for `.q-cat`, `.q-player` and `.opt .letra`, on the
**wheel** panel again for `.seg-label .lb`, and on the **winner** panel for `.wscore`. Each call must
report `oneFamily: true` and `differsFromBody: true`, with `presentCount` at or above the per-panel
minimum and `missingHere` naming exactly the selectors that live elsewhere. Then reach a question
with the turn open and call `SM16_TIMER()`; it logs a verdict after 21 seconds. `countedDown` must be
`true`, `hasTextNode` `false`, `first` `20`, `last` `1` or `0`, `nonIncreasing` `true`, and `role`
`progressbar`. `distinctValues` is currently about 20 - one per second - and anything under 8 trips
the control.

**This snippet was run.** Against a stub DOM in the six real selector/panel combinations, the
question panel reports 4 present, one family, different from `body`, and a system monospace stack;
the wheel panel contributes 2 more and names the 4 it cannot see; the winner panel contributes the
sixth. The control fires: an empty panel reports `presentCount: 0` and `oneFamily: false`, so
"all one family" cannot be reached by reading nothing. The `SM16_TIMER` half is a browser
`MutationObserver` over a real 20-second turn and is **not** claimed as executed here; its control
threshold is set at 8 distinct values precisely so that a stuck attribute fails rather than passing
on a single lucky read. Covers S18.

### SM-17 index tags, the category chip, and the pre-lock accent affordance
**Extended against the amended R10/S19.** The previous version of this test covered the index tags
and the chip and had no clause for the state R10 defined, because **that state did not exist**: the
old R10 said "on selection the card's border SHALL take the active category's accent", but the game
resolves on click - `pickAnswer` calls `finishQuestion`, which sets `answered`, disables every option
and writes `right` or `wrong` in the same frame, and `classList.add` is only ever called with those
two strings. An accent border written at click time is overwritten before it can be seen, so the old
wording demanded a frame the interaction model does not have and **no scenario tested it anywhere**.
`architect` explicitly did not authorise a lock delay or a confirm step, because `project.md`
describes no answer-confirmation delay and inventing one would add product behaviour nobody asked
for.

The amended R10 relocates "selection" onto the two states that do exist -
`.opt:hover:not(:disabled)` and `.opt:focus-visible` - both pre-lock. Both are named deliberately:
Chromium does not match `:focus-visible` on a mouse click, so a focus-only instrument would be
invisible to a mouse player.

**1. Index tags, unchanged.** The four cards' tags are exactly `A`, `B`, `C`, `D`, one each, in the
shuffled presentation order rather than the stored `option_a` to `option_d` order. Control: assert
four tags were found before asserting their letters.

**2. The chip, unchanged.** `.q-cat` names the selected category and carries its accent on a glowing
dot.

**3. New: the pre-lock affordance, in two halves.** With the turn open on the question screen, both
`.opt:hover:not(:disabled)` and `.opt:focus-visible` must take the card's **border to the active
category's accent** and add a **chromatic glow in that same accent, with zero `x` and `y` offset**,
and the resolved values must follow the accent rather than sit at a fixed hue.

- **The static half needs no pointer at all** and is the one that finds a hard-coded hue. It reads
  the stylesheet, requires both selectors to exist, requires each to resolve its border and its glow
  from the accent token published on `#screen-question`, and requires every glow layer's offsets to
  be zero.
- **The rendered half reads a card's computed border and glow** under a state the tester has
  already forced, and compares against the accent read from the same element. It is run three times -
  `BASE` unforced, `FORCED` after forcing, and `FORCED` again with `--accent` temporarily pointed at
  a second category. `BASE` and `FORCED` must **differ**, which is the control: if the tester forgot
  to force the pseudo-state the two readings are identical and the test fails instead of passing.
  The third read is the anti-hardcode control, because the two glow hues must differ from each other.
- **Forcing the states without moving a mouse.** `:hover` cannot be set from script in Chromium; use
  the **Styles pane's "Force pseudo-state"** on the card (right-click the element in the Elements
  tree, or the `\:hov` / `\:hov` chips at the top of the rule), which forces `:hover` and
  `:focus-visible` reliably. `:focus-visible` can also be reached for real by pressing `Tab` until a
  card has focus, since the cards are `<button>`s. **A recorded test must not depend on physically
  moving a pointer**, which is why the static half exists and why the accent is read from the
  published token rather than from a category the tester has to reach by playing.

**The glow radius is deliberately not asserted.** `DESIGN.md` says `0 0 16px` in § Answer Option
Cards and `0 0 20px` in § Elevation & Depth, the design contradicts itself, and `architect` declined
to invent a resolution. The snippet **reports** each layer's third length and no assertion reads it,
so a correct implementation at either radius passes. A tester who "fixes" a 16px glow to 20px to make
a note disappear has broken the spec, not satisfied it.

```js
// DevTools console. SM17_STATIC()  - reads the stylesheet. Instant, no pointer needed.
// SM17_STATE(which) - reads one card's border and glow under a state already forced.
function SM17_STATIC() {
  const want = ['.opt:hover:not(:disabled)', '.opt:focus-visible'];
  const sheet = [...document.styleSheets].find(s => { try { return s.cssRules.length; } catch { return false; } });
  if (!sheet) return console.warn('SM-17 CONTROL FAILED: no readable stylesheet');

  const accentRef = /var\(\s*--(accent|ink-contrast|on-accent)/;
  const splitLayers = (v) => {           // split on top-level commas only: rgba() has commas too
    const out = []; let depth = 0, cur = '';
    for (const ch of v) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  // A declared length may carry px, rem, em, or nothing at all - the stylesheet writes
  // "0 0 1.25rem", so the offsets are UNITLESS zeros. A parser that requires "px" reads
  // every such layer as unparseable, and an unparseable layer must not be scored "zero".
  const LEN = '(-?[\\d.]+(?:px|rem|em|%)?)';
  const lengthsOf = (layer) => {
    const s = layer.replace(/^\s*inset\s+/, '').trim();
    const m = new RegExp('^' + LEN + '\\s+' + LEN + '\\s+' + LEN + '?').exec(s);
    if (!m) return null;
    // Unitless is only legal CSS for zero, and it means px.
    const px = (v) => (v === '' || /^[+-]?0(\.0+)?$/.test(v) ? parseFloat(v || '0') : null);
    return { x: px(m[1]), y: px(m[2]), blur: m[3] || null };
  };
  const offsetsOf = (layer) => {
    const l = lengthsOf(layer);
    return l ? { x: l.x, y: l.y } : null;
  };
  // Everything after the lengths is the colour. A glow "derived from the accent" must
  // still be written as a reference to the published token, not a literal hue.
  const colourOf = (layer) => layer.replace(/^\s*inset\s+/, '')
    .replace(/^(-?[\d.]+px\s+){2,4}/, '').trim();

  const out = want.map((sel) => {
    const rules = [...sheet.cssRules].filter(r => r.selectorText && r.selectorText.split(',')
      .some(s => s.trim() === sel));
    if (!rules.length) return { selector: sel, ruleFound: false };
    const decls = rules.map(r => r.style);
    const border = decls.map(d => d.getPropertyValue('border-color') || d.getPropertyValue('border'));
    const shadow = decls.map(d => d.getPropertyValue('box-shadow'));
    const layers = shadow.flatMap(s => (s ? splitLayers(s) : []));
    return {
      selector: sel, ruleFound: true, declarations: rules.length,
      border, shadow,
      borderFollowsAccent: border.every(b => b && accentRef.test(b)),
      glowFollowsAccent: layers.length > 0 && layers.every(l => accentRef.test(colourOf(l))),
      layers,
      offsets: layers.map(offsetsOf),
      // THE unpinned dimension. Reported, never asserted: DESIGN.md says 0 0 16px in one
      // section and 0 0 20px in another and the delta declines to choose.
      radii: layers.map(l => { const g = lengthsOf(l); return g ? g.blur : null; }),
      // A layer whose offsets cannot be parsed is NOT counted as zero. It fails.
      zeroOffset: layers.length > 0 && layers.every(l => {
        const o = offsetsOf(l);
        return o && o.x === 0 && o.y === 0;
      })
    };
  });

  const panel = document.getElementById('screen-question');
  const published = panel ? ['--accent', '--accent-soft', '--accent-glow']
    .map(p => [p, panel.style.getPropertyValue(p) || null]) : [];
  console.log('SM-17 static, verdict', JSON.stringify({
    publishedOnScreenQuestion: published,
    accentPublished: published.some(([n, v]) => n === '--accent' && v),
    accentGlowPublished: published.some(([n, v]) => n === '--accent-glow' && v),
    rules: out
  }, null, 1));
}

function SM17_STATE(which) {
  const panel = document.getElementById('screen-question');
  const card = document.querySelector('.opt');
  if (!panel || !card) return console.warn('SM-17 CONTROL FAILED: no option card on screen');
  const cs = getComputedStyle(card);
  const accent = panel.style.getPropertyValue('--accent').trim();
  // Canonicalise through a probe on BOTH sides. Comparing a computed "rgb(255, 42, 109)"
  // against a raw "#FF2A6D" fails on formatting, not on colour.
  const canon = (css) => {
    const p = document.createElement('span');
    p.style.color = css; document.body.appendChild(p);
    const out = getComputedStyle(p).color; p.remove(); return out;
  };
  const accentRgb = canon(accent);
  const borderRgb = canon(cs.borderColor);
  // Hue of a colour, so an alpha-reduced accent still counts as "derived from" it.
  const hueOf = (rgbStr) => {
    const nums = (rgbStr || '').match(/[\d.]+/g);
    if (!nums) return null;
    const [r, g, b] = nums.slice(0, 3).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return null;                       // achromatic: no hue to compare
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round((h * 60) % 360);
  };
  const glowColour = (cs.boxShadow.match(/rgba?\([^)]+\)/) || [''])[0];
  console.log('SM-17 state "' + which + '", verdict', JSON.stringify({
    accentPublished: accent, accentRgb, accentHue: hueOf(accentRgb),
    borderColor: cs.borderColor, borderRgb,
    borderEqualsAccent: borderRgb === accentRgb && borderRgb !== '',
    boxShadow: cs.boxShadow,
    // The radius is deliberately absent from every assertion here.
    glowColour, glowHue: hueOf(glowColour),
    glowHueMatchesAccent: hueOf(glowColour) !== null && hueOf(glowColour) === hueOf(accentRgb),
    cardDisabled: card.disabled
  }, null, 1));
}
```

**How a tester runs it.** Question screen, turn open. **1.** `SM17_STATIC()` - both selectors must
report `ruleFound: true`, `borderFollowsAccent: true`, `glowFollowsAccent: true`, and
`zeroOffset: true`; `radii` is informational. **2.** `SM17_STATE('BASE')` unforced. **3.** Force
`:hover` on a card in the Styles pane, then `SM17_STATE('FORCED hover')` - `borderEqualsAccent` and
`glowHueMatchesAccent` must be true. **4.** Release the forced state, force `:focus-visible` (or press
`Tab` to the card), then repeat - same two verdicts. **5.** With the state still forced, run
`document.getElementById('screen-question').style.setProperty('--accent', '#00F0FF')` and read again:
`glowHue` must now be about 184 and not the previous value; then remove that inline property to
restore. **6.** `document.querySelectorAll('.opt.selected').length` must be `0`, and after answering,
the clicked card's border must be `#05FFA1` or `#FF2A6D` and **not** the category accent.

**This snippet was run, and running it found two bugs in the snippet itself**, which is the reason
for reporting it this way. The zero-offset parser originally demanded `px` and therefore scored every
real layer unparseable; because an unparseable layer was being read as "zero", a declaration written
`4 4 1.25rem` - unitless, and legal only for zero in CSS - would have **passed**. It now parses
`px`/`rem`/`em`/unitless, normalises a unitless zero to `0`, and **fails** a layer it cannot parse.
The rendered half originally compared a computed `rgb()` against a raw hex, so its verdict depended
on formatting; both sides now go through the same probe. Against the real stylesheet and the
pre-fix rules `architect` quoted: the pre-fix focus rule is rejected as a fixed hue and the pre-fix
hover rule is rejected for declaring no glow, while the current file passes both selectors on accent
and zero offset; an `inset` ring and a unitless offset are handled correctly; `4px 4px` and `4 4` are
both rejected on `zeroOffset`; and `16px` and `20px` radii **both pass**, which is the check that the
unpinned dimension stays unpinned. 23 of 23 harness assertions passed. Covers S19, and the hover and
focus halves of the amended R10.

### SM-18 breakpoints, the compact tier, and label containment
**Rewritten against the amended S20**, which adds a third breakpoint this test did not know about. It
now has four halves, and they are the four things S20 says.

**Half 1, static — the declared breakpoint set.** The stylesheet declares `768px` and `1024px`,
declares no `420px`, and declares **exactly one further breakpoint, `640px`**, whose effect is confined
to the wheel and its sector labels. Count `@media` rules across the whole stylesheet: there must be
**three in total**, and their conditions must be exactly `min-width: 768px`, `min-width: 1024px`, and
`max-width: 640px`. The confinement is checked by selector: every selector declared inside the `640px`
block must be one of `:root`, `.seg-label`, `.seg-label .ic svg`, `.seg-label .lb` — and `:root` is
admissible only because the one property it sets there is `--wheel-size`, so confirm by grep that
`--wheel-size` is consumed **only** by `.wheel-wrap` (its width and height) and by `.seg-label` (as
`--seg-r`). Nothing else may read the token, or the tier is not confined.

**Half 2, the grid shape.** Unchanged from before: on the question screen, at `600px` the four options
are a single column; at `900px` and at `1280px` they are two columns of two; at `1280px` the gameplay
hub does not exceed `840px`. Control: measure `getComputedStyle(grid).gridTemplateColumns` and count
the tracks, so "two columns" is a count and not an impression. `600px` specifically: raising the
stacking threshold from `420px` to `768px` means that width now stacks where it previously showed a
2×2 grid, and the delta calls this out as a consequence to be checked rather than discovered. `600px`
is also below `640px`, so it exercises the compact tier in the same run — the delta asks for exactly
that and MT-10 covers the human half.

**Half 3, containment — the sharpest new check in this plan.** At `320px` and at `639px` of viewport
width, on the wheel screen, the bounding rectangle of each of the six `.seg-label` elements is
contained within the wheel's bounding rectangle, with no clipping and no horizontal document
overflow. This is a rectangle comparison, not "it looks contained", and it is the check that would
catch a label corner crossing the rim where a screenshot review would not: a label that overflows by
three pixels is invisible at a glance and fails here.

```js
// DevTools console. WHEEL SCREEN, BEFORE ANY SPIN, device toolbar at the width under test.
(() => {
  const wheel = document.getElementById('wheel');
  const labels = [...document.querySelectorAll('.seg-label')];
  const wr = wheel.getBoundingClientRect();

  // CONTROL 1 - the panel must be on screen. A hidden panel reports 0x0 rects, and
  // "0x0 contained in 0x0" is TRUE, so an unasserted visibility makes this test vacuous.
  const panel = document.getElementById('screen-wheel');
  const live = labels.filter(l => l.getClientRects().length > 0 && l.getBoundingClientRect().width > 0);
  if (!panel.classList.contains('active') || wr.width === 0 || labels.length !== 6 || live.length !== 6) {
    return { CONTROL_FAILED: {
      wheelPanelActive: panel.classList.contains('active'), wheelWidth: wr.width,
      labelsFound: labels.length, labelsWithRealArea: live.length },
      why: 'containment is meaningless until six real label boxes are measured' };
  }
  // CONTROL 2 - the wheel must be at rest. Its own transform: rotate() moves every label.
  const rotation = getComputedStyle(wheel).transform;

  const per = live.map((l, i) => {
    const r = l.getBoundingClientRect();
    const slack = { left: wr.left - r.left, right: r.right - wr.right,
                    top: wr.top - r.top, bottom: r.bottom - wr.bottom };
    const misses = Object.entries(slack)
      .filter(([, v]) => v < 0)
      .map(([k, v]) => `${k} by ${(-v).toFixed(1)}px`);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const centre = { x: wr.left + wr.width / 2, y: wr.top + wr.height / 2 };
    return { i, label: l.textContent.trim().slice(0, 24),
             box: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
             radialFraction: +(Math.hypot(cx - centre.x, cy - centre.y) / wr.width).toFixed(4),
             slack: Object.fromEntries(Object.entries(slack).map(([k, v]) => [k, +v.toFixed(1)])),
             contained: Object.values(slack).every(v => v >= 0), misses };
  });

  // CONTROL 3 - "no clipping". Anything between a label and the wheel that clips is a
  // finding, because nothing in that chain is meant to clip. body/html above the wheel
  // DO clip - R7 mandates body { overflow: hidden } - so they are reported, not failed.
  const inside = [], outside = [];
  for (let p = live[0].parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p), tag = p.id ? '#' + p.id : (p.classList.length ? '.' + [...p.classList].join('.') : p.tagName);
    if (o.overflowX !== 'visible' || o.overflowY !== 'visible') (wheel.contains(p) ? inside : outside).push(tag);
  }

  return {
    viewportWidth: window.innerWidth, wheelBox: +wr.width.toFixed(1), wheelTransform: rotation,
    contained: per.filter(p => p.contained).length + ' / 6',
    radialFraction: [...new Set(per.map(p => p.radialFraction))],
    labelBox: [...new Set(per.map(p => p.box))],
    perLabel: per,
    clippersBetweenLabelAndWheel: inside,          // must be empty
    clippersAboveWheel: outside,                    // expected to contain body and html
    horizontalOverflowPx: { documentElement: document.documentElement.scrollWidth - window.innerWidth,
                            body: document.body.scrollWidth - window.innerWidth }   // neither may be > 0
  };
})();
```

**How a tester runs it.** Four runs, in this order, and the viewport width is printed in the result
so it cannot be forgotten which width a verdict belongs to:

| Run | Device toolbar | Screen | What must read |
|---|---|---|---|
| 1 | `320 × 800` | wheel screen, at rest, before any spin | `contained: '6 / 6'`, `radialFraction: [0.32]`, `labelBox` ≈ `68.0x…`, both `horizontalOverflowPx` values ≤ 0, `clippersBetweenLabelAndWheel` empty |
| 2 | `639 × 900` | same | same as run 1 |
| 3 | `641 × 900` | same | `contained: '6 / 6'`, `radialFraction: [0.36]`, `labelBox` ≈ `92.0x…` — the default offset and full box are back |
| 4 | `600 × 900` | question screen | single column; then Half 2's `900px` and `1280px` grid-shape reads |

Reach the wheel screen by entering two different names and pressing start; the wheel is built on load
but it is only *laid out* while its panel is active, which is exactly what Control 1 exists to catch.
Hard refresh (Ctrl+F5) after any frontend edit; see section 3 on why.

**Half 4 is `641px` and above**, and the same snippet measures it: `radialFraction` must be `0.36` —
the default fraction of the wheel size — and the label box at its full `5.75rem` width, ≈92px. Below
`640px` those become `0.32` and ≈68px. Reading the fraction off the geometry rather than off
`getComputedStyle(el).getPropertyValue('--seg-r')` is deliberate: the computed value of a custom
property is the *specified* token, `calc(min(75vw, 460px) * -0.36)`, not a resolved length, so reading
the property would assert a string and not a measurement.

**Two scope notes, so nobody strengthens this by accident.** S20 names the **bounding rectangle** of
the wheel, not its inscribed circle, and that is what is asserted; a circle test would be stricter
and is not required. And the label boxes stay upright at every rotation, because the label's
transform ends in a counter-rotation, so its `getBoundingClientRect()` is its own `width x height`
rather than an axis-aligned bound of a tilted box — the measurement is stable and no tolerance is
needed on the edges. Slack is reported in pixels so a near miss reads as a number instead of a
boolean. Covers S20.

**This half is brittle by construction, on purpose, and the reason is recorded in section 10.** S20's
"exactly one further breakpoint" counts `@media` rules in the whole stylesheet, so it fails the moment
a `prefers-reduced-motion` query lands — and `proposal.md` defers reduced-motion to its own change.

### SM-19 document identity
`document.documentElement.lang === 'es'` and `document.title === '¡Preguntados 1v1!'`. Both currently
hold (`:2`, `:6`) and both are restyle-adjacent enough to be clobbered. Control: read both, do not
assert one and assume the other. Covers S22.

### SM-20 no route, schema, or Compose change
`curl.exe` the plural route and the stats route before and after and compare status and shape. Then
HASH-1. See section 3 for the hashes and section 9 for why `git status` is not the instrument.
Covers S23.

### HASH-1 must-not-change files
Rerun SHA-256 over the ten files in section 3. The first ten must be byte-identical to the recorded
values. `frontend/index.html` is expected to change, and that is the only production file allowed to.
Control: the comparison must be against the recorded baseline and not against "whatever is there
now". Covers S23.

### MT-1 names and inputs
Two names trim. Identical names, case-insensitively, are rejected with a visible message and no match
begins. `maxlength="14"` still holds on both inputs. Empty names still default to `Jugador 1` and
`Jugador 2`. Covers S21.

### MT-2 wheel presentation and settle
Six sectors in the neon accents, pointer at the top, spin settles in 3.5s to 4.5s on a stopwatch
across three spins. The revolution count is judged by eye here and by nothing else, because `+ 360 * 5`
is a whole number of turns and is therefore invisible to any modulo-360 assertion: changing 5 turns
to 4 was measured at 0 of 6 caught, an equivalence class rather than a defect class. Sector labels
legible and upright. Covers S10, and the derived-wheel half of S7 by eye.

### MT-3 timeout
Answer nothing for 20 seconds. The amber timed-out state appears, the stored answer is revealed in
green on its card, no point is added, and the strip states the time ran out. The amber strip and the
green revealed option appear together and must stay legible together, which the delta requires
explicitly. Record the score before and after. Covers S11, S12.

### MT-4 correct answer
Answer correctly, reading the stored answer from `GET /questions/category/{name}` for the current
category. Score increments by exactly 1, the card carries `#05FFA1`, four options are present each
with an A, B, C, or D tag. Covers S13, and the correct half of S11.

### MT-5 wrong answer, tags, and order
Pick a wrong option. Zero points, the wrong card carries `#FF2A6D`, the correct card is also revealed
and highlighted, and the revealed text equals the stored answer from the API. Confirm the four index
tags read A, B, C, D in the **shuffled** order rather than the stored `option_a` to `option_d`
order, by playing the same question twice and checking the order differs. Covers S13, S18, S19, and
the incorrect half of S11.

### MT-6 the tenth point ends the match
Drive one player to 9, answer correctly to reach 10. The winner screen names the player who reached
10 and shows the loser's score unchanged. Control: answer **wrongly** at 9 and confirm the match
continues, because "the match ended" is also satisfied by a crash. Covers S21.

### MT-7 no question reuse, bounded by the data
Spin one category repeatedly and record each question's `id` from `GET /questions/category/{name}`.
All ids distinct. **Hard limit, measured at authoring time:** `ciencia` holds 6 questions and `arte`
holds 8, so `ciencia` is the only category where six consecutive distinct spins are possible, and it
sits exactly at the limit. On the seventh `ciencia` spin the category is exhausted, `quiz()` returns
null, and `pickQuestionAsync` calls `nextTurn()` (`frontend/index.html:367-368`): the turn passes
silently, with no message. That is pre-existing baseline behavior, out of scope for this change, and
must not be filed as a regression from the theme work. See section 10, item on S21. Covers S21.

### MT-8 the fallback path in the browser
DevTools request blocking on `http://localhost:8000/categories` only, leaving
`/questions/category/...` reachable. Hard refresh. The wheel still renders six sectors, each with a
label, an icon, and an accent; a spin still selects a category; a question still loads; the page does
not throw. Then clear the block and confirm normal service on the next hard refresh. Block only
`/categories`, not the whole origin, so the wheel-failure and question-failure paths are exercised
separately. Controls: assert the block is in effect by confirming the `/categories` request shows as
blocked, and that `/questions/category/...` is still succeeding. Covers S8.

### MT-9 the question-failure path
Request blocking on `http://localhost:8000/questions/category/*` only, with `/categories` reachable.
Hard refresh, start a match, spin. The page stays interactive, the match advances to the next turn,
and the console shows no uncaught error. Assert a clean console in both the blocked and unblocked
runs, because a caught rejection produces no error and an uncaught one does. Covers S9.

### MT-10 600px, the width where two rules are in force at once
Device toolbar at 600 by 900. Play a full turn. Options stack in one column, nothing overflows
horizontally, the timer is visible, and the four options are reachable. The 18px question floor
holds here too. `600px` is the width the delta names for exactly this reason: it is below `768px`, so
the option grid stacks, and below `640px`, so the wheel's compact tier is also in force — one width
exercising both. The two effects are on different screens, and this test covers only the question
screen's half. **The wheel half at 600px is SM-18's, and at 320px and 639px**; do not read a pass here
as a compact-tier pass. Covers S20.

### MT-11 HUMAN, timeout legibility
Show a tester **only** the timed-out state, with no other context, and ask what happened. The delta
requires that a player identifies it as a timeout rather than a wrong answer. This is a human
judgement and no instrument settles it. Record the tester's words. Covers S11.

### MT-12 HUMAN, visual review
A human reviews the result in a browser against `stitch/screen.png`. `proposal.md` records that no
agent in the fleet can read images, so visual fidelity is unreviewed by machine and **no claim of
matching the screenshot is made**. Expect to iterate on `screen-question`: it is the busiest of the
four panels and has prose only as its reference. Covers nothing mechanically; it is the gate on
"looks right".

## 8. Demo path, the human integration test

Runs in Chrome against the running server. This is the acceptance the human actually performs. The
data precondition in section 3 applies. The page is served per request, so no Uvicorn restart after
a frontend edit; the hard refresh is required because `GET /` carries `etag` and `last-modified` but
no `cache-control`.

| Step | Action | Expected | Scenario |
|---|---|---|---|
| DP-1 | Open `http://localhost:8000/`, hard refresh Ctrl+F5 | Obsidian canvas `#121319`, not the sky gradient. No console errors. | S1, S17 |
| DP-2 | Read the tab and the page language | Title `¡Preguntados 1v1!`, language Spanish | S22 |
| DP-3 | Enter two identical names, start | Rejected with a visible message, no match begins | S21 |
| DP-4 | Enter two distinct names, start | Wheel screen, both scores 0, one turn chip named | S21 |
| DP-5 | Spin | Settles in 3.5s to 4.5s, one sector under the pointer | S10 |
| DP-6 | **Say out loud the sector under the pointer, then read the category chip** | They match. This is the end-to-end wrong-category detector. | **S7** |
| DP-7 | Open the network panel, read the requested path | `/questions/category/{name}?limit=200`, and `{name}` equals the chip | S7, S23 |
| DP-8 | Answer the question | Four options with A/B/C/D tags. Exactly 1 point if correct, 0 if wrong, stored answer revealed either way. | S13, S19 |
| DP-9 | On a further question, answer nothing | Amber timeout state, stored answer revealed, no point | S11, S12 |
| DP-10 | Continue to 10 points for one player | Winner screen names the winner, shows both scores | S21 |
| DP-11 | Click rematch | Returns to the name screen, both scores 0, used-question state cleared | S21 |
| DP-12 | Start a fresh match and spin a previously seen category | An already-asked question may appear again, confirming the cache was cleared | S21 |

DP-6 and DP-7 are the whole point of the demo path for this change. The tester must be looking for
the **disagreement** between what the wheel shows and what the chip says, not admiring the theme. A
screenshot review cannot do this, which is why it is written as an instruction to say the pair aloud.

## 9. Entry and exit criteria

### Entry, before `dev` starts

1. This plan exists in the repo at this path and has been read by the reviewer. Version control
   state is deliberately not an entry condition: commit authorization is withheld.
2. The delta exists and `openspec validate --strict apply-neon-obsidian-theme` passes.
3. The seam in section 4 is required by the delta. It is: R4 requires the two DOM-free functions,
   and `tasks.md` 1.1 and 1.4 own them.
4. The pre-change hash baseline in section 3 is recorded. It is.
5. The findings in section 12 have been put to the architect. Specifically, that the 42-pair recipe
   as written in `tasks.md` 1.4 passes on the defect it exists to catch, and that its non-empty
   control fails as written.

### Exit, before Gate C

1. Both automated families are green: M1 (`node --check`) exits 0, and every M2 case (AT-2, AT-3,
   AT-4, AT-6) passes, with every positive control recorded as run.
2. SM-21 has been pasted and run, and its verdict recorded. It is not optional, and it is not a
   substitute for M2.
3. Each of the 23 scenarios has at least one recorded pass.
4. Every SM, MT, DP, and HASH case executed with a recorded result.
5. Every negative assertion paired with its control, and the controls run rather than assumed.
6. Anything not run is named as not run, with a reason.
7. The three rewritten cases carry their bars: SM-5 reads `inkIsCategoryDerived: true` and
   `allFillIsDeclaredInk: true` - not `allMeet3to1` alone, which the palette cannot enforce on its
   own, per Finding 8 - with `minimumRatio` at or above `3`; SM-16 reads `oneFamily: true` and
   `differsFromBody: true` on each of the three panels at the 4 / 2 / 1 minima, and `countedDown:
   true` with `hasTextNode: false` from the 20-second observation; SM-17 reads
   `borderFollowsAccent`, `glowFollowsAccent` and `zeroOffset` true for **both** selectors, and the
   two forced-state readings differ from `BASE`. The glow radius is not on that list and must not be
   added to it.

### Pass or fail

The change passes when both automated families are green, SM-21 has been run, all 23 scenarios have
a recorded pass, and nothing is left unrecorded. There is no partial pass and no numeric threshold,
because no coverage bar exists in this project to measure against. The numeric bars the delta itself
names are exact, and each is stated as a count rather than an impression: `node --check` exits 0; 42
of 42 rotation pairs agree; SM-21 binds 6 of 6 sectors; SM-3 holds 0 of 10 `9999px` sites outside
the closed set and 4 of 4 exact mappings; and SM-18 contains 6 of 6 label boxes inside the wheel's
bounding rectangle at both `320px` and `639px`.

## 10. What is not run, and the weak spots

### Not run, and why

| Item | Why |
|---|---|
| Any coverage percentage | No coverage tool is configured. None is invented. |
| Lint and type-check | No Ruff, no Black, no mypy, no pyright. `project.md` says so. |
| A regression suite | None exists, and this change adds no framework. |
| Cross-browser rendering | Chrome/Edge on Windows 11 only, the declared target. The delta cites Baseline 2024 for unprefixed `backdrop-filter`, so that property is asserted in one engine. |
| Firefox and Safari `conic-gradient` and `-webkit-backdrop-filter` | Out of scope. Worth a follow-up. |
| Visual-regression baselines | No screenshot-diff tool configured. MT-12 is human-only, by the fleet's own inability to read images. |
| Performance under load | Not in the delta. |
| A11y audit, keyboard navigation, screen reader, contrast ratios | Not in the delta. Worth a follow-up before anyone calls this shippable: the neon palette on `#121319` is a high-luminance-on-near-black scheme and the amber timed-out state sits next to a green reveal. |
| `prefers-reduced-motion` | Deferred by `proposal.md` to its own change, because the neon treatment adds a 4s spin, a pulsing node, and glow transitions. Correctly not tested here. |
| The nine excluded mockup features | Out of this change by the proposal's own out-of-scope list. |
| `AT-2` as a standalone wrong-category detector | It cannot detect one. SM-21 exists for that. See section 12. |
| S21's no-repeat clause beyond `ciencia`'s six questions | The dataset cannot supply it. See below. |

### Criteria the data cannot support

**S21's "no question repeats within a category during that match" cannot be tested as written for
the two smallest categories.** Measured supply: `ciencia` 6, `arte` 8, `deportes` 17, `geografia` 24,
`entretenimiento` 57, `historia` 89. A match to 10 points can involve far more than six spins of one
category, and for `ciencia` the supply is exhausted at the sixth. When it is, `quiz()` returns null
and `nextTurn()` passes the turn silently (`frontend/index.html:367-368`), so the criterion is never
violated, it is never reached.

So MT-7 can verify the rule for `ciencia` at exactly its limit and for `arte` up to eight, and cannot
verify it for a long match. Three options, and this is a human's call: accept the bound and record
it, split the scenario so the rule is stated per category with its supply, or defer the clause to a
change that owns question selection. `qa` does not pick. The silent turn-skip is baseline behavior
and must not be filed as a regression from this change, and it should be named in release notes
rather than discovered later.

### Criteria only a human can settle

**S11's "a player shown only the third state identifies it as a timeout rather than a wrong answer"**
is a human judgement. MT-11 runs it, and the plan claims nothing more.

**Visual fidelity** against `stitch/screen.png` is human-only by the fleet's own limits. No claim of
matching the screenshot is made anywhere in this plan.

### The weak spot, named rather than buried

**Sector-selection correctness is the serious risk.** It is the logic a theme rewrite is most likely
to break, it produces a wrong-category bug that every screenshot-based review passes, and the delta
knows this and specifies for it. But as measured in section 12, the recipe the delta and `tasks.md`
carry for measuring it **would not catch the defect**. SM-21 is the fix, and it is an addition to
the plan, not something the delta asked for. Until it is built, the highest-value guard on this
change is specified but not yet capable.

**Timer expiry is the quieter one.** R6's proportional threshold is a good resolution of the
`DESIGN.md` conflict and the single-source requirement is the right shape. The risk was that the theme
introduces a colour shift needing a ticker the file did not have, so a new clock and the existing
`setTimeout` could disagree, invisibly, until someone watched a full countdown. **That risk has
changed shape rather than gone away:** the current file now has both a 100ms `setInterval` driving
the phase and a `setTimeout` firing expiry, both keyed off one `TURN_MS` constant, so the two clocks
are now a *pair that can drift* rather than a ticker that is missing. The drift window is the
transition on the bar versus the timeout, and SM-12 is what watches it — by hand, once. The gap in
that test is real: it samples one full countdown on one machine, so a 1-in-20 drift passes.

The structural fix for both is a test toolchain, which is a separate change with its own decision and
is not this one.

### Recorded, not adjudicated

Eight things found while reconciling against the two amendments to the delta. **None of them has a
test, and none should.** Four are judgment calls for a human, two are lines in documents this plan
does not own, and two are places where a scenario's title or a parenthetical disagrees with the
scenario it annotates. A test that adjudicated any of them would be the wrong instrument, and
inventing one would be worse than the finding.

**1. S20's "exactly one further breakpoint" is brittle by construction — `architect` flagged it.**
The requirement counts `@media` rules in the **whole stylesheet**, so it fails the moment a
`prefers-reduced-motion` query lands in this file — and `proposal.md` defers reduced-motion to its own
change, so that query is a foreseeable future edit rather than a hypothetical one. The delta does not
record this coupling itself; it was raised out of band and is recorded here instead. SM-18 half 1
asserts the count as written, and if it ever goes red on the count alone, that is this brittleness
firing and not a defect. The narrowing fix is to scope the count to the wheel's own rules, which the
delta does not do; the alternative is to accept the coupling knowingly. **A human's call at Gate C,
not a tester's.** Recorded rather than papered over, because a check whose failure mode is a future
feature landing is only safe if everyone knows it is there.

**2. The timer track and the score slots are the same kind of element, treated differently.** S3
keeps `.timer` and `.timer-bar` at `9999px` and moves `.score-card .slot` to `--r-sm`. Both are thin
progress bars; a `9999px` radius on a row of ten discrete segments is a bubble register that no design
sentence asks for, and a capsule reads correctly for a countdown. **No sentence in
`stitch/DESIGN.md` separates them.** § Shapes classifies surfaces into a low-radius band and reserves
pure circles for "category indicator dots, status nodes, and countdown rings", so the separation rests
on reading a scoreboard slot as a *surface* and a countdown as a *ring* — and `DESIGN.md` never names
the scoreboard slots at all, so nothing in it puts the two side by side. The delta records this as
`[AUTHORED]`, the architect's own judgment, and that is the correct label for it. **A human may
reopen it at Gate C.** SM-3 asserts what the delta says and stops there; it does not rule on whether
the rule is right.

**3. `proposal.md` line 29 is now incomplete, and this plan does not own it.** It reads: "Replaces the
single `420px` breakpoint with the design's `768px` and `1024px` breakpoints." That omits the `640px`
compact tier, which the amended R11 authorizes. It wants a **one-line amendment** to name the third
tier. `proposal.md` is not this plan's file and was not edited. Flagged so the human sees it at the
gate instead of finding it in an archive diff.

**4. R10's provenance cites the wrong radius for the index tag.** R10's provenance note says
`0.375rem` for the `A`/`B`/`C`/`D` index tag, but `.opt .letra` carries `--r-sm`, which is `0.25rem`.
Both values pass the amended S3 - `0.25rem` is in the allowed band and `.opt .letra` is not one of the
four exact mappings, which name `.q-cat`, `.q-player`, `.turn-chip`, and `.score-card .slot` - so
**nothing fails and nothing is at risk.** A reviewer diffing R10 against the code will raise it, and
the answer is that the provenance line is wrong, not the code. No test is written for a value the
scenario does not constrain.

**5. R1's parenthetical enumerates the wrong two `#FFFFFF` sites.** It reads "`#090A10` … as the ink
on a high-saturation filled button, and `#FFFFFF` only as text on a saturated neon fill (**wheel
sector labels, primary button labels**)". On disk it is close to the reverse: the filled primary
button's label is `#090a10` via `--ink`, and **five of the six** sector labels are `#090a10` with only
`entretenimiento` on `#FFFFFF`. **R1's operative clause is a prohibition** - neither hex as canvas or
body text - and the code does not violate it, so nothing is broken. `architect` flagged this for Gate
C and did **not** amend R1, on the grounds that widening an enumeration is not theirs to do. This is
the same fact SM-1's control already records, and the two agree: SM-1 says `#FFFFFF` reaches exactly
one sector label and that the primary button label is `--ink`, which is what R1's list gets backwards.
**No test is written for it, and none should be** - an enumeration in a prohibition is a
cross-reference, and a guard on it would fail on a correct file. Recorded so that a reviewer who
diffs R1 against SM-1 finds the discrepancy already found.

**6. S19's title is now narrower than the scenario it names.** The title still reads "The index tag
is always A, B, C, or D and never an ordinal", while the scenario also carries the pre-lock
focus/hover clause the amendment added. `architect` left it deliberately: the `S19` key in § 6
resolves **by position**, and a third retitle would force a re-map for no gain. Recorded because a
reader who navigates by title will not find the hover/focus clause, and a reader who navigates by
position will not expect the title to be short. A later change may retitle it. SM-17 is written
against the scenario body, not the title, so nothing here is untested.

**7. R3's "sized to fit a wheel sector label and a category chip" implies a glyph on the chip, and
the chip has a dot.** § Category Chips & Badges specifies a glowing **dot**, and the code renders
one, so there is no glyph on the chip to size. `architect` read the phrase as scale *capability* -
one glyph definition that can serve both placements - and declined to narrow R3, because narrowing it
would be a weakening. That reading is the only one that makes the sentence true, so it stands, and
this plan adopts it: SM-5 asserts the chip's marker is a dot **in the accent and not a glyph**, which
is the clause the amended S6 actually carries, and does not assert any glyph on the chip. Recorded
because a tester who reads R3's prose literally will look for a chip icon that the design does not
specify and file its absence as a bug.

**8. The design contradicts itself on the option-card glow radius, and the delta leaves it
unpinned.** § Answer Option Cards says `0 0 16px` and § Elevation & Depth says `0 0 20px`.
`architect` refused to invent a resolution and pinned only the shape - **zero `x` and `y` offset** -
which R1 already constrains. SM-17 therefore asserts the offset and the colour and **reports the
radius without asserting it**, and the snippet has a harness case proving `16px` and `20px` both
pass, so the unpinned dimension stays unpinned. A tester must not "fix" this one. **Related, and
re-checked this pass because the brief asked:** the last reconciliation recorded a contrast concern
about the amber timeout state sitting next to a green reveal. **It is still accurate and did not need
correcting** - `--timeout-border` is still `rgba(255, 208, 0, 0.4)`, unchanged. What the re-check
added is that the amber is *strip and timer bar only*: on a timeout the correct-answer card is given
`.right`, the same green as a correct answer, so the three states are told apart by the strip's wording
rather than by the card's colour. Measured, the timeout strip's text is `#e3e1eb` on `rgb(75, 66, 30)`
at **7.74:1**, so legibility is not the issue; the amber border composites to **2.90:1** against its
own card surface, just under the 3:1 a non-text-contrast criterion would want, and the correct and
incorrect glows sit only **1.70:1** apart in luminance while being far apart in hue. So these states
are chromatic distinctions, not luminance ones, which is why a luminance-only instrument is the wrong
tool and a human's colour perception is the right one. **No test is written for it:** the delta pins
the 40% alpha as the value and requires only that the three states be visibly different, so asserting
3:1 would add a requirement and asserting 2.90:1 would pin an implementation detail. It stays in § 10
as a perception risk for the release conversation, and the colour-vision question belongs to the
a11y follow-up in § 11.

### The `project.md` conflict, resolved — no longer a Gate B item

`openspec/project.md` lines 46 and 119 read as though the previous color/icon treatment binds, while
the delta deliberately overrides it and `ADR-001` records why. `docs/adr/README.md` and the
`stack-conventions` skill require an approved deviation to amend `project.md` in the same change, and
`architect` was instructed not to edit `project.md`, so the conflict was surfaced in `proposal.md` and
`tasks.md` for a human.

**Settled at Gate B.** `openspec/project.md` line 46 is amended in this change to state that the wheel
uses the current neon category palette defined in `ADR-001` and the `game-presentation` spec. Line 119
is left alone: it governs game scope — six-category wheel, turn alternation, 20-second timer, four
options, first-to-10 — all of which this change preserves, so it is not a conflict. The declaration and
the delta now agree, and the archive-time failure this section warned about no longer exists.

**What QA does with it: nothing.** There is no test here, and there should not be one. A document-
consistency fact is verified by reading two files, not by a guard, and inventing a check for it would be
the wrong instrument.

### Escalations already accepted

`project.md` requires a change touching game behavior to add the relevant checks or explicitly
escalate the gap. The gap is escalated and the human accepted it for this cycle. `project.md` also
records that an ADR must be written before any production release gate is added, and that no
lint, type-check, behavioral-test, or coverage toolchain exists. That ADR is still owed before any
release gate.

## 11. Follow-up worth its own change

- A test toolchain, which would make any of this repeatable rather than manual.
- A `prefers-reduced-motion` path, deferred by the proposal.
- A contrast and keyboard-navigation pass on the neon palette, before release.
- A visible message on the silent turn-skip when a category is exhausted, and a decision on what
  should happen when a category runs out mid-match.
- A `cache-control` header on `GET /`, which would remove the hard refresh from the demo path.

## 12. Findings from reconciling against the real delta

Ten findings. The first two are material and were found by probing the real inline script in a
`node:vm` sandbox; they went to `architect` before Gate B and are already resolved in `tasks.md` 1.4.
The rest are minor or noted, and they are recorded rather than fixed because the delta is not this
plan's file. Findings 7 to 10 are new in the second and third reconciliations, from the amended R11
and from the two amendments that rewrote S6, S18 and R10.

### Finding 1, material: the 42-pair check passes on the defect it exists to catch

`tasks.md` 1.4 and the R4/S7 provenance note both state that "a static SVG in the mockup's order
agrees 0 of 42". Measured, that is not what a rotation-level check does.

A pure rotation check asks: given the rotation the code computed, which array index is under the
pointer? The implementation and the oracle both read the **same array**, so the array's order cancels
out. Measured with the real script, seven prior rotations, six targets:

| Categories array fed to the check | Pairs agreeing |
|---|---|
| the live `/categories` order | 42 of 42 |
| the mockup's reordered array (`stitch/code.html:472-479`) | 42 of 42 |

Identical. The check cannot discriminate, because reordering the array changes the *names* attached
to each index, not the agreement between index and geometry.

The discriminating measurement is one layer out, at the binding between the **rendered** geometry
and the **array-indexed** selection:

| Wheel | Sectors whose rendered geometry binds to the selected name |
|---|---|
| Derived from the API order, which is what R4 requires | **6 of 6** |
| Static SVG in the mockup's sector order | **0 of 6** |

Every sector of a paste names a different category than the pointer shows. Index 0 names `ciencia`
while the pointer shows `historia`; index 1 names `entretenimiento` while it shows `geografia`; and
so on for all six. That is 0 of 42 spin pairs, expressed correctly, and it is what SM-21 measures.

So the delta's number is right and its measurement layer is wrong. AT-2 stays, as the regression
guard on the rotation maths. **SM-21 is added**, and without it the guard is a green light wired to
the defect.

### Finding 2, material: the non-empty control fails as written

`tasks.md` 1.4(b) says to assert the walked set holds 6 categories and 42 pairs before any agreement
check, which is exactly right as a control. As written it cannot pass.

`init()` populates `categories` through a `fetch().then().then().catch()` chain that resolves after
the synchronous script body has finished, and the assertion epilogue runs synchronously inside that
body. An epilogue that reads `categories` into a snapshot therefore sees 0:

```
CONTROL FAILED - walked 0 categories, expected 6
```

Measured with a getter instead, and two `setImmediate` ticks before reading:

```
cats=6 pairs=42 (6x7) agree=42/42
```

The fix is small and belongs in `tasks.md` 1.4: export `getCategories: () => categories` rather than
a snapshot, and let the chain settle before reading. A snapshot-based epilogue turns the control
into a permanent red, which is the other failure mode of a guard that cannot fail: one that can
never go green teaches its readers to ignore it.

### Finding 3, minor: the `createElement` stub fails late and quietly

`tasks.md` 1.4(a) already calls for a `document.createElement` stub and gives the right reason. Worth
recording *how* it fails, because the failure is easy to mistake for a passing run: the stub is
missing, `vm.runInContext` returns normally, the epilogue prints its result, and only then does the
process die with `TypeError: document.createElement is not a function`, thrown from the `.catch`
branch as an unhandled rejection. A harness that installs a swallowing `unhandledRejection` handler
to keep output tidy would report the fallback path as passing when the wheel never rendered. So: the
stub is mandatory, do not swallow rejections, and check the exit code.

### Finding 4, minor: `git status` is not the instrument the delta names

R4's last scenario gives `git status` as the measurable for "no route, schema, or Compose file was
modified". With `frontend/` untracked and everything else untracked too, `git status` shows the same
output whether a file is untouched or was never committed, so it cannot support that claim. HASH-1
replaces it, against a baseline recorded in section 3 before dev work began.

### Finding 5, minor: S16 does not name the keyframes

S16 lists `.cloud`, `.sun`, `.mountain`, `.ground`, `.tree`. `tasks.md` 4.6 also removes the `drift`
keyframes and their `animation` declarations. SM-14 checks the keyframes as well; a delta gap worth
closing so the scenario and the task agree.

### Finding 6, noted: no scenario states the two paths must agree on accent

R2's requirement text keys the accent by name "and not by its position in any array", which covers
the `FALLBACK` path as well as the API path, and the two paths **disagreed** in the pre-change
baseline because the API path was positional at `COLORS[i % 6]` (`:256`) while the fallback was
positional at `COLORS[c.c]` (`:257`), with `arte` at index 5 versus index 0. No scenario says so.
AT-3's third control tests it as a consequence of R2, which is legitimate, but a scenario would be
better.

### Finding 7, minor: S20's provenance undercounts the compact tier's overrides

Found while writing SM-18 half 1, which is the check that would catch it.

S20's provenance note says the compact tier "overrides **exactly two** declarations, the default
`--wheel-size` at `:50` … and the default `--seg-r` at `:195`". The tier as implemented overrides
**four rules**:

| Rule inside `@media (max-width: 640px)` | What it sets |
|---|---|
| `:root` | `--wheel-size`, `min(84vw, 440px)` |
| `.seg-label` | `--seg-r` at `-0.32`, and `width: 4.25rem` |
| `.seg-label .ic svg` | `width` and `height`, `1.125rem` |
| `.seg-label .lb` | `font-size`, `0.5625rem` |

The requirement text itself counts them correctly — it names four effects: the wheel shrinks, the
radial offset pulls inward, the label box narrows, and the icon and type reduce. So the requirement
and its own provenance note disagree with each other, and the count in the note is the one that is
wrong. The **conclusion is unaffected**: the tier really is confined to the wheel and its sector
labels, because `--wheel-size` is read only by `.wheel-wrap` and by `.seg-label`'s `--seg-r`. Only
the arithmetic in the note is wrong.

This is worth closing because it is the kind of number a reader trusts instead of checking, and
SM-18 half 1 is written against the four selectors rather than the two. If the note's count is what a
reviewer checks, they will check `width`, the icon size, and the label font-size nowhere — and those
three are exactly the declarations that decide whether a label box crosses the rim at `320px`.

### Finding 8, material: the amended 3:1 bar cannot tell a per-category ink from no ink at all

Found while writing SM-5 against the amended S6, and it is the reason that test has a control the
scenario does not ask for.

S6 now requires each glyph's resolved fill to be "the ink its category declares" **and** to clear 3:1
against its own sector's accent. The first clause is the substantive one; the second is the measurable
one. But the measurable one does not imply the first, on this palette:

| Ink handed to all six glyphs | Worst ratio across the six accents | Clears 3:1? |
|---|---|---|
| `#090a10` - the declared ink for five categories | **4.34:1** (`entretenimiento`) | **yes, everywhere** |
| `#FFFFFF` - the declared ink for `entretenimiento` | 1.33:1 (`ciencia`) | no, on four of six |

So a wheel that ignored the per-category `on` entirely and painted every glyph `#090a10` would
satisfy the 3:1 clause on all six sectors and **pass a literal reading of the amended scenario**, while
being exactly the defect the amendment was written to prevent. The reason is a property of this
palette, not of the requirement: `#090a10` is dark enough to clear 3:1 against every neon in it.

The scenario's other new clause does not close the gap either. "The glyph and its sector label
resolve to the same colour" is satisfied by any single inherited colour, so it pins the *source* -
one palette entry tints both - rather than the value, and that is legitimately what it is for.

This is not an argument against the amendment: the resolution is right, and the six ratios
`architect` computed are all correct (SM-5 recomputes all six from the hexes on disk and reproduces
13.43, 14.03, 5.46, 6.92, 14.89 and 4.56 exactly). It is a statement that the scenario's *measurable*
clause is weaker than its prose, so a tester who implements only the ratio has a green light wired to
a defect - which is Finding 1's failure mode wearing different clothes. **SM-5 therefore asserts the
declared-ink mapping directly**, reading the accent each sector is painted with, resolving it to the
`ACCENT_BY_NAME` entry that declares it, and comparing that entry's `on` against the rendered fill,
with a bijection control on top. Its harness proves the discrimination: all-ink passes 3:1 at 4.34
and is caught only by the control.

If `architect` wants the scenario to carry this on its own, the cheap fix is a clause of the form
"the six resolved fills are a bijection onto the six declared inks", which costs one sentence and no
new measurement.

### Finding 9, minor: S18's `GIVEN` stages a screen that does not hold the readouts it names

S18's `GIVEN` is "the question screen at a `320px` viewport width" and its `WHEN` then names five
readouts to read there. **No single panel carries them.** `#scoreboard` - and therefore `.spoints` -
lives inside the wheel panel; `.seg-label .lb` exists only while the wheel is rendered; `.wscore`
exists only on the winner panel. The co-resident counts are:

| Panel | Readouts present | Missing there |
|---|---|---|
| question | 4 - `.q-cat`, `.q-player`, `.opt .letra`, and `.spoints` only if the scoreboard is shared | `.seg-label .lb`, `.wscore` |
| wheel | 2 - `.spoints`, `.seg-label .lb` | the four question-screen readouts |
| winner | 1 - `.wscore` | the other five |

The requirement is unaffected - all six resolve to the same token, and reading them across three
panels is sound - but a tester who reads S18 literally will find fewer than five on the question
screen and may record a failure against a correct file, which is the same trap the timer clause was
removed to avoid. SM-16 is written per panel with the minima 4 / 2 / 1 as part of its control, and the
snippet reports `missingHere` so a tester is told where the rest live rather than left to conclude the
readout is absent.

### Finding 10, noted: the delta's `[IMPL]` gap on the option-card states is now closed, so the note is stale

R10's `[AUTHORED]` note records an implementation gap **owed by `dev`**: that
`.opt:hover:not(:disabled)` raised only the stroke to `--stroke-strong` with no glow, and that
`.opt:focus-visible` hard-coded `var(--geografia)` and a literal `rgba(0, 240, 255, 0.35)`. Both were
true when the note was written. **As of this reconciliation they are both fixed** - the rules now read
`border-color: var(--accent)` and a glow from `var(--accent-glow)`, and `renderQuestion` publishes
`--accent`, `--accent-soft` and `--accent-glow` on `#screen-question`. `dev` closed it while this pass
was being written.

Recorded for one reason: the note is now describing a state the file is not in, and a reviewer who
reads the delta and then the stylesheet will conclude the change is half-done. Nothing in the plan
depends on the gap still existing, and SM-17's static half was written to pass on the fixed file -
its negative case is the pre-fix rule text quoted in the note, which the harness keeps precisely so
the check can still be shown to discriminate. No action; the note is simply stale.

### Not a finding, recorded because it looked like one

`#q-timer` carries `role="progressbar"` with `aria-valuemin` and `aria-valuenow` in the markup but no
`aria-valuemax` until the first question renders, which would be a small a11y gap against the new
aria clause. It is not one: `startTurnClock` sets `aria-valuemax` to `TIMER_SECONDS` at the start of
**every** turn, so the attribute is always present while a turn is running, which is the only time it
means anything. Checked and dismissed.
