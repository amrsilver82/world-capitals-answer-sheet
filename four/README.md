## ACTIVE — Four-category championship, Edition 1 (28-Oct-2026)

The current game is **World Flags + Capitals + Languages + Currencies — Edition 1**, original frozen **Batch 1 Q1–Q10**, **0/780 Pure**, all ten questions currently unanswered. Four fields per original flag: **Country | Capital | Language | Currency**. **Do not shuffle, regenerate, show answers, or automatically supply clues.** The source of truth is the private `amrsilver82/World-Capitals-Game` repository `ACTIVE_TEST.json` and `four/runtime.json` once activation checkpoint is committed. The public state is unchanged `four/states/ed1-b01-initial-20261020.json`, original blob `ed630fac0110bfd1b4c1a25127646e1c8d64d09f`.

The two prior three-category editions are both COMPLETE at **585/585 Pure**, and the latest full private and public archives `archive/three-category-edition2-poststudy-20261028` are separately verified. The restoration and competition switch instructions are stored in the private `docs/COMPETITION_SWITCHBOARD_2026-10-28.md`. The public archives preserve every previous page, flag, quiz state, approved layout, 195-country result and public URL. The preceding three-category scores must never be mixed with the new 0/780 ledger.

# World Flags + Capitals + Languages + Currencies — Edition 1 (195 countries)

Four independent answers per flag. **Country + Capital + Language + Currency**. The four-category championship uses the existing 195 canonical flags, identical responsive layout and the original **Build my reply / Copy reply / Clear all** controls, with a fourth Currency input.

## Publication URL contract

- Frozen quiz: `https://amrsilver82.github.io/world-capitals-answer-sheet/four-v1.html?sha=<PUBLISHED_SHA>&state=four%2Fstates%2Fed1-bNN-initial-20261020.json`
- Verified completed report: `https://amrsilver82.github.io/world-capitals-answer-sheet/four/reports/edition-1/batchNN.html?sha=<PUBLISHED_SHA>`
- Final championship: `https://amrsilver82.github.io/world-capitals-answer-sheet/four/reports/edition-1/championship.html?sha=<PUBLISHED_SHA>`

Replace the placeholder with the ACTUAL public Git commit SHA containing the corresponding file. NN=01–20. Batches 1–19 have 10 flags / 40 separate answer fields each; Batch 20 has 5 flags / 20 fields.

## Scoring / safety

Country, Capital, Language, Currency each earn +1 Pure if independently correct, +0 Pure and +0.5 Pure+Assisted if answered correctly after requested help, and 0 if wrong. One currency name or recognized 3-letter code qualifies. Separate four-column-component Batch and Cumulative ledgers (five table columns including Score), 13-column full answer review. Max Pure: 780 (195×4). Historic Flags + Capitals + Languages Edition 1 585/585 remains archived, not replaced.

The public question JSON contains opaque flag SVG paths only; **no answers, currency names, or ISO codes**. Private GitHub has canonical 195-country currency answer map and adjudication rules. Never deliver automatic clues, and never publish incomplete batch scores. The required displayed name is **Occupied Palestine** for its designated entries.

## Release rules

A future batch URL is NOT live until published/verified. At a completed batch, private scoring is atomically committed first, then current completed report plus next frozen quiz published together at a pinned SHA, then the private presentation pointer activated. Final Batch 20 has a championship summary instead of a next quiz. Public CI: `four/tools/check-edition1-format.mjs` and `.github/workflows/four-edition1-format-guard.yml`. Complete binding design and all twenty numbered path definitions are in the private `docs/FOUR_CATEGORY_CHAMPIONSHIP_CONTRACT_2026-10-20.md`.

This README does not present or initiate any quiz.

## APPROVED WEBSITE IMPLEMENTATION — immutable visual source

On 20 October 2026, the player approved the **exact previous-championship flag size/card layout** and the new labels **Country** (card) and **Countries** (score table). The official implementation is stored as ACTUAL website files, not merely instructions:

- **Production approved stylesheet:** `four/templates/approved-report.css` (same original responsive card/flag CSS, flags use their canonical SVG and natural aspect ratio, max width 420px; one mobile score-table overflow accommodation).
- **Executable production HTML renderer:** `four/tools/render-report.mjs` — the ONLY authorized batch-results page generator. Reads the approved stylesheet, renders all ten cards (five on Batch 20), four statuses, all 13 detail columns, and TWO five-column six-metric scoring tables.
- **Approved full-sized ten-card website:** `four/pilot/approved-results-layout.html` — full real flag SVG images at exact original ratio, but all sample text fictional and unscored. Not the former synthetic 170px flag example.
- **Always-visible NEXT navigation:** On completed Batches 1–19, a working `Next Batch →` anchor uses the CURRENT report's verified 40-character `?sha=` to open the exact next frozen `four-v1.html?sha=<SHA>&state=four%2Fstates%2Fed1-bNN-initial-20261020.json`. The final Batch 20 uses `Championship Summary →` instead (no fictional Batch 21).
- **Preview navigation click test:** `four/pilot/navigation-demo-next.html`; the demonstration's live `Next Batch →` goes to this informational demo page, NEVER to a live pending quiz.
- **Regression fixture and CI:** `four/tests/format-fixture-not-real-scores.json` (fictional answers only), `four/tools/check-edition1-format.mjs` and `.github/workflows/four-edition1-format-guard.yml`. Workflow runs the real renderer on the fixture and tests HTML, original CSS, labels, button, ten cards and public anti-leak.
- **Questions remain governed by:** `four-v1.html` and frozen `four/states/ed1-bNN-initial-20261020.json`. Four fields Country/Capital/Language/Currency with Build my reply, Copy reply, Clear all. The current Batch 1 is FROZEN, presented, and paused for study; this approval does not change it.

**Do not improvise:** New chats MUST run/modify the committed report renderer/templates, never hand-author a replacement design. Any deviation must be approved before commit and pass the format guard.

**Pending currency-answer policy:** The user has not yet approved whether a generic currency-family word (e.g. "franc" rather than "Congolese franc") earns full independent credit. Currency PDF study-guide format and that broad-vs-specific scoring policy are ON HOLD pending explicit decision. The existing private reference remains a draft until then; DO NOT silently impose new generic-name acceptance.

