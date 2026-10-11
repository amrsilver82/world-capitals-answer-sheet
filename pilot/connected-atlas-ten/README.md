# Connected Atlas — Ten-Country Design Preview (11-Oct-2026)

This is a **layout and interaction comparison only**. It does NOT start an official 10-country quiz, does NOT grade existing historical tests, and does NOT save scores or submissions to a local parallel authoritative checkpoint. It is a disposable single-page preview (clears on refresh) and publishes no user answers.

URL: https://amrsilver82.github.io/world-capitals-answer-sheet/pilot/connected-atlas-ten/

Layout: all 10 numbered flag cards in one scrollable left-side list, each with blank Country and Capital answer fields, a "Find on atlas" action, and its own in-memory selected country location. A **single shared atlas** lives in the right column (sticky while the user scrolls on desktop). The user chooses regions, scrolls to zoom (mouse wheel/trackpad), drags to pan, or uses +/− controls. Changing the active question **does not change the region, viewport or map zoom**; no target hint is injected. The selected map marker is shown only for the active question, in blue. An on-demand "Preview review layout" shows ten independent rows and marks unattempted entries as unattempted, not wrong. All questions are optional for layout inspection.

Test countries selected to stress different map types: Tuvalu, Monaco, Japan, Fiji, Chad, Grenada, Bhutan, Nauru, Kiribati, Germany. Canonical, already-published flag assets reused from Edition 3. The existing 177-country Natural Earth background and 15 detailed pilot polygons are reused, plus a fixed, identical-marker network of ~30 tiny countries/island locations. Larger mapped land polygons can be clicked, but this is **not** yet complete or verified for all 195 countries. The target country location is NEVER highlighted/auto-zoomed before evaluation. Region selection is always user-directed. Small countries use neutral markers even if land is microscopic. Marker coordinates are geographical reference anchors, not perfect substitute for all land of widely distributed archipelagos; scoring standard remains unapproved.

The previously published one-country prototype at `/pilot/connected-triple-one/` also gains mouse-wheel zoom and drag-to-pan on the same basis as the ten-country preview.

**Anti-leak:** this is an explicitly non-official public demo and answer keys are present in public client-side JS for preview reports. Do not reuse this client-side verification scheme for the real championship. When/if approved, use the canonical private GitHub protocol, private scoring, actual complete 195 geography inventory, and strict batch commit gating.

**Compatibility:** desktop PC-first; responsive small-screen display; automated Chromium and WebKit regression expected. GitHub Pages is the sole host. Do not modify past Issues #1–#4, prior 390/390 achievement, or existing quiz artifacts.
