# Nourish — Hosting and synchronisation setup

**Repository:** https://github.com/jamesjph91/nourish-planner
**Planned web address (not confirmed live yet):** https://jamesjph91.github.io/nourish-planner/

**Important:** Publishing the website makes it accessible from every device at the same address. To synchronise edits, you must also configure Firebase Authentication and Firestore (see instructions below).

**GitHub integration access:** In https://github.com/settings/installations/173731433 select **Configure → Repository access → Only select repositories** and add **nourish-planner**, then **Save**. Without access, connected GitHub tools return an HTTP 403 error.

**Privacy:** This deploy-ready copy removes age, sex, height, weight and lifestyle notes from the public source. It includes example meal targets and recipes only. Keep personal details in your local backup and (once enabled) your private Firestore records.

# Nourish Cloud — website + live personal sync

This folder is a **deployment-ready app**, **not yet a live website**. Setting up your own hosting and Firebase account is required once. After that, the URL remains the same as code is updated; meal edits sync when signed in and online.

## 1. Create a dedicated GitHub repository

1. The public **`jamesjph91/nourish-planner`** GitHub repository has already been created. Do **not** commit personal notes, private data, or credentials. The app's personal plan state goes to Firebase, not GitHub.
2. Upload the contents of this folder (not the enclosing folder) into the repository's root. In the GitHub web interface: **Add file → Upload files → Commit changes**. You can exclude this README if you like, but keep `index.html`, `cloud-sync.js`, `firebase-config.js`, `service-worker.js`, `manifest.webmanifest`, both icons and `.nojekyll`.
3. In **Settings → Pages**, choose **Deploy from a branch**, **main**, **/(root)** and **Save**. When Pages confirms deployment, your site address will be similar to `https://jamesjph91.github.io/nourish-planner/`. GitHub shows your actual URL in Settings → Pages.

## 2. Connect Firebase sign-in and the private cloud database

1. Go to **https://console.firebase.google.com/** and create a **Firebase project** (the Spark/no-cost plan generally suits personal use; quotas apply).
2. Add a **Web app** to that Firebase project and copy its *web config* object (properties such as `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`). These web identifiers are intended for browser use; **never** use admin or service-account keys.
3. Edit the GitHub file `firebase-config.js` so it reads `window.NOURISH_FIREBASE_CONFIG = { ...the web config object here... };`, then commit.
4. In Firebase **Authentication → Sign-in method**, enable **Google**. In **Authentication → Settings → Authorized domains**, include `jamesjph91.github.io` (the domain **without** `https://` or `/nourish-planner/`).
5. In Firebase **Firestore Database**, create a database (production mode is preferable). In **Firestore Database → Rules**, paste all the contents of `firestore.rules` and **Publish**. This restricts every user's plan to that signed-in user, and denies other reads/writes.
6. Visit your deployed URL and choose **Sign in with Google**. Do so with the **same Google account** on Chromebook and Android phone.

### Move your current meal-plan edits across

If you edited the old downloaded dashboard: open it on your Chromebook → **Settings → Export backup**. Open the newly hosted site → **Settings → Import backup**, *before signing in for the first time*, then sign in. The cloud will save those existing meal swaps, favourites, walking/gym ticks and shopping changes. If the cloud already contains different data, Nourish asks you to choose which version to keep. Export a backup before overwriting.

## 3. Everyday use

- Keep the saved website URL bookmarked on both devices; add it to your Android/Chromebook home screen using the browser's **Install app** or **Add to Home Screen** option.
- Swaps, favourites, checked shopping items, gym days, walks and macro targets automatically save to your private cloud when signed in. Internet access is required for cloud syncing. Your browser still saves a local copy.
- Updating `index.html`, `cloud-sync.js` or other website files in GitHub redeploys the **same URL**. You **do not** need to download the HTML after updates.
- Check the green cloud banner to confirm that an edit is saved. If two devices edit at the same time and there is a conflict, choose which version to keep; simultaneous changes are **not merged field by field**.
- Keep occasional **Export backup** snapshots from the Settings page; Firebase Spark-plan Firestore does not include managed backups.

## Privacy and safety

The public GitHub repository serves the generic app and recipes, **not** personal login details, weight entries or saved daily actions. Cloud documents reside at `users/<authenticated-uid>/private/nourish-plan`, protected by the supplied Firestore rules. Review Firebase Authentication **Authorized domains** and rules before using the public site. The Firebase **web config is not a private credential**; the Firestore rules are what protect your data.

Never place a GitHub token, Firebase service-account JSON, account password, email inbox export or API secret into the repository or into `firebase-config.js`.

**Not a medical prescription:** calories and protein are ingredient estimates; use your own weight trend, wellbeing and training recovery to fine tune.

## Technical verification

Use a modern Chromium-based browser. The main app is a dependency-free HTML/JS PWA; cloud sync imports the official Firebase JS SDK 13.0.0 from the Firebase CDN. Without valid Firebase config, the app remains a local planner and clearly indicates that cloud sync is not yet active.