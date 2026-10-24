# FORGE: 50-step delivery programme

**Scope:** 50 accountable improvements after FORGE v50. **Repo:** `jamesjph91/nourish-planner`. **App:** https://jamesjph91.github.io/nourish-planner/

## Delivery contract

- One coordinated programme, not 50 user approvals. Implement the next bounded release in GitHub, add/extend tests, run GitHub Actions, check Pages deployment, and update this file with the actual result.
- **Do not mark work complete unless its code is committed, tests pass and deployment succeeds.** Flag blocked work explicitly, with the reason; don't silently skip it.
- Preserve local browser data, private cloud records, workout history and IndexedDB photos. No reset/migration without backward-compatible validation and tests.
- Keep the original FORGE black/graphite/lime artwork, five-tab mobile dock, accessibility and UK-first food labelling. No paid APIs without explicit user agreement.
- Do not imply Android Health Connect or Samsung Health can auto-sync from this static PWA; Android companion and manual import are separate workflows.
- Track versions in `forge-build.json`, `index.html`, service-worker cache, recovery page and update tests. Do not conflate planned and released versions.

## v51 · Accessibility & navigation (steps 1–10)
- [x] **01** Focusable named main-content landmark.
- [x] **02** Keyboard-reachable skip-to-content link.
- [x] **03** Named main navigation landmark.
- [x] **04** `aria-current="page"` follows the active tab.
- [x] **05** Clear `aria-pressed` and descriptive labels per navigation button.
- [x] **06** Polite screen-reader announcement on route changes.
- [x] **07** Alt+1…5 keyboard shortcuts for Today, Train, Fuel, Activity and Progress.
- [x] **08** Publish `aria-keyshortcuts` alongside navigation controls.
- [x] **09** Accessible shortcut-help dialog, available from Settings and the ? key.
- [x] **10** Escape close, focus-return/trapping, 44px controls, visible focus and reduced-motion styling.

## v52 · Data & account safety (steps 11–15)
- [x] **11** Read-only device data-health summary for diary, workouts, activity and measurements.
- [x] **12** Show local backup timestamp and a clear photo-backup exclusion notice.
- [x] **13** Make device-vs-cloud save states unambiguous on the account page.
- [x] **14** Validate backup content *before* any import or replace action, without applying automatically.
- [x] **15** Give users an explicit, safe pre-update backup checklist.

## v53 · Offline and recovery (steps 16–20)
- [x] **16** Report offline readiness for critical app assets.
- [x] **17** Detect missing app assets and offer the safe refresh path.
- [x] **18** Show deployed vs installed build identifiers without touching user records.
- [x] **19** Add an offline smoke-test to CI with simulated network failure.
- [x] **20** Improve app-shell recovery guidance for Android installed-PWA users.

## v54 · Train: fewer taps (steps 21–25)
- [x] **21** Jump to the next uncompleted set.
- [x] **22** Sticky, compact progress strip during a workout.
- [x] **23** Clearer current-exercise focus state.
- [x] **24** More tactile set-add/remove affordances with undo where safe.
- [x] **25** End-of-session recap generated only from completed sets.

## v55 · Train: evidence-based performance (steps 26–30)
- [x] **26** Chart session load volume only for valid weight × repetitions.
- [x] **27** Separate working-weight bests from repetition bests.
- [x] **28** Show comparable trends for machine/bodyweight/time exercises without false equivalence.
- [x] **29** Make target recommendations respect low sample sizes and long gaps.
- [x] **30** Export exercise-history analytics as a user-controlled CSV.

## v56 · Fuel: faster food diary (steps 31–35)
- [ ] **31** Favourite foods in the personal food library.
- [ ] **32** Easier edit/repeat workflow for historical foods.
- [ ] **33** Barcode source and nutrition completeness visible before saving.
- [ ] **34** Guard duplicate barcode/quantity submission.
- [ ] **35** Keyboard- and scanner-friendly focus order in the logging form.

## v57 · Fuel: clearer UK quantities (steps 36–40)
- [ ] **36** UK supermarket serving-size presets with explicit gram/ml units.
- [ ] **37** Distinguish label-per-100g, per-100ml and per-portion calculations.
- [ ] **38** Nutrient-total cross-checks before confirming a diary entry.
- [ ] **39** Clear missing vs actual zero nutrition in every relevant view.
- [ ] **40** Streamlined planner-to-diary meal logging without duplicate entries.

## v58 · Activity & wearable imports (steps 41–45)
- [ ] **41** Label source attribution for manual vs imported activity.
- [ ] **42** Duplicate-day import preview with user confirmation.
- [ ] **43** Preserve zero vs missing readings throughout week charts.
- [ ] **44** Show last imported date without implying native watch sync.
- [ ] **45** Improve the Android companion import instructions and validation tests.

## v59 · Progress, polish & release confidence (steps 46–50)
- [ ] **46** Measurement trends with consistent date-range filters and no invented readings.
- [ ] **47** Clear user-friendly progress-photo backup instructions, separate from JSON backups.
- [ ] **48** Polish responsive mobile layouts and improve essential touch/focus behaviour.
- [ ] **49** Test corrupted storage, slow/offline loading and keyboard navigation regression cases.
- [ ] **50** Final end-to-end release gate: features, privacy, accessibility, update/recovery and deployment, with a documented audit.

## Completion ledger

| Milestone | Steps | State | Verification |
|---|---|---|---|
| v51 | 01–10 | Verified deployed | Regression run `40113619270` · Pages `40113618711` |
| v52 | 11–15 | Verified deployed | Regression run `40116507047` · Pages `40116506598` · `tests/forge-data-safety-v52.test.cjs` |
| v53 | 16–20 | Verified deployed | Regression run `40117118278` · Pages `40117118102` · `tests/forge-offline-v53.test.cjs` |
| v54 | 21–25 | Verified deployed | Regression run `40118022805` · Pages `40118022911` · `tests/forge-gym-v54.test.cjs` |
| v55 | 26–30 | Verified deployed | Regression run `40118966606` · Pages `40118966549` · `tests/forge-strength-v55.test.cjs` |
| v56 | 31–35 | Pending | — |
| v57 | 36–40 | Pending | — |
| v58 | 41–45 | Pending | — |
| v59 | 46–50 | Pending | — |

**Operating rule:** Each continuation reads this ledger, works the earliest *pending* bounded milestone, commits working code, verifies CI and deployment, and updates only demonstrably delivered steps. Stop once all 50 are verified; never falsely claim that pending entries have shipped.
