# World Capitals Game — Location Pilot v1 (unscored)

Status: **Experimental prototype**. This is a self-contained static HTML/SVG location-selection prototype, separate from the canonical completed 195/195 Flags + Capitals game.

## Pilot coverage
- 15 frozen country questions: Chad, Romania, Monaco, Vatican City, San Marino, Nauru, Tuvalu, Kiribati, Tonga, Palestine, Bhutan, Lesotho, The Gambia, Timor-Leste, Fiji.
- 177 simplified world basemap features at 1:110m and 15 detailed country vector sets at 1:10m.
- Sources: Natural Earth public-domain vector boundaries, redistributed by BenPortner/geojson-atlas (CC0). Geographic representations are dataset geometry, not a political statement.
- Small-country non-answer-labeled selection markers are visible only in user-selected regional views.
- The Pacific is split between west and east regional views to accommodate antimeridian-crossing islands.

## Implementation
- Entry: `pilot/location-v1/index.html`.
- Static local assets: `data/manifest.json`, `data/world.json`, `data/targets.json`.
- No runtime CDN, commercial map API, Google Maps key, AI image generation, or external map image query.
- Initial map integrity checks ensure 177 basemap features, 15 target shapes, matching unique IDs and 15 immutable questions.
- A missing map blocks submission, leaves the question unanswered, and displays an explicit error instead of scoring Wrong.
- Local pilot progress is retained in the browser via localStorage. Checkpoint JSON export/import can move pilot progress between devices and conversations. **No cloud synchronization or automatic cross-device checkpointing exists in this prototype.**
- The pilot never modifies official scores, active tests, prior GitHub test metadata, accepted-answer rules, or the 195/195 Holy Grail record.

## Acceptance gates (must be met before larger rollout)
1. [ ] Automated Chromium smoke test: all 3 files load and SVG renders on desktop and tablet viewport.
2. [ ] All 15 fixed geometry records are clickable at suitable regional zoom.
3. [ ] At least 4 microstates/small islands tested: Monaco, Vatican City, Nauru, Tuvalu.
4. [ ] Wrong-country tap doesn't reveal the answer; retry works.
5. [ ] Interrupted/unavailable geometry cannot mutate progress.
6. [ ] Refresh retains unscored progress on same device; export/import correctly restores to another browser context.
7. [ ] User verifies tap/zoom ergonomics on an actual iPad in Safari.
8. [ ] Before any 195-country geography game: complete a **195/195 country-feature crosswalk audit**, disputed-border and microstate review, antimeridian review, and full frozen-state/GitHub continuity rehearsal.
9. [ ] Never promote the pilot into the live quiz automatically. Require explicit user approval after tests.

## Non-goals for v1
- No official third-category points or streaks.
- No user GitHub authentication in the browser.
- No hidden AI side decisions about which geographical region was tapped.
- No claim that all 195 countries are covered or audited by v1.

Related permanent gameplay state remains in the private canonical GitHub repository `amrsilver82/World-Capitals-Game`.
