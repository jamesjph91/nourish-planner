# FORGE — Commercial Readiness Audit & Master Backlog

**Audit date:** 26 October 2026  
**Repository:** [jamesjph91/nourish-planner](https://github.com/jamesjph91/nourish-planner) (public; default branch `main`)  
**Snapshot:** commit `24b04abfb178c921a26c4a6cfaa8db899100bb43`, app release **v61** (`forge-build.json`, `index.html`, service worker).  
**Status:** **NOT CLEARED FOR COMMERCIAL LAUNCH**. App engineering may continue as a controlled prototype. This is an evidence-based working audit, not an assurance, penetration test, legal opinion, clinical review or customer acceptance test.

## 1. Source and confidence

Directly inspected: repository file tree, application shell and manifest, configuration, `cloud-sync.js`, `forge-accounts.js`, `firestore.rules`, test workflow, Android bridge docs, prior release audit, roadmap and IP register. At the reviewed head:
- [FORGE app regression tests](https://github.com/jamesjph91/nourish-planner/actions/runs/40159172731) — **success**, completed 25 October 2026.
- [GitHub Pages build/deploy](https://github.com/jamesjph91/nourish-planner/actions/runs/40159172688) — **success**, same head SHA.
- [Prior v59 release audit](FORGE-RELEASE-AUDIT.md) documents successful automated testing and explicitly says physical Android smoke testing was not performed.
- [Phase 2 roadmap](FORGE-PHASE-2-ROADMAP.md) shows v61 P2-01–04 done, v62–64 pending.

**Limitations:** The audit did not operate a signed-in live Firebase session, inspect production Firebase console rules, test the website interactively on a real handset, benchmark network barcode coverage, inspect supplier contracts, check company accounts or undertake a legal trade mark clearance. A green CI run establishes only the tests exercised by that run. The public web URL could not be independently browser-tested in this review. Do not convert unknowns to pass marks.

## 2. Readiness inventory

| Area | Evidence in repository | Readiness |
|---|---|---|
| PWA application | v61 shell with Today/Train/Fuel/Activity/Progress, service worker and install manifest | **Implemented / automated checks passed** |
| Workouts | editable schedules, logging, progress/strength reporting and v61 rest timer | **Implemented; physical-device and beta checks outstanding** |
| Meal planning and food diary | meal plans, food logging, barcode entry, quantities and validation tests | **Implemented; external barcode hit-rate/accuracy unverified** |
| Google accounts and cloud | Firebase browser sign-in, redirect fallback and user-scoped Firestore rule source | **Implemented; real-device sign-in and deployed rules unverified** |
| Data backup | JSON plan backups, conflict warnings, local IndexedDB photo store | **Partial: photo backup excluded and recovery unproven** |
| Wearable integration | Health Connect Android export/import prototype, no INTERNET permission | **Prototype, not continuous Galaxy Watch sync** |
| Automated quality | Node regression suite and GitHub Actions deployment | **Passed at reviewed head; E2E/real-device gates missing** |
| Security/privacy | per-UID Firestore rules source, local-data warnings and IP register | **Not independently verified for public onboarding; compliance pack incomplete** |
| App payments | no verified production subscription entitlements/webhook backend | **Not implemented/verified for commerce** |
| Naming and IP | documented potential conflicts for working FORGE name; asset provenance unresolved | **Commercial rollout on hold** |
| Merchandise | concepts/planning possible; no validated supplier samples/margins | **Not production-ready** |
| Operations | public repo, GitHub Pages, Google Firebase setup docs | **Prototype operations; owner support/incident/rollback maturity outstanding** |

## 3. Definite gaps found in the source review

1. `main` is **not protected** according to the GitHub branch endpoint. Configure a release approval/check policy suitable for the account.
2. The CI workflow has extensive **path filters**. New or omitted code files can be changed without triggering the regression suite. Audit trigger coverage or simplify path filters.
3. README linked to this commercial document and `FORGE-BRAND-MERCH-LAUNCH.md` before those files existed. Both are being created as part of this audit; older setup wording also needs revision.
4. There is **no explicit LICENSE** file in the reviewed repository tree. Public code visibility is not a statement of commercial reuse rights; decide deliberately.
5. Live Firebase rules publication and cross-account isolation are **not proven** by the repository's `firestore.rules`. Emulator and live tests are mandatory before real customers.
6. JSON backups **exclude photos**; do not use uninstall/clear-storage as a support step.
7. The Health Connect bridge exports a JSON file manually and its APK is a debug prototype, **not live background wearable sync**.
8. Existing `FORGE-IP-SECURITY-REGISTER.md` explicitly flags potentially conflicting app and apparel names. No final brand is legally cleared.

## 4. Prioritised GitHub backlog

### P0 — must pass before paid public launch
1. [#4 Android authentication and account recovery](https://github.com/jamesjph91/nourish-planner/issues/4)
2. [#5 Firebase emulator and two-user isolation](https://github.com/jamesjph91/nourish-planner/issues/5)
3. [#6 Backup/restore and photo safety](https://github.com/jamesjph91/nourish-planner/issues/6)
4. [#7 UK privacy, data governance and customer terms](https://github.com/jamesjph91/nourish-planner/issues/7)
5. [#8 Brand/trademark and intellectual property clearance](https://github.com/jamesjph91/nourish-planner/issues/8)
6. [#9 Browser E2E and real-device release checks](https://github.com/jamesjph91/nourish-planner/issues/9)
7. [#12 Secure paid entitlements, subscription and cancellation lifecycle](https://github.com/jamesjph91/nourish-planner/issues/12)

### P1 — required to validate scale and fit; parallel tracks
8. [#10 Repository/release hardening and documentation](https://github.com/jamesjph91/nourish-planner/issues/10)
9. [#11 Food/barcode accuracy and dataset rights](https://github.com/jamesjph91/nourish-planner/issues/11)
10. [#13 Measured opt-in private beta](https://github.com/jamesjph91/nourish-planner/issues/13)
11. [#14 Android wearable bridge device qualification](https://github.com/jamesjph91/nourish-planner/issues/14)
12. [#15 Apparel supplier samples and economics](https://github.com/jamesjph91/nourish-planner/issues/15)

**Implementation order:** Begin with #4 and #5; in parallel perform #10 and start external legal enquiries for #8. Next #6 + #9, then #7 + #11, then controlled beta #13. Payment #12 must not enable real charges until security, legal and operational gates are cleared. Apparel #15 can use **unbranded** samples pending #8. Existing Phase-2 engineering work v62–64 remains planned; do not overwrite or relabel its completion ledger.

## 5. Go/no-go gates

### Gate A — controlled technical beta
- [ ] Real Android sign-in/account-switch succeeds without losing personal data.
- [ ] Firestore A/B authorization and opt-in sharing tested against published rules.
- [ ] Tested user-controlled backup/recovery for all claimed records; photo limitation explicitly disclosed.
- [ ] Mobile E2E and manual smoke tests recorded.
- [ ] Suitable privacy notice/consent/retention requirements reviewed before testers share sensitive data.
- [ ] Known high-severity bugs have owners and repro steps.

### Gate B — paid product
- [ ] Gate A passed and signed off with dated evidence.
- [ ] Name, assets, company/owner and launch countries professionally cleared.
- [ ] Payments, server-side entitlement verification, cancellation/refund and customer support journeys tested.
- [ ] Public terms, privacy, security incident process and customer-rights workflows ready.
- [ ] Measured private beta justifies user value and pricing; product analytics respect privacy.
- [ ] Launch checkout, helpdesk, backups/restore, uptime monitoring and rollback drill verified.

### Gate C — branded physical goods
- [ ] Written name/logo and asset rights clearance.
- [ ] Physical garment fit, wash, safety, supplier terms and pricing tested.
- [ ] E-commerce ordering, delivery/returns, customer service and tax obligations reviewed.
- [ ] Small controlled first order only after realistic cash-flow calculation; avoid speculative inventory.

## 6. Risk rules and governance

- Statuses are **Verified by source**, **Automated test passed**, **Manual test passed with evidence**, **Unknown** and **Blocked**. Never label a manual step verified solely from a mocked unit test.
- Do not push user health records, identifiers, private supplier terms or proprietary brand masters to this **public** repository.
- Protect stored browser data; avoid breaking compatibility with `nourishHigherDeficitV1`, Firestore user document format and account-scoped photo IndexedDB without migration tests.
- Keep currently working FORGE technical identifier provisional. Preserve all **23 existing alternative brand candidates** unchanged; do not portray them as trademark cleared.
- Save screenshots/logs after removing personal user information. Prefer redacted audit evidence rather than live customer values.
- Do not enable paid APIs, incur manufacturer commitments, file marks or activate live charges without the owner's express decision.

## 7. External UK references for launch counsel

- [UK Intellectual Property Office trade mark search](https://www.gov.uk/search-for-trademark)
- [ICO guidance on special-category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/)
- [ICO guidance on privacy notices](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/how-to-write-a-privacy-notice-and-what-goes-in-it/)
- [UK online returns guidance](https://www.gov.uk/accepting-returns-and-giving-refunds)

**Next working ticket:** #4 Android authentication and recovery, paired with #5 server-side access control verification. Close tickets only when their acceptance criteria and evidence are recorded.
