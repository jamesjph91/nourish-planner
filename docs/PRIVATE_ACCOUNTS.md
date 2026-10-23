# FORGE v37 — personal accounts and privacy checklist

FORGE is a public GitHub Pages web app. Its meal and workout code is shared; **private user records must remain in per-user Firebase documents and per-device storage**, never in this public repository.

## How a new person joins

1. Open https://jamesjph91.github.io/nourish-planner/ on your own phone.
2. Choose **Create my FORGE profile** and authenticate with your **own Google account**.
3. If the browser already contains a FORGE plan, stop and verify whose data it is. Choose **Use this browser’s plan** only if it is yours. **Use my private cloud plan** loads your account's existing data instead. **Start with a fresh profile** starts an empty plan.
4. Enter a nickname and optional weight goal. All fitness goals and meals can be changed later from Settings or Progress.
5. To sign out or change accounts, open the round account icon in the mobile header (or account badge on desktop), then **Sign out / switch account**.

**Do not share a Google login.** Distinct people require distinct Google/Firebase identities.

## Security model and limitations

- The source Firestore rule `match /users/{uid}/private/nourish-plan` permits access only when `request.auth.uid == uid`. **The repository alone does not prove that these rules are actually published in the live Firebase project.**
- Before onboarding a friend, open Firebase Console → Firestore Database → Rules, verify the currently published rules match `firestore.rules`, and review that Google Authentication and `jamesjph91.github.io` are enabled in Authentication → Settings → Authorized domains.
- Simulated regression tests validate ownership routing, sign-out isolation, and explicit consent to claim pre-login local data. They **do not replace Firebase emulator cross-account tests or live access-control verification**.
- The latest active browser plan remains under the compatibility key `nourishHigherDeficitV1`. On sign-out or account switch its active data is reset, while each user's cloud document remains in Firestore.
- Progress photos are stored in per-account **IndexedDB databases on this device**, not backed up to Firestore. Old unscoped photo records are preserved in the legacy database, not shown to new accounts, with an optional owner-only migration command in Progress → Photos.
- IndexedDB and local browser storage are not cryptographically encrypted by each person's FORGE password. Someone with access to the same unlocked browser profile or developer tools may be able to inspect device storage. For strong local separation **use different phones or separate browser profiles**.
- Guest mode is local-only and does not provide account-based privacy or cross-device syncing.
- A user's meal plan, diary, individual measurements, and workout sets are not shared by the existing friend-comparison feature. Opt-in summaries require a separate explicit publish action; verify the live Firestore circle rules before relying on sharing boundaries.
- The generic FORGE app source is public, but do not commit real users' measurements, daily logs, Google credentials, auth tokens, or API secrets.
- Sign-out is not a substitute for deleting or migrating records. When cloud upload hasn't completed, **export a data backup first**; JSON backups do not contain local progress photos.
- Cloud sync requires internet access. If the account cannot be confirmed, signed-in records remain hidden until verification rather than being shown to a different visitor.

## Pre-invite verification

- [ ] Firebase Console → Authentication → Google provider enabled
- [ ] GitHub Pages host in authorised domains
- [ ] Firebase Console → Firestore Rules match repository version and are published
- [ ] Test User A signs into one phone and creates a uniquely named meal
- [ ] Test User B signs into another phone with a different Google account and cannot see User A's private data
- [ ] Test Firestore rules with authenticated UIDs A and B: A can read A and is denied reads of B, and vice versa
- [ ] Verify sign-out, and reconnection of the original owner restores only their own cloud data
- [ ] Confirm photo migration on the original owner's phone, if older local photos exist

All profile sign-in screens are user-facing authentication controls; the Firebase service remains the source of truth for real access control.
