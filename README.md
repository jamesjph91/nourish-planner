# Nourish — Meal & Fitness Planner

Mobile-friendly, four-week meal planning website with recipes, meal swapping, favourites, shopping lists, gym tracking and dog walks.

## Publish
Open **Settings → Pages** and select **Deploy from a branch**, **main**, **/(root)**. The intended permanent website URL is https://jamesjph91.github.io/nourish-planner/ after GitHub Pages completes deployment.

## Private cloud sync
The website works as a local planner until Firebase is configured. Set up **Firebase Authentication (Google)** and **Cloud Firestore**, apply the rules in `firestore.rules`, then add only the public web-app config to `firebase-config.js`. Do not commit passwords, service-account keys or private data.

Full instructions: [README_SETUP.md](README_SETUP.md).
