# Fun-first geography pilot — 12-Oct-2026

Unscored redesign of location learning, launched as `/pilot/approx-location-area/?fun=1`. This **does not** replace existing precision/referee pilots or the official combined championship.

Ten named countries, displayed one at a time: Germany, Myanmar, Namibia, Chile, Japan (a continent/subregion map and an approximate pin); Nauru, Grenada, Tuvalu, Malta and Comoros (world map, just indicate broad part of the world). Pin, then Reveal to highlight the actual country's Natural Earth 1:10m silhouette and/or orange island locator; optional Zoom to country only **after** reveal. There is **no pass/wrong grading and no numeric radius**. The pilot tests enjoyment and learning, not whether clicking an arbitrary 500km/1000km line should earn a point.

Data and interaction are based on the already working grid-free atlas. Global overview remains lightweight 1:110m; region zoom uses the local 1:10m detailed outlines; dateline ring unwrapping and PC/iPhone click/pan/zoom behavior stay intact. Answers/reveals stored browser-local in a separate `wcg-geography-simple-fun-trial-v1` key. Original practice answers remain separate. After each placement, actual country is shown, but NEVER highlighted before the Reveal action. The micro-island dot is added only after reveal when the world-scale silhouette is too small. Ten-question review has no official score and does not change 390/390.

## Retrieving a player's finished test (12-Oct-2026)

A user completed this fun-first test and enjoyed the format, but could not find how to share placements. The browser-only prototype did **not** transmit data to GitHub or ChatGPT; no server-side retrieval of personal pins exists. To avoid making them replay, added **Copy my test results** on the question card and **Copy test results** near the bottom after 10 reveals. This exports all ten browser-local saved selections with question, mode, selected longitude/latitude, reveal status and revealed broad actual region. Clipboard errors show a selectable text box as fallback. Export is user-initiated, sends no network requests, and does not alter the official 390/390.
