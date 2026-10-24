# Tasks

Branch when authorized: `feature/add-crowns-jokers-gameplay`. Planning only; these tasks do not edit production code until Gate B is approved.

## 1. Canonical dataset and API compatibility

- [x] 1.1 Bring `preguntas_preguntados.csv` to exactly 300 valid rows: 50 per canonical category, unique normalized question text, four distinct options, and a matching answer.
- [x] 1.2 Update `app/load_data.py` to validate before mutation, replace dependent categorizations before questions in one transaction, insert one categorization per question, recheck counts, and preserve database contents on invalid input.
- [ ] 1.3 Run the existing data and HTTP checks twice against the same source and prove 300 questions, 300 categorizations, six 50-row category counts, idempotency, and unchanged counts after an invalid-source control. Do not change `app/main.py` routes or `app/models.py`.

## 2. Crown state and question flow

- [x] 2.1 In `frontend/index.html`, replace points/first-to-10 state with two players, six named crowns, ordinary streak, derived pending categories, current flow, used question IDs, and per-player joker counters.
- [x] 2.2 Implement ordinary resolution: a correct answer increments progress up to three and keeps the turn; a wrong answer or timeout resets progress and changes turn.
- [x] 2.3 Implement the mandatory crowning question after three ordinary correct answers and after the crown sector. Award only the selected pending category on success, preserve existing crowns on failure, reset progress on resolution, and show immediate victory at six crowns.
- [x] 2.4 Mark questions used on presentation, keep second attempts on the same question, reset usage on rematch, and recover visibly when a category has no unused questions.

## 3. Seven-sector wheel and visual overlap

- [x] 3.1 Extend the API-derived wheel to exactly six category sectors plus one unlimited `corona` sector; use one `sectorCount = 7` for geometry, labels, dividers, and landing.
- [x] 3.2 Route `corona` through pending-category selection and the existing category endpoint only for the real selected category; never request `/questions/category/corona`.
- [x] 3.3 Resolve label/icon overlap at desktop and mobile sizes using bounded label geometry and a compact corona treatment while preserving the palette and name-based category mapping.
- [x] 3.4 Run browser checks proving seven visible sectors, non-overlapping labels/icons, repeatable crown-sector selection, and safe empty-category recovery.

## 4. Per-player jokers

- [x] 4.1 Add exactly `eliminar-dos`, `segundo-intento`, and `seleccionar-correcta` with two uses per player and reset both inventories on rematch.
- [x] 4.2 Enforce at most one joker per question and reject activation after resolution or after that question already consumed a joker.
- [x] 4.3 Implement and check the three effects: exactly two wrong options disabled, one hidden second answer attempt, and automatic correct selection. Prove a third use by one player is rejected while the other player's uses remain independent.

## 5. Verification and hand-off

- [x] 5.1 Keep the existing Node syntax, Python compile, HTTP, browser, and data check surface; extend it with non-empty cases for crowns, mandatory challenges, turn transitions, no-reuse, six-crown victory, seven-sector geometry, overlap, and all per-player joker counters.
- [x] 5.2 Run deliberate negative controls for invalid data, a third joker use, duplicate question selection, and visual sector overlap; record observed failing output in the implementation PR.
- [x] 5.3 Run `openspec validate "add-crowns-jokers-gameplay"` and the declared checks before presenting Gate B. Do not edit production code in this planning change.


