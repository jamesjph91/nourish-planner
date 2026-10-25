# FORGE — Phase 2 delivery roadmap

This follow-on plan begins after the original 50-step FORGE programme (v51–v59) and the v60 Android sign-in recovery release. It does **not** reopen or inflate the original 50/50 completion count.

## Commercial naming/IP hold — 24 October 2026

The planned FORGE product name and FORGE Athletics merchandise have not been cleared for commercial use. Existing FORGE fitness app marks and other fitness apparel brands present significant potential conflicts. **Keep implementing the core product while trademark counsel verifies rights; do not launch paid media, merchandise or trade mark claims under the provisional name until clearance.** See [FORGE-IP-SECURITY-REGISTER.md](FORGE-IP-SECURITY-REGISTER.md).

## Delivery rules
- Build production features in the existing PWA, with matching regression tests and an accessible mobile experience.
- Keep the graphite / acid-lime FORGE identity, established SVG artwork and large bottom navigation.
- Protect each person's workout, diary, activity, measurements and photo data. Do not clear browser storage, delete IndexedDB, auto-upload to another account, or imply that JSON backups include photos.
- Distinguish local app capabilities from Firebase cloud verification and optional Android wearable connections; never claim background Samsung Health sync from the PWA.
- A check mark means both GitHub regression tests and Pages deployment have succeeded. Manual device tests must be labelled separately.
- Implement the earliest pending milestone; do not start a conflicting release while tests are failing or Pages is deploying.

## v61 · Train — Rest timer and session flow
- [x] **P2-01** Add deliberate 60/90/120-second rest presets into the existing Train screen.
- [x] **P2-02** Implement accurate deadline-based countdown, pause/resume and +15-second adjustment.
- [x] **P2-03** Respect workout day changes and account changes; never mutate saved workout sets.
- [x] **P2-04** Provide accessible, large Android controls and regression tests for long background pauses.

## v62 · Train — Better decisions while exercising
- [ ] **P2-05** Offer optional per-exercise rest preference without silently changing previous sessions.
- [ ] **P2-06** Show a factual next-set context strip based on current logs and previous completed effort.
- [ ] **P2-07** Add an explicit session pause/resume note that remains separate from completion.
- [ ] **P2-08** Add regression coverage for changed routines, empty history and account switching.

## v63 · Fuel — Faster trusted food logging
- [ ] **P2-09** Improve incomplete-label visibility before and after meals are logged.
- [ ] **P2-10** Make commonly logged foods quicker to find on narrow mobile screens.
- [ ] **P2-11** Display food source and serving basis clearly when repeating a saved serving.
- [ ] **P2-12** Expand regression tests for duplicate handling, per-100g/per-100ml conversion and cloud restore.

## v64 · Release confidence and Android polish
- [ ] **P2-13** Add user-triggered startup diagnostics without exposing personal account records.
- [ ] **P2-14** Improve safe cache-only update guidance for installed Android devices.
- [ ] **P2-15** Add repeatable account-gate, offline and slow-network regression tests, and a manual smoke checklist.
- [ ] **P2-16** Publish a final Phase 2 release audit distinguishing automated checks from tests on physical devices.

## Milestone ledger

| Version | Steps | State | Verification |
|---|---|---|---|
| v61 | P2-01–04 | Verified deployed | Regression `40157567556` · Pages `40157567036` · `tests/forge-rest-v61.test.cjs` |
| v62 | P2-05–08 | Pending | — |
| v63 | P2-09–12 | Pending | — |
| v64 | P2-13–16 | Pending | — |

The goal is a practical, dependable daily-use gym and health product, not a count of superficial features.