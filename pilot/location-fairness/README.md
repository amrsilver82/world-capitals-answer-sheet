# Unscored Fair Location Lab (experimental)

The user approved testing alternatives to unfair microstate/atoll dot tapping on **10-Oct-2026**. This is **NOT** the existing 15-country Location Pilot and it does not touch the official Flags + Capitals record.

URL: `https://amrsilver82.github.io/world-capitals-answer-sheet/pilot/location-fairness/`

## Isolation and checkpoints

- Static GitHub Pages HTML/CSS/JS only. No other provider or hosting; no external tiles.
- Uses existing frozen world outlines `../location/data/world.json` and tiny 1:10m target shapes `../location/data/targets.json`.
- Fixed independent cases (9): Monaco, Vatican City, San Marino, Nauru, Tuvalu, Kiribati, Tonga, Bhutan and Chad.
- A new GitHub **private Issue #2** in `amrsilver82/World-Capitals-Game` is the append-only experiment checkpoint. The original synchronized 15-country pilot uses **Issue #1**, untouched.
- Same existing fine-grained GitHub credential with Issues Read/write only; it can be reused automatically from browser localStorage **only if the user previously opted to save it**. No tokens stored in source code, GitHub Issues, ChatGPT, or logs.
- A separate `kind: wcg.location.fairness.v1` and `pilot_id: location-fairness-20261010` isolate each unscored attempt and explicit Next action.
- Methods can be compared on each country. Progress advances only when user presses Next after at least one attempted method. Every device reads the identical Issue log; no local score.
- An answer is never graded as an official correct/wrong. Show the reference land **only after submission**, including all distant islands for archipelagos.

## Interaction methods

1. **Pin:** place a pin anywhere, including sea. After submission, compute approximate km from pin to *nearest* valid part of ANY land polygon in the target country. User can change trial radius from 25 to 500 km; not a permanent score threshold. Point-in-polygon = 0 km. Geometry uses a local tangent-plane approximation at coastal segments: use only for comparison, not official judgment.
2. **Exact land:** tap the actual 1:10m polygon for microstates and the 1:110m world polygons for other countries; shows whether that specific land was touched. Intentionally demonstrates accessibility challenges.
3. **20-degree grid:** user selects an arbitrary 20° longitude × 20° latitude cell. A match means *any* polygon vertex is inside that cell. This intentionally lowers location precision; assess whether it is educationally meaningful and not trivially easy.

Map regions and zoom are all manually selectable, never auto-focused on active country. No pre-answer highlight, country-name label, artificial location dot, or answer-specific camera. User's own pin is shown before submitting; target is revealed only afterwards.

## Acceptance and open risks

- [ ] CI Chromium and WebKit two-browser rehearsal passes; actual iPhone Safari/iPad Chrome not yet verified.
- [ ] User tests whether pin tolerance seems fair for both microstates and island chains.
- [ ] Avoid grading ambiguous microstates until a fixed tolerance and overlap rule is approved.
- [ ] Polygon coverage across all 195 countries is NOT complete or certified.
- [ ] Check alternative exact/tap versus grid accessibility in narrow screens.
- [ ] Retain official 195/195 Flags + 195/195 Capitals forever.
- [ ] Explicit approval required for changes to the official location game.

**No permanent scored game launch or exclusion decisions are authorized by this pilot.**
