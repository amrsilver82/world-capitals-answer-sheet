# Connected World Championship — full-size 10-country + bottom atlas layout (11-Oct-2026)

This is an independent experimental layout preview at `/pilot/connected-atlas-ten-v2/`. It does not overwrite the previous ten-country preview; the original remains available for before/after comparison.

User testing found:
1. Chad did not register when the user clicked Africa, even after zooming. This must not require zoom. V1 also inappropriately required nonblank Country and Capital fields before allowing a location answer. V2 removes that coupling and adds a geospatial polygon fallback for map-background clicks over real land; tests target Chad explicitly at standard world and Africa zoom.
2. Existing V1 flags were 77 x 56 px (61 x 48 on small screens), too small to judge Monaco/Indonesia and Chad/Romania differences. V2 presents **original Combined V2-style flags up to 420px wide**, uses immutable canonical Edition 3 SVG assets, and preserves the 5:4 Monaco override. Note canonical unmodified Monaco SVG has a default 4:3 viewBox, so CSS must resize the display for authentic Monaco 5:4.
3. V1 side-by-side map/ten tiny flags wastes limited screen space, especially on iPhone/iPad. V2 uses familiar two-column full-size question cards on desktop and one column on mobile, **one shared atlas below all ten** on the very same URL. Each card has an Open atlas button, and the atlas has Return to selected question. No second tab, no separate browser page.
4. The atlas retains manual World, Europe, Caribbean, Pacific, Africa and Asia views, wheel zoom, drag pan, +/− buttons, and neutral fixed markers for tiny countries. It never automatically reveals or zooms to the answer.
5. Preview review can be opened without finishing the batch. Every component may remain blank, independently of the other two. Preview is unscored, and answers are transient in-browser data, not synced to GitHub.

The backend and geography universe remain experimental (177 Natural Earth 110m base polygons + 15 detailed target shapes + sampled anonymous island markers), **not all 195 certified**. Public prototype answer keys are not acceptable for an official test. The existing historical 390/390 and private Issues #1–#4 are untouched.

**Validation goals:** desktop Chromium and WebKit mobile simulations test large Monaco ratio, readable flag size, all cards preceding atlas, independent location entry, Chad clickability at world/Africa scale, wheel zoom, panning, retained map viewport and report rows. Real user iPhone Safari and iPad Chrome remain NOT TESTED and must not be marked passed.
