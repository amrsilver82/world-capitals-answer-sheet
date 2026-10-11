# Candidate geography referee (simulation, not official scoring)

Uses the public 195 ISO codes already present in the unscored geography atlas and the existing pinned Natural Earth 1:10m geography source. No private quiz states, correct capitals, or official results are copied here.

Candidate tolerances based on approximate geodesic land area: micro (<500 km²) 650 km; small (<20,000 km²) 450 km; medium (<200,000 km²) 250 km; large 120 km. These are **tests**, not user-approved scoring rules.

A location inside the country polygon is DIRECT. Outside the polygon, NEAR means within the country-tier tolerance and not inside a different sovereign country's mapped land. CONTESTED means the location is within the target tolerance but inside another country's land; the user is final referee. WRONG is outside tolerance. For countries without a polygon, existing atlas anchors provide provisional location evidence. Countries with disconnected islands use every present polygon island. Kiribati and other distant archipelagos require source-data validation before official scoring.

A player's 300/500/800km visual radius has no scoring impact. The full test samples each official country's own representative land/anchor, antipodal wrong location, an offset point 300km east, and 10 representative mixed cases. Output is a machine-readable GitHub Actions artifact. **Never transfer these test labels to the official 390/390 championship.**