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
