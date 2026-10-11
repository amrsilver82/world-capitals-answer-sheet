# Pacific four-country retest — experimental only

User explicitly approved on 11-Oct-2026 correcting ocean pin clickability, International Date Line navigation and repeated attempts. The user clarified **the original nine-case test was performed mainly on PC**, not iPhone. Avoid claiming the PC failures were reproduced on an iPhone. This is PC-first, with phone compatibility checks.

This new GitHub Pages path `pilot/location-pacific-retest/` is separate from completed nine-case Fair Location Lab and first fifteen-question Location Pilot. Its sole write store is **private GitHub Issue #3** in `amrsilver82/World-Capitals-Game`. Existing Issues #1/#2 and all attempts remain untouched.

- Fixed four cases: Nauru, Tuvalu, Kiribati, Tonga.
- Pin-only; blind pin anywhere (sea or land), then post-submit exploratory distance in kilometres to closest mapped land, including any island.
- Date Line crossing is a single unlabelled `Pacific Unified` map view, 140°E through 220°E (equivalent to 140°W), with map land copies wrapping ±360°. Any manually switched regional view uses the same normalized longitude logic.
- Aspect-matched viewBox expands the geographic view to completely fill available CSS map rectangle, with **no ocean-colored non-clickable SVG letterbox** on PC or mobile. The interactive ocean background spans world wraps.
- Re-pin button appears after a submitted attempt. Subsequent pins on the same country are explicitly practice since its location was already revealed; initial confirmed attempt remains immutable in Issue #3.
- Advance only on explicit Next, after at least one attempt. Never mark official correct/wrong.
- Same existing restricted GitHub Issues read/write token can connect and optionally auto-reuse if user previously opted to remember it.
- CI tests in desktop-sized Chromium/WebKit and mobile viewport cover full-width edge pinning, same-map East/West Date Line, normalized longitude, practice re-pin event, four-case resume on another browser and refresh. **Real PC acceptance pending**.

No new third-party service; no Vercel. No official test changes, no score writes, no database; the immutable 195/195 Flags and 195/195 Capitals historical achievement remains unchanged.
