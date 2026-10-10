# World Capitals Location Pilot — GitHub-only synced experiment

**Experimental, unscored, and separated from the official 195/195 Flags + 195/195 Capitals record.**
This is a **new route** (`pilot/location-sync/`), leaving `pilot/location/` untouched as the locally saved reference pilot.

## What this implementation does

- Loads the same frozen 15 questions and exact unlabeled map geometry as the existing playable prototype.
- Uses the existing private `amrsilver82/World-Capitals-Game` repository, **Issue #1**, for append-only unscored answer-attempt events.
- **No Vercel, Lovable, paid add-ons, cloud database, or additional hosting.** GitHub Pages serves the site; GitHub's REST API manages the shared private checkpoint.
- Never writes to `ACTIVE_TEST.json`, `v2/runtime.json`, `SCORE_HISTORY.md` or any official quiz record.
- Requires an authorized GitHub token before showing any saved score or accepting answers. It never silently falls back to a different browser's local score.
- Replays Github-confirmed events in GitHub comment-ID order. Ignores duplicate attempt IDs and stale attempts after a different device advances; each question can advance at most once.
- Rechecks the shared checkpoint before each answer; posts only the current question attempt and rereads the issue to confirm storage.
- On page load, manual refresh, tab focus/visibility and every 15 seconds, loads the latest GitHub checkpoint.
- Any network/credential failure shows an error and DOES NOT advance locally.
- Device map-region choices are not authoritative and do not affect question/score state.

## Exact token setup (each browser/device)

1. Sign in to GitHub at `https://github.com/settings/personal-access-tokens/new`.
2. Set **Resource owner** to the account owning `amrsilver82/World-Capitals-Game`.
3. Set repository access to **Only select repositories**, selecting **`World-Capitals-Game`** ONLY. No repository access for the public answer-sheet repo is needed.
4. Under repository permissions set **Issues: Read and write**. Do not grant Contents write, Actions write, Administration or organization access. Keep all other elective permissions **No access**.
5. Set a limited expiration date that fits this short pilot. Generate and copy the token **only into the password field on the GitHub Pages synced pilot**, never paste it in chat, a file, or a GitHub Issue.
6. Click **Connect GitHub**. The map unlocks only if the token can read the private Issue. Repeat the token entry once on the other device. Choose **Remember token on this browser** only if you accept that any script running on this GitHub Pages origin or browser extension with access can potentially steal browser-stored tokens.
7. Test Chad on Device A → page must show Q2 Romania, 1/15. On Device B press **Refresh shared score** (or wait 15 seconds) → Q2 Romania, 1/15. Answer Romania on Device B → Q3 Monaco, 2/15 on both. Reopen same link to verify shared state.
8. To remove the stored token from one browser, press **Disconnect and clear token**. To revoke it everywhere, revoke the fine-grained PAT under GitHub's developer settings. Revocation does not delete the GitHub issue or saved answer comments.

## Safety and limitations

**Fine-grained tokens are bearer secrets.** They are sent directly only to `https://api.github.com` over HTTPS. No token value is committed, logged, included in event comments, sent to ChatGPT, or sent to Vercel. The synced route implements a restrictive page CSP (self script/styles, GitHub API connections only). The optional Remember toggle uses browser localStorage; leave unchecked for a session-only experience.

GitHub issues have REST rate limits and anti-spam limits. Pilot volume is tiny; still, if a rate limit or outage occurs, the game must wait rather than recording fictional progress.

GitHub Issue comments can serialize events in one canonical order, but they are not transactional compare-and-swap writes. If simultaneous devices submit stale answers, **both comments can be stored**, but replay accepts only the first valid current-question event. A later stale event does not add score. This is a last-writer-race-safe *score*, not a guarantee that every tap becomes part of the accepted history.

This is a personal experimental access-token approach, not a general public authentication product. Do not scale to 195-country production or other users without revisiting threat model and user approval.

## Acceptance requirements

- [ ] GitHub Pages synced route loads without errors on iPad Chrome.
- [ ] Token with only private Issues read/write connects successfully.
- [ ] iPhone Safari performs touch selection and cross-device Q1 → Q2.
- [ ] PC or second device Q2 → Q3 appears everywhere automatically.
- [ ] Refresh/reopen always restores same shared score and question.
- [ ] Invalid/expired token or network loss blocks unconfirmed advancement.
- [ ] Official 195/195 + 195/195 history unchanged.
- [ ] User approves promotion after successful multi-device acceptance.

The automated CI regression mocks the private GitHub API in Chromium and WebKit. It is **not** a live-token test or real iPad/iPhone certification.

## Map visual and Monaco selection update — 10-Oct-2026

- User confirmed real-device GitHub sharing works across browsers. Pilot still unscored; progress remains only in private GitHub Issue #1.
- A source-data bug gave five unrelated regions the same placeholder `-99` ID (France, Norway, Northern Cyprus, Somaliland, Kosovo), causing multiple areas to highlight together. The common 177-country map now has **177 unique IDs**: `FR`, `NO`, `XC`, `XS`, `XK`; remaining normal ISO IDs unchanged. No question IDs changed.
- The manual **NW Mediterranean** map window now covers 6.1–9.2° E, 42.2–45.0° N. User-controlled `+` twice shows Monaco's **real outline**, with the same neutral physical-pixel threshold for every microstate. No question-directed camera or location dots.
- WebKit/Chromium automated tests cover selecting France without highlighting Norway or unrelated territories, manually zooming Monaco's silhouette, answering Monaco, and seeing the next synced question from a second browser.
- Critical: **no new reset**, no change to `pilot_id`, event schema, issue, question order, or manifest version. Existing private Issue event checkpoints preserved.
