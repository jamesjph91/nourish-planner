# Nourish — Meal & Fitness Planner

Mobile-friendly, four-week meal planning website with recipes, meal swapping, favourites, shopping lists, gym tracking and dog walks.

## Publish
Open **Settings → Pages** and select **Deploy from a branch**, **main**, **/(root)**. The intended permanent website URL is https://jamesjph91.github.io/nourish-planner/ after GitHub Pages completes deployment.

## Private cloud sync
The website works as a local planner until Firebase is configured. Set up **Firebase Authentication (Google)** and **Cloud Firestore**, apply the rules in `firestore.rules`, then add only the public web-app config to `firebase-config.js`. Do not commit passwords, service-account keys or private data.

Full instructions: [README_SETUP.md](README_SETUP.md).

## Next 50 improvements

The independently tested development programme is tracked in [FORGE-ROADMAP-50.md](FORGE-ROADMAP-50.md). It distinguishes delivered milestones from pending work and includes release-gate rules; all future releases extend this app rather than replacing personal data.


## Commercial launch / naming risk

> **Hold public brand rollout pending legal clearance.** The working name FORGE and proposed fitness apparel labels present a significant potential conflict with an existing reported UK FORGE trade mark for fitness apps and SaaS. Do **not** interpret this repository, design assets, or ongoing software work as proof of trade mark ownership or exclusive commercial use.

Before retail payments, external campaigns, garment production or trade mark filings:
- Review [FORGE-IP-SECURITY-REGISTER.md](FORGE-IP-SECURITY-REGISTER.md) for preliminary conflict evidence, official register checks, legal advice requirements and copyright/source-artwork provenance.
- Follow [FORGE-COMMERCIAL-READINESS.md](FORGE-COMMERCIAL-READINESS.md) for the app and company P0 readiness gates.
- Follow [FORGE-BRAND-MERCH-LAUNCH.md](FORGE-BRAND-MERCH-LAUNCH.md) for unbranded sample testing, consumer rights and product economics.
- Follow [FORGE-PHASE-2-ROADMAP.md](FORGE-PHASE-2-ROADMAP.md) for existing software upgrades and verified tests.

The repository is public; private high-resolution design masters and legal/contract material should be kept in access-controlled storage, not committed here. The name and designs are **not cleared**, and no trade mark has been filed on behalf of this project by these documents.
