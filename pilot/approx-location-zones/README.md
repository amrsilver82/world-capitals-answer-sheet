# Uniform approximate-location championship — unscored design prototype

Date: 11-Oct-2026. Separate GitHub Pages route: `/pilot/approx-location-zones/`.

**User-approved direction to prototype:** test geographical *specific-area* knowledge consistently across 195 countries, rather than precise tiny-island dots or an easier generic continent answer for selected countries. Exact island-marker identification remains optional practice, not part of this rule.

**Experimental rule:** The world is partitioned into a fixed **20° longitude × 15° latitude** grid. The central latitude band spans -7.5° to +7.5°, to avoid making the equator an arbitrary separating line through Nauru/Kiribati. Polar strips are clipped to the poles. The same spatial resolution applies to France, Nauru and every country. No target-specific viewport, automatic highlight or answer dots are shown before choosing. Choose region *yourself* and tap any land or sea within a zone. The zone is highlighted with the active question number, preserving previous locations. Manual pan, pointer wheel, and touch pinch continue to function. The original Combined V2 flag+Country+Capital stylesheet and layout are reused; ten sample flags from the existing prototype, and no official results.

**Why it is not official scoring yet:** These rectangles are arbitrary coordinate boundaries, not equally sized in km at different latitudes. A country spanning multiple zones must have a carefully defined set of accepted zones based on reliable polygon coverage. Archipelagos require multiple valid island-group zones. Boundary ambiguity must be dealt with consistently, and the level of difficulty varies (countries sharing a zone can both be correct). The demo records chosen zone IDs only and **does not mark them right/wrong**. Do not promote this to a scored 195-round until both fairness and user interface are proven and user explicitly approves.

**Persistence:** browser-local demo-specific storage only; previous exact-dot pilot, Issues and canonical official 390/390 score untouched. This test compares the *interaction*, not independent geographical expertise.
