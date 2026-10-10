# Country Location Pilot — 15-country experimental sandbox

**Status:** pilot v1, not official gameplay. Does **not** read, update, or write `ACTIVE_TEST.json`, `v2/runtime.json`, scores, flags, capitals, historical quiz records, or official streaks.

## Goal

Prove that a **third, spatial-memory skill** can work deterministically before adding it to World Capitals Game.

This pilot deliberately covers 15 geographically awkward or representative countries:

Chad, Romania, Monaco, Vatican City, San Marino, Nauru, Tuvalu, Kiribati, Tonga, Palestine, Bhutan, Lesotho, The Gambia, Timor-Leste, and Fiji.

## Static assets

- `data/manifest.json` — immutable ordered 15-country sandbox manifest with frozen country IDs.
- `data/world.json` — simplified 177-country Natural Earth 110m world outline, no text labels.
- `data/targets.json` — detailed 10m Natural Earth administrative-boundary polygons for the 15 selected countries, compiled from public-domain Natural Earth source, including island geometries.
- `index.html`, `style.css`, `app.js` — GitHub Pages-only static interface. **No runtime third-party map API, image lookup, or external script.**

Map base and detailed boundaries are derived from [Natural Earth public-domain geography](https://www.naturalearthdata.com/about/terms-of-use/), via the [BenPortner geojson-atlas repository](https://github.com/BenPortner/geojson-atlas). Pilot source geometry is explicitly experimental for geographical/political boundaries; production 195-country mapping requires a separate complete coverage and disputed-boundary audit.

## Fair-location rendering refinement (10-Oct-2026)

- Removed **all province/internal administrative borders**; large countries use the plain 110m country-outline map, while detailed pilot target polygons are invisible hit areas. Their parts are never separately outlined, even after selection.
- Removed **visible circles/dots**, including Monaco, Vatican City, Pacific atolls and microstates. A neutral microstate silhouette appears only from genuine geographic boundaries at close zoom, with no question-dependent highlighting.
- Small-country invisible touch allowances become available **only at appropriately close manual zoom**, never in the initial Europe/world views. These areas are not drawn and are available for every question, independent of the current correct answer.
- Manual neutral geography views include NW Mediterranean, Central Italy, Adriatic, and wider Pacific subregions. The system never auto-centers, recommends a specific tab based on the current answer, or reveals a target's location.
- The pilot manifest, ordered 15 country IDs and local checkpoint storage schema were deliberately **not changed**; existing iPad progress should resume after the update.
- **Limit for eventual 195-country edition:** all 195 outlines must be represented equivalently, not merely the 15 pilot shapes, with a full tiny-country usability and anti-clue audit.

## Reliability contract

1. The 195/195 World Flags + Capitals Edition 3 record is immutable and off-limits.
2. No real score is awarded or lost in the pilot. Wrong experimental selections do **not** reveal the correct location.
3. All 15 targets and the world outline are stored within the same public GitHub repository. A failed fetch shows a blocking error, never an incorrect result.
4. All question IDs and answer country IDs are predetermined; the AI does **not** infer selected locations.
5. Progress survives refresh on the same device through local storage. Copy/export a JSON checkpoint for another device or chat.
6. The current location can be chosen by polygon or, for difficult microstates/island countries, a **neutral invisible touch allowance at sufficiently close zoom, based on fixed geography and independent of the active question**.
7. The user selects the map region manually; the system **does not automatically zoom to the correct location**.
8. Pilot version is fixed. Changing the data requires a new explicit version, not silently reinterpreting saved attempts.

## Acceptance checklist — must pass before production

- [ ] Page and all 3 local geography JSON files load without errors on iPad Safari
- [ ] 15/15 locations can be selected and verified (includes 3 European microstates and Pacific islands)
- [ ] Wrong selection records an experimental attempt but doesn't reveal target or skip question
- [ ] Refresh after some completed items resumes the exact remaining question
- [ ] Pan, zoom and region selection work on an actual iPad
- [ ] JSON checkpoint exports from one device and restores on another
- [ ] Simulated offline geography failure does not alter progress or score
- [ ] Zero changes to official 195/195 runtime and score
- [ ] Separate 195-country geometry/territory audit passes before a full Triple Crown run

**Pilot exit rule:** If any of these reliability checks fail, don't advance to official 195-country location scoring; fix the issue and retest this sandbox.

## Test instructions

Open `index.html` through GitHub Pages. Choose a region manually, tap a country boundary or the silhouette for small countries after manually zooming into the appropriate area, and press **Check selected location**. The selection is the country's fixed ISO code. Use **Copy checkpoint** or **Save checkpoint file** for a handover.

This README is the cross-chat pilot specification. The official game's canonical state remains in the private World-Capitals-Game repo.
