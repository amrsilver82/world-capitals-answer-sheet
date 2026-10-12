# Fun-first Geography V2 — country pins + broad region feedback

This second ten-question, **unscored** learning trial follows V1's user approval (played all ten, found it quite good) and their later request to take the next steps. It is independently hosted at `/pilot/geography-fun-v2/`, leaving the V1 implementation, results and local browser storage untouched.

Five new country pins: Poland (Europe), Mongolia (Central/East Asia), Kenya (East Africa), Argentina (South America), Thailand (Southeast Asia).

Five new tiny/island-country broad-world-region pins: Barbados (Caribbean), Maldives (Indian Ocean), Samoa (South Pacific), Cyprus (Eastern Mediterranean), Cabo Verde (Atlantic off West Africa).

One country at a time. Before answering: no correctness hint or highlighted silhouette. The user places a pin, presses Reveal, and sees the target shape/island dot and a short **descriptive learning message**: inside the country, in another named country, outside the silhouette, same broad geographic area, or different broad geographic area. **No scores, 500/1000km limits, country-size multipliers or formal referee.** At reveal, the original pin freezes and cannot be changed afterwards. Copy my test results exports all ten coordinates, reveal states and feedback for voluntary chat review.

Region envelopes are deliberately generous and approximate, not binding ocean/sea boundary definitions; polygon containment uses already-shipped Natural Earth 1:10m when present, with the overview fallback. These descriptions are not certified official geography assessments.

The browser localStorage key is `wcg-geography-simple-fun-trial-v2`, separate from V1 `wcg-geography-simple-fun-trial-v1`. No official 195-country geography round has begun and the official perfect flags/capitals score remains **390/390**. Desktop Chromium and simulated iPhone WebKit automated regressions are required before release.
