# FORGE · Final 50-step quality and release audit

**Scope:** FORGE v51–v59, 50 programme steps. **Release:** v59 candidate until both GitHub Actions regression checks and Pages deployment succeed. **Source:** `jamesjph91/nourish-planner` on `main`. This audit is not a substitute for manual testing on every Android device.

## Verification matrix

| Area | Implemented safeguard | Verification evidence |
|---|---|---|
| Progress measurements | Consistent 7D / 30D / 90D / 1Y / All ranges in the v59 measurement explorer; choose any recorded metric; missing points excluded; future dates excluded | `tests/forge-v59-release.test.cjs` |
| Progress photos | Each personal IndexedDB photo has an explicit Save copy link; clear, separate photo backup instructions; JSON plan backup does **not** contain photos; no background upload | `tests/forge-v59-release.test.cjs`, existing `forge-progress.js` account isolation |
| Mobile layout | Premium graphite/electric-lime visual art retained, 29px mobile dock icons, 68px dock touch slots, responsive filters and readable buttons, reduced-motion and focus-visible support | `tests/forge-v59-release.test.cjs`, v47 art CSS |
| Damaged/missing data | Corrupted local plan does not crash v59 analysis; missing activity/measurement values stay unknown; low-sample charts do not make up trends | `tests/forge-v59-release.test.cjs`, existing validation suites |
| Offline recovery | Versioned service-worker cache, essential asset verification, offline smoke tests, HEAD check before cache-clearing repair | `tests/forge-offline-v53.test.cjs` and `tests/forge-update.test.cjs` |
| Cloud and local privacy | Distinct device vs cloud status, explicit backup preflight and consent, per-account progress photos, no automatic import or account-data deletion | `tests/forge-data-safety-v52.test.cjs`, account and photo regression tests |
| Keyboard and mobile navigation | Skip link, focusable main area, five primary-route shortcuts, modal focus behavior, large mobile dock controls | `tests/forge-access-v51.test.cjs` and `tests/forge-v59-release.test.cjs` |
| Nutrition and workout preservation | Existing calorie, barcode, favourite-food, logged-set, undo, routines and strength evidence data remain compatible | `tests/food-diary.test.cjs`, `tests/workouts.test.cjs`, versioned strength/gym test suites |
| Wearable imports | Manual versus imported provenance, conflict preview, missing versus zero, no claim of automatic Samsung Health sync | `tests/health-hub.test.cjs` and `tests/forge-activity-v58.test.cjs` |
| End-to-end release gate | Run all Node regression tests and syntax checks in CI, then verify successful Pages deployment of the same head commit | GitHub Actions run IDs will be recorded after success |

## Important boundaries

- A static PWA cannot directly and continuously read native Health Connect or Samsung Health. The Android bridge uses user-controlled export/import. Data may be absent or device dependent.
- Browser-local IndexedDB photos are **not** included in the JSON backup. Users should save and verify individual copies before switching phones, clearing Chrome storage or uninstalling.
- Imported nutritional values are informational estimates, not guaranteed manufacturer data.
- Measurements, workout recommendations and estimated calorie expenditure are not medical advice.
- CI verifies application logic and safety invariants, not every real-world network, Chrome build, camera device or wearable. A manual physical-device smoke check is advised for release-critical personal use.

## Manual Android smoke checklist (not claimed as performed)

- [ ] Home-screen PWA opens to correct v59 and shows existing workouts/food.
- [ ] Five bottom dock tabs have readable icons and functional tap targets on a narrow phone.
- [ ] Add then undo a workout set and verify it remains correct after reopening.
- [ ] Scan a supported food barcode and check it against packaging.
- [ ] Change measurement trend to Waist, switch 7D / 30D / All, verify only entered values appear.
- [ ] Save a progress photo copy, then independently confirm the file exists in Downloads/Files.
- [ ] Import an overlapping Health Connect daily file; decline the conflict prompt and confirm previous values stay unchanged.
- [ ] Simulate offline reopening and use safe refresh only after reconnecting.

## Final deployment evidence

Pending until the release code, automated tests and GitHub Pages deploy on the same v59 commit finish successfully. Document the actual job IDs when available; do not mark an unverified job successful.
